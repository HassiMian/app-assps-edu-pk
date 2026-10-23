#!/usr/bin/env python3
"""Create/check a privacy-preserving CURRENT snapshot checksum for future drift.
A current snapshot is NOT an academic award source or retrospective authorization.
Never reads credential tables or writes to production DB.
"""
import csv,hashlib,hmac,io,json,os,subprocess
from pathlib import Path
VAULT=Path('/root/secure-archive/assps-p23-firstterm-forward-seal-20261023')
SEAL=VAULT/'exam9_school1_snapshot.json'
KEY=VAULT/'hmac.key'
SQL='SELECT id,school_id,exam_id,student_id,subject,marks_obtained,total_marks,grade,result_status FROM public.exam_results WHERE school_id=1 AND exam_id=9 ORDER BY id'
def canonical(records):
 result=[]
 for row in records:
  result.append('|'.join(str(row.get(k) if row.get(k) is not None else '<NULL>') for k in
   ('id','school_id','exam_id','student_id','subject','marks_obtained',
    'total_marks','grade','result_status')))
 return ('\n'.join(result)+'\n').encode()
def inspect(*,rows=None,key=None):
 if rows is None:
  q=subprocess.run(['runuser','-u','postgres','--','psql','-X','--csv','-p','5432','-d','apexos',
   '-v','ON_ERROR_STOP=1','-c',SQL],capture_output=True,text=True,timeout=20)
  if q.returncode:raise ValueError('LIVE_READ_ONLY_QUERY_FAILED')
  rows=list(csv.DictReader(io.StringIO(q.stdout)))
 if not rows or any(str(x.get('school_id'))!='1' or str(x.get('exam_id'))!='9' for x in rows):
  raise ValueError('UNEXPECTED_SCHOOL_OR_EXAM')
 ids=[str(r.get('id')) for r in rows]
 if len(ids)!=len(set(ids)):raise ValueError('DUPLICATE_EXAM_RESULT_ID')
 if key is None:key=KEY.read_bytes()
 digest=hmac.new(key,canonical(rows),hashlib.sha256).hexdigest()
 return {'school_id':1,'exam_id':9,'rows':len(rows),
  'numeric_zero_count':sum(x.get('marks_obtained') is not None and str(x.get('marks_obtained'))!=''
   and float(x['marks_obtained'])==0 for x in rows),
  'hmac_sha256':digest,
  'checksum_is_not_authorization':True,'database_writes':0}
def save_new():
 if SEAL.exists():raise FileExistsError('EXISTING_SEAL_NEVER_AUTO_REBASELINED')
 VAULT.mkdir(parents=True,exist_ok=True,mode=0o700)
 if not KEY.exists():
  with open(KEY,'xb') as f:f.write(os.urandom(32));f.flush();os.fsync(f.fileno())
  os.chmod(KEY,0o600)
 body=inspect()
 raw=(json.dumps(body,sort_keys=True,indent=2)+'\n').encode()
 with open(SEAL,'xb') as f:f.write(raw);f.flush();os.fsync(f.fileno())
 os.chmod(SEAL,0o600)
 return body
def check():
 expected=json.loads(SEAL.read_text())
 current=inspect()
 return {'pass':current['hmac_sha256']==expected['hmac_sha256'],
  'original_count':expected['rows'],'current_count':current['rows'],
  'original_zero_count':expected['numeric_zero_count'],
  'current_zero_count':current['numeric_zero_count'],
  'read_only':True,'auto_rebaseline':False,
  'historic_actor_attribution_proven':False}
if __name__=='__main__':
 import sys
 status=sys.argv[1] if len(sys.argv)>1 else 'check'
 print(json.dumps(save_new() if status=='seal' else check(),sort_keys=True))
