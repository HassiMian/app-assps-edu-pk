import copy
import importlib.util
import unittest
from pathlib import Path
PATH=Path(__file__).resolve().parents[1]/'qbank/grade910_live_revision_history_20261016.py'
spec=importlib.util.spec_from_file_location('revhistory',PATH)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def receipt():
    return {'schema':'ASSPS_IX_X_LIVE_CONTENT_REVISION_HASH_LEDGER_V1',
            'revisions':2411,'academicallyApprovedRevisions':0,
            'records':[{'questionId':f'Q-{i:04d}','revisionSha256':m.digest(['test',i])} for i in range(2411)]}
class HistoryTests(unittest.TestCase):
 def setUp(self):
    self.old=receipt()
 def test_first_pass_anchors_existing_2411_shas_without_fake_review(self):
    j=m.build(self.old,self.old,observed='2026-10-16T12:00:00Z')
    self.assertEqual(j['contentChangesObserved'],0)
    self.assertEqual(len(j['initialBaselineIdRevisionSha256']),2411)
    self.assertEqual(j['academicReviewApprovalsFromJournal'],0)
 def test_unchanged_second_run_creates_no_fake_history(self):
    j=m.build(self.old,self.old,observed='2026-10-16T12:00:00Z')
    k=m.build(self.old,self.old,j,observed='2026-10-16T12:01:00Z')
    self.assertEqual(k['events'],[])
 def test_change_and_successive_change_both_preserved(self):
    j=m.build(self.old,self.old,observed='2026-10-16T12:00:00Z')
    newer=copy.deepcopy(self.old);newer['records'][0]['revisionSha256']='a'*64
    k=m.build(self.old,newer,j,observed='2026-10-16T12:01:00Z')
    self.assertEqual(len(k['events']),1)
    another=copy.deepcopy(newer);another['records'][0]['revisionSha256']='b'*64
    z=m.build(newer,another,k,observed='2026-10-16T12:02:00Z')
    self.assertEqual(len(z['events']),2)
    self.assertEqual(z['events'][1]['fromSha256'],'a'*64)
 def test_crash_replay_old_receipt_current_matches_journal_is_safe(self):
    j=m.build(self.old,self.old)
    newer=copy.deepcopy(self.old);newer['records'][0]['revisionSha256']='a'*64
    k=m.build(self.old,newer,j)
    z=m.build(self.old,newer,k)
    self.assertEqual(len(z['events']),1)
 def test_revert_to_original_still_creates_new_review_event(self):
    j=m.build(self.old,self.old)
    newer=copy.deepcopy(self.old);newer['records'][0]['revisionSha256']='a'*64
    k=m.build(self.old,newer,j)
    z=m.build(newer,self.old,k)
    self.assertEqual(len(z['events']),2)
    self.assertTrue(z['everyChangedQuestionNeedsNewIndependentReview'])
 def test_existing_approval_flag_cannot_appear(self):
    r=receipt();r['academicallyApprovedRevisions']=1
    with self.assertRaises(ValueError):m.build(self.old,r)
 def test_missing_questions_and_changed_id_fail_closed(self):
    r=receipt();r['records'][-1]['questionId']='UNKNOWN'
    j=m.build(self.old,self.old)
    with self.assertRaises(ValueError):m.build(self.old,r,j)
 def test_broken_event_or_baseline_chain_does_not_pass(self):
    j=m.build(self.old,self.old)
    newer=copy.deepcopy(self.old);newer['records'][0]['revisionSha256']='a'*64
    k=m.build(self.old,newer,j)
    bad=copy.deepcopy(k);bad['events'][0]['toSha256']='f'*64
    with self.assertRaises(ValueError):m.build(newer,newer,bad)
    bad=copy.deepcopy(k);bad['initialBaselineIdRevisionSha256']['Q-0000']='c'*64
    with self.assertRaises(ValueError):m.build(newer,newer,bad)
 def test_prior_snapshot_must_be_recovery_safe(self):
    j=m.build(self.old,self.old)
    a=copy.deepcopy(self.old);a['records'][0]['revisionSha256']='a'*64
    k=m.build(self.old,a,j)
    stale=copy.deepcopy(self.old);stale['records'][1]['revisionSha256']='b'*64
    with self.assertRaises(ValueError):m.build(stale,a,k)
 def test_does_not_embed_question_content_anywhere(self):
    j=m.build(self.old,self.old)
    self.assertTrue(j['questionTextsPersisted'] is False)
    self.assertEqual(j['publishedQuestionsFromJournal'],0)
if __name__=='__main__':unittest.main()
