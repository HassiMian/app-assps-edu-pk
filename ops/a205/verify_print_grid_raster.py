#!/usr/bin/env python3
"""A205 regression guard: inspect real Chrome print-to-PDF at low preview zoom.

Requires: PyMuPDF and Pillow. The browser fixture produces A4 PDFs and row
coordinates; this guard checks actual raster pixels rather than CSS existence.
"""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import statistics
import fitz
from PIL import Image

def inspect(pdf_path: str, positions_path: str, zoom: float = 0.75) -> dict:
    pages = fitz.open(pdf_path)
    coords = json.loads(Path(positions_path).read_text())
    assert len(pages) == 4, f"Expected 4 A4 pages, got {len(pages)}"
    assert len(coords) == 25, f"Expected 25 slips, got {len(coords)}"
    images = []
    for page in pages:
        pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)
        images.append(Image.frombytes("RGB", [pix.width, pix.height], pix.samples))
    factor = zoom * .75  # 96 CSS pixels per inch -> 72 PDF points
    h_contrast, v_contrast = [], []
    for card in coords:
        image = images[card["page"]]
        for row in card["rowRects"][1:]:
            x = round((card["body"]["x"]+12)*factor)
            y = round(row["y"]*factor)
            red = min(image.getpixel((x, yy))[0] for yy in range(y-2, y+4))
            h_contrast.append(253-red)  # blush subject field background red=253
        divider = card["divider"]
        for row in card["rowRects"]:
            x = round((divider["x"]+divider["w"])*factor)
            y = round((row["y"]+row["h"]*.7)*factor)
            red = min(image.getpixel((xx,y))[0] for xx in range(x-2,x+3))
            v_contrast.append(253-red)
    return dict(pages=len(pages),cards=len(coords),horizontal_count=len(h_contrast),
                horizontal_weak=sum(x<20 for x in h_contrast),
                horizontal_min=min(h_contrast),
                horizontal_median=statistics.median(h_contrast),
                vertical_count=len(v_contrast),
                vertical_weak=sum(x<20 for x in v_contrast),
                vertical_min=min(v_contrast),
                vertical_median=statistics.median(v_contrast))

if __name__ == "__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("--before-pdf", required=True)
    ap.add_argument("--before-positions", required=True)
    ap.add_argument("--after-pdf", required=True)
    ap.add_argument("--after-positions", required=True)
    args=ap.parse_args()
    before=inspect(args.before_pdf,args.before_positions)
    after=inspect(args.after_pdf,args.after_positions)
    print("A205_LOW_ZOOM_PIXEL_BEFORE",json.dumps(before))
    print("A205_LOW_ZOOM_PIXEL_AFTER",json.dumps(after))
    assert before["horizontal_weak"]>0 and before["vertical_weak"]>0, "Baseline is not sensitive to bug"
    assert after["horizontal_weak"]==0 and after["vertical_weak"]==0, "Some optical grid strokes remain weak"
    assert after["horizontal_min"]>before["horizontal_min"]
    assert after["vertical_min"]>before["vertical_min"]
    print("A205_LOW_ZOOM_PDF_RASTER_PASS")
