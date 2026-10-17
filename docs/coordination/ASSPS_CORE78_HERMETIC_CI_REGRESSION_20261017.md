# ASSPS unified Core78 — hermetic CI regression closure, 17 October 2026

Scope: one TEST-ONLY fix cluster, based on clean reviewed
integration/core78-lesson42-corpus-security-20261017@0d3d5e3c05ab49e3e87ccd86e119ddb043a3d913.
No frontend/backend application runtime modifications, migrations, marks writes, identity/role
changes, worker/Nginx/PM2 changes, deployment, or printer job.

## Root-owned private evidence WITHOUT relaxing production verifier
Original hosted CI failed because synthetic TemporaryDirectory was owned by nonroot runner,
whereas the production receipt checker rightly requires UID 0, 0700 directory and 0600
regular file. Modified TEST ONLY supplies simulated lstat UID metadata for a positive sample
while retaining real file types, permissions and symlink behavior. Separately tests nonroot
directory UID, nonroot file UID, 0644 file and symlink rejection. Actual verifier unchanged.
Hosted nonroot CI does not substitute for real root-owned VPS production receipt acceptance.

## Portable Lesson Planner Save Day negative
Original test read an absolute archived /root/workspace frontend bundle; nonroot hosted
runners raised PermissionError. The replacement uses the real freshly built current app
index-reachable Lesson module, copies dist into a temporary test folder, removes ONLY
the 'Save Day to School Server' marker in its active compiled module, and verifies that
the runtime marker release contract alone fails closed. Existing current-source positive
acceptance remains compulsory. Temporary fixture is automatically deleted.

## Evidence and release boundaries
- Isolated branch fix/core78-ci-hermetic-fixtures-20261017 is directly based on Core78.
- Four scoped source-only paths total: two unit files, one least-privilege nondeployment
  GitHub Actions check, and this public-safe handoff.
- Hosted workflow has contents:read, no school secrets, DB, teacher impersonation,
  deployment or PM2/Nginx changes; it runs on relevant push to isolated fix branch.
- Protected canonical 43 papers, 38 already persisted Urdu marks and all zeros unchanged.
- Existing Core platform release 6/13 HOLD; no real teacher/School2 authorization witness,
  physical Ricoh Urdu A4, offsite ACL/worker signatures or independently signed rollback.
  Hosted CI PASS would certify ONLY test portability, never production release.
