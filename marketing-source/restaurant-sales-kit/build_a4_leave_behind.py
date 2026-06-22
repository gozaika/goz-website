from __future__ import annotations

import json
from pathlib import Path

from PIL import Image
from pypdf import PdfReader, PdfWriter
from reportlab.graphics.barcode import qr
from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "marketing-source" / "restaurant-sales-kit"
ASSETS = ROOT / "output" / "marketing" / "restaurant-sales-kit" / "assets"
OUTPUT = ROOT / "output" / "pdf"
OUTPUT.mkdir(parents=True, exist_ok=True)

BLEED = 3 * mm
TRIM_W = 210 * mm
TRIM_H = 297 * mm
PAGE_W = TRIM_W + 2 * BLEED
PAGE_H = TRIM_H + 2 * BLEED

CREAM = HexColor("#FFF8F0")
SAFFRON = HexColor("#FF6B35")
FOREST = HexColor("#1A5C38")
TEAL = HexColor("#194B4A")
GOLD = HexColor("#D4A017")
CHARCOAL = HexColor("#2D2D2D")
MUTED = HexColor("#646464")
PALE = HexColor("#F2E7DA")

pdfmetrics.registerFont(TTFont("Arial", r"C:\Windows\Fonts\arial.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Bold", r"C:\Windows\Fonts\arialbd.ttf"))
pdfmetrics.registerFont(TTFont("Georgia-Bold", r"C:\Windows\Fonts\georgiab.ttf"))

with (SOURCE / "copy" / "en-v1.json").open("r", encoding="utf-8") as handle:
    COPY = json.load(handle)


def pstyle(name: str, size: float, leading: float, color=CHARCOAL, font="Arial", alignment=TA_LEFT):
    return ParagraphStyle(name, fontName=font, fontSize=size, leading=leading, textColor=color, alignment=alignment)


def paragraph(c: canvas.Canvas, text: str, x: float, y_top: float, width: float, style: ParagraphStyle, max_height: float = 200 * mm):
    p = Paragraph(text, style)
    _, height = p.wrap(width, max_height)
    p.drawOn(c, x, y_top - height)
    return height


def rounded(c: canvas.Canvas, x: float, y: float, w: float, h: float, fill, radius=4 * mm, stroke=None):
    c.setFillColor(fill)
    c.setStrokeColor(stroke or fill)
    c.roundRect(x, y, w, h, radius, fill=1, stroke=1 if stroke else 0)


def draw_cover(c: canvas.Canvas, image_path: Path, x: float, y: float, w: float, h: float):
    image = Image.open(image_path)
    source_ratio = image.width / image.height
    target_ratio = w / h
    if source_ratio > target_ratio:
        crop_w = int(image.height * target_ratio)
        left = (image.width - crop_w) // 2
        image = image.crop((left, 0, left + crop_w, image.height))
    else:
        crop_h = int(image.width / target_ratio)
        top = (image.height - crop_h) // 2
        image = image.crop((0, top, image.width, top + crop_h))
    temp = ASSETS / "a4-hero-render.jpg"
    image.convert("RGB").save(temp, quality=88, optimize=True, progressive=True)
    c.drawImage(ImageReader(temp), x, y, width=w, height=h, mask="auto")


def draw_qr(c: canvas.Canvas, x: float, y: float, size: float):
    url = "https://gozaika.in/for-restaurants?utm_source=field&utm_medium=print&utm_campaign=restaurant_partner_kit_v1#partner-form"
    widget = qr.QrCodeWidget(url)
    widget.qr.make()
    modules = widget.qr.modules
    quiet = 4
    module_size = size / (len(modules) + 2 * quiet)
    c.setFillColor(white)
    c.rect(x, y, size, size, fill=1, stroke=0)
    c.setFillColor(FOREST)
    for row, values in enumerate(modules):
        for column, is_dark in enumerate(values):
            if is_dark:
                c.rect(
                    x + (quiet + column) * module_size,
                    y + (quiet + len(modules) - 1 - row) * module_size,
                    module_size + 0.05,
                    module_size + 0.05,
                    fill=1,
                    stroke=0,
                )


def footer(c: canvas.Canvas, page_label: str):
    x = BLEED + 14 * mm
    c.setFont("Arial", 7.5)
    c.setFillColor(MUTED)
    c.drawString(x, BLEED + 6 * mm, f"Restaurant Partner Brief | v1.0 | 21 June 2026 | {page_label}")


def front(c: canvas.Canvas):
    c.setFillColor(CREAM)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    left = BLEED + 14 * mm
    right = PAGE_W - BLEED - 14 * mm
    content_w = right - left

    c.drawImage(str(ASSETS / "gozaika-logo.png"), left, PAGE_H - BLEED - 22 * mm, width=49 * mm, height=12.5 * mm, preserveAspectRatio=True, mask="auto")
    c.setFillColor(FOREST)
    c.setFont("Arial-Bold", 8.5)
    c.drawRightString(right, PAGE_H - BLEED - 14 * mm, "RESTAURANT PARTNER BRIEF")

    headline_top = PAGE_H - BLEED - 35 * mm
    paragraph(c, COPY["headline"], left, headline_top, content_w * 0.58, pstyle("front-head", 29, 31, FOREST, "Georgia-Bold"))
    paragraph(c, COPY["subheadline"], left, headline_top - 35 * mm, content_w * 0.56, pstyle("front-sub", 11.5, 16, CHARCOAL))

    photo_x = left + content_w * 0.61
    photo_y = PAGE_H - BLEED - 103 * mm
    photo_w = content_w * 0.39
    photo_h = 68 * mm
    rounded(c, photo_x - 1.5 * mm, photo_y - 1.5 * mm, photo_w + 3 * mm, photo_h + 3 * mm, white, radius=5 * mm)
    c.saveState()
    path_obj = c.beginPath()
    path_obj.roundRect(photo_x, photo_y, photo_w, photo_h, 4 * mm)
    c.clipPath(path_obj, stroke=0, fill=0)
    draw_cover(c, ASSETS / "restaurant-hero-crop.jpg", photo_x, photo_y, photo_w, photo_h)
    c.restoreState()

    c.setFillColor(SAFFRON)
    c.rect(left, PAGE_H - BLEED - 113 * mm, 22 * mm, 1.6 * mm, fill=1, stroke=0)
    c.setFillColor(FOREST)
    c.setFont("Arial-Bold", 9)
    c.drawString(left, PAGE_H - BLEED - 121 * mm, "WHY RESTAURANTS USE GOZAIKA")

    card_y = PAGE_H - BLEED - 180 * mm
    gap = 5 * mm
    card_w = (content_w - 2 * gap) / 3
    card_h = 50 * mm
    for index, item in enumerate(COPY["pillars"]):
        x = left + index * (card_w + gap)
        rounded(c, x, card_y, card_w, card_h, white, radius=4 * mm, stroke=PALE)
        c.setFillColor(SAFFRON)
        c.circle(x + 9 * mm, card_y + card_h - 10 * mm, 4.3 * mm, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont("Arial-Bold", 8)
        c.drawCentredString(x + 9 * mm, card_y + card_h - 11.2 * mm, str(index + 1))
        paragraph(c, item["title"], x + 6 * mm, card_y + card_h - 20 * mm, card_w - 12 * mm, pstyle(f"pt{index}", 12, 14, FOREST, "Arial-Bold"))
        paragraph(c, item["body"], x + 6 * mm, card_y + card_h - 31 * mm, card_w - 12 * mm, pstyle(f"pb{index}", 9, 12.5, CHARCOAL))

    steps_y = PAGE_H - BLEED - 235 * mm
    c.setFont("Arial-Bold", 9)
    c.setFillColor(FOREST)
    c.drawString(left, steps_y + 30 * mm, "ONE SIMPLE PICKUP FLOW")
    step_w = (content_w - 2 * gap) / 3
    for index, item in enumerate(COPY["steps"]):
        x = left + index * (step_w + gap)
        c.setFillColor(GOLD)
        c.setFont("Arial-Bold", 15)
        c.drawString(x, steps_y + 18 * mm, item["number"])
        c.setFillColor(FOREST)
        c.setFont("Arial-Bold", 10.5)
        c.drawString(x + 13 * mm, steps_y + 19 * mm, item["title"])
        paragraph(c, item["body"], x + 13 * mm, steps_y + 14 * mm, step_w - 13 * mm, pstyle(f"sb{index}", 8.2, 11, CHARCOAL))

    band_h = 39 * mm
    c.setFillColor(FOREST)
    c.rect(0, BLEED, PAGE_W, band_h, fill=1, stroke=0)
    qr_size = 27 * mm
    draw_qr(c, right - qr_size, BLEED + 6 * mm, qr_size)
    paragraph(c, COPY["cta"], left, BLEED + 31 * mm, content_w - qr_size - 10 * mm, pstyle("cta", 15, 18, white, "Arial-Bold"))
    c.setFillColor(white)
    c.setFont("Arial", 9)
    c.drawString(left, BLEED + 12 * mm, f'{COPY["url"]}  |  {COPY["email"]}')
    footer(c, "Front")


def back(c: canvas.Canvas):
    c.setFillColor(CREAM)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    left = BLEED + 14 * mm
    right = PAGE_W - BLEED - 14 * mm
    content_w = right - left

    c.setFillColor(FOREST)
    c.rect(0, PAGE_H - BLEED - 52 * mm, PAGE_W, 52 * mm, fill=1, stroke=0)
    c.drawImage(str(ASSETS / "gozaika-logo-white.png"), left, PAGE_H - BLEED - 22 * mm, width=49 * mm, height=12.5 * mm, preserveAspectRatio=True, mask="auto")
    paragraph(c, "A controlled pickup workflow.", left, PAGE_H - BLEED - 31 * mm, content_w, pstyle("back-head", 23, 25, white, "Georgia-Bold"))
    paragraph(c, "Built around restaurant control, clear disclosures, and a clean counter handoff.", left, PAGE_H - BLEED - 43 * mm, content_w, pstyle("back-sub", 10.5, 13, white))

    y_top = PAGE_H - BLEED - 67 * mm
    c.setFont("Arial-Bold", 9)
    c.setFillColor(FOREST)
    c.drawString(left, y_top, "YOU STAY IN CONTROL")
    y = y_top - 10 * mm
    for item in COPY["controls"]:
        c.setFillColor(SAFFRON)
        c.circle(left + 2.4 * mm, y + 1.3 * mm, 1.6 * mm, fill=1, stroke=0)
        paragraph(c, item, left + 7 * mm, y + 4 * mm, content_w * 0.53, pstyle("control", 9.2, 12, CHARCOAL))
        y -= 11.5 * mm

    readiness_x = left + content_w * 0.60
    readiness_w = content_w * 0.40
    rounded(c, readiness_x, y_top - 62 * mm, readiness_w, 63 * mm, white, radius=4 * mm, stroke=PALE)
    paragraph(c, "PILOT READINESS", readiness_x + 6 * mm, y_top - 8 * mm, readiness_w - 12 * mm, pstyle("ready-head", 10, 12, FOREST, "Arial-Bold"))
    ry = y_top - 18 * mm
    for item in COPY["readiness"]:
        c.setStrokeColor(GOLD)
        c.rect(readiness_x + 6 * mm, ry - 1 * mm, 4 * mm, 4 * mm, fill=0, stroke=1)
        paragraph(c, item, readiness_x + 13 * mm, ry + 3 * mm, readiness_w - 19 * mm, pstyle("ready", 8.4, 10.5, CHARCOAL))
        ry -= 12 * mm

    compare_top = PAGE_H - BLEED - 151 * mm
    gap = 6 * mm
    col_w = (content_w - gap) / 2
    rounded(c, left, compare_top - 72 * mm, col_w, 72 * mm, white, radius=4 * mm, stroke=PALE)
    rounded(c, left + col_w + gap, compare_top - 72 * mm, col_w, 72 * mm, TEAL, radius=4 * mm)
    paragraph(c, "WHAT GOZAIKA IS", left + 7 * mm, compare_top - 8 * mm, col_w - 14 * mm, pstyle("ishead", 11, 13, FOREST, "Arial-Bold"))
    paragraph(c, "WHAT IT IS NOT", left + col_w + gap + 7 * mm, compare_top - 8 * mm, col_w - 14 * mm, pstyle("nothead", 11, 13, white, "Arial-Bold"))
    iy = compare_top - 20 * mm
    for index, item in enumerate(COPY["is"]):
        c.setFillColor(SAFFRON)
        c.circle(left + 8.5 * mm, iy - 0.5 * mm, 1.5 * mm, fill=1, stroke=0)
        paragraph(c, item, left + 14 * mm, iy + 3 * mm, col_w - 21 * mm, pstyle(f"is{index}", 8.7, 11, CHARCOAL))
        iy -= 12 * mm
    ny = compare_top - 20 * mm
    for index, item in enumerate(COPY["isNot"]):
        c.setStrokeColor(GOLD)
        c.setLineWidth(1.3)
        c.line(left + col_w + gap + 7 * mm, ny - 0.5 * mm, left + col_w + gap + 10 * mm, ny - 0.5 * mm)
        paragraph(c, item, left + col_w + gap + 14 * mm, ny + 3 * mm, col_w - 21 * mm, pstyle(f"not{index}", 8.7, 11, white))
        ny -= 12 * mm

    note_y = BLEED + 50 * mm
    rounded(c, left, note_y, content_w, 26 * mm, PALE, radius=3 * mm)
    paragraph(c, COPY["commercialNote"], left + 7 * mm, note_y + 18 * mm, content_w - 14 * mm, pstyle("commercial", 10, 13, FOREST, "Arial-Bold"))
    paragraph(c, "No POS integration is required for the initial operating model.", left + 7 * mm, note_y + 9 * mm, content_w - 14 * mm, pstyle("pos", 8.5, 11, CHARCOAL))

    band_h = 39 * mm
    c.setFillColor(FOREST)
    c.rect(0, BLEED, PAGE_W, band_h, fill=1, stroke=0)
    qr_size = 27 * mm
    draw_qr(c, right - qr_size, BLEED + 6 * mm, qr_size)
    paragraph(c, COPY["cta"], left, BLEED + 31 * mm, content_w - qr_size - 10 * mm, pstyle("cta2", 15, 18, white, "Arial-Bold"))
    c.setFillColor(white)
    c.setFont("Arial", 9)
    c.drawString(left, BLEED + 12 * mm, f'{COPY["url"]}  |  {COPY["email"]}')
    footer(c, "Back")


raw_pdf = OUTPUT / "gozaika-rsk-a4-en-print-v1.0-raw.pdf"
final_pdf = OUTPUT / "gozaika-rsk-a4-en-print-v1.0.pdf"
c = canvas.Canvas(str(raw_pdf), pagesize=(PAGE_W, PAGE_H), pageCompression=1)
front(c)
c.showPage()
back(c)
c.showPage()
c.save()

reader = PdfReader(str(raw_pdf))
writer = PdfWriter()
for page in reader.pages:
    page.trimbox.lower_left = (BLEED, BLEED)
    page.trimbox.upper_right = (BLEED + TRIM_W, BLEED + TRIM_H)
    page.cropbox.lower_left = (0, 0)
    page.cropbox.upper_right = (PAGE_W, PAGE_H)
    writer.add_page(page)
with final_pdf.open("wb") as handle:
    writer.write(handle)
raw_pdf.unlink()
print(final_pdf)
