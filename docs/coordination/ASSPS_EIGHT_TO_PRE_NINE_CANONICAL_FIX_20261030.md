# Class Eight to Pre Nine production fix — 30 October 2026

**Canonical destination defect repaired in production database.** The original
Class Eight promotion plan, CHECK constraint and SECURITY DEFINER students
UPDATE guard had used Pre-Nine instead of the actual SaaS class Pre Nine.
The reviewed migration ops/release/class8-promotion/
010_canonical_pre_nine_destination.sql passed transaction ROLLBACK rehearsal,
then COMMIT in live database. The plan now targets Pre Nine / Blue and
the protected trigger checks NEW.class against policy.destination_class.

Original source roster all 11 remains active Eight / Blue; the historic
membership 11/11 and First Term exam9 66 numeric score records are untouched.
The seventh scheduled paper Quran / Nazra has no 11 numeric entries. The six
scored papers have one consistent denominator per subject: Computer 50,
English 75, Islamiyat 50, Mathematics 60, Science 50 and Urdu 75.
Seven official paper maxima are still pending approval; result-card physical
print verification and authenticated Principal academic approval are absent.

**Certification remains HOLD.** The production trigger retains its
student-school isolation, approval check, seven official subject maxima,
and per-student seven-paper completeness requirement. No false approval,
Quran/Nazra score or student promotion was performed. Existing 311 November
fee vouchers remain preserved; no Eight/Maya voucher was created.

The production authenticated preflight endpoint now finds either legacy or
canonical destination plan spelling, requires the canonical Pre Nine / Blue
destination for a positive readiness flag, and reports a distinct
PRE_NINE_DESTINATION_NOT_CANONICAL hold code for legacy plans. Unauthenticated
preflight access remains 401.

Private original function backup, plan snapshot and deployment rollback
source: /root/secure-archive/assps-class8-promotion-20261030/.

## Owner's later correction on 30 October: Quran/Nazra was excluded from result

The owner clarified that Quran/Nazra was intentionally skipped from the
First Term RESULT. Its absent eleven marks must not be invented.
All 66 original marks across six genuine scored subjects were verified.

Reviewed 011_class_eight_result_six_scored_subjects_20261030.sql was executed
in a SERIALIZABLE transaction after a successful ROLLBACK rehearsal.
The migration retains Quran/Nazra historical subject row but marks it
inactive ONLY in school 1 / exam 9 / class Eight Blue; it reduces the
promotion plan expected subjects from 7 to 6. It reconciles the official
maximum marks on the six remaining paper offerings from the already saved,
uniform 11-student result denominators (Computer 50, English 75,
Islamiyat 50, Mathematics 60, Science 50, Urdu 75). It does NOT
approve papers, change any saved score, invent Quran marks, assert printing,
or sign on behalf of a Principal.

After commit, six subjects have consistent maxima and remain PENDING
official academic approval; plan still AWAITING_RESULTS_AND_PRINT,
print_verified_at and academic_approved_at still NULL. All eleven
pupils are still in Eight; official certification is still held for
real authenticated signoff and evidence, not for missing Quran marks.
