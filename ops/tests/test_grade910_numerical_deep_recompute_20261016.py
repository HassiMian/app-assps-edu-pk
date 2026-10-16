#!/usr/bin/env python3
"""Offline adversarial QA for academic-only 21-numerical recomputation."""
import copy
import importlib.util
import json
from pathlib import Path
import shutil
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[2]
TARGET=ROOT/'ops/qbank/recompute-grade910-21-original-numericals-20261016.py'
spec=importlib.util.spec_from_file_location('assps_21_numerical_deep',TARGET)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
QA=json.loads((m.DOCS/'ASSPS_GRADE910_ALL_NUMERICAL_QA_CERTIFICATE_CANDIDATE_20261008.json').read_text())['records']
OLD={r['questionId']:r for r in QA}
def fixture():
 ids=list(m.SPECS)
 queue=[{'questionId':qid,'evidenceGap':'LEGACY_MACHINE_QA_ONLY_LIVE_REVISION_NEEDS_DEEP_RECOMPUTATION',
         'currentRevisionSha256':'a'*64,'frozenRevisionSha256':'b'*64} for qid in ids]
 crosswalk={qid:{'actualLiveContentRevisionSha256':'a'*64} for qid in ids}
 return queue,crosswalk
class TestSourceBoundIndependentNumericals(unittest.TestCase):
 def test_21_originals_recomputed_from_immutable_source(self):
  queue,crosswalk=fixture()
  rows=m.verify_sources(queue,QA,crosswalk)
  self.assertEqual(len(rows),21)
  self.assertEqual(set(m.SPECS),{x['questionId'] for x in rows})
  self.assertTrue(all(x['independentArithmeticFromLockedSource'] for x in rows))
  self.assertTrue(all(not x['qualifiedFacultyApproved'] and not x['academicPublicationApproved'] for x in rows))
  self.assertTrue(all('questionText' not in x and 'answer' not in x for x in rows))
 def test_each_answer_independently_recomputed(self):
  for id,(kind,args) in m.SPECS.items():
   with self.subTest(id=id):
    filename=OLD[id]['sourceFile']
    qs=json.loads((m.STAGING/filename).read_text())['drafts']
    q=next(x for x in qs if x['id']==id)
    answer=next(iter(q['content'].values()))['answer']
    self.assertEqual(m.calculation(kind,args),m.answer_value(kind,answer))
 def test_each_corrupted_answer_rejected(self):
  for id,(kind,args) in m.SPECS.items():
   with self.subTest(id=id):
    try:wrong=m.answer_value(kind,'invalid source answer 99999')
    except ValueError:continue
    self.assertNotEqual(m.calculation(kind,args),wrong)
 def test_queue_item_missing_fails(self):
  q,c=fixture()
  with self.assertRaisesRegex(ValueError,'21_ITEM_PRIORITY_QUEUE_DRIFT'):
   m.verify_sources(q[:-1],QA,c)
 def test_duplicate_queue_fails(self):
  q,c=fixture();q[1]['questionId']=q[0]['questionId']
  with self.assertRaisesRegex(ValueError,'21_ITEM_PRIORITY_QUEUE_DRIFT'):
   m.verify_sources(q,QA,c)
 def test_original_legacy_qa_failure_fails(self):
  q,c=fixture();bad=copy.deepcopy(QA)
  z=next(x for x in bad if x['questionId']==q[0]['questionId'])
  z['storedAnswerPass']=False
  with self.assertRaisesRegex(ValueError,'OLD_NUMERIC_QA_FAILED'):
   m.verify_sources(q,bad,c)
 def test_incorrect_full_content_revision_fails(self):
  q,c=fixture();c[q[0]['questionId']]['actualLiveContentRevisionSha256']='z'*64
  with self.assertRaisesRegex(ValueError,'FROZEN_QUEUE_FACULTY_REVISION_DRIFT'):
   m.verify_sources(q,QA,c)
 def test_invalid_category_fails(self):
  q,c=fixture();q[0]['evidenceGap']='ACADEMICALLY_APPROVED'
  with self.assertRaisesRegex(ValueError,'PRIORITY_CATEGORY_CHANGED'):
   m.verify_sources(q,QA,c)
 def test_frozen_original_blob_change_fails(self):
  q,c=fixture()
  with tempfile.TemporaryDirectory() as temp:
   d=Path(temp)
   for f in m.FILES:shutil.copyfile(m.STAGING/f,d/f)
   target=d/'physics10Starter2026.json'
   target.write_bytes(target.read_bytes()+b'\n ')
   with self.assertRaisesRegex(ValueError,'FROZEN_SOURCE_FILE_CHANGED'):
    m.verify_sources(q,QA,c,stage=d)
 def test_numeric_signed_fraction_and_scientific_parsers(self):
  self.assertEqual(m.answer_value('die','Probability=3/6=1/2.'),m.Fraction(1,2))
  self.assertEqual(m.answer_value('molecules','N = 0.5 x 6.02 x 10^23 = 3.01 x 10^23 molecules'),m.Decimal('3.01e23'))
  self.assertEqual(m.answer_value('simul','x=6 اور y=4۔'),(m.Decimal(6),m.Decimal(4)))
 def test_private_receipt_refuses_exposed_directory(self):
  with tempfile.TemporaryDirectory() as p:
   d=Path(p)/'permissive';d.mkdir(mode=0o755);d.chmod(0o755)
   with self.assertRaisesRegex(ValueError,'RECEIPT_DIRECTORY_NOT_PRIVATE'):
    m.private_atomic_write(d/'r.json',{'fake':'test'})
if __name__=='__main__':unittest.main()
