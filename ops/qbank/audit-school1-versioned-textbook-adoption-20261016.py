#!/usr/bin/env python3
"""School-1 adoption evidence inventory. Schema rows are NOT adoption approval."""
import datetime
import json
import os
from pathlib import Path
import subprocess
import tempfile

OUT=Path('/var/lib/assps-grade910-sourceclaims/school-adoption-inventory.json')
SQL="""BEGIN TRANSACTION READ ONLY;
SELECT json_build_object(
 'sessionVersions',(SELECT count(*) FROM academic_session_versions WHERE school_id=1),
 'curriculumProfileVersions',(SELECT count(*) FROM curriculum_profile_versions WHERE school_id=1),
 'resourceBooks',(SELECT count(*) FROM resource_books WHERE school_id=1),
 'resourceVersions',(SELECT count(*) FROM resource_versions WHERE school_id=1),
 'learningScopeVersions',(SELECT count(*) FROM learning_scope_versions WHERE school_id=1),
 'schoolAcademicApprovalEvents',(SELECT count(*) FROM school_academic_approval_events WHERE school_id=1)
)::text;
COMMIT;"""
def interpret(values):
    keys=['sessionVersions','curriculumProfileVersions','resourceBooks',
          'resourceVersions','learningScopeVersions','schoolAcademicApprovalEvents']
    if not isinstance(values,dict) or not all(isinstance(values.get(k),int) and values[k]>=0 for k in keys):
        raise ValueError('INVALID_VERSIONED_ADOPTION_INVENTORY')
    counts={k:values[k] for k in keys}
    evidence=bool(values['sessionVersions'] and values['curriculumProfileVersions']
                  and values['resourceVersions'] and values['learningScopeVersions'])
    return {
      'schema':'ASSPS_SCHOOL1_VERSIONED_ADOPTION_EVIDENCE_INVENTORY_V1',
      'observedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),
      'schoolId':1,'counts':counts,
      'potentialVersionedAdoptionMappingToReview':evidence,
      'schoolEditionAdoptionVerifiedByThisAudit':False,
      'approvedForCurrentAcademicSession':False,
      'academicQuestionApprovalGained':0,
      'studentOrQuestionDbWrites':0,
      'interpretation':('VERSION_RECORDS_EXIST_REQUIRE_AUTHENTIC_SCHOOL_SESSION_EDITION_LINK'
                        if evidence else 'NO_COMPLETE_SCHOOL_VERSIONED_ADOPTION_EVIDENCE_CHAIN'),
      'otherSchoolEvidenceSourcesExhausted':False
    }
def collect():
    p=subprocess.run(['runuser','-u','postgres','--','psql','-X','-At','-v','ON_ERROR_STOP=1',
                      '-d','apexos','-c',SQL],capture_output=True,text=True,timeout=25)
    if p.returncode:raise RuntimeError('READ_ONLY_ADOPTION_INVENTORY_QUERY_FAILED')
    line=[x for x in p.stdout.splitlines() if x.startswith('{')]
    if len(line)!=1:raise RuntimeError('MISSING_VERSIONED_ADOPTION_COUNTS')
    return interpret(json.loads(line[0]))
def save(target,data):
    target.parent.mkdir(parents=True,mode=0o700,exist_ok=True)
    if target.parent.stat().st_mode&0o077:raise ValueError('ROOT_ONLY_EVIDENCE_PATH_REQUIRED')
    fd,name=tempfile.mkstemp(dir=target.parent,prefix='.adoption-')
    try:
        os.fchmod(fd,0o600)
        with os.fdopen(fd,'w') as f:
            json.dump(data,f,sort_keys=True,indent=2);f.write('\n')
        os.replace(name,target)
    finally:
        if os.path.exists(name):os.unlink(name)
if __name__=='__main__':
    x=collect();save(OUT,x);print(json.dumps(x,sort_keys=True))
