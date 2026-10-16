# ASSPS Grade IX–X — Durable Question Revision-Change Audit (16 October 2026)

Technical Academic Master source-only evidence; NOT independent faculty review, school adopted-book edition attestation, Paper Studio publication permission, or a Core production release.

## Actual gap closed
The existing live 2,411-question source audit computed SHA256 for actual question wording, options, answer, grade/medium, chapter/topic, marks and difficulty. Replacing the latest hash snapshot on each audit could otherwise erase the previous revision identity after an edit.

A new root-private versioned revision journal anchors the previously saved 2,411-question SHA baseline and records every future material revision with stable question ID, old/new SHA256 and observed time, in a hash-chained event list. A revert to old text is still recorded as a new event requiring re-review. No question text/answers, student data or staff identifiers are written. No database writes or question approval changes.

## Integrity and recovery
The journal replays its chain against the anchored original ID-to-hash baseline and denies invalid/missing IDs, invalid hashes, event tampering, missing previous snapshot and forged reviewer/publication flags. Journal is saved before the latest revision receipt. A crash after journal save but before latest snapshot is recoverable without duplicating events.

10 unit tests PASS for zero-edit repeated run, multiple edits, revert, crash replay, tamper/missing IDs, false approvals, and private-only data. 20 unified six-phase tests PASS including false approved revision audit rejection. Two real initial VPS audits captured 2,411 revision hashes with 0 fabricated earlier history and 0 spurious duplicate change events; private receipt mode 0600.

## Existing autonomous workflow
The existing Sunday Grade IX–X academic source service now invokes the journal through its current live-revision hash stage. GitHub CI and the existing install script run hermetic tests, verify the private journal, require 2411 stable IDs and 0 academic approvals, and write to /var/lib/assps-grade910-sourceclaims/live-revision-history.json (root-private). The six-phase machine receipt reports cumulative changed revision events and never treats these as qualified teacher approvals.

Remaining real academic release prerequisites: ASSPS authentic adopted textbook editions and applicable session, actual textbook content/page/exercise mapping, independent qualified subject/Urdu review bound to each exact question revision, and SaaS Core / Paper Studio authorized approved-snapshot acceptance. No existing marks/zeros, Diary controllers, print jobs, official papers or production frontend/backend changed.
