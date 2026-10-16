import hashlib, importlib.util, json, pathlib, tempfile, unittest
P=pathlib.Path(__file__).resolve().parents[1]/'qbank/audit-live-grade910-source-claims-20261016.py'
s=importlib.util.spec_from_file_location('sourceclaims',P)
m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
def entry(h='a'*64,grade=9,ref=None):
 return dict(recordId='pectaa-catalog-009',pdfSha256=h,grade=grade,pdfPageCount=180,sourceCacheRef=ref)
def row(loc='page 5',sha='a'*64,grade='9th'):
 return dict(id='IX-BIO-TEST-01',grade=grade,subject='Biology',medium='English',
             source='PECTAA pectaa-catalog-009 | '+sha+' | '+loc,approved=False)
class Checks(unittest.TestCase):
 def test_page_range_is_only_an_unverified_author_claim(self):
  x=m.evaluate(row(),{'pectaa-catalog-009':entry()},pathlib.Path('/tmp/absent'),{})
  self.assertEqual(x['state'],'UNVERIFIED_AUTHOR_PAGE_RANGE_PLAUSIBLE')
  self.assertFalse(x['questionPageVerified']);self.assertFalse(x['published'])
 def test_toc_cannot_become_textbook_question_page(self):
  x=m.evaluate(row('toc-page 2'),{'pectaa-catalog-009':entry()},pathlib.Path('/tmp/absent'),{})
  self.assertEqual(x['state'],'TOC_NOT_QUESTION_PAGE')
 def test_out_of_range_claim_fails(self):
  x=m.evaluate(row('page 900'),{'pectaa-catalog-009':entry()},pathlib.Path('/tmp/absent'),{})
  self.assertEqual(x['state'],'PAGE_RANGE_OUTSIDE_PDF')
 def test_null_hash_in_catalog_does_not_count_as_match(self):
  e=entry(h=None)
  x=m.evaluate(row(),{'pectaa-catalog-009':e},pathlib.Path('/tmp/absent'),{})
  self.assertEqual(x['state'],'MANIFEST_CONFLICT')
 def test_hash_conflict_denies_source(self):
  x=m.evaluate(row(sha='b'*64),{'pectaa-catalog-009':entry()},pathlib.Path('/tmp/absent'),{})
  self.assertEqual(x['state'],'MANIFEST_CONFLICT')
 def test_grade_mismatch_is_not_auto_approved(self):
  x=m.evaluate(row(grade='10th'),{'pectaa-catalog-009':entry()},pathlib.Path('/tmp/absent'),{})
  self.assertEqual(x['state'],'GRADE_MISMATCH')
 def test_shared_catalog_is_allowed_but_not_approved(self):
  x=m.evaluate(row(),{'pectaa-catalog-009':entry(grade=0)},pathlib.Path('/tmp/absent'),{})
  self.assertEqual(x['state'],'UNVERIFIED_AUTHOR_PAGE_RANGE_PLAUSIBLE')
  self.assertFalse(x['published'])
 def test_byte_sha_match_and_corruption_detection(self):
  with tempfile.TemporaryDirectory() as t:
   root=pathlib.Path(t);p=root/'asset.pdf'
   b=b'%PDF-1.4\nVALID_MOCK';p.write_bytes(b)
   e=entry(hashlib.sha256(b).hexdigest(),ref='asset.pdf')
   self.assertEqual(m.cached(e,root,{}),'match')
   e2=entry('f'*64,ref='asset.pdf')
   self.assertEqual(m.cached(e2,root,{}),'mismatch')
 def test_cache_traversal_denied(self):
  with tempfile.TemporaryDirectory() as t:
   with self.assertRaises(ValueError):
    m.cached(entry(ref='../private.pdf'),pathlib.Path(t),{})
 def test_no_signed_status_emerges_from_machine_audit(self):
  d=m.analyze([row()],{'pectaa-catalog-009':entry()},pathlib.Path('/tmp/absent'))
  self.assertEqual(d['summary']['newAcademicApprovals'],0)
  self.assertEqual(d['facultySignaturesCreated'],0)
  self.assertFalse(d['recordIdsAndClaimsOnly'][0]['schoolAdoptionVerified'])
 def test_integrity_hold_on_source_hash_or_page_range_conflict(self):
  summary={'evidenceClasses':{'MANIFEST_CONFLICT':1},'cachedPdfHashesConflicting':0,
           'manifestHashMatches':9,'rows':10}
  self.assertEqual(m.audit_decision(summary),'SOURCE_INTEGRITY_HOLD')
 def test_good_pdf_bytes_do_not_approve_question_pages(self):
  summary={'evidenceClasses':{'UNVERIFIED_AUTHOR_PAGE_RANGE_PLAUSIBLE':10},
           'cachedPdfHashesConflicting':0,'manifestHashMatches':10,'rows':10}
  self.assertEqual(m.audit_decision(summary),'CLAIMS_CLASSIFIED_NO_PUBLICATION')
 def test_private_receipt_has_0600_permissions(self):
  with tempfile.TemporaryDirectory() as t:
   out=pathlib.Path(t)/'private'/'receipt.json'
   m.save(out,{'some':'evidence'})
   self.assertEqual(out.stat().st_mode & 0o777,0o600)
if __name__=='__main__':unittest.main()
