#!/bin/sh
# Read-only release gate for public static upload filesystem aliases.
set -eu
python3 - "${1:-/etc/nginx/sites-enabled}" <<'PY'
from pathlib import Path
import re,sys
root=Path(sys.argv[1])
if not root.is_dir():
 print('BLOCKED: enabled-site directory unavailable');sys.exit(3)
sites=sorted(p for p in root.iterdir() if p.is_file())
if not sites:
 print('BLOCKED: no enabled-site configuration');sys.exit(3)
pattern=re.compile(r'\b(alias|root)\s+(/var/uploads(?:/[^;\s]*)?);')
bad=[]
for site in sites:
 for line in site.read_text(errors='replace').splitlines():
  active=line.split('#',1)[0]
  for m in pattern.finditer(active):
   if (m.group(1),m.group(2))!=('alias','/var/uploads/branding/'):
    bad.append(site.name)
if bad:
 for name in sorted(set(bad)):
  print('BLOCKED: direct private upload alias in '+name)
 print(f'NGINX_PRIVATE_UPLOAD_GATE_FAIL sites={len(sites)} unsafe_aliases={len(bad)}')
 sys.exit(2)
print(f'NGINX_PRIVATE_UPLOAD_ALIAS_GATE_PASS sites={len(sites)} (nginx -t and HTTP acceptance also required)')
PY
