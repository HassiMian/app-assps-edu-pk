#!/usr/bin/env python3
"""Read-only recovery of live IX/X source CLAIMS; never certify a question page."""
import argparse, collections, datetime, hashlib, json, os, pathlib, re, subprocess, tempfile
R=pathlib.Path(__file__).resolve().parents[2]
MAN=R/'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/officialSourceManifest.json'
ORIGINAL=R/'docs/question-bank/ASSPS_GRADE910_UNIFIED_2581_FACULTY_CONTENT_REVIEW_PRIORITIES_20261011.json'
CACHE=pathlib.Path('/root/workspace/qbank-source-cache')
DEFAULT=pathlib.Path('/root/secure-archive/assps-grade910-live-source-evidence-20261016/claims.json')
RX=re.compile(r'^\s*(.*?)\s*\|\s*([a-fA-F0-9]{64})\s*\|\s*(.*?)\s*$')
PAGE=re.compile(r'^page\s+(\d+)$',re.I)
TOC=re.compile(r'^toc-page\s+(\d+)$',re.I)
CAT=re.compile(r'pectaa-catalog-\d{3}',re.I)
def source_parts(src):
 m=RX.fullmatch(src or '')
 if not m:return None,None,'unparsed',None
 label,sha,location=m.groups()
 refs=CAT.findall(label)
 cid=refs[0].lower() if len(refs)==1 else None
 if x:=TOC.fullmatch(location):kind,num='toc_page',int(x[1])
 elif x:=PAGE.fullmatch(location):kind,num='author_page_claim',int(x[1])
 elif 'page-boundary pending' in location.lower():kind,num='page_boundary_pending',None
 elif re.search(r'chapter\s+\d+',location,re.I):kind,num='chapter_only',None
 elif 'shared' in location.lower():kind,num='shared_authority',None
 else:kind,num='other',None
 return cid,sha.lower(),kind,num
def read_catalogs(path):
 data=json.loads(path.read_text())['entries']
 if len(data)<100:raise RuntimeError('MANIFEST_TOO_SMALL')
 return {e['recordId'].lower():e for e in data}
def cached(entry,root,cache):
 key=entry['recordId']
 if key in cache:return cache[key]
 ref=entry.get('sourceCacheRef')
 status='unavailable'
 if ref:
  path=(root/ref).resolve()
  if not path.is_relative_to(root.resolve()) or path.suffix!='.pdf':raise ValueError('UNSAFE_CACHE_PATH')
  if path.is_file() and not path.is_symlink():
   h=hashlib.sha256()
   with path.open('rb') as f:
    header=f.read(5);f.seek(0)
    for block in iter(lambda:f.read(1048576),b''):h.update(block)
   status='match' if header==b'%PDF-' and h.hexdigest().lower()==str(entry.get('pdfSha256') or '').lower() else 'mismatch'
 cache[key]=status
 return status
def evaluate(row,catalogs,root,cache):
 cid,sha,kind,page=source_parts(row['source'])
 entry=catalogs.get(cid) if cid else None
 if not entry and sha:
  choices=[e for e in catalogs.values() if str(e.get('pdfSha256') or '').lower()==sha]
  if len(choices)==1:entry=choices[0]
 ok=bool(entry and str(entry.get('pdfSha256') or '').lower()==sha and (not cid or entry['recordId'].lower()==cid))
 gradeok=bool(entry and entry.get('grade') in (0,{'9th':9,'10th':10}[row['grade']]))
 bytes_status=cached(entry,root,cache) if entry else 'not_in_manifest'
 count=entry.get('pdfPageCount') if entry else None
 rangeok=bool(page and isinstance(count,int) and page<=count)
 state=('UNPARSED' if not sha else 'MANIFEST_CONFLICT' if not ok else 'GRADE_MISMATCH' if not gradeok
        else 'TOC_NOT_QUESTION_PAGE' if kind=='toc_page'
        else 'UNVERIFIED_AUTHOR_PAGE_RANGE_PLAUSIBLE' if kind=='author_page_claim' and rangeok
        else 'PAGE_RANGE_OUTSIDE_PDF' if kind=='author_page_claim' else 'NO_QUESTION_PAGE')
 return dict(id=row['id'],grade=row['grade'],subject=row['subject'],medium=row['medium'],
             catalog=entry['recordId'] if entry else None,manifestHashMatch=ok,
             byteHashStatus=bytes_status,seedId=row.get('seedId'),claimKind=kind,claimedPage=page,
             plausiblePdfRangeOnly=rangeok,state=state,dbApproved=row['approved'],
             questionPageVerified=False,schoolAdoptionVerified=False,
             facultyReviewed=False,published=False)
def live():
 sql="""BEGIN TRANSACTION READ ONLY;
 SELECT json_build_object('id',id,'grade',class_level,'subject',subject,
 'medium',medium,'seedId',metadata->>'seed_id','source',coalesce(metadata->>'source',''),
 'approved',is_approved)::text
 FROM public.question_bank
 WHERE school_id=1 AND class_level IN ('9th','10th') ORDER BY id;
 COMMIT;"""
 p=subprocess.run(['runuser','-u','postgres','--','psql','-X','-At','-v','ON_ERROR_STOP=1',
                   '-d','apexos','-c',sql],capture_output=True,text=True,timeout=50)
 if p.returncode:raise RuntimeError('READ_ONLY_SOURCE_QUERY_FAILED: '+p.stderr[:160])
 rows=[json.loads(v) for v in p.stdout.splitlines() if v.startswith('{')]
 if len(rows)<2000:raise ValueError('SCHOOL1_GRADE_IX_X_INVENTORY_UNEXPECTED')
 return rows
def read_frozen_originals(path):
 ledger=json.loads(path.read_text());rows=ledger['rows']
 ids=[x['originalQuestionId'] for x in rows]
 if len(ids)!=2581 or len(set(ids))!=2581:
  raise ValueError('FROZEN_ORIGINAL_INVENTORY_DRIFT')
 return set(ids)
def analyze(rows,catalogs,root,originals=None):
 cache={};records=[evaluate(r,catalogs,root,cache) for r in rows]
 counter=lambda key:dict(collections.Counter(x[key] for x in records))
 summary={
  'rows':len(records),'gradeCounts':counter('grade'),
  'evidenceClasses':counter('state'),'locatorKinds':counter('claimKind'),
  'manifestHashMatches':sum(x['manifestHashMatch'] for x in records),
  'cachedOfficialPdfBytesMatch':sum(x['byteHashStatus']=='match' for x in records),
  'authorPageClaimsRangePlausibleOnly':sum(x['state']=='UNVERIFIED_AUTHOR_PAGE_RANGE_PLAUSIBLE' for x in records),
  'reviewedActualQuestionPage':0,'newAcademicApprovals':0,
  'existingMarkedApproved':sum(x['dbApproved'] is True for x in records),
  'catalogPdfHashesCompared':len(cache),
  'cachedPdfHashesMatchingManifest':sum(x=='match' for x in cache.values()),
  'cachedPdfHashesConflicting':sum(x=='mismatch' for x in cache.values()),
  'liveIdsMatchingProtectedOriginals':sum(x.get('seedId') in originals for x in records) if originals else None,
  'orphanLiveSeedIds':sum(x.get('seedId') not in originals for x in records) if originals else None,
  'preservedOriginalsNotImported':len(originals-{x.get('seedId') for x in records}) if originals else None
 }
 return {'schemaVersion':'assps-live-source-claim-audit-v1',
         'observedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),
         'scope':'SCHOOL1_IX_X_NO_DB_WRITES',
         'questionPageProof':'NOT_VERIFIED',
         'preservedOriginalsNotImportedIds':sorted(originals-{x.get('seedId') for x in records}) if originals else [],
         'schoolEditionAdoption':'NOT_ESTABLISHED_BY_CATALOG',
         'facultySignaturesCreated':0,'approvedCountFromAudit':0,
         'summary':summary,'recordIdsAndClaimsOnly':records}
def save(path,result):
 path.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
 if path.parent.stat().st_mode & 0o077:raise ValueError('PRIVATE_EVIDENCE_PERMISSIONS_REQUIRED')
 fd,temp=tempfile.mkstemp(dir=path.parent,prefix='.source-')
 try:
  os.fchmod(fd,0o600)
  with os.fdopen(fd,'w',encoding='utf8') as f:
   json.dump(result,f,sort_keys=True,ensure_ascii=False,indent=2)
   f.write('\n');f.flush();os.fsync(f.fileno())
  os.replace(temp,path)
 finally:
  if os.path.exists(temp):os.unlink(temp)
def audit_decision(summary):
 bad=sum(summary['evidenceClasses'].get(k,0) for k in
   ('UNPARSED','MANIFEST_CONFLICT','GRADE_MISMATCH','PAGE_RANGE_OUTSIDE_PDF'))
 return ('SOURCE_INTEGRITY_HOLD' if bad or summary['cachedPdfHashesConflicting']
         or summary['manifestHashMatches']!=summary['rows']
         or (summary.get('orphanLiveSeedIds') or 0)>0
         else 'CLAIMS_CLASSIFIED_NO_PUBLICATION')
if __name__=='__main__':
 p=argparse.ArgumentParser()
 p.add_argument('--out',type=pathlib.Path,default=DEFAULT)
 p.add_argument('--manifest',type=pathlib.Path,default=MAN)
 p.add_argument('--original-ledger',type=pathlib.Path,default=ORIGINAL)
 a=p.parse_args()
 result=analyze(live(),read_catalogs(a.manifest),CACHE,read_frozen_originals(a.original_ledger))
 save(a.out,result)
 decision=audit_decision(result['summary'])
 print(json.dumps({'decision':decision,
                   'summary':result['summary'],
                   'evidenceSha256':hashlib.sha256(a.out.read_bytes()).hexdigest()},sort_keys=True))
 if decision!='CLAIMS_CLASSIFIED_NO_PUBLICATION':raise SystemExit(3)
