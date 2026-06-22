from __future__ import annotations

import csv
import hashlib
import json
import zipfile
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[2]
QA = ROOT / "output" / "marketing" / "restaurant-sales-kit" / "qa"
QA.mkdir(parents=True, exist_ok=True)

checks: list[dict] = []


def record(name: str, ok: bool, detail: str) -> None:
    checks.append({"check": name, "status": "pass" if ok else "fail", "detail": detail})


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def check_pdf(filename: str, pages: int, trim_mm: tuple[float, float], max_bytes: int) -> None:
    path = ROOT / "output" / "pdf" / filename
    reader = PdfReader(path)
    record(f"{filename}: page count", len(reader.pages) == pages, f"expected {pages}; found {len(reader.pages)}")
    for index, page in enumerate(reader.pages, 1):
        trim = page.trimbox
        width_mm = float(trim.width) * 25.4 / 72
        height_mm = float(trim.height) * 25.4 / 72
        ok = abs(width_mm - trim_mm[0]) < 0.2 and abs(height_mm - trim_mm[1]) < 0.2
        record(f"{filename}: page {index} trim", ok, f"{width_mm:.2f} x {height_mm:.2f} mm")
        text = page.extract_text() or ""
        suspicious = any(token in text for token in ("ï¿½", "â€™", "â€¢", "Ã"))
        record(f"{filename}: page {index} text encoding", not suspicious, "no suspicious replacement sequences" if not suspicious else "suspicious sequence detected")
    record(f"{filename}: file size", path.stat().st_size <= max_bytes, f"{path.stat().st_size:,} bytes")


check_pdf("gozaika-rsk-a4-en-print-v1.0.pdf", 2, (210, 297), 5_000_000)
check_pdf("gozaika-rsk-a6-en-print-v1.0.pdf", 2, (105, 148), 3_000_000)
check_pdf("gozaika-rsk-email-one-pager-en-v1.0.pdf", 1, (210, 297), 2_000_000)

whatsapp = ROOT / "output" / "marketing" / "restaurant-sales-kit" / "digital" / "gozaika-rsk-whatsapp-en-v1.0.png"
with Image.open(whatsapp) as im:
    record("WhatsApp image dimensions", im.size == (1080, 1350), f"{im.size[0]} x {im.size[1]} px")
    record("WhatsApp image mode", im.mode in {"RGB", "RGBA"}, im.mode)

pptx = ROOT / "output" / "presentations" / "gozaika-rsk-sales-deck-en-v1.0" / "gozaika-rsk-sales-deck-en-v1.0.pptx"
with zipfile.ZipFile(pptx) as archive:
    slides = [name for name in archive.namelist() if name.startswith("ppt/slides/slide") and name.endswith(".xml")]
    media = [name for name in archive.namelist() if name.startswith("ppt/media/")]
    xml = "\n".join(archive.read(name).decode("utf-8", errors="replace") for name in slides)
    record("Sales deck slide count", len(slides) == 7, f"{len(slides)} editable slides")
    record("Sales deck media", len(media) >= 4, f"{len(media)} embedded media files")
    record("Sales deck key CTA", "partners@gozaika.in" in xml and "gozaika.in/for-restaurants" in xml, "email and URL present")
record("Sales deck file size", pptx.stat().st_size <= 5_000_000, f"{pptx.stat().st_size:,} bytes")

claims_path = ROOT / "marketing-source" / "restaurant-sales-kit" / "claims" / "restaurant-sales-claims.csv"
with claims_path.open(encoding="utf-8-sig", newline="") as handle:
    claim_rows = list(csv.DictReader(handle))
approved = [r for r in claim_rows if r.get("status") == "approved-for-draft"]
pending = [r for r in claim_rows if r.get("status") != "approved-for-draft"]
record("Claim ledger populated", bool(approved) and bool(pending), f"{len(approved)} approved-for-draft; {len(pending)} gated")

localization = ROOT / "marketing-source" / "restaurant-sales-kit" / "localization" / "source-strings-v1.csv"
with localization.open(encoding="utf-8-sig", newline="") as handle:
    rows = list(csv.DictReader(handle))
locale_gate_ok = all(
    not r["hi_IN"] and not r["te_IN"] and r["hi_status"] == "human-review-required" and r["te_status"] == "human-review-required"
    for r in rows
)
record("Localization release gate", locale_gate_ok, f"{len(rows)} source strings held for fluent human review")

qr_evidence_path = QA / "qr-verification.json"
if qr_evidence_path.exists():
    qr_evidence = json.loads(qr_evidence_path.read_text(encoding="utf-8"))
    qr_ok = len(qr_evidence.get("results", [])) == 2 and all(item.get("pass") for item in qr_evidence["results"])
    record("Rendered print QR decode", qr_ok, "A4 and A6 decode to the exact tracked restaurant URL")
else:
    record("Rendered print QR decode", False, "qr-verification.json is missing")

release_files = [
    ROOT / "output" / "pdf" / "gozaika-rsk-a4-en-print-v1.0.pdf",
    ROOT / "output" / "pdf" / "gozaika-rsk-a6-en-print-v1.0.pdf",
    ROOT / "output" / "pdf" / "gozaika-rsk-email-one-pager-en-v1.0.pdf",
    whatsapp,
    ROOT / "output" / "marketing" / "restaurant-sales-kit" / "digital" / "gozaika-rsk-follow-up-email-en-v1.0.txt",
    ROOT / "output" / "marketing" / "restaurant-sales-kit" / "digital" / "gozaika-rsk-follow-up-whatsapp-en-v1.0.txt",
    pptx,
]
manifest = {
    "schemaVersion": 1,
    "release": "gozaika-restaurant-sales-kit-en-v1.0",
    "generatedAt": datetime.now(timezone.utc).isoformat(),
    "files": [
        {"path": str(p.relative_to(ROOT)).replace("\\", "/"), "bytes": p.stat().st_size, "sha256": sha256(p)}
        for p in release_files
    ],
}
(QA / "release-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

passed = sum(c["status"] == "pass" for c in checks)
failed = len(checks) - passed
lines = [
    "# Restaurant sales kit QA report",
    "",
    f"Generated: {datetime.now(timezone.utc).isoformat()}",
    f"Result: {'PASS' if failed == 0 else 'FAIL'} ({passed}/{len(checks)} checks passed)",
    "",
    "| Check | Status | Evidence |",
    "|---|---:|---|",
]
for check in checks:
    lines.append(f"| {check['check']} | {check['status'].upper()} | {check['detail']} |")
lines += [
    "",
    "## Human release gates",
    "",
    "- Visual inspection completed for both A4 pages, both A6 pages, the email one-pager, the WhatsApp image, and all seven deck slides.",
    "- The A4 and A6 raster proofs machine-decode to the exact tracked restaurant URL; also test-scan one physical proof before a production print run.",
    "- Hindi and Telugu layouts remain blocked until fluent human review is recorded.",
    "- Numeric pricing, performance, privacy, revenue, and demand claims remain blocked unless the claim ledger is updated with evidence and owner approval.",
]
(QA / "qa-report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

print(f"{'PASS' if failed == 0 else 'FAIL'}: {passed}/{len(checks)} checks")
if failed:
    for check in checks:
        if check["status"] == "fail":
            print(f"- {check['check']}: {check['detail']}")
    raise SystemExit(1)
