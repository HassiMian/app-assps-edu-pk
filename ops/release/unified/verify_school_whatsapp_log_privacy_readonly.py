#!/usr/bin/env python3
"""Fail-closed release preflight for identifiable school WhatsApp diagnostics.

Inspects source text only: no phone, message, account, network, broker or DB read.
A pass is limited to checked source lines, not a complete privacy certification.
"""
import json
import re
from pathlib import Path

LIVE=Path('/var/www/apex-backend/src/routes/whatsappRoutes.js')
CANDIDATE=Path(__file__).resolve().parents[3]/'al-siddique-backend/src/routes/whatsappRoutes.js'
LOG=re.compile(r'console\s*\.\s*(?:log|error|warn|info|debug)\s*\(')
INDIVIDUAL=re.compile(r'\$\{\s*(?:from|cleanTo|msgId|text|data\.messages\?\.\[0\]\?\.id)\b|text\.slice\(|(?:err|fallbackErr)\.message|JSON\.stringify\(data(?:\.error)?\s*\)')

def inspect_source(source):
    offenders=[]
    for n,line in enumerate(source.splitlines(),1):
        if LOG.search(line) and INDIVIDUAL.search(line):
            offenders.append(n)
    return {'direct_sensitive_log_lines':len(offenders),
            'sensitive_logging_detected':bool(offenders),
            'source_only_privacy_check':True}

def inspect(live=LIVE,candidate=CANDIDATE):
    for p in (live,candidate):
        if not p.is_file() or p.is_symlink():
            raise RuntimeError('School WhatsApp source file is missing/redirected')
    current=inspect_source(live.read_text(encoding='utf-8'))
    staged=inspect_source(candidate.read_text(encoding='utf-8'))
    return {'pass':True,'live':current,'candidate':staged,
            'candidate_log_scope_pass':staged['direct_sensitive_log_lines']==0,
            'live_sensitive_log_hold':current['direct_sensitive_log_lines']>0,
            'interpretation':'SOURCE_LINE_RISK_SCAN_ONLY_NOT_COMPLETE_MESSAGE_PRIVACY_CERTIFICATION'}

if __name__=='__main__':
    try:print(json.dumps(inspect(),indent=2,sort_keys=True))
    except (RuntimeError,OSError,UnicodeError) as err:
        print(json.dumps({'pass':False,'error_type':type(err).__name__}))
        raise SystemExit(3)
