# ASSPS Final Examination Date Sheet Report

Date: 2026-09-15

## Scope

Configured the Final Examination date sheet through the existing APEX OS Date Sheet module behavior only.

No backend, database, students, fees, attendance, timetable, results, teachers, admissions, or subject-master records were modified.

## Deployed Change

Commit:

```text
9fd7738 feat: configure assps final exam date sheet
```

Production frontend deploy timestamp:

```text
20260915-055912
```

Production backup created by deploy script:

```text
/var/www/apex-os.bak-20260915-055912
```

## Date Sheet Record

```text
Session: 2026-2027
Term: Annual Exam
Rows: 77
```

The existing UI does not have a separate `Final Examination` term, so the existing `Annual Exam` term is used for the final examination schedule.

## Configured Dates

```text
2026-09-28
2026-09-30
2026-10-02
2026-10-03
2026-10-05
2026-10-06
2026-10-07
2026-10-08
2026-10-09
2026-10-10
```

No rows are configured for:

```text
2026-09-29
2026-10-01
2026-10-04
```

Sunday `2026-10-04` remains exam-free.

## Classes Included

```text
Starter
Mover
Flyer
One
Two
Three
Four
Five
Six
Seven
Eight
```

Not included:

```text
Nine / Pre Nine
Hifaz Class
```

## Written / Oral Implementation

The current Date Sheet implementation has no separate paper-type field. It stores printable subject labels only.

To avoid changing the global subject master, Written/Oral is encoded as Date Sheet-level labels only, for example:

```text
English Written
English Oral
Mathematics Written
Mathematics Oral
General Knowledge Oral
General Knowledge Written
```

## Subject Mapping

```text
Math -> Mathematics
Islamiat -> Islamiyat
S.St -> Social Studies
Nazra -> Quran / Nazra
```

Class 6 English mapping:

```text
2026-09-28: English A
2026-10-07: English B
```

Class 7 English mapping:

```text
2026-09-28: English
2026-10-07: English B
```

Class 8 Quran/Nazra mapping:

```text
2026-10-10: Quran / Nazra
```

No duplicate `Nazra` and `Holy Quran` papers were created.

## Urdu Holiday Exceptions Preserved

The schedule intentionally keeps `2026-10-03` as the next-paper day after Urdu for:

```text
Starter
Mover
Flyer
One
Two
Three
Six
Seven
```

Classes Four, Five, and Eight remain blank on `2026-10-03`.

## Time Handling

No examination time was guessed.

All seeded rows use blank time fields:

```text
times: ["", "", ""]
```

The old Date Sheet print fallback that displayed `09:00 AM` for blank times was removed, so blank times remain blank in print output.

## Verification

Local matrix validator:

```text
rows: 77
issues: 0
```

Frontend lint for touched files:

```text
PASS
```

Frontend production build:

```text
PASS
```

Live route contract:

```text
PASS
```

Live app/API checks:

```text
https://app.assps.edu.pk              200
https://api.assps.edu.pk/health       {"status":"ok","service":"super-app"}
```

Live deployed DateSheet chunk:

```text
DateSheet-DKlgHLCi.js
final exam seed present: true
old 09:00 AM fallback present: false
required date 2026-09-28 present: true
```

## Persistence

The Date Sheet module now writes the final schedule into browser localStorage on authenticated Date Sheet module load and records seed version:

```text
al_siddique_date_sheets_final_exam_2026_2027_seed = assps-final-exam-2026-2027-v1
```

After this seed is written, reloads preserve the rows through the existing Date Sheet storage mechanism.

## Final Status

```text
FINAL_EXAM_DATESHEET_DEPLOYED
```
