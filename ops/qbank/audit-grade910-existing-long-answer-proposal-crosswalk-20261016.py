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
             'independentlysubjectreviewed','independentlyhum anreviewed','answerscorrectnessverifiedbyqualifiedteacher',
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
def build(groups,five,revision,risk,liveids,docs=DOCS,original=ORIG):
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
       'highPriorityRiskIdsWithPriorResearchDraft':high_existing,
       'highPriorityRiskIdsWithoutPriorResearchDraft':357-high_existing,
       'finalFiveSupplementalDockets':5,'finalFiveExplanatoryDrafts':4,
       'previousTwentyPacketsAuthenticatedOriginalSha':20,
       'publicOutputContainsNoSchoolStemOrModelAnswer':True,
       'researchCandidatesAreNotIndependentTeacherReviews':True,
       'schoolAdoptedEditionVerifiedByThisAudit':False,
       'qualifiedAcademicApprovalsCreated':0,
       'productionDatabaseWrites':0,'academicallySelectableCreated':0,
       'packetEvidence':packets,'records':union}
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
    result=build(groups,last,ledger,risks,set(hashes))
    atomic_private(OUT,result)
    return result
if __name__=='__main__':
    a=run()
    print(json.dumps({k:v for k,v in a.items() if k not in ('packetEvidence','records')},sort_keys=True))
