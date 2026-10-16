"""Adversarial academic model-answer depth triage with revision-bound metadata."""
import importlib.util
from pathlib import Path
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[2]
P=ROOT/'ops/qbank/audit-grade910-subjective-answer-depth-20261016.py'
S=importlib.util.spec_from_file_location('subjective',P)
m=importlib.util.module_from_spec(S);S.loader.exec_module(m)
DISTRIBUTION={'mcq':809,'short':854,'long':545,'numerical':80,'grammar':71,
              'essay':25,'comprehension':21,'application':4,'letter':2}
def fixture():
    rows=[]
    for kind,amount in DISTRIBUTION.items():
        for j in range(amount):
            text='Model research explanation '+('safe concept '*20)
            if kind=='long':text='science '* (20 if j<332 else 33 if j<523 else 45)
            if kind=='essay':text='essay '*23
            if kind=='application':text='formal '*17
            if kind=='letter':text='letter '*20
            if kind=='comprehension':text='answer '* (10 if j<9 else 16)
            if kind=='short':text='short '* (6 if j<41 else 20)
            if kind=='grammar':text='grammar'*3
            marks={'long':5,'essay':5,'application':5,'letter':5,
                   'comprehension':3,'short':2}.get(kind,1)
            rows.append({'id':kind+str(j),'type':kind,'answer':text.strip(),
                         'marks':marks,'grade':'9th','subject':'Science',
                         'medium':'english'})
    pinned={'schema':'ASSPS_IX_X_LIVE_CONTENT_REVISION_HASH_LEDGER_V1',
            'revisions':2411,'records':[{'questionId':r['id'],'revisionSha256':r['id']} for r in rows]}
    return rows,pinned
class SubjectiveAnswerRiskSafety(unittest.TestCase):
    def test_exact_synthetic_1522_subjective_604_triage(self):
        rows,pinned=fixture()
        r=m.assess(rows,pinned,lambda x:x['id'])
        self.assertEqual(r['subjectiveItemsChecked'],1522)
        self.assertEqual(r['longAtMost25Words'],332)
        self.assertEqual(r['longAtMost40Words'],523)
        self.assertEqual(r['essayAtMost25Words'],25)
        self.assertEqual(r['highPriorityReviewCandidates'],357)
        self.assertEqual(r['subjectiveRiskReviewCandidates'],604)
        self.assertFalse(r['sourcePdfOrEditionAuthenticatedByThisAudit'])
        self.assertEqual(r['qualifiedAcademicApprovalsCreated'],0)
    def test_grammar_short_valid_and_unflagged(self):
        self.assertIsNone(m.classify({'type':'grammar','marks':1,'answer':'Yes.'}))
    def test_5mark_long_25_words_flags_but_not_26(self):
        item={'type':'long','marks':5,'answer':'a '*25}
        self.assertEqual(m.classify(item),'LONG_4PLUS_MARK_AT_MOST_25_WORDS')
        item['answer']='a '*26
        self.assertEqual(m.classify(item),'LONG_4PLUS_MARK_AT_MOST_40_WORDS')
    def test_non_marked_short_words_not_false_failure(self):
        self.assertIsNone(m.classify({'type':'short','marks':2,'answer':'a '*7}))
    def test_preserve_urdu_unicode_whitespace(self):
        self.assertEqual(len(m.words('میری  کتاب\\n اچھی ہے')),4)
    def test_changed_hash_refused(self):
        rows,pinned=fixture();rows[0]['answer']='altered'
        with self.assertRaisesRegex(ValueError,'SUBJECTIVE_LIVE_REVISION_HASH_DRIFT'):
            m.assess(rows,pinned,lambda x:x['id'] if x['answer']!='altered' else 'tampered')
    def test_null_duplicate_id_refused(self):
        rows,pinned=fixture();rows[0]['id']=None
        with self.assertRaisesRegex(ValueError,'SUBJECTIVE_MISSING_OR_DUPLICATE_ID'):
            m.assess(rows,pinned,lambda x:x['id'])
    def test_missing_question_refused(self):
        rows,pinned=fixture()
        with self.assertRaisesRegex(ValueError,'SUBJECTIVE_CORPUS_REVISION_SCOPE_DRIFT'):
            m.assess(rows[:-1],pinned,lambda x:x['id'])
    def test_raw_answers_absent_from_risk_records(self):
        rows,pinned=fixture();r=m.assess(rows,pinned,lambda x:x['id'])
        self.assertTrue(r['riskFlagsAreEditorialAdvisoryNotIncorrectAnswerProof'])
        for item in r['records']:
            self.assertNotIn('answer',item)
            self.assertNotIn('stem',item)
            self.assertFalse(item['qualifiedSubjectApproval'])
    def test_root_private_receipt(self):
        rows,pinned=fixture();r=m.assess(rows,pinned,lambda x:x['id'])
        with tempfile.TemporaryDirectory() as t:
            path=Path(t)/'private';path.mkdir(mode=0o700);path.chmod(0o700)
            f=path/'evidence.json';m.save_private(f,r)
            self.assertEqual(f.stat().st_mode&0o777,0o600)
    def test_world_readable_dir_refused(self):
        with tempfile.TemporaryDirectory() as t:
            path=Path(t)/'open';path.mkdir(mode=0o755);path.chmod(0o755)
            with self.assertRaisesRegex(ValueError,'SUBJECTIVE_RECEIPT_DIRECTORY_NOT_PRIVATE'):
                m.save_private(path/'r.json',{})
if __name__=='__main__':unittest.main()
