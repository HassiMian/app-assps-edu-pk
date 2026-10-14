#!/usr/bin/env python3
"""Read-only Exam 9 production/QA release preflight. No passwords, writes, or sessions."""
import argparse
import json
import subprocess
import sys

def run(port, database, sql):
    p = subprocess.run(
        ['sudo', '-u', 'postgres', 'psql', '-p', str(port), '-d', database,
         '-X', '-v', 'ON_ERROR_STOP=1', '-t', '-A', '-c', sql],
        text=True, capture_output=True, timeout=25, check=False
    )
    if p.returncode:
        raise RuntimeError('Read-only database query failed: ' + p.stderr.strip()[:360])
    try:
        return json.loads(p.stdout.strip())
    except (ValueError, TypeError) as exc:
        raise RuntimeError('Read-only database result not JSON') from exc

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, choices=(5432, 55432), default=55432)
    parser.add_argument('--database', default='assps_exam9_live301_qa_20261013')
    parser.add_argument('--school', type=int, default=1)
    parser.add_argument('--exam', type=int, default=9)
    args = parser.parse_args()
    if not args.database.startswith('assps_') and args.database != 'apexos':
        parser.error('Database must be an explicitly named ASSPS production/QA database')
    school, exam = args.school, args.exam
    # All queries use SELECT only; no RLS changes, seeds, authentication, or student writes.
    metrics = run(args.port, args.database, f"""
    SELECT json_build_object(
      'exam_result_count', (SELECT COUNT(*) FROM exam_results WHERE exam_id={exam} AND school_id={school}),
      'zero_scores', (SELECT COUNT(*) FROM exam_results WHERE exam_id={exam} AND school_id={school} AND marks_obtained=0),
      'teacher_assignments', (SELECT COUNT(*) FROM teacher_class_assignments WHERE school_id={school} AND is_active),
      'active_cohorts', (SELECT COUNT(*) FROM
         (SELECT class, section FROM students WHERE school_id={school} AND is_active GROUP BY class,section) cohorts),
      'unmapped_cohorts', (SELECT COUNT(*) FROM
         (SELECT class, section FROM students WHERE school_id={school} AND is_active GROUP BY class,section) cohorts
          WHERE NOT EXISTS (SELECT 1 FROM teacher_class_assignments a
             WHERE a.school_id={school} AND a.is_active
               AND LOWER(BTRIM(a.class_name))=LOWER(BTRIM(cohorts.class))
               AND LOWER(BTRIM(a.section))=LOWER(BTRIM(cohorts.section)))),
      'duplicate_assignment_grants', (SELECT COUNT(*) FROM
          (SELECT teacher_user_id,class_name,section,subject
           FROM teacher_class_assignments WHERE school_id={school} AND is_active
           GROUP BY teacher_user_id,class_name,section,subject HAVING COUNT(*)>1) duplicates),
      'invalid_assignments', (SELECT COUNT(*) FROM teacher_class_assignments a WHERE a.school_id={school} AND a.is_active
        AND (NULLIF(BTRIM(a.section),'') IS NULL OR NULLIF(BTRIM(a.subject),'') IS NULL OR
          NOT EXISTS (SELECT 1 FROM users u WHERE u.id=a.teacher_user_id AND u.school_id={school} AND u.is_active AND u.role='teacher'))),
      'exam_subjects', (SELECT COUNT(*) FROM exam_subjects WHERE exam_id={exam} AND school_id={school}),
      'maxima_configured', (SELECT COUNT(*) FROM exam_subjects WHERE exam_id={exam} AND school_id={school} AND total_marks>0),
      'grade_bands', (SELECT COUNT(*) FROM grade_settings WHERE school_id={school}),
      'app_signed_guards', (SELECT COUNT(*) FROM pg_policies WHERE schemaname='public'
         AND 'apex_app_runtime'=ANY(roles) AND (policyname ILIKE '%signed%' OR qual ILIKE '%signed%'))
    )""")
    approval_columns = run(args.port, args.database, """
      SELECT COALESCE(json_agg(column_name), '[]'::json)
      FROM information_schema.columns WHERE table_schema='public' AND table_name='exam_subjects'
      AND column_name IN ('approval_status','approval_revision','approved_by_user_id','approved_at')
    """)
    approval_ready = set(approval_columns) == {'approval_status','approval_revision','approved_by_user_id','approved_at'}
    valid = 0
    if approval_ready:
        valid = run(args.port, args.database, f"""
          SELECT json_build_object('valid', COUNT(*)) FROM exam_subjects x
          JOIN users u ON u.id=x.approved_by_user_id AND u.school_id=x.school_id
          AND u.is_active AND u.role IN ('admin','principal')
          WHERE x.exam_id={exam} AND x.school_id={school} AND x.is_active
            AND x.approval_status='approved' AND x.approval_revision>0
            AND x.approved_at IS NOT NULL AND x.total_marks>0
        """)['valid']
    metrics['valid_reviewed_maxima'] = valid
    metrics['approval_schema_complete'] = approval_ready
    gates = {
       'original_exam_results_preserved': metrics['exam_result_count'] >= 301 and metrics['zero_scores'] >= 36,
       'exact_active_teacher_assignments': metrics['teacher_assignments']>0 and metrics['invalid_assignments']==0 and metrics['unmapped_cohorts']==0 and metrics['duplicate_assignment_grants']==0,
       'all_offerings_independently_approved': approval_ready and metrics['exam_subjects']>0 and valid==metrics['exam_subjects'],
       'grade_policy_explicitly_configured': metrics['grade_bands']>0,
       'active_app_runtime_signed': metrics['app_signed_guards']>0,
       'genuine_teacher_session_and_save_reload_print': False,
       'independent_real_peer_school_http_denial': False,
       'traffic_rollback_evidence_attached': False,
    }
    print(json.dumps({'scope': {'database':args.database,'port':args.port,'school':school,'exam':exam},
                      'metrics':metrics,'gates':gates,
                      'verdict':'HOLD' if not all(gates.values()) else 'READY_FOR_INDEPENDENT_CERTIFICATION'},
                     sort_keys=True, indent=2))
    return 2 if not all(gates.values()) else 0

if __name__ == '__main__':
    try:
        sys.exit(main())
    except (RuntimeError, subprocess.TimeoutExpired) as error:
        print(json.dumps({'verdict':'HOLD','error':str(error)}))
        sys.exit(2)
