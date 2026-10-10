#!/usr/bin/env python3
"""Read-only, certificate-verified live Nginx media privacy matrix."""
import subprocess, sys
HOSTS=('api.assps.edu.pk','app.assps.edu.pk','apex.assps.edu.pk','www.assps.edu.pk')
PRIVATE_PATHS=(
 '/uploads/assps-private-20261010.jpg',
 '/uploads/students/assps-private-20261010.pdf',
 '/uploads/fees/assps-private-20261010.png',
 '/uploads/branding/assps-canary.svg',
 '/uploads/branding/assps-canary.html',
 '/uploads/branding/assps-canary.js',
 '/uploads/branding/assps-canary.pdf',
 '/uploads/branding/assps-canary.png',
)
def probe(host,path):
    # SNI, Host header, certificate and CA validation all remain enabled.
    command=['curl','-sS','--path-as-is','--connect-timeout','2','--max-time','5',
            '--resolve',host+':443:127.0.0.1',
            '-o','/dev/null','-w','%{http_code}','https://'+host+path]
    p=subprocess.run(command,text=True,capture_output=True)
    if p.returncode:
        raise RuntimeError('TLS/CERTIFICATE/HTTP_PROBE_ERROR '+host+' '+path+' exit='+str(p.returncode)+' '+p.stderr[-250:])
    return p.stdout.strip()
def main():
    count=0
    for host in HOSTS:
        root=probe(host,'/')
        if not root.startswith(('2','3')):
            raise RuntimeError('SITE_ROOT_UNHEALTHY '+host+' '+root)
        for path in PRIVATE_PATHS:
            status=probe(host,path)
            if status!='404':
                raise RuntimeError('PRIVATE_MEDIA_POLICY_FAIL '+host+' '+path+' '+status)
            count+=1
        print('LIVE_TLS_HOST_PASS '+host+' root='+root+' private_denied='+str(len(PRIVATE_PATHS)),flush=True)
    print('LIVE_HTTPS_CERTIFICATE_AND_PRIVATE_MEDIA_PASS '+str(count)+'/'+str(len(HOSTS)*len(PRIVATE_PATHS)),flush=True)
if __name__=='__main__':
    try: main()
    except Exception as error:
        print(str(error),file=sys.stderr)
        sys.exit(2)
