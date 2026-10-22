#!/usr/bin/env python3
"""ASSPS single unified release fence; READ ONLY. Never modifies school production."""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import verify_backend_source_preservation_readonly as backend_preservation
import verify_backend_listener_readonly as backend_listener
import verify_owner_academic_authenticity_readonly as owner_academic
import verify_firstterm_snapshot_drift_readonly as result_drift
import verify_frontend_artifact_closure_readonly as frontend_closure
import verify_exam_attendance_tenant_scope_readonly as exam_attendance_scope
import verify_academic_delivery_integrity_readonly as academic_integrity
import assps_attendance_coverage_readonly as attendance_coverage
import assps_fee_ledger_integrity_readonly as fee_integrity
import assps_storage_headroom_readonly as disk_headroom
import verify_timetable_collision_scope_readonly as timetable_collision
import verify_lesson_coverage_readonly as lesson_coverage
import verify_school_cross_product_boundary_readonly as product_boundary
import verify_school_whatsapp_log_privacy_readonly as whatsapp_log_privacy
import verify_school_whatsapp_phone_scope_readonly as whatsapp_phone_scope
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

ACTIVE_ROOT = Path('/var/www/assps-resultcard-nazra-purged-20261019')
EXPECTED_LIVE_INDEX = '3c74d3be652b41549ef2129eaacec4c341c05c2118597e308edffd17a33726a9'
BACKUP_ROOT = Path('/var/backups')
ROLLBACK = Path('/root/instant_rollback_to_20261016.sh')
FIRSTTERM = Path('/root/secure-archive/assps-firstterm-retention-20261019/verify_school1_firstterm_exam9_v2.py')
STRICT_CATALOG = Path('/root/workspace/assps-core-signed85-catalog-20261019/ops/release/security/verify_signed85_catalog_live_readonly_20261019.py')
LATEST_BACKUP_PATTERN = re.compile(r'assps-critical-\d{8}T\d{6}Z')
APPROVED_MAPPING = 'timetable_verified_20261019'
# Records with external actors cannot become PASS via env-vars, model claims or mock tests.
UNPROVEN_RELEASE_GATES = (
    'frontend_backend_signed_release_provenance',
    'genuine_principal_teacher_school2_browser_auth',
    'signed_runtime_hmac_actor_and_effective_rls',
    'reviewed_timetable_migration_real_scope',
    'independent_59_academic_source_approvals',
    'offhost_decrypted_two_cluster_restore',
    'witnessed_urdu_a4_hardware_acceptance',
    'paper_studio_result_template_owner_acceptance',
    'cross_module_attendance_fees_notices_connect_acceptance',
    'public_repository_sensitive_asset_history_review',
)
BASELINES = {
    'students_total': 326, 'students_school1': 322, 'students_school2': 3,
    'students_historical_test': 1,
    'exam_results_total': 1854, 'exam9_firstterm_rows': 1853,
    'exam9_true_zero': 224, 'exam9_null_marks': 0,
    'exam8_school2_demo_rows': 1, 'firstterm_exam9_meta': 1,
    'firstterm_live_guard_triggers': 4,
    'official_teacher_grants': 54, 'unauthorized_active_grants': 0,
    'school1_timetable': 405, 'school1_lesson_plans': 3,
    'force_enabled_public_rls': 85,
}
# Absolute counts may grow with legitimate admissions and future terms.
# Only immutable First Term Exam9, historical Exam8 and exact authorization/policy
# contracts remain strict. The original firstterm SHA checker separately protects
# every historical row against changes that aggregate counts would miss.
MINIMUM_AGGREGATES = frozenset({
    'students_total', 'students_school1', 'students_school2',
    'exam_results_total', 'school1_timetable', 'school1_lesson_plans',
    'force_enabled_public_rls',
})
def compatible_aggregates(actual):
    if set(actual) != set(BASELINES):
        return False
    for key, baseline in BASELINES.items():
        if key in MINIMUM_AGGREGATES:
            if actual[key] < baseline:
                return False
        elif actual[key] != baseline:
            return False
    return True

READONLY_SQL = """
BEGIN TRANSACTION READ ONLY;
SELECT 'students_total|' || count(*) FROM public.students;
SELECT 'students_school1|' || count(*) FROM public.students WHERE school_id=1;
SELECT 'students_school2|' || count(*) FROM public.students WHERE school_id=2;
SELECT 'students_historical_test|' || count(*) FROM public.students WHERE school_id=98765;
SELECT 'exam_results_total|' || count(*) FROM public.exam_results;
SELECT 'exam9_firstterm_rows|' || count(*) FROM public.exam_results WHERE exam_id=9;
SELECT 'exam9_true_zero|' || count(*) FROM public.exam_results WHERE exam_id=9 AND marks_obtained=0;
SELECT 'exam9_null_marks|' || count(*) FROM public.exam_results WHERE exam_id=9 AND marks_obtained IS NULL;
SELECT 'exam8_school2_demo_rows|' || count(*) FROM public.exam_results er JOIN public.exams ex ON ex.id=er.exam_id WHERE er.exam_id=8 AND ex.school_id=2;
SELECT 'firstterm_exam9_meta|' || count(*) FROM public.exams WHERE id=9 AND school_id=1 AND name='First Term Exam' AND session='2026-2027';
SELECT 'firstterm_live_guard_triggers|' || count(*) FROM pg_trigger t
  WHERE t.tgname LIKE 'assps_firstterm_exam9_%' AND t.tgrelid IN ('public.exams'::regclass, 'public.exam_results'::regclass) AND t.tgenabled='O' AND NOT t.tgisinternal;
SELECT 'official_teacher_grants|' || count(*) FROM public.teacher_class_assignments WHERE school_id=1 AND is_active AND source='timetable_verified_20261019';
SELECT 'unauthorized_active_grants|' || count(*) FROM public.teacher_class_assignments WHERE school_id=1 AND is_active AND source IS DISTINCT FROM 'timetable_verified_20261019';
SELECT 'school1_timetable|' || count(*) FROM public.timetable WHERE school_id=1;
SELECT 'school1_lesson_plans|' || count(*) FROM public.lesson_plans WHERE school_id=1;
SELECT 'force_enabled_public_rls|' || count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity AND c.relforcerowsecurity AND c.relname<>'student_class_movement_audit';
COMMIT;
"""
URL_EXPECTATIONS = (
    ('app_home', 'https://app.assps.edu.pk/', 'GET', 200),
    ('app_login', 'https://app.assps.edu.pk/login', 'GET', 200),
    ('app_api_health', 'https://app.assps.edu.pk/api/', 'GET', 200),
    ('api_health', 'https://api.assps.edu.pk/health', 'GET', 200),
    ('school_branding', 'https://app.assps.edu.pk/api/school/public-branding?school_code=assps', 'GET', 200),
    ('signature_public_guard', 'https://app.assps.edu.pk/principal-signature.png', 'GET', 403),
    ('timetable_api_guard', 'https://api.assps.edu.pk/api/timetable/save', 'POST', 403),
    ('timetable_app_guard', 'https://app.assps.edu.pk/api/timetable/save', 'POST', 403),
    ('timetable_www_guard', 'https://www.assps.edu.pk/api/timetable/save', 'POST', 403),
    ('timetable_apex_guard', 'https://apex.assps.edu.pk/api/timetable/save', 'POST', 403),
)

def run(argv, *, timeout=18, input_data=None, cwd=None):
    return subprocess.run(argv, input=input_data, text=True, capture_output=True,
                          timeout=timeout, cwd=cwd, check=False)

def digest(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for part in iter(lambda:f.read(1024*1024),b''):
            h.update(part)
    return h.hexdigest()

def parse_aggregate(lines):
    records={}
    for line in lines.splitlines():
        if not line.strip():
            continue
        key,separator,value=line.strip().partition('|')
        if not separator or key in records or key not in BASELINES or not value.isdigit():
            raise ValueError('Unexpected database aggregate response format')
        records[key]=int(value)
    if set(records)!=set(BASELINES):
        raise ValueError('Missing required aggregate evidence')
    return records

def inspect_database():
    query=run(['runuser','-u','postgres','--','psql','-p','5432','-d','apexos',
               '-X','-qAt','-v','ON_ERROR_STOP=1'], input_data=READONLY_SQL,timeout=18)
    if query.returncode:
        raise RuntimeError('Main PostgreSQL read-only inspection failed')
    records=parse_aggregate(query.stdout)
    return {'pass':compatible_aggregates(records),'counts':records}

def inspect_backup():
    dirs=sorted(p for p in BACKUP_ROOT.iterdir() if p.is_dir() and LATEST_BACKUP_PATTERN.fullmatch(p.name))
    if not dirs:
        raise RuntimeError('No timestamped critical backup directory')
    latest=dirs[-1]
    sha=latest/'SHA256SUMS'
    if not sha.is_file():
        raise RuntimeError('Newest critical backup has no SHA256SUMS')
    entries=[line for line in sha.read_text().splitlines() if line.strip()]
    if len(entries)!=4:
        raise RuntimeError('Backup does not have exactly four checksum entries')
    checked=run(['sha256sum','-c',str(sha)],cwd=str(latest),timeout=25)
    if checked.returncode or checked.stdout.count(': OK')!=4:
        raise RuntimeError('Latest backup checksum failure')
    for name in ('postgres-all.sql.gz','postgres-asspssigned-55432-all.sql.gz'):
        gzip=run(['gzip','-t',str(latest/name)],timeout=22)
        if gzip.returncode:
            raise RuntimeError('Postgres backup gzip test failed')
    arch=latest/'live-apps-and-configs.tar.gz'
    tar=run(['tar','-tzf',str(arch)],timeout=30)
    if tar.returncode:
        raise RuntimeError('App backup tar listing failed')
    rel=str(ACTIVE_ROOT).lstrip('/')+'/index.html'
    if not any(line.lstrip('./')==rel for line in tar.stdout.splitlines()):
        raise RuntimeError('Latest backup omits the current live frontend root')
    return {'pass':True,'snapshot':latest.name,'checksum_entries':4,'main_and_signed_gzip_pass':True,'active_frontend_included':True}

def inspect_frontend():
    html=ACTIVE_ROOT/'index.html'
    meta=ACTIVE_ROOT/'assps-release-attestation.json'
    if not html.is_file() or not meta.is_file():
        raise RuntimeError('Live frontend or release attestation missing')
    first=digest(html)
    sidecar=json.loads(meta.read_text())
    second=digest(html)
    return {'pass':first==second==EXPECTED_LIVE_INDEX,
            'active_index_sha256':second,'stable_across_probe':first==second,
            'sidecar_matches':second==sidecar.get('frontend_index_sha256'),
            'sidecar_claimed_commit':sidecar.get('candidate_commit',''),
            'active_root':str(ACTIVE_ROOT)}

def inspect_fees_ledger():
    result=run(['runuser','-u','postgres','--','psql','-p','5432','-d','apexos',
                '-X','-Atq','-v','ON_ERROR_STOP=1'],
               timeout=17,input_data=fee_integrity.SQL)
    if result.returncode:
        raise RuntimeError('Read-only fee ledger audit failed')
    aggregates=fee_integrity.parse(result.stdout)
    return {'pass':fee_integrity.assess(aggregates),
            'challans_total':aggregates['challans_total'],
            'school1_challans':aggregates['challans_school1'],
            'payment_transactions':aggregates['payment_transactions_total'],
            'financial_anomaly_count':sum(aggregates[k] for k in fee_integrity.NO_ANOMALIES)}

def inspect_attendance_coverage():
    # Read-only roster and saved-day status. Missing attendance is NOT guessed.
    result=run(['runuser','-u','postgres','--','psql','-p','5432','-d','apexos',
                '-X','-Atq','-v','ON_ERROR_STOP=1'],
               timeout=15,input_data=attendance_coverage.SQL)
    if result.returncode:
        raise RuntimeError('Attendance coverage read-only query failed')
    coverage=attendance_coverage.parse(result.stdout)
    return {'pass':True,'date_pakistan':coverage['date_pakistan'],
            'active_students':coverage['total_active'],
            'marked_students':coverage['total_marked'],
            'newly_registered_unmarked':coverage['newly_registered_unmarked_total'],
            'previously_registered_unmarked':coverage['previously_registered_unmarked_total'],
            'zero_saved_class_alerts':coverage['zero_saved_class_alerts'],
            'possible_post_close_full_roster_unsaved':attendance_coverage.post_close_unsaved_day(coverage),
            'attendance_not_fabricated':True}

def inspect_backend_preservation():
    inventory=backend_preservation.compare(
        backend_preservation.LIVE,backend_preservation.CANDIDATE)
    return {'pass':True,
            'live_files':inventory['live_files'],
            'byte_identical':inventory['byte_identical'],
            'different_count':inventory['different_count'],
            'live_only_count':inventory['live_only_count'],
            'independently_owned_live_only_count':inventory['independently_owned_live_only_count'],
            'whole_tree_safe':inventory['can_replace_live_tree_wholesale']}

def inspect_source_privacy():
    # Presence of a private school asset in any public git history is a separate HOLD.
    # No content bytes, signed URL, private asset filename or secret are emitted.
    tree=run(['git','-C','/root/workspace/assps-unified-production-mission-20261019',
              'ls-tree','-r','--name-only','HEAD'], timeout=9)
    if tree.returncode:
        raise RuntimeError('Source privacy inventory unavailable')
    tracked=tree.stdout.splitlines()
    flagged=[name for name in tracked
             if name.lower().endswith(('principal-signature.png','.p12','.pfx','.pem'))]
    return {'pass':True,'tracked_private_asset_path_count':len(flagged),
            'repository_history_privacy_remediation_required':bool(flagged)}

def inspect_frontend_artifact_closure():
    result=frontend_closure.audit()
    return {'pass':bool(result['trusted_packaged_source_build_pass']),
            'matching_count':result['active_matching_file_count'],
            'extra_count':result['active_extra_file_count'],
            'extra_extension_groups':result['active_extra_by_extension'],
            'immutable_artifact_go':result['immutable_artifact_go']}

def inspect_rollback():
    r=run(['bash',str(ROLLBACK),'--check'],timeout=22)
    if r.returncode or 'ROLLBACK_PREFLIGHT_PASS_NO_MUTATION' not in r.stdout:
        raise RuntimeError('Rollback preflight mismatch')
    return {'pass':True,'mode':'CHECK_ONLY_NO_MUTATION'}

def inspect_signed_and_history():
    tests=(
        ('exact_firstterm_sha', ['python3',str(FIRSTTERM),'--check'], 'SCHOOL1_FIRST_TERM_IMMUTABLE_INTEGRITY_PASS'),
        ('exam9_live_catalog', ['python3','/root/workspace/assps-core-firstterm-db-immutable-20261019/ops/release/firstterm/verify_exam9_history_lock_readonly_20261019.py'],'FIRST_TERM_EXAM9_IMMUTABLE_GUARD_PASS'),
        ('signed85_source_catalog', ['python3',str(STRICT_CATALOG)],'Source catalog ready for further isolated signed-actor validation'),
    )
    result={}
    for key,cmd,marker in tests:
        check=run(cmd,timeout=22)
        result[key]=check.returncode==0 and marker in check.stdout
    return {'pass':all(result.values()),'checks':result}

def http_probe(item):
    key,url,method,expected=item
    cmd=['curl','-ksS','--max-time','9','-o','/dev/null','-w','%{http_code}']
    if method=='POST':
        # Anonymous syntactically invalid body: cannot possibly write school data.
        cmd+=['-X','POST','-H','Content-Type: application/json','--data','{}']
    res=run(cmd+[url],timeout=11)
    code=res.stdout.strip()
    return key, {'pass':res.returncode==0 and code==str(expected),'http_status':code if code.isdigit() else 'error','expected':expected}

def inspect_http():
    with ThreadPoolExecutor(max_workers=6) as ex:
        result=dict(ex.map(http_probe,URL_EXPECTATIONS))
    return {'pass':all(v['pass'] for v in result.values()),'checks':result}

def classify(evidence):
    required=('database','backup','frontend','rollback','http','backend_listener','owner_academic_authenticity','firstterm_snapshot_drift',
              'restricted_catalog_and_firstterm','source_privacy_inventory',
              'backend_source_inventory','attendance_roster_coverage','fee_ledger_integrity',
              'frontend_artifact_closure','exam_attendance_tenant_scope','academic_delivery_integrity',
              'storage_headroom','timetable_collision_scope','lesson_coverage','cross_product_boundary',
              'school_whatsapp_log_privacy','school_whatsapp_phone_scope')
    checks={k:(isinstance(evidence.get(k),dict) and evidence[k].get('pass') is True)
            for k in required}
    infrastructure=all(checks.values())
    attested=evidence.get('frontend',{}).get('sidecar_matches') is True
    # Safeguards passing is not proof of genuine role, academic, print or restore acceptance.
    holds=list(UNPROVEN_RELEASE_GATES)
    if not checks['backend_listener']:
        holds.insert(0,'active_backend_listener_or_whatsapp_syntax_uncertified')
    if not checks['owner_academic_authenticity']:
        holds.insert(0,'owner_identity_grade_audit_and_firstterm_authority_not_verified')
    if not checks['firstterm_snapshot_drift']:
        holds.insert(0,'school1_firstterm_unattributed_score_or_grade_drift_requires_source_proof')
    if not attested:
        holds.insert(0,'active_frontend_attestation_does_not_match_served_hash')
    if evidence.get('frontend_artifact_closure',{}).get('immutable_artifact_go') is not True:
        holds.insert(0,'active_frontend_has_public_legacy_or_extra_artifacts')
    if evidence.get('backend_source_inventory',{}).get('whole_tree_safe') is not True:
        holds.insert(0,'backend_whole_tree_replacement_would_overwrite_or_remove_runtime_code')
    if evidence.get('exam_attendance_tenant_scope',{}).get('live_scoped') is not True:
        holds.insert(0,'active_exam_attendance_aggregate_missing_school_tenant_scope')
    if evidence.get('exam_attendance_tenant_scope',{}).get('candidate_scoped') is not True:
        holds.insert(0,'candidate_exam_attendance_tenant_scope_regression')
    if evidence.get('academic_delivery_integrity',{}).get('teacher_identity_complete') is not True:
        holds.insert(0,'active_timetable_teacher_identity_null_for_approved_grants')
    if evidence.get('academic_delivery_integrity',{}).get('teaching_sections_complete') is not True:
        holds.insert(0,'unscoped_pre_nine_timetable_sections_require_reconciliation')
    if (evidence.get('academic_delivery_integrity',{}).get('lesson_coverage_certified') is not True
        or evidence.get('lesson_coverage',{}).get('lesson_coverage_certified') is not True):
        holds.insert(0,'lesson_planning_academic_publication_and_coverage_not_certified')
    if evidence.get('school_whatsapp_phone_scope',{}).get('candidate_school_phone_scope_static_pass') is not True:
        holds.insert(0,'candidate_school_whatsapp_phone_number_scope_missing')
    if evidence.get('school_whatsapp_phone_scope',{}).get('live_school_phone_scope_hold') is True:
        holds.insert(0,'live_school_whatsapp_signed_webhook_phone_scope_unverified')
    if evidence.get('school_whatsapp_log_privacy',{}).get('candidate_log_scope_pass') is not True:
        holds.insert(0,'candidate_school_whatsapp_sensitive_logs_not_redacted')
    if evidence.get('school_whatsapp_log_privacy',{}).get('live_sensitive_log_hold') is True:
        holds.insert(0,'active_school_whatsapp_message_or_phone_logging_requires_privacy_fix')
    if evidence.get('cross_product_boundary',{}).get('candidate_financial_scope_static_pass') is not True:
        holds.insert(0,'candidate_school_whatsapp_financial_scope_guard_missing')
    if evidence.get('cross_product_boundary',{}).get('legacy_boundary_requires_review') is True:
        holds.insert(0,'mounted_school_whatsapp_legacy_financial_coupling_requires_quarantine_evidence')
    if evidence.get('attendance_roster_coverage',{}).get('possible_post_close_full_roster_unsaved') is True:
        holds.insert(0,'current_schoolday_full_attendance_roster_unsaved_after_close_requires_investigation')
    if evidence.get('timetable_collision_scope',{}).get('structural_timetable_valid') is not True:
        holds.insert(0,'active_timetable_unapproved_teacher_collisions_or_incomplete_periods')
    if evidence.get('storage_headroom',{}).get('headroom_ok') is not True:
        holds.insert(0,'insufficient_space_for_safe_release_and_restore_rehearsal')
    if not infrastructure:
        holds.insert(0,'read_only_operational_preflight_failed')
    return {'status':'RELEASE_HOLD','operational_checks_pass':infrastructure,
            'frontend_attestation_pass':attested,'unresolved_release_gates':holds,
            'production_deployed_by_this_check':False,'safe_to_remove_timetable_ingress_quarantine':False}

def main():
    actions={
        'database':inspect_database,'backup':inspect_backup,'frontend':inspect_frontend,
        'rollback':inspect_rollback,'source_privacy_inventory':inspect_source_privacy,
        'backend_source_inventory':inspect_backend_preservation,
        'backend_listener':backend_listener.inspect,
        'owner_academic_authenticity':owner_academic.inspect,
        'firstterm_snapshot_drift':result_drift.inspect,
        'frontend_artifact_closure':inspect_frontend_artifact_closure,
        'exam_attendance_tenant_scope':exam_attendance_scope.inspect,
        'academic_delivery_integrity':academic_integrity.inspect,
        'storage_headroom':disk_headroom.inspect,
        'timetable_collision_scope':timetable_collision.inspect,
        'lesson_coverage':lesson_coverage.inspect,
        'cross_product_boundary':product_boundary.inspect,
        'school_whatsapp_log_privacy':whatsapp_log_privacy.inspect,
        'school_whatsapp_phone_scope':whatsapp_phone_scope.inspect,
        'attendance_roster_coverage':inspect_attendance_coverage,
        'fee_ledger_integrity':inspect_fees_ledger,
        'restricted_catalog_and_firstterm':inspect_signed_and_history,
        'http':inspect_http,
    }
    evidence={}
    for label,fn in actions.items():
        try:
            evidence[label]=fn()
        except Exception as e:
            evidence[label]={'pass':False,'error_type':type(e).__name__}
    verdict=classify(evidence)
    report={'schema':'ASSPS_ONE_UNIFIED_READONLY_RELEASE_FENCE_V1',
            'observed_at_utc':datetime.now(timezone.utc).isoformat(),
            'evidence':evidence,'verdict':verdict}
    print(json.dumps(report,indent=2,sort_keys=True))
    # Distinguish safe but held (2) from genuine operational check failure (3).
    raise SystemExit(2 if verdict['operational_checks_pass'] else 3)

if __name__=='__main__':
    main()
