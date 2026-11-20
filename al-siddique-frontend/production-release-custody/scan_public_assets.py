#!/usr/bin/env python3
"""Scan vetted frontend release references for high-confidence exposed credentials."""
import argparse
import json
import re
import sys
from pathlib import Path

PATTERNS={
 'private_key_block':re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
 'github_token':re.compile(r'gh[psuor]_[A-Za-z0-9]{25,}'),
 'openai_style_key':re.compile(r'sk-(?:proj-)?[a-zA-Z0-9_-]{25,}'),
 'aws_access_key':re.compile(r'AKIA[0-9A-Z]{16}'),
 'jwt_bearer_literal':re.compile(r'eyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{12,}'),
 'connection_password_in_uri':re.compile(r'(?i)(?:postgres|mysql|mongodb)(?:ql)?://[^\s:/@]+:[^\s@/]{5,}@'),
}

def scan(root:Path):
    data=json.loads((root/'manifest.json').read_text())
    issues=[]
    for row in data['reference_files']:
        rel=row['path']
        if not rel.startswith('/assets/') or '..' in Path(rel).parts:raise ValueError('Unsafe reference')
        path=root/rel.lstrip('/')
        if not path.is_file() or path.is_symlink():raise ValueError('Missing file '+rel)
        content=path.read_text(errors='replace')
        for name,regex in PATTERNS.items():
            hits=len(regex.findall(content))
            if hits:issues.append({'asset':rel,'pattern':name,'hits':hits})
    return {'scanned_references':len(data['reference_files']),'high_confidence_matches':sum(x['hits'] for x in issues),'items':issues}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--snapshot',type=Path,required=True)
    args=parser.parse_args()
    r=scan(args.snapshot.resolve(strict=True))
    print(json.dumps(r,indent=2))
    return 2 if r['high_confidence_matches'] else 0

if __name__=='__main__':
    try:sys.exit(main())
    except Exception as exc:
        print('A335_ASSET_SCAN_FAILED',str(exc),file=sys.stderr)
        sys.exit(3)

