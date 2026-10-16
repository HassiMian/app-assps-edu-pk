# APEX Connect — secure HTML interpolation in outbound school/payment emails

**16 October 2026; source only; RELEASE HOLD / NO PRODUCTION CUTOVER.**

## Lineage and change ownership

Previous exact standalone Next security source: `fix/connect-smtp-fallback-secret-guard-20261016@1c6551241c9d04057c63e20cdd9c6283029ff5b8`. This was the latest independently reviewed Connect SMTP credential-fallback safeguard on central GitHub issue #4; its own standalone checkout has no GitHub remote.

New **isolated Connect-only** source branch `fix/connect-mail-html-escape-20261016@e776d8f15350f62708ed55f6b7cd9fbdfc636ec3`, clean, is a direct descendant of 1c65512. The separate GitHub handoff branch is a descendant of `fix/connect-mail-secret-handoff-20261016@f9b2db5a5169cafb69d2437379311432854d8c36`. Scope strictly `src/lib/server/mail.ts` and new synthetic `tests/apex-mail-template-html-escape.test.cjs`. No SaaS backend, Paper Studio, marks, diary, tenancy, Nginx or PM2 source/production mutation.

## Reproduced source defect / limited risk claim

Five outbound onboarding/payment mail HTML templates interpolated untrusted owner, school, email, plan, gateway, transaction, payment-rejection reason and temporary-password fields **without HTML encoding**. Special characters and HTML-like markup from fields could therefore be rendered as email HTML instead of literal text. This creates email-content integrity and phishing/display risks. The existing public lead notification template already escaped its untrusted values.

No actual malicious email or exploitation was observed, and neither a real password nor a live email/log was accessed.

## Scoped repair

Reuse the existing audited `escapeApexLeadHtml()` entity escaper at all previously raw dynamic interpolations inside five HTML mail bodies. This encodes `& < > " '` while preserving visible text. Template structure, recipients, subjects, approved mail transport, credential-issuance logic, SMTP fallback secrecy, immutable payment data and existing notification contracts remain unchanged. No new dependencies, RLS/DB changes, role bypass or secret persistence.

Exact two-file **reversible** patch: `ops/connect/recovery/reviewed-next-mail-html-escape-20261016.patch`, SHA256 `e7e742940726a76ab4fecee2189e18f36776bca4f4484d395cae0a29b9aea97e`. Forward `git apply --check` against unchanged original 1c65512 = PASS; reverse against e776d8f = PASS.

## Executed evidence / explicit limitations

- New six-case TypeScript-transpiled mocked-mail regression: original source **1/6 PASS, 5/6 expected FAIL** (five vulnerable mail paths); fixed branch **6/6 PASS** (including existing escaped lead notification).
- Full isolated Node CJS+MJS regression `node --test tests/*.cjs tests/*.mjs`: **119/119 PASS, 0 fail/skip, exit0**.
- `npx eslint src/lib/server/mail.ts tests/apex-mail-template-html-escape.test.cjs`: **exit0**. `git diff --check`: PASS. Patch forward/reverse applicability: PASS.
- **Optimized Next build NOT certified.** First attempted build failed because Turbopack disallowed an external `node_modules` worktree symlink. Independent local dependencies were then copied and a second build launched; during high VPS load and nearly saturated swap it had not completed, so ONLY that private, unpromoted Next build process was terminated without touching production services. Do NOT count either attempt as a passed build or infer TypeScript/103-page/private HTTP acceptance.
- Mocked SMTP only; no actual sent email, real onboarding approval, production authenticated user, School2 peer tenant test, hosted CI run or physical printer job performed.

## Integration / release rules

Source evidence is available to Connect/SaaS Core for review and controlled forward port onto the **latest verified deployable descendant**, never an older branch. Previous Core 6/13 independently signed certification remains HOLD, together with real teacher/peer-school, worker transport, current ACL/recovery and rollback evidence. No urgent dependency justifies bypassing the tenant/RLS or production release gates.

Historical `email_fallbacks.log` files, if any, are a separate confidential Core security-review item: this patch does not inspect, erase, sanitize or rotate those records. School result marks, genuine numeric zeros, papers and diary remain untouched. Nothing has been deployed publicly.
