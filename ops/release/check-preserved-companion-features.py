#!/usr/bin/env python3
"""Fail-closed source preservation gate; never changes production or approvals.

Versioned contract allows a reviewed future replacement or feature upgrade;
no fixed commit SHA is required. Scope: prevent the currently observed rich
Diary / Early Years source capabilities from being lost in an unrelated release.
"""
import argparse
import json
import re
from pathlib import Path
import sys

HERE=Path(__file__).resolve().parent
CONTRACT=HERE/'preserved-companions-v1.json'
REPO=HERE.parents[1]


def reachability(dist):
    dist=Path(dist)
    assets=dist/'assets'
    try:html=(dist/'index.html').read_text()
    except OSError:return set()
    match=re.search(r'<script[^>]*src="/assets/([A-Za-z0-9_-]+\.js)"',html)
    if match is None:return set()
    pending=[match.group(1)];visited=set()
    while pending:
        name=pending.pop()
        if name in visited:continue
        visited.add(name)
        f=assets/name
        if not f.is_file() or '/' in name or '\\' in name:continue
        if name.endswith('.js'):
            text=f.read_text(errors='replace')
            for ref in re.findall(r'[A-Za-z0-9_-]+\.(?:js|css)',text):
                if ref not in visited and '-' in ref and (assets/ref).is_file():
                    pending.append(ref)
    return visited


def evaluate(source, contract, dist=None):
    source=Path(source)
    checks={}
    missing={}
    for relative,markers in contract['required_files'].items():
        location=source/relative
        try:text=location.read_text(encoding='utf-8')
        except (OSError,UnicodeError):text=''
        checks[relative]=bool(text) and all(marker in text for marker in markers)
        missing[relative]=[marker for marker in markers if marker not in text]
    runtime={}
    if dist is not None:
        assets=Path(dist)/'assets'; reachable=reachability(dist)
        refs={
          'rich_diary':[n for n in reachable if re.fullmatch(r'DailyDiaryWorkspace-[\w-]+\.js',n)],
          'early_years_editor':[n for n in reachable if re.fullmatch(r'EarlyYearsWorksheetEditor-[\w-]+\.js',n)],
          'early_years_printer':[n for n in reachable if re.fullmatch(r'printEarlyYearsPaper-[\w-]+\.js',n)]
        }
        for name,files in refs.items():
            checks['runtime_'+name+'_present']=len(files)==1
            if len(files)!=1:
                runtime[name]={'chunks':files,'status':'MISSING_OR_AMBIGUOUS'}
                continue
            filetext=(assets/files[0]).read_text(errors='replace')
            required={'rich_diary':['globalSubjectFontSize','globalDiaryFontSize','globalSubjectBold','footerFontSize','logoSizeMm'],
                      'early_years_editor':['printEarlyYearsPaper'],
                      'early_years_printer':['early-years-sheet-a4','iframe','4mm']}
            absent=[m for m in required[name] if m not in filetext]
            checks['runtime_'+name+'_feature_proof']=not absent
            runtime[name]={'chunk':files[0],'missing_markers':absent}
    result={'contract_version':contract['version'], 'checks':checks,
            'missing':missing,'runtime':runtime,'result':'PASS' if all(checks.values()) else 'HOLD',
            'public_release_authorized':False,
            'next_step':'Review live-only Diary/Early Years source changes on clean current canonical source; run browser/print and independent Core release gates.'}
    return result


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--repo',default=str(REPO))
    parser.add_argument('--contract',default=str(CONTRACT))
    parser.add_argument('--dist')
    args=parser.parse_args()
    try:
        c=json.loads(Path(args.contract).read_text())
        if c.get('schema')!='ASSPS_PROTECTED_LIVE_COMPANION_FEATURES':raise ValueError('contract schema')
        result=evaluate(args.repo,c,args.dist)
    except (OSError,ValueError) as error:result={'result':'HOLD','error':type(error).__name__}
    print(json.dumps(result,indent=2,sort_keys=True))
    return 0 if result['result']=='PASS' else 2

if __name__=='__main__':sys.exit(main())
