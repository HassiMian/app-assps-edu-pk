# ASSPS security review: private media in public branding routes
23 October 2026. SOURCE-ONLY COORDINATION. Remote main does not match the live release; do NOT redeploy this stale branch wholesale.

## Real evidence
The shared public branding upload directory mixed intentional top-level marketing art with identifiable schoolchild birthday images, student-source artwork, fee receipts and nested private documents. Actual anonymous HEAD requests for real private receipt and child imagery were HTTP200 on multiple HTTPS Nginx origins prior to the source-only hardened location rules. Actual nested reference/template directories also returned HTTP200 on a public API virtual host. No evidence or claim that an external attacker intentionally visited the resources.

## Nginx protection applied on ALL live HTTPS hosts
The existing Nginx location for /uploads/branding/ in each public HTTPS virtual host now rejects:
- any nested path within this directory, including private reference/template/draft/receipt documents (HTTP404);
- top-level filenames containing receipt, birthday, result_card, clean_student or voucher (HTTP404, Cache-Control private, no-store).
Public general marketing PNG/JPEG artwork remains HTTP200. No original files were deleted or committed.

The review-only Nginx location guards must be inserted INSIDE each original Nginx alias location, not used to replace the entire file. Representative contained snippets, to be adapted with normal Nginx syntax validation:
    if ($uri ~* "^/uploads/branding/[^/]+/") { return 404; }
    if ($uri ~* "(receipt|birthday|result_card|clean_student|voucher)") { return 404; }

Four actual direct HTTPS origins (app, api, www, apex): fee receipt 404, personalized birthday 404, nested references 404, nested templates 404, ordinary marketing artwork 200. Twenty HTTP HEAD checks passed. Nginx -t passed and app/API healthy HTTP200. Actual live config hashes are separately pinned to independent read-only QA source, original configs preserved VPS root-private.

## CDN EDGE IS STILL A CRITICAL UNRESOLVED HOLD
Cloudflare cached some private child/receipt images before origin deny. CDN ordinary original URL could still respond HTTP200 with cf-cache-status HIT even after direct origin and fresh cache-busted requests returned HTTP404. A later check still found at least one child birthday image returning HIT200. NO authorized Cloudflare zone API credentials or purge client was available in this VPS environment. Do not invent a zone ID, token, fake Cloudflare API action, or count origin security as an edge purge.

The release gate must remain BLOCKED pending genuine authorized CDN cache invalidation across private asset keys plus verification that original unmodified public URLs on every relevant HTTPS domain return 404. Periodic passive expiry may help but cannot be asserted in advance.

## Scope of this review branch
No academic marks, roles, result sheets, original photographs, publisher Ed25519 signatures, tenant credentials or payment proofs added to the remote repository. No scheduled ChatGPT task. Do not merge stale main without review of current live marks write safety, immutable DB guardian, signed principal school authority, signed school phone scope and dual-PG rollback.
