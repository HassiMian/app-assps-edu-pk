# ASSPS Lesson Planning controlled-pilot fast track — independent, fail closed
2026-10-26. Proposed review branch, never an authorization to deploy.

## What was actually confirmed
- Integrated Lesson candidate parent HEAD `b0e3bfab754b`, existing frontend dry run `READY_FOR_CORE_GATE`, not production deployed.
- Contrary to stale previous notes, the *running backend source file* `lessonPlanningPublicationGuard.js` is present and SHA-equal to reviewed candidate; running `lessonPlanRoutes.js` contains publication, deletion, immutable source lock guards. It does NOT contain the new leadership-only readiness endpoint that candidate includes. An on-disk file match alone is not a live authenticated staff acceptance receipt.
- From current 26-Oct local critical backup, disposable Unix-socket restores of both clusters PASS, main 63 and signed 36 databases, application catalogs PASS; latest independent encrypted offhost restore remains unverified.
- Anonymous lesson plans GET responds 401; production public homepage responds 200. This does not establish school-specific tenant access.
- CDN still exposes cached private child/fee branding objects intermittently; Cloudflare authenticated purge is not available. Scoped 29 private URL purge manifest is held locally under root-only access. Do not include it in GitHub.
- 3 existing lesson plans, 54 teacher assignments, 1 canonical class/subject match, 53 unmatched; no student/parent shares. Pilot should first validate existing private editing workflow, not publish any uncertified source content.
- Isolated backend tests 25/25 PASS when referencing installed dependencies through a read-only NODE_PATH; initial missing express package yielded 17/19, NOT an assertion failure. No production code modified.
- A read-only pilot gate with independent missing-evidence detection is included. 9 focused policy test groups PASS. It has no bypass/force/deploy flag.

## Independent staged mission path
1. Obtain verified Cloudflare zone authorization, purge exactly known scoped private media objects, then independently probe full inventory across edge locations and repeats. Do not assume clean on a single cache MISS.
2. Obtain approved independent encrypted offhost recovery proof for current dual PostgreSQL clusters, protected media and rollback assets.
3. Verify actual signed Core release, strong School 1 Principal/Teacher login/revision-bound Save -> Reopen -> Update -> Print, and independent School 2 explicit denial; preserve exam marks, grade and rank semantics.
4. Obtain protected real Urdu Nastaleeq A4 printer witness and owner approval for a **small specific reviewed lesson**. Do not bulk-share draft content, spoof actors or invent page references.
5. Use isolated, session-limited controlled pilot after the feature-only checks are all PASS. Rehearse rollback; keep existing frontend, Nginx config and databases intact. Expand only after documented school acceptance.
6. Grade 9/10 QBank general unapproved items are NOT intrinsically part of this **lesson-only** release, but shared private media, authentication, provenance and recovery remain hard dependencies.

## Explicit approval constraints
NEVER treat this doc, scripted boolean checks, synthetic assertions, SSH push access, source SHA parity, or frontend dry-run output as certification. Genuine independently signed operational evidence is required for every remaining sensitive gate. Pushing this review branch does not update main, public site, Nginx, systemd/PM2 or school database.
