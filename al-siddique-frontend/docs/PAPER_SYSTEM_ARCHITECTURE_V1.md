# ASSPS Universal Paper System — Architecture V1

## Goal
Replace paper-by-paper formatting repair with one rules-driven Paper Workspace. Existing papers remain source records; the editor creates a mutable working draft and the renderer applies the same rules to every paper.

## Core pipeline
Source Paper → Working Draft → Rule Engine → Shared Renderer → Validation Gate → Save → Print/PDF.

School name and logo are globally locked. Per-paper title, exam type, session, class, subject, code, time, date, language and total marks are editable.

## Question model
Every official section can edit question number, marks, instruction/heading, content, semantic type, answer lines and per-item lines; sections can be moved, duplicated, deleted and added. Reordering resequences question numbers.

## Marks authority
1. Formula total in heading (3×5=15 → 15).
2. Explicit trailing total ((10), (10 Marks), (10 نمبر)).
3. Manual operational marks.
4. Legacy stored marks fallback.
Header total remains independently editable. Mismatches are surfaced by the print audit; marks are never silently invented.

## Urdu / RTL
Urdu, Islamiyat, Social/Pak Studies, Quran/Tarjuma and other Urdu-script papers use Jameel Noori, RTL flow, question heading right, marks left, and Urdu MCQ labels الف، ب، ج، د. Closing bracket sits between label and text: الف) جواب. Tables and print use the same RTL/font rules.

English uses Times New Roman by default, LTR flow, heading left, marks right, and A), B), C), D).

## Semantic layouts
MCQ, short, long, fill blank, true/false, matching, pair tables, generic tables, lists, vertical maths, comparison, number names/place value/order/tables. Auto inference is default; editor can override type.

## Clean navigation
Visible: Paper Workspace, Saved Papers, Question Bank, Pre Classes Papers, Daily Diary, Lesson Plans.
Legacy duplicate generators/editors remain hidden compatibility routes during stabilization and should only be physically removed after regression coverage proves no saved-paper dependency.

## Data strategy
Historical sources are not bulk-rewritten for layout. Rules handle presentation. Only school-approved content corrections change seed source. User edits persist as saved-paper corrections.

## Acceptance gates
Build + rule tests; clean navigation; editable/persistent header and question fields; add/delete/duplicate/reorder; Urdu/English directional parity; MCQ label/bracket correctness; screen/print font parity; no overflow; zero unexpected console errors; rollback snapshot before production.

## Class 7 Social Studies approved correction
- MCQ 1: قشر الارض کی کتنی بڑی پلیٹیں ہیں؟ — الف) 6، ب) 7، ج) 8
- MCQ 8: فصلوں کی کتنی اقسام ہیں؟
- MCQ 9: بین الاقوامی تجارت کن راستوں سے ہوتی ہے؟ — ہوائی، بحری، زمینی
- Marks resolve from headings as 10 + 15 + 15 + 10 = 50.
