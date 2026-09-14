# ASSPS Deploy Access Status

Date: 2026-09-14

## VPS Evidence

Provider panel visible:

```text
Hostinger VPS
Ubuntu 24.04 LTS
Host: 187.127.121.221
SSH user: root
SSH port: 22
```

Network check:

```text
187.127.121.221:22 reachable
```

SSH host key evidence:

```text
ED25519 SHA256:DQTFFeD8s6TmAtxw74aceDsZSR79K6mOQA481TItcio
```

## Password Attempt

The supplied password was used once through an interactive SSH password prompt only.

Result:

```text
Permission denied
```

No repeated password retries, brute force, password logging, password file storage, or production deployment was attempted.

## Dedicated Deploy Key Prepared

Private key path:

```text
C:\Users\Imac\.ssh\assps_hostinger_deploy_ed25519
```

Public key path:

```text
C:\Users\Imac\.ssh\assps_hostinger_deploy_ed25519.pub
```

Public key fingerprint:

```text
SHA256:eI6s855F9BaEbLkTdybdnRtoUR6wpTT9ulv/KANzV5c
```

Public key to authorize on the VPS:

```text
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHq8+2zToKSU65XfKOb+qMBxciCpnOoupH/n4OnRlWXq assps-rc2-deploy-20260914
```

## Current Status

```text
SSH_PASSWORD_AUTH_FAILED
SSH_KEY_CREATED_LOCALLY
SSH_KEY_NOT_AUTHORIZED_ON_SERVER_YET
PRODUCTION_DEPLOYMENT_NOT_EXECUTED
```

## Next Required Legitimate Action

Authorize the public key above on the Hostinger VPS using one of:

```text
Hostinger VPS -> SSH key -> Manage -> Add key
```

or Hostinger Web Console:

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
printf '%s\n' 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHq8+2zToKSU65XfKOb+qMBxciCpnOoupH/n4OnRlWXq assps-rc2-deploy-20260914' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

After key authorization, rerun key-based SSH verification and production deploy dry-run before any actual deploy.
