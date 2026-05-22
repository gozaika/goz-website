import type { PickupProof } from "@gozaika/types";
import { createHash } from "node:crypto";

function qrCells(payload: string) {
  const hashes = Array.from({ length: 37 }, (_, index) =>
    createHash("sha256").update(`${payload}:${index}`).digest(),
  );

  return Array.from({ length: 29 * 29 }, (_, index) => {
    const row = Math.floor(index / 29);
    const col = index % 29;
    const inMarker =
      (row < 7 && col < 7) ||
      (row < 7 && col >= 22) ||
      (row >= 22 && col < 7);
    const inMarkerCenter =
      (row >= 2 && row <= 4 && col >= 2 && col <= 4) ||
      (row >= 2 && row <= 4 && col >= 24 && col <= 26) ||
      (row >= 24 && row <= 26 && col >= 2 && col <= 4);
    const inMarkerGap =
      (row === 1 && col < 7) ||
      (col === 1 && row < 7) ||
      (row === 1 && col >= 22) ||
      (col === 27 && row < 7) ||
      (row === 27 && col < 7) ||
      (col === 1 && row >= 22);
    if (inMarkerCenter) return true;
    if (inMarker || inMarkerGap) return !inMarkerGap;
    const hash = hashes[index % hashes.length];
    const byte = hash?.[Math.floor(index / hashes.length) % 32] ?? 0;
    return (byte + row + col) % 3 !== 0;
  });
}

export function PickupProofCard({ proof }: { readonly proof: PickupProof }) {
  const cells = qrCells(proof.qrPayload);

  return (
    <section className="rounded-lg border border-[#1A5C38]/20 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-[#1A5C38]">Pickup proof</p>
      <div className="mt-4 grid gap-5 sm:grid-cols-[220px_1fr]">
        <div className="aspect-square w-full max-w-[220px] rounded-lg border border-black/10 bg-white p-3">
          <div className="grid h-full w-full grid-cols-[repeat(29,1fr)] grid-rows-[repeat(29,1fr)] gap-px">
            {cells.map((filled, index) => (
              <span key={index} className={filled ? "bg-[#111827]" : "bg-white"} />
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2D2D2D]/55">OTP fallback</p>
          <p className="mt-2 font-mono text-5xl font-bold tracking-[0.18em] text-[#2D2D2D]">{proof.otp}</p>
          <p className="mt-4 text-sm leading-6 text-[#2D2D2D]/70">
            Show this proof at the restaurant counter during the pickup window. The QR nonce and OTP are shown here only for
            you; goZaika stores hashes for future verification.
          </p>
          <p className="mt-3 text-xs text-[#2D2D2D]/55">Issued {new Date(proof.issuedAt).toLocaleString("en-IN")}.</p>
        </div>
      </div>
    </section>
  );
}
