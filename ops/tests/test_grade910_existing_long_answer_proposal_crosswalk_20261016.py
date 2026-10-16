"""Hermetic regression suite for frozen historical long-answer research vs live revisions."""
from __future__ import annotations
import copy,importlib.util,json
from pathlib import Path
import tempfile,unittest
ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('historic_answer_qa',ROOT/'ops/qbank/audit-grade910-existing-long-answer-proposal-crosswalk-20261016.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
groups=json.loads((m.DOCS/m.MASTER).read_text())['sourceGroups']
last=json.loads((m.DOCS/m.FIVE).read_text())
def scenario():
    ids={x['questionId'] for x in m.packet_ids(groups)[0].values()} if False else None
    packets,_=m.packet_ids(groups)
    lastids=[r['originalQuestionId'] for r in last['rows']]
    only=sorted(packets)[0]
    live=set(packets)-{only}
    live.update(lastids)
    assert len(live)==165
    drafted=sorted([i for i in live if i!='X-CHEM-C23-L01'])
    assert len(drafted)==164
    riskids=set(drafted[:154])|{'X-CHEM-C23-L01'}
    n=0
    while len(riskids)<604:
        riskids.add('SYN-REST-'+str(n));n+=1
    filler={'SYN-LIVE-'+str(i) for i in range(2500)}
    filler=filler-live
    for q in sorted(filler):
        if len(live)>=2411:break
        live.add(q)
    # Include the 449 risk-only synthetic records in live, replacing non-risk filler.
    for id in riskids:
        if id not in live:
            live.discard(next(x for x in live if x.startswith('SYN-LIVE-')))
            live.add(id)
    assert len(live)==2411
    hashes={id:'a'*64 for id in live}
    rev={'schema':'ASSPS_IX_X_LIVE_CONTENT_REVISION_HASH_LEDGER_V1',
         'revisions':2411,'records':[{'questionId':id,'revisionSha256':v} for id,v in hashes.items()]}
    ordered=list(sorted(riskids))
    high_targets=set(drafted[:128])
    # All remaining HIGH flags come from the 450 other risk IDs.
    high_targets.update(x for x in ordered if x not in drafted[:154] and x!='X-CHEM-C23-L01')
    high_targets=set(sorted(high_targets)[:357]) if len(high_targets)>357 else high_targets
    if len(high_targets)<357:
        high_targets.update(x for x in ordered if x not in high_targets and x not in drafted[:154] and x!='X-CHEM-C23-L01')
    assert len(high_targets)>=357
    high_targets=set(drafted[:128])|set(sorted(x for x in riskids if x not in drafted[:154])[:229])
    assert len(high_targets)==357
    risk={'schema':'ASSPS_GRADE910_SUBJECTIVE_ANSWER_DEPTH_TRIAGE_V1',
          'currentLiveQuestionRevisionsChecked':2411,'subjectiveRiskReviewCandidates':604,
          'records':[{'questionId':id,'currentLiveContentRevisionSha256':'a'*64,
                      'priority':'HIGH' if id in high_targets else 'REVIEW',
                      'category':'SYNTHETIC_DEPTH_RISK'} for id in riskids]}
    return rev,risk,live
class HistoricalAnswerRecoveryTests(unittest.TestCase):
    def test_old20_packets_really_have_161_answer_drafts_and_signed_source_bytes(self):
        result,files=m.packet_ids(groups)
        self.assertEqual(len(result),161)
        self.assertEqual(len(files),20)
        self.assertEqual(len(set(result)),161)
        self.assertTrue(all(v['proposalExists'] for v in result.values()))
    def test_all166_immutable_originals_crosswalk_not_faculty_approval(self):
        rev,risk,live=scenario()
        out=m.build(groups,last,rev,risk,live)
        self.assertEqual(out['uniqueHistoricalResearchLongIds'],166)
        self.assertEqual(out['historicalLongIdsWithAnySupplementalExplanatoryDraft'],165)
        self.assertEqual(out['liveLongQuestionIdsWithPriorResearchDraft'],164)
        self.assertEqual(out['liveRiskIdsWithPriorResearchDraft'],154)
        self.assertEqual(out['liveRiskIdsWithoutPriorResearchDraft'],450)
        self.assertEqual(out['highPriorityRiskIdsWithPriorResearchDraft'],128)
        self.assertEqual(out['highPriorityRiskIdsWithoutPriorResearchDraft'],229)
        self.assertEqual(out['qualifiedAcademicApprovalsCreated'],0)
        self.assertFalse(out['schoolAdoptedEditionVerifiedByThisAudit'])
    def test_existing_packet_content_edit_denied_by_source_hash(self):
        with tempfile.TemporaryDirectory() as temp:
            path=Path(temp)
            for f in set(x['originalAuthoredSource'] for x in groups):
                (path/f).write_bytes((m.ORIG/f).read_bytes())
            (path/groups[0]['originalAuthoredSource']).write_bytes(b'changed original source')
            with self.assertRaisesRegex(ValueError,'ORIGINAL_RESEARCH_FILE_SHA_CHANGED'):
                m.packet_ids(groups,original=path)
    def test_missing_historical_packet_refused(self):
        incorrect=copy.deepcopy(groups);incorrect.pop()
        with self.assertRaisesRegex(ValueError,'EXISTING_AUTHOR_PACKETS_SCOPE_DRIFT'):
            m.packet_ids(incorrect)
    def test_supplement_with_fake_publication_refused(self):
        rev,risk,live=scenario()
        fake=copy.deepcopy(last);fake['rows'][0]['academicApprovalAuthenticated']=True
        with self.assertRaisesRegex(ValueError,'UNAUTHENTICATED_SUPPLEMENTAL_APPROVAL'):
            m.build(groups,fake,rev,risk,live)
    def test_live_revision_modified_refused(self):
        rev,risk,live=scenario()
        id=next(iter(risk['records']))['questionId']
        risk['records'][0]['currentLiveContentRevisionSha256']='b'*64
        with self.assertRaisesRegex(ValueError,'REVIEW_PRIORITY_QUESTION_REVISION_DRIFT'):
            m.build(groups,last,rev,risk,live)
    def test_missing_live_revision_refused(self):
        rev,risk,live=scenario();live.pop()
        with self.assertRaisesRegex(ValueError,'LIVE_REVISION_ID_SET_DRIFT'):
            m.build(groups,last,rev,risk,live)
    def test_root_private_receipt_and_no_answer_text(self):
        rev,risk,live=scenario()
        out=m.build(groups,last,rev,risk,live)
        for x in out['records']:
            self.assertNotIn('answer',x)
            self.assertNotIn('stem',x)
            self.assertFalse(x['qualifiedSubjectTeacherApproved'])
        with tempfile.TemporaryDirectory() as t:
            p=Path(t)/'private';p.mkdir(mode=0o700);p.chmod(0o700)
            receipt=p/'state.json'
            m.atomic_private(receipt,out)
            self.assertEqual(receipt.stat().st_mode & 0o777,0o600)
    def test_world_readable_directory_refused(self):
        with tempfile.TemporaryDirectory() as t:
            p=Path(t)/'visible';p.mkdir(mode=0o755);p.chmod(0o755)
            with self.assertRaisesRegex(ValueError,'PRIVATE_RESEARCH_RECEIPT_REQUIRED'):
                m.atomic_private(p/'state.json',{})
if __name__=='__main__':unittest.main()
