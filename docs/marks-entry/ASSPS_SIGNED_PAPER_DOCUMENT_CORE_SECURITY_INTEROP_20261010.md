# SaaS Core signed runtime — Paper/Diary authenticated integration
Date: 10 Oct 2026. Isolated source only. No deployment.

Discovered signed-mode failure on exact backend release-descendant: existing lessonPlanRoutes.js used manual pool transaction and mutable tenant GUC, missing required signed HMAC/actor context. The non-BYPASS clone therefore correctly denied the insert. A second error was user-supplied sentToPortal=true on a new lesson draft; existing Paper/Diary owner security contract explicitly requires author-only drafts and separate publication.

Forward-ported ONLY previously tested Paper document authorization integration from the Core coordination source onto the separate live-backend descendant, WITHOUT modifying any Paper Studio worktree, Paper Workspace, print templates, protected papers, Grade IX–X or APEX source:
- lessonPlanRoutes.js manual transaction signed school/actor binding, fail-closed, private unpublished teacher drafts and date validation.
- dailyDiaryRoutes.js school/author privacy rules and date validation.
- teacherDocumentAccess.js shared Core teacher-vs-school-manager ownership checks.
- lessonPlanningEngine.js exports only already-existing parseIsoDate and MAX_RANGE_DAYS utilities, no generation algorithm change.

This is a cross-workstream security integration candidate; Paper Studio Master must separately sign off ownership/paper preservation before deployment.
Existing backend Marks/teacher/tenant suite plus Core signed helper source suite: 24/24 PASS in default mode. Real signed non-BYPASS Paper/Assessment HTTP against disposable clone required next. Current production DB login still BYPASSRLS, signed schema absent, app deployment remains HOLD.
