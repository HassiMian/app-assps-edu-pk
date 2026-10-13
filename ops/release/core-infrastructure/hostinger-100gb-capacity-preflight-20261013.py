#!/usr/bin/env python3
"""READ-ONLY, fail-closed provider-disk and filesystem readiness verifier.

100GB physical virtual disk allocation requires Hostinger account-level VPS
plan upgrade; this tool NEVER purchases a plan, edits a partition, or resizes
an ext4 filesystem. Successful disk inspection is NOT deployment acceptance.
"""
import json
import os
import subprocess
import sys

EXPECTED_DISK='sda'
EXPECTED_ROOT='sda1'
EXPECTED_FILESYSTEM='ext4'
TARGET_PHYSICAL_BYTES=100_000_000_000  # Hostinger KVM 2 advertised >=100GB
MIN_FREE_BYTES=6*1024**3
MIN_ROOT_BYTES=90_000_000_000

def evaluate(disk_bytes,partition_bytes,filesystem_bytes,free_bytes,root_fstype):
    issues=[]
    if disk_bytes<TARGET_PHYSICAL_BYTES:
        issues.append('HOSTINGER_PROVIDER_100GB_NOT_ALLOCATED')
    if partition_bytes>disk_bytes or filesystem_bytes>partition_bytes:
        issues.append('INVALID_PARTITION_OR_FILESYSTEM_SIZE')
    if partition_bytes<MIN_ROOT_BYTES:
        issues.append('ROOT_PARTITION_NOT_EXPANDED')
    if filesystem_bytes<MIN_ROOT_BYTES:
        issues.append('ROOT_FILESYSTEM_NOT_EXPANDED')
    if free_bytes<MIN_FREE_BYTES:
        issues.append('ROOT_FILESYSTEM_HEADROOM_LT_6GIB')
    if root_fstype!=EXPECTED_FILESYSTEM:
        issues.append('UNEXPECTED_ROOT_FILESYSTEM')
    return {'verdict':'CAPACITY_PRECONDITIONS_PASS_ONLY' if not issues else 'HOLD',
            'issues':issues,'read_only':True,'provider_payment_executed':False,
            'release_certification':False,'production_mutations':False}

def inspect():
    p=subprocess.run(['lsblk','-b','-J','-o','NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT'],
                     capture_output=True,text=True,timeout=10)
    if p.returncode:raise RuntimeError('Block-device information missing')
    devs=json.loads(p.stdout).get('blockdevices',[])
    disks=[v for v in devs if v.get('name')==EXPECTED_DISK and v.get('type')=='disk']
    if len(disks)!=1:raise RuntimeError('Unexpected Hostinger root block device')
    disk=disks[0]
    roots=[x for x in disk.get('children',[]) if x.get('name')==EXPECTED_ROOT
           and x.get('mountpoint')=='/']
    if len(roots)!=1:raise RuntimeError('Cannot verify mounted root partition')
    root=roots[0]
    stat=os.statvfs('/')
    return {'provider_disk_bytes':disk['size'],
            'root_partition_bytes':root['size'],
            'root_filesystem_bytes':stat.f_frsize*stat.f_blocks,
            'root_available_bytes':stat.f_frsize*stat.f_bavail,
            'root_fstype':root['fstype']}

def main():
    try:
        values=inspect()
        result=evaluate(values['provider_disk_bytes'],values['root_partition_bytes'],
                        values['root_filesystem_bytes'],values['root_available_bytes'],
                        values['root_fstype'])
    except (RuntimeError,KeyError,OSError,ValueError,subprocess.TimeoutExpired) as err:
        values={}
        result={'verdict':'HOLD','issues':['INSPECTION_'+type(err).__name__],
                'read_only':True,'provider_payment_executed':False,
                'release_certification':False,'production_mutations':False}
    print(json.dumps({**values,**result},sort_keys=True))
    return 0 if result['verdict']=='CAPACITY_PRECONDITIONS_PASS_ONLY' else 2
if __name__=='__main__':sys.exit(main())
