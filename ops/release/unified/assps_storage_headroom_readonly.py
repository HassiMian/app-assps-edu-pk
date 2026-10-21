#!/usr/bin/env python3
"""Non-destructive space preflight. Never deletes or opens backup content."""
import json
import os

MIN_FREE_GIB = 12
MIN_FREE_PERCENT = 12
PATHS = ('/', '/var/backups', '/var/lib/postgresql')

def evaluate(bytes_total, bytes_free):
    if not isinstance(bytes_total,int) or not isinstance(bytes_free,int):
        raise ValueError('Invalid filesystem sizes')
    if bytes_total <= 0 or bytes_free < 0 or bytes_free > bytes_total:
        raise ValueError('Invalid filesystem free space')
    percent = 100 * bytes_free / bytes_total
    return {'total_gib':round(bytes_total / 1073741824,2),
            'available_gib':round(bytes_free / 1073741824,2),
            'available_percent':round(percent,2),
            'release_headroom_ok':bytes_free >= MIN_FREE_GIB * 1073741824
                                  and percent >= MIN_FREE_PERCENT}

def inspect(stat=os.statvfs):
    partitions={}
    for name in PATHS:
        s=stat(name)
        partitions[name]=evaluate(s.f_blocks*s.f_frsize,s.f_bavail*s.f_frsize)
    return {'pass':True,'headroom_ok':all(x['release_headroom_ok'] for x in partitions.values()),
            'partitions':partitions,'minimum_free_gib':MIN_FREE_GIB,
            'minimum_free_percent':MIN_FREE_PERCENT,
            'interpretation':'CAPACITY_PRECHECK_ONLY_NOT_OFFHOST_RESTORE_CERTIFICATION'}

if __name__=='__main__':
    try:
        print(json.dumps(inspect(),indent=2,sort_keys=True))
    except (OSError,ValueError) as e:
        print(json.dumps({'pass':False,'error_type':type(e).__name__}))
        raise SystemExit(3)
