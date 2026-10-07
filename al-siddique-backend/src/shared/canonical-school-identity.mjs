/**
 * JARVIS 4.1 — Canonical School Identity & Institutional Ground Truth
 *
 * Single source of truth for all official institutional facts.
 * Approved English address: Sharif Chowk, Rayya Khas, Narowal
 * Approved Urdu address: شریف چوک، رایا خاص، نارووال
 */

export const CANONICAL_SCHOOL_IDENTITY = Object.freeze({
  schoolName: 'Al Siddique Scholars Public School',
  urduName: 'الصدّيق اسکالرز پبلک اسکول',
  address: 'Sharif Chowk, Rayya Khas, Narowal',
  urduAddress: 'شریف چوک، رایا خاص، نارووال',
  location: 'Sharif Chowk, Rayya Khas, Narowal',
  urduLocation: 'شریف چوک، رایا خاص، نارووال',
  helpline: '+92 306 9545996',
  ownerPhone: '+92 300 1291959',
  botPhone: '+1 581 662 9843',
  website: 'https://app.assps.edu.pk',
  portal: 'https://app.assps.edu.pk',
  timings: '08:00 AM – 01:30 PM (Mon–Sat)',
  urduTimings: 'صبح 08:00 بجے تا دوپہر 01:30 بجے (پیر تا ہفتہ)',
  academicSession: '2026-2027',
  offerings: 'Starter to 10th Grade & Hifaz Class',
  urduOfferings: 'اسٹارٹر سے دسویں جماعت اور حفظ کلاس'
});

export function getPublicSchoolInfo() {
  return {
    schoolName: CANONICAL_SCHOOL_IDENTITY.schoolName,
    urduName: CANONICAL_SCHOOL_IDENTITY.urduName,
    location: CANONICAL_SCHOOL_IDENTITY.location,
    urduLocation: CANONICAL_SCHOOL_IDENTITY.urduLocation,
    helpline: CANONICAL_SCHOOL_IDENTITY.helpline,
    website: CANONICAL_SCHOOL_IDENTITY.website,
    timings: CANONICAL_SCHOOL_IDENTITY.timings,
    urduTimings: CANONICAL_SCHOOL_IDENTITY.urduTimings,
    admissions: 'Admissions are open from Starter to 10th Grade / Pre-Nine and Hifaz Class.',
    academicSession: CANONICAL_SCHOOL_IDENTITY.academicSession
  };
}
