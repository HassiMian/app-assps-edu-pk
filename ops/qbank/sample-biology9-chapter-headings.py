#!/usr/bin/env python3
"""Read-only, low-resource OCR samples of scanned official Biology 9 chapter starts.

These are candidate source anchors, not a publication/academic approval pipeline.
Only short image header snippets are retained. Never OCR the whole textbook here.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import time

import pypdfium2 as pdfium
from PIL import ImageEnhance, ImageOps

EXPECTED_SHA = "f6e3181561856359e77749f8f684f87c04c9c0a05bd2f0f60f60b4338c4284c5"
CHAPTER_CANDIDATES = {
    1: (5, 6),
    2: (23, 24, 25),
    3: (40, 41, 42),
    4: (62, 63, 64),
    5: (79, 80, 81),
    6: (92, 93, 94),
    7: (107, 108, 109),
    8: (118, 119, 120),
    9: (132, 133, 134),
    10: (149, 150, 151),
    11: (165, 166, 167),
}

def sha256(path):
    h=hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda:f.read(1024*1024),b""):
            h.update(chunk)
    return h.hexdigest()

def analyze(pdfpath, outpath):
    actual=sha256(pdfpath)
    if actual != EXPECTED_SHA:
        raise ValueError("SOURCE_PDF_HASH_MISMATCH_REFUSE_UNVERIFIED_BOOK")
    doc=pdfium.PdfDocument(str(pdfpath))
    records=[]
    env={**os.environ,"OMP_THREAD_LIMIT":"1","OMP_NUM_THREADS":"1"}
    with tempfile.TemporaryDirectory(prefix="assps-bio9-toc-") as temporary:
        for chapter,pages in CHAPTER_CANDIDATES.items():
            for physical in pages:
                if not (1 <= physical <= len(doc)):
                    continue
                page=doc[physical-1]
                image=page.render(scale=1.45).to_pil().convert("L")
                image=image.crop((0,0,image.width,int(image.height*.51)))
                image=ImageEnhance.Contrast(image).enhance(1.3)
                filename=Path(temporary) / f"ch{chapter:02d}-p{physical:03d}.png"
                image.save(filename,optimize=True)
                try:
                    result=subprocess.run(
                        ["tesseract",str(filename),"stdout","-l","eng","--psm","11"],
                        capture_output=True,text=True,timeout=18,env=env,
                    )
                    lines=[re.sub(r"\s+"," ",x).strip() for x in result.stdout.splitlines()]
                    lines=[x for x in lines if x and len(x) >= 2]
                    header_lines=lines[:12]
                    text=" ".join(header_lines)
                    found=bool(re.search(rf"(?i)\bchapter\s*[:.,-]?\s*{chapter}\b",text))
                    records.append({
                        "chapter":chapter,
                        "pdfPhysicalPage":physical,
                        "headerChapterNumberDetected":found,
                        "headerLines":[f"Chapter {chapter}"] if found else [],
                        "ocrStatus":"OK" if result.returncode==0 else "OCR_EXIT_NONZERO",
                    })
                except subprocess.TimeoutExpired:
                    records.append({
                        "chapter":chapter,"pdfPhysicalPage":physical,
                        "headerChapterNumberDetected":False,
                        "headerLines":[],"ocrStatus":"OCR_TIMEOUT"
                    })
                print(f"BIO9_SOURCE_SAMPLE chapter={chapter} physical={physical} detected={records[-1]['headerChapterNumberDetected']}",flush=True)
                page.close()
                time.sleep(.15)
    output={
        "schemaVersion":"assps-biology9-chapter-header-ocr-samples-v1",
        "sourceRecordId":"pectaa-catalog-009",
        "sourceSha256":actual,
        "sourcePdfPages":len(doc),
        "scope":"BOUNDED_HEADER_OCR_CANDIDATES_NO_ACADEMIC_APPROVAL",
        "academicApprovalGranted":False,
        "textRetentionPolicy":"CHAPTER_MARKERS_ONLY_NO_TEXTBOOK_PARAGRAPHS",
        "requiresHumanImageReview":True,
        "samples":records,
    }
    outpath.parent.mkdir(parents=True,exist_ok=True)
    outpath.write_text(json.dumps(output,indent=2)+"\n")
    return output

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--pdf",type=Path,required=True)
    parser.add_argument("--out",type=Path,required=True)
    args=parser.parse_args()
    o=analyze(args.pdf,args.out)
    print(json.dumps({"sampledPages":len(o["samples"]),
                      "chapterNumberDetected":sum(r["headerChapterNumberDetected"] for r in o["samples"]),
                      "sourcePdfPages":o["sourcePdfPages"],
                      "academicApprovalGranted":o["academicApprovalGranted"]}),flush=True)
