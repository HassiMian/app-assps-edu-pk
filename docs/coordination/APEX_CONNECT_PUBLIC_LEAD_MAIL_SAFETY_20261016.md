# APEX Connect — public Apex lead HTML and submission-failure safety, 16 October 2026

## Scope and latest source provenance

This is isolated Connect-owned application hardening, **not** live SaaS production deployment or a signed school-data access certification. Work resumed from clean Connect coordination checkpoint `fix/connect-apex-lead-id-file-boundary-20261016@7378de779fbb092ffa12c1be8a78d70d295eb097`.

Previously verified standalone Next source `fix/connect-apex-lead-id-path-guard-20261016@e0073349d2fc1ae1bda294b9b48f99392695f9b9` is the exact parent of isolated new source commit `fix/connect-public-lead-html-failures-20261016@9c2e34c2fe988cf01dd1a679f42654e278473f07`, which changes only the public lead POST route, shared mail module, new pure HTML-escape helper and new synthetic test. The standalone Next Git repository has no configured GitHub remote; the scoped patch and manifest (not a misrepresented standalone GitHub commit) are published on an isolated coordinated ASSPS repository branch.

## Genuine source defects and fixes

- Public APEX lead form permits user-controlled name, school and notes fields. Prior notification and auto-reply templates interpolated those values into **HTML** without escaping. New `escapeApexLeadHtml` converts ampersands, angle brackets, single and double quotes to safe HTML entities on every externally supplied lead field in both relevant templates, preserving ordinary Roman Urdu/Urdu/English text.
- Original public POST handler returned raw unexpected `Error.message` in HTTP 500 JSON. Now it returns a constant `Unable to submit request` and no-store for unexpected backend/storage failures. Malformed JSON produces a generic 400 with no-store; missing required form fields retain existing 400 behavior.
- Previously, successful persistence followed by admin SMTP notification failure caused HTTP500, encouraging the visitor to submit again even though a lead record had been saved. Notification failure is now caught separately, returns the successful persisted lead ID and emits only the fixed diagnostic `APEX_LEAD_NOTIFICATION_FAILED` without request/SMTP details. Auto-reply was already nonblocking and remains so. No real mail was sent while testing.

This is not spam/rate-limit certification or a full form-validation rebuild. No canonical school/student data authority changed.

## Real isolated regression/build proof

- **Seven** newly added Node tests actually execute the TypeScript POST handler and both real mail functions through tightly mocked storage, SMTP and request facilities. They verify that HTML tags/attributes become literal text, normal Urdu/English remains intact, mail delivery failures after persistence do not create duplicate submission prompts, malformed JSON returns 400, storage failure returns generic noncacheable 500, required inputs remain checked. All use synthetic leads/email addresses and **never send real email or touch production filesystem**.
- Full focused standalone Next regression suite **44/44 PASS**, scoped ESLint on modified production TS files EXIT0.
- Genuine isolated Next.js **16.2.6 optimized `npm run build` EXIT0**, TypeScript PASS, 103/103 generated static pages and postbuild PASS. Root-only build.log/rc mode0600 at `/root/assps-release-evidence/connect-public-lead-mail-20261016`; build log SHA256 `0bbc073d86703e510d4478d5eb47918b339e38237c82d6d26ec20df9be6ca49a`, private BUILD_ID `dlSeqwoA5aoEGvFjwuY6Z`. This is **not** public Build ID `ONDwxEIZlx5onDIKY7wYf` and cannot bypass the original signed production release gate.
- Reversible four-file source diff `ops/connect/recovery/reviewed-next-public-lead-mail-safety-20261016.patch` SHA256 `85839bc4781513c98684a5d9c57f2e96b1d669296ff7f59ccb183569c08abeec`; actual `git apply --reverse --check` on fixed source PASS. Adjacent immutable manifest pins parent/new commits, exact SHA256 of all four Next files, observed build log/ID/exits, `productionModified:false` and `releaseAuthorized:false`.
- Eight extra hermetic Python proof tests independently check immutable patch digest/scope, escaped mail fields, saved-lead success/error redaction, exact byte hash of the new source/test and actual Node22 execution of the recovered pure TypeScript encoder. Source CI changed-path filters and offline test added; remote GitHub Actions PASS not claimed.
- Current complete Connect Python regressions **237/237 PASS**, earlier private Next stage-negative Node tests **8/8 PASS**, workflow YAML parsed successfully.

## Production safety and Core release boundary

Latest verified Core/Paper source remains `integration/core-paper-font-guard-20261016@13ac2be49e8d0aa6939c82f510aa4bbc65caf2a7`, with independently rebuilt reviewed Vite index SHA256 `1097d23897e1bc507a111c4c202aba47a54960e27cf62f34234f95e32e0c26e3`. The current accepted Connect public release still uses green port3002 and Next Build ID `ONDwxEIZlx5onDIKY7wYf`. The latest officially signed Core security was only 6/13, exit2/HOLD: fresh owner-reviewed full ACL backup, independently signed offhost recovery, signed restricted live worker transport, installed exact reviewed adapter, persistent independently authenticated worker, live effective grants certification and independently signed genuine School2/unassigned subject denial remain outstanding.

SaaS Core alone owns reviewed source forward-port, genuine off-host/ACL receipts, signed tenant isolation, controlled blue-green rollback-ready cutover and real teacher + physical Diary Save/Reopen/Print acceptance. A temporary Next optimized build and synthetic mail tests cannot prove those permissions. No production database DDL/DML, student result/zero changes, live staff login, mail sent, private lead record access, Nginx/PM2 restart, Paper Studio edits or production release occurred.

## Fresh current protected Core gate on this new Connect source

The actual read-only four-phase runner was re-executed against exact reviewed Core/Paper `13ac2be49e8d0aa6939c82f510aa4bbc65caf2a7` after adding the public lead fix handoff. Process **EXIT2**, decision `HOLD_NO_PRODUCTION_CUTOVER`: Phase1 production integrity PASS, Phase2 reviewed Next/Core technical **13/15** PASS, Phase3 official independently signed production Core **6/13 HOLD**, Phase4 cutover HOLD. The separate compiled frontend snapshot capacity budget check returned `FRONTEND_SNAPSHOT_HEADROOM_PASS_NOT_RELEASE`, **not** full PostgreSQL backup or signed off-host restore. All seven independent Core conditions listed above remain missing.

Private root-only aggregate receipt `/root/assps-release-evidence/connect-public-lead-mail-20261016/four-phase.json`, SHA256 `c6fbb18e3549aefc0c09a21f52d9ce9b5726e5937f5ee3ccd5f20eb3678673ef`, literal `four-phase.rc=2`. No production_changed, no account secrets or individual student rows in this status receipt. The current Connect coordination branch remains source/QA only, NOT live deployment authorization.
