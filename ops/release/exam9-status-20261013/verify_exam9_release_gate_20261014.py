#!/usr/bin/env python3
"""Read-only Exam 9 production/QA release preflight. No passwords, writes, or sessions."""
import argparse
import json
import subprocess
import sys
from verify_release_receipts_20261014 import verified_receipt_gates

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
    parser.add_argument('--receipt-bundle', default=None)
    args = parser.parse_args()
    if not args.database.startswith('assps_') and args.database != 'apexos':
        parser.error('Database must be an explicitly named ASSPS production/QA database')
    school, exam = args.school, args.exam
    # All queries use SELECT only; no RLS changes, seeds, authentication, or student writes.
    metrics = run(args.port, args.database, f"""
    SELECT json_build_object(
      'exam_result_count', (SELECT COUNT(*) FROM exam_results WHERE exam_id={exam} AND school_id={school}),
      'zero_scores', (SELECT COUNT(*) FROM exam_results WHERE exam_id={exam} AND school_id={school} AND marks_obtained=0),
      'invalid_bounds', (SELECT COUNT(*) FROM exam_results WHERE exam_id={exam} AND school_id={school} AND (marks_obtained<0 OR marks_obtained>total_marks OR total_marks<=0)),
      'duplicate_scores', (SELECT COUNT(*)-COUNT(DISTINCT (exam_id,student_id,subject)) FROM exam_results WHERE exam_id={exam} AND school_id={school}),
      'F_grade_at_40_to_49_pct', (SELECT COUNT(*) FROM exam_results WHERE exam_id={exam} AND school_id={school} AND total_marks>0 AND marks_obtained*100>=total_marks*40 AND marks_obtained*100<total_marks*50 AND UPPER(COALESCE(grade,''))='F'),
      'original_301_rows', (SELECT COUNT(*) FROM exam_results WHERE exam_id={exam} AND school_id={school} AND id<=306),
      'original_301_zeros', (SELECT COUNT(*) FROM exam_results WHERE exam_id={exam} AND school_id={school} AND id<=306 AND marks_obtained=0),
      'original_301_scores_digest', (SELECT md5(string_agg(CONCAT_WS('|',id,exam_id,student_id,subject,marks_obtained,total_marks),E'\n' ORDER BY id)) FROM exam_results WHERE exam_id={exam} AND school_id={school} AND id<=306),
      'original_301_digest', (SELECT md5(string_agg(CONCAT_WS('|',id::text,exam_id::text,student_id::text,subject,COALESCE(marks_obtained::text,'NULL'),COALESCE(total_marks::text,'NULL'),COALESCE(grade,'NULL')), E'\n' ORDER BY id)) FROM exam_results WHERE exam_id={exam} AND school_id={school} AND id<=306),

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
    authentic_receipts = verified_receipt_gates(args.receipt_bundle)
    gates = {
       'original_exam_scores_preserved': metrics['original_301_rows']==301 and metrics['original_301_zeros']==36 and metrics['original_301_scores_digest']=='bcdc098a3e6cabb6f4c31736b14e39b9',
       'original_grade_snapshot_unchanged_or_signed_revision': metrics['original_301_digest']=='0376ec1d25555b0dfc963857564b36aa' or authentic_receipts['grade_revision_authenticated'],
       'current_exam9_rows_integrity': metrics['exam_result_count']>=301 and metrics['invalid_bounds']==0 and metrics['duplicate_scores']==0,
       'pass40_F_grade_conflicts_reviewed': metrics['F_grade_at_40_to_49_pct']==0,
       'exact_active_teacher_assignments': metrics['teacher_assignments']>0 and metrics['invalid_assignments']==0 and metrics['unmapped_cohorts']==0 and metrics['duplicate_assignment_grants']==0,
       'all_offerings_independently_approved': approval_ready and metrics['exam_subjects']>0 and valid==metrics['exam_subjects'],
       'grade_policy_explicitly_configured': metrics['grade_bands']>0,
       'active_app_runtime_signed': metrics['app_signed_guards']>=77,
       'genuine_teacher_session_and_save_reload_print': authentic_receipts['teacher_save_reload_print'],
       'independent_real_peer_school_http_denial': authentic_receipts['real_peer_school_denial'],
       'traffic_rollback_evidence_attached': authentic_receipts['traffic_rollback'],
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
