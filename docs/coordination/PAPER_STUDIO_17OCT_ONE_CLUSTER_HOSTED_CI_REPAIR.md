# ASSPS Paper Studio — one coordinated QA repair cluster, 17 October 2026

Base: exact Core owner commit `0d3d5e3c05ab49e3e87ccd86e119ddb043a3d913`. GitHub coordination: issue #4. SaaS Core alone controls production promotion.

## Scope and verified changes

Two GitHub Actions portability failures, one isolated test-only patch:

- The real Urdu-marks source verifier requires UID 0 and private modes 0700/0600. The test now asserts `UNTRUSTED_PRIVATE_DIRECTORY` on non-root hosted runners, while preserving the full real root-owned positive, permission, and symlink tests on the VPS. The production verifier is unchanged. Root VPS run: 18/18 PASS.
- The Daily Lesson V5 negative test no longer reads an archived absolute `/root/workspace` path. It uses a disposable synthetic HTML/asset graph containing a reachable LessonPlanModule with required markers except `Save Day to School Server`. The original contract correctly rejects it. With the previously reviewed matching frontend compiled artifact, all 3/3 tests PASS. The positive current-bundle test remains intact.

`py_compile` and git diff checks passed. Original school marks, official 43-paper corpus, template assets, tenant/RLS, teacher privileges, production apps and staff accounts were not modified. The synthetic browser Corpus43 and Diary15 source evidence is preserved but not equivalent to real Ricoh hardcopy. Ricoh hardware Windows read-only status during this mission became WorkOffline=False, status normal, zero detected errors, with no physical print acceptance yet.

## Release decision

The two local test failures are resolved; hosted GitHub Actions still need actual pass evidence. Signed SaaS Core full production security gate last independently verified 6/13 HOLD. Remaining genuine independent offhost ACL recovery, signed worker and role witnesses, real School2 refusal, officially reviewed teacher assignments, formal Urdu offering approval, and physical school A4/rollback cannot be simulated. No deployment or permission change has been made by this patch. Source-only rollback is revert of its one commit.
