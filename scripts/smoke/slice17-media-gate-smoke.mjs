// Slice 17 — product-media gate #5 live smoke (anon; discovery is public).
// Proves the media path end-to-end against a deployed/local consumer BFF:
//   GET /discovery/drops -> every card's `image` is either null or a well-formed
//     public-media asset (NEVER the untrusted media-ingest bucket).
//   For any card WITH an image: the URL is fetchable and serves image bytes
//     ("a real uploaded drop image renders through discovery").
//   For any card WITHOUT an image: the card is still complete, so the client
//     renders local fallback art ("falls back on null/failed media").
// Honest by design: if the demo carries zero uploaded images, the render-real
// half is reported as "covered by unit test + on-device" rather than failing.
//
//   CONSUMER_BFF_ORIGIN=http://127.0.0.1:3003 node scripts/smoke/slice17-media-gate-smoke.mjs

const BASE = `${process.env.CONSUMER_BFF_ORIGIN ?? "http://127.0.0.1:3003"}/api/mobile/v1`;

const results = [];
function check(label, pass, detail = "") {
  results.push({ label, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}${detail ? `  — ${detail}` : ""}`);
}

function isWellFormedImage(img) {
  if (img == null) return true; // null is allowed (fallback path)
  return typeof img.url === "string" && /^https?:\/\//.test(img.url);
}

async function main() {
  const r = await fetch(`${BASE}/discovery/drops`, { headers: { "x-client-schema-version": "1" } });
  check("GET /discovery/drops 200", r.status === 200, `status ${r.status}`);
  const body = await r.json().catch(() => null);
  const cards = Array.isArray(body?.data) ? body.data : [];
  check("discovery returns cards", cards.length > 0, `${cards.length} cards`);

  // Trust boundary: no card may surface the untrusted ingest bucket, and every
  // image field is either null or well-formed.
  const ingestLeaks = cards.filter((c) => typeof c.image?.url === "string" && c.image.url.includes("/media-ingest/"));
  check("no media-ingest bucket leaked to discovery", ingestLeaks.length === 0, `${ingestLeaks.length} leaks`);
  const malformed = cards.filter((c) => !isWellFormedImage(c.image));
  check("every card image is null or well-formed", malformed.length === 0, `${malformed.length} malformed`);

  const withImage = cards.filter((c) => c.image && typeof c.image.url === "string");
  const withoutImage = cards.filter((c) => !c.image);

  // Fallback half: a card with null media is still fully renderable.
  if (withoutImage.length > 0) {
    const sample = withoutImage[0];
    const renderable = Boolean(sample.dropPk && sample.bagDisplayName && sample.restaurantName);
    check("null-media card is still renderable (fallback path)", renderable, `${withoutImage.length} cards use fallback art`);
  } else {
    console.log("INFO  no null-media cards in this dataset (every drop carries an uploaded image)");
  }

  // Render-real half: fetch each uploaded image and confirm it serves image bytes.
  if (withImage.length > 0) {
    let okImages = 0;
    for (const c of withImage) {
      const res = await fetch(c.image.url, { method: "GET" }).catch(() => null);
      const ct = res?.headers?.get("content-type") ?? "";
      if (res && res.ok && ct.startsWith("image/")) okImages += 1;
      else console.log(`  WARN  unreachable/non-image: ${c.image.url} (status ${res?.status}, ct ${ct})`);
    }
    check("every uploaded discovery image serves image bytes", okImages === withImage.length, `${okImages}/${withImage.length}`);
  } else {
    console.log(
      "INFO  no uploaded images present in this dataset — the render-real path is covered by " +
        "the unit tests (resolveDropImage + resolveProductMedia) and the on-device upload walk.",
    );
  }

  const failed = results.filter((x) => !x.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
