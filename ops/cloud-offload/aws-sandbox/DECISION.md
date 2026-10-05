# AWS Builder Center Sandbox Decision

## Decision
Use AWS Builder Center free sandbox only as an ephemeral burst-compute/testing layer.
Do not treat it as a permanent workstation, production host, persistent database, or backup target.

## Verified AWS constraints
- Eligible workshops can provide a pre-provisioned AWS sandbox without a personal AWS account or credit card.
- Each activation lasts 8 hours, then resources are automatically cleaned up.
- One sandbox can be requested per week; most are available within about 15 minutes.
- Availability is workshop-scoped and only selected workshops are eligible.

## Best fit for ASSPS
Primary candidate: "Building with Amazon Bedrock featuring Claude Code, Kiro, AgentCore, and Strands Agents".

## Architecture role
- Hostinger VPS: persistent control plane and remote IDE
- GitHub: durable source/history
- Local Windows PC: lightweight client
- Oracle Free Tier: optional persistent extra compute if approved at zero charge
- AWS Builder Sandbox: temporary 8-hour burst lab only

## Hard financial rules
- No payment, prepayment, deposit, card charge, paid upgrade, paid subscription, or chargeable resource.
- Do not use the held AWS account to provision resources for this goal.
- Do not store school production data, credentials, or long-lived secrets in the sandbox.
- Do not push directly to production main.
