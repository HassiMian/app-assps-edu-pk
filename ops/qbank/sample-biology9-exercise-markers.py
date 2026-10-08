#!/usr/bin/env python3
"""Bounded OCR of chapter end pages for exercise-heading evidence only.

This does not transcribe, reproduce, approve, or publish textbook questions.
All page anchors and OCR suggestions require manual image verification.
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

def filehash(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for data in iter(lambda:f.read(1024*1024),b''):
            h.update(data)
    return h.hexdigest()

def find_signals(ocr):
    text=ocr.lower()
    return {
      'exerciseHeading':bool(re.search(r'(?im)^\s*exercises?\s*$',text)),
      'mcqInstruction':bool(re.search(r'(?i)select\s+the\s+correct|multiple\s+choice',text)),
      'shortInstruction':bool(re.search(r'(?i)write\s+short\s+ans|short\s+answers',text)),
      'longInstruction':bool(re.search(r'(?i)write\s+long\s+ans|long\s+answers',text)),
      'keyPointsHeading':bool(re.search(r'(?i)key\s+points',text)),
    }

def scan(source,anchors,out,limit):
    mapping=json.loads(anchors.read_text())
    digest=filehash(source)
    if digest != mapping['expectedSha256']:
        raise ValueError('SOURCE_SHA256_MISMATCH')
    doc=pdfium.PdfDocument(str(source))
    if len(doc)!=mapping['pdfiumObservedPageCount']:
        raise ValueError('PDF_PAGE_COUNT_DRIFT')
    env={**os.environ,'OMP_THREAD_LIMIT':'1','OMP_NUM_THREADS':'1'}
    result=[]
    with tempfile.TemporaryDirectory(prefix='assps-bio9-exercises-') as directory:
      for c in mapping['chapters']:
        last=c['pdfPhysicalPageEnd']
        first=max(c['pdfPhysicalPageStart'],last-limit+1)
        pages=[]
        for physical in range(first,last+1):
            page=doc[physical-1]
            plate=page.render(scale=1.28).to_pil().convert('L')
            target=Path(directory)/f'ch{c["chapter"]:02d}-p{physical:03d}.png'
            plate.save(target,optimize=True)
            try:
                response=subprocess.run(
                    ['tesseract',str(target),'stdout','-l','eng','--psm','11'],
                    env=env,capture_output=True,text=True,timeout=16,
                )
                markers=find_signals(response.stdout)
                status='OK' if response.returncode==0 else 'NONZERO_EXIT'
            except subprocess.TimeoutExpired:
                markers={k:False for k in find_signals('').keys()}
                status='OCR_TIMEOUT'
            pages.append({'pdfPhysicalPage':physical,
                          'printedPageCandidate':physical-mapping['pageNumberOffsetPdfPhysicalMinusPrinted'],
                          'signals':markers,'ocrStatus':status})
            page.close()
            print(f"BIO9_EXERCISE_CH{c['chapter']:02d}_P{physical:03d} EXERCISE={markers['exerciseHeading']} SHORT={markers['shortInstruction']}",flush=True)
            time.sleep(0.1)
        candidates=[x['pdfPhysicalPage'] for x in pages if x['signals']['exerciseHeading']]
        result.append({'chapter':c['chapter'],
                       'sampledPdfPhysicalPages':[first,last],
                       'exerciseHeadingPdfPhysicalCandidates':candidates,
                       'firstExerciseCandidatePhysicalPage':min(candidates) if candidates else None,
                       'firstExerciseCandidatePrintedPage':min(candidates)-mapping['pageNumberOffsetPdfPhysicalMinusPrinted'] if candidates else None,
                       'manualPageImageVerificationRequired':True,
                       'academicApproval':False,
                       'pages':pages})
    report={'schemaVersion':'assps-bio9-ocr-exercise-marker-candidates-v1',
            'sourceRecordId':mapping['sourceRecordId'],
            'sourceSha256':digest,
            'sourcePdfPages':len(doc),
            'sampledLastPagesPerChapter':limit,
            'questionsReproduced':False,'automaticQuestionApproval':False,
            'requiresManualImageVerification':True,
            'chapters':result}
    out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({'chapters':len(result),
                      'withExerciseHeading':sum(bool(r['exerciseHeadingPdfPhysicalCandidates']) for r in result),
                      'questionsApproved':0}),flush=True)

if __name__=='__main__':
  cli=argparse.ArgumentParser()
  cli.add_argument('--pdf',type=Path,required=True)
  cli.add_argument('--map',type=Path,required=True)
  cli.add_argument('--out',type=Path,required=True)
  cli.add_argument('--last-pages',type=int,default=6)
  args=cli.parse_args()
  if not 2<=args.last_pages<=8:raise SystemExit('INVALID_BOUND_PAGES')
  scan(args.pdf,args.map,args.out,args.last_pages)
