#!/usr/bin/env python3
"""Offline pg_dumpall global-role replay planning for PG16->PG18 test only.

Strip PG16 GRANTED BY on a verified password-free pg_dumpall roles-only export
for disposable PG18 replay, preserving role names, memberships and options.
Never deploy transformed roles to school production. GRANTOR semantics differ.
"""
import argparse
import hashlib
import json
import pathlib
import re
import sys

GRANT = re.compile(r'^GRANT\s+.+?\s+TO\s+.+?\s+WITH\s+(?:INHERIT\s+(?:TRUE|FALSE)|ADMIN\s+(?:TRUE|FALSE)|SET\s+(?:TRUE|FALSE))(?:\s*,?\s*(?:INHERIT|ADMIN|SET)\s+(?:TRUE|FALSE))*\s+GRANTED\s+BY\s+(?:"(?:[^"]|"")*"|[A-Za-z_][A-Za-z0-9_$]*)\s*;$',re.IGNORECASE)
ATTR = re.compile(r'\s+GRANTED\s+BY\s+(?:"(?:[^"]|"")*"|[A-Za-z_][A-Za-z0-9_$]*)\s*;$',re.IGNORECASE)
def sha(data): return hashlib.sha256(data).hexdigest()

def transform(source,expected_sha,expected_roles,expected_grants):
    if len(expected_sha)!=64 or sha(source)!=expected_sha:
        raise ValueError('SOURCE_HASH_DRIFT')
    text=source.decode('utf-8')
    if '\x00' in text or re.search(r'(?i)\b(?:ENCRYPTED\s+)?PASSWORD\s+\x27[^\x27]*\x27',text):
        raise ValueError('SECRET_BEARING_OR_BINARY_SQL')
    roles=sum(line.startswith('CREATE ROLE ') for line in text.splitlines())
    grants=[line for line in text.splitlines() if line.startswith('GRANT ')]
    if roles!=expected_roles or len(grants)!=expected_grants:
        raise ValueError('SOURCE_ROLE_OR_GRANT_COUNT_DRIFT')
    if any(not GRANT.fullmatch(line) for line in grants):
        raise ValueError('UNSUPPORTED_GRANT_SYNTAX')
    out=[]
    for line in text.splitlines(keepends=True):
        if line.startswith('GRANT '):
            body=line.rstrip('\r\n')
            term='\r\n' if line.endswith('\r\n') else '\n' if line.endswith('\n') else ''
            updated=ATTR.sub(';',body)
            if updated==body or 'GRANTED BY' in updated.upper():
                raise ValueError('UNSAFE_GRANT_REWRITE')
            out.append(updated+term)
        else: out.append(line)
    result=''.join(out).encode('utf-8')
    if len(result)>2*len(source) or len(result)==0:
        raise ValueError('IMPOSSIBLE_REPLAY_OUTPUT')
    return result,{'source_sha256':sha(source),'transformed_sha256':sha(result),
        'role_create_statements':roles,'membership_grants':len(grants),
        'grantor_semantics_preserved':False,
        'membership_options_preserved':True,
        'test_only_no_production_apply':True}

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--source',type=pathlib.Path,required=True)
    p.add_argument('--expected-source-sha256',required=True)
    p.add_argument('--expected-roles',type=int,required=True)
    p.add_argument('--expected-grants',type=int,required=True)
    p.add_argument('--output',type=pathlib.Path,required=True)
    a=p.parse_args()
    if not str(a.output.resolve()).startswith('/root/workspace/assps-lesson-certification-20261026/'):
        raise SystemExit('HOLD: destination not isolated restricted evidence')
    if a.output.exists():raise SystemExit('HOLD: refuse overwrite')
    try:
        result,metadata=transform(a.source.read_bytes(),a.expected_source_sha256,a.expected_roles,a.expected_grants)
        a.output.write_bytes(result);a.output.chmod(0o600)
        print(json.dumps(metadata,sort_keys=True))
    except (OSError,ValueError,UnicodeError) as ex:
        print(json.dumps({'status':'HOLD','reason':str(ex)[:90]}));return 3
    return 0
if __name__=='__main__':sys.exit(main())
