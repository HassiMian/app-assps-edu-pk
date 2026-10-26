#!/usr/bin/env python3
"""ASSPS local media backup integrity gate. Read-only, no private file names printed."""
import argparse
import hashlib
import json
import pathlib
import re
import subprocess
import sys
import tarfile

MAX_ITEMS=10000
MAX_TOTAL_BYTES=2*1024*1024*1024
def checksum(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for piece in iter(lambda:f.read(1<<20),b''):h.update(piece)
    return h.hexdigest()
def archive_inventory(archive):
    names=set()
    count=0
    size=0
    with tarfile.open(archive,'r:gz') as tf:
        for member in tf:
            name=member.name
            parts=pathlib.PurePosixPath(name).parts
            if (not parts or parts[0]!='uploads' or
                '..' in parts or name.startswith('/') or
                name in names or
                not (member.isdir() or member.isfile())):
                raise ValueError('UNSAFE_MEDIA_ARCHIVE_CONTENT')
            names.add(name)
            if member.isfile():
                count+=1;size+=member.size
                if count>MAX_ITEMS or size>MAX_TOTAL_BYTES:
                    raise ValueError('UNBOUNDED_MEDIA_ARCHIVE_CONTENT')
    if count==0:raise ValueError('EMPTY_MEDIA_ARCHIVE')
    return count,size

def review(archive,ciphertext,manifest,expected_count=None,expected_bytes=None):
    if (not archive.is_file() or archive.is_symlink()
        or not ciphertext.is_file() or ciphertext.is_symlink()
        or not manifest.is_file() or manifest.is_symlink()):
        raise ValueError('RECOVERY_ARTIFACT_MISSING')
    actual=checksum(archive)
    recorded=manifest.read_text().strip().split()
    if len(recorded)!=2 or recorded[0]!=actual or recorded[1]!='uploads.tar.gz':
        raise ValueError('MEDIA_BACKUP_CHECKSUM_MISMATCH')
    count,size=archive_inventory(archive)
    if expected_count is not None and count!=expected_count:raise ValueError('MEDIA_FILE_COUNT_DRIFT')
    if expected_bytes is not None and size!=expected_bytes:raise ValueError('MEDIA_TOTAL_BYTES_DRIFT')
    p=subprocess.run(['openssl','cms','-cmsout','-inform','DER','-in',str(ciphertext),'-print'],
                     capture_output=True,text=True,timeout=30)
    if p.returncode!=0 or 'id-smime-ct-authEnvelopedData' not in p.stdout or 'algorithm: aes-256-gcm' not in p.stdout:
        raise ValueError('UNVERIFIED_ENCRYPTED_ENVELOPE')
    return {'local_archive_sha256':actual,'local_media_files':count,
            'local_media_total_bytes':size,'encrypted_cms_aes256gcm':True,
            'encrypted_sha256':checksum(ciphertext),
            'local_backup_file_integrity':'PASS',
            'offhost_transfer_verified':False,
            'independent_private_key_decrypt_verified':False,
            'production_modified':False,
            'release_certified':False}
def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--archive',type=pathlib.Path,required=True)
    ap.add_argument('--ciphertext',type=pathlib.Path,required=True)
    ap.add_argument('--manifest',type=pathlib.Path,required=True)
    ap.add_argument('--expected-count',type=int)
    ap.add_argument('--expected-bytes',type=int)
    a=ap.parse_args()
    try:
        print(json.dumps(review(a.archive,a.ciphertext,a.manifest,a.expected_count,a.expected_bytes),sort_keys=True))
        return 0
    except (OSError,ValueError,tarfile.TarError,subprocess.TimeoutExpired) as e:
        print(json.dumps({'status':'HOLD','reason':type(e).__name__,
                          'offhost_transfer_verified':False,'production_modified':False}))
        return 3
if __name__=='__main__':sys.exit(main())
