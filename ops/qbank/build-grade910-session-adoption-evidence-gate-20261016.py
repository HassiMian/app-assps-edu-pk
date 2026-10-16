#!/usr/bin/env python3
"""Grade IX–X official-catalog vs authentic ASSPS adoption evidence (read only).

Only metadata and stable IDs are retained. A PECTAA catalog listing, 2026-27
book label or 2026 examination ALP is NEVER proof of this school's adoption.
"""
from __future__ import annotations
import collections
import datetime as dt
import hashlib
import json
import os
import tempfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
MANIFEST=ROOT/'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/officialSourceManifest.json'
ORIGINAL=ROOT/'docs/question-bank/ASSPS_GRADE910_2581_PUBLIC_SAFE_REVIEW_CROSSWALK_20261015.json'
ADOPTION=Path('/var/lib/assps-grade910-sourceclaims/school-adoption-inventory.json')
LIVE=Path('/var/lib/assps-grade910-sourceclaims/live-question-revisions.json')
STATE=Path('/var/lib/assps-grade910-sourceclaims')
OUT=STATE/'session-adoption-catalog-crosswalk-20261016.json'
REPORT=ROOT/'docs/question-bank/ASSPS_GRADE910_OFFICIAL_2026_2027_SESSION_ADOPTION_GAP_20261016.md'
SCHEMA='ASSPS_GRADE910_2026_27_CATALOG_APPLICABILITY_NOT_SCHOOL_ADOPTION_V1'
CATA_URL='https://pectaa.edu.pk/curriculum-compliance/'
BOOKS_URL='https://pectaa.edu.pk/books-and-publications/'
ALP_URL='https://pectaa.edu.pk/uploads/Revised%20ALP%20Notification%2007.11.2025.pdf'
LABEL_TYPES={
 '2026_27':lambda x:x=='2026-27',
 'EARLIER_EXPLICIT':lambda x:x in ('2025-26','2024-25','2023-24','2020','2025'),
}
def digest(b:bytes)->str:return hashlib.sha256(b).hexdigest()
def category(label):
 if label=='2026-27':return 'PUBLIC_LABEL_2026_27_NOT_ASSPS_ADOPTION'
 if label in ('2025-26','2024-25','2023-24','2020','2025'):return 'EARLIER_PRINTED_EDITION_MUST_CONFIRM_SESSION'
 return 'UNSPECIFIED_OR_DATE_LINK_REQUIRES_INDEPENDENT_ADOPTION'
def compile_evidence(manifest,original,adoption,live,source_sha,original_sha):
 entries=manifest.get('entries')
 original_rows=original.get('rows')
 live_rows=live.get('records')
 if not isinstance(entries,list) or len(entries)!=111 or not isinstance(original_rows,list) or len(original_rows)!=2581:
  raise ValueError('CATALOG_111_AND_FROZEN_2581_SCOPE_CHANGED')
 if not isinstance(live_rows,list) or len(live_rows)!=2411:
  raise ValueError('LIVE_CURRENT_2411_REVISION_INVENTORY_MISSING')
 if len({x.get('recordId') for x in entries})!=111:
  raise ValueError('CATALOG_DUPLICATE_ID')
 if len({x.get('questionId') for x in original_rows})!=2581:
  raise ValueError('FROZEN_QUESTION_ID_COLLISION')
 if len({x.get('questionId') for x in live_rows})!=2411:
  raise ValueError('LIVE_QUESTION_REVISION_ID_COLLISION')
 if any(not isinstance(r.get('revisionSha256'),str) or len(r['revisionSha256'])!=64 for r in live_rows):
  raise ValueError('INVALID_CURRENT_FULL_QUESTION_REVISION_SHA')
 catalog={x['recordId']:x for x in entries}
 if manifest.get('catalogUrl') not in (CATA_URL,BOOKS_URL):
  raise ValueError('OFFICIAL_CATALOG_URL_NOT_GROUNDED')
 if adoption.get('schema')!='ASSPS_SCHOOL1_VERSIONED_ADOPTION_EVIDENCE_INVENTORY_V1' or adoption.get('schoolId')!=1:
  raise ValueError('WRONG_OR_UNAUTHENTICATED_SCHOOL_EVIDENCE_INVENTORY')
 zeros=('sessionVersions','curriculumProfileVersions','resourceBooks',
        'resourceVersions','learningScopeVersions','schoolAcademicApprovalEvents')
 counts=adoption.get('counts') or {}
 if any(not isinstance(counts.get(k),int) or counts[k]<0 for k in zeros):
  raise ValueError('INVALID_SCHOOL_EVIDENCE_COUNTS')
 # Fail closed. A future school admin attestation needs a distinct reviewer and
 # actual edition / year document; rows alone must never auto-authorize paper.
 if (adoption.get('schoolEditionAdoptionVerifiedByThisAudit') is not False
     or adoption.get('approvedForCurrentAcademicSession') is not False
     or adoption.get('academicQuestionApprovalGained')!=0
     or adoption.get('studentOrQuestionDbWrites')!=0):
  raise ValueError('INVALID_OR_FABRICATED_SCHOOL_ADOPTION')
 source_counts=collections.Counter()
 edition_counts=collections.Counter()
 category_counts=collections.Counter()
 streams=collections.Counter()
 missing_grade=[]
 missing_catalog=[]
 grade_conflicts=[]
 mismatched_school=[]
 bysource=collections.defaultdict(list)
 for r in original_rows:
  rid=r.get('sourceCatalogId')
  entry=catalog.get(rid)
  if entry is None:
   missing_catalog.append(r.get('questionId'))
   continue
  g=r.get('originalGradeClaim')
  expected=entry.get('grade')
  if g not in (9,10) or expected not in (0,9,10):
   missing_grade.append(r['questionId'])
  elif expected!=0 and expected!=g:
   grade_conflicts.append(r['questionId'])
  # Existing authoring metadata is an *unverified research claim*.
  if r.get('schoolAdoptionVerified') is not False or r.get('approved') is not False or r.get('published') is not False:
   mismatched_school.append(r['questionId'])
  cat=category(str(entry.get('edition','')))
  source_counts[rid]+=1
  edition_counts[str(entry.get('edition',''))]+=1
  category_counts[cat]+=1
  streams[str(entry.get('stream','UNKNOWN'))]+=1
  bysource[rid].append(r['questionId'])
 if missing_catalog or grade_conflicts or mismatched_school:
  raise ValueError('SOURCE_CATALOG_MAPPING_OR_ADOPTION_CLAIM_INVALID')
 source_summaries=[]
 for cid,n in sorted(source_counts.items()):
  item=catalog[cid]
  source_summaries.append({
   'catalogId':cid,'gradeCatalog':item.get('grade'),
   'subjectCatalog':item.get('subject'),'mediumCatalog':item.get('medium'),
   'streamCatalog':item.get('stream'),'publicEditionLabel':item.get('edition'),
   'editionApplicabilityLane':category(str(item.get('edition',''))),
   'candidateOriginalResearchCount':n,
   'originalResearchQuestionIDsSortedSHA256':digest(('\n'.join(sorted(bysource[cid]))+'\n').encode()),
   'publisherCatalogEvidenceUrl':item.get('catalogEvidenceUrl') or CATA_URL,
   'school2026_27EditionAdoptionAuthenticated':False,
   'questionPageAndExerciseTextVerifiedFromPublisher':False,
   'academicallyApproved':False,
   'paperStudioVerifiedSelectable':False
  })
 liveIDs={x['questionId'] for x in live_rows}
 originalIDs={x['questionId'] for x in original_rows}
 # Existing school1 2411 provisional IDs must all originate from the frozen 2581.
 if not liveIDs<=originalIDs or len(originalIDs-liveIDs)!=170:
  raise ValueError('170_HELD_ORIGINAL_CANDIDATES_NO_LONGER_PRESERVED')
 return {
  'schema':SCHEMA,
  'generationUTC':dt.datetime.now(dt.timezone.utc).isoformat(),
  'schoolId':1,
  'academicSessionUnderReview':'2026-27',
  'possibleExamYearUnderReview':2027,
  'publisherOfficialCurriculumCatalogUrl':CATA_URL,
  'publisherOfficialBookListUrl':BOOKS_URL,
  'grade9RevisedALP2026OfficialNoticeUrl':ALP_URL,
  'grade9RevisedALPAppliesToAnnualExamYear':2026,
  'grade9RevisedALPAutomaticallyAppliesTo2027':False,
  'manifestSourceSHA256':source_sha,
  'originalFrozenResearchCrosswalkSHA256':original_sha,
  'actualLiveFullQuestionRevisionCount':2411,
  'originalResearchCount':2581,
  'heldOriginalOnlyCount':170,
  'allPublicCatalogs':111,
  'catalogsReferencedByFrozenResearch':len(source_counts),
  'publicEditionClaimLabels':dict(sorted(edition_counts.items())),
  'candidateCountByEvidenceLane':dict(sorted(category_counts.items())),
  'candidateCountByPublisherCatalogStream':dict(sorted(streams.items())),
  'missingGradeClaimOriginalResearchIDs':sorted(missing_grade),
  'gradeConflictIDs':[],
  'schoolAdoptionVersionRowCounts':{k:counts[k] for k in zeros},
  'noSchoolVersionedAdoptionRowsYet':all(counts[k]==0 for k in zeros),
  'thePublic2026_27CatalogDoesNotAuthenticateASSPSAdoption':True,
  'referenceEditionLabelNotProofOfAppliedBoardScheme':True,
  'publisherQuestionSpecificPrintedPageExerciseTextIndependentlyVerified':0,
  'qualifiedIndependentSubjectAndLanguageReviewsAuthenticated':0,
  'newlyApprovedQuestions':0,
  'academicallyPublishedQuestions':0,
  'paperStudioVerifiedSelectableQuestions':0,
  'productionQuestionOrStudentDatabaseWrites':0,
  'publisherCatalogRecordsWithFrozenResearch':source_summaries
 }
def locked_json(path,obj):
 if path.parent.stat().st_mode & 0o077:
  raise ValueError('ROOT_PRIVATE_RECEIPT_DIR_REQUIRED')
 fd,tmp=tempfile.mkstemp(prefix='.session-applicability-',dir=path.parent)
 try:
  os.fchmod(fd,0o600)
  with os.fdopen(fd,'w',encoding='utf8') as f:
   json.dump(obj,f,ensure_ascii=False,indent=2,sort_keys=True);f.write('\n')
  os.replace(tmp,path)
 finally:
  if os.path.exists(tmp):os.unlink(tmp)
def report_text(x):
 lanes=x['candidateCountByEvidenceLane']
 src=x['schoolAdoptionVersionRowCounts']
 return f"""# ASSPS Grade IX–X 2026–27 — Official Public Catalog vs Verified School Adoption

**Independent read-only academic session applicability gap** — 16 October 2026.

The [official PECTAA curriculum catalog]({CATA_URL}) and [official textbook list]({BOOKS_URL}) publish public grade, subject, medium, stream and sometimes edition labels. This is **not** a record of which edition ASSPS has actually adopted.

## Verified frozen scope

- Original Grade IX–X research question IDs: **{x['originalResearchCount']:,}**.
- Current School 1 live provisional full-revision IDs: **{x['actualLiveFullQuestionRevisionCount']:,}**.
- Original-only IDs held, not seeded: **{x['heldOriginalOnlyCount']}**.
- Public catalog entries: **{x['allPublicCatalogs']}**, of which **{x['catalogsReferencedByFrozenResearch']}** are referenced by one or more frozen original research questions.
- Frozen research claims citing a catalog with explicit `2026-27` publication label: **{lanes.get('PUBLIC_LABEL_2026_27_NOT_ASSPS_ADOPTION',0)}**.
- Research claims citing an earlier printed edition label: **{lanes.get('EARLIER_PRINTED_EDITION_MUST_CONFIRM_SESSION',0)}**.
- Research claims citing unspecified/date-only/current catalog labels without an authenticated session edition: **{lanes.get('UNSPECIFIED_OR_DATE_LINK_REQUIRES_INDEPENDENT_ADOPTION',0)}**.
- Original research rows without usable original grade claim (not silently inferred): **{len(x['missingGradeClaimOriginalResearchIDs'])}**.
- Original research rows whose public-catalog grade contradicts an explicit frozen grade claim: **{len(x['gradeConflictIDs'])}**.

## School-specific adoption actually available in School 1

| Read-only versioned institutional evidence table | Existing school 1 rows |
|---|---:|
| Academic session versions | {src['sessionVersions']} |
| Curriculum profile versions | {src['curriculumProfileVersions']} |
| Resource book records | {src['resourceBooks']} |
| Book/version mappings | {src['resourceVersions']} |
| Learning scope versions | {src['learningScopeVersions']} |
| School academic approval events | {src['schoolAcademicApprovalEvents']} |

These tables do **not** currently provide a complete authentic school adoption chain. Zero rows are an absence of evidence in this inspected schema, not proof a school has chosen no textbooks. Authentic school documents may exist in other locations.

## Examination-year applicability safeguard

PECTAA's [7 November 2025 revised Grade IX ALP notification]({ALP_URL}) explicitly concerns the **Annual Examination 2026**. It must **not** be auto-applied to a putative **2027 examination**, or to every Grade IX–X school assessment in session 2026–27. A catalog listing marked 2026–27 alone also does not prove an ASSPS adopted book, medium, subject stream, printed exercise page or correct-answer key.

## Release consequences

- **School 2026–27 textbook adoption: NOT AUTHENTICATED**, including `-Tech` subjects.
- **Independent publisher question-specific exercise/page content verification: 0 approved.**
- **Independent qualified subject and Urdu/English reviewer approvals: 0.**
- **New Paper Studio academically verified selectable questions: 0.**
- **Production student/question/database writes: 0.**

Each source catalog is separately linked by metadata and frozen original stable-ID sets in the root-private **0600** source evidence receipt. No raw copyrighted textbook page text, individual question stems, answers, student information or fake faculty signatures were exported in this report. Source evidence can support a future properly reviewed batch; it cannot substitute for institutional and qualified faculty authorization.

**Future evidence needed:** exact adopted grade/subject/medium/session, publisher-specific book edition and actual printed content/page, independent revision-specific subject/Urdu or English academic reviewer, documented approval and Paper Studio/SaaS Core accepted release contract.
"""
def main():
 manifest_b=MANIFEST.read_bytes()
 frozen_b=ORIGINAL.read_bytes()
 obj=compile_evidence(json.loads(manifest_b),json.loads(frozen_b),
                      json.loads(ADOPTION.read_text()),json.loads(LIVE.read_text()),
                      digest(manifest_b),digest(frozen_b))
 locked_json(OUT,obj)
 # Public summary is only written during explicit authoring. Weekly systemd
 # only refreshes the private source evidence and never modifies Git files.
 if __import__('sys').argv[1:]==['--write-report']:
  REPORT.write_text(report_text(obj),encoding='utf8')
 print(json.dumps({'decision':'PUBLIC_CATALOG_LABELS_CLASSIFIED_SCHOOL_ADOPTION_NOT_AUTHENTICATED',
                   'officialManifestEntries':obj['allPublicCatalogs'],
                   'referencedCatalogs':obj['catalogsReferencedByFrozenResearch'],
                   'originalResearchIDs':obj['originalResearchCount'],
                   'schoolVersionEvidenceRows':obj['schoolAdoptionVersionRowCounts'],
                   'editionClaims':obj['candidateCountByEvidenceLane'],
                   'pendingOriginalGradeIdentity':len(obj['missingGradeClaimOriginalResearchIDs']),
                   'published':obj['academicallyPublishedQuestions'],
                   'dbWrites':obj['productionQuestionOrStudentDatabaseWrites']},
                  sort_keys=True))
if __name__=='__main__':main()
