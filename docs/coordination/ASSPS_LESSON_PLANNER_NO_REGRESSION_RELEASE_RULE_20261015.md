# ASSPS Lesson Planning — Protected but Upgradable Release Contract

Owner boundaries: Paper Studio owns Lesson Planning, Daily Diary and print. Grade IX-X owns subject knowledge. SaaS Core owns release, backend database, RLS and VPS. GitHub issue #4 is central coordination.

## Verified production regression

As of 15 October 2026 08:04 UTC, current app.assps.edu.pk HTML SHA256 was 0af53ae824340f2ddc0b91e848163f8bddad4263d1bb7a7cf92a2bcda923325a. Active index-C5HG5flw.js reached PaperGenerator-Dy5oebvW.js, and then the old LessonPlanModule-D149cpax.js (~24 KB). That module has no Weekly Notebook, Save Week, Save Term or full Term + Assessment layout. Stale unreferenced LessonPlanModule-BAGJNSbl.js exists in assets (~78 KB), but is NOT the running UI. Not a browser cache bug.

The source for recovery is GitHub integrated candidate 5f360a36a8c3a20e6faf8612853f4ce0cf593a65, which descends from both Grade IX-X b18a8aae and Paper Studio 3282ca7. Never deploy the old sibling branch over newer protected work. Candidate provides full Term Planner with all class subjects and page ranges, separate numbered Assessment/Date table, Weekly Notebook, Daily Student Cards, English/Urdu fonts, row height/width controls, Save Term, Save Week, A4 printing and source-bound unpublished server drafts.

## Persistent release requirement

For any frontend deployment to app.assps.edu.pk, use the latest merged canonical source and run the production build and then:

    python3 ops/release/check-lesson-planner-ui.py --dist al-siddique-frontend/dist
    python3 -m unittest discover -s ops/release/tests -p test_lesson_planner_ui_contract.py -v

The check follows ACTUALLY LOADED built JavaScript modules starting from index.html. It rejects the old module even if improved chunks remain unused on disk. It verifies exactly one active PaperGenerator and one LessonPlanModule, full UI markers and protected source ancestry. Dedicated GitHub Actions workflow Protect Lesson Planner Releases is scoped to relevant frontend pushes/PRs so independent backend/Connect deployments are not blocked by this UI-only check.

The release contract is versioned. This is NOT a hard SHA freeze: newer clean descendants are allowed when they preserve the required user-facing functionality. When an intentional design changes control names, update the versioned contract and its regression tests through source review, run real Save-Reopen-Print acceptance, and promote the reviewed newest descendant. Never bypass via empty markers or stale files. The source and compiled output must agree.

## Guarded but usable deployment

Read-only preparation:

    python3 ops/release/guarded-lesson-planner-rollout.py \
      --repo "$PWD" --dist "$PWD/al-siddique-frontend/dist" \
      --expected-live-html-sha ACTUAL_CURRENT_HTML_SHA

The SAME verified tool supports --apply without any repeated routine permission request, once the actual SaaS Core signed release verifier returns READY with independent real staff/tenant/recovery acceptance. Supply --release-id, --core-proxy-sha and --core-build-id from signed current Core provenance. It has no fake-approval, skip, force, or permanent locked-commit path.

The tool preserves the existing live frontend directory, creates a new commit-named static release root, backs up the active Nginx config in a private directory, changes ONE verified static root directive, checks nginx syntax and origin TLS HTML, and automatically restores the previous config on failed postflight. Never delete the old static root, saved papers or database.

## Ownership and release protection

- Keep First/Third Term unsourced unless their genuine original curriculum exists. No invented dates, teacher assignments or academic approvals.
- Preserve all school1 marks including numeric zeros versus missing, papers, lessons, attendance, fees and student data.
- No uncontrolled DB migration, user login impersonation, fake printer or teacher/peer acceptance.
- Check CURRENT production SHA and agents before release; no older source may overwrite a newer one.
- Do not permanently use chattr immutable, file locks or fixed SHA pins to block authorized future improvement. The guard is semantic and versioned.
- GitHub administrator should set this workflow as a required check for production frontend merge/release branches. A workflow cannot technically prevent root-level manual file replacement if another operator intentionally bypasses deployment policy.
- Publication, tenant-RLS/worker and real staff acceptance still require independent SaaS Core release verification. Technical source passing alone is NOT public certification.

Status: regression verified and recovery candidate prepared; no public cutover was performed merely by authoring this documentation.
