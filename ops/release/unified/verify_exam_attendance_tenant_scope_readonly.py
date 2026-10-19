#!/usr/bin/env python3
"""Fail-closed read-only inspection for tenant-scoped exam attendance aggregates.

This is a static defense-in-depth guard, not a substitute for signed-role DB tests.
It never reads or modifies student rows, credentials, or production configuration.
"""
import hashlib
import json
import re
from pathlib import Path

LIVE = Path('/var/www/apex-backend/src/routes/examRoutes.js')
CANDIDATE = Path(__file__).resolve().parents[3] / 'al-siddique-backend/src/routes/examRoutes.js'
AGGREGATE = re.compile(
    r'LEFT\s+JOIN\s*\(\s*SELECT\s+(?P<select>.*?)\bFROM\s+attendance\s+'
    r'(?P<group>.*?)\)\s*att\s+ON\s+(?P<join>[^\n\r]+)',
    re.IGNORECASE | re.DOTALL,
)

def inspect_text(source):
    found=[]
    for match in AGGREGATE.finditer(source):
        selected=match.group('select')
        grouping=match.group('group')
        joining=match.group('join')
        group_ok=bool(re.search(r'\bGROUP\s+BY\s+school_id\s*,\s*student_id\b',grouping,re.I))
        select_ok=bool(re.search(r'\bschool_id\s*,\s*student_id\b',selected,re.I))
        join_ok=bool(re.search(r'\batt\.school_id\s*=\s*s\.school_id\s+AND\s+att\.student_id\s*=\s*s\.id\b',joining,re.I))
        found.append(select_ok and group_ok and join_ok)
    # Two result endpoints currently project school attendance. New / removed
    # projections require explicit review, rather than silently passing.
    return {'projections_detected':len(found), 'projections_scoped':sum(found),
            'scoped':len(found)==2 and all(found)}

def inspect_file(path):
    if path.is_symlink() or not path.is_file():
        raise ValueError('Source file missing or redirected')
    raw=path.read_bytes()
    report=inspect_text(raw.decode('utf-8'))
    report['sha256']=hashlib.sha256(raw).hexdigest()
    return report

def inspect(live=LIVE, candidate=CANDIDATE):
    a=inspect_file(live)
    b=inspect_file(candidate)
    return {'pass':True,'live_scoped':a['scoped'], 'candidate_scoped':b['scoped'],
            'live_projections':a['projections_detected'],
            'candidate_projections':b['projections_detected'],
            'live_sha256':a['sha256'], 'candidate_sha256':b['sha256'],
            'interpretation':'STATIC_GUARD_ONLY_NOT_AUTHENTIC_ROLE_OR_RLS_CERTIFICATION'}

if __name__=='__main__':
    try:
        result=inspect()
        print(json.dumps(result,sort_keys=True,indent=2))
        raise SystemExit(0 if result['live_scoped'] and result['candidate_scoped'] else 2)
    except (OSError, ValueError, UnicodeError) as e:
        print(json.dumps({'pass':False,'error_type':type(e).__name__}))
        raise SystemExit(3)
