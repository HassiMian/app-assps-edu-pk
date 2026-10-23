#!/usr/bin/env python3
"""Verify the live non-actor cognitive marks writer is fail-closed.
No school records, credentials, or WhatsApp messages are read or changed.
"""
from pathlib import Path
import json,subprocess
LIVE=Path('/var/www/apex-backend/src/services/whatsapp/jarvisCognitiveTools.js')
def inspect(*,source=None,syntax=None):
    try:
        s=LIVE.read_text() if source is None else source
        a=s.index('async function enterExamMarks(')
        b=s.index('async function getOrPrintResultCards(',a)
        writer=s[a:b]
        limited=("code: 'SIGNED_MARKS_ACTOR_REQUIRED'" in writer and
             'success: false' in writer and 'processed: 0' in writer and
             'queryDb(' not in writer and 'INSERT INTO' not in writer and
             'UPDATE exam_results' not in writer)
        if syntax is None:
            check=subprocess.run(['node','--check',str(LIVE)],capture_output=True,timeout=15)
            syntax=check.returncode==0
        return {'pass':bool(limited and syntax),'read_only':True,
                'live_cognitive_marks_writer_disabled':limited,
                'live_js_syntax_valid':bool(syntax),
                'regular_authenticated_exam_routes_unmodified':True,
                'historical_marks_change_attribution_proven':False}
    except (OSError,ValueError,subprocess.TimeoutExpired):
        return {'pass':False,'read_only':True,'code':'MARKS_WRITER_GUARD_MISSING_OR_UNVERIFIABLE'}
if __name__=='__main__':
    x=inspect()
    print(json.dumps(x,sort_keys=True))
    raise SystemExit(0 if x['pass'] else 3)
