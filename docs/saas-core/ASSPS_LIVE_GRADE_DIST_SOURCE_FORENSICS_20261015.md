# ASSPS APEX Connect / SaaS Core — forensic source association for current public Grade bundle
**Date:** 15 October 2026 UTC. **Production decision:** HOLD. Issue #4 coordination.

## New major finding: exact existing build artifact located

Read-only searched **194 existing dist/index.html build artifacts** in
`/root/workspace`; exactly ONE matches the actual Nginx-served Grade HTML
SHA256 `0af53ae824340f2ddc0b91e848163f8bddad4263d1bb7a7cf92a2bcda923325a`:

`/root/workspace/assps-resultcards-core-review-20261012/al-siddique-frontend/dist`

All **89/89 files** within that located `dist` directory match their corresponding
running public Grade frontend files byte-for-byte. ZERO mismatched and ZERO
missing. Running Grade static root contains **290 total files** (thus **201**
additional files relative to that identified dist tree). The earlier
Result Cards deployed reference directory itself has 892 files, so a matching
entrypoint is not proof that all these trees are identical. This exact local
artifact association is a stronger clue about how the live frontend was
assembled, **NOT a cryptographically certified clean-source build**.

## Why source/release authority remains unproven

The discovered build tree is **Git-ignored/untracked**: `git ls-files` does not
track its `dist/index.html` binary. The containing source worktree is
`audit/core-private-finance-evidence-20261012`, local HEAD
`66162f08a00c076627ae3ed0755857a213bdf91a`, but GitHub origin HEAD
for that same branch is
`00da1e296c3116086a1d1e98c272eb0534e4ee8e`.
Eight tracked source paths are modified in the local worktree, including
Daily Diary, Early Years worksheets, AppLayout, topbar and index CSS
(529 lines added and 103 removed per current git diff --stat).
A modified worktree and untracked compiled artifact cannot be equated
with a reviewed source commit, even if file timestamps and hashes match.
Do NOT overwrite, clean, stage, reset, force-push or deploy this worktree,
which may contain a different agent's active changes. Only SaaS Core and
the relevant frontend owners may review its exact build provenance and
source approval.

This does not establish an intrusion, data leak or intentional rollback.
It establishes **unverified production source provenance** and one exact
build-artifact association. Current `app.assps.edu.pk` returns HTTP200;
both the 68 entrypoint asset references and 286 literal build asset paths
were found to exist on the running static directory, so do not fabricate
missing assets. The prior reviewed Grade index
`92283fc8eec1d5fe1562abfe26f75b731c0b9eeb5f1883802b3e2a2cabc330ff`
is separately archived and still differs from the active static entry.

## New executable fail-closed tests and snapshot

- `verify-public-grade-dist-source-match-20261015.py` compares every located
  dist byte against live files, enforces an exact observed 89-file pin,
  rejects source/live symlinks and a changed public index, reports
  extra live files and Git SHA/local/remote/dirty-source facts.
  Technical `--source-only` exit0 does NOT mean certified ancestry.
  Production mode always exit2/HOLD until separate genuine sign-offs.
- `test_verify_public_grade_dist_source_match_20261015.py`: **12/12 PASS**
  using disposable file fixtures, including missing/replaced lazy chunks,
  symlink entry, missing dist files, remote/Git metadata unavailable,
  extra files and forged release from technical evidence.
- New **on-VPS forensic snapshot**, root-private:
  `/root/assps-release-backups/grade-live-origin-forensics-20261015/current-live-grade-root.tar.zst`.
  SHA256 `2cfa671d73aebd2120e5c911b1ec668c31faa1b5c2db7b3cb6f794844d2701c1`;
  checksum verification PASS. Captures current static root in addition to
  the existing previous-reviewed Grade archive. This is NOT offsite
  independent recovery, a rollback rehearsal, or reviewer approval.
  No files in any running public directory were modified.

## Latest release reconciliation

Canonical ASSPS school records, actual Exam9 marks including real zeros,
passwords, users, Paper Studio papers, approvals, staff sessions and
running Nginx/PM2 are not modified by this mission.
The previously reviewed restricted worker remains absent from the running
backend and public Connect is still build `ONDwxEIZlx5onDIKY7wYf`.
The exact new private Connect `rc1vIlE6prAQ8pHrw7ohX` passed separate
source/build/synthetic HTTPS browser tests; none establish real staff
login. Existing Core+Paper Stage overlay and release gates HOLD if the
actual production static source baseline or reviewer actor evidence drift.

**Pending genuine real-world gates:** responsible owners must certify actual
current Grade static frontend ancestry; Muhammad Imran must personally
perform first temporary-password change and fresh signed relogin; an
authorized independent School2 actor must genuinely prove school/subject
HTTP-denials; reviewer/Principal must sign exact SHA-bound recovery,
worker and release receipts; SaaS Core must then approve/test running
restricted worker, verified database RLS, independent recovery, controlled
rollback-ready Next/Nginx cutover and live postflight. Synthetic identities,
mock signatures and ignored source drift cannot replace these.

## Additional root-private preservation after source association

To prevent loss of possible concurrent agent edits during later owner
reconciliation, exported the **current eight modified tracked UI file diffs**
from the associated local Git worktree to a root-private evidence copy:
`/root/assps-release-backups/grade-live-origin-forensics-20261015/uncommitted-source-ui-review.patch`.
SHA256 `3e209fc0319189009665015c2d48e22ce032438b22cc05bd3a120d2ebc4c9913`;
44,310 bytes, file mode 0600 and containing directory mode 0700.
Recorded the eight modified paths and local/remote Git heads separately.
The source patch is NOT published in GitHub, is NOT a production change, and
does not establish which edits produced the `dist` binaries. Original
uncommitted worktree remains untouched. The current public static snapshot
archive SHA256 `2cfa671d73aebd2120e5c911b1ec668c31faa1b5c2db7b3cb6f794844d2701c1`
was independently rechecked via SHA256SUMS. Neither archive is offsite or
human-certified recovery.
