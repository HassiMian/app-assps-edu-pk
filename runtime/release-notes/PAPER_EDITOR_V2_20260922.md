# RELEASE NOTES: Paper Editor v2 Canonical Architecture

- **Release Commit SHA**: `8609421571dc5a459ffd23aa27ef047c41ab3f45`
- **Release Tag**: `paper-editor-v2-20260922`
- **Release Branch**: `release/paper-editor-v2-20260922`
- **Production Target**: `https://app.assps.edu.pk` (API: `https://api.assps.edu.pk`)
- **Release Date**: 2026-09-22
- **Verdict**: `PRODUCTION_RELEASE_PASS`

---

## 1. Executive Summary
This release transitions the APEX OS Paper Generator from an unstable patched draft interface into a robust, professional, Word-like examination paper authoring platform ("Paper Editor v2"). The release establishes a centralized document model (`PaperDocument`), ProseMirror/Tiptap rich text editing with true word-level selection and undo/redo history, deterministic multi-layout options (compact MCQ grid, matrix table, balanced 2-column short questions), native Urdu RTL layouts, and backward-compatible legacy paper migration.

Additionally, this release implements a critical PostgreSQL multi-tenant isolation fix that resets tenant session GUCs (`app.rls_enabled`, `app.is_super_admin`, `app.tenant_id`) in connection pool release hooks, preventing connection reuse cross-tenant data leakage.

---

## 2. Major Architectural Changes

### A. Canonical PaperDocument v2 Model
- Introduced standard immutable-first schema in `PaperDocument.js`.
- Clean separation of document metadata, institution header, global exam configuration, layout styling, and section trees.
- Deep cloning and structural serialization guarantees isolation between edits.

### B. Tiptap / ProseMirror Word-Level Rich Text Editor
- Selection-aware rich text formatting: Bold, Italic, Underline, Subscript, Superscript, Font Size (pt), Text Color, and Font Family.
- Actions apply strictly to active text selections without bleeding into surrounding questions, sections, or pages.
- Native Undo/Redo history stack capturing formatting, layout changes, and content revisions sequentially.

### C. Deterministic Layout Engines
1. **MCQ Layout Engine**:
   - `compact-grid`: 4 options (A, B, C, D) aligned horizontally in a compact row.
   - `matrix-table`: Tabular grid layout with table headers and borders.
   - `classic`: Standard flowing layout.
2. **Short Questions Layout Engine**:
   - `2-column-balanced`: Deterministic split dividing questions evenly (e.g. 1–5 in left column, 6–10 in right column).
   - `single-column`: Classic vertical layout.
3. **Urdu RTL Layout Engine**:
   - Dynamic directionality detection (`dir="rtl"`).
   - Localized Urdu option markers (`الف`, `ب`, `ج`, `د`).
   - Nastaliq typography with fallback font stacks.

### D. Printing & Deterministic Layout
- A4 standard dimensions (`210mm`) with margin guards.
- Seamless print parity: Ribbon toolbar and editing controls automatically suppressed during print preview and PDF export.

### E. Backward Compatibility & Safety
- Full compatibility with existing Saved Papers via `migrateLegacyPaper.js`.
- Preserved legacy engines (`PTSPaperGenerator.jsx`) as safety fallbacks.
- Daily Diary regression protection: zero CSS contamination and zero session interference.

### F. Multi-Tenant RLS & Pooled Connection Security Fix
- PostgreSQL connection release in `database.js` now resets session GUCs in a `finally` block:
  ```sql
  SELECT set_config('app.rls_enabled', 'false', false),
         set_config('app.is_super_admin', 'false', false),
         set_config('app.tenant_id', '', false);
  ```
- RLS policy updated across all 27 tables with `school_id`:
  ```sql
  USING (
    current_setting('app.rls_enabled', true) IS DISTINCT FROM 'true'
    OR current_setting('app.is_super_admin', true) = 'true'
    OR school_id = NULLIF(current_setting('app.tenant_id', true), '')::int
  )
  ```
- Validated with 8-phase automated adversarial test suite (`tenant-isolation-adversarial.test.js`).

---

## 3. Production Backups
Timestamped production backups captured prior to release:
- **Directory**: `/var/backups/assps/pre-paper-editor-20260922-190500/`
  - `apex-os`: Frontend directory snapshot (17 MB)
  - `apex-backend`: Backend directory snapshot (228 MB)
  - `apexos_db_dump.sql.gz`: PostgreSQL database dump (`apexos`, 283,871 bytes)
- **In-Situ Snapshots**:
  - `/var/www/apex-os.bak-20260922-191021` (17 MB)
  - `/var/www/apex-backend.bak-20260922-191021` (228 MB)

---

## 4. Rollback Procedure
If rollback is ever required:
1. **Frontend**:
   ```bash
   rm -rf /var/www/apex-os
   cp -a /var/www/apex-os.bak-20260922-191021 /var/www/apex-os
   nginx -t && systemctl reload nginx
   ```
2. **Backend**:
   ```bash
   cp -a /var/www/apex-backend.bak-20260922-191021/config/database.js /var/www/apex-backend/config/database.js
   pm2 restart apex-backend --update-env
   ```
3. **Database (if needed)**:
   ```bash
   gunzip -c /var/backups/assps/pre-paper-editor-20260922-190500/apexos_db_dump.sql.gz | sudo -u postgres psql -d apexos
   ```

---

## 5. Residual Risks & Future Hardening Recommendations (OPTIONAL_HARDENING)
1. **Rate Limiting on Express `/api/auth`**:
   - `authLimiter` (`max: 10` per 15 min) is currently mounted on all `/api/auth` routes.
   - Recommended future hardening: scope `authLimiter` strictly to `/api/auth/login` and `/api/auth/reset-password`, keeping `/api/auth/me` under `generalLimiter`.
2. **Urdu Nastaliq Font CDN Delivery**:
   - Currently uses Google Fonts with system Nastaliq fallback.
   - Recommended future hardening: self-host an optimized WOFF2 subset (~350 KB) in `/public/fonts/` for complete offline independence.
