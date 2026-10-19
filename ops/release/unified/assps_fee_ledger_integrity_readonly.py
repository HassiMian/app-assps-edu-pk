#!/usr/bin/env python3
"""Read-only financial invariants; reports AGGREGATES ONLY, never identifies students or creates transactions."""
import json
import subprocess
from datetime import datetime,timezone

BASELINE_MINIMUMS = {'challans_total':905,'challans_school1':902,'payment_transactions_total':213}
NO_ANOMALIES = (
    'negative_challan_money','negative_transaction_money',
    'orphan_transactions','cross_school_transactions',
    'wrong_student_transactions','nonmonotonic_cumulative',
)
SQL = """
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout='10000ms';
SELECT 'challans_total|'||count(*) FROM public.fee_challans;
SELECT 'challans_school1|'||count(*) FROM public.fee_challans WHERE school_id=1;
SELECT 'payment_transactions_total|'||count(*) FROM public.fee_payment_transactions;
SELECT 'negative_challan_money|'||count(*) FROM public.fee_challans
 WHERE amount<0 OR paid_amount<0 OR remaining_balance<0 OR discount<0;
SELECT 'negative_transaction_money|'||count(*) FROM public.fee_payment_transactions
 WHERE amount<=0 OR cumulative_paid<0;
SELECT 'orphan_transactions|'||count(*) FROM public.fee_payment_transactions t
 LEFT JOIN public.fee_challans c ON c.id=t.challan_id WHERE c.id IS NULL;
SELECT 'cross_school_transactions|'||count(*) FROM public.fee_payment_transactions t
 JOIN public.fee_challans c ON c.id=t.challan_id WHERE t.school_id IS DISTINCT FROM c.school_id;
SELECT 'wrong_student_transactions|'||count(*) FROM public.fee_payment_transactions t
 JOIN public.fee_challans c ON c.id=t.challan_id WHERE t.student_id IS DISTINCT FROM c.student_id;
SELECT 'nonmonotonic_cumulative|'||count(*) FROM (
 SELECT cumulative_paid,
 LAG(cumulative_paid) OVER (PARTITION BY challan_id ORDER BY id) AS prior
 FROM public.fee_payment_transactions
) ledger WHERE ledger.prior IS NOT NULL AND ledger.cumulative_paid < ledger.prior;
ROLLBACK;
"""

def parse(text):
    records={}
    expected=set(BASELINE_MINIMUMS)|set(NO_ANOMALIES)
    for line in text.strip().splitlines():
        key,sep,raw=line.partition('|')
        if not sep or key not in expected or key in records or not raw.isdigit():
            raise ValueError('Unexpected financial aggregate evidence')
        records[key]=int(raw)
    if set(records)!=expected:
        raise ValueError('Financial aggregate evidence incomplete')
    return records

def assess(records):
    return (all(records[k]>=v for k,v in BASELINE_MINIMUMS.items()) and
            all(records[k]==0 for k in NO_ANOMALIES))

def main():
    res=subprocess.run(['runuser','-u','postgres','--','psql','-p','5432','-d','apexos',
                        '-X','-Atq','-v','ON_ERROR_STOP=1'],input=SQL,text=True,
                        capture_output=True,timeout=16,check=False)
    if res.returncode:
        raise SystemExit('HOLD: read-only fee audit unavailable')
    vals=parse(res.stdout)
    print(json.dumps({'observed_at_utc':datetime.now(timezone.utc).isoformat(),
                      'status':'PASS' if assess(vals) else 'HOLD',
                      'financial_integrity_aggregate_only':True,
                      'values':vals},indent=2))
    if not assess(vals):
        raise SystemExit(2)

if __name__=='__main__':
    main()
