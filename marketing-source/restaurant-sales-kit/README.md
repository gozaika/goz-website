# Restaurant sales kit source

This directory contains the controlled source for the restaurant-acquisition kit. The copy in `copy/en-v1.json` uses only safe, non-quantified claims. `claims/restaurant-sales-claims.csv` is the release gate for all pricing, performance, privacy, and customer-data statements.

Production outputs are generated under the ignored, disposable `output/` directory and published into `C:\venkat\limca\gozaika\marketing\restaurant-sales-kit` only after visual and technical QA. Never commit `output/`; rebuild it from this directory when a release changes.

Canonical assets remain `icons/gozaika-logo.svg`, `icons/flame.svg`, and the approved restaurant hero master. Text, QR codes, and brand geometry are deterministic layers.

## Build

- `node prepare-assets.mjs`
- `python build_a4_leave_behind.py`
- `python build_derived_print.py`
- `node compose-digital-assets.mjs`
- Run `build_sales_deck.mjs` from the bundled presentation workspace described in the project build notes.

The English print, digital, and deck files are release candidates. Hindi and Telugu remain localization-ready source only until fluent human review is recorded in `localization/source-strings-v1.csv`.

## Ownership boundary

- This directory is the sole source of truth for copy, claims, localization inputs, build scripts, and QA logic.
- `output/` is a disposable build staging area.
- `C:\venkat\limca\gozaika\marketing\restaurant-sales-kit\<version>` contains released deliverables, release manifests, and QA evidence only.
- Do not copy source scripts or specifications into future marketing releases. Retrieve them from this repository at the release commit.
