#!/usr/bin/env python3
"""Ensures source Vite builds ship the exact tested A336 navigation implementation."""
from __future__ import annotations
import hashlib
import sys
from pathlib import Path

def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main() -> int:
    root=Path(__file__).resolve().parents[1]
    source=root/'public/assets/assps-a336-unified-navigation-20261120.js'
    vetted=root/'production-release-custody/2026-11-20-1713/assets/assps-a336-unified-navigation-20261120.js'
    html=(root/'index.html').read_text()
    name='/assets/assps-a336-unified-navigation-20261120.js'
    assert html.count(name)==1,'Exactly one navigation script must appear in source index'
    assert '<script defer src="'+name+'"></script>' in html,'Navigation must execute before the app module'
    assert source.exists() and vetted.exists()
    assert digest(source)==digest(vetted),'Source navigation differs from vetted A336 production file'
    # Preserve the existing CSS cascade in its exact deployed order.
    import re
    approved_index=(root/'production-release-custody/2026-11-20-1713/index.html').read_text()
    names=re.findall(r'<link rel="stylesheet" href="(/assets/DailyDiaryWorkspace-[^"]+\.css)"\s*/>',approved_index)
    assert len(names)==7,'Unexpected Diary presentation stylesheet count'
    for value in names:
        actual=root/'public'/value.lstrip('/')
        approved=root/'production-release-custody/2026-11-20-1713'/value.lstrip('/')
        assert actual.is_file() and approved.is_file(),value+' CSS missing'
        assert digest(actual)==digest(approved),value+' CSS has drifted'
    positions=[html.find(value) for value in names]
    assert all(pos>0 for pos in positions) and positions==sorted(positions),'Diary CSS order must match live cascade'
    assert positions[0]>html.find('/src/main.jsx'),'Diary CSS should override bundled base styles'
    print('A335_SOURCE_DIARY_CSS_PARITY_PASS',len(names))

    print('A335_SOURCE_NAV_PARITY_PASS',digest(source))
    return 0

if __name__=='__main__':
    try:sys.exit(main())
    except Exception as error:
        print('A335_SOURCE_NAV_PARITY_BLOCKED',str(error),file=sys.stderr)
        sys.exit(2)

