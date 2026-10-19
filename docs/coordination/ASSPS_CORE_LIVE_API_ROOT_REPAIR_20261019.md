# ASSPS Core — real-backend API root HTTP repair (19 October 2026)

## Precondition
On Hostinger srv1769723, Nginx app root was already serving the independently
verified frontend 8d2d231578fc2f391f2b76f87b6e763ef6b45c51, artifact
index SHA256 279e5406c3c1d9fbe65f0f9572e0778ba35b2fdeb4d7d6a946642dc45fb140f7.
The authorized 54 School1 teacher assignments were already populated, and
backup assps-critical-20261019T031337Z verified 4/4 checksums.

## Implemented targeted LIVE fix
Both independent Nginx app-site configs got only one new exact-match location = /api/
before the preexisting location /api/. It forwards to the RUNNING backend
127.0.0.1:5000/health rather than returning fake static 200 or changing
any authenticated API route. Existing /api/timetable/save explicit HTTP403
security denial is retained. No backend restart, SQL migration or data changes.

- Pre-change Nginx site SHA256: 718cd24e3c0827b42b84e545ef9ac2a135e448e91ea5564aa1f6885575b51c9c.
- Post-change Nginx site SHA256: 5737ce7704bcc87006c078d091c47742cad0233604ef2b11411de2cda988ee78.
- Private rollback backup: /root/secure-archive/assps-unified-20261019/api-entrypoint-health-fix-20261019T050930Z.
- nginx -t PASS, systemctl reload PASS, original instant_rollback_to_20261016.sh --check PASS after change.
- /, /login, /api/, separate api.assps.edu.pk /health HTTP200 (service=super-app).
- /api/timetable/save remains HTTP403: intentionally locked, not fixed.

## Separate findings and OPEN release gates
The real public branding route is /api/school/public-branding?school_code=assps
and it returns HTTP200; /api/public-branding is the WRONG URL and should
not be used as evidence of missing branding. Do not grant broad scope to
fix a client path. Authenticated timetable drafts /api/timetable/drafts
remain HTTP404 on existing live backend (candidate source-only route exists).
Current runtime backend provenance is not certified; 22 overlapping JS/JSON
files differ from the newer fortress RC, and 147 live-only files must be
preserved before any backend promotion. 59 academic source groups remain
held, not implicitly approved. Strict signed-actor HMAC RLS and no-GUC
tenant fail-closed proof remain HOLD. Offhost encrypted ciphertext SHA PASS,
but independent recipient-key decrypt and standalone two-cluster restore
HOLD. No witnessed real School1 Teacher/Principal + School2 acceptance or
physical laser Urdu A4. This release remains PARTIAL; do not claim full
production certification.

## Fresh tenant RLS read-only validation
On 19-Oct after API fix, read-only SQL with SET LOCAL ROLE apex_app_runtime
returned active authorized assignments 0 unscoped, 0 School2, 54 School1.
With SET LOCAL ROLE apexos_user, documents were 0 unscoped, 0 School2
and 18 School1. School document events and revisions have restrictive
20261019 fail-closed policies alongside the older permissive fallback;
this new guard was observed, not installed by this verifier.
The forced-RLS count is 85 **excluding** the historical audit table
(student_class_movement_audit); 86 **including** that table is the same
catalog, not evidence of a new unreviewed 86th protected relation.
Source-controlled read-only acceptance is provided in
ops/release/security/verify_school_tenant_scopes_readonly_20261019.py.
These GUC-based aggregate results do NOT prove signed actor/HMAC
identity enforcement, real staff login acceptance or School2 HTTP E2E.
