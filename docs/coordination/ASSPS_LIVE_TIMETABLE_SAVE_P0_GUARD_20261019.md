# ASSPS production P0 — unsafe timetable write containment

**19 October 2026 PKT; implemented on Hostinger srv1769723.** Narrow defensive ingress action, NOT certification of the entire Lesson Planning/Timetable release.

## Root cause
- Live backend /var/www/apex-backend/src/routes/timetableRoutes.js SHA256 4142fc54c39eec39e5fea470d452d6efdf54c862d14b4d2292d18bb7538457ce defines POST /save with protect only, req.user?.school_id || 1, DELETE-before-INSERT, and no non-empty entries requirement. P0 schedule-erasure and role/tenant risks.
- Protected Core integrated source's version of the same file SHA256 4f7d4dcd6a9812d2dc2f219888528a6c5e5ca6d7669034297c7179cab68c2ccf contains GET only. Live POST is unverified artifact drift. Do not blindly overwrite newer production with an older branch.
- Nginx now serves /var/www/assps-timetable-notices-unified-20261019/index.html (SHA256 8216276411fce912309767361e0f23e8a445106aa3b5eefe629c3ed0fceb2958). Old October-8 release-meta is not exact artifact proof.

## Defense executed and independently checked
- All four HTTPS ingress configurations now match /api/timetable/save, with optional trailing slash and case-insensitive match, and return HTTP403. Domains: api.assps.edu.pk, app.assps.edu.pk, www.assps.edu.pk and apex.assps.edu.pk. assps.edu.pk redirects to www; redirect-following probe yielded 403.
- Original config backup archives and manifests:
  /root/secure-archive/assps-p0-timetable-write-deny-20261018T2041Z/
  /root/secure-archive/assps-p0-timetable-ingress-extended-20261018T2045Z/
- nginx -t passed; graceful Nginx reload. No backend restart, school SQL data writes, document publication, permission change, migration, frontend replacement or backup deletion performed.
- Post-change HTTP public tests: four domains 403 on safe anonymous POST with empty JSON; app /login 200, API /health 200. Backend PM2 PID912978 unchanged.
- Read-only counts unchanged: students 322, exam_results 1854, timetable 405, daily_diaries 39, lesson_plans 3, teacher_class_assignments 0.
- Host nftables INPUT on eth0 rejects direct TCP port5000, despite local service listening 0.0.0.0:5000.

## Re-enable only after real secure source release
- Independent authorized Principal save + teacher denied + School2 denied + conflicting/unknown school denied.
- Explicit eight valid periods, duplicate and empty rejection, accurate weekday/Friday bell times, correct staff school links, approved final timetable source hash, zero unexpected DELETE rows and transaction rollback checks using disposable DB before touching live.
- Reviewed source ancestry and live backend SHA, versioned migration/rollback, offsite two-cluster restore proof, signed-RLS tenant role acceptance, academic lesson source signoff and Urdu A4 Print acceptance.
- Rollback ingress guard ONLY when a deployed secure backend replacement passes all above gates. To revert safely, check current config SHA against recorded manifests before copying original configurations back, run nginx -t, graceful reload and public 403/secure-route checks. Keep both archive directories protected.

**Verdict: P0 destructive write ingress contained, full unified release remains HOLD.**
