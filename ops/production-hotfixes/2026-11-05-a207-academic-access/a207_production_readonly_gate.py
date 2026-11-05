#!/usr/bin/env python3
"""Read-only, aggregate-only, exact-school release gate verification.
No student/teacher identity values exported. No production writes or schema changes.
"""
import subprocess,json,datetime,sys,hashlib,os
from pathlib import Path
SQL="""BEGIN READ ONLY;
SELECT 'FIRSTTERM|'||COUNT(*)||'|'||encode(public.digest(string_agg(to_jsonb(r)::text,E'\\n' ORDER BY r.id),'sha256'),'hex')
  FROM exam_results r WHERE r.school_id=1 AND r.exam_id=9;
SELECT 'ACADEMIC|'||COALESCE(j->>'name','')||'|'||COALESCE(j->'sections','[]'::jsonb)::text
  FROM settings s, LATERAL jsonb_array_elements(coalesce(s.academic_setup->'classes','[]'::jsonb)) AS j
  WHERE s.school_id=1 AND j->>'name' IN ('Pre Nine','Nine');
SELECT 'ROSTER|'||s.class||'|'||s.section||'|'||COUNT(*) FROM students s
  WHERE s.school_id=1 AND s.is_active=true AND s.class IN ('Pre Nine','Nine')
  GROUP BY s.class,s.section;
SELECT 'TEACHER|'||t.class_name||'|'||t.section||'|'||COUNT(*)||'|'||COUNT(DISTINCT t.teacher_user_id)||'|'||
  COUNT(*) FILTER (WHERE u.id IS NOT NULL AND u.is_active=true AND u.role='teacher')
  FROM teacher_class_assignments t LEFT JOIN users u ON u.id=t.teacher_user_id AND u.school_id=t.school_id
  WHERE t.school_id=1 AND t.is_active=true AND t.class_name IN ('Pre-Nine','Pre Nine','Nine')
  GROUP BY t.class_name,t.section;
SELECT 'CANONICAL|'||COUNT(DISTINCT s.id) FROM students s
  WHERE s.school_id=1 AND s.is_active=true AND s.class='Pre Nine' AND s.section='Blue'
  AND EXISTS (SELECT 1 FROM teacher_class_assignments t WHERE t.school_id=s.school_id
    AND t.is_active=true AND t.teacher_user_id IS NOT NULL
    AND (CASE WHEN LOWER(BTRIM(t.class_name))='pre-nine' THEN 'pre nine' ELSE LOWER(BTRIM(t.class_name)) END)=
        (CASE WHEN LOWER(BTRIM(s.class))='pre-nine' THEN 'pre nine' ELSE LOWER(BTRIM(s.class)) END)
    AND LOWER(BTRIM(t.section))=LOWER(BTRIM(s.section)));
SELECT 'NINE_LEAK|'||COUNT(DISTINCT s.id) FROM students s WHERE s.school_id=1 AND s.is_active=true AND s.class='Nine'
    AND EXISTS (SELECT 1 FROM teacher_class_assignments t WHERE t.school_id=s.school_id
    AND t.is_active=true AND t.class_name='Pre-Nine'
    AND (CASE WHEN LOWER(BTRIM(t.class_name))='pre-nine' THEN 'pre nine' ELSE LOWER(BTRIM(t.class_name)) END)=
        (CASE WHEN LOWER(BTRIM(s.class))='pre-nine' THEN 'pre nine' ELSE LOWER(BTRIM(s.class)) END));
SELECT 'ASSESSMENT|'||COUNT(DISTINCT e.id)||'|'||COUNT(DISTINCT x.id)||'|'||COUNT(DISTINCT r.id)
  FROM exams e LEFT JOIN exam_subjects x ON x.exam_id=e.id AND x.school_id=e.school_id AND x.is_active=true
  LEFT JOIN exam_results r ON r.exam_id=e.id AND r.school_id=e.school_id
  WHERE e.school_id=1 AND e.id IN (14,15,16,17);
SELECT 'ACADEMIC_GATE|'||COUNT(*)||'|'||COUNT(*) FILTER (WHERE approval_status='approved')
  FROM exam_subjects WHERE school_id=1;
SELECT 'ASSESSMENT5|'||COUNT(*) FROM exams WHERE school_id=1 AND LOWER(name)='assessment 5';
SELECT 'APPROVAL_EVENTS|'||COUNT(*) FROM school_academic_approval_events WHERE school_id=1;
SELECT 'STANDALONE_RESULTS|'||COUNT(*) FROM assessment_result_records WHERE school_id=1;
SELECT 'COHORT_ENROLLMENTS|'||COUNT(*) FROM exam_class_enrollments WHERE school_id=1 AND is_active=true;
SELECT 'GENERIC_OWNED_RLS|'||COUNT(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind IN ('r','p') AND c.relrowsecurity
 AND pg_get_userbyid(c.relowner)='apexos_user';
ROLLBACK;"""

def audit():
 result=subprocess.run(['runuser','-u','postgres','--','psql','-X','-At','-v','ON_ERROR_STOP=1','-d','apexos'],capture_output=True,text=True,input=SQL,timeout=40)
 if result.returncode:raise RuntimeError('READONLY_SQL_FAILED: '+result.stderr[-170:])
 rows=[row.split('|') for row in result.stdout.splitlines() if '|' in row and row not in ('BEGIN','ROLLBACK')]
 groups={}
 for x in rows:groups.setdefault(x[0],[]).append(x[1:])
 assert len(groups.get('FIRSTTERM',[]))==1
 termcount,termsha=groups['FIRSTTERM'][0]
 assert int(termcount)==1854 and termsha=='420c6cbd4c433906156e771449f6ff40ef48efce6e53ca591692dace1aad0539'
 academic={n:s for n,s in groups['ACADEMIC']}
 assert academic['Pre Nine']=='["Blue"]' and academic['Nine']=='["Fatima", "Usman"]'
 cohorts={(c,s):int(n) for c,s,n in groups['ROSTER']}
 assert cohorts=={('Pre Nine','Blue'):12,('Nine','Fatima'):6,('Nine','Usman'):9}
 teachers={(c,s):{'records':int(total),'distinctUsers':int(users),'validActiveTeacherRecords':int(valid)} for c,s,total,users,valid in groups['TEACHER']}
 assert teachers[('Pre-Nine','Blue')]=={'records':8,'distinctUsers':7,'validActiveTeacherRecords':8}
 assert groups['CANONICAL']==[['12']] and groups['NINE_LEAK']==[['0']]
 assert groups['ASSESSMENT']==[['4','0','0']]
 assert groups['ASSESSMENT5']==[['0']]
 assert groups['APPROVAL_EVENTS']==[['0']]
 assert groups['STANDALONE_RESULTS']==[['0']]
 assert groups['GENERIC_OWNED_RLS']==[['73']]
 raw_pending,total_approved=groups['ACADEMIC_GATE'][0]
 assert int(total_approved)==0
 return {'checkedUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':'LIVE_APEXOS_POSTGRES_READONLY','school1PreNine':{'roster':12,'academicSection':'Blue','assignmentRecords':8,'distinctAssignedTeacherAccounts':7,'activeValidTeacherAssignmentRecords':8,'canonicalMatchedStudents':12},'school1GradeNine':{'roster':15,'sections':['Fatima','Usman'],'wrongPreNineAssignmentMatches':0},'assessment1To4':{'examHeaders':4,'activeExamSubjects':0,'examResultRecords':0},'school1ExamSubjectsTotal':int(raw_pending),'school1ExamSubjectsApproved':0,'school1Assessment5':0,'school1OfficialApprovalEvents':0,'school1AssessmentResultRecords':0,'school1ExamClassEnrollmentsActive':int(groups['COHORT_ENROLLMENTS'][0][0]),'historicalFirstTermRows':int(termcount),'historicalFirstTermSha256':termsha,'genericOwnedRlsTables':73,'productionWrites':0,'productionDDL':0,'release':'HOLD'}
if __name__=='__main__':
 out=audit()
 outpath=Path(sys.argv[1]) if len(sys.argv)>1 else None
 if outpath:
  outpath.write_text(json.dumps(out,indent=2,sort_keys=True)+'\n')
  outpath.chmod(0o600)
 print(json.dumps({k:v for k,v in out.items() if k not in ('historicalFirstTermSha256','checkedUtc')},sort_keys=True))
