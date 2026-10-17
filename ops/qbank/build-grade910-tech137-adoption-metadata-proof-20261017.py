#!/usr/bin/env python3
"""Matric-Tech provenance classification, read-only metadata; never school adoption."""
import collections as C,json,sys,os,tempfile,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
SEED=ROOT/'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging'
PRIVATE=Path('/var/lib/assps-grade910-sourceclaims')
OUTPUT=PRIVATE/'tech-137-school-adoption-source-ledger-20261017.json'
EXPECTED={'9th|Agriculture Sciences-Tech':20,'9th|Biology-Tech':18,
'9th|Chemistry-Tech':26,'9th|Computer Science & Entrepreneurship-Tech':20,
'9th|General Science-Tech':22,'9th|Physics-Tech':2,'10th|Biology-Tech':8,
'10th|Communication Skills & Personal Grooming-Tech':9,
'10th|Health Sciences-Tech':9,'10th|Physics-Tech':3}
def assess(b,q,ledger,manifest,pdf):
 if (len(b.get('rows',[]))!=2581 or len(manifest.get('entries',[]))!=111
     or ledger.get('revisions')!=2411 or len(ledger.get('records',[]))!=2411
     or ledger.get('actualLiveAcademicRevisionContentHashed') is not True
     or ledger.get('academicallyApprovedRevisions')!=0
     or ledger.get('humanReviewerSignedRevisions')!=0 or ledger.get('databaseWrites')!=0
     or q.get('remainingLiveReviewDepthFlagsWithoutAnyDraft')!=358
     or q.get('remainingHighPriorityFlagsWithoutAnyDraft')!=137
     or q.get('qualifiedAcademicApprovalsCreated')!=0
     or q.get('academicallySelectableCreated')!=0
     or q.get('productionDatabaseWrites')!=0
     or pdf.get('summary',{}).get('catalogPdfFilesVerified')!=56
     or pdf['summary'].get('pdfPageCountConflicts')!=0
     or pdf['summary'].get('schoolEditionAdoptionVerified')!=0
     or pdf['summary'].get('databaseWrites')!=0):
  raise ValueError('AUTHENTIC_CURRENT_READ_ONLY_EVIDENCE_REQUIRED')
 orig={z['questionId']:z for z in b['rows']}
 hashes={z['questionId']:z['revisionSha256'] for z in ledger['records']}
 cat={z['recordId']:z for z in manifest['entries']}
 assets={z['catalog']:z for z in pdf['assets']}
 if (len(orig),len(hashes),len(cat),len(assets))!=(2581,2411,111,56):
  raise ValueError('DUPLICATE_EVIDENCE_SOURCE_KEYS')
 high=[z for z in q['unlinkedCurrentRevisionResearchQueue'] if z['priority']=='HIGH']
 if len(high)!=137 or len({z['questionId'] for z in high})!=137:
  raise ValueError('NOT_137_DISTINCT_HIGH_QUEUE_ITEMS')
 subj=C.Counter();edition=C.Counter();medium=C.Counter();catalogs=C.Counter()
 same=C.defaultdict(list); rows=[]
 for x in sorted(high,key=lambda z:z['questionId']):
  id=x['questionId'];o=orig.get(id);rev=hashes.get(id)
  if (not o or not rev or rev!=x['currentLiveRevisionSha256']
      or x['schoolStreamApplicability']!='STREAM_SPECIFIC_ADOPTION_EVIDENCE_REQUIRED'
      or x['academicallySelectable'] is not False or x['type']!='long'
      or o.get('approved') is not False or o.get('published') is not False
      or o.get('schoolAdoptionVerified') is not False
      or o.get('independentHumanAccuracyReview') is not False
      or o.get('paperStudioSelectable') is not False
      or o.get('originalGradeClaim')!=int(x['grade'][:-2])
      or f"{x['grade']}|{x['subject']}" not in EXPECTED):
   raise ValueError('SOURCE_ADOPTION_OR_QUESTION_REVISION_DRIFT_'+id)
  c=cat.get(o['sourceCatalogId']);att=assets.get(o['sourceCatalogId'])
  if (not c or not att or c['stream']!='Matric-Tech'
      or c['grade']!=int(x['grade'][:-2]) or c['subject']!=x['subject']
      or c.get('catalogLinkStatus')!='OFFICIAL_PAGE_ANCHOR_FOUND'
      or c.get('catalogLinkStatus')!='OFFICIAL_PAGE_ANCHOR_FOUND'
      or att.get('originalPdfBytesHashMatches') is not True
      or att.get('manifestAndActualPageCountAgree') is not True
      or c['pdfPageCount']!=att['actualPages']):
   raise ValueError('PREVIOUSLY_ATTESTED_PECTAA_SOURCE_DRIFT_'+id)
  e=c['edition'];m=c['medium']
  if e not in ('2026-27','CURRENT_CATALOG_LABEL_NO_SESSION'):raise ValueError('EDITION_UNKNOWN')
  if m!='UNSPECIFIED_BY_CATALOG_LABEL' and m.lower()!=x['medium'].lower():
   raise ValueError('AUTHOR_MEDIUM_VS_CATALOG_CONFLICT_'+id)
  ch=o['provisionalReviewUnit']
  if not isinstance(ch,int) or ch<1:raise ValueError('CHAPTER_PROVISIONAL_ID_INVALID')
  subj[f"{x['grade']}|{x['subject']}"]+=1;edition[e]+=1;medium[m=='UNSPECIFIED_BY_CATALOG_LABEL']+=1
  catalogs[o['sourceCatalogId']]+=1;same[(x['grade'],x['subject'],ch)].append(x)
  rows.append({'questionId':id,'currentLiveRevisionSHA256':rev,
   'originalFrozenRevisionSHA256':o['originalRevisionSha256'],
   'originalResearchFileSHA256':o['originalResearchFileSha256'],
   'sourceCatalogId':o['sourceCatalogId'],'grade':x['grade'],'subject':x['subject'],
   'mediumClaim':x['medium'],'provisionalChapter':ch,
   'catalogEditionLabel':e,'officialCatalogMediumLabel':m,
   'actualSchoolProgrammeAdoption':False,'actualSchoolBookEditionApproval':False,
   'actualPrintedExerciseQuestionPageVerified':False,
   'qualifiedSubjectReviewerApproved':False,'bilingualEquivalentApproved':False,
   'paperStudioVerifiedSelectable':False})
 if dict(subj)!=EXPECTED or len(catalogs)!=15 or edition!={'2026-27':26,'CURRENT_CATALOG_LABEL_NO_SESSION':111}:
  raise ValueError('137_GRADE_SUBJECT_CATALOG_SESSION_COUNTS_CHANGED')
 if medium[True]!=29 or medium[False]!=108:raise ValueError('29_CATALOG_MEDIUM_UNSPECIFIED')
 pairs=[];single=0
 for (grade,subject,ch),v in sorted(same.items()):
  if len(v)==2 and {x['medium'] for x in v}=={'english','Urdu'}:
   pairs.append({'grade':grade,'subject':subject,'chapterClaim':ch,
    'englishId':next(z['questionId'] for z in v if z['medium']=='english'),
    'urduId':next(z['questionId'] for z in v if z['medium']=='Urdu'),
    'realTranslationEquivalenceReviewed':False})
  elif len(v)==1:single+=1
  else:raise ValueError('BILINGUAL_CANDIDATE_COLLISION')
 if len(pairs)!=53 or single!=31:raise ValueError('EXPECTED_53_PAIRS_AND_31_SINGLETONS')
 return {'schema':'ASSPS_MATRIC_TECH_137_METADATA_EVIDENCE_NOT_SCHOOL_ADOPTION_V1',
 'currentQuestionRevisionsPinned':137,'previouslyAttestedCatalogDocuments':15,
 'previouslyAttestedPDFFilesRehashedThisRun':0,
 'explicitCatalogSession2026_27Only':26,'catalogSessionNotStated':111,
 'catalogMediumNotStated':29,'bilingualSameChapterCandidatesNotApproved':53,
 'singleMediumItems':31,'subjectCounts':dict(sorted(subj.items())),
 'catalogCounts':dict(sorted(catalogs.items())),
 'realSchoolTechAdoptions':0,'qualifiedAcademicApprovals':0,
 'realPrintedExerciseProof':0,'publishedVerifiedQuestions':0,
 'productionDatabaseWrites':0,'questionAnswerTextReadOrCopied':False,
 'records':rows,'candidatePairs':pairs}
def produce():
 paths=[ROOT/'docs/question-bank/ASSPS_GRADE910_2581_PUBLIC_SAFE_REVIEW_CROSSWALK_20261015.json',
 PRIVATE/'live-existing-answer-proposal-crosswalk-20261016.json',
 PRIVATE/'live-question-revisions.json',SEED/'officialSourceManifest.json',
 PRIVATE/'physical-page-count.json']
 if hashlib.sha256(paths[3].read_bytes()).hexdigest()!=json.loads(paths[4].read_text()).get('sourceManifestSha256'):
  raise ValueError('OFFICIAL_CATALOG_MANIFEST_BYTES_NO_LONGER_ATTESTED')
 return assess(*(json.loads(p.read_text()) for p in paths))
def main():
 x=produce()
 if sys.argv[1:]==['--check']:
  if not OUTPUT.exists() or json.loads(OUTPUT.read_text())!=x:
   raise ValueError('STALE_OR_MISSING_LIVE137_METADATA_RECEIPT')
  print('PASS_137_CURRENT_SHA_CATALOG_15_PAIRS_53_ADOPTION_0_APPROVED_0')
 elif len(sys.argv)==1:
  if PRIVATE.stat().st_mode&0o077:raise ValueError('PRIVATE_LEDGER_PERMISSIONS')
  fd,temp=tempfile.mkstemp(dir=PRIVATE,prefix='.tech137-')
  with os.fdopen(fd,'w') as f:
   os.fchmod(f.fileno(),0o600)
   json.dump(x,f,ensure_ascii=False,sort_keys=True,indent=2);f.write('\n')
  os.replace(temp,OUTPUT)
  print({k:v for k,v in x.items() if k not in ('records','candidatePairs')})
 else:raise ValueError('ONLY_APPLY_OR_CHECK')
if __name__=='__main__':main()
