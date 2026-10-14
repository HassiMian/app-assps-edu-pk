#!/usr/bin/env python3
import json,re,sys
from pathlib import Path
from pypdf import PdfReader
ROOT=Path(__file__).resolve().parents[2]
REPORT=ROOT/'docs/question-bank/reports-20261002/29_GRADE910_PDF_TEXT_LAYER_CLASSIFICATION_20261008.json'
QUEUE=ROOT/'docs/question-bank/ASSPS_GRADE910_PDF_CACHE_REVIEW_QUEUE_20261008.json'
CACHE=Path('/root/workspace/qbank-source-cache')
OUT_JSON=ROOT/'docs/question-bank/reports-20261002/30_GRADE910_TEXT_LAYER_CANDIDATE_MAPS_20261008.json'
OUT_MD=ROOT/'docs/question-bank/reports-20261002/30_GRADE910_TEXT_LAYER_CANDIDATE_MAPS_20261008.md'
CHAPTER_RE=re.compile(r'^(?:chapter|unit|lesson)\s*(?:no\.?\s*)?([0-9ivxlcdm]+)?\s*[:.\-–—]?\s*(.{0,90})$',re.I)
EXERCISE_RE=re.compile(r'^(?:exercise|exercises|review\s+questions?|questions?|multiple\s+choice\s+questions?|short\s+questions?|long\s+questions?)\b.{0,90}$',re.I)
URDU_RE=re.compile(r'^(?:باب|سبق|مشق|سوالات|مختصر سوالات|تفصیلی سوالات).{0,90}$')

def clean(line): return re.sub(r'\s+',' ',line or '').strip()
def resolve(r,qmap):
    ref=r.get('resolvedCacheRef') or r.get('sourceCacheRef')
    if ref and (CACHE/ref).is_file(): return ref
    for rel in qmap.get(r['recordId'],[]):
        if (CACHE/rel).is_file(): return rel
    return None

def main():
    report=json.loads(REPORT.read_text()); queue=json.loads(QUEUE.read_text())
    qmap={x['recordId']:list(x.get('matchingCachedPdfs') or []) for x in queue.get('reviewQueue',[])}
    eligible=[r for r in report['records'] if r.get('textLayerStatus')=='TEXT_LAYER_GOOD' and r.get('integrityStatus')=='VERIFIED']
    out=[]
    for idx,r in enumerate(eligible,1):
        rel=resolve(r,qmap)
        if not rel:
            out.append({'recordId':r['recordId'],'status':'CACHE_PATH_UNRESOLVED','candidates':[]});continue
        print(f'MAP {idx}/{len(eligible)} {r["recordId"]} {rel}',file=sys.stderr,flush=True)
        reader=PdfReader(str(CACHE/rel),strict=False); candidates=[]; seen=set()
        for pageno,page in enumerate(reader.pages,1):
            try:text=page.extract_text() or ''
            except Exception:continue
            for raw in text.splitlines():
                line=clean(raw)
                if not line or len(line)>120:continue
                typ=None
                if CHAPTER_RE.match(line):typ='chapter_or_unit'
                elif EXERCISE_RE.match(line) or URDU_RE.match(line):typ='exercise_or_question_heading'
                if not typ:continue
                key=(pageno,line.casefold())
                if key in seen:continue
                seen.add(key); candidates.append({'physicalPage':pageno,'type':typ,'heading':line})
                if len(candidates)>=250:break
            if len(candidates)>=250:break
        out.append({'recordId':r['recordId'],'grade':r.get('grade'),'subject':r.get('subject'),'medium':r.get('medium'),'cacheRef':rel,'status':'REVIEW_ONLY_CANDIDATES','candidateCount':len(candidates),'candidates':candidates})
    summary={'eligibleRecords':len(eligible),'recordsWithCandidates':sum(bool(x.get('candidates')) for x in out),'totalCandidates':sum(len(x.get('candidates') or []) for x in out),'verifiedChapterMaps':0,'verifiedExerciseIndices':0,'academicApprovalGranted':False}
    result={'schemaVersion':'assps-g910-text-layer-candidate-maps-v1','scope':'REVIEW_ONLY_NO_OCR_NO_AUTO_VERIFICATION','generatedAt':'2026-10-08T10:20:00Z','summary':summary,'records':out}
    OUT_JSON.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    lines=['# Grade IX–X Text-Layer Candidate Maps — 2026-10-08','', '> Review-only candidate anchors from hash-verified PDFs. No OCR, no automatic chapter/exercise verification, no academic approval.','',f"- Eligible records: **{summary['eligibleRecords']}**",f"- Records with candidates: **{summary['recordsWithCandidates']}**",f"- Candidate anchors: **{summary['totalCandidates']}**",f"- Verified chapter maps granted: **0**",f"- Verified exercise indices granted: **0**",'', '| Record | Grade | Subject | Medium | Candidates | Status |','|---|---:|---|---|---:|---|']
    for x in out:lines.append(f"| {x['recordId']} | {x.get('grade','-')} | {str(x.get('subject','')).replace('|','/')} | {x.get('medium','-')} | {len(x.get('candidates') or [])} | {x['status']} |")
    OUT_MD.write_text('\n'.join(lines)+'\n')
    print(json.dumps(summary,indent=2))
if __name__=='__main__':main()
