# Zero-Paid Workspace: Next PC Boot

This is a distributed **existing VPS** workspace, not a 32-GB VM.
No new cloud charges or paid resources are authorised.

## Windows
1. Connect internet.
2. Double-click Desktop/ASSPS Cloud Workspace.cmd.
3. Browser opens http://127.0.0.1:8484/ over an SSH-only local tunnel.
4. If it fails, inspect the tunnel process and the VPS service:
   systemctl status code-server@asspsworker
   bash ops/cloud-offload/health-check.sh

## Isolation
- Remote IDE listens exclusively on 127.0.0.1:8484 on VPS.
- Windows uses a dedicated tunnel-only SSH key and forwarding restriction.
- Work in feat/free-cloud-workstation-zero-paid-20261004 or a new isolated branch.
- Never merge or deploy to ASSPS production implicitly.
- The GitHub Actions verification is manual-only and can consume included
  minutes; check available allowance before launching any run.
- Codespaces can consume included quotas and may require billing depending
  on account/repo eligibility: check the zero-spend settings before creation.

## Resource limits
code-server has MemoryMax=900M and CPUQuota=75%; a temporary VPS build
runs under separate constraints. The current VPS has 1 vCPU / 3.8GiB RAM;
it cannot emulate a full 32GiB single-machine workload.

## Financial stop conditions
Google $30 gate, any non-zero prepayment/deposit, paid upgrade, or usage
outside included allowances = STOP. Never enter/save a card into a new
provider without an explicit zero-charge/zero-prepayment statement.
