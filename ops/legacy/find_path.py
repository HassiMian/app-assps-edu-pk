import paramiko
import sys

host = '72.61.228.88'
username = 'root'
password = 'Myself&03452744344'

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
