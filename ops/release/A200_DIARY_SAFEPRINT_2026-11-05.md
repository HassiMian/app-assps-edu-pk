# ASSPS A200 - Fail-closed A4 Daily Diary printing

Live deployment: /var/www/assps-releases/assps-diary-safeprint-failclosed-20261105
Previous release: /var/www/assps-releases/assps-auth429-marks-fontready-20261105
Public URL: https://app.assps.edu.pk/paper-generator

## Verified bug
The live A195 FontReady compiled Diary module had two calls to global window.print().
One was executed when no isolated diary stage existed. The other ran after
isolated print iframe setup exceptions. Global printing could print the app
editing controls and page-break markers instead of diary cards.

## Correction
- Fail closed when print stage or iframe is not available.
- Keep iframe-only printing and all A195 FontReady functionality.
- No backend, student record, or printer settings modified.
- Original live module SHA256 c19d2633bfa2680899b6f35496c8342e83ed41dc859eda4127ce86b6cc46e976.
- New live module SHA256 c6a43464b3e39f8ae53d648aa910ce06a26ad0dd156d42609cf1b460c45382ac.
- Nginx rollback config: /root/secure-archive/assps-diary-safeprint-20261105/apex-app-ssl.pre-safeprint.
- Source release preserved for rollback.

## Testing
- Compiled JS parser test, isolated browser import and live browser import passed.
- Browser verified font/logo readiness and removed global-print fallback.
- Login / Paper Generator HTTP200, anonymous auth /me HTTP401.

Physical print appearance must be confirmed from a real paper/photo before
changing typography or printer-driver settings.
