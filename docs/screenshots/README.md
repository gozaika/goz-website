# goZaika screenshot library

Durable, self-sorting, uniquely-identified capture library. The owner reviews these
screenshots **in lieu of live demos**, so every capture must be trustworthy: the right
screen, verifiably identified, sortable by flow, and overwritten in place when a better
capture of the same screen is taken.

One subfolder per app:

| Folder | App | Serve/port | Capture method |
|---|---|---|---|
| `consumer-web/` | apps/consumer-web | `:3000` | `preview_*` |
| `restaurant-mgmt-web/` | apps/restaurant-mgmt-web | `:3001` | `preview_*` |
| `website/` | apps/website (gozaika.in) | `:3002` | `preview_*` |
| `consumer-mobile/` | apps/consumer-mobile (`in.gozaika.customer`) | Metro | `adb exec-out screencap` |
| `restaurant-mobile/` | apps/restaurant-mobile | Metro | `adb exec-out screencap` |

Each folder has an **`INDEX.md`** — the per-app registry and the source of truth
(screen-id → route → filename → last-captured note). Update the INDEX whenever a screen
is added or re-captured.

---

## 1. Screen-ID system (the stable identity of a screen)

Every screen has a **stable, unique, kebab-case screen-id** (e.g. `drops-list`,
`drop-detail`, `claim-allergen-gate`). The id never changes once assigned — routes and
copy may drift, the id does not. The id is embedded in the running UI as an **invisible
attribute** so a capture can be verified programmatically before the shutter fires. This
is what stops filenames from silently drifting off the wrong screen.

The same logical screen can appear in both a web and a mobile folder (e.g. `drop-detail`
in `consumer-web/` and in `consumer-mobile/`). The **folder disambiguates the platform**;
the id stays identical so the two are obviously the same surface.

### Web — `data-screen-id`
Add `data-screen-id="<id>"` to each page's root `<main>` / top-level wrapper.
- Invisible, zero visual impact, ignored by assistive tech and axe (it is not `role`,
  not `aria-*`, not focusable).
- Helper: `apps/*/lib/screen-id.ts` exports nothing special — just set the attribute
  directly on the page root, e.g. `<main data-screen-id="drops-list">`.
- **Verify before capture** (removes the Next overlay too):
  ```js
  // preview_eval
  (() => { document.querySelector('nextjs-portal')?.remove();
           return document.querySelector('[data-screen-id]')?.getAttribute('data-screen-id'); })()
  ```
  The returned id MUST equal the id you are about to write to the filename.

### Mobile (React Native — no DOM) — `testID`
Add `testID="screen:<id>"` to each route's root `<Screen>` / top-level `<View>`.
- Surfaces as `resource-id` in the native view tree.
- **Verify before capture**:
  ```sh
  adb -s <serial> shell uiautomator dump /sdcard/window_dump.xml
  adb -s <serial> shell cat /sdcard/window_dump.xml | grep -o 'screen:[a-z0-9-]*'
  ```
  The printed `screen:<id>` MUST match the id in the filename.

---

## 2. Filename nomenclature

```
<order>-<flow><step>__<screen-id>.png
```

- **`<order>`** — integer for the major flow, so folders sort by journey order:
  | order | flow group |
  |---|---|
  | 1 | auth / onboarding |
  | 2 | discovery (drops, restaurants, cities) |
  | 3 | claim / checkout |
  | 4 | orders / pickup |
  | 5 | account / passport |
  | 6 | restaurant portal / restaurant mobile |
  | 7 | website (marketing) |
- **`<flow>`** — letter `A`/`B`/`C`… grouping parallel sub-flows within that order
  (e.g. `2-A` = drops browse, `2-B` = restaurants browse).
- **`<step>`** — integer step within the sub-flow.
- **`<screen-id>`** — the stable id, matches the invisible attribute exactly.

Examples: `2-A1__drops-list.png` · `2-A2__drop-detail.png` ·
`3-A1__claim-allergen-gate.png` · `3-B1__checkout-simulated.png` ·
`4-A1__order-pickup-proof.png`

**Overwrite rule:** the same screen re-captured ⇒ **same filename ⇒ overwrite**. Keep only
the best/latest capture of each screen. Never suffix `-v2`/`-new`; the id owns the slot.

---

## 3. Capture workflow

### Web (`preview_*`)
1. Ensure the dev server is up (`preview_start <name>` from `.claude/launch.json`).
2. Navigate / log in as needed (seed creds: `supabase/seed_demo/README.md`).
3. `preview_eval` the verify-and-clean snippet above; confirm the returned id.
4. `preview_screenshot`; save to `docs/screenshots/<app>/<order>-<flow><step>__<id>.png`.
5. Update that app's `INDEX.md` (last-captured note).

Capture at desktop by default; add responsive variants only when layout is the point
(then note the width in the INDEX row, not the filename).

### Mobile (`adb`)
```sh
adb -s <serial> exec-out screencap -p > docs/screenshots/<app>/<order>-<flow><step>__<id>.png
```
Devices: Pixel 7a `3A021JEHN02437` (device) + `emulator-5554`. Verify the on-screen
`screen:<id>` via `uiautomator dump` first (step 2 above). Capture on **both** device and
emulator for surfaces under active verification; keep the device capture as the canonical
file and note the emulator confirmation in the INDEX.

---

## 4. Registry discipline
- The per-app `INDEX.md` is the source of truth for screen-ids. Assign the id there
  first, then embed the attribute, then capture.
- A screen with no invisible attribute yet is **not capture-ready** — add the attribute
  (grow-as-you-go, per screen, to avoid a risky all-apps sweep) before its first capture.
- Commit screenshots together with the code/attribute change that produced them.
