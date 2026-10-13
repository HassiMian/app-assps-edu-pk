#!/usr/bin/env python3
"""Strict, non-mutating PDF embedded-font preflight for Urdu school printing.

This gate detects Jameel Noori *font-name presence* in readable PDF font dictionaries.
It cannot establish visual glyph parity, physical hardware output or a person's signoff.
Unsupported PDFs (e.g. compressed object-stream font dictionaries) fail closed.
"""
import argparse
import json
import pathlib
import re
import stat
import sys

FONT_RECORD = re.compile(rb"/(?:BaseFont|FontName)\s*/([A-Za-z0-9_+#.\-]+)")
FAMILY_RECORD = re.compile(rb"/FontFamily\s*\(([^)]{1,150})\)")
MAX_SIZE = 25 * 1024 * 1024


def decode_pdf_name(raw):
    # PDF literal /Name accepts #XX escaped bytes, including escaped spaces.
    return re.sub(rb"#([0-9A-Fa-f]{2})", lambda m: bytes((int(m.group(1), 16),)), raw).decode("latin-1")


def inspect(path):
    path = pathlib.Path(path)
    if path.is_symlink() or not path.is_file() or not stat.S_ISREG(path.lstat().st_mode):
        raise ValueError("Expected an existing regular non-symlink PDF")
    if path.stat().st_size > MAX_SIZE or path.stat().st_size < 64:
        raise ValueError("PDF size outside guarded bounds")
    data = path.read_bytes()
    if not data.startswith(b"%PDF-") or b"%%EOF" not in data[-2048:]:
        raise ValueError("Missing basic PDF header or trailer")
    fonts = sorted({decode_pdf_name(name) for name in FONT_RECORD.findall(data)})
    families = sorted({item.decode("latin-1", errors="replace") for item in FAMILY_RECORD.findall(data)})
    normalized = [re.sub(r"[^a-z]", "", font.casefold().split("+")[-1]) for font in fonts]
    matches = any("jameel" in font and ("noori" in font or "nuri" in font) for font in normalized)
    outcome = "PASS_JAMEEL_FONT_NAME_DETECTED_ONLY" if matches else "HOLD_JAMEEL_NOT_VERIFIED"
    return {"status": outcome, "font_names": fonts[:60], "font_families": families[:30],
            "read_only": True, "print_hardware_certified": False,
            "full_font_rendering_certified": False, "font_names_visible": bool(fonts)}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("pdf", nargs="+")
    args = p.parse_args()
    results = []
    for filename in args.pdf:
        try:
            results.append({"file_label": pathlib.Path(filename).name, **inspect(filename)})
        except (OSError, ValueError) as ex:
            results.append({"file_label": pathlib.Path(filename).name, "status": "HOLD_PDF_INSPECTION_ERROR",
                            "reason": str(ex), "read_only": True,
                            "print_hardware_certified": False})
    passed = all(item["status"] == "PASS_JAMEEL_FONT_NAME_DETECTED_ONLY" for item in results)
    print(json.dumps({"status": "PASS_SOURCE_FONT_NAME_ONLY" if passed else "HOLD_FONT_PARITY",
                      "results": results, "physical_print_signoff": False}, sort_keys=True))
    return 0 if passed else 2


if __name__ == "__main__":
    sys.exit(main())
