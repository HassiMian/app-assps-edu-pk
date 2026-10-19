# ASSPS Unified Core Mission — Current Live Source and Secure Timetable Recovery

Date: 19 October 2026. STATUS: SOURCE ONLY / RELEASE HOLD.
Authority: GitHub coordination Issue #4; first-term examinations and result cards are FINISHED. Existing examination and student data must never be reset or reentered.

## Runtime and recovery facts
- Hostinger srv1769723; Nginx frontend root /var/www/assps-resultcard-nazra-purged-20261019.
- Current live frontend index SHA256 3c74d3be652b41549ef2129eaacec4c341c05c2118597e308edffd17a33726a9.
- Reproduced 98/98 active frontend file hashes using an independent fresh Vite build from clean local Git HEAD 3f7fbfa4ed0cf893a83f0805f182f9d7264c069f. Another 198 live files require preservation and provenance review. Earlier release attestation sidecar is stale and must not be forged.
- Source HEAD has six local commits since remote candidate 603075a18efca3c94e02044ab6a2ce9cfd611589. This new branch preserves their history; never force-push the shared branch.
- Backend current runtime version is uncertified. Nearest matching local worktree differs in 18 overlapping code files and contains 171 fewer live JS/JSON/CJS/MJS files. Never wholesale replace current backend or unrelated ARGUS/JARVIS content.
- Physical student aggregate 326 including 322 School1, three School2, one old test school; 1,854 exam records, 224 real zero marks, 54/54 authorized teacher grants. Keep all counts and relationships untouched.

## Completed isolated development
- Forwardported previously reviewed secure timetable service and route from fix/core-timetable-write-failclosed-20261019@0c9b7063 onto current source. Modified only timetable route; added guarded helper and mock HTTP tests.
- Principal/manager-only verified school actor, no default School1, cross-school override refusal; source-attestation default HOLD; strict 8-period and current bell source; optimistic SHA concurrency plus serializable/advisory transaction; verified teacher/employee identity; tenant context and rollback.
- Historical Regular timetable rows remain preserved. Four-domain unsafe timetable-save POST stays forbidden by Nginx (403) until independent live authentication and migration release gates.
- Local unit contract 12/12 PASS. Isolated Express mocked HTTP 5/5 PASS; these fixtures do NOT attest production actors or a production DB. No production SQL DML, deployment or service reload by this development work.
- Protected snapshot rebuild of 98 files PASS. Local recent critical backup checksum 4/4 PASS; rollback --check PASS (NOT rollback apply).

## Existing source blockers; do not cover up
- The protected resultCardTemplates.jsx source no longer matches the old protected template hash (actual cb76705cffecd8675f35ab6425b904374a44197a53779e403384a022fff7ee29; locked expectation 302b5f162689b2067a81073b98de53ffd38502cf2659c2a5757fe8d099c1c13c). This patch does NOT edit that file or claim a protected-template PASS. Reconcile against already-printed First Term evidence and Paper Studio ownership.
- The source production safety check also flags preexisting grading-policy use in examRoutes.js and two TimetableModule.jsx print/tenant/style checks. These files are NOT modified by this branch.
- Backend deployment requires source reconciliation for different routes/services, not a whole-directory replacement.

## One coherent next release gate programme
1. Publish and attest exact live-source ancestry; immutable frontend and backend component releases; freeze concurrent in-place mutations.
2. Reconcile backend changes preserving all live-only files, and run real signed actor/HMAC RLS and School2 role isolation.
3. Migrate signed timetable drafts only after disposable PG16 rehearsal, authenticate genuine Principal/Teacher/School2 acceptance, then reassess locked timetable POST.
4. Coordinate independent Academic approval of 59 held lesson source groups and Paper Studio publishing; no fabricated signoffs.
5. Independently decrypt and restore BOTH PostgreSQL clusters on a different authorized host; Windows-targeted VPS fallback does not qualify.
6. Perform genuine user/browser and campus Ricoh Urdu A4 validation; retain original examination history, fees, attendance, papers, notices and all 54 approved teacher mappings.
7. Only then build and deploy a rollback-ready immutable release with exact frontend/backend SHA, postflight smoke and verifiable final certification.

This branch is SOURCE ONLY. Deployment status remains HOLD. No routine school-user involvement is necessary for further source engineering, but absent independent approvals and actual hardware evidence cannot be falsely certified.
