#!/usr/bin/env bash
set -euo pipefail
app=https://app.assps.edu.pk
count=0
check(){
 local method="$1" path="$2" expected="$3" actual
 actual=$(curl -sS --max-time 7 -o /dev/null -w '%{http_code}' -X "$method" "$app$path")
 printf '%s %s: %s expected %s\n' "$method" "$path" "$actual" "$expected"
 [[ "$actual" == "$expected" ]] || exit 4
 count=$((count+1))
}
check GET /api/academic-approvals/assessment-catalog/readiness 401
check GET /api/academic-approvals/assessment-catalog/cohort-coverage 401
check GET '/api/academic-approvals/assessment-catalog/historical-subject-gaps?sourceExamId=9' 401
check GET /api/academic-approvals/grade-discrepancies 401
check GET /api/academic-approvals/lesson-source-review 401
check GET /api/academic-approvals/academic-writer-preflight 401
check GET /api/academic-approvals/assessment-catalog/14/offerings 401
check GET /api/academic-approvals/assessment-catalog/19/offerings 401
check GET /api/academic-approvals/assessment-catalog/999/offerings 401
check POST /api/academic-approvals/assessment-catalog/14/offerings 403
check GET /api/academic-approvals/assessment-catalog/14/preview 401
check GET /api/academic-approvals/assessment-catalog/18/preview 401
check GET /api/academic-approvals/assessment-catalog/19/preview 401
check GET /api/academic-approvals/assessment-catalog/9999/preview 401
check GET /api/academic-approvals/assessment-catalog/14/stage 403
check GET /api/academic-approvals/secret 403
check POST /api/academic-approvals/assessment-catalog/19/preview 403
check POST /api/academic-approvals/assessment-catalog/14/stage 401
check POST /api/academic-approvals/exam-subjects/1/approve 401
check POST /api/academic-approvals/teacher-assignments 401
check GET /api/portal/paper-studio/library 401
check GET /api/lesson-plans/planner/context 401
check GET /api/exams/next-assessment 401
echo "ACADEMIC_PUBLIC_INGRESS_PROTECTED_HTTP_CHECKS_PASS: $count"
