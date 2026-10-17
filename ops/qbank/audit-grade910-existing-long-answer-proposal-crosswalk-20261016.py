#!/usr/bin/env python3
"""Reconcile 161 previously-authored long-answer packets and final 5 research dockets
against 2,411 actual *current* School 1 revisions and the 604 risk queue.

Does NOT copy raw school questions or answers to receipts and does NOT approve anything.
"""
from __future__ import annotations
import collections,hashlib,importlib.util,json,os,re,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
DOCS=ROOT/'docs/question-bank'
ORIG=ROOT/'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging'
STATE=Path('/var/lib/assps-grade910-sourceclaims')
OUT=STATE/'live-existing-answer-proposal-crosswalk-20261016.json'
MASTER='ASSPS_GRADE910_161_DISTINCT_UNAPPROVED_ANSWER_PROPOSALS_20261009.json'
FIVE='ASSPS_GRADE910_FIVE_LAST_ORIGINAL_LONG_UNAPPROVED_ANSWER_DRAFTS_20261011.json'
SHA_LEDGER='live-question-revisions.json'
RISK_LEDGER='subjective-answer-depth-risk-20261016.json'
ANSWER_FIELDS=('proposedEnglishModelAnswer','proposedOriginalEnglishExplanatoryAnswer',
               'proposedIndependentEnglishExplanation')
BLOCK_FLAGS={'approved','academicapproved','academicallyapproved','published','verifiedpublished',
             'qualifiedsubjectreviewed','qualifiedteachersubjectreviewed','teacherscientificanswerverified',
             'independentlysubjectreviewed','answerscorrectnessverifiedbyqualifiedteacher',
             'answercorrectnessverifiedbyqualifiedteacher','qualifiedindependentsubjectreviewed'}
SCHEMA='ASSPS_GRADE910_EXISTING_166_LONG_ANSWER_RESEARCH_LIVE_CROSSWALK_V1'
def sha(data):return hashlib.sha256(data).hexdigest()
def packet_ids(groups,docs=DOCS,original=ORIG):
    result={}
    packets=[]
    if len(groups)!=20:raise ValueError('EXISTING_AUTHOR_PACKETS_SCOPE_DRIFT')
    for group in groups:
        filename=group['researchAnswerPacket']
        p=docs/filename
        if not p.is_file() or p.parent!=docs:raise ValueError('MISSING_FROZEN_PROPOSAL_FILE')
        content=p.read_bytes()
        data=json.loads(content)
        items=data.get('items')
        if not isinstance(items,list) or len(items)!=group['distinctUnapprovedExplanationProposals']:
            raise ValueError('AUTHOR_PACKET_ROW_COUNT_DRIFT')
        f=original/group['originalAuthoredSource']
        if not f.is_file() or sha(f.read_bytes())!=group['sourceFileSha256']:
            raise ValueError('ORIGINAL_RESEARCH_FILE_SHA_CHANGED')
        for row in items:
            id=row['questionId']
            if id in result:raise ValueError('DUPLICATE_161_ORIGINAL_PROPOSAL_ID')
            answers=[row[k] for k in ANSWER_FIELDS if isinstance(row.get(k),str) and row[k].strip()]
            if len(answers)!=1 or len(answers[0].split())<26:
                raise ValueError('MODEL_ANSWER_PROPOSAL_MISSING_OR_TOO_BRIEF')
            for k,v in row.items():
                if k.lower() in BLOCK_FLAGS and v is True:
                    raise ValueError('UNAUTHENTICATED_APPROVAL_IN_RESEARCH_PACKET')
            if row.get('independentReviewerId'):raise ValueError('FORGED_REVIEWER_ON_RESEARCH_PACKET')
            result[id]={'packet':filename,'packetSha256':sha(content),
                        'kind':'ORIGINAL_SEPARATE_EXPLANATION','proposalExists':True}
        packets.append({'name':filename,'sha256':sha(content),'rows':len(items),
                        'originalSourceSha256':group['sourceFileSha256']})
    if len(result)!=161 or sum(x['rows'] for x in packets)!=161:
        raise ValueError('EXPECTED_161_RESEARCH_DRAFTS_MISSING')
    return result,packets
def build(groups,five,revision,risk,liveids,docs=DOCS,original=ORIG,new_biology=None,new_dual_urdu=None,new_chemistry=None,new_english_essays=None,new_grade9_chem=None,new_nontech15=None,new_islamic10=None,new_chemistry4=None):
    existing,packets=packet_ids(groups,docs,original)
    rows=five.get('rows')
    if not isinstance(rows,list) or len(rows)!=5:raise ValueError('EXPECTED_FINAL_FIVE_FACULTY_DOCKETS')
    for row in rows:
        id=row['originalQuestionId']
        if id in existing:raise ValueError('SUPPLEMENTAL_QUESTION_DUPLICATES_PRIOR_RESEARCH')
        if row.get('academicApprovalAuthenticated') or row.get('published') or row.get('publisherSelectable'):
            raise ValueError('UNAUTHENTICATED_SUPPLEMENTAL_APPROVAL')
        text=row.get('proposedConceptualExplanation')
        has=bool(isinstance(text,str) and len(text.split())>=26)
        if bool(row.get('supplementalResearchAuthored'))!=has:
            raise ValueError('SUPPLEMENTAL_RESEARCH_STATUS_INCONSISTENT')
        existing[id]={'packet':FIVE,'packetSha256':sha((docs/FIVE).read_bytes()),
                      'kind':'FINAL_FIVE_FACULTY_DOCKET','proposalExists':has}
    if len(existing)!=166:raise ValueError('TOTAL_PRIOR_MODEL_RESEARCH_COUNT_DRIFT')
    if (revision.get('schema')!='ASSPS_IX_X_LIVE_CONTENT_REVISION_HASH_LEDGER_V1'
        or revision.get('revisions')!=2411
        or len(revision.get('records',[]))!=2411):raise ValueError('LIVE_REVISION_LEDGER_NOT_TRUSTED')
    hashes={z['questionId']:z['revisionSha256'] for z in revision['records']}
    if len(hashes)!=2411 or set(hashes)!=set(liveids):raise ValueError('LIVE_REVISION_ID_SET_DRIFT')
    if (risk.get('schema')!='ASSPS_GRADE910_SUBJECTIVE_ANSWER_DEPTH_TRIAGE_V1'
        or risk.get('currentLiveQuestionRevisionsChecked')!=2411
        or risk.get('subjectiveRiskReviewCandidates')!=604
        or len(risk.get('records',[]))!=604):raise ValueError('SUBJECTIVE_REVIEW_QUEUE_DRIFT')
    riskmap={z['questionId']:z for z in risk['records']}
    if len(riskmap)!=604:raise ValueError('RISK_ID_DUPLICATE')
    for id,r in riskmap.items():
        if id not in hashes or r.get('currentLiveContentRevisionSha256')!=hashes[id]:
            raise ValueError('REVIEW_PRIORITY_QUESTION_REVISION_DRIFT')
    union=[]
    summary=collections.Counter()
    high_existing=0
    for id,packet in sorted(existing.items()):
        is_live=id in hashes
        is_risk=id in riskmap
        has=packet['proposalExists']
        if is_live and is_risk and has and riskmap[id]['priority']=='HIGH':high_existing+=1
        summary['originalUniverse']+=1
        if is_live:summary['live']+=1
        else:summary['originalOnly']+=1
        if has:summary['hasResearchDraft']+=1
        else:summary['noResearchDraft']+=1
        if is_live and has:summary['liveWithResearchDraft']+=1
        if is_live and is_risk:summary['liveRiskLinked']+=1
        if is_live and is_risk and has:summary['liveRiskWithResearchDraft']+=1
        union.append({'questionId':id,'currentLiveRevisionSha256':hashes.get(id),
          'priorResearchPacket':packet['packet'],'priorPacketSha256':packet['packetSha256'],
          'researchOnlySupplementExists':has,'currentLivePresent':is_live,
          'answerDepthRiskFlag':riskmap[id]['category'] if is_risk else None,
          'qualifiedSubjectTeacherApproved':False,'paperStudioVerifiedSelectable':False})
    # Ready-to-work metadata-only research queue: no answer text, no fabricated
    # teacher approvals; ordering is HIGH first and stable by grade/subject/ID.
    unlinked=[]
    for id,review in riskmap.items():
        if id not in existing or not existing[id]['proposalExists']:
            unlinked.append({'questionId':id,
               'currentLiveRevisionSha256':hashes[id],
               'grade':review.get('grade'),'subject':review.get('subject'),
               'medium':review.get('medium'),'type':review.get('type'),
               'priority':review['priority'],'riskCategory':review['category'],
               'state':'RESEARCH_BACKLOG_NOT_FACULTY_APPROVED',
               'academicallySelectable':False,
               'schoolStreamApplicability':'STREAM_SPECIFIC_ADOPTION_EVIDENCE_REQUIRED' if str(review.get('subject','')).endswith('-Tech') else 'SUBJECT_BOOK_EDITION_ADOPTION_EVIDENCE_REQUIRED'})
    unlinked.sort(key=lambda x:(0 if x['priority']=='HIGH' else 1,
                                str(x['grade']),str(x['subject']),x['questionId']))
    if len(unlinked)!=450 or sum(x['priority']=='HIGH' for x in unlinked)!=229:
        raise ValueError('UNLINKED_SUBJECTIVE_RESEARCH_QUEUE_SCOPE_DRIFT')
    # Newly authored Urdu Biology explanations are *additional research*, not
    # a rewrite of the historical 161+5 packet inventory and not staff approval.
    recently_authored=0
    if new_biology is not None:
        if (new_biology.get('schema')!='ASSPS_BIOLOGY_X_URDU_TEN_LONG_ORIGINAL_RESEARCH_ANSWERS_V1'
            or new_biology.get('candidateCount')!=10
            or new_biology.get('academicallyApproved') is not False
            or new_biology.get('publishedVerified') is not False
            or new_biology.get('independentQualifiedSubjectReviewed') is not False
            or new_biology.get('independentUrduReviewed') is not False
            or new_biology.get('actualSchoolTextbookAdoptionVerified') is not False
            or new_biology.get('exactOriginalExercisePageVerified') is not False
            or new_biology.get('productionDatabaseWrites')!=0):
            raise ValueError('UNAPPROVED_BIOLOGY_RESEARCH_PACKET_FORGED_OR_DRIFTED')
        rows=new_biology.get('newAnswers')
        if not isinstance(rows,list) or len(rows)!=10:
            raise ValueError('NEW_BIOLOGY_RESEARCH_PACKET_10_REQUIRED')
        ids=set()
        for entry in rows:
            id=entry.get('questionId')
            if id in ids or id not in hashes or id in existing and existing[id]['proposalExists']:
                raise ValueError('NEW_BIOLOGY_RESEARCH_DUPLICATES_PREVIOUS_EXPLANATION')
            ids.add(id)
            prior=riskmap.get(id)
            if (prior is None or prior['priority']!='HIGH'
                or prior['grade']!='10th' or prior['subject']!='Biology'
                or prior['medium']!='Urdu' or prior['type']!='long'
                or entry.get('grade')!=10 or entry.get('subject')!='Biology'
                or entry.get('medium')!='Urdu' or entry.get('marks')!=5
                or entry.get('currentLiveRevisionSha256')!=hashes[id]
                or entry.get('academicApproved') is not False
                or entry.get('published') is not False
                or entry.get('paperStudioVerifiedSelectable') is not False
                or entry.get('independentSubjectTeacherReviewed') is not False
                or entry.get('independentUrduLanguageReviewed') is not False
                or entry.get('school2026To2027EditionAdoptionAuthenticated') is not False
                or entry.get('sourcePageOrExerciseIndependentlyVerified') is not False
                or len(str(entry.get('newIndependentResearchAnswerUrdu') or '').split())<65
                or len(entry.get('proposedFiveSeparateMarkingCriteriaUrdu') or [])!=5):
                raise ValueError('NEW_BIOLOGY_RESEARCH_NOT_CURRENT_UNAPPROVED_HIGH_REVISION')
        unlinked=[x for x in unlinked if x['questionId'] not in ids]
        recently_authored=len(ids)
        if recently_authored!=10:
            raise ValueError('NEW_BIOLOGY_RESEARCH_COUNT_NOT_TEN')
        if len(unlinked)!=440 or sum(x['priority']=='HIGH' for x in unlinked)!=219:
            raise ValueError('NEW_BIOLOGY_RESEARCH_LEFTOVER_QUEUE_WRONG')
    # Grade IX Biology (8) + Grade X Computer Science (6), distinct from the
    # first 10 and all preserved historic research. Only manuscript candidates.
    another14=0
    if new_dual_urdu is not None:
        d=new_dual_urdu
        if (d.get('schema')!='ASSPS_GRADE910_14_ORIGINAL_URDU_BIOLOGY9_COMPUTER10_EXPLANATIONS_V1'
            or d.get('candidateCount')!=14 or d.get('grade9BiologyUrduCount')!=8
            or d.get('grade10ComputerUrduCount')!=6
            or d.get('originalSourceFileFingerprintsVerified')!=2
            or d.get('researchOnlyNotTextbookCopyrightReproduction') is not True
            or d.get('actualSchoolTextbookAdoptionVerified') is not False
            or d.get('sourceExercisePageVerified') is not False
            or d.get('independentAcademicReviewCompleted') is not False
            or d.get('independentUrduLanguageReviewCompleted') is not False
            or d.get('academicallyApproved') is not False
            or d.get('published') is not False
            or d.get('paperStudioSelectable') is not False
            or d.get('productionDatabaseWrites')!=0):
            raise ValueError('SECOND_URDU_MODEL_ANSWER_RESEARCH_FORGED_OR_DRIFTED')
        entries=d.get('drafts')
        if not isinstance(entries,list) or len(entries)!=14:
            raise ValueError('SECOND_URDU_RESEARCH_14_ROWS_REQUIRED')
        newids=set()
        for row in entries:
            id=row.get('questionId'); prior=riskmap.get(id)
            spec={('9th','Biology'):('IX-BIO-UR-',8),
                  ('10th','Computer Science'):('X-COMP-',6)}
            grade=str(row.get('grade'));sub=str(row.get('subject'))
            approved_spec=spec.get((grade,sub))
            if (id in newids or not approved_spec or not str(id).startswith(approved_spec[0])
                or prior is None or prior.get('priority')!='HIGH'
                or prior.get('grade')!=grade or prior.get('subject')!=sub
                or prior.get('medium')!='Urdu' or prior.get('type')!='long'
                or id not in hashes or row.get('currentLiveFullContentRevisionSha256')!=hashes[id]
                or id in existing and existing[id]['proposalExists']
                or any(x.get('questionId')==id for x in (new_biology or {}).get('newAnswers',[]))
                or row.get('marks')!=5 or row.get('medium')!='Urdu'
                or row.get('academicallyApproved') is not False
                or row.get('publishedVerified') is not False
                or row.get('paperStudioApprovedSelectable') is not False
                or row.get('sourcePrintedTextbookPageOrExerciseVerified') is not False
                or row.get('actualSchoolAdoptedEditionFor2026_27Verified') is not False
                or row.get('independentlyQualifiedSubjectReviewed') is not False
                or row.get('independentUrduLanguageReviewerApproved') is not False
                or len(str(row.get('independentlyAuthoredUrduExplanationCandidate') or '').split())<70
                or len(row.get('proposedFivePointMarkingCriteriaUrdu') or [])!=5):
                raise ValueError('SECOND_URDU_DRAFT_NOT_CURRENT_UNAPPROVED_SOURCE_REVISION')
            newids.add(id)
        if sum(id.startswith('IX-BIO-UR-') for id in newids)!=8 or sum(id.startswith('X-COMP-') for id in newids)!=6:
            raise ValueError('SECOND_URDU_RESEARCH_GRADE_SUBJECT_DRIFT')
        if not newids<=set(x['questionId'] for x in unlinked):
            raise ValueError('SECOND_URDU_RESEARCH_DUPLICATED_OLD_QUEUE')
        unlinked=[x for x in unlinked if x['questionId'] not in newids]
        another14=len(newids)
        if len(unlinked)!=426 or sum(x['priority']=='HIGH' for x in unlinked)!=205:
            raise ValueError('SECOND_URDU_RESEARCH_LEFTOVER_PRIORITY_DRIFT')
    new_chemistry_count=0
    if new_chemistry is not None:
        packet=new_chemistry
        if (packet.get('schema')!='ASSPS_GRADE10_CHEMISTRY_10_SAFE_CONCEPTUAL_URDU_ANSWERS_V1'
            or packet.get('candidateCount')!=10
            or packet.get('sourceFrozenResearchSha256')!='5c89d545299e106ef13671202f72c920a03669e59123dfd296a283f9e97b6da3'
            or packet.get('grade')!='10th' or packet.get('medium')!='Urdu' or packet.get('subject')!='Chemistry'
            or packet.get('actualSchoolAdoptedTextbookVerified') is not False
            or packet.get('sourceExercisePageCorroborated') is not False
            or packet.get('qualifiedIndependentChemistryAndUrduReviewCompleted') is not False
            or packet.get('academicApproval') is not False
            or packet.get('published') is not False
            or packet.get('paperStudioVerifiedSelectable') is not False
            or packet.get('productionDatabaseWrites')!=0
            or packet.get('originalConceptualAnswersNotOperationalPreparationGuides') is not True
            or packet.get('specialistHeldNoAIExplanatoryAnswerQuestionIds')!=['X-CHEM-UR-C18-L01','X-CHEM-UR-C23-L01','X-CHEM-UR-C24-L01']):
            raise ValueError('CHEMISTRY_URDU_13_NEW_RESEARCH_CANNOT_CLAIM_APPROVAL')
        rows=packet.get('drafts')
        if not isinstance(rows,list) or len(rows)!=10:
            raise ValueError('CHEMISTRY_URDU_13_RESEARCH_MISSING')
        unlinked_ids={row['questionId'] for row in unlinked}
        visited=set()
        for q in rows:
            id=q.get('questionId')
            if (id in visited or id not in unlinked_ids or id not in riskmap
                or riskmap[id].get('priority')!='HIGH'
                or riskmap[id].get('grade')!='10th'
                or riskmap[id].get('subject')!='Chemistry'
                or riskmap[id].get('medium')!='Urdu' or riskmap[id].get('type')!='long'
                or q.get('liveFullQuestionContentRevisionSha256')!=hashes.get(id)
                or q.get('grade')!='10th' or q.get('subject')!='Chemistry'
                or q.get('medium')!='Urdu' or q.get('marks')!=5
                or q.get('approved') is not False or q.get('published') is not False
                or q.get('paperStudioVerifiedSelectable') is not False
                or q.get('independentChemistryTeacherReviewed') is not False
                or q.get('independentUrduLanguageReviewed') is not False
                or q.get('school2026To2027BookAdoptionVerified') is not False
                or q.get('actualSourceExercisePageVerified') is not False
                or q.get('operationalHazardousLabInstructionsProvided') is not False
                or len(str(q.get('originalConceptualExplanationCandidateUrdu') or '').split())<65
                or len(q.get('proposedFiveIndependentAssessmentPointsUrdu') or [])!=5):
                raise ValueError('CHEMISTRY_URDU_13_DRAFT_NOT_CURRENT_OR_NOT_UNAPPROVED')
            visited.add(id)
        if len(visited)!=10 or not all(str(id).startswith('X-CHEM-UR-C') for id in visited):
            raise ValueError('CHEMISTRY_URDU_CURRENT_HIGH_BATCH_ID_SCOPE_DRIFT')
        unlinked=[x for x in unlinked if x['questionId'] not in visited]
        new_chemistry_count=len(visited)
        if len(unlinked)!=416 or sum(x['priority']=='HIGH' for x in unlinked)!=195:
            raise ValueError('CHEMISTRY_URDU_RESEARCH_QUEUE_416_195_DRIFT')
    # Twenty-one original English essay *examples*, not the only correct answers.
    # These are deliberately a separate unapproved corpus, never the MCQ key.
    english_count=0
    if new_english_essays is not None:
        manifest=new_english_essays
        if (manifest.get('schema')!='ASSPS_GRADE910_21_ENGLISH_ESSAY_EXEMPLAR_UNAPPROVED_RESEARCH_V1'
            or manifest.get('totalCandidateResearchExemplars')!=21
            or manifest.get('grade9Exemplars')!=11 or manifest.get('grade10Exemplars')!=10
            or manifest.get('answersAreExamplesNotTheOnlyValidAnswers') is not True
            or manifest.get('frozenOriginalResearchFilesShaVerified')!=2
            or manifest.get('currentRevisionPinsPresent') is not True
            or manifest.get('productionDatabaseWrites')!=0
            or manifest.get('schoolAdoptedEditionConfirmed') is not False
            or manifest.get('exercisePageProvenanceConfirmed') is not False
            or manifest.get('qualifiedEnglishTeacherReviewCompleted') is not False
            or manifest.get('academicApproved') is not False
            or manifest.get('published') is not False
            or manifest.get('paperStudioSelectable') is not False):
            raise ValueError('ENGLISH_21_UNREVIEWED_ESSAY_EXEMPLAR_FRAUDULENT_APPROVAL')
        entries=manifest.get('rows')
        if not isinstance(entries,list) or len(entries)!=21:
            raise ValueError('ENGLISH_21_ESSAY_RESEARCH_ROWS_MISSING')
        remaining={x['questionId'] for x in unlinked}
        used=set()
        counts=collections.Counter()
        for row in entries:
            id=row.get('questionId')
            grade=row.get('grade')
            prefix={'9th':'IX-ENG-2025-U','10th':'X-ENG-2026-U'}.get(grade)
            rev=riskmap.get(id)
            if (id in used or id not in remaining or prefix is None
                or not str(id).startswith(prefix)
                or rev is None or rev.get('priority')!='HIGH'
                or rev.get('grade')!=grade or rev.get('subject')!='English'
                or rev.get('medium')!='english' or rev.get('type')!='essay'
                or id not in hashes
                or row.get('currentLiveFullQuestionRevisionSha256')!=hashes[id]
                or row.get('subject')!='English' or row.get('medium')!='english'
                or row.get('type')!='essay' or row.get('marks')!=5
                or row.get('alternateCorrectStudentAnswersPermitted') is not True
                or row.get('thisIsAnIllustrativeExemplarNotAnAnswerKey') is not True
                or row.get('textbookExtractOrPastPaperTextReproduced') is not False
                or row.get('authenticASSPSAdoptedEditionEvidence') is not False
                or row.get('independentEnglishTeacherReviewed') is not False
                or row.get('sourceExercisePrintedPageVerified') is not False
                or row.get('academicApproved') is not False
                or row.get('published') is not False
                or row.get('paperStudioVerifiedSelectable') is not False
                or not 75<=len(str(row.get('originalIllustrativeParagraphNotUniqueAnswer') or '').split())<=145
                or len(row.get('flexibleFiveCriterionMarkingGuide') or [])!=5):
                raise ValueError('ENGLISH_21_EXEMPLAR_NOT_CURRENT_NONSELECTABLE_ESSAY')
            counts[grade]+=1;used.add(id)
        if counts!=collections.Counter({'9th':11,'10th':10}):
            raise ValueError('ENGLISH_21_GRADE_SPLIT_DRIFT')
        unlinked=[q for q in unlinked if q['questionId'] not in used]
        english_count=len(used)
        if len(unlinked)!=395 or sum(q['priority']=='HIGH' for q in unlinked)!=174:
            raise ValueError('ENGLISH_21_RESEARCH_QUEUE_MUST_BE_395_174')
    grade9_chem_count=0
    if new_grade9_chem is not None:
        d=new_grade9_chem
        if (d.get('schema')!='ASSPS_GRADE9_URDU_CHEMISTRY_8_UNAPPROVED_CONCEPTUAL_ANSWERS_V1'
            or d.get('candidateCount')!=8
            or d.get('frozenResearchSourceSha256')!='0993bd684e10497b63e0792a23698046470c9433bca944b06e71f5849ef54cc5'
            or d.get('liveSchool1RevisionsChecked')!=2411
            or d.get('grade')!='9th' or d.get('subject')!='Chemistry'
            or d.get('medium')!='Urdu'
            or d.get('productionDatabaseWrites')!=0
            or d.get('academicApproved') is not False
            or d.get('published') is not False
            or d.get('paperStudioVerifiedSelectable') is not False
            or d.get('independentReviewerAuthenticated') is not False
            or d.get('officialSchoolTextbookAdoptionVerified') is not False
            or d.get('exactExercisePageVerified') is not False):
            raise ValueError('GRADE9_URDU_CHEM_EIGHT_CANNOT_FORGE_APPROVAL')
        rows=d.get('rows')
        if not isinstance(rows,list) or len(rows)!=8:
            raise ValueError('GRADE9_URDU_CHEM_EIGHT_ROWS_NOT_FOUND')
        available={q['questionId'] for q in unlinked}
        seen=set()
        for row in rows:
            id=row.get('questionId')
            r=riskmap.get(id)
            if (id in seen or id not in available
                or not str(id).startswith('IX-CHEM-UR-C')
                or r is None or r.get('grade')!='9th'
                or r.get('subject')!='Chemistry'
                or r.get('medium')!='Urdu'
                or r.get('priority')!='HIGH' or r.get('type')!='long'
                or row.get('grade')!='9th' or row.get('medium')!='Urdu'
                or row.get('subject')!='Chemistry' or row.get('questionType')!='long'
                or row.get('marks')!=5 or row.get('currentFullQuestionRevisionSha256')!=hashes.get(id)
                or row.get('published') is not False
                or row.get('academicallyApproved') is not False
                or row.get('paperStudioVerifiedSelectable') is not False
                or row.get('independentQualifiedChemistryReviewed') is not False
                or row.get('independentUrduReviewed') is not False
                or row.get('sourcePrintedExercisePageVerified') is not False
                or row.get('schoolSessionTextbookEditionAuthenticated') is not False
                or row.get('hazardousPreparationProcedureIncluded') is not False
                or len(str(row.get('newOriginalUrduConceptualExplanation') or '').split())<75
                or len(row.get('proposedFivePointReviewRubric') or [])!=5):
                raise ValueError('GRADE9_URDU_CHEM_CURRENT_REVISION_UNAPPROVED_RESEARCH_REQUIRED')
            seen.add(id)
        unlinked=[x for x in unlinked if x['questionId'] not in seen]
        grade9_chem_count=len(seen)
        if grade9_chem_count!=8 or len(unlinked)!=387 or sum(x['priority']=='HIGH' for x in unlinked)!=166:
            raise ValueError('GRADE9_URDU_CHEM_BACKLOG_387_166_DRIFT')
    original_nontech15=0
    if new_nontech15 is not None:
        packet=new_nontech15
        if (packet.get('schema')!='ASSPS_GRADE910_15_CONVENTIONAL_HIGH_UNAPPROVED_ORIGINAL_EXEMPLARS_V1'
            or packet.get('candidateCount')!=15
            or packet.get('linkedCurrentSchool1QuestionRevisions')!=15
            or packet.get('sourceSchool1LiveRecordsReadOnly')!=2411
            or packet.get('independentQualifiedSubjectApprovalCount')!=0
            or packet.get('actualSchoolTextbookAdoptionVerified') is not False
            or packet.get('originalExercisePageVerified') is not False
            or packet.get('paperStudioVerifiedPublication') is not False
            or packet.get('productionDatabaseWrites')!=0
            or len(packet.get('answers',[]))!=15):
            raise ValueError('NEW_15_ORIGINAL_NONTECH_RESEARCH_PACKET_INVALID')
        existing_unlinked={r['questionId']:r for r in unlinked}
        expected_names={
            'X-PAK-UR-C01-L01','X-PAK-UR-C03-L01','X-PAK-UR-C04-L01',
            'X-PAK-UR-C05-L01','X-PAK-UR-C06-L01','X-PAK-UR-C07-L01',
            'X-PAK-UR-C08-L01','X-URDU-GR-ESS01','X-URDU-GR-ESS02',
            'IX-URDU-GR-ESS01','IX-URDU-GR-ESS02','IX-MATH-C08-L01',
            'IX-MATH-UR-C08-L01','IX-MATH-UR-C11-L01','IX-PHY-UR-C09-L01'}
        seen=set()
        for entry in packet['answers']:
            id=entry.get('questionId')
            risk=existing_unlinked.get(id)
            if (id in seen or id not in expected_names or risk is None
                or risk.get('priority')!='HIGH'
                or risk.get('schoolStreamApplicability')!='SUBJECT_BOOK_EDITION_ADOPTION_EVIDENCE_REQUIRED'
                or entry.get('currentLiveFullRevisionSha256')!=hashes.get(id)
                or entry.get('grade')!=risk.get('grade')
                or entry.get('subject')!=risk.get('subject')
                or entry.get('medium')!=risk.get('medium')
                or entry.get('questionType')!=risk.get('type')
                or entry.get('marks')!=5
                or not 65<=len(str(entry.get('independentOriginalIllustrativeExemplarNotUniqueModelKey','')).split())<=190
                or len(entry.get('fivePointReviewRubricNotApprovedAnswerKey',[]))!=5
                or entry.get('alternateAccurateStudentAnswersPermitted') is not True
                or entry.get('school2026To2027BookAdoptionAuthenticated') is not False
                or entry.get('specificPrintedTextbookExercisePageAuthenticated') is not False
                or entry.get('qualifiedSubjectIndependentTeacherApproval') is not False
                or entry.get('qualifiedUrduLanguageTeacherApproval') is not False
                or entry.get('academicApproved') is not False
                or entry.get('paperStudioVerifiedSelectable') is not False
                or entry.get('productionSchoolQuestionDatabaseWrites')!=0):
                raise ValueError('NONTECH_15_CURRENT_LIVE_OR_HUMAN_REVIEW_FRAUD')
            seen.add(id)
        if seen!=expected_names:
            raise ValueError('EXACT_15_HIGH_CONVENTIONAL_SUBJECT_IDS_REQUIRED')
        unlinked=[r for r in unlinked if r['questionId'] not in seen]
        original_nontech15=15
        if (len(unlinked)!=372
            or sum(r['priority']=='HIGH' for r in unlinked)!=151
            or sum(r['priority']=='HIGH' and r['schoolStreamApplicability']=='STREAM_SPECIFIC_ADOPTION_EVIDENCE_REQUIRED' for r in unlinked)!=137):
            raise ValueError('CURRENT_15_ADDITIONAL_RESEARCH_QUEUE_372_151_DRIFT')
    islamic10_count=0
    if new_islamic10 is not None:
        pkt=new_islamic10
        if (pkt.get('schema')!='ASSPS_GRADE9_ISLAMIC_ETHICS_TEN_ORIGINAL_UNAPPROVED_EXEMPLARS_V1'
            or pkt.get('candidateCount')!=10
            or pkt.get('liveSchool1ReadOnlyCurrentRevisionCount')!=2411
            or pkt.get('qualifiedIslamicAndUrduReviewerApprovals')!=0
            or pkt.get('school2026_27TextbookAdoptionVerified') is not False
            or pkt.get('printedExercisePageVerified') is not False
            or pkt.get('publishedVerified') is not False
            or pkt.get('productionDatabaseWrites')!=0):
            raise ValueError('ISLAMIC_TEN_RESEARCH_MUST_REMAIN_UNAPPROVED')
        expected={
            'IX-ISL-U02-L01','IX-ISL-U05-L01','IX-ISL-U06-L01','IX-ISL-U07-L01',
            'IX-TTQ-C04-L01','IX-TTQ-C06-L01','IX-TTQ-C09-L01',
            'IX-TTQ-C11-L01','IX-TTQ-C15-L01','IX-TTQ-C16-L01'}
        before={row['questionId']:row for row in unlinked}
        if len(pkt.get('answers',[]))!=10:raise ValueError('EXACT_TEN_ISLAMIC_ITEMS_REQUIRED')
        seen=set()
        for one in pkt['answers']:
            id=one.get('questionId');row=before.get(id)
            if (id in seen or id not in expected or row is None
                or row.get('priority')!='HIGH' or row.get('grade')!='9th'
                or row.get('medium')!='Urdu'
                or row.get('subject') not in ('Islamiat','Tarjuma-tul-Quran')
                or row.get('schoolStreamApplicability')!='SUBJECT_BOOK_EDITION_ADOPTION_EVIDENCE_REQUIRED'
                or one.get('currentLiveFullRevisionSha256')!=hashes.get(id)
                or one.get('subject')!=row.get('subject')
                or one.get('medium')!=row.get('medium')
                or one.get('marks')!=5
                or not 70<=len(str(one.get('newOriginalUrduIllustrativeEthicalExplanationNotOfficialTranslation','')).split())<=160
                or len(one.get('fivePointUnapprovedSubjectUrduReviewCriteria',[]))!=5
                or one.get('multipleCorrectStudentAnswersPermitted') is not True
                or one.get('noCopyrightedAyahTranslationOrHadithReproduced') is not True
                or one.get('actualASSPSAdopted2026To2027BookVerified') is not False
                or one.get('actualPrintedExercisePageVerified') is not False
                or one.get('independentIslamicStudiesTeacherApproved') is not False
                or one.get('independentUrduReviewerApproved') is not False
                or one.get('academicallyApproved') is not False
                or one.get('paperStudioVerifiedSelectable') is not False
                or one.get('productionDatabaseWrites')!=0):
                raise ValueError('ISLAMIC_TEN_NOT_CURRENT_UNREVIEWED_SCHOOL1_REVISION')
            seen.add(id)
        if seen!=expected:raise ValueError('ISLAMIC_TEN_REQUIRED_IDS_NOT_PRESENT')
        unlinked=[z for z in unlinked if z['questionId'] not in seen]
        islamic10_count=10
        if (len(unlinked)!=362
            or sum(z['priority']=='HIGH' for z in unlinked)!=141
            or sum(z['priority']=='HIGH' and z['schoolStreamApplicability']=='STREAM_SPECIFIC_ADOPTION_EVIDENCE_REQUIRED' for z in unlinked)!=137
            or sum(z['priority']=='HIGH' and z['schoolStreamApplicability']=='SUBJECT_BOOK_EDITION_ADOPTION_EVIDENCE_REQUIRED' for z in unlinked)!=4):
            raise ValueError('ISLAMIC_TEN_BACKLOG_MUST_BE_362_141_RESEARCH_ONLY')
    chemistry4_count=0
    if new_chemistry4 is not None:
        pkt=new_chemistry4
        expected={'X-CHEM-C23-L01','X-CHEM-UR-C18-L01',
                  'X-CHEM-UR-C23-L01','X-CHEM-UR-C24-L01'}
        if (pkt.get('schema')!='ASSPS_GRADE10_FOUR_CHEMISTRY_CONCEPTUAL_RESEARCH_NONPROCEDURAL_UNAPPROVED_V1'
            or pkt.get('candidateCount')!=4
            or pkt.get('school1LiveCurrentRevisionCount')!=2411
            or pkt.get('laboratoryOperatingInstructionsIncluded') is not False
            or pkt.get('falseAcademicReviewSignaturesCount')!=0
            or pkt.get('verifiedSchoolAdoptedSourceExercisePages')!=0
            or pkt.get('qualifiedSubjectApprovals')!=0
            or pkt.get('qualifiedUrduReviews')!=0
            or pkt.get('academicallyApproved')!=0
            or pkt.get('paperStudioPublished')!=0
            or pkt.get('school1DatabaseMutations')!=0
            or len(pkt.get('answers',[]))!=4):
            raise ValueError('FOUR_CHEMISTRY_CAN_ONLY_BE_UNAPPROVED_CONCEPT_RESEARCH')
        prior={row['questionId']:row for row in unlinked}
        seen=set()
        for one in pkt['answers']:
            id=one.get('questionId');original=prior.get(id)
            if (id not in expected or id in seen or original is None
                or original.get('grade')!='10th' or original.get('subject')!='Chemistry'
                or original.get('priority')!='HIGH'
                or original.get('schoolStreamApplicability')!='SUBJECT_BOOK_EDITION_ADOPTION_EVIDENCE_REQUIRED'
                or one.get('currentLiveFullRevisionSHA256')!=hashes.get(id)
                or one.get('subject')!=original.get('subject')
                or one.get('medium')!=original.get('medium')
                or one.get('marks')!=5
                or not 80<=len(one.get('originalNonproceduralChemistryConceptualExemplarNotOfficialKey','').split())<=180
                or len(one.get('fiveCriterionAcademicAndSafetyReviewRubricNotApprovedKey',[]))!=5
                or one.get('mayNotProvideLaboratoryOperatingParameters') is not True
                or one.get('schoolSpecific2026To2027EditionAdopted') is not False
                or one.get('originalPrintedTextbookExercisePageVerified') is not False
                or one.get('independentChemistryFacultyRevisionApproval') is not False
                or one.get('independentUrduReviewerApproval') is not False
                or one.get('academicApproved') is not False
                or one.get('paperStudioVerifiedSelectable') is not False
                or one.get('productionDBWrites')!=0):
                raise ValueError('FOUR_CHEMISTRY_NOT_EXACT_CURRENT_UNREVIEWED_QID_SHA')
            seen.add(id)
        if seen!=expected:raise ValueError('EXACT_FOUR_GRADE10_CHEMISTRY_IDS_REQUIRED')
        unlinked=[v for v in unlinked if v['questionId'] not in expected]
        chemistry4_count=4
        if (len(unlinked)!=358
            or sum(v['priority']=='HIGH' for v in unlinked)!=137
            or sum(v['priority']=='HIGH' and v['schoolStreamApplicability']=='STREAM_SPECIFIC_ADOPTION_EVIDENCE_REQUIRED' for v in unlinked)!=137
            or sum(v['priority']=='HIGH' and v['schoolStreamApplicability']=='SUBJECT_BOOK_EDITION_ADOPTION_EVIDENCE_REQUIRED' for v in unlinked)!=0):
            raise ValueError('CHEMISTRY_FOUR_BACKLOG_MUST_BE_358_137_TECH_PENDING')
    if summary['originalUniverse']!=166 or summary['live']!=165 or summary['originalOnly']!=1:
        raise ValueError('RESEARCH_ORIGINAL_LIVE_CROSSWALK_DRIFT')
    if summary['hasResearchDraft']!=165 or summary['noResearchDraft']!=1 or summary['liveWithResearchDraft']!=164:
        raise ValueError('PRIOR_ANSWER_DRAFT_AVAILABILITY_DRIFT')
    if summary['liveRiskLinked']!=155 or summary['liveRiskWithResearchDraft']!=154:
        raise ValueError('SUBJECTIVE_RESEARCH_QUEUE_OVERLAP_DRIFT')
    return {'schema':SCHEMA,'liveQuestionRevisionsLinked':2411,
       'originalOnlyPriorProposalIds':summary['originalOnly'],
       'uniqueHistoricalResearchLongIds':summary['originalUniverse'],
       'historicalLongIdsWithAnySupplementalExplanatoryDraft':summary['hasResearchDraft'],
       'historicalLongIdsWithoutSupplementalDraft':summary['noResearchDraft'],
       'liveLongQuestionIdsWithPriorResearchDraft':summary['liveWithResearchDraft'],
       'liveRiskIdsWithPriorResearchDraft':summary['liveRiskWithResearchDraft'],
       'liveRiskIdsWithoutPriorResearchDraft':604-summary['liveRiskWithResearchDraft'],
       'newIndependentHighPriorityUrduBiologyResearchCandidates':recently_authored,
       'newHighPriorityGrade9BiologyAndGrade10ComputerUrduResearchCandidates':another14,
       'newGrade10ChemistryUrduConceptualResearchCandidates':new_chemistry_count,
       'newEnglishGrade9And10IllustrativeParagraphCandidates':english_count,
       'newGrade9ChemistryUrduOriginalConceptualResearchCandidates':grade9_chem_count,
       'newConventionalHighPriorityOriginalExemplarsWithoutApproval':original_nontech15,
       'newGrade9IslamiyatTarjumaOriginalEthicalResearchCandidates':islamic10_count,
       'newGrade10FourNonproceduralChemistryOriginalResearchCandidates':chemistry4_count,
       'remainingHighPriorityStreamSpecificSubjectLabelsAwaitSchoolAdoption':sum(x['priority']=='HIGH' and x['schoolStreamApplicability']=='STREAM_SPECIFIC_ADOPTION_EVIDENCE_REQUIRED' for x in unlinked),
       'remainingHighPriorityOtherSubjectLabelsStillNeedBookAdoption':sum(x['priority']=='HIGH' and x['schoolStreamApplicability']=='SUBJECT_BOOK_EDITION_ADOPTION_EVIDENCE_REQUIRED' for x in unlinked),
       'streamSpecificLabelsAreNotAutomaticInapplicabilityOrApproval':True,
       'remainingLiveReviewDepthFlagsWithoutAnyDraft':len(unlinked),
       'remainingHighPriorityFlagsWithoutAnyDraft':sum(x['priority']=='HIGH' for x in unlinked),
       'highPriorityRiskIdsWithPriorResearchDraft':high_existing,
       'highPriorityRiskIdsWithoutPriorResearchDraft':357-high_existing,
       'finalFiveSupplementalDockets':5,'finalFiveExplanatoryDrafts':4,
       'previousTwentyPacketsAuthenticatedOriginalSha':20,
       'publicOutputContainsNoSchoolStemOrModelAnswer':True,
       'researchCandidatesAreNotIndependentTeacherReviews':True,
       'schoolAdoptedEditionVerifiedByThisAudit':False,
       'qualifiedAcademicApprovalsCreated':0,
       'productionDatabaseWrites':0,'academicallySelectableCreated':0,
       'packetEvidence':packets,'records':union,
       'unlinkedCurrentRevisionResearchQueue':unlinked}
def atomic_private(path,obj):
    path.parent.mkdir(parents=True,exist_ok=True,mode=0o700)
    if path.parent.stat().st_mode & 0o077:raise ValueError('PRIVATE_RESEARCH_RECEIPT_REQUIRED')
    fd,t=tempfile.mkstemp(dir=path.parent,prefix='.historical-answer-')
    try:
        os.fchmod(fd,0o600)
        with os.fdopen(fd,'w') as f:
            json.dump(obj,f,indent=2,sort_keys=True,ensure_ascii=False);f.write('\n');f.flush();os.fsync(f.fileno())
        os.replace(t,path)
    finally:
        if os.path.exists(t):os.unlink(t)
def run():
    p=ROOT/'ops/qbank/audit-grade910-live-question-revisions-20261016.py'
    sp=importlib.util.spec_from_file_location('assps_full_revision_reader',p)
    m=importlib.util.module_from_spec(sp);sp.loader.exec_module(m)
    live=m.read_live()
    if len(live)!=2411:raise ValueError('LIVE_BANK_SCOPE_CHANGED')
    ledger=json.loads((STATE/SHA_LEDGER).read_text())
    hashes={r['questionId']:r['revisionSha256'] for r in ledger['records']}
    if len(hashes)!=2411:raise ValueError('LIVE_REVISION_LEDGER_DUPLICATES')
    for row in live:
        if m.revision_sha(row)!=hashes.get(row['id']):
            raise ValueError('LIVE_CURRENT_QUESTION_REVISION_DRIFT')
    groups=json.loads((DOCS/MASTER).read_text())['sourceGroups']
    last=json.loads((DOCS/FIVE).read_text())
    risks=json.loads((STATE/RISK_LEDGER).read_text())
    # Rebuild expected answers from the frozen research authoring script and
    # today's actual current live SHA set before trusting the source packet.
    spec=importlib.util.spec_from_file_location(
        'assps_original_urdu_biology_research_author',
        ROOT/'ops/qbank/author-grade10-urdu-biology-ten-research-answers-20261016.py')
    author=importlib.util.module_from_spec(spec);spec.loader.exec_module(author)
    proposal=json.loads(author.OUT.read_text(encoding='utf8'))
    if sha(author.SOURCE.read_bytes())!=author.EXPECTED_SOURCE_SHA:
        raise ValueError('TEN_URDU_BIOLOGY_FROZEN_ORIGINAL_FILE_CHANGED')
    if author.build({r['id']:r for r in live},hashes)!=proposal:
        raise ValueError('TEN_URDU_BIOLOGY_PROPOSAL_TAMPERED_OR_CURRENT_REVISION_DRIFT')
    spec2=importlib.util.spec_from_file_location(
        'assps_new_independent_grade9_biology8_grade10_computer6_urdu_research',
        ROOT/'ops/qbank/author-grade9-biology8-grade10-computer6-urdu-research-20261016.py')
    author2=importlib.util.module_from_spec(spec2);spec2.loader.exec_module(author2)
    proposal2=json.loads(author2.OUTPUT.read_text(encoding='utf8'))
    # Authoring is reproducible from actual live full revision SHA and frozen
    # original research bytes; a changed packet is rejected, never adopted.
    expected14=author2.build({r['id']:r for r in live},hashes,
        {z['questionId']:z for z in risks['records'] if z['priority']=='HIGH'})
    if proposal2!=expected14:
        raise ValueError('SECOND_URDU_ORIGINAL_AUTHOR_PACKET_TAMPERED')
    for subject,(_grade,filename,original_sha,_catalog) in author2.FROZEN.items():
        if sha((author2.SOURCE_ROOT/filename).read_bytes())!=original_sha:
            raise ValueError('SECOND_URDU_ORIGINAL_SOURCE_SHA_DRIFT')
    spec3=importlib.util.spec_from_file_location(
        'assps_chemistry10_urdu_thirteen_original_research',
        ROOT/'ops/qbank/author-grade10-urdu-chemistry-ten-safe-conceptual-answers-20261016.py')
    author3=importlib.util.module_from_spec(spec3);spec3.loader.exec_module(author3)
    proposal3=json.loads(author3.OUT.read_text(encoding='utf8'))
    if sha(author3.SOURCE.read_bytes())!=author3.SOURCE_SHA:
        raise ValueError('CHEMISTRY_URDU_ORIGINAL_SOURCE_TAMPERED')
    expected13=author3.build({r['id']:r for r in live},hashes,
                             {z['questionId']:z for z in risks['records']})
    if expected13!=proposal3:
        raise ValueError('CHEMISTRY_URDU_THIRTEEN_AUTHORED_PACKET_TAMPERED')
    spec4=importlib.util.spec_from_file_location(
        'assps_original_english_21_essay_exemplars',
        ROOT/'ops/qbank/author-grade910-english-21-essay-exemplars-20261016.py')
    author4=importlib.util.module_from_spec(spec4);spec4.loader.exec_module(author4)
    proposal4=json.loads(author4.OUT.read_text(encoding='utf8'))
    for grade,(filename,fingerprint,_catalog) in author4.FROZEN.items():
        if sha((author4.DATA/filename).read_bytes())!=fingerprint:
            raise ValueError('ENGLISH_21_ORIGINAL_RESEARCH_SOURCE_SHA_CHANGED')
    expected4=author4.build({r['id']:r for r in live},hashes,
                            {r['questionId']:r for r in risks['records']})
    if expected4!=proposal4:
        raise ValueError('ENGLISH_21_INDEPENDENT_DRAFT_OR_CURRENT_REVISION_DRIFT')
    spec5=importlib.util.spec_from_file_location(
        'assps_grade9_urdu_chemistry_eight_original_research',
        ROOT/'ops/qbank/author-grade9-urdu-chemistry-eight-conceptual-20261016.py')
    author5=importlib.util.module_from_spec(spec5);spec5.loader.exec_module(author5)
    proposal5=json.loads(author5.OUT.read_text(encoding='utf8'))
    if sha(author5.SRC.read_bytes())!=author5.SRC_SHA:
        raise ValueError('GRADE9_URDU_CHEM_ORIGINAL_FROZEN_FILE_DRIFT')
    expected5=author5.build({r['id']:r for r in live},hashes,
                            {r['questionId']:r for r in risks['records']})
    if expected5!=proposal5:
        raise ValueError('GRADE9_URDU_CHEM_EIGHT_ANSWER_PACKET_TAMPERED')
    spec6=importlib.util.spec_from_file_location(
        'assps_15_nontech_current_unapproved_original_exemplars',
        ROOT/'ops/qbank/author-grade910-15-nontech-high-original-exemplars-20261016.py')
    author6=importlib.util.module_from_spec(spec6);spec6.loader.exec_module(author6)
    proposal6=json.loads(author6.OUT.read_text(encoding='utf8'))
    baseline=build(groups,last,ledger,risks,set(hashes),new_biology=proposal,
        new_dual_urdu=proposal2,new_chemistry=proposal3,
        new_english_essays=proposal4,new_grade9_chem=proposal5)
    expected6=author6.build(live,json.loads(author6.PUBLIC.read_text())['rows'],
        risks['records'],hashes,baseline['unlinkedCurrentRevisionResearchQueue'])
    if proposal6!=expected6:
        raise ValueError('NEW_CONVENTIONAL_15_ORIGINAL_SHA_BOUND_PACKET_MODIFIED')
    spec7=importlib.util.spec_from_file_location(
        'assps_grade9_islamic_ethics_ten_original',
        ROOT/'ops/qbank/author-grade9-ten-islamic-urdu-ethical-exemplars-20261016.py')
    author7=importlib.util.module_from_spec(spec7);spec7.loader.exec_module(author7)
    proposal7=json.loads(author7.OUT.read_text(encoding='utf8'))
    baseline7=build(groups,last,ledger,risks,set(hashes),new_biology=proposal,
        new_dual_urdu=proposal2,new_chemistry=proposal3,new_english_essays=proposal4,
        new_grade9_chem=proposal5,new_nontech15=proposal6)
    source7={r['questionId']:r for r in json.loads(author7.PUB.read_text())['rows']}
    expected7=author7.build(live,hashes,
        {r['questionId']:r for r in risks['records']},
        {r['questionId']:r for r in baseline7['unlinkedCurrentRevisionResearchQueue']},
        source7)
    if proposal7!=expected7:
        raise ValueError('ISLAMIC_TEN_INDEPENDENT_CURRENT_SHA_PACKET_NOT_REPRODUCIBLE')
    spec8=importlib.util.spec_from_file_location(
        'assps_four_conceptual_chemistry_unapproved',
        ROOT/'ops/qbank/author-grade10-four-safe-conceptual-chemistry-exemplars-20261017.py')
    author8=importlib.util.module_from_spec(spec8);spec8.loader.exec_module(author8)
    proposal8=json.loads(author8.OUT.read_text(encoding='utf8'))
    baseline8=build(groups,last,ledger,risks,set(hashes),new_biology=proposal,
        new_dual_urdu=proposal2,new_chemistry=proposal3,new_english_essays=proposal4,
        new_grade9_chem=proposal5,new_nontech15=proposal6,new_islamic10=proposal7)
    expected8=author8.build(live,hashes,
        {r['questionId']:r for r in risks['records']},
        {r['questionId']:r for r in baseline8['unlinkedCurrentRevisionResearchQueue']},
        {r['questionId']:r for r in json.loads(author8.PUB.read_text())['rows']})
    if proposal8!=expected8:
        raise ValueError('CURRENT_GRADE10_CHEMISTRY_FOUR_PROOF_NOT_REPRODUCIBLE')
    result=build(groups,last,ledger,risks,set(hashes),new_biology=proposal,
                 new_dual_urdu=proposal2,new_chemistry=proposal3,
                 new_english_essays=proposal4,new_grade9_chem=proposal5,new_nontech15=proposal6,
                 new_islamic10=proposal7,new_chemistry4=proposal8)
    atomic_private(OUT,result)
    return result
if __name__=='__main__':
    a=run()
    print(json.dumps({k:v for k,v in a.items() if k not in ('packetEvidence','records','unlinkedCurrentRevisionResearchQueue')},sort_keys=True))
