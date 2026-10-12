#!/usr/bin/env python3
"""Non-destructive, tenant-scoped financial integrity *signals* (not accounting edits).

The absence of perfect amount arithmetic may be legitimate imported arrears,
discounts or adjustments. Counts are advisory until authorized ledger review.
No student/challan IDs or personal/payment details appear in stdout.
"""
import argparse
import subprocess
import sys

SQL="""BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT 'CHALLANS_TOTAL',count(*) FROM fee_challans WHERE school_id=1;
SELECT 'LEDGER_TOTAL',count(*) FROM fee_payment_transactions WHERE school_id=1;
SELECT 'CHALLAN_AMOUNT_PAID_EXCEEDS',count(*) FROM fee_challans WHERE school_id=1 AND paid_amount>amount+0.01;
SELECT 'BALANCE_MISMATCH_CLAMPED_AMOUNT',count(*) FROM fee_challans WHERE school_id=1 AND abs(remaining_balance-GREATEST(amount-paid_amount,0))>0.01;
SELECT 'BALANCE_MISMATCH_CLAMPED_GROSS',count(*) FROM fee_challans WHERE school_id=1 AND abs(remaining_balance-GREATEST(gross_total-paid_amount,0))>0.01;
SELECT 'AMOUNT_DIFF_GROSS',count(*) FROM fee_challans WHERE school_id=1 AND abs(amount-gross_total)>0.01;
SELECT 'LEDGER_SUM_DISAGREES_PAID',count(*) FROM fee_challans f JOIN (SELECT school_id,challan_id,sum(amount) amount FROM fee_payment_transactions WHERE school_id=1 GROUP BY school_id,challan_id) t ON t.challan_id=f.id AND t.school_id=f.school_id WHERE f.school_id=1 AND abs(COALESCE(f.paid_amount,0)-t.amount)>0.01;
SELECT 'LATEST_PAYMENT_CUMULATIVE_DISAGREES_PAID',count(*) FROM fee_challans f JOIN LATERAL (SELECT cumulative_paid FROM fee_payment_transactions t WHERE t.challan_id=f.id AND t.school_id=f.school_id ORDER BY t.id DESC LIMIT 1) last ON true WHERE f.school_id=1 AND abs(COALESCE(f.paid_amount,0)-last.cumulative_paid)>0.01;
SELECT 'PAID_STATUS_NONZERO_BALANCE',count(*) FROM fee_challans WHERE school_id=1 AND status='paid' AND remaining_balance>0.01;
SELECT 'UNPAID_STATUS_POSITIVE_PAYMENT',count(*) FROM fee_challans WHERE school_id=1 AND status='unpaid' AND paid_amount>0.01;
SELECT 'MISMATCHES_LEGACY_NO_SOURCE',count(*) FROM fee_challans WHERE school_id=1 AND fee_source IS NULL AND abs(remaining_balance-GREATEST(amount-paid_amount,0))>0.01;
SELECT 'MISMATCHES_IMPORTED_SOURCE',count(*) FROM fee_challans WHERE school_id=1 AND fee_source IS NOT NULL AND abs(remaining_balance-GREATEST(amount-paid_amount,0))>0.01;
COMMIT;
"""
REQUIRED=('CHALLANS_TOTAL','LEDGER_TOTAL','CHALLAN_AMOUNT_PAID_EXCEEDS',
 'BALANCE_MISMATCH_CLAMPED_AMOUNT','BALANCE_MISMATCH_CLAMPED_GROSS','AMOUNT_DIFF_GROSS',
 'LEDGER_SUM_DISAGREES_PAID','LATEST_PAYMENT_CUMULATIVE_DISAGREES_PAID',
 'PAID_STATUS_NONZERO_BALANCE','UNPAID_STATUS_POSITIVE_PAYMENT',
 'MISMATCHES_LEGACY_NO_SOURCE','MISMATCHES_IMPORTED_SOURCE')
HARD_FAIL=('LEDGER_SUM_DISAGREES_PAID','LATEST_PAYMENT_CUMULATIVE_DISAGREES_PAID',
 'PAID_STATUS_NONZERO_BALANCE','UNPAID_STATUS_POSITIVE_PAYMENT')
REVIEW=('CHALLAN_AMOUNT_PAID_EXCEEDS','BALANCE_MISMATCH_CLAMPED_AMOUNT',
 'BALANCE_MISMATCH_CLAMPED_GROSS','AMOUNT_DIFF_GROSS')

def parse(text):
 rows=[x.strip() for x in text.splitlines() if x.strip()]
 if rows[0]!='BEGIN' or rows[-1]!='COMMIT':raise ValueError('Not a complete read-only snapshot')
 mapping={}
 for row in rows[1:-1]:
  name,sep,count=row.partition('|')
  if not sep or name not in REQUIRED or name in mapping or not count.isdecimal():
   raise ValueError('Unexpected report field')
  mapping[name]=int(count)
 if set(mapping)!=set(REQUIRED):raise ValueError('Incomplete financial review')
 return mapping

def main():
 p=argparse.ArgumentParser(description=__doc__)
 p.add_argument('--strict',action='store_true',help='Fail if anything requires finance authority review')
 args=p.parse_args()
 result=subprocess.run(['runuser','-u','postgres','--','psql','-X','-A','-t',
  '-v','ON_ERROR_STOP=1','-p','5432','-d','apexos'],input=SQL,text=True,capture_output=True,timeout=22)
 if result.returncode:raise RuntimeError('Fee ledger read-only snapshot unavailable')
 rows=parse(result.stdout)
 for key in REQUIRED:
  state='PASS' if rows[key]==0 or key in ('CHALLANS_TOTAL','LEDGER_TOTAL') else ('HOLD' if key in HARD_FAIL else 'REVIEW')
  print(f'{state} {key}={rows[key]}')
 if rows['BALANCE_MISMATCH_CLAMPED_AMOUNT'] != rows['MISMATCHES_LEGACY_NO_SOURCE']+rows['MISMATCHES_IMPORTED_SOURCE']:
  raise RuntimeError('Finance classification drift')
 print('READ_ONLY_ACCOUNTING_SIGNALS_ONLY_NO_LEDGER_MUTATIONS')
 if any(rows[x] for x in HARD_FAIL):return 2
 if args.strict and any(rows[x] for x in REVIEW):return 2
 return 0

if __name__=='__main__':
 try:sys.exit(main())
 except Exception as error:
  print('FINANCE_READONLY_RECONCILIATION_UNAVAILABLE '+type(error).__name__,file=sys.stderr)
  sys.exit(2)
