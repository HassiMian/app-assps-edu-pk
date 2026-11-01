# Canonical GitHub review branch source-parity protection (2026-11-01)

The older canonical source had not incorporated the live production privacy hotfixes. Review-only changes now align three independently reviewed security behaviors:
1) school-level Admin/Principal cannot read global AI queue diagnostics events and counts, because the global tables have no tenant key;
2) only platform super-admin can pause or resume the global AI queue;
3) employee list/detail/create/update responses redact the legacy portal password, and credential write attempts return 422.

These are source-branch changes, not a deployment and not approval to merge blindly into main. Existing production hotfixes remain active. Dedicated runtime source vs GitHub source differences outside these specific controls still require verification.

Validation: node --test ops/production-hotfixes/2026-11-01-canonical-source-tenant-security/canonical-tenant-security-contract.test.cjs

Confidential legacy employee values remain in old database records; this branch does not purge or rotate them. No student marks, fees, November vouchers or academic signatures were changed.
