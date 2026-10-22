#!/usr/bin/env python3
"""Read-only, no personal fields. School1/Exam9 Owner and grading release gate."""
import json
import subprocess

SQL="""
SELECT 'owner_roles|'||COUNT(*) FROM public.users WHERE school_id=1 AND is_active=true AND role='owner';
SELECT 'principal_roles|'||COUNT(*) FROM public.users WHERE school_id=1 AND is_active=true AND role='principal';
SELECT 'verified_owner_contacts|'||
 CASE WHEN coalesce(btrim(s.owner_name),'')<>'' AND
      (coalesce(btrim(s.email),'')<>'' OR coalesce(btrim(s.phone),'')<>'')
 THEN 1 ELSE 0 END FROM public.schools s WHERE id=1;
SELECT 'firstterm_pending|'||COUNT(*) FROM public.exam_subjects
 WHERE school_id=1 AND exam_id=9 AND approval_status='pending';
SELECT 'firstterm_approved|'||COUNT(*) FROM public.exam_subjects
 WHERE school_id=1 AND exam_id=9 AND approval_status='approved'
 AND approved_by_user_id IS NOT NULL AND approved_at IS NOT NULL
 AND total_marks BETWEEN 1 AND 1000;
SELECT 'firstterm_missing_maxima|'||COUNT(*) FROM public.exam_subjects
 WHERE school_id=1 AND exam_id=9 AND total_marks IS NULL;
SELECT 'grade_bands|'||COUNT(*) FROM public.grade_settings WHERE school_id=1;
SELECT 'perfect_score_d|'||COUNT(*) FROM public.exam_results
 WHERE school_id=1 AND exam_id=9 AND marks_obtained=total_marks AND grade='D';
SELECT 'marks_revision_ledger|'||CASE WHEN to_regclass('public.exam_marks_revision_history') IS NULL THEN 0 ELSE 1 END;
SELECT 'grade_revision_ledger|'||CASE WHEN to_regclass('public.exam_grade_revision_history') IS NULL THEN 0 ELSE 1 END;
"""
def parse(output):
 d={}
 for line in output.splitlines():
  if '|' not in line:continue
  name,value=line.split('|',1)
  if name not in {
   'owner_roles','principal_roles','verified_owner_contacts','firstterm_pending',
   'firstterm_approved','firstterm_missing_maxima','grade_bands','perfect_score_d',
   'marks_revision_ledger','grade_revision_ledger'}:continue
  if name in d:raise ValueError('DUPLICATE_AUTHENTICITY_AGGREGATE')
  d[name]=int(value)
 return d

def inspect(*,run=None):
 runner=run or subprocess.run
 p=runner(['runuser','-u','postgres','--','psql','-X','-At','-p','5432','-d','apexos',
           '-v','ON_ERROR_STOP=1','-c',SQL],
          capture_output=True,text=True,timeout=18)
 if p.returncode:return {'pass':False,'error_type':'AUTHENTICITY_QUERY_FAILED'}
 stats=parse(p.stdout)
 if len(stats)!=10:return {'pass':False,'error_type':'AUTHENTICITY_QUERY_INCOMPLETE'}
 checks={
  'real_owner_account_bound':stats['owner_roles']==1,
  'owner_registry_populated':stats['verified_owner_contacts']==1,
  'official_firstterm_approvals_complete':stats['firstterm_pending']==0 and
     stats['firstterm_approved']>=81 and stats['firstterm_missing_maxima']==0,
  'grade_policy_present':stats['grade_bands']>0,
  'perfect_score_d_resolved':stats['perfect_score_d']==0,
  'marks_audit_ledger_present':stats['marks_revision_ledger']==1,
  'grade_audit_ledger_present':stats['grade_revision_ledger']==1,
 }
 return {'pass':all(checks.values()),'read_only':True,'school_id':1,'exam_id':9,
         'checks':checks,'aggregates':stats}
if __name__=='__main__':
 report=inspect()
 print(json.dumps(report,sort_keys=True))
 raise SystemExit(0 if report['pass'] else 3)
