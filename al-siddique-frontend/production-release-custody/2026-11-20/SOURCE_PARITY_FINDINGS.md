# A335 clean-source parity audit

- Captured at 2026-11-20 16:40 UTC, active static root index SHA-256: 40441b05df6bc27be8df52959754110410e98a0c65c0be9cba1afa8c58721248.
- Source worktree: b48527a8040303a60f1d9cf883fb147959b6f1d2 plus A335 custody snapshot, built in an isolated detached worktree. Vite build returned exit 0.
- Active production contains 26 direct asset references and 14 mapped overrides; all referenced assets are preserved in this branch.
- release_guard.py against immutable custody snapshot: PASS, zero blockers.
- release_guard.py self-test with removed navigation asset: PASS (rejected mutant).
- release_guard.py against clean Vite dist: BLOCK, **80 missing or mismatched deployment requirements**. Existing active A336 navigation, Daily Diary presentation CSS and numerous A342 Paper Generator runtime overlays are not present in the clean build output.
- Synthetic browser comparison of clean Vite preview was inconclusive because it remained at the loading screen under synthetic authentication. Do not mistake that for a verified production functional defect.
- Existing live navigation: 61/61 routes passed new A335 synthetic testing, latest scroll Back/Reload and Resume scroll tests passed, and A342 bilingual table test passed after updating the stale QA expectation for initial MCQ Table ON to the current minimal fallback on OFF.
- Full static private archive hash: e5aab3c855e90c721b600561d8a71a9f7456289c2c622586ce5ca99e62030f69. Restore to scratch, verify 1,081/1,081 files, then discard scratch; never overwrite active production to rehearse a restore.

**Release decision: HOLD clean source rebuild.** Source feature parity is still an integration requirement, not proof that current working production is malfunctioning.\n