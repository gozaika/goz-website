from __future__ import annotations

import json
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.graphics.barcode import qr
from reportlab.platypus import Paragraph

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "marketing-source" / "restaurant-sales-kit"
ASSETS = ROOT / "output" / "marketing" / "restaurant-sales-kit" / "assets"
OUTPUT = ROOT / "output" / "pdf"
OUTPUT.mkdir(parents=True, exist_ok=True)

with (SOURCE / "copy" / "en-v1.json").open("r", encoding="utf-8") as handle:
    COPY = json.load(handle)

pdfmetrics.registerFont(TTFont("Arial", r"C:\Windows\Fonts\arial.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Bold", r"C:\Windows\Fonts\arialbd.ttf"))
pdfmetrics.registerFont(TTFont("Georgia-Bold", r"C:\Windows\Fonts\georgiab.ttf"))

CREAM = HexColor("#FFF8F0")
SAFFRON = HexColor("#FF6B35")
FOREST = HexColor("#1A5C38")
GOLD = HexColor("#D4A017")
CHARCOAL = HexColor("#2D2D2D")
MUTED = HexColor("#646464")
PALE = HexColor("#F2E7DA")

BLEED = 3 * mm
TRIM_W = 105 * mm
TRIM_H = 148 * mm
PAGE_W = TRIM_W + 2 * BLEED
PAGE_H = TRIM_H + 2 * BLEED


def style(name, size, leading, color=CHARCOAL, font="Arial", alignment=TA_LEFT):
    return ParagraphStyle(name, fontName=font, fontSize=size, leading=leading, textColor=color, alignment=alignment)


def para(c, text, x, top, width, paragraph_style):
    item = Paragraph(text, paragraph_style)
    _, height = item.wrap(width, 200 * mm)
    item.drawOn(c, x, top - height)
    return height


def qr_code(c, x, y, size):
    url = "https://gozaika.in/for-restaurants?utm_source=field&utm_medium=print&utm_campaign=restaurant_partner_kit_v1#partner-form"
    widget = qr.QrCodeWidget(url)
    widget.qr.make()
    modules = widget.qr.modules
    quiet = 4
    unit = size / (len(modules) + 2 * quiet)
    c.setFillColor(white)
    c.rect(x, y, size, size, fill=1, stroke=0)
    c.setFillColor(FOREST)
    for row, values in enumerate(modules):
        for col, dark in enumerate(values):
            if dark:
                c.rect(x + (quiet + col) * unit, y + (quiet + len(modules) - 1 - row) * unit, unit + 0.04, unit + 0.04, fill=1, stroke=0)


def front(c):
    c.setFillColor(CREAM)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    left = BLEED + 8 * mm
    right = PAGE_W - BLEED - 8 * mm
    width = right - left
    c.drawImage(str(ASSETS / "gozaika-logo.png"), left, PAGE_H - BLEED - 16 * mm, width=37 * mm, height=9.5 * mm, preserveAspectRatio=True, mask="auto")
    c.setFillColor(FOREST)
    c.setFont("Arial-Bold", 6.2)
    c.drawRightString(right, PAGE_H - BLEED - 9 * mm, "RESTAURANT PARTNER")
    para(c, COPY["headline"], left, PAGE_H - BLEED - 24 * mm, width, style("head", 18, 20, FOREST, "Georgia-Bold"))
    para(c, "A limited BAM Bag is discovered in goZaika, reserved, and collected directly from your restaurant.", left, PAGE_H - BLEED - 47 * mm, width, style("sub", 7.6, 10.2))

    photo_y = PAGE_H - BLEED - 88 * mm
    photo_h = 33 * mm
    c.drawImage(ImageReader(ASSETS / "restaurant-hero-crop.jpg"), left, photo_y, width=width, height=photo_h, preserveAspectRatio=False, mask="auto")

    y = photo_y - 6 * mm
    front_bullets = [
        "<b>Be discovered.</b> Reach new diners.",
        "<b>Counter pickup.</b> No delivery handoff.",
        "<b>Stay in control.</b> Set timing and quantity.",
    ]
    for index, item in enumerate(front_bullets):
        c.setFillColor(SAFFRON)
        c.circle(left + 2 * mm, y + 1 * mm, 1.5 * mm, fill=1, stroke=0)
        para(c, item, left + 6 * mm, y + 3 * mm, width - 6 * mm, style(f"p{index}", 6.5, 7.8))
        y -= 8 * mm

    c.setFillColor(FOREST)
    c.rect(0, BLEED, PAGE_W, 29 * mm, fill=1, stroke=0)
    qr_code(c, right - 21 * mm, BLEED + 4 * mm, 21 * mm)
    para(c, "Book a 15-minute<br/>partner walkthrough.", left, BLEED + 22 * mm, width - 25 * mm, style("cta", 9.5, 11.5, white, "Arial-Bold"))
    c.setFillColor(white)
    c.setFont("Arial", 5.8)
    c.drawString(left, BLEED + 5 * mm, "gozaika.in/for-restaurants")


def back(c):
    c.setFillColor(CREAM)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    left = BLEED + 8 * mm
    right = PAGE_W - BLEED - 8 * mm
    width = right - left
    c.setFillColor(FOREST)
    c.rect(0, PAGE_H - BLEED - 30 * mm, PAGE_W, 30 * mm, fill=1, stroke=0)
    c.drawImage(str(ASSETS / "gozaika-logo-white.png"), left, PAGE_H - BLEED - 15 * mm, width=35 * mm, height=9 * mm, preserveAspectRatio=True, mask="auto")
    para(c, "A simple pickup flow.", left, PAGE_H - BLEED - 20 * mm, width, style("bh", 13, 15, white, "Georgia-Bold"))

    y = PAGE_H - BLEED - 40 * mm
    for item in COPY["steps"]:
        c.setFillColor(GOLD)
        c.setFont("Arial-Bold", 11)
        c.drawString(left, y, item["number"])
        para(c, f'<b>{item["title"]}</b><br/>{item["body"]}', left + 13 * mm, y + 3 * mm, width - 13 * mm, style(f's{item["number"]}', 7, 8.8))
        y -= 18 * mm

    c.setFillColor(FOREST)
    c.setFont("Arial-Bold", 7.2)
    c.drawString(left, y - 1 * mm, "YOU CONTROL")
    y -= 9 * mm
    for item in COPY["controls"][:3]:
        c.setFillColor(SAFFRON)
        c.circle(left + 1.5 * mm, y + 0.7 * mm, 1.2 * mm, fill=1, stroke=0)
        para(c, item, left + 5 * mm, y + 3 * mm, width - 5 * mm, style("control", 6.6, 8.3))
        y -= 10 * mm

    para(c, COPY["commercialNote"], left, BLEED + 21 * mm, width, style("note", 6.5, 8, FOREST, "Arial-Bold"))
    c.setFillColor(FOREST)
    c.setFont("Arial-Bold", 7.2)
    c.drawString(left, BLEED + 9 * mm, COPY["email"])
    c.drawRightString(right, BLEED + 9 * mm, "v1.0 | 21 June 2026")


raw = OUTPUT / "gozaika-rsk-a6-en-print-v1.0-raw.pdf"
final = OUTPUT / "gozaika-rsk-a6-en-print-v1.0.pdf"
c = canvas.Canvas(str(raw), pagesize=(PAGE_W, PAGE_H), pageCompression=1)
front(c)
c.showPage()
back(c)
c.showPage()
c.save()

reader = PdfReader(str(raw))
writer = PdfWriter()
for page in reader.pages:
    page.trimbox.lower_left = (BLEED, BLEED)
    page.trimbox.upper_right = (BLEED + TRIM_W, BLEED + TRIM_H)
    writer.add_page(page)
with final.open("wb") as handle:
    writer.write(handle)
raw.unlink()

# Email one-pager: front page of the approved A4 file, preserving its trim box.
a4 = PdfReader(str(OUTPUT / "gozaika-rsk-a4-en-print-v1.0.pdf"))
email_writer = PdfWriter()
email_page = a4.pages[0]
email_page.mediabox.lower_left = email_page.trimbox.lower_left
email_page.mediabox.upper_right = email_page.trimbox.upper_right
email_page.cropbox.lower_left = email_page.trimbox.lower_left
email_page.cropbox.upper_right = email_page.trimbox.upper_right
email_writer.add_page(email_page)
email_path = OUTPUT / "gozaika-rsk-email-one-pager-en-v1.0.pdf"
with email_path.open("wb") as handle:
    email_writer.write(handle)

print(final)
print(email_path)
