#!/usr/bin/env python3
"""Read-only full-platform tenant-key and school-identity relationship audit.

Outputs only aggregate row counts, no student, staff, or financial identities.
Never attempts automated accounting corrections or database migrations.
"""
import json
import subprocess
import sys

TABLES=('students','attendance','fee_challans','employees','exams','users')
COUNTS_SQL=' UNION ALL '.join(
    "SELECT '{name}', count(*)::bigint, "
    "count(*) FILTER (WHERE t.tenant_id IS NOT NULL AND "
    "s.tenant_id IS DISTINCT FROM t.tenant_id)::bigint, "
    "count(*) FILTER (WHERE s.id IS NULL)::bigint, "
    "count(*) FILTER (WHERE t.tenant_id IS NULL)::bigint "
    "FROM public.{name} t LEFT JOIN public.schools s ON s.id=t.school_id".format(name=name)
    for name in TABLES)
SQL=('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;\n'
     +COUNTS_SQL+';\n'
     +"SELECT 'DUPLICATE_TENANT_KEYS',count(*)::bigint FROM "
      "(SELECT tenant_id FROM public.schools WHERE tenant_id IS NOT NULL "
      "GROUP BY tenant_id HAVING count(*)>1) q;\n"
     +'COMMIT;')


def parse_result(text):
    rows={}
    for line in text.splitlines():
        if line in ('BEGIN','COMMIT') or not line:continue
        parts=line.split('|')
        name=parts[0]
        if name in rows or name not in TABLES+('DUPLICATE_TENANT_KEYS',):
            raise ValueError('Unknown/duplicate tenant audit row')
        expected_fields=2 if name=='DUPLICATE_TENANT_KEYS' else 5
        if len(parts)!=expected_fields:raise ValueError('Malformed tenant audit row')
        counts=tuple(int(c) for c in parts[1:])
        if any(x<0 for x in counts):raise ValueError('Invalid negative aggregate')
        rows[name]=counts
    if set(rows)!=set(TABLES)|{'DUPLICATE_TENANT_KEYS'}:
        raise ValueError('Incomplete tenant-key audit')
    if not text.startswith('BEGIN\n') or not text.rstrip().endswith('COMMIT'):
        raise ValueError('Read-only transaction incomplete')
    return rows


def evaluate(rows):
    alerts=[]
    if rows['DUPLICATE_TENANT_KEYS'][0]:alerts.append('nonunique_school_tenant_keys')
    for table in TABLES:
        total,mismatch,orphans,nulls=rows[table]
        if mismatch:alerts.append(table+':school_tenant_mismatch')
        if orphans:alerts.append(table+':orphan_school_reference')
        if nulls:alerts.append(table+':legacy_null_tenant_key_review')
    severe=[x for x in alerts if not x.endswith(':legacy_null_tenant_key_review')]
    return {'status':'HOLD' if severe else 'WARN' if alerts else 'PASS',
            'alerts':alerts, 'read_only':True}


def main():
    argv=['runuser','-u','postgres','--','psql','-X','-A','-t',
          '-v','ON_ERROR_STOP=1','-p','5432','-d','apexos','-c',SQL]
    result=subprocess.run(argv,capture_output=True,text=True,timeout=20)
    if result.returncode:raise RuntimeError('Read-only tenant data inspection failed')
    rows=parse_result(result.stdout)
    outcome=evaluate(rows)
    print(json.dumps({'outcome':outcome,'tables':{k:rows[k] for k in TABLES},
                      'duplicate_tenant_keys':rows['DUPLICATE_TENANT_KEYS'][0]},indent=2))
    return 2 if outcome['status']=='HOLD' else 0

if __name__=='__main__':
    try:sys.exit(main())
    except (ValueError, RuntimeError, subprocess.TimeoutExpired) as error:
        print('TENANT_KEY_AUDIT_NO_GO '+type(error).__name__,file=sys.stderr)
        sys.exit(2)
