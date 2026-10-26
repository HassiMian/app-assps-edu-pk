from importlib.util import module_from_spec,spec_from_file_location
from pathlib import Path
import unittest
file=Path(__file__).resolve().parents[1]/'assps_pg_role_grantor_compat.py'
s=spec_from_file_location('rolecompat',file);m=module_from_spec(s);s.loader.exec_module(m)
class Cases(unittest.TestCase):
 def setUp(self):
  self.sample=b'CREATE ROLE sample;\nALTER ROLE sample WITH LOGIN;\nGRANT sample TO other WITH INHERIT FALSE GRANTED BY postgres;\n'
 def run_good(self):return m.transform(self.sample,m.sha(self.sample),1,1)
 def test_semantics(self):
  out,meta=self.run_good();self.assertIn(b'GRANT sample TO other WITH INHERIT FALSE;\n',out)
  self.assertNotIn(b'GRANTED BY',out);self.assertFalse(meta['grantor_semantics_preserved'])
 def test_hash_drift(self):
  with self.assertRaises(ValueError):m.transform(self.sample,'0'*64,1,1)
 def test_count_drift(self):
  with self.assertRaises(ValueError):m.transform(self.sample,m.sha(self.sample),1,2)
 def test_unsupported_grant(self):
  bad=self.sample.replace(b'WITH INHERIT FALSE',b'WITH UNKNOWN TRUE')
  with self.assertRaises(ValueError):m.transform(bad,m.sha(bad),1,1)
 def test_password_literal_denied(self):
  bad=self.sample+b"ALTER ROLE sample PASSWORD 'secret';\n"
  with self.assertRaises(ValueError):m.transform(bad,m.sha(bad),1,1)
 def test_no_modification_unrelated_lines(self):
  out,_=self.run_good();self.assertIn(b'ALTER ROLE sample WITH LOGIN;\n',out)
 def test_quoted_grantor(self):
  bad=self.sample.replace(b'GRANTED BY postgres',b'GRANTED BY "sys role"')
  out,_=m.transform(bad,m.sha(bad),1,1);self.assertNotIn(b'GRANTED BY',out)
if __name__=='__main__':unittest.main()
