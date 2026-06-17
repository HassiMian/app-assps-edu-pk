import paramiko
import os

host = '72.61.228.88'
username = 'root'
password = 'Myself&03452744344'
remote_dir = '/var/www/apex-backend/src/routes'
local_dir = r'C:\projects\My SAas\al-siddique-os\al-siddique-backend\src\routes'

files_to_upload = [
    'feeRoutes.js',
    'examRoutes.js',
    'authRoutes.js'
]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    print("Connecting to backend server...")
    client.connect(host, username=username, password=password, timeout=10)
    print("Connected.")
    
    sftp = client.open_sftp()
    
    for file in files_to_upload:
        local_file = os.path.join(local_dir, file)
        remote_file = f'{remote_dir}/{file}'
        print(f"Uploading {local_file} to {remote_file}...")
        sftp.put(local_file, remote_file)
        
    sftp.close()
    print("Upload complete.")
    
    commands = [
        "pm2 restart all"
    ]
    
    for cmd in commands:
        print(f"\nRunning: {cmd}")
        stdin, stdout, stderr = client.exec_command(cmd)
        
        out = stdout.read().decode()
        err = stderr.read().decode()
        if out: print("STDOUT:", out.strip())
        if err: print("STDERR:", err.strip())
        
    print("\nBackend deployment successful!")
except Exception as e:
    print("Error:", e)
finally:
    client.close()
