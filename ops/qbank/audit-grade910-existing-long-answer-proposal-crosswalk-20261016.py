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
def build(groups,five,revision,risk,liveids,docs=DOCS,original=ORIG,new_biology=None,new_dual_urdu=None,new_chemistry=None):
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
               'academicallySelectable':False})
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
    result=build(groups,last,ledger,risks,set(hashes),new_biology=proposal,
                 new_dual_urdu=proposal2,new_chemistry=proposal3)
    atomic_private(OUT,result)
    return result
if __name__=='__main__':
    a=run()
    print(json.dumps({k:v for k,v in a.items() if k not in ('packetEvidence','records','unlinkedCurrentRevisionResearchQueue')},sort_keys=True))
