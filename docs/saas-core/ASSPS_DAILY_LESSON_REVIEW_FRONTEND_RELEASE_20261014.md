# ASSPS Paper Studio — Controlled Daily-Use Syllabus Review Release (2026-10-14)

## Decision and scope

This release is deliberately **FRONTEND-ONLY**, based on the **ACTUAL public Nginx frontend source commit** `3e8ea26635c0699807e77a1b7f9b263891eeaaa5`, not the older stale `/var/www/apex-os` metadata. At inspection time, public `app.assps.edu.pk` Nginx served directory `/var/www/assps-resultcards-class-isolation-8b5d370e` containing current release `3e8ea266`. The prior October 8 frontend release `24cbcae` is a verified ancestor of this current release. The current worktree was created directly from the latest deployed source to retain October 14 result-card, marks and diary fixes.

## Feature deployed only in already-authenticated Lesson Planning Workspace

- Dedicated `Second Term Source Review` panel within existing Lesson Planning Workspace.
- User uploads their private **59-group original academic source JSON** obtained from the school conversation deliverable.
- Upload is verified client-side with browser SHA256/crypto.subtle against 59 immutable pinned source digests, exact source ZIP and TXT hashes, 12 classes, 1 unassigned Islamiyat submission and original line excerpts. Altered or wrong school files fail closed.
- Class → subject → original WhatsApp excerpts and source line provenance.
- Adds separate unapproved correction proposals without changing original source. Saves these proposals to a **downloaded private JSON working copy**, which can be verified and reopened later. No browser-local persistence of private source; no API upload or student/parent notifications.
- Single class and all 12 classes A4 print previews, original Urdu text and safe font fallback. Physical printer/Jameel Noori installation remains subject to local acceptance.
- Explicit UNPUBLISHED label. Miss Adiba is composer only, not automatic teacher. Zero actual teacher/section/term assignment, academic approval, result writes or publication.

## Safety / limitations

This module is usable daily for offline-private source review and printing inside the existing SaaS frontend, but it is **NOT** a production database import, genuine teacher assignment or academic publication. The separately developed signed-RLS backend feature flags remain OFF. The existing backend, Next/Nginx Connect login, staff credentials, Marks Register, results and PostgreSQL roles are NOT changed by this release.

## Verified source/build evidence

- Exact public Nginx root verified; latest 3e8ea26 adopted as base instead of outdated 24cbcae metadata.
- Vite optimized build PASS.
- ESLint new code PASS.
- Chromium live browser SHA256 verifies 59/59 private original candidates with the school source file, 12 classes rendered, proposed correction saved/downloaded/reopened, single-class and all-class A4 print previews PASS.
- No original private WhatsApp messages bundled into distributable Vite output. It includes only independently pinned SHA256 digests and user-facing tooling.
- Production deployment must back up actual Nginx root, preserve previous assets for in-flight browsers, atomically swap static assets only, verify index + asset HTTP200 and check unprotected 401 routes remain protected. Rollback by restoring actual old directory if smoke fails.

## Independent full SaaS integration

Full 59-source server import, authenticated signed teacher/Principal review, six global inherited-table RLS remediation and APEX Connect Next/Nginx login cutover remain separate production release gates as documented in GitHub issue #4. Do not bypass genuine institutional approval.
