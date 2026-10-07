/**
 * JARVIS 4.3 — comprehension-engine.cjs
 * CommonJS self-contained implementation of the ComprehensionEngine.
 * Mirrors comprehension-engine.mjs but using module.exports / require.
 */
'use strict';

const { StudentQueryParser } = require('./entity-extractor.cjs');

// ── Typo / Spelling Normalizer ─────────────────────────────────────────────
const TYPO_MAP = [
  [/\bfess\b/gi, 'fees'],
  [/\bpanding\b/gi, 'pending'],
  [/\bpendig\b/gi, 'pending'],
  [/\bchalan\b/gi, 'challan'],
  [/\bchalaan\b/gi, 'challan'],
  [/\bvoucer\b/gi, 'voucher'],
  [/\bvouchar\b/gi, 'voucher'],
  [/\bvoucar\b/gi, 'voucher'],
  [/\bvouchr\b/gi, 'voucher'],
  [/\bvochar\b/gi, 'voucher'],
  [/\bbalence\b/gi, 'balance'],
  [/\brecovry\b/gi, 'recovery'],
  [/\badmisn\b/gi, 'admission'],
  [/\bstudnt\b/gi, 'student'],
  [/\bstdnt\b/gi, 'student'],
  [/\battendnce\b/gi, 'attendance'],
  [/\bhaazri\b/gi, 'hazri'],
  [/\bhaaziri\b/gi, 'hazri'],
  [/\bhaziri\b/gi, 'hazri'],
  [/\bdoosri\b/gi, 'two'],
  [/\bpehli\b/gi, 'one'],
  [/\bteesri\b/gi, 'three'],
  [/\bchothi\b/gi, 'four'],
  [/\bpanchween\b/gi, 'five'],
  [/\bchhati\b/gi, 'six'],
  [/\bsaatween\b/gi, 'seven'],
  [/\baathween\b/gi, 'eight'],
  [/\bktni\b/gi, 'kitni'],
  [/\bkitna\b/gi, 'kitni'],
  [/\bbtao\b/gi, 'batao'],
  [/\bbtayen\b/gi, 'batao'],
  // Common Urdu Script Names
  [/ہانیہ/g, 'Hania'],
  [/نوید/g, 'Naveed'],
  [/علی/g, 'Ali'],
  [/فاطمہ/g, 'Fatima'],
  [/احمد/g, 'Ahmed'],
  [/زین/g, 'Zain'],
  [/مہنور/g, 'Mahnoor'],
];

function normalizeTypos(rawText) {
  let text = String(rawText || '');
  for (const [pattern, replacement] of TYPO_MAP) {
    text = text.replace(pattern, replacement);
  }
  return text;
}

// ── Domain / Subdomain Constants ────────────────────────────────────────────
const DOMAINS = {
  SCHOOL_FINANCE: 'SCHOOL_FINANCE',
  SCHOOL_ROSTER: 'SCHOOL_ROSTER',
  SCHOOL_OPERATIONS: 'SCHOOL_OPERATIONS',
  ADMISSION: 'ADMISSION',
  ATTENDANCE: 'ATTENDANCE',
  STAFF: 'STAFF',
  MARKET: 'MARKET',
  DESKTOP: 'DESKTOP',
  BROWSER: 'BROWSER',
  PUBLIC_INFO: 'PUBLIC_INFO',
  CONVERSATION_CONTROL: 'CONVERSATION_CONTROL',
  EXECUTIVE: 'EXECUTIVE',
  GROWTH: 'GROWTH',
  OUT_OF_SCOPE: 'OUT_OF_SCOPE',
  GENERAL: 'GENERAL',
};

const SUBDOMAINS = {
  STUDENT_FEE: 'STUDENT_FEE',
  FEE_SUMMARY: 'FEE_SUMMARY',
  FEE_WRITE: 'FEE_WRITE',
  FEE_DISCREPANCY: 'FEE_DISCREPANCY',
  CLASS_STRENGTH: 'CLASS_STRENGTH',
  STUDENT_RECORD: 'STUDENT_RECORD',
  STUDENT_COUNT: 'STUDENT_COUNT',
  ATTENDANCE_READ: 'ATTENDANCE_READ',
  ATTENDANCE_WRITE: 'ATTENDANCE_WRITE',
  ADMISSION_READ: 'ADMISSION_READ',
  ADMISSION_WRITE: 'ADMISSION_WRITE',
  STAFF_SUMMARY: 'STAFF_SUMMARY',
  STATUS_BRIEFING: 'STATUS_BRIEFING',
  PARENT_RELATIONS: 'PARENT_RELATIONS',
  SAAS_ANALYSIS: 'SAAS_ANALYSIS',
  FILE_MANAGEMENT: 'FILE_MANAGEMENT',
  EXTERNAL_PROJECT: 'EXTERNAL_PROJECT',
};

const CONTEXT_ACTIONS = {
  CONTINUE: 'CONTINUE',
  REFINE: 'REFINE',
  REPLACE: 'REPLACE',
  CANCEL: 'CANCEL',
  CONTRADICT: 'CONTRADICT',
  SWITCH_DOMAIN: 'SWITCH_DOMAIN',
  RESET: 'RESET',
  NONE: 'NONE',
};

// ── Pronoun Tokens ──────────────────────────────────────────────────────────
const PRONOUN_TOKENS = [
  'iski', 'iska', 'uski', 'uska', 'is student ki', 'us student ki',
  'is student ka', 'us student ka', 'is bachay ki', 'us bachay ki',
  'is bachay ka', 'us bachay ka', 'same student', 'wahi student',
  'same student ka', 'same student ki', 'wahi student ka', 'wahi student ki',
  'wahi wali', 'wahi wala', 'same wali', 'same wala', 'usi ka', 'usi ki',
  'inki', 'inka', 'unki', 'unka', 'yeh wali', 'wo wali',
  'اسکی', 'اسکا', 'اسی کی', 'اسی کا',
];

function hasPronouns(lower) {
  return PRONOUN_TOKENS.some(t => lower.includes(t));
}

// ── Language Detection ──────────────────────────────────────────────────────
function detectScriptLanguage(rawText) {
  const urduScript = /[\u0600-\u06FF]/.test(rawText);
  const englishWords = /\b(?:the|is|are|was|student|fee|class|please|check|get|show)\b/i.test(rawText);
  const romanUrduWords = /\b(?:hai|hain|ka|ki|ke|ko|se|mein|me|kya|kia|aur|phir|batao|btao|karo|karein|wala|wali|nahi)\b/i.test(rawText);
  if (urduScript && !romanUrduWords && !englishWords) return 'URDU_SCRIPT';
  if (urduScript && (romanUrduWords || englishWords)) return 'MIXED_URDU';
  if (romanUrduWords && !englishWords) return 'ROMAN_URDU';
  if (englishWords && !romanUrduWords) return 'ENGLISH';
  return 'ROMAN_URDU';
}

// ── Negation Detection ─────────────────────────────────────────────────────
function detectNegation(rawText) {
  const lower = rawText.toLowerCase();
  const detected = (
    /\b(?:not|nahi|ni|no|na|never|mat|dont|do\s*not|cancel|rehny\s*do|rehne\s*do|rehney\s*do|na\s*(?:karo|karna|lagao|karein|dena)|nahi\s*(?:karna|kro|karo|karein|karwana|bhejna|dena|chahiye))\b/i.test(lower) ||
    /(?:^|\s|[،,])(?:مت|نہیں|نہ\s*کریں|کینسل|رہنے\s*دو|نہیں\s*کرنا)(?:\s|[،,]|$)/.test(rawText)
  );
  if (!detected) return { detected: false, negatedDomain: null, negatedAction: null, negatedIntent: null, isContrastive: false };

  let negatedDomain = null;
  let negatedAction = null;
  let negatedIntent = null;
  let positiveDomain = null;
  let positiveIntent = null;

  if (/\b(?:admission|dakhla)\b/i.test(lower) || /داخلہ/.test(rawText)) {
    negatedDomain = 'ADMISSION'; negatedAction = 'CREATE'; negatedIntent = 'CREATE_ADMISSION';
  } else if (/\b(?:fee|fees|challan|voucher)\b/i.test(lower) || /فیس|چالان/.test(rawText)) {
    negatedDomain = 'SCHOOL_FINANCE'; negatedAction = 'WRITE'; negatedIntent = 'RECORD_FEE_COLLECTION';
  } else if (/\b(?:attendance|hazri)\b/i.test(lower) || /حاضری/.test(rawText)) {
    negatedDomain = 'ATTENDANCE'; negatedAction = 'WRITE'; negatedIntent = 'MARK_ATTENDANCE';
  }

  // Scoped contrastive negation: "X nahi, Y" or "X nahi karna sirf Y" or "not X, just Y"
  const isContrastive = (
    /\b(?:nahi\s*karna|ni\s*karna|mat\s*karo|rehne\s*do|rehny\s*do|nahi|ni|no)\b.*?\b(?:sirf|just|only|batao|btao|dikhao|check)\b/i.test(lower) ||
    /\b(?:not|don'?t)\b.*?\b(?:just|only|show|tell)\b/i.test(lower) ||
    /(?:نہیں|نہ)(?:[،,\s]+)?(?:کرنا|کریں)?.*?(?:صرف|بتائیں|دکھائیں|دکھاؤ)/.test(rawText)
  );

  if (isContrastive) {
    if (/\b(?:fee|fees|challan|dues|pending|balance)\b/i.test(lower) || /فیس|چالان|بقایا|رقم/.test(rawText)) {
      positiveDomain = 'SCHOOL_FINANCE';
      positiveIntent = 'READ_STUDENT_FEE';
    } else if (/\b(?:attendance|hazri)\b/i.test(lower) || /حاضری/.test(rawText)) {
      positiveDomain = 'ATTENDANCE';
      positiveIntent = 'READ_ATTENDANCE';
    } else if (/\b(?:record|records|detail|details|profile|data|info|father|walid|class|grade)\b/i.test(lower) || /ریکارڈ|تفصیل|پروفائل/.test(rawText)) {
      positiveDomain = 'SCHOOL_ROSTER';
      positiveIntent = 'READ_STUDENT_RECORD';
    } else if (/\b(?:result|marks)\b/i.test(lower) || /رزلٹ/.test(rawText)) {
      positiveDomain = 'ACADEMIC_RESULTS';
      positiveIntent = 'READ_RESULT';
    }
  }

  return {
    detected,
    negatedDomain,
    negatedAction,
    negatedIntent,
    positiveDomain,
    positiveIntent,
    isContrastive
  };
}

// ── Context Action Detector ─────────────────────────────────────────────────
function detectContextAction(rawText, activeContext) {
  if (!activeContext || !activeContext.domain) return CONTEXT_ACTIONS.NONE;
  const lower = rawText.toLowerCase();
  const negation = detectNegation(rawText);

  if (/\b(?:start\s*(?:from\s*)?(?:another|new)\s*task|another\s*task|new\s*task|dusra\s*kaam|doosra\s*kaam|naya\s*kaam|task\s*reset|reset\s*task|isko\s*choro|isko\s*chorro|ye\s*rehne\s*do)\b/i.test(lower)) return CONTEXT_ACTIONS.RESET;
  if (/\b(?:cancel|rehny\s*do|abort|stop|galat|wrong|start\s*again)\b/i.test(lower)) return CONTEXT_ACTIONS.CANCEL;
  if (negation.detected && negation.negatedDomain === activeContext.domain) return CONTEXT_ACTIONS.CONTRADICT;
  if (/\b(?:mera\s*matlab|mera\s*maqsad|actually|asal\s*mein|na\s*yaar|ni\s*main)\b/i.test(lower)) return CONTEXT_ACTIONS.REPLACE;

  const activeDomain = activeContext.domain;
  const newDomainSignals = {
    SCHOOL_FINANCE: /\b(?:fee|fees|challan|voucher|balance|dues|pending)\b/i.test(lower),
    ATTENDANCE: /\b(?:attendance|hazri|present|absent)\b/i.test(lower),
    ADMISSION: /\b(?:admission|dakhla|admit|enroll)\b/i.test(lower) && !/nahi/i.test(lower),
    SCHOOL_ROSTER: /\b(?:student|strength|count|class\s+\w+)\b/i.test(lower),
  };

  for (const [domain, signal] of Object.entries(newDomainSignals)) {
    if (signal && domain !== activeDomain) return CONTEXT_ACTIONS.SWITCH_DOMAIN;
  }
  if (/\b(?:sirf|just|only|koi\s*aur|doosra|naya)\b/i.test(lower)) return CONTEXT_ACTIONS.REFINE;
  return CONTEXT_ACTIONS.CONTINUE;
}

// ── Implicit Intent Detection ──────────────────────────────────────────────
function detectImplicitIntent(rawText, activeContext) {
  const lower = rawText.toLowerCase();
  if (/\b(?:cash|pese|paise)\s*(?:mil|aa|receive)\s*(?:gaye|gyi|gai|chuka|chuki|hain)?\b/i.test(lower) ||
      /\breceived\s*cash\b/i.test(lower) || /\bnaqad\s*mila\b/i.test(lower) ||
      /پیسے\s*مل\s*گئے|کیش\s*وصول|نقد\s*مل/.test(rawText)) {
    return { detected: true, impliedIntent: 'RECORD_FEE_COLLECTION', confidence: 0.80 };
  }
  if (/\b(?:hisab|hisaab|khata|account)\s*(?:band|barabar|close|nipta|mukao|clear)\b/i.test(lower) ||
      /\bkissa\s*mukao\b/i.test(lower) || /\b(?:baqi|baki)\s*zero\b/i.test(lower) ||
      /حساب\s*بند|حساب\s*برابر|کھاتہ\s*صاف/.test(rawText)) {
    return { detected: true, impliedIntent: 'RECORD_FEE_COLLECTION', confidence: 0.78 };
  }
  return { detected: false, impliedIntent: null, confidence: 0 };
}

// ── Multi-Intent Detection ─────────────────────────────────────────────────
function detectMultiIntent(rawText) {
  const lower = rawText.toLowerCase();
  const conjunctionPattern = /\b(?:aur\s+(?:phir|bhi)|phir\s+(?:bhi|uske\s*baad)|then\s+also|ke\s+baad\s+(?:bhi|phir)|aur\s+(?:check|batao|dikhao))\b/i;
  if (!conjunctionPattern.test(lower)) return { detected: false, intents: [] };
  const segments = rawText.split(/\s+(?:aur|phir|then|and|ke\s+baad)\s+/i).filter(s => s.trim().length > 3);
  if (segments.length < 2) return { detected: false, intents: [] };
  const intents = segments.map(seg => {
    const sl = seg.toLowerCase();
    if (/\b(?:fee|fees|challan|dues|pending)\b/i.test(sl)) return 'READ_STUDENT_FEE';
    if (/\b(?:attendance|hazri|present|absent)\b/i.test(sl)) return 'READ_ATTENDANCE';
    if (/\b(?:student|strength|count)\b/i.test(sl)) return 'READ_STUDENT_COUNT';
    if (/\b(?:admission|dakhla)\b/i.test(sl)) return 'CREATE_ADMISSION';
    return null;
  }).filter(Boolean);
  if (intents.length >= 2) return { detected: true, intents, segments };
  return { detected: false, intents: [] };
}

// ── Self-Check ─────────────────────────────────────────────────────────────
function runSelfCheck(draftReply, comprehension, session) {
  const checks = {
    DID_I_ANSWER_THE_QUESTION: true,
    DID_I_CHANGE_THE_INTENT: false,
    DID_I_ASK_FOR_ALREADY_KNOWN_INFO: false,
    DID_I_USE_STALE_CONTEXT: false,
    DID_I_HALLUCINATE_FACTS: false,
    DOES_RESPONSE_MATCH_USER_LANGUAGE: true,
  };
  const lower = draftReply.toLowerCase();
  const isDeflection = (
    /(?:kaun\s*se|kaun\s*sa|please\s*(?:provide|give|share))/i.test(lower) &&
    !comprehension.MISSING_INFORMATION?.length
  );
  if (isDeflection) checks.DID_I_ANSWER_THE_QUESTION = false;

  const entities = comprehension.ENTITIES || {};
  if (entities.studentName || entities.studentReference) {
    if (/(?:student\s*ka\s*naam|student\s*dein|naam\s*(?:ya|or)\s*admission)/i.test(lower)) {
      checks.DID_I_ASK_FOR_ALREADY_KNOWN_INFO = true;
    }
  }
  if (entities.className) {
    if (/(?:class|grade)\s*(?:dein|batain|provide)/i.test(lower)) {
      checks.DID_I_ASK_FOR_ALREADY_KNOWN_INFO = true;
    }
  }
  if (comprehension.USER_INTENT === 'READ_STUDENT_FEE' || comprehension.SUBDOMAIN === 'STUDENT_FEE') {
    if (/(?:father\s*name|walid|dob|date\s*of\s*birth|contact\s*number|phone)/i.test(lower)) {
      checks.DID_I_USE_STALE_CONTEXT = true;
    }
  }
  if (comprehension.DETECTED_LANGUAGE === 'URDU_SCRIPT') {
    if (!/[\u0600-\u06FF]/.test(draftReply)) checks.DOES_RESPONSE_MATCH_USER_LANGUAGE = false;
  }

  // Check 5 & 6 & 7 & 8: Context Retention & Entity Preservation (JARVIS 4.3.1)
  const hasExistingStudent = Boolean(session?.lastStudent?.name || session?.activeStudent?.name);
  const isStudentDependentQuery = (
    comprehension.USER_INTENT === 'READ_STUDENT_FEE' ||
    comprehension.SUBDOMAIN === 'STUDENT_FEE' ||
    comprehension.USER_INTENT === 'READ_ATTENDANCE' ||
    comprehension.USER_INTENT === 'READ_STUDENT_RECORD'
  );
  const introducedNewStudent = Boolean(
    comprehension.ENTITIES?.studentName &&
    (session?.lastStudent?.name || session?.activeStudent?.name) &&
    comprehension.ENTITIES.studentName.toLowerCase() !== String(session?.lastStudent?.name || session?.activeStudent?.name).toLowerCase()
  );

  checks.DID_CURRENT_MESSAGE_REPLACE_ENTITY = introducedNewStudent;
  checks.IS_REQUIRED_ENTITY_AVAILABLE_IN_CONVERSATION_MEMORY = hasExistingStudent;

  const claimsStudentMissing = (
    /(?:is\s*student\s*ka\s*fee\s*record\s*nahi\s*mila|kaun\s*se\s*student|student\s*ka\s*naam\s*dein|student\s*not\s*found|طالب\s*علم\s*کا\s*فیس\s*ریکارڈ\s*دستیاب\s*نہیں)/i.test(lower)
  );

  checks.DID_I_LOSE_REQUIRED_CONTEXT = Boolean(hasExistingStudent && isStudentDependentQuery && !introducedNewStudent && claimsStudentMissing);

  const isIntentOrDomainSwitch = (
    comprehension.CONTEXT_ACTION === CONTEXT_ACTIONS.SWITCH_DOMAIN ||
    comprehension.USER_CORRECTION?.detected ||
    comprehension.NEGATION?.isContrastive
  );
  checks.DID_I_INCORRECTLY_CLEAR_ENTITY_DURING_INTENT_SWITCH = Boolean(isIntentOrDomainSwitch && hasExistingStudent && !introducedNewStudent && claimsStudentMissing);

  // Check 9: Did response ask for father name when father name is already known? (JARVIS 4.4)
  const candidate = session?.structuredCandidate || session?.candidateData || session?.admissionCandidate || {};
  const hasFather = Boolean(candidate.father_name || candidate.fatherName || candidate.fields?.fatherName?.value || session?.lastStudent?.father_name || session?.lastStudent?.fatherName);
  if (hasFather && /(?:father\s*name|walid\s*ka\s*naam|والد\s*کا\s*نام)/i.test(lower)) {
    checks.DID_I_ASK_FOR_ALREADY_KNOWN_INFO = true;
  }

  // Check 10: Did response discuss admission for a read query? (JARVIS 4.4: CURRENT_EXPLICIT_INTENT > STALE_WORKFLOW_STATE)
  const isReadIntent = (
    comprehension.USER_INTENT === 'READ_STUDENT_FEE' ||
    comprehension.SUBDOMAIN === 'STUDENT_FEE' ||
    comprehension.USER_INTENT === 'READ_STUDENT_RECORD' ||
    comprehension.SUBDOMAIN === 'STUDENT_RECORD' ||
    comprehension.USER_INTENT === 'READ_ATTENDANCE'
  );
  if (isReadIntent && /(?:admission\s*complete|fee\s*voucher\s*generate|admission\s*draft|داخلہ\s*مکمل|ایڈمیشن\s*ڈرافٹ)/i.test(lower)) {
    checks.DID_I_USE_ADMISSION_FOR_READ_INTENT = true;
  }

  // Check 11: Command as person entity (JARVIS 4.4: COMMAND_AS_PERSON_ENTITY = 0)
  if (/(?:student\s*\*?ki\s*details\s*btao\*?|student\s*\*?details\s*btao\*?|student\s*\*?btao\*?|student\s*\*?batao\*?|student\s*\*?is\s*student\*?)/i.test(lower)) {
    checks.COMMAND_AS_PERSON_ENTITY = true;
  }

  // Check 12: Cross-Domain Hijack (Market query produced Admission reply)
  const hasAdmissionTokens = /(?:admission\s*complete|fee\s*voucher\s*generate|applying\s*class|contact\s*phone\s*provide|admission\s*draft|داخلہ\s*مکمل|ایڈمیشن\s*ڈرافٹ)/i.test(lower);
  if (comprehension.DOMAIN === 'MARKET' && hasAdmissionTokens) {
    checks.DID_ADMISSION_HIJACK_MARKET = true;
  }

  // Check 13: Greeting Hijack (Greeting query produced Admission reply)
  if (comprehension.USER_INTENT === 'GREETING' && hasAdmissionTokens) {
    checks.DID_ADMISSION_HIJACK_GREETING = true;
  }

  // Check 14: Reset Hijack (Task reset query produced Admission reply)
  if (comprehension.USER_INTENT === 'RESET_ACTIVE_WORKFLOW' && hasAdmissionTokens) {
    checks.DID_ADMISSION_HIJACK_RESET = true;
  }

  // Check 15: Future Request Collapsed into Current Trade Decision (JARVIS 4.5)
  const isFutureRequest = Boolean(
    comprehension.TEMPORAL_MODE === 'FUTURE_SETUP' ||
    comprehension.TEMPORAL_MODE === 'SESSION_SETUP' ||
    comprehension.TEMPORAL_MODE === 'MARKET_OUTLOOK' ||
    comprehension.TEMPORAL_MODE === 'CONDITIONAL_SETUP'
  );
  if (isFutureRequest && /(?:no\s*trade\s*\/\s*abstention|stale\s*asia\s*candle|immediate\s*spot\s*rejection)/i.test(lower) && !/(?:scenario|trigger|conditional|future|friday|horizon)/i.test(lower)) {
    checks.DID_FUTURE_REQUEST_COLLAPSE_INTO_CURRENT_TRADE = true;
  }

  const failures = Object.entries(checks).filter(([k, v]) => {
    if (k === 'DID_I_ANSWER_THE_QUESTION') return v === false;
    if (k === 'DOES_RESPONSE_MATCH_USER_LANGUAGE') return v === false;
    if (k === 'DID_CURRENT_MESSAGE_REPLACE_ENTITY') return false;
    if (k === 'IS_REQUIRED_ENTITY_AVAILABLE_IN_CONVERSATION_MEMORY') return false;
    return v === true;
  }).map(([k]) => k);

  return { passed: failures.length === 0, failures, checks };
}

// ── Name Extraction Helper ──────────────────────────────────────────────────
const STOP_WORDS_SET = new Set([
  'class', 'grade', 'ki', 'ka', 'ke', 'ko', 'se', 'hai', 'hain', 'me', 'mein', 'main',
  'aur', 'phir', 'then', 'the', 'is', 'are', 'was', 'student', 'students', 'bachay', 'bache',
  'two', 'one', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'fee', 'fees', 'challan', 'voucher', 'pending', 'dues', 'balance', 'admission', 'dakhla',
  'attendance', 'hazri', 'check', 'batao', 'btao', 'dikhao', 'kitni', 'kitne',
  'father', 'walid', 'mother', 'abbu', 'parent', 'parents', 'guardian', 'name', 'naam',
  'details', 'detail', 'record', 'records', 'profile', 'info', 'information',
  'hey', 'hi', 'hello', 'jarvis', 'salam', 'sir', 'jan',
  'urgent', 'handle', 'sales', 'slow', 'kyu', 'kyun', 'gold', 'baat', 'update', 'kal', 'wali', 'wala', 'wale',
  'keh', 'raha', 'rahi', 'show', 'galat', 'pc', 'organize', 'forms', 'form', 'folder', 'files', 'file', 'issue', 'problem', 'briefing',
  'uski', 'iska', 'iski', 'uska', 'inki', 'inka', 'unki', 'unka', 'wahi', 'yeh', 'woh',
  'nahi', 'ni', 'just', 'sirf', 'only', 'total', 'school', 'please',
  'starter', 'mover', 'flyer', 'nursery', 'prep', 'pehli', 'doosri', 'teesri',
  'chothi', 'panchween', 'chhati', 'saatween', 'aathween', 'hifaz', 'hifz',
  'poochna', 'janna', 'baary', 'bare', 'wala', 'wali', 'wo', 'ye',
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  'clear', 'paid', 'unpaid', 'status',
  'tha', 'thi', 'the', 'hoga', 'hogi', 'hoge',
  'konsi', 'konsa', 'konse', 'kaun', 'kaunsa', 'kaunsi', 'kaunse', 'kon', 'kis', 'kisko', 'kiska', 'kiski', 'kiske', 'kahan', 'kidhar', 'kab', 'kyun', 'kya', 'kia', 'what', 'which', 'where', 'when', 'who', 'whose', 'whom',
  'closed', 'close', 'task', 'mission', 'cancel', 'stop', 'exit', 'band', 'khatam', 'reset', 'clear', 'choro', 'chorro', 'leave', 'forget', 'switch'
]);

const DOMAIN_WORDS_RE = /^(?:fee|fees|class|grade|student|admission|hai|hain|tha|thi|the|hoga|hogi|hoge|ki|ka|ke|ko|se|pending|challan|voucher|balance|attendance|hazri|school|two|one|three|four|five|six|seven|eight|nine|ten|hey|hi|jarvis|salam|uski|iski|iska|uska|sir|jan|january|february|march|april|may|june|july|august|september|october|november|december|clear|paid|unpaid|status|konsi|konsa|konse|kaun|kaunsa|kaunsi|kaunse|kon|kis|kisko|kiska|kiski|kiske|kahan|kidhar|kab|kyun|kya|kia|what|which|where|when|who|whose|whom|closed|close|task|mission|cancel|stop|exit|band|khatam|reset|choro|leave|urgent|handle|sales|slow|gold|update|baat|keh|raha|rahi|show|galat|pc|organize|forms|form)$/i;

function extractStudentName(normalized) {
  // Split into sentence segments on sentence/line boundaries
  const segments = normalized.split(/[.!?\n]+/);
  let bestName = null;
  let bestLen = 0;

  for (const seg of segments) {
    const rawTokens = seg.trim().split(/[\s,;:]+/).filter(t => t.length >= 2);
    const currentRun = [];

    for (let i = 0; i < rawTokens.length; i++) {
      const tok = rawTokens[i].replace(/[^a-zA-Z'-]/g, '');
      if (!tok) { if (currentRun.length) { const r = currentRun.join(' '); if (r.length > bestLen) { bestName = r; bestLen = r.length; } currentRun.length = 0; } continue; }

      const tokLow = tok.toLowerCase();
      const isTitleCase = /^[A-Z][a-z]{1,}$/.test(tok);
      const isStop = STOP_WORDS_SET.has(tokLow);
      const isDomain = DOMAIN_WORDS_RE.test(tok);

      if (currentRun.length === 0) {
        // Start run only on title-cased non-stop non-domain token
        if (isTitleCase && !isStop && !isDomain) {
          currentRun.push(tok);
        }
      } else {
        // Continue run: allow lowercase non-stop non-domain words as surname parts
        if (!isStop && !isDomain && /^[a-zA-Z'-]{2,}$/.test(tok)) {
          currentRun.push(tok);
        } else {
          // Run ended — evaluate
          const candidate = currentRun.join(' ');
          if (candidate.length > bestLen) { bestName = candidate; bestLen = candidate.length; }
          currentRun.length = 0;
          // Start fresh if valid
          if (isTitleCase && !isStop && !isDomain) currentRun.push(tok);
        }
      }
    }
    // End of segment
    if (currentRun.length) {
      const candidate = currentRun.join(' ');
      if (candidate.length > bestLen) { bestName = candidate; bestLen = candidate.length; }
    }
  }

  if (bestName && bestLen >= 3) {
    // Sanity: reject if all tokens are stop/domain words
    const isAllStop = bestName.split(' ').every(t => STOP_WORDS_SET.has(t.toLowerCase()) || DOMAIN_WORDS_RE.test(t));
    if (!isAllStop && !/^(?:closed?|close|task|mission|cancel|stop|exit|band|khatam|reset|clear|leave|forget|switch)$/i.test(bestName.trim())) {
      return bestName;
    }
  }
  return null;
}

// ── Domain/Subdomain Detection ──────────────────────────────────────────────
function detectDomainSubdomain(lower, raw, negation, implicitIntent, entities = {}) {
  // Conversation Control / Task Reset
  if (/^(?:closed?|close|task|mission|band|khatam|reset|clear|exit|stop|cancel)(?:[!.?,\s]*)$/i.test(lower.trim()) ||
      /^(?:task\s*closed?|close\s*task|mission\s*closed?|close\s*mission|band\s*karo|band\s*kr\s*do|khatam\s*karo)(?:[!.?,\s]*)$/i.test(lower.trim()) ||
      /\b(?:start\s*(?:from\s*)?(?:another|new)\s*task|another\s*task|new\s*task|dusra\s*kaam|doosra\s*kaam|naya\s*kaam|task\s*reset|reset\s*task|isko\s*choro|isko\s*chorro|ye\s*rehne\s*do|task\s*close|mission\s*close)\b/i.test(lower) ||
      /(?:دوسرا\s*کام|نیا\s*کام|اسے\s*چھوڑو|یہ\s*رہنے\s*دو|اگلا\s*کام|ٹاسک\s*کینسل|بند\s*کرو|ختم\s*کرو)/.test(raw)) {
    return { domain: DOMAINS.CONVERSATION_CONTROL, subdomain: null };
  }

  // Executive Operations / Status Briefing
  if (/\b(?:scene|urgent\s*hai|urgent|handle\s*kro|overall\s*scene)\b/i.test(lower) && !/\b(?:fee|fees|challan|challans|voucher|attendance|hazri|student|students|bachay|bachon)\b/i.test(lower)) {
    if (/\b(?:parent|parents)\b/i.test(lower)) {
      return { domain: DOMAINS.SCHOOL_OPERATIONS, subdomain: SUBDOMAINS.PARENT_RELATIONS };
    }
    return { domain: DOMAINS.EXECUTIVE, subdomain: SUBDOMAINS.STATUS_BRIEFING };
  }

  // Out-of-Scope External Projects (Vilora is strictly outside JARVIS project scope)
  if (/\b(?:vilora)\b/i.test(lower)) {
    return { domain: DOMAINS.OUT_OF_SCOPE, subdomain: SUBDOMAINS.EXTERNAL_PROJECT };
  }

  // SaaS / Business Growth / Marketing (School SaaS & School WhatsApp Automation)
  if (/\b(?:saas|sales|mrr|churn|revenue|growth|marketing|funnel|roas|cac|conversion|campaigns?)\b/i.test(lower)) {
    return { domain: DOMAINS.GROWTH, subdomain: SUBDOMAINS.SAAS_ANALYSIS };
  }

  // Desktop File Management & PC Operations
  if (/\b(?:pc|desktop|laptop)\b/i.test(lower) && /\b(?:organize|cleanup|clean\s*up|files?|folder|folders|forms?)\b/i.test(lower)) {
    return { domain: DOMAINS.DESKTOP, subdomain: SUBDOMAINS.FILE_MANAGEMENT };
  }

  // Market
  const isAcademicAchievement = /\b(?:medal|badge|award|certificate|house|trophy|achievement|winner|position|topper)\b/i.test(lower);
  if (!isAcademicAchievement && !(/\b(?:student|students|school|bachay|bachon|class|classes|teacher|teachers|staff|attendance|fee|fees|challan|challans|voucher|dakhla|admission)\b/i.test(lower))) {
    if (/\b(?:xau|xauusd|forex|dollar|crypto|btc|market|trading|trade|setup|signal|trend|levels|scalp|intraday|fvg|orderblock)\b/i.test(lower) ||
        (/\b(?:gold|sona|sone)\b/i.test(lower) && !isAcademicAchievement)) {
      return { domain: DOMAINS.MARKET, subdomain: null };
    }
  }
  if (/\b(?:notepad|calculator|desktop|open\s*app|print|printer)\b/i.test(lower)) return { domain: DOMAINS.DESKTOP, subdomain: null };
  if (/\b(?:browse|google|website|search\s*online|open\s*url)\b/i.test(lower)) return { domain: DOMAINS.BROWSER, subdomain: null };

  const isCountOrStrength = /\b(?:kitni|kitne|how\s*many|total|count|tadaad|strength|report|status|summary|breakdown)\b/i.test(lower) || /(?:^|\s)(?:کتنے|کتنی|تعداد|کل|تمام)(?:\s|$)/.test(raw);
  const isEnrollmentCount = /\benrollment\b/i.test(lower) && isCountOrStrength;
  const isAdmissionQuery = /\b(?:procedure|policy|requirements|rules|criteria|documents|kya\s*hai)\b/i.test(lower) && /\b(?:admission|dakhla)\b/i.test(lower);
  const isAdmission = !isAdmissionQuery && (/\b(?:admission|dakhla|admit|enroll|onboard|candidate)\b/i.test(lower) || (/\benrollment\b/i.test(lower) && !isEnrollmentCount) || /داخلہ/.test(raw));
  const negatedAdmission = negation.detected && negation.negatedDomain === 'ADMISSION';

  if (isAdmission && !negatedAdmission) {
    const isWrite = /\b(?:karo|karna|create|new|naya|register|confirm)\b/i.test(lower) ||
      /\b(?:admission\s*(?:kro|karo|karein|karna|create)|dakhla\s*karo)\b/i.test(lower);
    return { domain: DOMAINS.ADMISSION, subdomain: isWrite ? SUBDOMAINS.ADMISSION_WRITE : SUBDOMAINS.ADMISSION_READ };
  }

  // Attendance (evaluated before finance so "hazri ka kya hisab hai" is ATTENDANCE)
  const isAttendance = (
    /\b(?:attendance|hazri|haazri|haaziri|haziri|mojudgi|present|absent|ghair\s*hazir|hazir)\b/i.test(lower) ||
    (/\b(?:kitne|kitni)\b/i.test(lower) && /\b(?:aye|aaye|pohnche)\s*(?:hain|hn)?\b/i.test(lower)) ||
    /حاضری|حاضر/.test(raw)
  );
  if (isAttendance) {
    const isWrite = /\b(?:lagao|mark\s*karo|darj\s*karo)\b/i.test(lower);
    return { domain: DOMAINS.ATTENDANCE, subdomain: isWrite ? SUBDOMAINS.ATTENDANCE_WRITE : SUBDOMAINS.ATTENDANCE_READ };
  }

  const isFinance = /\b(?:fee|fees|challan|challans|voucher|vouchers|voucar|dues|balance|payment|hisab|baqi|baki|baqaya|pkr|rs|cash|ledger|recovery|collection|outstanding|amount|rakam|charges|arrears)\b/i.test(lower) ||
    /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s*(?:wali|wala|ka|ki|ke|status|paid|unpaid|clear)\b/i.test(lower) ||
    /فیس|چالان|واجبات|بقایا|پیسے|روپے/.test(raw);
  if (isFinance || (implicitIntent.detected && implicitIntent.impliedIntent === 'RECORD_FEE_COLLECTION')) {
    if (/\b(?:galat|wrong|discrepancy|issue|problem)\b/i.test(lower) && /\b(?:parent|father|user)\b/i.test(lower)) {
      return { domain: DOMAINS.SCHOOL_FINANCE, subdomain: SUBDOMAINS.FEE_DISCREPANCY };
    }
    const isSummary = /\b(?:total|overall|school\s*ki|kul\s*kitni|summary|all\s*students)\b/i.test(lower);
    const isWrite = implicitIntent.detected && implicitIntent.impliedIntent === 'RECORD_FEE_COLLECTION';
    return { domain: DOMAINS.SCHOOL_FINANCE, subdomain: isSummary ? SUBDOMAINS.FEE_SUMMARY : isWrite ? SUBDOMAINS.FEE_WRITE : SUBDOMAINS.STUDENT_FEE };
  }

  if (/\b(?:teacher|teachers|staff|faculty|headmaster|asatza)\b/i.test(lower) || /اساتذہ|اسٹاف/.test(raw)) {
    return { domain: DOMAINS.STAFF, subdomain: SUBDOMAINS.STAFF_SUMMARY };
  }

  if (isAdmissionQuery || /\b(?:timing|timings|location|address|helpline|contact|phone|kahan|transport|bus|hostel|canteen|uniform|sports|ground|principal|affiliation|board|facility|facilities)\b/i.test(lower)) {
    return { domain: DOMAINS.PUBLIC_INFO, subdomain: null };
  }

  const hasClass = /\b(?:class|grade|starter|mover|flyer|nursery|prep|one|two|three|four|five|six|seven|eight|nine|ten|hifaz|pehli|doosri|teesri|chothi|panchween|chhati|saatween|aathween)\b/i.test(lower) || /کلاس|جماعت/.test(raw) || Boolean(entities.className);
  const hasStudent = Boolean(entities.studentName) || /\b(?:student|students|bachay|bache|strength|headcount|record|profile|details|father|walid|abbu|parent|guardian|gr\b|roll\s*number|medal|badge|award|certificate|house|trophy|achievement|winner|position|topper|list)\b/i.test(lower) || /طلباء|طالب\s*علم|بچے|بچوں|ریکارڈ|والد/.test(raw);
  if (hasClass || hasStudent || isEnrollmentCount) {
    const isCount = isCountOrStrength;
    if (isCount && !hasClass) return { domain: DOMAINS.SCHOOL_ROSTER, subdomain: SUBDOMAINS.STUDENT_COUNT };
    if (hasClass && !isCount && !hasStudent && !/\b(?:iski|iska|uska|uski|iske|uske)\b/i.test(lower)) return { domain: DOMAINS.SCHOOL_ROSTER, subdomain: SUBDOMAINS.CLASS_STRENGTH };
    return { domain: DOMAINS.SCHOOL_ROSTER, subdomain: isCount ? SUBDOMAINS.CLASS_STRENGTH : SUBDOMAINS.STUDENT_RECORD };
  }

  if (/\b(?:hello|hi|salam|assalam|hey|shukriya|thanks)\b/i.test(lower)) return { domain: DOMAINS.GENERAL, subdomain: null };
  return { domain: DOMAINS.GENERAL, subdomain: null };
}

function mapToIntent(domain, subdomain, negation, implicitIntent, lower = '') {
  if (negation && negation.isContrastive && negation.positiveIntent) return negation.positiveIntent;
  if (implicitIntent.detected) return implicitIntent.impliedIntent;
  switch (domain) {
    case DOMAINS.CONVERSATION_CONTROL: return 'RESET_ACTIVE_WORKFLOW';
    case DOMAINS.EXECUTIVE: return 'EXECUTIVE_STATUS_BRIEFING';
    case DOMAINS.SCHOOL_OPERATIONS:
      return subdomain === SUBDOMAINS.PARENT_RELATIONS ? 'PARENT_OPERATIONS_STATUS' : 'OPERATIONS_STATUS';
    case DOMAINS.GROWTH: return 'GROWTH_ANALYSIS';
    case DOMAINS.OUT_OF_SCOPE: return 'OUT_OF_SCOPE_EXTERNAL_PROJECT';
    case DOMAINS.DESKTOP: return subdomain === SUBDOMAINS.FILE_MANAGEMENT ? 'DESKTOP_ORGANIZE_FILES' : 'DESKTOP_ACTION';
    case DOMAINS.SCHOOL_FINANCE:
      if (subdomain === SUBDOMAINS.FEE_DISCREPANCY) return 'FEE_DISCREPANCY_INQUIRY';
      if (subdomain === SUBDOMAINS.FEE_SUMMARY) return 'READ_FEE_SUMMARY';
      if (subdomain === SUBDOMAINS.FEE_WRITE) return 'RECORD_FEE_COLLECTION';
      return 'READ_STUDENT_FEE';
    case DOMAINS.ADMISSION:
      return subdomain === SUBDOMAINS.ADMISSION_WRITE ? 'CREATE_ADMISSION' : 'PUBLIC_INFO';
    case DOMAINS.ATTENDANCE:
      return subdomain === SUBDOMAINS.ATTENDANCE_WRITE ? 'MARK_ATTENDANCE' : 'READ_ATTENDANCE';
    case DOMAINS.STAFF: return 'READ_STAFF_SUMMARY';
    case DOMAINS.SCHOOL_ROSTER:
      if (subdomain === SUBDOMAINS.STUDENT_COUNT) return 'READ_STUDENT_COUNT';
      if (subdomain === SUBDOMAINS.CLASS_STRENGTH) return 'READ_CLASS_STRENGTH';
      if (subdomain === SUBDOMAINS.STUDENT_RECORD) return 'READ_STUDENT_RECORD';
      return 'READ_CLASSES_LIST';
    case DOMAINS.MARKET: return 'MARKET_INTELLIGENCE';
    case DOMAINS.DESKTOP: return 'DESKTOP_ACTION';
    case DOMAINS.BROWSER: return 'BROWSER_RESEARCH';
    case DOMAINS.PUBLIC_INFO: return 'PUBLIC_INFO';
    default:
      if (/\b(?:hello|hi|salam|assalam|hey|aao|marhaba)\b/i.test(lower)) return 'GREETING';
      return 'GENERAL_CONVERSATION';
  }
}

function detectModality(lower) {
  const hasCmd = /\b(?:karo|karein|kar\s*do|laga\s*do|mark\s*karo|clear\s*kar|settle\s*kar|jama\s*kar|enter\s*kar|admit\s*kar|update\s*kar)\b/i.test(lower);
  const hasQuery = /\b(?:kitni|batao|btao|dikhao|check|status|summary|report|show|pending)\b/i.test(lower);
  if (hasCmd && !hasQuery) return 'WRITE';
  if (hasQuery && !hasCmd) return 'READ';
  if (hasCmd && hasQuery) return 'AMBIGUOUS';
  return 'READ';
}

function extractEntities(normalized, lower, rawOriginal, session) {
  const entities = {};

  // ── Primary Extraction via StudentQueryParser (Structural Spans) ──
  try {
    const parsed = StudentQueryParser.parse(rawOriginal);
    if (parsed) {
      if (parsed.student_name) {
        entities.studentName = parsed.student_name;
        entities.studentReference = parsed.student_name;
      }
      if (parsed.father_name) {
        entities.fatherName = parsed.father_name;
      }
      if (parsed.class_name) {
        entities.className = parsed.class_name;
      }
      if (parsed.gr_number) {
        entities.grNumber = parsed.gr_number;
        entities.studentReference = parsed.gr_number;
      }
      if (parsed.roll_number) {
        entities.rollNumber = parsed.roll_number;
      }
    }
  } catch (e) {}

  // Class extraction fallback
  if (!entities.className) {
    const classPatterns = [
      { regex: /\b(?:class\s*|grade\s*)?pre\s*[-]?\s*(?:nine|9th?|9)\b/i, name: 'Pre Nine' },
      { regex: /\b(?:class\s*|grade\s*)?(?:hifaz|hifz)\b/i, name: 'Hifaz Class' },
      { regex: /\b(?:class\s*|grade\s*)?starter\b/i, name: 'Starter' },
      { regex: /\b(?:class\s*|grade\s*)?mover\b/i, name: 'Mover' },
      { regex: /\b(?:class\s*|grade\s*)?flyer\b/i, name: 'Flyer' },
      { regex: /\b(?:class\s*|grade\s*)?nursery\b/i, name: 'Nursery' },
      { regex: /\b(?:class\s*|grade\s*)?prep\b/i, name: 'Prep' },
      { regex: /\b(?:class\s*|grade\s*|pehli\s*)?(?:1|one|first)\b/i, name: 'One' },
      { regex: /\b(?:class\s*|grade\s*|doosri\s*)?(?:2|two|second)\b/i, name: 'Two' },
      { regex: /\b(?:class\s*|grade\s*|teesri\s*)?(?:3|three|third)\b/i, name: 'Three' },
      { regex: /\b(?:class\s*|grade\s*|chothi\s*)?(?:4|four|fourth)\b/i, name: 'Four' },
      { regex: /\b(?:class\s*|grade\s*|panchween\s*)?(?:5|five|fifth)\b/i, name: 'Five' },
      { regex: /\b(?:class\s*|grade\s*|chhati\s*)?(?:6|six|sixth)\b/i, name: 'Six' },
      { regex: /\b(?:class\s*|grade\s*|saatween\s*)?(?:7|seven|seventh)\b/i, name: 'Seven' },
      { regex: /\b(?:class\s*|grade\s*|aathween\s*)?(?:8|eight|eighth)\b/i, name: 'Eight' },
      { regex: /\b(?:class\s*|grade\s*)?(?:9|nine|ninth)\b/i, name: 'Nine' },
      { regex: /\b(?:class\s*|grade\s*)?(?:10|ten|tenth|matric)\b/i, name: 'Ten' },
      // Urdu script
      { regex: /کلاس\s*اول|جماعت\s*اول/i, name: 'One' },
      { regex: /کلاس\s*دوم|جماعت\s*دوم/i, name: 'Two' },
      { regex: /کلاس\s*سوم|جماعت\s*سوم/i, name: 'Three' },
      { regex: /کلاس\s*چہارم|جماعت\s*چہارم/i, name: 'Four' },
      { regex: /کلاس\s*پنجم|جماعت\s*پنجم/i, name: 'Five' },
    ];
    for (const p of classPatterns) {
      if (p.regex.test(lower) || p.regex.test(rawOriginal)) { entities.className = p.name; break; }
    }
  }

  // GR Number
  if (!entities.grNumber) {
    const grMatch = normalized.match(/\b(?:GR|MIG|ASSPS)[-\s]?[\d]+[-\s]?[\d]*/i);
    if (grMatch) {
      entities.grNumber = grMatch[0].toUpperCase().replace(/\s/g, '-');
      entities.studentReference = entities.grNumber;
    }
  }

  // Student name fallback (contiguous run algorithm)
  if (!entities.grNumber && !entities.studentName) {
    const name = extractStudentName(normalized);
    if (name) {
      entities.studentName = name;
      entities.studentReference = name;
    }
  }

  if (entities.studentName && /^(?:closed?|close|task|mission|cancel|stop|exit|band|khatam|reset|clear|leave|forget|switch)$/i.test(entities.studentName.trim())) {
    delete entities.studentName;
    delete entities.studentReference;
  }

  // Urdu script name
  const urduNameMatch = rawOriginal.match(/(?:طالب\s*علم|نام|student\s*name|student name)\s*:\s*([^\n,،]{3,})/i);
  if (urduNameMatch) {
    entities.studentName = urduNameMatch[1].trim();
    entities.studentReference = entities.studentName;
  }

  // Pronoun resolution
  if (hasPronouns(lower)) {
    const resolved = session.lastStudent || session.activeStudent;
    if (resolved) {
      entities.studentName = entities.studentName || resolved.name;
      entities.studentReference = entities.studentReference || resolved.name;
      if (resolved.id) entities.studentId = resolved.id;
      entities.className = entities.className || resolved.class;
      entities.resolvedVia = 'PRONOUN_SESSION';
    }
  }

  // Session fallback for className
  if (!entities.className && (session.currentClass || session.lastStudent?.class)) {
    entities.className = session.currentClass || session.lastStudent?.class;
    entities.classResolvedVia = 'SESSION';
  }

  // Amount
  const amtMatch = normalized.match(/\b(?:pkr|rs\.?|rupees|روپے)?\s*([0-9]{3,6})\b/i);
  if (amtMatch) {
    const amt = Number(amtMatch[1]);
    if (amt >= 100 && amt <= 500000) entities.amount = amt;
  }

  return entities;
}

function detectMissingSlots(domain, subdomain, lower, raw, session, entities = {}) {
  const missing = [];
  const hasStudentRef = !!(
    entities.studentName || entities.studentReference || entities.grNumber ||
    session.lastStudent || session.activeStudent ||
    /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/.test(raw) ||
    /\b(?:GR|MIG|ASSPS)[-\s]?[\d]+/i.test(raw) ||
    hasPronouns(lower)
  );
  if (domain === DOMAINS.SCHOOL_FINANCE && subdomain === SUBDOMAINS.STUDENT_FEE) {
    if (!hasStudentRef) missing.push('STUDENT_NAME_OR_GR');
  }
  return missing;
}

function estimateConfidence({ domain, subdomain, negation, userCorrection, hasPronounRef, session, lower, rawText, implicitIntent, multiIntentResult, entities = {} }) {
  let conf = 0.50;
  if (domain !== DOMAINS.GENERAL) conf += 0.20;
  if (subdomain) conf += 0.10;
  if (/\b(?:fee|fees|challan|dues|pending|balance)\b/i.test(lower)) conf += 0.08;
  if (/\b(?:batao|btao|dikhao|check)\b/i.test(lower)) conf += 0.05;
  if (hasPronounRef && (session.lastStudent || session.activeStudent)) conf += 0.06;
  else if (hasPronounRef && !entities.studentName && !(session.lastStudent || session.activeStudent)) conf -= 0.15;
  if (negation.detected && !negation.negatedDomain) conf -= 0.10;
  if (implicitIntent.detected) conf = Math.min(conf, implicitIntent.confidence);
  if (multiIntentResult.detected) conf -= 0.05;
  if (userCorrection.detected) conf = Math.min(conf, 0.82);

  // Vague / single-keyword penalty (e.g. "fee", "batao", "check karo")
  const words = lower.trim().split(/[\s,;:.!?]+/).filter(Boolean);
  if (words.length <= 2 && !entities.studentName && !entities.className && !/[A-Z][a-z]{2,}/.test(rawText) && !/\b(?:class|grade|two|one|three|four|five|six|seven|eight|nine|ten|hania|ali|ahmad|fatima|zain)\b/i.test(lower)) {
    conf -= 0.25;
  }

  const aggregate = Math.max(0.30, Math.min(0.99, conf));
  const intentConfidence = (domain !== DOMAINS.GENERAL && subdomain) ? 0.96 : (domain !== DOMAINS.GENERAL ? 0.85 : 0.60);
  const hasResolvedEntity = Boolean(entities.studentName || entities.studentReference || session?.lastStudent || session?.activeStudent);
  const entityConfidence = hasResolvedEntity ? 0.95 : 0.50;
  const referenceConfidence = (hasPronounRef || (session?.lastStudent || session?.activeStudent)) ? 0.95 : 0.70;
  const negationConfidence = negation?.detected ? 0.92 : 1.0;
  const contextConfidence = userCorrection?.detected ? 0.88 : 0.95;
  const actionConfidence = Math.min(intentConfidence, entityConfidence, referenceConfidence, negationConfidence, contextConfidence);

  return {
    aggregate,
    components: {
      INTENT_CONFIDENCE: Number(intentConfidence.toFixed(2)),
      ENTITY_CONFIDENCE: Number(entityConfidence.toFixed(2)),
      REFERENCE_CONFIDENCE: Number(referenceConfidence.toFixed(2)),
      NEGATION_CONFIDENCE: Number(negationConfidence.toFixed(2)),
      CONTEXT_CONFIDENCE: Number(contextConfidence.toFixed(2)),
      ACTION_CONFIDENCE: Number(actionConfidence.toFixed(2))
    }
  };
}

// ── ComprehensionEngine ─────────────────────────────────────────────────────
class ComprehensionEngine {
  static build(rawText, session = {}, activeContext = null, role = 'PUBLIC') {
    const normalized = normalizeTypos(rawText);
    const lower = normalized.toLowerCase();
    const detectedLanguage = detectScriptLanguage(rawText);
    const negation = detectNegation(normalized);
    const contextAction = detectContextAction(normalized, activeContext);
    const multiIntentResult = detectMultiIntent(normalized);
    const implicitIntent = detectImplicitIntent(normalized, activeContext);

    const userCorrection = {
      detected: (
        /\b(?:ni|nahi|no|mera\s*matlab|mera\s*maqsad|asal\s*mein|actually|just\s*fee|sirf\s*fee|admission\s*nahi|dakhla\s*nahi)\b/i.test(lower) ||
        contextAction === CONTEXT_ACTIONS.CONTRADICT ||
        contextAction === CONTEXT_ACTIONS.REPLACE
      ),
      correctedFrom: activeContext?.intent || null,
      correctedTo: null,
    };

    // Extract Entities first via structural StudentQueryParser
    const entities = extractEntities(normalized, lower, rawText, session);

    // Domain & subdomain (aware of extracted entities)
    const { domain, subdomain } = detectDomainSubdomain(lower, rawText, negation, implicitIntent, entities);

    const hasPronounRef = hasPronouns(lower);
    const references = hasPronounRef ? {
      pronoun: true,
      resolvedFrom: session.lastStudent || session.activeStudent || null
    } : {};

    const missingInformation = detectMissingSlots(domain, subdomain, lower, rawText, session, entities);
    const confResult = estimateConfidence({ domain, subdomain, negation, userCorrection, hasPronounRef, session, lower, rawText, implicitIntent, multiIntentResult, entities });
    const confidence = confResult.aggregate;
    const confidenceComponents = confResult.components;
    const urgency = /\b(?:urgent|jaldi|abhi|now|immediately|asap|zaroor)\b/i.test(lower) ? 'HIGH' : 'NORMAL';

    const ambiguities = [];
    if (confidence < 0.65) ambiguities.push('LOW_CONFIDENCE_INTENT');
    if (domain === DOMAINS.SCHOOL_FINANCE && subdomain === SUBDOMAINS.STUDENT_FEE &&
        !session.lastStudent && !session.activeStudent &&
        !entities.studentName && !entities.studentReference &&
        !/[A-Z][a-z]{2,}/.test(rawText) && !/GR|MIG/i.test(rawText)) {
      ambiguities.push('AMBIGUOUS_STUDENT_REFERENCE');
    }

    return {
      RAW_TEXT: rawText,
      NORMALIZED_TEXT: normalized,
      DETECTED_LANGUAGE: detectedLanguage,
      USER_INTENT: mapToIntent(domain, subdomain, negation, implicitIntent, lower),
      MODALITY: multiIntentResult.detected ? 'MULTI_INTENT'
        : (negation.detected && negation.negatedDomain ? 'CORRECTION'
          : userCorrection.detected ? 'CORRECTION'
          : detectModality(lower)),
      DOMAIN: domain,
      SUBDOMAIN: subdomain,
      ENTITIES: entities,
      REFERENCES: references,
      ACTIVE_CONTEXT: activeContext,
      USER_CORRECTION: userCorrection,
      NEGATION: negation,
      URGENCY: urgency,
      MISSING_INFORMATION: missingInformation,
      CONFIDENCE: confidence,
      CONFIDENCE_COMPONENTS: confidenceComponents,
      AMBIGUITIES: ambiguities,
      CONTEXT_ACTION: contextAction,
      MULTI_INTENTS: multiIntentResult.detected ? multiIntentResult.intents : [],
      MULTI_INTENT_SEGMENTS: multiIntentResult.segments || [],
      IMPLICIT_INTENT: implicitIntent,
      ROLE: role,
      SELF_CHECK: null,
    };
  }

  static comprehend(...args) {
    return this.build(...args);
  }

  static selfCheck(draftReply, comprehension, session) {
    return runSelfCheck(draftReply, comprehension, session);
  }
}

module.exports = {
  ComprehensionEngine,
  normalizeTypos,
  detectNegation,
  detectContextAction,
  detectImplicitIntent,
  detectMultiIntent,
  runSelfCheck,
  DOMAINS,
  SUBDOMAINS,
  CONTEXT_ACTIONS,
};
