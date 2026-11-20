# ASSPS A336 — Navigation, Deep-Link and Scroll Release

Scope: One unified browser navigation controller. Production paper, diary, marks, attendance and student records are not rewritten.

## Bugs reproduced before A336
- Resume dropped Students view, Students add and Employees add query parameters.
- Question Bank saved scroll position 300 but Browser Back and Reload returned to top (0).
- Router whitelist was sourced from stale GitHub files, missing routes present in the live compiled app.

## A336 implementation
- Keep previous A333 Back, Forward, Reload, Resume, session identity/school/role isolation and 8-hour/50-route bounded history.
- Whitelist actual compiled live static paths and bounded opaque employee/online-test dynamic paths.
- Preserve only Students bounded numeric/UUID view ID or Students/Employees add=1; reject arbitrary search, token and password queries.
- Reapply AppLayout scroll offsets on Back/Forward, Reload and explicit Resume, retrying on late module loading and cancelling on user input.
- Clear only UI scroll offsets on account/tenant switch. Preserve saved paper drafts.
- On reduced content size, clamp saved scroll to available height.
- Keep toolbar hidden in print and preserve server RBAC.

## Evidence and release safety
- Deep-link regression and privacy tests, tenant isolation, scroll Back/Reload/Resume, 59 static routes plus dynamic patterns, six Paper Studio tabs, old global nav regressions and print hide.
- Special historical unified paper URL canonically routes to Paper Workspace.
- SHA-lock and backup the current production index; never rebuild or overwrite existing paper/diary hotfix assets from stale source.
- Audit source branch is not a production rebuild or proof of all connected systems.
- Overall SaaS certification remains HOLD independently of this scoped navigation verification.
