# Production Release Report — Class 1 Science & Islamiyat Reconciliation + Controlled Deployment

**Deployment Timestamp:** 2026-09-25T02:40:34Z (PKT: 2026-09-25 07:40:34)  
**Target Release Branch:** `release/paper-editor-v2-20260922`  
**Previous Production SHA:** `8609421571dc5a459ffd23aa27ef047c41ab3f45`  
**New Production SHA:** `a2fbb7a7e6ee4767027d35ba56039248879f1324`  
**Remote Release SHA:** `a2fbb7a7e6ee4767027d35ba56039248879f1324`  
**Git Sync State:** `0 ahead, 0 behind` (Local HEAD == origin/release/paper-editor-v2-20260922)  

---

## 1. Database & Code Backup Artifacts
- **PostgreSQL Custom Dump:** `/var/backups/apex/apexos_backup_20260925-074034.dump` (Verified with `pg_restore --list`, size > 100KB)
- **Frontend Rollback Path:** `/var/www/apex-os.bak-20260925-074034` (Full replica of prior production build)
- **Backend Code Rollback Path:** `/var/backups/apex/backend-code-20260925-074034/` (Routes and src-routes prior state)

---

## 2. Database Migration Results
- **Migration 002 (`002_attendance_integrity_and_indexes.js`):**
  - Unique constraint `attendance_student_id_date_key` on `(student_id, date)`: **APPLIED & VERIFIED**
  - Performance index `idx_attendance_date_status` on `(date, status)`: **APPLIED & VERIFIED**
  - Performance index `idx_students_active_school` on `(is_active, school_id)`: **APPLIED & VERIFIED**
- **Migration 003 (`003_attendance_sequence_and_write_integrity.js`):**
  - Sequence discovery: `public.attendance_id_seq`
  - Pre-migration sequence state: `MAX(id) = 12538`, `last_value = 12538`, `is_called = true`, `next_generated = 12539`
  - Threshold check: `next_generated (12539) > threshold (12538)`
  - Action taken: Sequence was already safe; **zero mutation performed** (`mutated: false`).
  - Read-only verification: Monotonic invariant preserved, no rewind, zero `nextval()` side effects.

---

## 3. Production Runtime Health
- **Public URL (`https://app.assps.edu.pk`):** HTTP 200 OK
- **Frontend `release-meta.json`:** Verified SHA `a2fbb7a7e6ee4767027d35ba56039248879f1324`
- **Backend `release-meta.json`:** Verified SHA `a2fbb7a7e6ee4767027d35ba56039248879f1324`
- **Backend `/health` Endpoint:** HTTP 200 OK (`version: 1.0.0`, `status: running`)
- **PM2 (`apex-backend`):** Process ID 446748, status **online**, 0 errors, CPU 0%, memory stable
- **Nginx Configuration:** `nginx -t` syntax OK, test successful

---

## 4. Class One Papers Live Acceptance
Verified on live production application via Playwright:
- Total official papers in store: **43**
- Total Class 1 papers: **5 unique papers** (0 duplicates)
  1. `official-first-term-2026-class-1-urdu` — *First Term Examination 2026 - Class 1 - Urdu* (50 marks, 5 sections)
  2. `official-first-term-2026-class-1-countdown-mathematics` — *First Term Examination 2026 - Class 1 - Countdown (Mathematics)* (50 marks, 5 sections)
  3. `official-first-term-2026-class-1-english` — *First Term Examination 2026 - Class 1 - English* (36 marks, 5 sections)
  4. `official-first-term-2026-class-1-science` — *First Term Examination 2026 - Class 1 - Science* (0 marks, 6 sections, English)
  5. `official-first-term-2026-class-1-islamiyat` — *First Term Examination 2026 - Class 1 - Islamiyat* (0 marks, 4 sections, Urdu RTL)
- **Marks Treatment:** Kept as 0 (unresolved, no invented marks).
- **Sections Integrity:**
  - Science contains all 6 teacher-supplied sections (Q1–Q6).
  - Islamiyat contains all 4 teacher-supplied sections (Q1–Q4).
- **RTL & Typography:**
  - Urdu RTL layout engine verified on Islamiyat.
  - English typography verified on Science.

---

## 5. Attendance & Database Integrity Verification
- **Attendance Rows Count:** 7,728
- **Attendance MAX(id):** 12,538
- **Sequence Status:** `last_value = 12538`, `is_called = true` -> `nextGeneratedId (12539) > MAX(id)`
- **Duplicate Records Check:** `0 rows` with duplicate `(student_id, date)`
- **Attendance Routes:** Returning HTTP 200 OK
- **Dashboard Statistics:** Returning HTTP 200 OK

---

## 6. Paper Generator Regression Status
- Existing 41 papers remain intact and accessible.
- Paper Studio Editor launches normally.
- Question Bank unaffected.
- No duplicate papers.
