#!/usr/bin/env python3
"""Read-only scoped paper *source* classifier, not a marks-policy approver.

Never infer official First Term paper maxima from unrelated chapter/monthly
paper vault, historical exam result denominators or software print fixtures.
"""
import json
import re
import subprocess
import sys

FIRST_TERM_PATTERN = re.compile(r'^first[\s_-]*term(?:[\s_-]*(?:exam(?:ination)?|paper))?$', re.I)

def eligible_type(raw):
    return isinstance(raw, str) and bool(FIRST_TERM_PATTERN.fullmatch(raw.strip()))

def paper_evidence(p):
    exam_type=(p.get('exam_type') or '').strip()
    status=(p.get('status') or '').strip().lower()
    total=p.get('total_marks')
    if status != 'approved':
        return {'status':'REJECT_UNAPPROVED_PAPER','id':p.get('id')}
    if not eligible_type(exam_type):
        return {'status':'REJECT_WRONG_ASSESSMENT_TYPE','id':p.get('id')}
    if type(total) is not int or total <= 0:
        return {'status':'REJECT_UNSUPPORTED_TOTAL','id':p.get('id')}
    return {'status':'REFERENCE_ONLY_NEEDS_ACTOR_AND_EXACT_OFFERING_MATCH',
            'id':p.get('id'),'class_name':p.get('class_name'),
            'subject_name':p.get('subject_name'),'total_marks':total}

def read_production(database='apexos',port=5432):
    if database!='apexos' or port!=5432:
        raise ValueError('Only known scoped live apexos:5432 is permitted')
    sql="""SELECT COALESCE(json_agg(to_jsonb(p) ORDER BY p.id),'[]'::json) FROM
      (SELECT id,class_name,subject_name,status,
          payload->'config'->>'examType' AS exam_type,
          CASE WHEN (payload->'config'->>'totalMarks') ~ '^[0-9]+$'
            THEN (payload->'config'->>'totalMarks')::int ELSE NULL END AS total_marks
        FROM paper_vault WHERE school_id=1 AND deleted_at IS NULL) p"""
    command=['sudo','-u','postgres','psql','-p','5432','-d','apexos',
             '-X','-t','-A','-v','ON_ERROR_STOP=1','-c',sql]
    p=subprocess.run(command,text=True,capture_output=True,timeout=25,check=False)
    if p.returncode:
        raise RuntimeError('Read-only school1 paper vault query failed')
    rows=json.loads(p.stdout.strip())
    decisions=[paper_evidence(row) for row in rows]
    candidates=[d for d in decisions if d['status'].startswith('REFERENCE_ONLY')]
    return {
      'school_id':1, 'exam_id':9,
      'vault_papers_total':len(rows),
      'wrong_assessment_type':sum(d['status']=='REJECT_WRONG_ASSESSMENT_TYPE' for d in decisions),
      'rejected_other':sum(d['status'].startswith('REJECT_') and d['status']!='REJECT_WRONG_ASSESSMENT_TYPE' for d in decisions),
      'first_term_reference_candidates':len(candidates),
      'authentic_subject_maxima_approved_by_this_script':0,
      'source_reference_candidates':candidates,
      'status':'SOURCE_REFERENCES_ONLY' if candidates else 'NO_FIRST_TERM_PAPER_SOURCES_IN_CURRENT_VAULT',
      'note':'Paper Vault approval is not an authenticated school Exam9 maxima approval. Historic denominators and unrelated tests are not sufficient.',
    }

if __name__ == '__main__':
    try:
        print(json.dumps(read_production(),sort_keys=True,indent=2))
    except Exception as exc:
        print(json.dumps({'status':'HOLD','reason':type(exc).__name__}))
        sys.exit(2)
