#!/usr/bin/env python3
"""One-shot read-only HTTPS path diagnostic. No authentication, no scheduling.

Distinguish intermittent public edge/network failure from local reverse proxy
and Connect upstream health; never automatically modify network or services.
"""
import argparse
import json
import subprocess
import sys

PATHS = {
    'edge_ipv4': ('-4', 'https://api.assps.edu.pk/health'),
    'edge_ipv6': ('-6', 'https://api.assps.edu.pk/health'),
    'local_tls': ('--resolve', 'api.assps.edu.pk:443:127.0.0.1', 'https://api.assps.edu.pk/health'),
    'local_upstream': ('http://127.0.0.1:3000/health',),
}

def parse_curl_timings(raw, curl_exit):
    """Bounded, source-neutral timing breakdown; no headers/tokens/PII."""
    try:
        fields = raw.strip().split('|')
        if len(fields) != 6:
            raise ValueError('expected six curl timing columns')
        code = int(fields[0])
        timing = [round(float(x), 3) for x in fields[1:]]
        if any(value < 0 for value in timing):
            raise ValueError('negative transport interval')
        total, dns, connect, tls, first_byte = timing
        return {'http':code,'seconds':total,'dns_s':dns,'connect_s':connect,
                'tls_s':tls,'ttfb_s':first_byte,'curl_exit':curl_exit}
    except (TypeError, ValueError):
        return {'http':0,'seconds':None,'dns_s':None,'connect_s':None,
                'tls_s':None,'ttfb_s':None,'curl_exit':curl_exit}


def probe(args):
    cmd = ['curl', '--silent', '--show-error', '--connect-timeout', '3',
           '--max-time', '6', '--output', '/dev/null',
           '--write-out', '%{http_code}|%{time_total}|%{time_namelookup}|%{time_connect}|%{time_appconnect}|%{time_starttransfer}']
    completed = subprocess.run(cmd + list(args), capture_output=True, text=True, timeout=8)
    return parse_curl_timings(completed.stdout, completed.returncode)

def assess(results, threshold=2.0):
    problems=[]
    for name, entries in results.items():
        if not entries:
            problems.append(f'{name}:missing_samples')
            continue
        for n, sample in enumerate(entries, 1):
            if sample['curl_exit'] != 0 or sample['http'] != 200:
                problems.append(f'{name}:sample{n}:http_or_transport_failure')
            elif sample['seconds'] is None or sample['seconds'] > threshold:
                problems.append(f'{name}:sample{n}:latency_exceeded')
    local_ok=all(e['http']==200 and e['curl_exit']==0 for group in ('local_tls','local_upstream')
                 for e in results.get(group, [])) and all(results.get(group) for group in ('local_tls','local_upstream'))
    edge_problem=any(p.startswith(('edge_ipv4:', 'edge_ipv6:')) for p in problems)
    return {'verdict':'HOLD' if problems else 'PASS',
            'path_differential':'PUBLIC_PATH_SUSPECTED' if edge_problem and local_ok else 'NOT_PROVEN',
            'problems':problems, 'read_only':True}

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--samples',type=int,default=3)
    parser.add_argument('--latency-limit',type=float,default=2.0)
    parser.add_argument('--json',action='store_true')
    a=parser.parse_args()
    if not 1 <= a.samples <= 5 or not 0.2 <= a.latency_limit <= 30:
        parser.error('Unsafe or unsupported sampling range')
    results={name:[probe(params) for _ in range(a.samples if name.startswith('edge') else 1)]
             for name, params in PATHS.items()}
    decision=assess(results,a.latency_limit)
    report={'checks':results,**decision}
    if a.json:print(json.dumps(report,sort_keys=True,indent=2))
    else:
        for name, values in results.items(): print(name,values)
        print('VERDICT='+decision['verdict']+'; PATH_DIFFERENTIAL='+decision['path_differential'])
        for problem in decision['problems']: print('WARN='+problem)
        print('NO_PRODUCTION_MUTATION=TRUE')
    return 2 if decision['verdict']!='PASS' else 0

if __name__=='__main__':sys.exit(main())
