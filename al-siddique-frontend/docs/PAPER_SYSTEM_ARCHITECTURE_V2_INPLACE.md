# ASSPS Universal Paper System — Architecture V2 (In-place Editor)

## Why V2
V1 fixed the generator architecture, source protection, marks ledger, RTL/English rules and clean navigation. The remaining instability comes from edit controls being rendered inside the printable document. That changes document flow and makes Manual Edit look like a different paper.

V2 principle: **editing must never change paper geometry**.

## Pipeline
Immutable Source Paper -> Working Copy -> Semantic Rule Engine -> Shared Renderer -> In-place Edit Layer -> Quality Gate -> Save -> Print/PDF.

## Document invariants
- School name and logo remain globally locked.
- Every other header field remains editable.
- Manual Edit does not replace, resize, reflow or shift the document.
- Edit mode is indicated only by a red dotted outline and non-printing floating controls.
- Print output never contains edit chrome.
- Source paper is never silently rewritten; user edits are stored in the working copy.

## Text editing
- Click an editable line/field in the rendered paper itself.
- Typing edits that exact field in place.
- Selecting text and applying Bold/Italic/Underline/font/font-size/color/highlight affects only the selected text.
- Rich formatting is stored as sanitized field-level HTML in the working copy.
- Plain semantic text is stored alongside rich formatting so MCQ/math/table parsing remains deterministic.

## Section editing
A floating section inspector (outside document flow) owns:
- question number
- marks
- semantic type
- section answer lines
- per-item answer lines
- divider: inherit / show / hide
- move up/down
- duplicate
- delete
- advanced raw content fallback

## RTL rules
- Urdu/Islamiyat/Social Studies/Pak Studies/Quran/Tarjuma: Jameel Noori, RTL.
- Major question: heading starts at right; marks remain left.
- Item labels remain on the same line as item text.
- Urdu alphabet item labels use closing bracket only: الف) ب) ج) د)
- The bracket sits between label and text; no trailing dot.
- MCQ labels use the same rule.

## English rules
- Times New Roman default.
- Major question starts left; marks remain right.
- Item labels remain on same line.
- Numeric/Latin item labels retain conventional punctuation.

## Mathematics rules
- Cambria Math / Times New Roman fallback.
- Vertical arithmetic uses separate operator and numeric columns.
- Digits align by place value; operator width never pushes the lower number sideways.
- Answer rule/underline belongs to the operation cell, not to the numeric text line.
- Mathematical content stays LTR even inside an Urdu paper unless the text itself is Urdu.

## Section dividers
- Global Section Lines switch remains available.
- Each section may override it: inherit, show, hide.
- Divider is presentation only and never changes academic content.

## Clean UI
Always visible:
- Paper Workspace
- Saved Papers
- Question Bank
- Pre Classes Papers
- Daily Diary
- Lesson Plans

Inside Paper Workspace:
- core header fields
- Edit Paper toggle
- Question Menu
- Save
- Print
- compact Template selector

Advanced Paper Style remains collapsed until needed.

## Quality gates
Before deploy:
- edit mode geometry unchanged
- Urdu inline labels
- MCQ bracket order
- vertical arithmetic alignment
- per-section divider
- selected-text formatting isolation
- working-copy persistence
- print removes edit chrome
- zero unexpected console errors
- existing V1 paper-system tests remain green
