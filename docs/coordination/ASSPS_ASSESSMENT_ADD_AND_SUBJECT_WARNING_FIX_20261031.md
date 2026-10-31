# ASSPS Assessment creation and Marks Sheet subject warning — October 31, 2026

## Root cause and correction
The old live ManageExams bundle initialized the academic session from an initially empty store and never synchronized later. A visible session dropdown could show 2026-2027 while its submitted form state remained empty. The new reviewed frontend uses resolveExamSession from current Academic Setup or saved school exams; duplicate Assessment 4 is explicitly explained as already existing, while an authenticated new Assessment 5 may be submitted normally. The POST uses a school-scoped serializable transaction and real user-bound actor, not caller-supplied creator IDs.

The old Marks Sheet rendered a false red warning on Assessment 2 / Class Six / English because the exam has no separate exam_subjects rows: it is an All Classes assessment. Its Subject dropdown legitimately fell back to school Academic Setup, but the warning ignored that fallback and saw an empty offering list. The updated warning uses the very same resolved class-subject list that populates the dropdown. A truly missing subject remains blocked, as do protected First Term offering rules.

## Scoped production release
Routes /exams/* and /examination/* load the rebuilt reviewed frontend. Fees and Paper Studio preserve their earlier reviewed shell; unrelated areas retain the stable original bundle. Navigation across shells reloads to avoid React conflicts. Existing Jameel Noori PDF, login and assessment-sync hotfix scripts remain unchanged. The prior production index and boot files are backed up under /root/secure-archive/assps-exam-ui-20261031/ for immediate rollback.

## Verified checks and limitations
Frontend Vite build PASS, 16 focused assessment/subject/form/browser tests PASS, additional 3 Marks Register browser tests PASS, 4 isolated authenticated exam POST/duplicate backend tests PASS, changed-file ESLint PASS. Live static Exam and Marks route return HTTP 200; public browser loads proper new JS, no JavaScript exceptions, and correctly redirects unauthenticated visitors to login. Anonymous exam POST HTTP 401. All 1854 historical exam results are preserved and Assessment 1-4 are unchanged.

Full Principal authenticated click-save-reopen-print is NOT independently certified: the cloud browser did not have a genuine Principal login. No Assessment 5 or fake marks were created merely to pass a smoke test. Once a real Principal session is available, this is the remaining E2E acceptance checkpoint.

## Independent browser regression added
The reviewed ManageExams component was mounted in an isolated Vite Chromium test with academic setup hydration deliberately delayed. Its click saved a new Assessment 5 payload (All Classes, 2026-2027, total 25, pass 10), then rejected a duplicate Assessment 4 with an actionable message. The reviewed MarksSheet was mounted with saved Assessment 2, Class Six and school-configured English; the subject dropdown selected English with no false red warning. Both real browser interaction tests passed with zero page exceptions, using synthetic API responses. They are now mandatory GitHub review checks and do not imply a live Principal login was used.
