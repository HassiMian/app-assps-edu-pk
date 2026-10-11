#!/usr/bin/env python3
"""Mirror only audited apex_app_runtime effective privileges onto the isolated restored DB.
DOES NOT change production, grant Paper restricted tables, or touch school data.
"""
import subprocess,sys
PROD=('5432','apexos'); TEST=('55432','assps_backup_restore_check_20261011')
TABLE="""SELECT c.relname,has_table_privilege('apex_app_runtime',c.oid,'SELECT')::int,
has_table_privilege('apex_app_runtime',c.oid,'INSERT')::int,
has_table_privilege('apex_app_runtime',c.oid,'UPDATE')::int,
has_table_privilege('apex_app_runtime',c.oid,'DELETE')::int
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r' AND c.relforcerowsecurity ORDER BY c.relname"""
SEQ="""SELECT c.relname,has_sequence_privilege('apex_app_runtime',c.oid,'USAGE')::int,
has_sequence_privilege('apex_app_runtime',c.oid,'SELECT')::int,
has_sequence_privilege('apex_app_runtime',c.oid,'UPDATE')::int
FROM pg_class c WHERE c.relkind='S' AND c.relnamespace='public'::regnamespace ORDER BY c.relname"""
def run(dest,sql):
 p=subprocess.run(['runuser','-u','postgres','--','psql','-X','-A','-t','-F','|','-v','ON_ERROR_STOP=1','-p',dest[0],'-d',dest[1]],input=sql,text=True,capture_output=True,timeout=20)
 if p.returncode:raise RuntimeError('SQL failure on '+dest[1]+': '+p.stderr[-180:])
 return p.stdout.strip().splitlines()
def rows(dest,statement):
 return [x.split('|') for x in run(dest,statement+';')]
def main():
 if rows(TEST,"SELECT current_database(),current_setting('port'),current_user")[0]!=['assps_backup_restore_check_20261011','55432','postgres']:
  raise RuntimeError('Refusing unexpected clone identity')
 original_t,original_s=rows(PROD,TABLE),rows(PROD,SEQ)
 if len(original_t)!=77 or len(original_s)!=77:raise RuntimeError('Live source table/sequence drift')
 if sum(r[1:]==['1']*4 for r in original_t)!=75 or {r[0] for r in original_t if r[1:]==['0']*4}!={'paper_documents','paper_revisions'}:raise RuntimeError('Paper privilege exceptions drifted')
 if sum(r[1:]==['1']*3 for r in original_s)!=73 or sum(r[1:]==['0']*3 for r in original_s)!=4:raise RuntimeError('Sequence exceptions drifted')
 checked=lambda x:'"'+x.replace('"','""')+'"'
 statements=['BEGIN;','DO $$ BEGIN IF current_database() <> \'assps_backup_restore_check_20261011\' OR current_setting(\'port\')<>\'55432\' THEN RAISE EXCEPTION \'test-only\'; END IF; END $$;']
 for name,*bits in original_t:
  if bits==['1']*4:statements.append('GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.'+checked(name)+' TO apex_app_runtime;')
 for name,*bits in original_s:
  if bits==['1']*3:statements.append('GRANT USAGE,SELECT,UPDATE ON SEQUENCE public.'+checked(name)+' TO apex_app_runtime;')
 statements.append('COMMIT;')
 run(TEST,'\n'.join(statements))
 if rows(TEST,TABLE)!=original_t or rows(TEST,SEQ)!=original_s:raise RuntimeError('Isolated role privilege parity incomplete')
 print('ISOLATED_RESTORED_BACKUP_EXACT_GRANT_PARITY_PASS 77/77_TABLES 77/77_SEQUENCES 2_PAPER_EXCEPTIONS_PRESERVED')
if __name__=='__main__':
 try:main()
 except Exception as e:print('ISOLATED_GRANT_PARITY_NO_GO '+str(e),file=sys.stderr);sys.exit(2)
