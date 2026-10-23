# ASSPS reviewed 23 October 2026 school security hotfix package
SOURCE ONLY, NOT an automatically applicable migration or deployed Nginx config.

Independent production school webhook patch is live: after Meta HMAC signature verification, inspect the full payload with reviewed schoolWebhookChannelScope helper against the configured WHATSAPP_PHONE_NUMBER_ID BEFORE any inbound-event database INSERT or primary/fallback JARVIS handling. Reject missing config (503) and any foreign-phone message/status in the batch (403). Iterate ALL validated entries rather than entry.changes[0].

Real VPS production HTTPS negative verification: three actual Meta-app-secret HMAC-signed synthetic test requests (wrong phone message, wrong phone status, mixed valid+wrong-phone status) were all denied HTTP403 SCHOOL_PHONE_SCOPE_MISMATCH. The school whatsapp_inbound_events row total remained 1755 before and after. There were no actual messages delivered or school data modified. This is NOT proof of real positive school phone Meta delivery, second-school authenticated user-session denial, or whole JARVIS tenant isolation.

A separate Nginx HTTPS location ^~ /assets/ResultCards included a suffix denial:
    if ($uri ~* \.bak_pos_[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]$) { return 404; }
Five forensic Result Card JS backup URLs originally returned HTTP200; now HTTP404. Genuine matching JS stays HTTP200 and school home HTTP200. Existing principal signature direct URL remains HTTP403. This belongs INSIDE the existing ResultCards location. Do NOT replace the entire Nginx file from stale GitHub main.

Actual served Nginx frontend root /var/www/assps-releases/baseline-20261022-1404. Earlier pre-Oct22 rooted audit was stale. Current served homepage digest 2bf36c546aceea5ea9cddd4ed48bc24974981a75e8297a9cd1ee801ac431f107, 510 files / 412 extras vs canonical 98-file build (2 mismatched). Frontend release remains HOLD. Current root-only supplemental recovery tar, original database backups, and private event receipts are on the authorized VPS only, not in GitHub.

Strict warning: remote main is STALE relative to live Next.js/Nginx, role policies, DBA event guards, Exam9 custody, privacy restrictions and original academic records. This main-derived branch adds only reviewed helper plus explanatory text; it is NOT a request to redeploy the old main branch, and is NOT a principal-approved academic award or student marks correction. Do not merge or apply automatically without authorized complete source-security parity and rollback window.
