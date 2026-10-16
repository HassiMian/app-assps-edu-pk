#!/usr/bin/env python3
"""Create distinct immutable-source rescan lane for 62 OCR legacy page receipts.

Never overwrite the 112-page canonical progress or approved academic content.
Only recheck pages whose existing OCR render was made without validated
PDF.js Node filesystem WASM paths, using the same full 112 eligible page set.
"""
from __future__ import annotations
import copy,hashlib,json,os,tempfile,sys
from pathlib import Path

ROOT=Path('/var/lib/assps-grade910-sourceclaims')
SOURCE=ROOT/'ocr-progress.json'
TARGET=ROOT/'ocr-recheck-legacy-progress-20261016.json'
EXPECTED_CANONICAL_SHA='f785d2a66fdc79d7f6bf2e35cac2e71e616f8dde556951b67e09bd562c34aa5b'
EXPECTED_UNRELIABLE=62
EXPECTED_RELIABLE=50

def sha(b):return hashlib.sha256(b).hexdigest()
def build(canonical):
 if (canonical.get('schema')!='ASSPS_GRADE910_OCR_RESUME_V1'
     or canonical.get('academicApproved') is not False
     or canonical.get('published') is not False
     or canonical.get('rawTextPersisted') is not False):
  raise ValueError('CANONICAL_OCR_NOT_RESEARCH_HOLD')
 pages=canonical['completedPages']
 assets=canonical['assets']
 results=canonical['results']
 if len(pages)!=112 or len(assets)!=112 or len(results)!=765 or len(set(pages))!=112:
  raise ValueError('FULL_112_PAGE_CANONICAL_RECEIPT_NOT_COMPLETE')
 trusted={a['catalog']+'|'+str(a['page']) for a in assets if a.get('nodePdfJsFilesystemWasmLoaderPathConfigured') is True}
 flagged={a['catalog']+'|'+str(a['page']) for a in assets if a.get('nodePdfJsFilesystemWasmLoaderPathConfigured') is not True}
 if len(trusted)!=EXPECTED_RELIABLE or len(flagged)!=EXPECTED_UNRELIABLE or trusted & flagged or trusted|flagged!=set(pages):
  raise ValueError('NOT_EXACT_50_CONFIRMED_AND_62_LEGACY')
 if any(a.get('rawPageImagePersisted') is not False or a.get('rawOCRTextPersisted') is not False for a in assets):
  raise ValueError('RAW_TEXT_OR_IMAGE_IN_OCR_RECEIPT')
 if any(z.get('academicQuestionContentPageVerified') is not False or z.get('qualifiedFacultyApproved') is not False or z.get('autoPublished') is not False for z in results):
  raise ValueError('UNAUTHORIZED_SOURCE_APPROVAL_IN_OCR_RECORDS')
 current={k:v for k,v in canonical.items() if k not in ('completedPages','assets','results')}
 current['completedPages']=[k for k in pages if k in trusted]
 current['assets']=[a for a in assets if a['catalog']+'|'+str(a['page']) in trusted]
 current['results']=[z for z in results if z['catalog']+'|'+str(z['page']) in trusted]
 if len(current['completedPages'])!=50 or len(current['assets'])!=50:
  raise ValueError('50_RELIABLE_PAGE_EVIDENCE_NOT_PRESERVED')
 # Preserve expected fingerprint and all original research-only false flags.
 return copy.deepcopy(current)
def write_private(path,value):
 if path.parent.stat().st_mode & 0o077:raise ValueError('PRIVATE_DIR_PERMS')
 fd,p=tempfile.mkstemp(dir=path.parent,prefix='.ocr-legacy-review-')
 try:
  os.fchmod(fd,0o600)
  with os.fdopen(fd,'w',encoding='utf8') as f:
   json.dump(value,f,sort_keys=True,ensure_ascii=False);f.write('\n')
  os.replace(p,path)
 finally:
  if os.path.exists(p):os.unlink(p)
def verify_recheck(canonical,recheck):
    """Strictly validate isolated incremental recheck without changing prior proof."""
    baseline=build(canonical)
    if recheck.get('schema')!=baseline['schema'] or recheck.get('sourceFingerprint')!=baseline['sourceFingerprint']:
        raise ValueError('OCR_RECHECK_SOURCE_FINGERPRINT_DRIFT')
    for field in ('academicApproved','published','rawTextPersisted'):
        if recheck.get(field) is not False:
            raise ValueError('OCR_RECHECK_ACADEMIC_RELEASE_OR_RAW_TEXT_FORGED')
    allowed=set(canonical['completedPages'])
    completed=recheck.get('completedPages')
    assets=recheck.get('assets')
    results=recheck.get('results')
    if (not isinstance(completed,list) or not isinstance(assets,list)
        or not isinstance(results,list) or len(completed)<50 or len(completed)>112
        or len(set(completed))!=len(completed) or not set(completed)<=allowed):
        raise ValueError('OCR_RECHECK_PAGE_DUPLICATE_OR_OUTSIDE_FROZEN_SCOPE')
    key=lambda row: row['catalog']+'|'+str(row['page'])
    by_asset={key(a):a for a in assets}
    if (len(assets)!=len(completed) or len(by_asset)!=len(assets)
        or set(by_asset)!=set(completed)):
        raise ValueError('OCR_RECHECK_ASSET_MAPPING_OR_DUPLICATION')
    old_assets={key(a):a for a in baseline['assets']}
    if any(by_asset.get(k)!=v for k,v in old_assets.items()):
        raise ValueError('OCR_RECHECK_PREVIOUS_50_TRUSTED_ASSETS_CHANGED')
    trusted=set(old_assets)
    for k in set(completed)-trusted:
        a=by_asset[k]
        if (a.get('nodePdfJsFilesystemWasmLoaderPathConfigured') is not True
            or a.get('pdfJsDecoderResourceUrlsExplicitlyConfigured') is not True):
            raise ValueError('OCR_RECHECK_MISSING_VALIDATED_PDFJS_DECODER')
    for a in assets:
        if a.get('rawPageImagePersisted') is not False or a.get('rawOCRTextPersisted') is not False:
            raise ValueError('OCR_RECHECK_UNAUTHORIZED_RAW_IMAGE_OR_TEXT')
    if len(results)>765:
        raise ValueError('OCR_RECHECK_RESULTS_EXCEED_FROZEN_SET')
    prior=[x for x in baseline['results']]
    matched=[x for x in results if key(x) in trusted]
    if prior!=matched:
        raise ValueError('OCR_RECHECK_PREVIOUS_50_TRUSTED_RESULTS_CHANGED')
    result_keys=set()
    for r in results:
        k=key(r)
        if k not in completed:
            raise ValueError('OCR_RECHECK_RESULT_OUTSIDE_COMPLETED_PAGE')
        duplicate=(k,str(r.get('questionId')))
        if duplicate in result_keys:
            raise ValueError('OCR_RECHECK_DUPLICATE_QUESTION_PAGE')
        result_keys.add(duplicate)
        if (r.get('academicQuestionContentPageVerified') is not False
            or r.get('qualifiedFacultyApproved') is not False
            or r.get('autoPublished') is not False
            or r.get('nodePdfJsFilesystemWasmLoaderPathConfigured') is not True
            or r.get('pdfJsDecoderResourceUrlsExplicitlyConfigured') is not True):
            raise ValueError('OCR_RECHECK_RESULT_NOT_TRUSTED_RESEARCH_ONLY')
    return {'verifiedRecheckedPages':len(completed),
            'newPagesWithValidatedDecoder':len(completed)-50,
            'remainingLegacyPages':112-len(completed),
            'previousTrustedPagesUnchanged':50,
            'previousTrustedQuestionEvidenceUnchanged':len(prior),
            'academicQuestionContentPagesApproved':0}

def main():
 if len(sys.argv)>2:raise ValueError('USAGE_NONE_OR_CHECK')
 bytes_=SOURCE.read_bytes()
 if sha(bytes_)!=EXPECTED_CANONICAL_SHA:
  raise ValueError('CANONICAL_OCR_FILE_CHANGED_FROZEN_112_PAGE_SHA_HOLD')
 expected=build(json.loads(bytes_))
 if sys.argv[1:]==['--check']:
  if not TARGET.exists():
   print('READY_TO_CREATE_SEPARATE_62_PAGE_RECHECK_RESEARCH_LEDGER')
   return
  got=json.loads(TARGET.read_text())
  outcome=verify_recheck(json.loads(bytes_),got)
  print('SEPARATE_RECHECK_LEDGER_VALID',json.dumps(outcome,sort_keys=True))
  return
 if sys.argv[1:]:raise ValueError('UNKNOWN_ARG')
 if TARGET.exists():
  # Do not erase an active partial rescan.
  raise ValueError('RECHECK_PROGRESS_ALREADY_EXISTS_PRESERVE_IT')
 write_private(TARGET,expected)
 print(json.dumps({'decision':'PRESERVED_ORIGINAL_112_FULL_RECEIPT_PREPARED_62_PAGE_ISOLATED_RECHECK',
  'original112Sha256':EXPECTED_CANONICAL_SHA,'separateProgressPages':len(expected['completedPages']),
  'olderPagesToRescan':62,'questionOrStudentWrites':0,'schoolAdoptionApproval':False,'publication':False}))
if __name__=='__main__':main()
