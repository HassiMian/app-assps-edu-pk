# APEX Connect — Zero-routine-human private Next HTTP acceptance (16 Oct 2026)

Connect-owned **source-only** addition: `ops/connect/smoke_private_next_http_20261016.py` with 18 adversarial unit tests.

The smoke command accepts **only** Next builds under `/root/assps-release-candidates`, exact BUILD_ID and existing build/dependencies. It launches the selected immutable candidate on a disposable **127.0.0.1-only** port, refuses automatic redirects, checks `/dashboard`, `/dashboard/history`, `/teacher`, `/login`, and `/api/auth/me`, then terminates the entire private process group even after failures. It rejects stale admin fallback and 200 anonymous protected data. Any mismatched build or route fails closed.

Example (private, no public reload):
```sh
python3 ops/connect/test_smoke_private_next_http_20261016.py
python3 ops/connect/smoke_private_next_http_20261016.py --next-stage /root/assps-release-candidates/apex-connect-login-challenge-current-live-20261015 --expected-build-id rc1vIlE6prAQ8pHrw7ohX
```

**Evidence boundary:** anonymous localhost route QA does NOT certify signed teacher/peer-school identity, worker transport, production release readiness or Ed25519 independent receipts. It does not modify Nginx, PM2, live SaaS, school marks, diary records, passwords or physical printer state. SaaS Core retains full joint release/rollback authority.

## Recovery of exact reviewed private Next changes (source, not rollout)

An additional versioned **10-file** source patch and SHA256 manifest now preserve reviewed private Next changes from base Git commit `67db5bff39f36e72ab14d4acd2b4a7448bb0d40b` to reviewed `9fcca4320bdbeb834f6494d1af82d82f1d9b818f`. The original private QA Next Git repository has no configured `origin`, so keeping only compiled build files would leave an unnecessary recovery gap. Tracked files:

- `ops/connect/recovery/reviewed-next-role-neutral-firstlogin-20261016.patch`
- `ops/connect/recovery/reviewed-next-role-neutral-firstlogin-20261016.manifest.json`
- `ops/connect/verify_recovered_next_source_20261016.py`
- `ops/connect/test_verify_recovered_next_source_20261016.py`

The verified delta includes role-neutral dashboard routing, login redirect precedence, temporary-password challenge, 401 interception boundary and build config. The patch **contains no production .env, student records, passwords, database dump or private keys**. `verify_recovered_next_source_20261016.py` reconstructs ten original source files in an automatically deleted temporary directory, refuses an unreviewed commit, applies the published patch and checks that all ten recovered files match exact reviewed Git source hashes. This check is **source recovery evidence, not signed release certification**.

On the VPS where the original reviewed isolated Next source exists:

```bash
python3 ops/connect/verify_recovered_next_source_20261016.py --source-repo /root/assps-release-candidates/apex-connect-login-challenge-current-live-20261015
```

A Core reviewer must still integrate the reviewed source into its independently authorized current release ancestry, satisfy authenticated security and rollback gates, then perform the actual promotion. Never directly `git apply` the patch into the live `/var/www/apex-connect`.

## Root-level ESLint failure repaired in isolated Next source (16 Oct 2026)

Actual reviewed private Connect Next candidate baseline:
- `eslint src`: 367 files, **0 errors, 394 warnings**, exit 0.
- `eslint .`: **fatal** configuration error (`react/no-unescaped-entities` used without registered `react` plugin in certain root-level CommonJS files).
- Root-cause repair on isolated source worktree: register `eslint-plugin-react` in the actual config object and apply the TypeScript `no-require-imports` exception **only to .cjs Node test/release helpers**. This is a file-type rule correction, not a global lint bypass.
- After correction, `eslint scripts`: **146 files, 0 errors, 10 warnings**, exit 0; `eslint eslint.config.mjs next.config.ts`: **2 files, 0 errors, 0 warnings**, exit 0. Separate `src` result remains 0 errors / 394 warnings on unchanged source. A massive unrestricted full-root lint run was aborted due to timeout and must **not** be reported as complete.
- Reviewed corrected Next flat config, SHA256 `520ddbd1a0d347a8e3d12e2fce14c4a2ca8b700cb87cf93be3c65efb449b8b83`, is preserved as `ops/connect/recovery/reviewed-next-eslint-config-20261016.mjs`. Eight CI adversarial guards ensure this config retains JSX safety and TS warnings. It can be forward-ported ONLY after Core/Connect reviewer compares exact current protected Next source.

No public Next compiled build or authenticated service was replaced by this QA.
