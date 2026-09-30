# APEX OS Light Mode and Notification Inbox — V14 architecture
Baseline: production V13 f5a0b96. Date: 30 September 2026.
Scope: presentation shell (sidebar, logo, topbar), Saved Papers visual UI, notification inbox frontend. No source paper documents, fee/challan tables, paper editor markup, student records or bulk messaging actions changed.

## Findings
1. Light theme has multiple global layers in index.css that override each other, including blanket light .super-sidebar span/div and SVG rules. Active link hover changes a navy selected item to pale background without consistently changing white icon and text; icons become invisible.
2. Class super-sidebar-brand-logo is incorrectly reused for every navigation icon tile. A logo-specific light CSS rule consequently puts white tile, border and shadow on all sidebar icons.
3. Sidebar MENU_GROUPS has an unrelated rainbow color per module. SavedPapersTab repeats green/blue/purple/red/gold in stats and actions; Rename/Delete button bodies are empty and appear as mystery pills.
4. Topbar notification feed requests 50 backend rows without recency. Backend sorts by COALESCE(read_at,sent_at), allowing read actions to rearrange old entries. Topbar dismiss() mutates only in-memory state, so old entries reappear on refetch. The reported title is not hard-coded in frontend; do not delete notification records by guessed title.
5. /notifications displays the SMS/WhatsApp sender, not an inbox. View All Notifications thus navigates to the wrong feature. Do not fabricate fee/attendance source events.

## Design tokens
Families: Navy (primary typography, nav, action), white/neutral (page, surfaces, borders), muted gold (focused/selected emphasis). Only small red semantic affordances for destructive/error and green semantic status if meaningful; never use status colors as decoration.
Light tokens: page #F3F6F9; panel #FFFFFF; raised #F8FAFC; navy #102944; text #18293C; muted #596B7D; hairline #DBE2E9; gold #B78720.
Dark theme tokens retain dark backgrounds and high-contrast light labels. All icon actions >=40px target; selected + hover states legible.

## Architecture
A. Shell: one :root[data-theme] semantic token map. Local os-sidebar/os-topbar classes get scoped high-specificity overrides to retire brittle style-attribute matching. One logo-only class; icon tiles independent. Existing routes and permissions preserved.
B. Saved Papers: keep categoryStats, filter, load, rename, delete; replace card markup with semantic os-saved-papers classes. Readable Rename/Delete actions and 2-row action hierarchy. Responsive grid.
C. Notifications: dedicated inbox separate from existing SMS/WhatsApp sender. Bell defaults to recent 30-day alerts, ordered by sent_at; distinct loading/error/empty states, optional older archive. Dismiss never permanently deletes a shared notification_log row. Persist user/device-scoped dismissed IDs as frontend stopgap; account-wide durable dismiss and read state require separately reviewed backend user-state migration.
D. Backend follow-up: GET /inbox support recent/history with role/tenant scope and ORDER BY sent_at DESC; no invented events. Do not run schema DDL or data updates on production as visual release side effect.
E. Paper Workspace stays isolated; print and V13 Urdu fixes untouched.

## Acceptance gates
1. Light/Dark: sidebar active and hover icon + label visible, school logo without vignette/tile leakage, topbar bell visible.
2. Saved Papers: restrained palette; all four actions readable/keyboard focusable; existing saved papers not mutated; mobile grid stable.
3. Notifications: old events absent from recent Bell but accessible in Archive; same-browser dismiss survives refresh for user; no fake events or deletion.
4. Contrast: standard small text >=4.5:1, significant icon contrast >=3:1, focus visible.
5. Theme/printing: no A4 paper or fee/attendance logic changes; unit & browser regression and build before production deployment.

## Implementation/release checkpoint
- Source branch: fix/lightos-v14-navigation-inbox; initial feature commit 2bc3d5c.
- V14 frontend/browser and inbox-model acceptance: 9/9 PASS. Existing V13/V12/V11 canonical/Urdu/print regressions: 42/42 PASS. Production-safety script and frontend Vite build: PASS.
- The public frontend still reports V13 f5a0b96. V14 has NOT been deployed to production.
- Live backend notification-route SHA-256 differs from both the V13 baseline and the staged V14 route even after normalizing local CRLF to LF. Therefore replacing the complete live backend route based on repo history is not safe without a reviewed three-way reconciliation. A full read-copy request was blocked by platform safety checks; do not circumvent this by alternative remote-copy methods.
- Release must use an approved workflow, preserve live backups and unrelated changes, review only the inbox GET query delta, then independently verify authenticated Recent/History, persistent per-browser dismissal and school/role visibility. Do not delete historical notification_log rows or regenerate unrelated papers.
