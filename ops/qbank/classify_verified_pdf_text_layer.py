#!/usr/bin/env python3
import argparse, hashlib, json, math, re, statistics
from pathlib import Path
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parents[2]
DEFAULT_MANIFEST=ROOT/'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/officialSourceManifest.json'
DEFAULT_CACHE=Path('/root/workspace/qbank-source-cache')
OUT_JSON=ROOT/'docs/question-bank/reports-20261002/29_GRADE910_PDF_TEXT_LAYER_CLASSIFICATION_20261008.json'
OUT_MD=ROOT/'docs/question-bank/reports-20261002/29_GRADE910_PDF_TEXT_LAYER_CLASSIFICATION_20261008.md'
QUEUE=ROOT/'docs/question-bank/ASSPS_GRADE910_PDF_CACHE_REVIEW_QUEUE_20261008.json'

def sha256_file(path,chunk=1024*1024):
    h=hashlib.sha256()
    with open(path,'rb') as f:
        while True:
            b=f.read(chunk)
            if not b: break
            h.update(b)
    return h.hexdigest()

def sample_indices(n):
    if n<=0:return []
    if n<=8:return list(range(n))
    raw=[0,1,2,round((n-1)*.25),round((n-1)*.5),round((n-1)*.75),n-2,n-1]
    return sorted(set(max(0,min(n-1,int(i))) for i in raw))

def normalize_text(value):
    return re.sub(r'\s+',' ',value or '').strip()

def classify(chars):
    if not chars:return 'NO_PAGES'
    med=statistics.median(chars)
    ge250=sum(1 for c in chars if c>=250)
    ge80=sum(1 for c in chars if c>=80)
    need=max(3,math.ceil(len(chars)*0.5))
    if med>=250 and ge250>=need:return 'TEXT_LAYER_GOOD'
    if ge80>=2 or sum(chars)>=500:return 'TEXT_LAYER_PARTIAL'
    return 'IMAGE_HEAVY_OR_NO_TEXT'

def build_queue_paths():
    queue_paths={}
    if QUEUE.is_file():
        queue=json.loads(QUEUE.read_text(encoding='utf-8'))
        for row in queue.get('reviewQueue',[]):
            queue_paths[row.get('recordId')]=list(row.get('matchingCachedPdfs') or [])
    return queue_paths

def lazy_hash_lookup(cache_root,expected):
    if not expected:return []
    hits=[]
    for pdf in cache_root.rglob('*.pdf'):
        try:
            if sha256_file(pdf).lower()==expected:hits.append(pdf)
        except OSError: continue
    return hits

def resolve_cache_path(entry,cache_root,queue_paths):
    ref=entry.get('sourceCacheRef')
    if ref:
        p=cache_root/ref
        if p.is_file(): return p,ref,'manifest-ref'
    for rel in queue_paths.get(entry.get('recordId'),[]):
        p=cache_root/rel
        if p.is_file(): return p,rel,'verified-queue'
    expected=str(entry.get('pdfSha256') or '').lower()
    hits=lazy_hash_lookup(cache_root,expected)
    if hits:
        p=hits[0]
        return p,str(p.relative_to(cache_root)),'sha256-index'
    return None,None,'unresolved'

def inspect_entry(entry,cache_root,queue_paths):
    base={k:entry.get(k) for k in ['recordId','grade','stream','subject','medium','edition','catalogLabel','sourceCacheRef','pdfSha256','pdfPageCount']}
    if not entry.get('pdfSha256'):
        return {**base,'integrityStatus':'SOURCE_UNRESOLVED','textLayerStatus':'NOT_INSPECTED','samplePages':[],'sampleChars':[]}
    p,resolved_ref,resolution=resolve_cache_path(entry,cache_root,queue_paths)
    if not p:
        return {**base,'integrityStatus':'CACHE_FILE_MISSING','textLayerStatus':'NOT_INSPECTED','cacheResolution':resolution,'samplePages':[],'sampleChars':[]}
    base['resolvedCacheRef']=resolved_ref
    base['cacheResolution']=resolution
    with open(p,'rb') as f: magic=f.read(5)
    actual_sha=sha256_file(p)
    if magic!=b'%PDF-':
        return {**base,'integrityStatus':'NOT_PDF_MAGIC','actualSha256':actual_sha,'textLayerStatus':'NOT_INSPECTED','samplePages':[],'sampleChars':[]}
    if actual_sha.lower()!=str(entry['pdfSha256']).lower():
        return {**base,'integrityStatus':'HASH_MISMATCH','actualSha256':actual_sha,'textLayerStatus':'NOT_INSPECTED','samplePages':[],'sampleChars':[]}
    try:
        reader=PdfReader(str(p),strict=False)
        pages=len(reader.pages)
        expected=entry.get('pdfPageCount')
        page_match=(expected is None or int(expected)==pages)
        idx=sample_indices(pages)
        chars=[]; extract_errors=[]
        for i in idx:
            try: text=normalize_text(reader.pages[i].extract_text() or '')
            except Exception as e:
                text=''; extract_errors.append({'page':i+1,'error':type(e).__name__})
            chars.append(len(text))
        status=classify(chars)
        integrity='VERIFIED' if page_match else 'PAGE_COUNT_MISMATCH'
        return {**base,'integrityStatus':integrity,'actualSha256':actual_sha,'actualPageCount':pages,'pageCountMatchesManifest':page_match,'textLayerStatus':status,'samplePages':[i+1 for i in idx],'sampleChars':chars,'medianSampleChars':statistics.median(chars) if chars else 0,'samplePagesAtLeast80Chars':sum(1 for c in chars if c>=80),'samplePagesAtLeast250Chars':sum(1 for c in chars if c>=250),'extractErrors':extract_errors,'automatedCandidateMapEligible':status=='TEXT_LAYER_GOOD'}
    except Exception as e:
        return {**base,'integrityStatus':'PDF_OPEN_ERROR','error':f'{type(e).__name__}: {e}','actualSha256':actual_sha,'textLayerStatus':'NOT_INSPECTED','samplePages':[],'sampleChars':[]}

def markdown(report):
    s=report['summary']; lines=['# Grade IX–X Verified PDF Text-Layer Classification — 2026-10-08','', '> This report classifies extraction capability only. It is not chapter/page/exercise verification and grants no academic approval.','', '## Summary','',f"- Manifest records: **{s['manifestRecords']}**.",f"- Hash-attested PDFs inspected: **{s['hashAttested']}**.",f"- Integrity verified: **{s['integrityVerified']}**.",f"- Text-layer good: **{s['textLayerGood']}**.",f"- Text-layer partial: **{s['textLayerPartial']}**.",f"- Image-heavy/no text: **{s['imageHeavy']}**.",f"- Automated candidate-map eligible: **{s['candidateMapEligible']}**.",f"- Source unresolved: **{s['sourceUnresolved']}**.",f"- Integrity failures: **{s['integrityFailures']}**.",'','## Records','','| Record | Grade | Subject | Medium | Pages | Integrity | Text layer | Candidate map |','|---|---:|---|---|---:|---|---|---|']
    for r in report['records']:
        lines.append(f"| {r.get('recordId')} | {r.get('grade')} | {str(r.get('subject')).replace('|','/')} | {r.get('medium')} | {r.get('actualPageCount') or r.get('pdfPageCount') or '-'} | {r.get('integrityStatus')} | {r.get('textLayerStatus')} | {'yes' if r.get('automatedCandidateMapEligible') else 'no'} |")
    lines += ['','## Rule','','Only `TEXT_LAYER_GOOD` records may enter automated *candidate* chapter/page-map extraction. Candidate maps remain review-only until independently checked. No OCR was used in this classification.','']
    return '\n'.join(lines)

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--manifest',default=str(DEFAULT_MANIFEST));ap.add_argument('--cache-root',default=str(DEFAULT_CACHE));ap.add_argument('--write',action='store_true');args=ap.parse_args()
    manifest=json.load(open(args.manifest,encoding='utf-8'));records=[]
    cache_root=Path(args.cache_root)
    queue_paths=build_queue_paths()
    for entry in manifest['entries']:
        records.append(inspect_entry(entry,cache_root,queue_paths))
    counts={k:0 for k in ['VERIFIED','SOURCE_UNRESOLVED','CACHE_REF_MISSING','CACHE_FILE_MISSING','NOT_PDF_MAGIC','HASH_MISMATCH','PAGE_COUNT_MISMATCH','PDF_OPEN_ERROR']}
    for r in records: counts[r['integrityStatus']]=counts.get(r['integrityStatus'],0)+1
    summary={'manifestRecords':len(records),'hashAttested':sum(1 for r in records if r.get('pdfSha256')),'integrityVerified':counts.get('VERIFIED',0),'textLayerGood':sum(1 for r in records if r.get('textLayerStatus')=='TEXT_LAYER_GOOD'),'textLayerPartial':sum(1 for r in records if r.get('textLayerStatus')=='TEXT_LAYER_PARTIAL'),'imageHeavy':sum(1 for r in records if r.get('textLayerStatus')=='IMAGE_HEAVY_OR_NO_TEXT'),'candidateMapEligible':sum(1 for r in records if r.get('automatedCandidateMapEligible')),'sourceUnresolved':counts.get('SOURCE_UNRESOLVED',0),'integrityFailures':sum(v for k,v in counts.items() if k not in {'VERIFIED','SOURCE_UNRESOLVED'})}
    report={'schemaVersion':'assps-g910-pdf-text-layer-classification-v1','scope':'EXTRACTION_CAPABILITY_ONLY_NO_ACADEMIC_APPROVAL_NO_OCR','generatedAt':'2026-10-08T09:45:00Z','tool':{'name':'pypdf','version':'6.19.0','samplingPolicy':'all pages when <=8, otherwise first 3 + quartiles + last 2'},'summary':summary,'records':records}
    if args.write:
        OUT_JSON.parent.mkdir(parents=True,exist_ok=True);OUT_JSON.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');OUT_MD.write_text(markdown(report)+'\n',encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False,indent=2))
    if summary['integrityFailures']:
        raise SystemExit(2)
if __name__=='__main__':main()
