import paramiko
import os

host = '72.61.228.88'
username = 'root'
password = 'Myself&03452744344'
local_zip = r'c:\projects\My SAas\al-siddique-os\al-siddique-frontend\dist.zip'
remote_dir = '/var/www/apex-os'
remote_zip = f'{remote_dir}/dist.zip'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    print("Connecting...")
    client.connect(host, username=username, password=password, timeout=10)
    print("Connected.")
    
    # Upload via SFTP
    sftp = client.open_sftp()
    print(f"Uploading {local_zip} to {remote_zip}...")
    sftp.put(local_zip, remote_zip)
    sftp.close()
    print("Upload complete.")
    
    commands = [
        f"cd {remote_dir} && rm -rf assets",
        f"cd {remote_dir} && unzip -o -q dist.zip",
        f"cd {remote_dir} && rm dist.zip",
        "systemctl restart nginx"
    ]
    
    for cmd in commands:
        print(f"\nRunning: {cmd}")
        stdin, stdout, stderr = client.exec_command(cmd)
        
        out = stdout.read().decode()
        err = stderr.read().decode()
        if out: print("STDOUT:", out.strip())
        if err: print("STDERR:", err.strip())
        
    print("\nDeployment successful!")
except Exception as e:
    print("Error:", e)
finally:
    client.close()
