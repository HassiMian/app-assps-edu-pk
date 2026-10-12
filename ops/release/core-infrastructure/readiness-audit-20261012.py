#!/usr/bin/env python3
"""Read-only SaaS Core production resilience/security checkpoint.
No restart, write, exposed credential, firewall change, migration or schedule.
"""
import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

APP = Path('/etc/nginx/sites-enabled/apex-app-ssl')
CONNECT = Path('/etc/nginx/sites-enabled/apex-api-ssl')
BACKUP = Path('/root/assps-release-backups/promote-audit-post-live-20261012')
CORE_SOURCE = Path('/root/workspace/assps-resultcards-core-review-20261012')
EXPECTED_CONNECT_SHA = '835cc09f775e6f329af7996769a43b4e83060b92e0c953b0778db2b609df8c5b'


def command(args, timeout=10):
    p = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
    if p.returncode != 0:
        raise RuntimeError('Command failed: ' + args[0])
    return p.stdout


def http_status(url):
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent':'ASSPS-readonly-core-audit'}), timeout=7) as response:
            return response.status
    except urllib.error.HTTPError as error:
        return error.code
    except Exception:
        return None


def sha(path):
    h = hashlib.sha256()
    with open(path, 'rb') as stream:
        while block := stream.read(1024 * 1024):
            h.update(block)
    return h.hexdigest()


def parse_ss(text):
    """Return TCP server listener addresses without revealing client sockets."""
    result = {}
    for line in text.splitlines():
        columns = line.split()
        if len(columns) < 4: continue
        local = columns[3] if columns[0] == 'LISTEN' else (columns[4] if len(columns)>4 else '')
        m = re.search(r':(3000|5000|5091|5432|55432)$', local)
        if m: result.setdefault(m.group(1), set()).add(local.rsplit(':',1)[0].strip('[]'))
    return {p: sorted(v) for p,v in result.items()}


def public_bind(addresses):
    return any(ip in ('0.0.0.0','*','::') for ip in addresses)

def loopback_only(addresses):
    return bool(addresses) and all(ip in ('127.0.0.1','::1') for ip in addresses)


def evaluate(facts):
    """Pure policy; hard failures do not trigger any automatic remedial action."""
    checks=[]
    def add(name, status, detail): checks.append({'name':name,'status':status,'detail':detail})
    percent=facts['disk_percent']; free=facts['disk_free_gib']
    add('filesystem_capacity', 'HOLD' if free < 1.5 else 'WARN' if percent >= 90 else 'PASS',
        f'{percent}% used; {free:.2f} GiB free; protected caches/worktrees never auto-deleted')
    add('canonical_release_source', 'PASS' if facts['git_equal'] else 'HOLD',
        'Core source HEAD must exactly match remote release branch')
    add('frontend_artifact', 'PASS' if facts['app_root_exists'] and facts['meta_source_valid'] else 'HOLD',
        'Active Nginx root must exist and its exact frontend SHA must be canonical ancestry')
    add('nginx_connect_preservation', 'PASS' if facts['nginx_syntax'] and facts['connect_sha_ok'] else 'HOLD',
        'NGINX syntax and separate APEX Connect vhost SHA')
    add('tls_app_and_connect', 'PASS' if facts['public_app']==200 and facts['connect']==200 else 'HOLD',
        'HTTPS app and Connect /health endpoints HTTP200')
    add('signed_green', 'PASS' if facts['green']==200 and loopback_only(facts['listeners'].get('5091',[])) else 'HOLD',
        'Private signed green healthy and bound to loopback')
    add('postgres_loopback', 'PASS' if all(loopback_only(facts['listeners'].get(p,[])) for p in ('5432','55432')) else 'HOLD',
        'Production and restore PostgreSQL TCP limited to localhost')
    add('signed_policy_counts', 'PASS' if facts['policy_count']==368 else 'HOLD',
        '368 known live RLS policies including 212 legacy and two audit policies')
    add('eight_roster_preserved', 'PASS' if facts['eight_count']==11 and facts['pre_nine_count']==0 else 'HOLD',
        'Read-only aggregates for First Term Eight cohort, no student identities output')
    add('post_audit_backup_integrity', 'PASS' if facts['backup_ok'] else 'HOLD',
        'Protected 0600 post-audit dump and SHA-256 manifest verified without restore/mutation')
    add('private_upload_paths', 'PASS' if all(s==404 for s in facts['upload_codes'].values()) else 'HOLD',
        'HTTPS private upload paths must deny anonymous access')
    legacy_public = any(public_bind(facts['listeners'].get(p,[])) for p in ('3000','5000'))
    verified_filter = facts.get('node_direct_ports_v4_restricted',False) and facts.get('node_direct_ports_v6_restricted',False)
    add('legacy_direct_listener_exposure', 'HOLD' if legacy_public and not verified_filter else 'PASS',
        'External direct TCP 3000/5000 confirmed via independent cloud browser on 12 Oct; '        'require BOTH IPv4+IPv6 ingress deny rules, not just UFW active; no automatic firewall modifications')
    return checks


def gather():
    vfs=os.statvfs('/')
    total=vfs.f_blocks*vfs.f_frsize
    free=vfs.f_bavail*vfs.f_frsize
    app=APP.read_text()
    active_roots=re.findall(r'^\s*root\s+(/var/www/[^;]+);',app,re.M)
    root=Path(active_roots[0]) if len(active_roots)==1 else Path('/nonexistent-assps-static')
    meta=root/'release-meta.json'
    artifact_sha=None
    if meta.is_file():
        try:
            artifact_sha=json.loads(meta.read_text()).get('frontend_commit')
        except (OSError,ValueError): pass
    head=command(['git','-C',str(CORE_SOURCE),'rev-parse','HEAD']).strip()
    upstream=command(['git','-C',str(CORE_SOURCE),'ls-remote','origin','refs/heads/release/firstterm-core-security-unified-20261011']).split()[0]
    active_ancestor=False
    if artifact_sha and re.fullmatch(r'[a-f0-9]{40}',artifact_sha):
        active_ancestor=subprocess.run(['git','-C',str(CORE_SOURCE),'merge-base','--is-ancestor',artifact_sha,head],capture_output=True,timeout=8).returncode==0
    listeners=parse_ss(command(['ss','-H','-ltn']))
    status=command(['ufw','status']) if shutil.which('ufw') else 'unknown'
    sql="SELECT (SELECT count(*) FROM pg_policies WHERE schemaname='public')||'|'||(SELECT count(*) FROM students WHERE school_id=1 AND class='Eight' AND section='Blue')||'|'||(SELECT count(*) FROM students WHERE school_id=1 AND class='Pre Nine');"
    pg=command(['runuser','-u','postgres','--','psql','-X','-A','-t','-p','5432','-d','apexos','-c',sql]).strip().split('|')
    dump=BACKUP/'apexos-post-audit-rls.dump'
    manifest=BACKUP/'sha256.txt'
    backup_ok=False
    if dump.is_file() and manifest.is_file():
        expected=manifest.read_text().split()[0]
        backup_ok=(sha(dump)==expected and (dump.stat().st_mode & 0o077)==0)
    # Exact source-owned firewall rules, never infer coverage from a service being
    # active: a blanket UFW active status could still explicitly allow 3000/5000.
    def direct_port_rule_present(binary):
        rule=[binary,'-w','-C','INPUT','-i','eth0','-p','tcp','-m','multiport',
              '--dports','3000,5000','-j','REJECT','--reject-with','tcp-reset']
        try:
            return subprocess.run(rule,capture_output=True,timeout=6).returncode==0
        except (OSError,subprocess.TimeoutExpired):
            return False
    uploads={path:http_status('https://app.assps.edu.pk'+path) for path in (
        '/uploads/payment-screenshots/assps-deny-probe.txt',
        '/uploads/identity/assps-deny-probe.txt',
        '/uploads/private/assps-deny-probe.txt')}
    return {
       'disk_percent':round(100*(1-free/total),1), 'disk_free_gib':free/1024**3,
       'git_equal':head==upstream, 'source_sha':head, 'active_frontend_sha':artifact_sha,
       'app_root_exists':(root/'index.html').is_file(), 'meta_source_valid':active_ancestor,
       'nginx_syntax':subprocess.run(['nginx','-t'],capture_output=True,timeout=10).returncode==0,
       'connect_sha_ok':sha(CONNECT)==EXPECTED_CONNECT_SHA,
       'public_app':http_status('https://app.assps.edu.pk/exams/marks'),
       'connect':http_status('https://api.assps.edu.pk/health'),
       'green':http_status('http://127.0.0.1:5091/health/ready'),
       'listeners':listeners,'host_firewall_active':'Status: active' in status,
       'node_direct_ports_v4_restricted':direct_port_rule_present('iptables'),
       'node_direct_ports_v6_restricted':direct_port_rule_present('ip6tables'),
       'policy_count':int(pg[0]),'eight_count':int(pg[1]),'pre_nine_count':int(pg[2]),
       'backup_ok':backup_ok,'upload_codes':uploads
    }


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--json',action='store_true')
    p.add_argument('--strict',action='store_true',help='Nonzero when any infrastructure HOLD/WARN remains')
    args=p.parse_args()
    facts=gather()
    checks=evaluate(facts)
    if args.json:
        print(json.dumps({'source_sha':facts['source_sha'],'active_frontend_sha':facts['active_frontend_sha'],
                          'read_only':True,'checks':checks},indent=2))
    else:
        for c in checks:print(f'{c["status"]}: {c["name"]}: {c["detail"]}')
        print('READ_ONLY_NO_MUTATION=TRUE')
    if args.strict and any(c['status'] != 'PASS' for c in checks):return 2
    return 0

if __name__=='__main__':
    try: sys.exit(main())
    except Exception as ex:
        print('CORE_INFRA_AUDIT_UNAVAILABLE '+type(ex).__name__,file=sys.stderr)
        sys.exit(2)
