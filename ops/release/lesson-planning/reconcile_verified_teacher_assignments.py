#!/usr/bin/env python3
"""Read-only 2026 ASSPS Lesson delivery teacher-class proposal preflight.

No staff or student PII in output. Never creates teacher_class_assignments,
grants permissions, approves academic source or publishes any lesson plan.
"""
import argparse
import json
import subprocess

APPROVED_PRINT_HASH="9ac81002d2bc67cc748ece72b637c6cc081c8e1f23d1551d594031deea7e70c4"
SQL="""BEGIN READ ONLY;
WITH teaching AS (
 SELECT t.school_id,t.class_name,COALESCE(t.section,'') section,
        t.subject,t.teacher_id,t.day_name,t.period_label,t.source_sha256
 FROM public.timetable t
 WHERE t.school_id=1 AND t.day_name IN ('Monday','Tuesday','Wednesday',
 'Thursday','Friday','Saturday') AND t.period_label LIKE 'Period %'
), candidate AS (
 SELECT school_id,class_name,section,subject,teacher_id,
 COUNT(DISTINCT day_name)::integer days,
 COUNT(DISTINCT source_sha256)::integer source_hash_count
 FROM teaching GROUP BY 1,2,3,4,5
), bound AS (
 SELECT c.*,
 u.id IS NOT NULL AS verified_teacher_user,
 e.id IS NOT NULL AS verified_employee
 FROM candidate c
 LEFT JOIN public.users u ON u.id=c.teacher_id AND u.school_id=c.school_id
  AND u.role='teacher' AND u.is_active=true
 LEFT JOIN public.employees e ON e.user_id=u.id
  AND e.school_id=c.school_id AND e.is_active=true
), overlapping AS (
 SELECT teacher_id,day_name,period_label
 FROM teaching
 GROUP BY teacher_id,day_name,period_label
 HAVING COUNT(DISTINCT ROW(class_name,section))>1
)
SELECT row_to_json(v)::text FROM (
 SELECT
 (SELECT COUNT(*) FROM candidate)::integer AS candidates,
 (SELECT COUNT(*) FROM candidate WHERE days=6)::integer AS six_day_candidates,
 (SELECT COUNT(*) FROM bound WHERE verified_teacher_user AND verified_employee)::integer AS valid_user_employee_candidates,
 (SELECT COUNT(*) FROM bound WHERE NOT verified_teacher_user OR NOT verified_employee)::integer AS invalid_identity_candidates,
 (SELECT COUNT(*) FROM candidate WHERE source_hash_count<>1)::integer AS mixed_candidate_hashes,
 (SELECT COUNT(*) FROM teaching)::integer AS teaching_slots,
 (SELECT COUNT(DISTINCT teacher_id) FROM teaching)::integer AS unique_scheduled_users,
 (SELECT COUNT(*) FROM overlapping)::integer AS concurrent_overlaps,
 (SELECT COUNT(*) FROM (SELECT teacher_id,period_label FROM overlapping GROUP BY 1,2) z)::integer AS overlapping_patterns,
 (SELECT COUNT(*) FROM public.teacher_class_assignments WHERE school_id=1 AND is_active=true)::integer AS active_assignment_rows,
 (SELECT COUNT(*) FROM public.lesson_plans WHERE school_id=1 AND sent_to_portal=true)::integer AS shared_lessons,
 (SELECT COUNT(DISTINCT source_sha256) FROM teaching)::integer AS source_versions,
 (SELECT COUNT(*) FROM teaching WHERE source_sha256='9ac81002d2bc67cc748ece72b637c6cc081c8e1f23d1551d594031deea7e70c4')::integer AS approved_source_slots
) v;
COMMIT;"""

CHECKS=("candidates","six_day_candidates","valid_user_employee_candidates",
        "invalid_identity_candidates","mixed_candidate_hashes","teaching_slots",
        "unique_scheduled_users","concurrent_overlaps","overlapping_patterns",
        "active_assignment_rows","shared_lessons","source_versions",
        "approved_source_slots")
def decision(r):
    if not isinstance(r,dict) or any(type(r.get(k)) is not int or r[k]<0 for k in CHECKS):
        raise ValueError("Invalid read-only aggregate evidence")
    blockers=[]
    if not r["candidates"] or r["candidates"]!=r["six_day_candidates"]:
        blockers.append("SIX_DAY_ASSIGNMENT_COMPLETENESS_FAILED")
    if r["candidates"]!=r["valid_user_employee_candidates"] or r["invalid_identity_candidates"]>0:
        blockers.append("USER_EMPLOYEE_RELATIONSHIP_MISSING")
    if r["mixed_candidate_hashes"] or r["source_versions"]!=1 or r["approved_source_slots"]!=r["teaching_slots"]:
        blockers.append("OFFICIAL_PRINT_SOURCE_PROVENANCE_NOT_ATTESTED")
    if r["concurrent_overlaps"]>0:
        blockers.append("TEACHER_PERIOD_OVERLAPS_REQUIRE_COMBINED_CLASS_APPROVAL")
    if not r["active_assignment_rows"]:
        blockers.append("ACTIVE_CLASS_ASSIGNMENTS_NOT_PUBLISHED")
    if not r["shared_lessons"]:
        blockers.append("LESSON_DELIVERY_NOT_ACTIVATED")
    return {
        "status":"HOLD",
        "evidence":{k:r[k] for k in CHECKS},
        "blockers":blockers,
        "academic_source_approval_still_required":True,
        "signed_rls_and_cross_school_actor_acceptance_required":True,
        "can_auto_assign":False,
        "can_auto_publish":False,
        "manual_identity_review_can_begin":bool(r["candidates"] and r["invalid_identity_candidates"]==0),
        "note":"All timetable rows retained. No user IDs, names, lesson content or student records emitted."
    }
def live():
    args=["runuser","-u","postgres","--","psql","-X","-A","-t","-d","apexos",
          "-v","ON_ERROR_STOP=1","-c",SQL]
    x=subprocess.run(args,capture_output=True,text=True,check=True,timeout=30)
    found=[s for s in x.stdout.splitlines() if s.startswith("{")]
    if len(found)!=1:raise ValueError("No exact single aggregate result")
    return json.loads(found[0])
def main():
    parser=argparse.ArgumentParser()
    group=parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--live",action="store_true")
    group.add_argument("--fixture",help="synthetic aggregate JSON")
    a=parser.parse_args()
    d=live() if a.live else json.load(open(a.fixture,encoding="utf-8"))
    print(json.dumps(decision(d),indent=2,sort_keys=True))
if __name__=="__main__": main()
