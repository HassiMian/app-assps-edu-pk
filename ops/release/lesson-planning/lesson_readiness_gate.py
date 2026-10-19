#!/usr/bin/env python3
"""ASSPS Lesson Planning release preflight: read-only, privacy-safe.

No teacher accounts, student records, tokens or actual lesson text are emitted.
No DML, migrations, permission changes or publishing. Intended for SaaS Core
owner's release QA, not Paper Studio source development.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import pathlib
import subprocess
import urllib.error
import urllib.request

SOURCE=pathlib.Path('/root/secure-archive/composer-review-20261014/manifest_plus_classone_private.json')
SOURCE_SHA='4d2ccdce5ec644750a530c890df5a0a41eaee5b76f1e4ba47d912617db5c0cda'
QUERY="""BEGIN READ ONLY;
SELECT json_build_object(
 'saved', (SELECT count(*) FROM public.lesson_plans WHERE school_id=1),
 'shared', (SELECT count(*) FROM public.lesson_plans WHERE school_id=1 AND sent_to_portal=true),
 'teacher_owned', (SELECT count(*) FROM public.lesson_plans lp JOIN public.users u ON u.id=lp.created_by AND u.school_id=lp.school_id WHERE lp.school_id=1 AND u.role='teacher'),
 'active_teachers', (SELECT count(*) FROM public.users WHERE school_id=1 AND role='teacher' AND is_active=true),
 'paper_access_teachers', (SELECT count(*) FROM public.users WHERE school_id=1 AND role='teacher' AND is_active=true AND permissions::text LIKE '%paper_generator%'),
 'scheduled_distinct_teachers', (SELECT count(DISTINCT teacher_id) FROM public.timetable WHERE school_id=1 AND day_name='Monday' AND period_label LIKE 'Period %'),
 'scheduled_teachers_without_paper', (SELECT count(DISTINCT t.teacher_id) FROM public.timetable t LEFT JOIN public.users u ON u.school_id=t.school_id AND u.id=t.teacher_id WHERE t.school_id=1 AND t.day_name='Monday' AND t.period_label LIKE 'Period %' AND (u.id IS NULL OR COALESCE(u.permissions::text,'') NOT LIKE '%paper_generator%')),
 'active_teacher_class_assignments', (SELECT count(*) FROM public.teacher_class_assignments WHERE school_id=1 AND is_active=true),
 'linked_teacher_accounts', (SELECT count(DISTINCT teacher_user_id) FROM public.teacher_class_assignments WHERE school_id=1 AND is_active=true),
 'teaching_slots', (SELECT count(*) FROM public.timetable WHERE school_id=1 AND period_label LIKE 'Period %'),
 'mapped_teacher_slots', (SELECT count(*) FROM public.timetable WHERE school_id=1 AND period_label LIKE 'Period %' AND teacher_id IS NOT NULL),
 'reviewed_teacher_slots', (SELECT count(*) FROM public.timetable WHERE school_id=1 AND period_label LIKE 'Period %' AND staff_identity_reviewed=true),
 'reference_only_evidence', (SELECT count(*) FROM public.employee_teaching_subject_evidence WHERE school_id=1 AND authorization_status='schedule_reference_only')
)::text;
COMMIT;"""
def source_stats(raw:bytes):
 if hashlib.sha256(raw).hexdigest()!=SOURCE_SHA:
  raise ValueError('PRIVATE_SOURCE_SHA_MISMATCH')
 doc=json.loads(raw)
 if doc.get('schema')!='assps.lesson_plan.review_import.v1':
  raise ValueError('PRIVATE_SOURCE_SCHEMA_MISMATCH')
 candidates=doc.get('candidates',[])
 if len(candidates)!=59 or len(doc.get('class_one_image_review',{}).get('weeks',[]))!=18:
  raise ValueError('PRIVATE_SOURCE_COUNT_MISMATCH')
 return {'source_candidates':len(candidates),
  'blocked_candidates':sum(x.get('publish_status')=='BLOCKED' for x in candidates),
  'signed_candidates':sum(bool(x.get('approval_signature')) for x in candidates),
  'review_required_candidates':sum(x.get('review_state')=='AWAITING_SUBJECT_OWNER_AND_ACADEMIC_QA' for x in candidates),
  'class_one_image_weeks':18}
def code(path):
 try:
  req=urllib.request.Request('https://api.assps.edu.pk'+path,method='GET',
   headers={'User-Agent':'ASSPS-lesson-readiness-check/1'})
  with urllib.request.urlopen(req,timeout=8) as resp:return resp.status
 except urllib.error.HTTPError as err:return err.code
 except Exception:return None
def collect_live():
 output=subprocess.run(['runuser','-u','postgres','--','psql','-X','-A','-t',
  '-d','apexos','-v','ON_ERROR_STOP=1','-c',QUERY],
  capture_output=True,text=True,timeout=15,check=True)
 data=next((json.loads(x) for x in output.stdout.splitlines() if x.lstrip().startswith('{')),None)
 if not isinstance(data,dict):raise ValueError('READ_ONLY_AGGREGATE_UNAVAILABLE')
 return data
def evaluate(source,db,http):
 blockers=[]
 if source['blocked_candidates'] or source['signed_candidates']<source['source_candidates']:
  blockers.append('ACADEMIC_PUBLICATION_HOLD')
 if db['shared']==0:blockers.append('NO_SHARED_LESSON_PLANS')
 if db['scheduled_teachers_without_paper']>0:
  blockers.append('SCHEDULED_TEACHER_PAPER_PERMISSION_MISSING')
 if db['active_teacher_class_assignments']==0 or db['linked_teacher_accounts']==0:
  blockers.append('TEACHER_CLASS_ASSIGNMENTS_MISSING')
 if db['reviewed_teacher_slots']<db['teaching_slots']:
  blockers.append('TIMETABLE_STAFF_IDENTITY_NOT_CERTIFIED')
 if http['branding']!=200:blockers.append('PUBLIC_BRANDING_ROUTE_NOT_LIVE')
 if http['lesson_anonymous']!=401:blockers.append('ANONYMOUS_LESSON_ACCESS_UNEXPECTED')
 return {'status':'HOLD' if blockers else 'REQUIRES_AUTHENTICATED_ACCEPTANCE',
  'source':source,
  'saved_plans':db['saved'],'shared_plans':db['shared'],
  'teacher_authored_plans':db['teacher_owned'],
  'active_teachers':db['active_teachers'],
  'teacher_module_permission_count':db['paper_access_teachers'],
  'scheduled_distinct_teachers':db['scheduled_distinct_teachers'],
  'scheduled_teachers_without_paper_permission':db['scheduled_teachers_without_paper'],
  'active_teacher_class_assignments':db['active_teacher_class_assignments'],
  'linked_teacher_accounts':db['linked_teacher_accounts'],
  'teaching_slots':db['teaching_slots'],
  'mapped_teacher_slots':db['mapped_teacher_slots'],
  'reviewed_teacher_slots':db['reviewed_teacher_slots'],
  'reference_only_evidence':db['reference_only_evidence'],
  'http':http,'blockers':blockers,
  'can_auto_publish':False,
  'requires_teacher_school2_browser_acceptance':True,
  'requires_paper_studio_academic_approval':True}
def main():
 parser=argparse.ArgumentParser()
 parser.add_argument('--live',action='store_true',help='Read only from local Hostinger production DB and public HTTP')
 args=parser.parse_args()
 if not args.live:parser.error('Specify --live; this never performs a write')
 source=source_stats(SOURCE.read_bytes())
 data=collect_live()
 http={'branding':code('/api/school/public-branding?school_code=assps'),
  'lesson_anonymous':code('/api/lesson-plans')}
 print(json.dumps(evaluate(source,data,http),indent=2,sort_keys=True))
if __name__=='__main__':main()
