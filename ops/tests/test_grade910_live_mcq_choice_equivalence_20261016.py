"""Hermetic, read-only-choice-equivalence QA; never teacher subject signoff."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[2]
def load(n,path):
 spec=importlib.util.spec_from_file_location(n,path)
 x=importlib.util.module_from_spec(spec);spec.loader.exec_module(x)
 return x
m=load('assps_mcq_eq',ROOT/'ops/qbank/audit-grade910-live-mcq-choice-equivalence-20261016.py')
rev=load('assps_rev_source',ROOT/'ops/qbank/audit-grade910-live-question-revisions-20261016.py')
def fixture():
 rows=[]
 for i in range(2411):
  opts=[{'id':v,'text':t} for v,t in zip('ABCD',('red','blue','green','purple'))]
  rows.append({'id':'Q'+str(i),'grade':'9th','subject':'Science','medium':'english',
   'type':'mcq' if i<809 else 'short','chapter':1,'topic':'Test',
   'questionText':'Synthetic question '+str(i),
   'englishText':'Synthetic question '+str(i),'urduText':None,
   'options':opts if i<809 else [],'correctOption':'A' if i<809 else None,
   'answer':'red','marks':1,'difficulty':'easy'})
 ledger={r['id']:rev.revision_sha(r) for r in rows}
 return rows,{'schema':m.REV,'revisions':2411,
  'records':[{'questionId':k,'revisionSha256':v} for k,v in ledger.items()]}
def lock(rows,pinned,id):
 pinned['records'][int(id[1:])]['revisionSha256']=rev.revision_sha(rows[int(id[1:])])
class MCQEquivalenceSafety(unittest.TestCase):
 def test_809_complete_four_options_no_false_academic_approval(self):
  rows,prior=fixture()
  a=m.analyze(rows,prior)
  self.assertEqual(a['candidateQuestionsSeen'],2411)
  self.assertEqual(a['mcqsChecked'],809)
  self.assertEqual(a['optionTextsChecked'],3236)
  self.assertEqual(a['mechanicalChoiceConflicts'],0)
  self.assertFalse(a['publicationApprovedByThisAudit'])
 def test_punctuation_equivalent_options_detected(self):
  rows,prior=fixture()
  rows[0]['options'][0]['text']='Vitamin.'
  rows[0]['options'][1]['text']='vitamin'
  lock(rows,prior,'Q0')
  a=m.analyze(rows,prior)
  self.assertEqual(a['normalizedDuplicateOptionGroups'],1)
  self.assertTrue(all('text' not in x for x in a['issues']))
 def test_half_decimal_equivalent_choices_detected(self):
  rows,prior=fixture()
  rows[0]['options'][0]['text']='1/2'
  rows[0]['options'][1]['text']='0.50'
  lock(rows,prior,'Q0')
  a=m.analyze(rows,prior)
  self.assertEqual(a['pureNumericEquivalentOptionGroups'],1)
 def test_percent_equivalent_to_decimal(self):
  self.assertEqual(m.pure_number('25%'),m.pure_number('0.25'))
 def test_zero_vs_zero_decimal_duplicate_not_blank(self):
  self.assertEqual(m.pure_number('0'),m.pure_number('0.00'))
  self.assertIsNone(m.pure_number(''))
 def test_chemical_charge_not_normalized_to_integer(self):
  self.assertIsNone(m.pure_number('Fe2+'))
  self.assertIsNone(m.pure_number('Fe3+'))
  self.assertNotEqual(m.normalize('Fe2+'),m.normalize('Fe3+'))
 def test_changed_current_question_content_invalidates_receipt(self):
  rows,prior=fixture();rows[0]['options'][0]['text']='change'
  with self.assertRaisesRegex(ValueError,'LIVE_MCQ_CURRENT_CONTENT_SHA_DRIFT'):
   m.analyze(rows,prior)
 def test_missing_question_invalidates_fixed_scope(self):
  rows,prior=fixture()
  with self.assertRaisesRegex(ValueError,'LIVE_MCQ_SOURCE_OR_REVISION_LEDGER_DRIFT'):
   m.analyze(rows[:-1],prior)
 def test_duplicate_option_ids_refused(self):
  rows,prior=fixture()
  rows[0]['options'][1]['id']='A'
  lock(rows,prior,'Q0')
  with self.assertRaisesRegex(ValueError,'INVALID_OPTION_IDS'):
   m.analyze(rows,prior)
 def test_private_receipt_has_no_raw_question_text(self):
  rows,prior=fixture();a=m.analyze(rows,prior)
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'secret';p.mkdir(mode=0o700);p.chmod(0o700)
   out=p/'receipt.json';m.save_private(out,a)
   saved=json.loads(out.read_text())
   self.assertFalse(saved['rawStemsAnswersOrOptionsPersisted'])
   self.assertEqual(out.stat().st_mode & 0o777,0o600)
 def test_world_readable_receipt_directory_refused(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'unsafe';p.mkdir(mode=0o755);p.chmod(0o755)
   with self.assertRaisesRegex(ValueError,'MCQ_RECEIPT_DIR_MUST_BE_PRIVATE'):
    m.save_private(p/'receipt.json',{'x':1})
if __name__=='__main__':unittest.main()
