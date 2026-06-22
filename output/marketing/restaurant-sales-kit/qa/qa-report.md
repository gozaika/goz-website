# Restaurant sales kit QA report

Generated: 2026-06-22T11:39:18.583361+00:00
Result: PASS (25/25 checks passed)

| Check | Status | Evidence |
|---|---:|---|
| gozaika-rsk-a4-en-print-v1.0.pdf: page count | PASS | expected 2; found 2 |
| gozaika-rsk-a4-en-print-v1.0.pdf: page 1 trim | PASS | 210.00 x 297.00 mm |
| gozaika-rsk-a4-en-print-v1.0.pdf: page 1 text encoding | PASS | no suspicious replacement sequences |
| gozaika-rsk-a4-en-print-v1.0.pdf: page 2 trim | PASS | 210.00 x 297.00 mm |
| gozaika-rsk-a4-en-print-v1.0.pdf: page 2 text encoding | PASS | no suspicious replacement sequences |
| gozaika-rsk-a4-en-print-v1.0.pdf: file size | PASS | 406,504 bytes |
| gozaika-rsk-a6-en-print-v1.0.pdf: page count | PASS | expected 2; found 2 |
| gozaika-rsk-a6-en-print-v1.0.pdf: page 1 trim | PASS | 105.00 x 148.00 mm |
| gozaika-rsk-a6-en-print-v1.0.pdf: page 1 text encoding | PASS | no suspicious replacement sequences |
| gozaika-rsk-a6-en-print-v1.0.pdf: page 2 trim | PASS | 105.00 x 148.00 mm |
| gozaika-rsk-a6-en-print-v1.0.pdf: page 2 text encoding | PASS | no suspicious replacement sequences |
| gozaika-rsk-a6-en-print-v1.0.pdf: file size | PASS | 632,430 bytes |
| gozaika-rsk-email-one-pager-en-v1.0.pdf: page count | PASS | expected 1; found 1 |
| gozaika-rsk-email-one-pager-en-v1.0.pdf: page 1 trim | PASS | 210.00 x 297.00 mm |
| gozaika-rsk-email-one-pager-en-v1.0.pdf: page 1 text encoding | PASS | no suspicious replacement sequences |
| gozaika-rsk-email-one-pager-en-v1.0.pdf: file size | PASS | 385,994 bytes |
| WhatsApp image dimensions | PASS | 1080 x 1350 px |
| WhatsApp image mode | PASS | RGBA |
| Sales deck slide count | PASS | 7 editable slides |
| Sales deck media | PASS | 7 embedded media files |
| Sales deck key CTA | PASS | email and URL present |
| Sales deck file size | PASS | 1,211,295 bytes |
| Claim ledger populated | PASS | 6 approved-for-draft; 5 gated |
| Localization release gate | PASS | 16 source strings held for fluent human review |
| Rendered print QR decode | PASS | A4 and A6 decode to the exact tracked restaurant URL |

## Human release gates

- Visual inspection completed for both A4 pages, both A6 pages, the email one-pager, the WhatsApp image, and all seven deck slides.
- The A4 and A6 raster proofs machine-decode to the exact tracked restaurant URL; also test-scan one physical proof before a production print run.
- Hindi and Telugu layouts remain blocked until fluent human review is recorded.
- Numeric pricing, performance, privacy, revenue, and demand claims remain blocked unless the claim ledger is updated with evidence and owner approval.
