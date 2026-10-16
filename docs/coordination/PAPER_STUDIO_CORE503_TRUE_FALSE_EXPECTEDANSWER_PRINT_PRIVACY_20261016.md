# ASSPS Paper Studio — Canonical True/False student-print privacy protection

**Date:** 2026-10-16 (UTC/PKT confirmed same calendar day)
**Owner:** Paper Studio only; SaaS Core sole production release owner
**Candidate branch:** `fix/paper-core503-student-expectedanswer-projection-20261016`
**Exact verified source base:** `integration/core503-marks-rls-paper-privacy-20261016@e38408a061e3eda53f5443ee1664d7ca7abfb609` (the newer Core Marks503 + Paper privacy/Diary15 82-policy source), GitHub remote head reconfirmed.

## Independently verified source-level gap and minimal remedy
- Backend canonical PaperDocumentV2 TRUE_FALSE model has genuine boolean/null `expectedAnswer`, while previously reviewed `assessmentPrintJobs.js` recursively stripped other answer aliases but **not** normalized `expectedAnswer`. Student printable projection could therefore retain a correct true/false answer. This is a **source-level exposure potential**, not an observed real student leak; no real student/paper record was inspected to fabricate an incident.
- A new real source fixture with `expectedAnswer:true`, legacy alias `expected_answer:false`, and `expected-answer:true` proves normalization, teacher-only answer-key preservation, no release mutation, and retention of printable statement, indicator box and student roll number.
- **Fail before fix:** exact base sanitizer + new domain test: **9 PASS / 1 FAIL, exit1** because the release's answer material was not even detected (`false !== true`). Private original negative log SHA256 `f0c9365e5bdd65648c6936c5e0612ab8d2283db1f1e19177b433bcb90de53a6a`.
- **Narrow fix:** add exactly one canonical sensitive key `expectedanswer` to `FORBIDDEN_ANSWER_KEYS` (plus source comment). Existing recursive sanitizer normalizes camel, snake and hyphen forms; no broad filtering that damages `answerLines`, MCQ options or student print geometry. Authorized staff projection continues to preserve original correct answers. Runtime source modifications: **only** `al-siddique-backend/src/services/assessmentPrintJobs.js`; test-only domain file changed and Paper privacy CI push branch registered.

## Actual reproducible tests on this exact isolated candidate
- `node --test al-siddique-backend/src/tests/assessment-print-jobs-domain.test.js`: **10/10 PASS RC0**; private log SHA256 `c501a60e544f3c0f4ad8e79eb1effb077148625292d802fbb794edea2eb3efca`.
- Domain + independent static projection: `node --test al-siddique-backend/src/tests/assessment-print-jobs-domain.test.js al-siddique-backend/src/tests/assessment-print-projection-boundary-static.test.js`: **12/12 PASS RC0**, no skip; root-private receipt `/root/paper-core503-expectedanswer-domain-static-20261016.log`.
- Frontend `npm ci --prefer-offline --no-audit --no-fund`: RC0; subsequent `npm run build`: RC0. Compiled `al-siddique-frontend/dist/index.html` SHA256 `db0ef46c9922c049f0b150a1a2b00323c15c67967483cd02ccdafa48d0134237`, byte-identical to prior reviewed source (since application/frontend unchanged); private full install/build receipt SHA256 `8488b9007c8734dd43f5774e2ca0eb1272817d7e39690a20df1d71d210ad3db7`.
- Frontend synthetic Chromium personalized/durable duplex print: **1/1 PASS RC0**, no actual hardware job; receipt SHA256 `47d8f8451ccd600a508ab1048d129c4199e238b55c9ab0ea49aa51e6c2cb88ea`.
- Original six official protected templates: **PASS / unchanged**, actual `npm run verify:templates` RC0.
- Actual Word DOCX binary, model, math: **9/9 PASS RC0**; Jameel Nastaleeq/Microsoft Word physical rendering not implied by source tests.
- Paper privacy CI YAML parsed; targeted branch trigger added; hosted GitHub Actions execution/green status **not certified**.

## Production and institutional release HOLD
- VPS read-only app HTTPS200, API health HTTPS200, signed emergency Marks POST 5093 health200, Nginx config test PASS; these are service health probes only, not user Print/Save sign-offs.
- No live school student marks/results, official papers, Diary, lesson plans, Question Bank, RLS/ACL, worker service, credentials, physical printer, Nginx or PM2 changed; no deployment, migrations or DML. No grade IX–X provisional bank questions approved.
- SaaS Core must reconcile only this scoped Paper patch against its **newest** reviewed descendant, rerun actual tenant/teacher/grant and printer regressions and satisfy independent release signatures. Last independently attested Core release gate **6/13 HOLD** for full signed ACL backup, off-host restore, persistent restricted worker/adapter, independently authenticated worker and effective inherited-grants/real School2-unauthorized-subject denial; legitimate teacher Marks Save->GET with authentic missing records and hardware Urdu Diary A4 print remain unverified. Never fabricate staff approval, real score values or production rollback witness.
- Source rollback: revert this small commit on the future approved descendant, or discard this isolated branch; live release is unchanged and requires no production rollback. All concurrent owner worktrees and historical chat artifacts preserved. Full historical chat transcripts unavailable byte-for-byte; GitHub issue #4 and immutable source/test evidence control.
