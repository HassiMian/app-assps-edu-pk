# APEX Connect — unified security mission: SMTP fallback must never store credentials

Date: 16 October 2026. Owner: APEX Connect MASTER. **Reviewed source-only integration candidate; NO production cutover.**

## Source and ownership, not a reset

Reconciled Issue #4 and previous Connect published handoff `fix/connect-lead-stats-handoff-20261016@8cc0f5636cb61610419e8eda43fdacbdf8f32d7a` (published source local SHA equals origin). The new application change is a clean isolated standalone Next branch `fix/connect-smtp-fallback-secret-guard-20261016@1c6551241c9d04057c63e20cdd9c6283029ff5b8`, strictly descended from reviewed clean `fix/connect-admin-lead-stats-failclosed-20261016@d2875c2fbcbc15df0da44eb966d32fd34dd04033`. That Next checkout **has no GitHub remote**. Publish its exact SHA-pinned reversible four-file patch through this official Connect coordination branch rather than claiming direct application source promotion. Other Core, Paper Studio and Academic owner worktrees unchanged.

## Actual source-level security defect found

The existing `src/lib/server/mail.ts::sendMail` SMTP-disabled fallback appended the full email HTML converted to plain text, including recipient, subject and user-provided values, to `logs/email_fallbacks.log`. The existing school-account-credentials email includes a **temporary password**, so an SMTP outage could write sensitive credentials to a server log file. `sendSchoolCredentialsEmail` returned void even after `sendMail` returned `false`, allowing the subscription approval caller to wrongly set `emailSent:true` after the real email was not sent. Additional payment and public-lead missing-recipient fallbacks wrote names/contact/payment reference metadata. The authorized admin lead follow-up endpoint reported `success:true` even when SMTP had not delivered anything.

These are **source-level privacy/communication risks**, not an assertion that a real credential was exposed. **No existing production log contents were read or copied.** Historical logs may still require confidential security review, access-permission assessment and properly approved credential rotation/retention decisions by SaaS Core; a forward fix does **not** retroactively sanitize preexisting files.

## Exact Connect-only implementation

1. Fallback logging now accepts **only enumerated non-personal event reasons**, never recipient/subject/body/lead metadata/password; a newly created log directory uses private mode `0700` and a newly created file uses `0600`. It reports `Delivered:false` and a timestamp, not customer content.
2. A school credentials send when SMTP isn't configured now throws the static `APEX_CREDENTIAL_EMAIL_NOT_DELIVERED` error, which the existing subscription approval caller catches to set `emailSent:false`. The approval database transaction, existing credential issuance contract, authorized admin response and tenant ownership are **unchanged**. The caller no longer prints upstream SMTP exception objects, which might contain addresses or transport secrets.
3. Existing follow-up POST keeps the established HTTP200 response shape but truthfully sets `success:false`, `emailSent:false` and explains that no mail was sent when SMTP is absent. All follow-up 200/401/403/404/500 responses are explicit `Cache-Control:no-store`. Auth and exact lead-ID validation occur before storage/email.
4. SMTP-configured transport sends the same approved email content as before; no new email recipient, authentication bypass or new data persistence introduced.

A preexisting log file's permissions are not silently rewritten, and hardware/power-loss/fsync durability is not claimed. This is **not** SMTP connectivity verification, real school sign-in, a secret-rotation project or email delivery-provider acceptance.

## Immutable source and test evidence

Exact 4-file patch `ops/connect/recovery/reviewed-next-mail-privacy-20261016.patch`, SHA256 `814c7e296dcae6ca218a285b358d518a97200259ae73357918a586f950f70b38`. Only `src/lib/server/mail.ts`, `src/lib/server/subscription-request-approve.ts`, protected follow-up route and new 10-case mock suite are changed. Literal forward `git apply --check` on previous source and reverse `git apply --reverse --check` on fixed source both PASS. The only log/credential strings in tests are obviously synthetic sentinel literals, and mailer/filesystem/network/auth are mocked: **no SMTP, real leads, school passwords or actual local logs were accessed**.

Genuine fail-before proof on restored exact previous source: **1/10 PASS, 9 expected FAIL**, exit1. Fixed source synthetic TypeScript-transpiled tests **10/10 PASS**, encompassing SMTP missing credential non-delivery, metadata-only log, private file/directory creation modes, actual mocked SMTP success, private lead/payment notification fallback, truthful follow-up 200/false, protected 401/403/404/500 and no-store, and source approval emailSent=false. All Next application CJS suites **103/103 PASS**. Scoped ESLint **exit0 with zero warnings/errors**.

Fresh isolated Next16.2.6 optimized build **exit0**, TypeScript complete, 103/103 static pages and postbuild normalization PASS. Private Build ID `0A9A6B-nhFBzGnUTHvnMx`; root-only build log SHA256 `f38e2410478ed42cc9f74bdf4543a76ce3eeddab43b8801f4e294ed45250b052`. A real temporary Next process on loopback ran **9/9 private HTTP checks PASS**: public login200 and eight anonymously denied private school/admin/auth APIs401, including lead stats. Process/port shut down after QA. Root-only HTTP receipt SHA256 `746f4f71445c781a315cf8090c7614425fb0c795b47b1ebe07d00927a9d2f645`. No genuine authenticated teacher or School2 token tested. Immutable offline source+recovery contract **7/7 PASS** and complete Connect Python suite **301/301 PASS**, process exit0. CI YAML locally parses; **hosted CI green not claimed**.

## Latest actual protected four-phase decision

Reran exact approved last independently rebuilt Core/Paper `86a675890620ebb315af17dcd063cc09b0eed89e` with the previously reviewed private Connect technical stage, **not** the new unpromoted SMTP build. Phase1 current production read-only data integrity **PASS** (1,763 exam-result rows including 213 genuine numeric zeros; anonymous private access denied). Phase2 compiled Connect/Core technical **13/15 PASS**, with two unpromoted old public Lesson Planning and Early Years companion checks. Phase3 **independent signed Core security 6/13 HOLD**; Phase4 cutover **HOLD**; overall `HOLD_NO_PRODUCTION_CUTOVER`, actual verifier exit2, `production_changed:false`. Root-private current receipt SHA256 `eaafa8135ac4a9df22e6b3989a1b55ea3e4aa8bed52730c0babfef90cfc533c0`.

Seven genuine blockers remain: approved complete ACL backup, independent off-host current recovery, signed restricted production worker transport, exact live reviewed adapter, separate authenticated global worker, effective live inherited grants, and independently signed genuine School2/unassigned-subject denial. Newer Paper/Core code exists in separate active workstreams; do not infer any is Core-certified production or silently substitute a different SHA/digest. A build and synthetic tests are **not** production-release authority. Official physical Diary Save→Reopen→Print, real authenticated roles, current worker signatures, Core-approved rollback and postflight still pending.

## Strict next action and non-mutation guarantee

SaaS Core/security authority should assess any **historical** fallback-log sensitivity using approved confidentiality/backup procedures, decide any credential rotation and secure retention, then coordinate source forward-port, approved production deployment and genuine SMTP delivery acceptance. Do not paste credential files/logs into chats or Github, do not wipe evidence without reviewed recovery and retention plan.

**Absolutely no production records, existing logs, student results/marks, saved papers, PostgreSQL grants/RLS, staff credentials, worker services, real email transport, Nginx or PM2 were modified in this Connect operation.** Current live Connect Build ID `ONDwxEIZlx5onDIKY7wYf` remains authoritative until independently approved release. The new source is only a private compiled and GitHub-coordinated patch.
