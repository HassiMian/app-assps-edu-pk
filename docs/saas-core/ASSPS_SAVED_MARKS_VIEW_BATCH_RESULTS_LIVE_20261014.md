# ASSPS SaaS Core: saved marks register and class result-card batch print

Date: 2026-10-14. **Scope:** production frontend-only. Current Nginx root is `/var/www/assps-resultcards-class-isolation-8b5d370e`; deployed entry prior to this mission `index-DVBd6zTe.js`. The active root metadata identifies frontend source `59cf3dc8d0ef372c037501e0b1df0e37df90904f` (Employees hotfix). The source's pristine frontend rebuild differs in filename hashes but matches the latest production MarksSheet, ResultCards, GradeSettings, and PaperEditorRouter chunks at 0.992/0.999/0.995/0.994 normalized-comma similarity respectively, with matching artifact sizes. The real core backend and marks database are deliberately unchanged.

## Architecture / pipeline
Existing Marks Entry → authenticated exam catalog → saved examination selection → read-only result query → server-returned rows only → session / exam type / saved term / class / section / subject / GR/name search → A4 landscaped printable register.

Existing Result Cards → saved exam → choose single, whole class or all classes → visibly labeled shortcut buttons → existing explicit class and optional section selection and locked class-scoped data projection → batch card designer / A4 preview and print.

Leadership route `/exams/marks/view`: requires existing `exams_marks` permission AND principal/admin roles; teachers have no schoolwide read route. The new viewer performs no POST/PUT/DELETE. Printed student metadata is escaped. Recorded zero is preserved as zero; missing score/unsaved rows are not silently made zero. Subject maximum/pass uses approved class/section offering when provided, then saved row/exam metadata; unknown pass policy remains unknown. The workflow does not publish marks or alter institutional grade policy.

## Verification, rollback and residual release boundaries
- 7 isolated unit cases PASS (zero vs missing, class+section isolation, exact subject maximum/pass, special states, print XSS).
- Mocked authenticated principal Chromium: register filters, zero, scoped popup, single-class multi-card designer, teacher gate rejection PASS. No live data changed.
- Scoped ESLint clean, protected six templates unchanged, Vite build PASS.
- Deploy **only** static hashed frontend assets and atomically update live `index.html`, after verifying predeploy live entry and Nginx root match. Snapshot old index/meta and preserve old assets for immediate rollback. Do not reload Node, apply DB migrations, change sessions or publish exams.
- Verify HTTPS 200 frontend/asset, unauthorized results API still 401, and non-target backend/PM2 status. Browser-mocked smoke is not a substitute for a real authenticated principal and physical printer check.
- **Separate policy discrepancy:** Grade Setup F=0–49 contradicts the announced 40% subject pass threshold if the school intends 40–49 to receive a passing grade. This requires a distinct authenticated grade-policy decision; do not silently overwrite server policy in a read-only feature patch.
