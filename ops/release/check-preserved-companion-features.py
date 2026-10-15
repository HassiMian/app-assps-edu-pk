#!/usr/bin/env python3
"""Fail-closed source preservation gate; never changes production or approvals.

Versioned contract allows a reviewed future replacement or feature upgrade;
no fixed commit SHA is required. Scope: prevent the currently observed rich
Diary / Early Years source capabilities from being lost in an unrelated release.
"""
import argparse
import json
from pathlib import Path
import sys

HERE=Path(__file__).resolve().parent
CONTRACT=HERE/'preserved-companions-v1.json'
REPO=HERE.parents[1]


def evaluate(source, contract):
    source=Path(source)
    checks={}
    missing={}
    for relative,markers in contract['required_files'].items():
        location=source/relative
        try:text=location.read_text(encoding='utf-8')
        except (OSError,UnicodeError):text=''
        checks[relative]=bool(text) and all(marker in text for marker in markers)
        missing[relative]=[marker for marker in markers if marker not in text]
    result={'contract_version':contract['version'], 'checks':checks,
            'missing':missing,'result':'PASS' if all(checks.values()) else 'HOLD',
            'public_release_authorized':False,
            'next_step':'Review live-only Diary/Early Years source changes on clean current canonical source; run browser/print and independent Core release gates.'}
    return result


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--repo',default=str(REPO))
    parser.add_argument('--contract',default=str(CONTRACT))
    args=parser.parse_args()
    try:
        c=json.loads(Path(args.contract).read_text())
        if c.get('schema')!='ASSPS_PROTECTED_LIVE_COMPANION_FEATURES':raise ValueError('contract schema')
        result=evaluate(args.repo,c)
    except (OSError,ValueError) as error:result={'result':'HOLD','error':type(error).__name__}
    print(json.dumps(result,indent=2,sort_keys=True))
    return 0 if result['result']=='PASS' else 2

if __name__=='__main__':sys.exit(main())
