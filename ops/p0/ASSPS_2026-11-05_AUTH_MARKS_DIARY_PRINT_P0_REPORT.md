# ASSPS P0 — Login 429, Marks Review and Daily Diary Print Recovery

Date: 2026-11-05
Production: https://app.assps.edu.pk
Status: live targeted security/Marks/Diary hotfix deployed; real owner login and physical diary output verification outstanding.

## 1. Authentication HTTP 429 — verified root cause and live remediation

In Nginx access logs, user activity at 06:04 UTC produced 138 API requests per minute behind a shared Cloudflare edge IP and 10 HTTP 429 failures (additional 429s occurred during adjacent minutes). The app.assps.edu.pk HTTPS vhost lacked the trusted Cloudflare real-client-IP include that was already present on api.assps.edu.pk.

- Added /etc/nginx/snippets/apex-cloudflare-realip.conf to the app.assps.edu.pk HTTPS server. That snippet only trusts Cloudflare-published CIDRs; arbitrary clients cannot claim CF-Connecting-IP.
- Increased general IP traffic allowance from 120 to 600 requests/60 seconds to accommodate multi-tab academic operation.
- Excluded login/password-reset POST submissions from the general limiter; they remain subject to the separate strict authentication attempt limiter (60 attempts/15 minutes).
- Did NOT remove authentication, tenant guards, RLS, passwords, or brute-force protections.
- Confirmed the login API now returns the independent 60-per-900s rate policy; normal APIs advertise 600-per-60s.
- PM2 restart initially inherited an incorrect port 8888 (causing a temporary 502); fixed by restarting with PORT=5000 and reconfirmed that the saved/runtime port is 5000. Do not restart this process without preserving PORT=5000.
- Live /login HTTP200, anonymous /api/auth/me HTTP401 (expected); no evidence yet of a verified successful principal-account login after the patch.

## 2. Marks View — two independent problems

Backend exam list is ordered by most recently created exam, so the previous Marks Register picked the latest Assessment 4, which has no saved score rows. Consequently Class, Section, Subject selectors and the results matrix were empty, even though First Term Exam has 1,854 saved scores.

- Read-only school-scoped GET /api/exams?include_saved_counts=1 now includes saved_result_count and saved_scored_count, without altering normal catalog callers.
- The Marks Register initially chooses the newest exam with a nonzero scored result count; otherwise newest with any saved record, otherwise newest available.
- The dropdown now distinguishes exams with 0 versus nonzero saved marks and shows a clear empty-record message.
- No marks were created, deleted, changed or treated as zero.
- Source browser test with synthetic exams 17 (0) and 9 (1,854), plus synthetic saved marks and class/section/subject filters: PASS.
- Exact live static module loaded and was validated in a synthetic production browser session; browser errors 0.
- The real principal's authenticated saved-marks list needs final user-side confirmation. Assessment 4's actual 0 rows and Assessment 5's missing exam record are not fixed by selecting the correct default.

## 3. Daily Diary broken symbols / wrong-glyph printing

Two independent risks were found:
1. Windows HP LaserJet 600 M601/M602/M603 PCL6 showed Error with a retained RAW 28-page, 29 MB "Batch Fee Vouchers" queue job, pages printed 0. Only that stalled queue job (ID 6) was cancelled; after spooler completed the cancellation, queue became empty, HP status Normal, spooler Running. Local metadata was saved to the Windows TEMP recovery folder. Voucher data in the SaaS was NOT deleted.
2. Daily Diary's print iframe called print() a fixed 350ms after document.write, before Google/Urdu fonts and the school crest were guaranteed ready. This could spool fallback or corrupted glyphs.

Versioned Daily Diary print patch:
- Waits for print iframe document.fonts.ready and image load/error events.
- Enforces an 8.5s timeout, with a visible non-destructive warning instead of sending an incompletely rendered job.
- Prevents an outdated first print request from printing after a second click.
- Preserves 8 Studio structures, 8 independent palettes, student diary records and A4 print layout.
- Browser test confirmed six-up and eight-up full-sheet A4 PDFs, with zero clipping. Live versioned JS imports as a React component.

Physical printer glyph quality after this fix is **not** yet directly verified. If symbols persist with a clean queue, printing from a PDF using Acrobat's "Print as Image" option is the next isolated driver-vs-font diagnostic; no additional remote print jobs were sent.

## Release and rollback

Current frontend:
 /var/www/assps-releases/assps-auth429-marks-fontready-20261105

Versioned changed assets:
- assets/MarksRegister-ASSPS-SAVED-DEFAULT-429-20261105.js
- assets/DailyDiaryWorkspace-ASSPS-A195-FONTREADY-20261105.js

The new release was prepared using hardlinks to the prior release; only index.html and the new versioned assets differ. Existing Saved Papers V5, Lesson Planner, fees, attendance, and other chunks were retained. Nginx config was atomically updated after syntax verification.

Previous releases for rollback:
- /var/www/assps-releases/assps-auth429-marks-default-20261105 (Marks fix; no Diary font-ready)
- /var/www/assps-releases/diary-a195-controller-cert-20261104 (pre-P0 frontend)

File backups, kept on VPS (not public):
 /root/secure-archive/assps-emergency-429-20261105/

Backend direct edits:
 /var/www/apex-backend/src/server.js
 /var/www/apex-backend/src/routes/examRoutes.js

These are also preserved as source in the P0 GitHub hotfix branch. Avoid restoring an older backend copy without reconciling release security and active DB permissions.

## Evidence and remaining acceptance

- Nginx -t PASS; production routes /login, /paper-generator, /exams/marks/review and both changed assets HTTP200.
- Anonymous auth API HTTP401 (expected); live node process bound to 0.0.0.0:5000.
- Synthetic Marks Review default and filter regression PASS; ESLint 0.
- Daily Diary print full-sheet PDF regression PASS (6/6 and 8/8, A4 no overflow).
- Live browser dynamic import for both changed modules PASS.
- Build on recovered source PASS.
- Production school data unchanged; no real school account credentials used in tests.
- Principal to confirm login, correct saved-marks records and one real printed diary's legibility; do not label physical print PASS until they do.

## Safety constraints

No weakening of tenant RLS, authorization or password checks. Do not print school data or clear any additional spool entries in remote diagnostics. Keep backend rate policies and trusted real-IP handling in canonical source and the appropriate Nginx deploy templates before the next broad release.
