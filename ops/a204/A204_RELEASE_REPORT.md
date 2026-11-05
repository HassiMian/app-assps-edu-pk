# A204 Daily Diary premium grid and footer repair

Live release: /var/www/assps-releases/assps-diary-a204-premium-footer-20261105
Rollback release: /var/www/assps-releases/assps-diary-a203-premium-minor-20261105

Repairs: single-line NAME, CLASS/SECTION and ROLL with full values; original pastel row separators after URDU/ENGLISH/MATH; matching subject/homework vertical divider; GK followed by a real full-width table-footer row. No homework font-size reduction, black borders or wholesale redesign. Other densities preserve original footer behavior.

QA: 25 synthetic Flyer/Pink students in 4 A4 pages (8+8+8+1); long-name stress PASS; all eight studio designs in blush PASS; A195 regression PASS. PDF A4 and Nastaleeq font preflight PASS. Compiled React card render verified the footer is truly the fifth table row. Live browser import and static assets HTTP 200. No production DB writes or printer jobs.

Changed production files only: index.html and versioned Daily Diary JS/CSS. Physical paper output remains for user acceptance. Preserve A204 in future source deployments.
