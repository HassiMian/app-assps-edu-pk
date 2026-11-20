# ASSPS A333 — Universal In-session Navigation

## Scope
First-party navigation layer across existing React Router shells: stable, paper, exams and fees. Back, Forward, Reload, Resume controls near authenticated topbar. No changes to route guards, server APIs, paper documents, diary data or database.

## Data and security
- State is bounded to the current browser session, staff ID, school/tenant, and role, eight-hour TTL, at most 50 URL entries.
- Only registered static paths are saved; allowlisted Paper Studio and Notifications tabs are the sole persisted query values.
- No access tokens, student records, paper questions, passwords or PDF bytes are saved.
- Logout and staff identity changes clear/reset route history. Print hides the navigation controls.
- Auth and RBAC remain solely server-authoritative.

## Limitations
- This fixes application-level route navigation, not each module's unsaved draft recovery or forms.
- Cross-shell Back/Forward may reload the SPA; preserving this existing boundary is deliberate.
- /profile is not a registered React route in the reviewed source baseline; do not certify it.
- Do not overwrite current production index.html with the source branch: production contains unrelated hotfix scripts and import-map versions.
- Live Principal operations must remain uninterrupted. User already edits and prints real papers and daily diaries.

## Tests
- Synthetic browser navigation: 19/19 assertions passed for refresh, Back/Forward, Resume, cross-shell transitions, account isolation and sanitized URL storage.
- Synthetic route smoke: 39/40 targeted paths rendered, with /profile excluded as unsupported in the reviewed router.
- Synthetic tests: zero production data mutations.
- A332 print fixture now fails without this navigation layer because the live frontend independently changed to A333 minimal renderer. This needs separate selector/spec reconciliation.

## Release procedure
1. Resolve active Nginx root and hash current index.html.
2. Make a hash-locked rollback snapshot in /root/secure-archive.
3. Add a uniquely named navigation script without touching existing assets.
4. Append exactly one defer script tag to latest index; atomically replace only after verifying unchanged original hash.
5. Verify syntax, Nginx, HTTP, synthetic browser routing, print-hide behavior and rollback readiness.
6. Persist findings in Final SaaS Audit continuity. Keep production full certification HOLD pending remaining system-level gates.

## Source caveat
This is forward-portable source implementation, not a full rebuild or certification of unrelated production overlays. Reconcile production and canonical source before a full rebuild.

## A333.2 deep-link correction
Legacy /paper-generator/saved is canonically replaced with /paper-generator?tab=saved before React Router mounts. This prevents losing the Saved Papers tab. Navigation titles also use readable module labels.
