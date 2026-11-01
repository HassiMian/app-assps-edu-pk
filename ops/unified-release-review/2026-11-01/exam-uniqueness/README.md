# ASSPS technical exam-key uniqueness guard

This source is a reproducible copy of a 1 November 2026 technical migration already validated in an isolated database, then applied to the school production database after a fresh full custom-format pg_dump backup. Database index valid, ready and unique: true.

Affected only the exam identity index; no grades, original First Term marks, teacher assignment or November voucher rows changed.

Canonical key: school ID, trimmed case-folded exam name, trimmed case-folded class (only the known Pre-Nine / Pre Nine alias), academic session. Exam names remain separate across schools or sessions.

The existing active exam creation route enforces authenticated staff role, school context, serializable transaction, school advisory lock and duplicate 409 response for PostgreSQL unique violations (23505). If Assessment 5 is created by an authentic Principal it can now be protected against duplicate class/session keys.

QA on isolated production clone: creating an Assessment 5 candidate succeeded; repeat with varied case/whitespace rejected; same existing Assessment 4 name rejected; distinct School 2 same name accepted. All synthetic writes rolled back or discarded with the isolated database.

**Scope:** This safeguards technical duplicate prevention only. Assessment 5 is NOT created in production; no Principal subject approvals or authentic Teacher/Principal acceptance have been inferred. Official academic release remains HOLD.

Production pre-migration backup (restricted, NOT committed):
/root/secure-archive/assps-resume-20261101/ASSPS_PRE_EXAM_UNIQUENESS_20261101.dump
Backup SHA-256: effb712dddad19b9f6f15e9919a199bff95589aea868ddc65230a446e824e84e
