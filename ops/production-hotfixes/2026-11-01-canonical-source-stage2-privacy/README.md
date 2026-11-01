# ASSPS canonical source stage 2 privacy review — 2026-11-01

Source branch: review/assps-20261031-source-handoff. NOT production deployment, not approval to merge into main.

Three further hardening changes:
1. Portal dashboard explicitly selects safe employee fields, followed by employeePublicRecord projection. Older GitHub source used SELECT * FROM employees and could return legacy staff credentials. This change patches the old pool.query route in place.
2. Legacy staff-import files now use mode 0700 private directory and 0600 credential CSV/report files. Earlier prevention of cleartext reinsertion is retained.
3. portalAccountService.js was absent from the older GitHub source. This branch includes the current reviewed VPS implementation with id/role-only queries and safe 409 conflict handling rather than raw-user fallback. Its integration into the older canonical routes must be verified before any merge.

Validation: node --test ops/production-hotfixes/2026-11-01-canonical-source-stage2-privacy/canonical-portal-and-import-privacy.test.cjs

No student/fee/marks rows or principal approvals were altered. 14 historical staff portal credentials remain stored pending controlled retirement. RLS, catalog and academic approvals are independent gates.
