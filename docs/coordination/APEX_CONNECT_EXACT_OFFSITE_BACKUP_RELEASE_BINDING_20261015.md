# APEX Connect login-only cutover — exact recovery-artifact signed binding

**Date:** 15 October 2026 Pakistan time. **Classification:** Source-only, read-only evidence validation.
**Source parent:** 2e8fd7b5a68122760dbb5613de6fbcad474a7baa, itself merged from the verified SaaS Core owner offsite recovery SHA and real restricted Node/PostgreSQL QA.

## Defect fixed

The previous Core pre-cutover validator checked an older on-VPS backup SHA and a partial Blue rollback archive. Independently signed disaster-recovery receipts only asserted recovery booleans and an opaque evidence digest. Such a receipt was **not cryptographically bound to the exact currently reviewed database dump and actual complete Next.js/Nginx Blue archive**. A historical restore could therefore be misrepresented as recovery of the current school data.

This source change hardens the verifier:

- Pins the current protected full-ACL dump created for 15-Oct recovery:
  /root/assps-release-backups/offsite-staging-20261015/apexos-latest-fullacl.dump
  SHA256 6c9bfb8b1c06680c4eca6852fd7a903e0349a9539d0d502b46b496ac390eb445.
- Requires root-private file permissions (no group/world read or write), nonempty dump, and creation within the preceding 24 hours. Once stale, source must be updated to a NEW independently verified dump and approved release manifest, not silently accept old backups.
- Pins **complete original deployed Blue Next.js AND Nginx archive** at:
  /root/assps-release-backups/core-login-blue-artifacts-20261014T1855Z/apex-connect-blue-and-nginx.tgz
  SHA256 950f6c7449ae0f5ad4947518caf8bec8b40cad0126df8d951ab8766a721cfc7c, original root-private archive with verified gzip contents and previously independently demonstrated isolated restoration.
- Requires signed Core disaster-recovery receipt to explicitly match BOTH computed artifact SHA256 values, in addition to the existing exact source SHA, compiled Next BUILD_ID, release ID, authorized reviewer key and the explicitly true offsite encrypted restore/decrypt, current marks completeness and original Blue recovery claims.
- Missing, malformed, wrong-archive, old-backup, stale or mismatched receipt always fails closed. No secret signing keys or real staff records are read. No agent fabricates independent reviewer signatures or human approvals.

## Executed evidence (15 October 2026)

- Latest real root-private full-ACL DB dump checksum MATCH, secure permissions PASS, freshness PASS.
- Complete genuine pre-cutover Blue Next+Nginx archive checksum MATCH, metadata and tar-gzip integrity PASS.
- Existing owner-controlled Ed25519 public trust root AVAILABLE. This is technical key provisioning, not an institutional signoff.
- Signed independent offsite recovery receipt ABSENT: **HOLD**, not a fake success.
- Positive/negative source receipt fixtures plus tests for substituting a different backup or rollback archive **29/29 PASS**.
- Separate actual Node/SCRAM worker integration on restored production PostgreSQL 55477 8/8 PASS twice, and Core live identity/tenant checks remain distinct and not certified.
- Production backend source still lacks the reviewed restricted AI worker adapter; actual six-global runtime migration, authenticated existing teacher browser session, peer-school signed HTTP negatives and live rollback remain HOLD.
- No production PostgreSQL DDL, school marks, teacher passwords/accounts, production PM2, Nginx, Next.js public build or live ingress changes from this source patch.

## Completion gates unchanged

The SaaS Core release owner must reconcile onto the current approved branch, bring a genuinely restricted worker live with authenticated separation, certify independent peer-school/subject denial, secure current offsite recovery under a valid independent authentic receipt, then execute atomic Next.js + Nginx login-only promotion after the true PRE gate passes. Genuine existing employee authenticated teacher challenge and final real traffic rollback receipts belong to POST acceptance. Academic results and papers remain separate.

This handoff does not claim live release certification.
