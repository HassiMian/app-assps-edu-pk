#!/usr/bin/env python3
import json, math, re, statistics, sys
from pathlib import Path
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parents[2]
REPORT=ROOT/'docs/question-bank/reports-20261002/29_GRADE910_PDF_TEXT_LAYER_CLASSIFICATION_20261008.json'
REPORT_MD=ROOT/'docs/question-bank/reports-20261002/29_GRADE910_PDF_TEXT_LAYER_CLASSIFICATION_20261008.md'
QUEUE=ROOT/'docs/question-bank/ASSPS_GRADE910_PDF_CACHE_REVIEW_QUEUE_20261008.json'
MANIFEST=ROOT/'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/officialSourceManifest.json'
CACHE=Path('/root/workspace/qbank-source-cache')

def normalize_text(value): return re.sub(r'\s+',' ',value or '').strip()
def sample_indices(n):
    if n<=0:return []
    if n<=8:return list(range(n))
    raw=[0,1,2,round((n-1)*.25),round((n-1)*.5),round((n-1)*.75),n-2,n-1]
    return sorted(set(max(0,min(n-1,int(i))) for i in raw))
def classify(chars):
    if not chars:return 'NO_PAGES'
    med=statistics.median(chars); ge250=sum(c>=250 for c in chars); ge80=sum(c>=80 for c in chars); need=max(3,math.ceil(len(chars)*.5))
    if med>=250 and ge250>=need:return 'TEXT_LAYER_GOOD'
    if ge80>=2 or sum(chars)>=500:return 'TEXT_LAYER_PARTIAL'
    return 'IMAGE_HEAVY_OR_NO_TEXT'

def markdown(report):
    s=report['summary']; lines=['# Grade IX–X Verified PDF Text-Layer Classification — 2026-10-08','', '> Extraction capability only. No OCR, no chapter/page/exercise verification, no academic approval.','', '## Summary','',f"- Manifest records: **{s['manifestRecords']}**.",f"- Hash-attested: **{s['hashAttested']}**.",f"- Integrity verified: **{s['integrityVerified']}**.",f"- Text-layer good: **{s['textLayerGood']}**.",f"- Text-layer partial: **{s['textLayerPartial']}**.",f"- Image-heavy/no text: **{s['imageHeavy']}**.",f"- Candidate-map eligible: **{s['candidateMapEligible']}**.",f"- Source unresolved: **{s['sourceUnresolved']}**.",f"- Integrity failures: **{s['integrityFailures']}**.",'','## Records','','| Record | Grade | Subject | Medium | Pages | Integrity | Text layer | Candidate map |','|---|---:|---|---|---:|---|---|---|']
    for r in report['records']:
        lines.append(f"| {r.get('recordId')} | {r.get('grade')} | {str(r.get('subject')).replace('|','/')} | {r.get('medium')} | {r.get('actualPageCount') or r.get('pdfPageCount') or '-'} | {r.get('integrityStatus')} | {r.get('textLayerStatus')} | {'yes' if r.get('automatedCandidateMapEligible') else 'no'} |")
    lines += ['','## Rule','','Only `TEXT_LAYER_GOOD` records may enter automated candidate map extraction. Candidate maps remain review-only until independently checked.','']
    return '\n'.join(lines)

def main():
    old=json.loads(REPORT.read_text())
    queue=json.loads(QUEUE.read_text())
    manifest={e['recordId']:e for e in json.loads(MANIFEST.read_text())['entries']}
    queue_by={r['recordId']:r for r in queue.get('reviewQueue',[])}
    new=[]; refreshed=0
    for idx,r in enumerate(old['records'],1):
        if r.get('integrityStatus') not in {'CACHE_FILE_MISSING','CACHE_REF_MISSING'}:
            new.append(r); continue
        rid=r['recordId']; q=queue_by.get(rid,{}); e=manifest.get(rid,{})
        paths=list(q.get('matchingCachedPdfs') or [])
        if not q.get('cachedHashVerified') or not paths:
            new.append(r); continue
        p=CACHE/paths[0]
        if not p.is_file():
            new.append(r); continue
        print(f'REFRESH {refreshed+1}: {rid} <- {paths[0]}',file=sys.stderr,flush=True)
        reader=PdfReader(str(p),strict=False); pages=len(reader.pages); sample=sample_indices(pages); chars=[]; errors=[]
        for i in sample:
            try: text=normalize_text(reader.pages[i].extract_text() or '')
            except Exception as ex: text=''; errors.append({'page':i+1,'error':type(ex).__name__})
            chars.append(len(text))
        status=classify(chars); expected=e.get('pdfPageCount'); page_match=(expected is None or int(expected)==pages)
        nr={**r,'sourceCacheRef':e.get('sourceCacheRef'),'resolvedCacheRef':paths[0],'cacheResolution':'verified-queue','integrityStatus':'VERIFIED' if page_match else 'PAGE_COUNT_MISMATCH','actualSha256':e.get('pdfSha256'),'actualPageCount':pages,'pageCountMatchesManifest':page_match,'textLayerStatus':status,'samplePages':[i+1 for i in sample],'sampleChars':chars,'medianSampleChars':statistics.median(chars) if chars else 0,'samplePagesAtLeast80Chars':sum(c>=80 for c in chars),'samplePagesAtLeast250Chars':sum(c>=250 for c in chars),'extractErrors':errors,'automatedCandidateMapEligible':status=='TEXT_LAYER_GOOD'}
        new.append(nr); refreshed+=1
    counts={}
    for r in new: counts[r.get('integrityStatus')]=counts.get(r.get('integrityStatus'),0)+1
    summary={'manifestRecords':len(new),'hashAttested':sum(bool(r.get('pdfSha256')) for r in new),'integrityVerified':counts.get('VERIFIED',0),'textLayerGood':sum(r.get('textLayerStatus')=='TEXT_LAYER_GOOD' for r in new),'textLayerPartial':sum(r.get('textLayerStatus')=='TEXT_LAYER_PARTIAL' for r in new),'imageHeavy':sum(r.get('textLayerStatus')=='IMAGE_HEAVY_OR_NO_TEXT' for r in new),'candidateMapEligible':sum(bool(r.get('automatedCandidateMapEligible')) for r in new),'sourceUnresolved':counts.get('SOURCE_UNRESOLVED',0),'integrityFailures':sum(v for k,v in counts.items() if k not in {'VERIFIED','SOURCE_UNRESOLVED'})}
    report={**old,'generatedAt':'2026-10-08T10:10:00Z','scope':'EXTRACTION_CAPABILITY_ONLY_NO_ACADEMIC_APPROVAL_NO_OCR_INCREMENTAL_REFRESH','summary':summary,'records':new,'incrementalRefresh':{'refreshedFalseMissingRecords':refreshed,'integritySource':'ASSPS_GRADE910_PDF_CACHE_REVIEW_QUEUE cachedHashVerified'}}
    REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n'); REPORT_MD.write_text(markdown(report)+'\n')
    print(json.dumps({'summary':summary,'refreshed':refreshed},indent=2))
    if summary['integrityFailures']: raise SystemExit(2)
if __name__=='__main__': main()
