# A225 — Whole-backend custody and mounted-route release fence

**Review-only source audit. No production deploy, backup deletion, migration, privilege change or live code modification.**

## Why a passing attendance patch is not a complete backend release

A224 certified narrow attendance dependency closure, not a full redeployable backend. The on-disk live VPS backend has 367 JavaScript source files, versus 67 JavaScript source files in the A224 candidate. Under A225's live read-only scan:

- 302 deployed JS file paths are missing from the candidate;
- 42 present JS files differ byte-for-byte from the live source;
- 23 are byte-identical;
- 46 static live mount(path, module) mappings exist in server.js, versus 27 in the candidate;
- 19 live mount pairs are absent in the candidate, including academic approvals, assessment studio, promotion, documents, paper studio, library, lesson planning and other school workflows.

These counts are observed source-scope evidence, not a production runtime memory hash. No candidate deployment is approved, and A225 does not attempt a partial backend replacement. Each deployed JavaScript source file's relative path and SHA-256, along with the mount list, are stored in a private A225 custody evidence JSON, not published to GitHub.

## Fail-closed gate

ops/release/a225_backend_custody_gate.py enumerates JavaScript files and static route mounts, compares SHA-256s and rejects missing module paths, duplicate mounts, source symlinks and unsafe output locations. It returns HOLD if the candidate is incomplete or different from live.

Example on VPS, using a private evidence output:

    python3 ops/release/a225_backend_custody_gate.py \
      --live-root /var/www/apex-backend/src \
      --candidate-root ./al-siddique-backend/src \
      --canonical-root /root/workspace/assps-term-planner-mission-20261015/al-siddique-backend/src \
      --out /root/workspace/assps-mission-20261107-a225-private/A225_WHOLE_BACKEND_CUSTODY_RECHECK.json

Exit codes: 0 = complete source parity for independent Core review (NOT deployment permission); 3 = known missing/different source or mounts and explicit HOLD; 2 = malformed/untrusted scan or safety failure.

## Scope limitations

- JavaScript *.js files under backend src only. Non-JavaScript config, SQL, assets, database, PM2 environment, route priority, dynamic imports and runtime dependency closure are not fully certified.
- Static mount syntax only; conditional/dynamic registration needs executable isolation testing.
- Hash agreement is necessary but not sufficient for runtime authorization equivalence.
- A225 is not permission to publish live production source to GitHub, invent handlers, upload secrets, wipe worktrees, resize a billable VPS, revoke production grants or deploy.
- A224 found app-owned DDL/CREATE risk, four published unsafe AttendanceModule chunks, and lack of independently restored off-host full data plus global roles/passwords/ACL/RLS. All remain blockers.

## SaaS Core closure

1. Approve canonical source lineage for all 367 on-disk JS files including 19 missing route mounts. Preserve tenant, teacher, inactive-student, assessments, attendance, diary, papers, fees and First Term history.
2. Reconcile the 42 overlapping but nonidentical modules with independent security review.
3. Verify source hashes for configs, migrations, dependencies, deployment scripts and environment variable names without exposing secrets.
4. Build and test against a separately restored DB with authenticated Principal and teacher acceptance, Pre Nine/Nine class boundaries, browser papers, and First Term 1,854-row historical checksum.
5. Fix all four genuinely published unsafe attendance modules, recheck actual import graph and rollback.
6. Independently restore off-host full school data with global roles, passwords, ACL, RLS and owner parity. Resolve app DDL/CREATE permissions.
7. Recover disk capacity to approved reserve of at least 16 GiB plus measured production build headroom. Signed SaaS Core release authorization required.

An automated source-parity PASS alone never authorizes production deployment.
