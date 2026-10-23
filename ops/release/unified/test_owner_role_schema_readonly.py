import unittest,sys
from pathlib import Path
from subprocess import CompletedProcess
sys.path.insert(0,str(Path(__file__).resolve().parent))
from verify_owner_role_schema_readonly import inspect
def runner(value):
 return lambda *args,**kw: CompletedProcess(args[0],0,
  'definition,validated\n'+chr(34)+'CHECK (role IN ('+chr(39)+'admin'+chr(39)+((','+chr(39)+'owner'+chr(39)) if value else '')+'))'+chr(34)+',t\n','')
class RoleSchemaTests(unittest.TestCase):
 def test_owner_missing_remains_release_hold(self):
  self.assertFalse(inspect(runner=runner(False))['pass'])
 def test_validated_owner_constraint_passes(self):
  self.assertTrue(inspect(runner=runner(True))['pass'])
