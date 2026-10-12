#!/usr/bin/env python3
"""Export private school1 finance exception evidence, without database writes.

Only authorized root/DBA runtime. The output stays on the VPS in a root-only
archive and MUST NOT be attached to GitHub or chat. Independent finance review
is required before changing any fees.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

DEST=Path('/root/secure-archive/assps-finance-review-20261012')
DATA=DEST/'school1-fee-exceptions.private.json'
MANIFEST=DEST/'manifest.sha256'
SQL="""BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT json_build_object(
  'challan_id',id,'student_id',student_id,'month',month,'year',year,
  'fee_source',fee_source,'created_at',created_at,'status',status,
  'amount',amount,'gross_total',gross_total,'discount',discount,
  'previous_arrears',previous_arrears,'paid_amount',paid_amount,
  'remaining_balance',remaining_balance,
  'nominal_overpaid',paid_amount>amount+0.01,
  'nominal_balance_mismatch',abs(remaining_balance-GREATEST(amount-paid_amount,0))>0.01,
  'gross_balance_mismatch',abs(remaining_balance-GREATEST(gross_total-paid_amount,0))>0.01,
  'gross_amount_mismatch',abs(amount-gross_total)>0.01
)::text
FROM fee_challans
WHERE school_id=1 AND (
 paid_amount>amount+0.01 OR
 abs(remaining_balance-GREATEST(amount-paid_amount,0))>0.01 OR
 abs(remaining_balance-GREATEST(gross_total-paid_amount,0))>0.01 OR
 abs(amount-gross_total)>0.01
)
ORDER BY id;
COMMIT;
"""

def aggregate(rows):
 return {
  'exception_rows':len(rows),
  'nominal_overpaid':sum(bool(r['nominal_overpaid']) for r in rows),
  'nominal_balance_mismatch':sum(bool(r['nominal_balance_mismatch']) for r in rows),
  'gross_balance_mismatch':sum(bool(r['gross_balance_mismatch']) for r in rows),
  'gross_amount_mismatch':sum(bool(r['gross_amount_mismatch']) for r in rows)
 }

def parse(out):
 lines=[line.strip() for line in out.splitlines() if line.strip()]
 if not lines or lines[0]!='BEGIN' or lines[-1]!='COMMIT':raise ValueError('Read-only snapshot incomplete')
 rows=[json.loads(s) for s in lines[1:-1]]
 ids=[row['challan_id'] for row in rows]
 if len(set(ids))!=len(ids) or any(not isinstance(v,int) or v<=0 for v in ids):
  raise ValueError('Duplicate or malformed evidence identifier')
 for row in rows:
  if not any(row.get(key) for key in ('nominal_overpaid','nominal_balance_mismatch','gross_balance_mismatch','gross_amount_mismatch')):
   raise ValueError('Evidence row has no financial review signal')
 return rows

def main():
 if os.geteuid()!=0:raise PermissionError('Root operator required')
 if DATA.exists() or MANIFEST.exists():raise FileExistsError('No overwrite of prior financial review artifacts')
 process=subprocess.run(['runuser','-u','postgres','--','psql','-X','-A','-t','-v','ON_ERROR_STOP=1','-p','5432','-d','apexos'],input=SQL,text=True,capture_output=True,timeout=30)
 if process.returncode:raise RuntimeError('Read-only fee export unavailable')
 rows=parse(process.stdout)
 counts=aggregate(rows)
 if {k:counts[k] for k in ('nominal_overpaid','nominal_balance_mismatch','gross_balance_mismatch','gross_amount_mismatch')}!={
   'nominal_overpaid':14,'nominal_balance_mismatch':23,'gross_balance_mismatch':14,'gross_amount_mismatch':36}:
  raise RuntimeError('Aggregate counts differ from previously inspected live snapshot')
 DEST.mkdir(mode=0o700,parents=True,exist_ok=True)
 os.chmod(DEST,0o700)
 payload={'scope':'SCHOOL_1_PRIVATE_REVIEW_ONLY','read_only':True,'no_automatic_adjustments':True,
          'summary':counts,'exceptions':rows}
 raw=(json.dumps(payload,ensure_ascii=False,indent=2,default=str)+'\n').encode()
 fd=os.open(str(DATA),os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
 with os.fdopen(fd,'wb') as file:
  file.write(raw);file.flush();os.fsync(file.fileno())
 digest=hashlib.sha256(raw).hexdigest()
 fd=os.open(str(MANIFEST),os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
 with os.fdopen(fd,'w') as file:
  file.write(digest+'  '+DATA.name+'\n');file.flush();os.fsync(file.fileno())
 if hashlib.sha256(DATA.read_bytes()).hexdigest()!=digest:raise RuntimeError('Private evidence hash mismatch')
 print('PRIVATE_FINANCE_REVIEW_EVIDENCE_SHA256_PASS')
 for k,v in counts.items():print(k.upper()+'='+str(v))
 print('PRIVACY=ROOT_ONLY; PRODUCTION_SQL_WRITES=ZERO; GITHUB_PERSONAL_DATA=NONE')
 return 0

if __name__=='__main__':
 try:sys.exit(main())
 except Exception as e:
  print('FINANCE_PRIVATE_EVIDENCE_EXPORT_FAILED: '+type(e).__name__,file=sys.stderr)
  sys.exit(2)
