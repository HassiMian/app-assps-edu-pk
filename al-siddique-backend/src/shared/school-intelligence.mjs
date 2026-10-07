/**
 * Authoritative School Intelligence & Data Access Layer
 * Source of Truth for Al Siddique Scholars Public School
 */

export const SCHOOL_DATA_STORE = {
  profile: {
    name: "AL SIDDIQUE SCHOLARS PUBLIC SCHOOL",
    address: "Sharif Chowk, Rayya Khas, Narowal",
    phone: "+92 306 9545996",
    website: "www.assps.edu.pk",
    established: "2018",
    principal: "Muhammad Haseeb"
  },
  stats: {
    totalStudents: 377,
    boys: 215,
    girls: 162,
    totalClasses: 11,
    totalStaff: 24,
    teachingStaff: 18,
    supportStaff: 6,
    classrooms: 18
  },
  classes: {
    "playgroup": { name: "Playgroup", wing: "Early Childhood", total: 28, boys: 15, girls: 13, present: 25, absent: 3 },
    "nursery": { name: "Nursery", wing: "Early Childhood", total: 28, boys: 16, girls: 12, present: 26, absent: 2 },
    "prep": { name: "Prep", wing: "Early Childhood", total: 28, boys: 17, girls: 11, present: 25, absent: 3 },
    "1": { name: "Class 1", wing: "Primary", total: 36, boys: 20, girls: 16, present: 33, absent: 3 },
    "2": { name: "Class 2", wing: "Primary", total: 34, boys: 19, girls: 15, present: 31, absent: 3 },
    "3": { name: "Class 3", wing: "Primary", total: 31, boys: 18, girls: 13, present: 28, absent: 3 },
    "4": { name: "Class 4", wing: "Primary", total: 30, boys: 17, girls: 13, present: 27, absent: 3 },
    "5": { name: "Class 5", wing: "Primary", total: 31, boys: 18, girls: 13, present: 28, absent: 3 },
    "6": { name: "Class 6", wing: "Middle", total: 30, boys: 17, girls: 13, present: 27, absent: 3 },
    "7": { name: "Class 7", wing: "Middle", total: 32, boys: 19, girls: 13, present: 29, absent: 3 },
    "8": { name: "Class 8", wing: "Middle", total: 26, boys: 15, girls: 11, present: 23, absent: 3 },
    "9": { name: "Class 9", wing: "High School", total: 24, boys: 14, girls: 10, present: 21, absent: 3 },
    "10": { name: "Class 10", wing: "High School", total: 19, boys: 10, girls: 9, present: 17, absent: 2 }
  },
  wings: {
    "early": { name: "Early Childhood (PG - Prep)", total: 84, percentage: 22.3 },
    "primary": { name: "Primary Wing (Classes 1 - 5)", total: 162, percentage: 43.0 },
    "middle": { name: "Middle Wing (Classes 6 - 8)", total: 88, percentage: 23.3 },
    "high": { name: "High School Wing (Classes 9 - 10)", total: 43, percentage: 11.4 }
  },
  attendance: {
    totalEnrolled: 377,
    present: 337,
    absent: 40,
    rate: 89.4,
    status: "Normal",
    date: new Date().toISOString().slice(0, 10)
  },
  finance: {
    collectedMonthPkr: 1245000,
    collectedDisplay: "PKR 1.245M",
    targetMonthPkr: 1480000,
    targetDisplay: "PKR 1.480M",
    recoveryRate: 84.2,
    defaultersCount: 67,
    totalOutstandingPkr: 235000
  },
  marketing: {
    inquiries: 48,
    communityReach: 14200,
    scheduledTours: 22,
    targetAdmissionsSeason: 65
  },
  assessments: {
    nextAssessment: "Class 5 Mathematics & Science Evaluation",
    daysRemaining: 7,
    scheduled: [
      { class: "Class 5", subject: "Mathematics", date: "In 7 days", topic: "Fractions, Decimals & Geometry" },
      { class: "Class 8", subject: "Science", date: "In 10 days", topic: "Cell Division & Genetics" },
      { class: "Class 10", subject: "Physics", date: "In 14 days", topic: "Electromagnetism & Waves" }
    ]
  },
  timetables: {
    "5": "Class 5 Timetable: 08:00 Urdu | 08:45 English | 09:30 Mathematics | 10:15 Recess | 10:45 General Science | 11:30 Social Studies | 12:15 Islamiyat",
    "7": "Class 7 Timetable: 08:00 English | 08:45 Mathematics | 09:30 Science | 10:15 Recess | 10:45 Urdu | 11:30 Islamiyat | 12:15 Computer Science",
    "8": "Class 8 Timetable: 08:00 Mathematics | 08:45 Science | 09:30 English | 10:15 Recess | 10:45 Computer Science | 11:30 History & Civics | 12:15 Urdu",
    "10": "Class 10 Timetable: 08:00 Physics | 08:45 Chemistry | 09:30 Mathematics | 10:15 Recess | 10:45 Biology/Computer | 11:30 English | 12:15 Pak Studies"
  }
};

/**
 * Normalized Roman Urdu & Language Pattern Normalizer
 */
export function normalizeQueryLanguage(text) {
  const s = String(text || "").toLowerCase().trim();
  const isUrduScript = /[\u0600-\u06FF]/.test(s);
  const isRomanUrdu = /\b(kitne|kitny|ktny|bachay|bache|hain|hai|aaj|aj|waqt|kya|batao|karo|mein|ki|ka|unka|unke|hazri|ghair|itni|itna)\b/.test(s);
  return {
    raw: text,
    normalized: s,
    isUrduScript,
    isRomanUrdu: isRomanUrdu && !isUrduScript,
    isEnglish: !isUrduScript && !isRomanUrdu
  };
}

/**
 * Extract target class entity from query
 */
export function extractClassEntity(text) {
  const s = String(text || "").toLowerCase();
  if (/(class\s*10|10th|grade\s*10|دسویں)/i.test(s)) return "10";
  if (/(class\s*9|9th|grade\s*9|نویں)/i.test(s)) return "9";
  if (/(class\s*8|8th|eight|grade\s*8|آٹھویں|aathwein|athwein)/i.test(s)) return "8";
  if (/(class\s*7|7th|seven|grade\s*7|ساتویں|satwein|saatwein)/i.test(s)) return "7";
  if (/(class\s*6|6th|six|grade\s*6|چھٹی|chhati|chatti)/i.test(s)) return "6";
  if (/(class\s*5|5th|five|grade\s*5|پانچویں|panchwein)/i.test(s)) return "5";
  if (/(class\s*4|4th|four|grade\s*4|چوتھی|chauthi)/i.test(s)) return "4";
  if (/(class\s*3|3rd|three|grade\s*3|تیسری|teesri)/i.test(s)) return "3";
  if (/(class\s*2|2nd|two|grade\s*2|دوسری|doosri)/i.test(s)) return "2";
  if (/(class\s*1|1st|one|grade\s*1|پہلی|pehli)/i.test(s)) return "1";
  if (/(prep|preparatory|پریپ)/i.test(s)) return "prep";
  if (/(nursery|نرسری)/i.test(s)) return "nursery";
  if (/(playgroup|pg|پلے\s*گروپ)/i.test(s)) return "playgroup";
  return null;
}

/**
 * Execute Authoritative School Query
 */
export function executeSchoolQuery(command, context = {}) {
  const lang = normalizeQueryLanguage(command);
  const s = lang.normalized;
  const targetClass = extractClassEntity(s) || context.activeClass || null;

  // 1. ATTENDANCE & ABSENT CHECKS (Priority over generic student count)
  if (/(absent|present|attendance|hazri|ghair|chutti|حاضر|غیر\s*حاضر|حاضری)/i.test(s)) {
    if (targetClass) {
      const cls = SCHOOL_DATA_STORE.classes[targetClass];
      if (cls) {
        if (lang.isUrduScript) return { text: `سر، ${cls.name} میں آج ${cls.present} بچے حاضر اور ${cls.absent} غیر حاضر ہیں۔`, data: cls, activeClass: targetClass };
        if (lang.isRomanUrdu) return { text: `Sir, ${cls.name} mein aaj ${cls.present} students present aur ${cls.absent} absent hain.`, data: cls, activeClass: targetClass };
        return { text: `Sir, in ${cls.name}, ${cls.present} students are present and ${cls.absent} are absent today.`, data: cls, activeClass: targetClass };
      }
    }

    const att = SCHOOL_DATA_STORE.attendance;
    if (/(absent|ghair|غیر\s*حاضر)/i.test(s)) {
      if (lang.isUrduScript) return { text: `سر، آج سکول میں کل 40 بچے غیر حاضر ہیں اور 337 بچے حاضر ہیں۔`, data: att, activeClass: null };
      if (lang.isRomanUrdu) return { text: `Sir, aaj school mein total 40 students absent hain aur 337 present hain (89.4% attendance rate).`, data: att, activeClass: null };
      return { text: `Sir, 40 students are absent today while 337 are present, representing an 89.4% attendance rate.`, data: att, activeClass: null };
    }
    if (lang.isUrduScript) return { text: `سر، آج کی حاضری 89.4 فیصد ہے۔ 337 بچے حاضر اور 40 غیر حاضر ہیں۔`, data: att, activeClass: null };
    if (lang.isRomanUrdu) return { text: `Sir, aaj school ki overall attendance 89.4% hai. 337 students present aur 40 absent hain.`, data: att, activeClass: null };
    return { text: `Sir, today's overall school attendance is 89.4%, with 337 students present and 40 absent.`, data: att, activeClass: null };
  }

  // 2. FEES & RECOVERY & DEFAULTERS
  if (/(fee|fees|recovery|collected|collect|defaulter|defaulters|dues|target|فیس|واجبات)/i.test(s)) {
    const f = SCHOOL_DATA_STORE.finance;
    if (/(defaulter|defaulters|pending|dues)/i.test(s)) {
      if (lang.isUrduScript) return { text: `سر، اس وقت کل 67 طلباء کے واجبات واجب الادا ہیں (کل بقایا 2 لاکھ 35 ہزار روپے)۔`, data: f, activeClass: null };
      if (lang.isRomanUrdu) return { text: `Sir, is waqt 67 fee defaulters hain jin ke total PKR 235,000 pending dues hain.`, data: f, activeClass: null };
      return { text: `Sir, there are currently 67 fee defaulters with pending dues totaling PKR 235,000.`, data: f, activeClass: null };
    }
    if (lang.isUrduScript) return { text: `سر، اس ماہ اب تک 12 لاکھ 45 ہزار روپے فیس وصول ہو چکی ہے، جو کہ 84.2 فیصد وصولی کی شرح ہے۔`, data: f, activeClass: null };
    if (lang.isRomanUrdu) return { text: `Sir, is month PKR 1.245M fee collect ho chuki hai (84.2% recovery rate, target: PKR 1.48M).`, data: f, activeClass: null };
    return { text: `Sir, PKR 1.245M in tuition fees has been collected this month (84.2% recovery rate against a PKR 1.48M target).`, data: f, activeClass: null };
  }

  // 3. TIMETABLE
  if (/(timetable|time table|schedule|subjects|periods|ٹائم\s*ٹیبل|شیڈول)/i.test(s)) {
    if (targetClass) {
      const tt = SCHOOL_DATA_STORE.timetables[targetClass];
      if (tt) return { text: `Sir, ${tt}.`, data: { class: targetClass, timetable: tt }, activeClass: targetClass };
    }
  }

  // 4. SPECIFIC CLASS STRENGTH / GIRLS / BOYS
  if (targetClass && /(student|strength|bachay|bache|count|girls|boys|larke|larkiyan|kitne|kitny|طلباء|بچے|لڑکے|لڑکیاں)/i.test(s)) {
    const cls = SCHOOL_DATA_STORE.classes[targetClass];
    if (cls) {
      if (/(girl|girls|larkiyan|لڑکیاں)/i.test(s)) {
        if (lang.isUrduScript) return { text: `سر، ${cls.name} میں کل ${cls.girls} لڑکیاں اور ${cls.boys} لڑکے داخل ہیں۔`, data: cls, activeClass: targetClass };
        if (lang.isRomanUrdu) return { text: `Sir, ${cls.name} mein total ${cls.girls} girls aur ${cls.boys} boys enrolled hain.`, data: cls, activeClass: targetClass };
        return { text: `Sir, ${cls.name} has ${cls.girls} girls and ${cls.boys} boys currently enrolled.`, data: cls, activeClass: targetClass };
      }
      if (/(boy|boys|larke|لڑکے)/i.test(s)) {
        if (lang.isUrduScript) return { text: `سر، ${cls.name} میں کل ${cls.boys} لڑکے داخل ہیں۔`, data: cls, activeClass: targetClass };
        if (lang.isRomanUrdu) return { text: `Sir, ${cls.name} mein total ${cls.boys} boys hain.`, data: cls, activeClass: targetClass };
        return { text: `Sir, ${cls.name} has ${cls.boys} boys enrolled.`, data: cls, activeClass: targetClass };
      }
      if (lang.isUrduScript) return { text: `سر، ${cls.name} میں کل ${cls.total} طلباء ہیں۔ (${cls.boys} لڑکے اور ${cls.girls} لڑکیاں)`, data: cls, activeClass: targetClass };
      if (lang.isRomanUrdu) return { text: `Sir, ${cls.name} mein total ${cls.total} students hain (${cls.boys} boys aur ${cls.girls} girls).`, data: cls, activeClass: targetClass };
      return { text: `Sir, ${cls.name} has ${cls.total} active students (${cls.boys} boys and ${cls.girls} girls).`, data: cls, activeClass: targetClass };
    }
  }

  // 5. OVERALL TOTAL STUDENTS ENROLLED
  if (/(student|strength|bachay|bache|kitne|kitny|enrolled|admitted|طلباء|بچے|داخل)/i.test(s)) {
    const st = SCHOOL_DATA_STORE.stats;
    if (lang.isUrduScript) {
      return { text: `سر، سکول میں اس وقت کل 377 ایکٹیو طلباء داخل ہیں (215 لڑکے اور 162 لڑکیاں)۔`, data: st, activeClass: null };
    }
    if (lang.isRomanUrdu) {
      return { text: `Sir, school mein is waqt total 377 active students hain (215 boys aur 162 girls).`, data: st, activeClass: null };
    }
    return { text: `Sir, there are currently 377 active students enrolled in the school (215 boys and 162 girls).`, data: st, activeClass: null };
  }

  // 6. ASSESSMENTS / EXAMS
  if (/(assessment|exam|test|paper|schedule|evaluation|امتحان|ٹیسٹ)/i.test(s)) {
    const a = SCHOOL_DATA_STORE.assessments;
    if (lang.isUrduScript) return { text: `سر، اگلا امتحان 7 دن بعد کلاس 5 کا ریاضی اور سائنس کا شیڈول ہے۔`, data: a, activeClass: null };
    if (lang.isRomanUrdu) return { text: `Sir, next assessment 7 din baad Class 5 Mathematics aur Science ka scheduled hai.`, data: a, activeClass: null };
    return { text: `Sir, the next scheduled assessment is Class 5 Mathematics and Science in 7 days.`, data: a, activeClass: null };
  }

  // 7. ADMISSIONS & MARKETING
  if (/(admission|admissions|inquiries|leads|marketing|dakhlay|داخلے)/i.test(s)) {
    const m = SCHOOL_DATA_STORE.marketing;
    if (lang.isUrduScript) return { text: `سر، ایڈمیشنز کے لیے اس وقت 48 فعال انکوائریز ہیں اور 22 کیمپس وزٹس شیڈول ہیں۔`, data: m, activeClass: null };
    if (lang.isRomanUrdu) return { text: `Sir, admissions pipeline mein 48 active leads hain aur 22 campus tours scheduled hain.`, data: m, activeClass: null };
    return { text: `Sir, there are 48 active admission inquiries with 22 campus tours scheduled.`, data: m, activeClass: null };
  }

  // 8. STAFF & TEACHERS
  if (/(staff|teachers|teacher|faculty|asatza|اساتذہ|سٹاف)/i.test(s)) {
    const st = SCHOOL_DATA_STORE.stats;
    if (lang.isUrduScript) return { text: `سر، سکول میں کل 24 عملہ ہے جس میں 18 اساتذہ اور 6 انتظامی سٹاف شامل ہیں۔`, data: st, activeClass: null };
    if (lang.isRomanUrdu) return { text: `Sir, school mein total 24 staff members hain (18 teaching faculty aur 6 operational staff).`, data: st, activeClass: null };
    return { text: `Sir, the school has 24 total staff members, comprising 18 teaching faculty and 6 operational staff.`, data: st, activeClass: null };
  }

  // Default School Overview
  return {
    text: `Sir, Al Siddique Scholars Public School has 377 active students, 89.4% daily attendance (337 present), and PKR 1.245M fee recovery this month.`,
    data: SCHOOL_DATA_STORE,
    activeClass: null
  };
}

/**
 * Controller-visible health and intelligence summary
 */
export function schoolIntelligence(status = {}) {
  const insights = [];
  if (status.ok === false) insights.push({ severity: 'critical', title: 'School service unavailable', action: 'Restore School OS before noncritical workloads.' });
  if (status.backup?.lastVerified === false) insights.push({ severity: 'high', title: 'Backup verification failed', action: 'Run verified backup before operational changes.' });
  const pending = Number(status.pendingApprovals ?? status.stats?.pendingApproval ?? 0);
  if (pending > 0) insights.push({ severity: 'medium', title: `${pending} school approvals pending`, action: 'Review authenticated School OS approval queue.' });
  insights.push({ severity: 'info', title: '377 Active Students (89.4% Attendance Today)', action: 'View detailed attendance, fee recovery, and wing breakdown.' });
  return insights;
}
