# ASSPS Zero-Paid Distributed Cloud Workstation — Operator Runbook

## Daily start
1. On Windows, double-click **ASSPS Cloud Workspace.cmd**.
2. The launcher starts Desktop Commander Supervisor/Guardian if needed, restores the SSH tunnel to the Hostinger IDE, verifies HTTP health, and opens the workspace.
3. Work only on an isolated feature branch/worktree. Production `main` remains the protected deployment baseline.

## Core architecture
- Hostinger VPS: persistent control plane and remote IDE.
- GitHub: durable source/history and disaster-recovery anchor.
- Windows: lightweight access client; loss of Windows must not stop cloud-side development.
- AWS Builder Center: ephemeral free burst/test environment only. No production secrets or school data.
- Oracle Free Tier: optional only after explicit verification that provisioning is genuinely zero-charge.

## Safety invariants
- Never push directly to `main` from AWS or another ephemeral environment.
- Never copy production credentials, database dumps, student data, or school secrets into an ephemeral sandbox.
- Never create or upgrade a cloud resource that has a non-zero charge without explicit user approval.
- Run `ops/cloud-offload/preflight.sh` before build/offload work.
- Run `ops/cloud-offload/status.sh` for a unified health snapshot.
- Run `ops/cloud-offload/failover-test.sh` after recovery or architecture changes.

## Recovery order
1. Retry the custom Cloud Desktop Commander channel.
2. Ensure DesktopCommanderSupervisor and DesktopCommanderGuardian are running on Windows.
3. Restore the Windows-to-Hostinger SSH tunnel with the one-click launcher.
4. If Windows remains unavailable, continue on Hostinger VPS + GitHub; Windows is not a core dependency.
5. AWS/Oracle failure never blocks the core workstation.

## AWS burst session
Use `ops/cloud-offload/aws-sandbox/session-run.sh` only inside the verified free Builder Center environment. It bootstraps the isolated branch and checkpoints on exit/interruption. Export the checkpoint before sandbox expiry.
