from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image
import zxingcpp

ROOT = Path(__file__).resolve().parents[2]
EXPECTED = "https://gozaika.in/for-restaurants?utm_source=field&utm_medium=print&utm_campaign=restaurant_partner_kit_v1#partner-form"
render_dir = ROOT / "tmp" / "qr-verify"
results = []
for name in ("a4", "a6"):
    path = render_dir / f"{name}.png"
    decoded = [result.text for result in zxingcpp.read_barcodes(Image.open(path))]
    results.append({"surface": name.upper(), "render": str(path.relative_to(ROOT)).replace("\\", "/"), "decoded": decoded, "pass": EXPECTED in decoded})

evidence = {
    "verifiedAt": datetime.now(timezone.utc).isoformat(),
    "expected": EXPECTED,
    "results": results,
}
out = ROOT / "output" / "marketing" / "restaurant-sales-kit" / "qa" / "qr-verification.json"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
print(json.dumps(evidence, indent=2))
if not all(result["pass"] for result in results):
    raise SystemExit(1)
