# ASSPS Zero-Paid Cloud Policy

Hard rule: do not activate any resource that requires a payment, prepayment,
deposit, paid subscription, paid upgrade, or non-zero spending commitment.

Allowed:
- already-paid existing Hostinger VPS capacity
- GitHub included/free allowances while spending remains zero
- Oracle Always Free resources if account provisioning succeeds without charge
- provider verification by saved card only when the provider explicitly shows
  zero charge / no prepayment / no paid activation

Blocked:
- Google Cloud $30 prepayment gate
- any trial requiring a non-zero activation payment
- enabling billing merely to continue after free allowance is exhausted

If any UI/API asks for money, stop and require explicit user review.
