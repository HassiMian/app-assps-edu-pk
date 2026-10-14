#!/usr/bin/env python3
"""Read-only, current-catalog signed tenant/RLS audit; NOT a production release certificate.

Never sets signing context, mutates privileges, uses actual staff sessions or
replaces the independent SaaS Core release gate. All checks are run on the
current authoritative PostgreSQL catalog rather than stale policy totals.
"""
import json
import subprocess
import sys

EXPECTED_ROLES = ('apex_app_runtime', 'apexos_user', 'assps_core_green_runtime',
                  'assps_marks_signed_runtime', 'assps_marks_signed_login')
SIGNED_ROLES = ('assps_core_green_runtime', 'assps_marks_signed_runtime')
GUARDED_TABLES_MINIMUM = 77  # reviewed source boundary; never silently reduce
GUARD_EXPR = 'core_security.signed_school_allowed(school_id)'
# Exact canonical predicate variants for protected tables with different keys.
PREDICATE_BY_TABLE = {
    'schools': 'core_security.signed_school_allowed(id)',
    'invoices': 'core_security.signed_tenant_key_allowed((tenant_id)::text)',
    'payments': 'core_security.signed_tenant_key_allowed((tenant_id)::text)',
    'subscription_requests': 'core_security.signed_tenant_key_allowed((tenant_id)::text)',
    'tenant_branding': 'core_security.signed_tenant_key_allowed((tenant_id)::text)',
}
def expected_predicate(table):
    return PREDICATE_BY_TABLE.get(table, GUARD_EXPR)

CATALOG = r"""
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT jsonb_build_object(
 'database', current_database(),
 'port', current_setting('port'),
 'roles', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'name',rolname,'can_login',rolcanlogin,'bypass',rolbypassrls,'super',rolsuper)
    ORDER BY rolname),'[]'::jsonb) FROM pg_roles
    WHERE rolname IN ('apex_app_runtime','apexos_user','assps_core_green_runtime',
                       'assps_marks_signed_runtime','assps_marks_signed_login')),
 'guards', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'table',p.tablename,'permissive',p.permissive,'roles',p.roles,
    'qual',p.qual,'with_check',p.with_check,
    'rls',c.relrowsecurity,'force',c.relforcerowsecurity)
    ORDER BY p.tablename),'[]'::jsonb)
    FROM pg_policies p JOIN pg_class c ON c.oid=to_regclass(
       format('%I.%I',p.schemaname,p.tablename))
    WHERE p.schemaname='public' AND p.policyname='core_signed_tenant_guard'),
 'allows', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'table',tablename,'roles',roles,'qual',qual,'with_check',with_check)
    ORDER BY tablename),'[]'::jsonb) FROM pg_policies
    WHERE schemaname='public' AND policyname='core_signed_tenant_allow'),
 'unforced_granted', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'table',c.relname,'owner',pg_get_userbyid(c.relowner),
    'rls',c.relrowsecurity,'force',c.relforcerowsecurity,
    'any_write',(
       has_table_privilege('assps_marks_signed_runtime',c.oid,'INSERT')
       OR has_table_privilege('assps_marks_signed_runtime',c.oid,'UPDATE')
       OR has_table_privilege('assps_marks_signed_runtime',c.oid,'DELETE')
       OR has_table_privilege('assps_core_green_runtime',c.oid,'INSERT')
       OR has_table_privilege('assps_core_green_runtime',c.oid,'UPDATE')
       OR has_table_privilege('assps_core_green_runtime',c.oid,'DELETE')),
    'policies',(SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'name',p.policyname,'qual',p.qual,'with_check',p.with_check,
      'roles',p.roles)),'[]'::jsonb) FROM pg_policies p
       WHERE p.schemaname='public' AND p.tablename=c.relname))
    ORDER BY c.relname),'[]'::jsonb)
    FROM pg_class c
    WHERE c.relnamespace='public'::regnamespace
    AND c.relkind IN ('r','p') AND NOT c.relforcerowsecurity
    AND (has_table_privilege('assps_marks_signed_runtime',c.oid,'SELECT')
      OR has_table_privilege('assps_marks_signed_runtime',c.oid,'INSERT')
      OR has_table_privilege('assps_marks_signed_runtime',c.oid,'UPDATE')
      OR has_table_privilege('assps_marks_signed_runtime',c.oid,'DELETE')
      OR has_table_privilege('assps_core_green_runtime',c.oid,'SELECT')
      OR has_table_privilege('assps_core_green_runtime',c.oid,'INSERT')
      OR has_table_privilege('assps_core_green_runtime',c.oid,'UPDATE')
      OR has_table_privilege('assps_core_green_runtime',c.oid,'DELETE'))),
 'policy_total',(SELECT count(*) FROM pg_policies WHERE schemaname='public')
);
COMMIT;
"""


def query(sql, timeout=22):
    proc = subprocess.run(
        ['runuser','-u','postgres','--','psql','-X','-q','-t','-A',
         '-v','ON_ERROR_STOP=1','-p','5432','-d','apexos','-c',sql],
        text=True, capture_output=True, timeout=timeout, check=False)
    if proc.returncode != 0:
        raise RuntimeError('Read-only restricted catalog query unavailable')
    return proc.stdout.strip()


def evaluate(facts):
    issues = []
    if facts.get('database') != 'apexos' or str(facts.get('port')) != '5432':
        issues.append('UNEXPECTED_DATABASE_OR_PORT')
    roles = {r['name']:r for r in facts.get('roles',[])}
    for name in EXPECTED_ROLES:
        r = roles.get(name)
        if not r or r.get('bypass') or r.get('super'):
            issues.append('MISSING_OR_PRIVILEGED_ROLE:'+name)
    for name in SIGNED_ROLES:
        if roles.get(name,{}).get('can_login') is not False:
            issues.append('SIGNED_RUNTIME_MUST_NOT_BE_LOGIN:'+name)
    if roles.get('assps_marks_signed_login',{}).get('can_login') is not True:
        issues.append('RESTRICTED_SIGNED_LOGIN_MISSING')
    guards = facts.get('guards',[])
    if len(guards) < GUARDED_TABLES_MINIMUM:
        issues.append('INSUFFICIENT_SIGNED_GUARD_COVERAGE')
    covered = set()
    for guard in guards:
        table = guard.get('table')
        if table in covered:
            issues.append('DUPLICATE_GUARD:'+str(table))
        covered.add(table)
        if guard.get('permissive') != 'RESTRICTIVE' or not guard.get('rls') or not guard.get('force'):
            issues.append('GUARD_RLS_POLICY_INVALID:'+str(table))
        if not set(SIGNED_ROLES).issubset(set(guard.get('roles') or [])):
            issues.append('GUARD_ROLE_INCOMPLETE:'+str(table))
        if guard.get('qual') != expected_predicate(table) or guard.get('with_check') != expected_predicate(table):
            issues.append('GUARD_MISSING_SIGNED_PREDICATE:'+str(table))
    allowed = set()
    for allow in facts.get('allows',[]):
        table = allow.get('table')
        allowed.add(table)
        if ('assps_marks_signed_runtime' not in (allow.get('roles') or []) or
            allow.get('qual') != expected_predicate(table) or allow.get('with_check') != expected_predicate(table)):
            issues.append('SIGNED_ALLOW_WEAK:'+str(table))
    for missing in sorted(covered - allowed):
        issues.append('SIGNED_ALLOW_MISSING:'+missing)
    review = []
    for rel in facts.get('unforced_granted',[]):
        # Policy exists != independently verified signed request-time denial.
        review.append(str(rel.get('table')))
        if rel.get('rls') is not True or rel.get('owner') in SIGNED_ROLES:
            issues.append('UNFORCED_ACCESS_HIGH_RISK:'+str(rel.get('table')))
        else:
            signed_read = any(p.get('qual') == GUARD_EXPR
                              for p in rel.get('policies',[]))
            # Read-only signed views need SELECT predicate; writable tables also
            # need reviewer-scoped signed WITH CHECK, not merely SELECT scoping.
            signed_write = any(
                GUARD_EXPR in str(p.get('with_check') or '') and
                'assps_academic_reviewer_authorized(' in str(p.get('with_check') or '')
                for p in rel.get('policies',[]))
            if not signed_read or (rel.get('any_write') and not signed_write):
                issues.append('UNFORCED_SIGNED_POLICY_MISSING:'+str(rel.get('table')))
    return {
        'catalog_preflight':'HOLD' if issues else 'PASS_WITH_INDEPENDENT_LIVE_ACCEPTANCE_REQUIRED',
        'production_release_certified':False,
        'policy_count_observed':facts.get('policy_total'),
        'signed_guard_tables':len(guards),
        'signed_allow_tables':len(allowed),
        'unforced_granted_tables_review':sorted(review),
        'issues':sorted(set(issues)),
        'required_independent_evidence':[
            'authorized_live_teacher_signed_session',
            'independent_real_peer_school_denial',
            'authenticated_unassigned_subject_denial',
            'core_owned_rollback_and_traffic_receipts'
        ]
    }


def main():
    facts=json.loads(query(CATALOG))
    result=evaluate(facts)
    # Explicit anonymous access denial on known unforced academic events.
    denial = ("BEGIN TRANSACTION READ ONLY; "
              "SET LOCAL ROLE assps_marks_signed_runtime; "
              "SELECT count(*) FROM public.school_academic_approval_events; ROLLBACK;")
    try:
        lines=query(denial).splitlines()
        result['unforced_academic_unsigned_zero_visible'] = lines == ['0']
    except (RuntimeError, subprocess.TimeoutExpired):
        result['unforced_academic_unsigned_zero_visible'] = False
    if not result['unforced_academic_unsigned_zero_visible']:
        result['issues'].append('ACADEMIC_EVENT_UNSIGNED_DENIAL_UNPROVEN')
        result['catalog_preflight']='HOLD'
    print(json.dumps(result,indent=2,sort_keys=True))
    return 0 if result['catalog_preflight']=='PASS_WITH_INDEPENDENT_LIVE_ACCEPTANCE_REQUIRED' else 2


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (RuntimeError,ValueError,subprocess.TimeoutExpired):
        print(json.dumps({'catalog_preflight':'HOLD','production_release_certified':False,
                          'issues':['READ_ONLY_CATALOG_UNAVAILABLE']}))
        sys.exit(2)
