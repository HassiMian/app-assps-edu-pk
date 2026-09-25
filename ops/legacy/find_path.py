import paramiko
import os

host = os.getenv('ASSPS_VPS_HOST', '')
username = os.getenv('ASSPS_VPS_USER', '')
password = os.getenv('ASSPS_VPS_PASSWORD', '')

if not host or not username or not password:
    raise SystemExit('Missing ASSPS_VPS_HOST / ASSPS_VPS_USER / ASSPS_VPS_PASSWORD environment variables.')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    print("Connecting...")
    client.connect(host, username=username, password=password, timeout=10)
    print("Connected.")
    
    commands = [
        "ls -la /var/www",
        "ls -la /var/www/html",
        "find /var/www -maxdepth 2 -type d",
        "find /home -maxdepth 2 -type d"
    ]
    
    for cmd in commands:
        print(f"\n--- {cmd} ---")
        stdin, stdout, stderr = client.exec_command(cmd)
        print(stdout.read().decode())
        print(stderr.read().decode())
        
finally:
    client.close()
