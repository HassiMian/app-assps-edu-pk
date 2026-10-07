/**
 * Structured Entity Extractor and Query Parser for Main JARVIS Production
 *
 * Provides deterministic structured parsing for school queries:
 * - student_name / person_name (preserved raw & case-folded comparison)
 * - father_name (e.g. daughter of X, son of X, walid X, d/o X, s/o X)
 * - class_name (validated against authentic catalog: Starter, Mover, Flyer, One..Ten, Pre Nine, Hifaz)
 * - section (Blue, Green, Yellow, Red, Abubakar, Fatima, Usman)
 * - gr_number (e.g. GR-1016, MIG26-169)
 * - roll_number
 * - requested_fields (fee, attendance, result, timetable, profile, etc.)
 */

export const CLASS_CATALOG = {
  'starter': 'Starter',
  'mover': 'Mover',
  'flyer': 'Flyer',
  'playgroup': 'Playgroup',
  'nursery': 'Nursery',
  'prep': 'Prep',
  'kg': 'Prep',
  'one': 'One',
  '1st': 'One',
  '1': 'One',
  'first': 'One',
  'two': 'Two',
  '2nd': 'Two',
  '2': 'Two',
  'second': 'Two',
  'three': 'Three',
  '3rd': 'Three',
  '3': 'Three',
  'third': 'Three',
  'four': 'Four',
  '4th': 'Four',
  '4': 'Four',
  'fourth': 'Four',
  'five': 'Five',
  '5th': 'Five',
  '5': 'Five',
  'fifth': 'Five',
  'six': 'Six',
  '6th': 'Six',
  '6': 'Six',
  'sixth': 'Six',
  'seven': 'Seven',
  '7th': 'Seven',
  '7': 'Seven',
  'seventh': 'Seven',
  'eight': 'Eight',
  '8th': 'Eight',
  '8': 'Eight',
  'eighth': 'Eight',
  'pre nine': 'Pre Nine',
  'pre-nine': 'Pre Nine',
  'pre 9': 'Pre Nine',
  'pre 9th': 'Pre Nine',
  'nine': 'Nine',
  '9th': 'Nine',
  '9': 'Nine',
  'ninth': 'Nine',
  'ten': 'Ten',
  '10th': 'Ten',
  '10': 'Ten',
  'tenth': 'Ten',
  'matric': 'Ten',
  'hifaz': 'Hifaz Class',
  'hifz': 'Hifaz Class',
  'hifaz class': 'Hifaz Class'
};

export const SECTION_CATALOG = {
  'blue': 'Blue',
  'green': 'Green',
  'yellow': 'Yellow',
  'red': 'Red',
  'abubakar': 'Abubakar',
  'fatima': 'Fatima',
  'usman': 'Usman',
  'a': 'Blue',
  'b': 'Green',
  'c': 'Yellow',
  'd': 'Red'
};

export function normalizeClassKey(str) {
  if (!str) return '';
  const clean = String(str).toLowerCase().trim();
  if (CLASS_CATALOG[clean]) return CLASS_CATALOG[clean].toLowerCase();

  const stripped = clean.replace(/class|grade|\s+/gi, '').trim();
  if (CLASS_CATALOG[stripped]) return CLASS_CATALOG[stripped].toLowerCase();

  return stripped;
}

// Priority-ordered class match patterns for atomic token extraction
export const ORDERED_CLASS_MATCHERS = [
  // 1. Composite Pre-Nine and Hifaz
  { pattern: /\b(?:class|grade|جماعت)?\s*(?:pre\s*[-]?\s*nine|pre\s*[-]?\s*9th?|pre\s*[-]?\s*9)\b/i, canonical: 'Pre Nine' },
  { pattern: /\b(?:class|grade|جماعت)?\s*(?:hifaz\s*class|hifaz|hifz)\b/i, canonical: 'Hifaz Class' },

  // 2. Early Years
  { pattern: /\b(?:class|grade|جماعت)?\s*(?:playgroup|play\s*group|pg)\b/i, canonical: 'Playgroup' },
  { pattern: /\b(?:class|grade|جماعت)?\s*(?:nursery|nur)\b/i, canonical: 'Nursery' },
  { pattern: /\b(?:class|grade|جماعت)?\s*(?:prep|kg)\b/i, canonical: 'Prep' },
  { pattern: /\b(?:class|grade|جماعت)?\s*starter\b/i, canonical: 'Starter' },
  { pattern: /\b(?:class|grade|جماعت)?\s*mover\b/i, canonical: 'Mover' },
  { pattern: /\b(?:class|grade|جماعت)?\s*flyer\b/i, canonical: 'Flyer' },

  // 3. Ordinals with optional class/grade prefix or suffix (10th down to 1st)
  { pattern: /\b(?:class|grade|جماعت)?\s*(?:10th|10\s*th|10-th|tenth|matric)\s*(?:class|grade|جماعت)?\b/i, canonical: 'Ten' },
  { pattern: /\b(?:class|grade|جماعت)?\s*(?:9th|9\s*th|9-th|ninth)\s*(?:class|grade|جماعت)?\b/i, canonical: 'Nine' },
  { pattern: /\b(?:class|grade|جماعت)?\s*(?:8th|8\s*th|8-th|eighth)\s*(?:class|grade|جماعت)?\b/i, canonical: 'Eight' },
  { pattern: /\b(?:class|grade|جماعت)?\s*(?:7th|7\s*th|7-th|seventh)\s*(?:class|grade|جماعت)?\b/i, canonical: 'Seven' },
  { pattern: /\b(?:class|grade|جماعت)?\s*(?:6th|6\s*th|6-th|sixth)\s*(?:class|grade|جماعت)?\b/i, canonical: 'Six' },
  { pattern: /\b(?:class|grade|جماعت)?\s*(?:5th|5\s*th|5-th|fifth)\s*(?:class|grade|جماعت)?\b/i, canonical: 'Five' },
  { pattern: /\b(?:class|grade|جماعت)?\s*(?:4th|4\s*th|4-th|fourth)\s*(?:class|grade|جماعت)?\b/i, canonical: 'Four' },
  { pattern: /\b(?:class|grade|جماعت)?\s*(?:3rd|3\s*rd|3-rd|third)\s*(?:class|grade|جماعت)?\b/i, canonical: 'Three' },
  { pattern: /\b(?:class|grade|جماعت)?\s*(?:2nd|2\s*nd|2-nd|second)\s*(?:class|grade|جماعت)?\b/i, canonical: 'Two' },
  { pattern: /\b(?:class|grade|جماعت)?\s*(?:1st|1\s*st|1-st|first)\s*(?:class|grade|جماعت)?\b/i, canonical: 'One' },

  // 4. Word Numbers with class/grade keyword
  { pattern: /\b(?:class|grade|جماعت)\s+ten\b/i, canonical: 'Ten' },
  { pattern: /\bten\s+(?:class|grade|جماعت)\b/i, canonical: 'Ten' },
  { pattern: /\b(?:class|grade|جماعت)\s+nine\b/i, canonical: 'Nine' },
  { pattern: /\bnine\s+(?:class|grade|جماعت)\b/i, canonical: 'Nine' },
  { pattern: /\b(?:class|grade|جماعت)\s+eight\b/i, canonical: 'Eight' },
  { pattern: /\beight\s+(?:class|grade|جماعت)\b/i, canonical: 'Eight' },
  { pattern: /\b(?:class|grade|جماعت)\s+seven\b/i, canonical: 'Seven' },
  { pattern: /\bseven\s+(?:class|grade|جماعت)\b/i, canonical: 'Seven' },
  { pattern: /\b(?:class|grade|جماعت)\s+six\b/i, canonical: 'Six' },
  { pattern: /\bsix\s+(?:class|grade|جماعت)\b/i, canonical: 'Six' },
  { pattern: /\b(?:class|grade|جماعت)\s+five\b/i, canonical: 'Five' },
  { pattern: /\bfive\s+(?:class|grade|جماعت)\b/i, canonical: 'Five' },
  { pattern: /\b(?:class|grade|جماعت)\s+four\b/i, canonical: 'Four' },
  { pattern: /\bfour\s+(?:class|grade|جماعت)\b/i, canonical: 'Four' },
  { pattern: /\b(?:class|grade|جماعت)\s+three\b/i, canonical: 'Three' },
  { pattern: /\bthree\s+(?:class|grade|جماعت)\b/i, canonical: 'Three' },
  { pattern: /\b(?:class|grade|جماعت)\s+two\b/i, canonical: 'Two' },
  { pattern: /\btwo\s+(?:class|grade|جماعت)\b/i, canonical: 'Two' },
  { pattern: /\b(?:class|grade|جماعت)\s+one\b/i, canonical: 'One' },
  { pattern: /\bone\s+(?:class|grade|جماعت)\b/i, canonical: 'One' },

  // 5. Digits with class/grade or contextual markers (10 down to 1)
  { pattern: /\b(?:class|grade|جماعت)\s*[:#-]?\s*(10|[1-9])\b/i, canonicalDigit: true },
  { pattern: /\b(10|[1-9])\s+(?:class|grade|جماعت|ka\s+student|ki\s+student|student\s+hai|student|mein\s+hai|mein|me)\b/i, canonicalDigit: true }
];

const DIGIT_CANONICAL = {
  '1': 'One', '2': 'Two', '3': 'Three', '4': 'Four', '5': 'Five',
  '6': 'Six', '7': 'Seven', '8': 'Eight', '9': 'Nine', '10': 'Ten'
};

export function extractStructuralSpans(rawText) {
  const lines = String(rawText || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const spans = {
    entitySpans: [],
    relationSpans: [],
    commandSpans: [],
    questionSpans: [],
    attributeSpans: []
  };

  for (const line of lines) {
    const lower = line.toLowerCase();
    const isRel = /^(?:father(?:\s*name)?|walid(?:\s*ka\s*naam)?|waldiyat|والد(?:\s*کا\s*نام)?|ولدیت|mother(?:\s*name)?|guardian)\s*[:=–-]?/i.test(line);
    const isCls = /^(?:class|grade|جماعت|کلاس)\s*[:=–-]?/i.test(line);
    const isContact = /^(?:phone|contact|mobile|whatsapp|number|رابطہ|فون)\s*[:=–-]?/i.test(line);
    const isDob = /^(?:dob|date\s*of\s*birth|تاریخ\s*پیدائش|پیدائش)\s*[:=–-]?/i.test(line);
    const isLabeledStudent = /^(?:student\s*name|candidate\s*name|student(?:\s*ka\s*naam)?|naam|نام)\s*[:=–-]/i.test(line);

    const isPureCommandLine = (
      /^(?:is\s*student\s*ki|iski|uski|inki|unki)?\s*(?:details|detail|record|records|profile|fee\s*details|attendance|hazri|status|marks|result)?\s*(?:batao|btao|dikhao|check|dein|do|bhejo|janna|poochna|karo|kro)\b/i.test(lower) ||
      /^(?:batao|btao|dikhao|check|dein|do|bhejo|janna|poochna)\b/i.test(lower) ||
      /^(?:details|record|profile)\s*(?:batao|btao|dikhao|dein|do)?\s*$/i.test(lower) ||
      /^(?:معلومات|تفصیلات|ریکارڈ|فیس)\s*(?:بتائیں|دکھائیں|چیک)?\s*$/i.test(line)
    );

    const isQuestion = /\b(?:kitn[eyia]|ktn[eyia]|how\s*many|how\s*much|kya\s*(?:hai|hua|bana)|kaun|kab)\b/i.test(lower) || /\?|؟/.test(line);

    if (isRel) {
      spans.relationSpans.push(line);
    } else if (isCls || isContact || isDob) {
      spans.attributeSpans.push(line);
    } else if (isPureCommandLine) {
      spans.commandSpans.push(line);
    } else if (isQuestion) {
      spans.questionSpans.push(line);
    } else if (isLabeledStudent) {
      spans.entitySpans.push(line);
    } else {
      // Also extract any trailing command clause if present within this sentence/line
      const trailingCmdMatch = line.match(/\s+(?:is\s*student\s*ki|iski|uski|inki|unki)?\s*(?:details|detail|record|fee|fees|hazri|attendance)?\s*(?:batao|btao|dikhao|check|dein|do|bhejo|janna|poochna)[.?!;:,،؟\s]*$/i);
      if (trailingCmdMatch) {
        spans.commandSpans.push(trailingCmdMatch[0].trim());
      }
      spans.entitySpans.push(line);
    }
  }

  return spans;
}

export class StudentQueryParser {
  static parse(query, context = {}) {
    const raw = String(query || '').trim();
    if (!raw) {
      return {
        intent: 'unknown',
        confidence: 0,
        student_name: null,
        father_name: null,
        class_name: null,
        section: null,
        gr_number: null,
        roll_number: null,
        requested_fields: [],
        unresolved_tokens: []
      };
    }

    const structuralSpans = extractStructuralSpans(raw);
    const isMultiLine = raw.includes('\n') || raw.includes('\r');
    let text = raw;

    // 1. Extract GR number
    let gr_number = null;
    const grMatch = text.match(/\b(?:gr\s*number|gr\s*no|g\.r\.|g\.r|\bgr\b)\s*(?:is|hai|#|:)\s*([a-zA-Z0-9_-]+)\b/i) ||
                    text.match(/\b(?:gr\s*number|gr\s*no|g\.r\.|g\.r|\bgr\b)\s*(\d+[a-zA-Z0-9_-]*)\b/i) ||
                    text.match(/\b(MIG26-\d{3}|GR-\d{4})\b/i);
    if (grMatch) {
      gr_number = (grMatch[1] || grMatch[0]).toUpperCase();
      text = text.replace(grMatch[0], ' ');
    }

    // 2. Extract Roll Number
    let roll_number = null;
    const rollMatch = text.match(/\b(?:roll|roll\s*no|roll\s*number)\s*(?:is|hai|#|:)?\s*(\d+)\b/i);
    if (rollMatch) {
      roll_number = rollMatch[1];
      text = text.replace(rollMatch[0], ' ');
    }

    // 3. Extract Father Name / Relationship
    let father_name = null;
    if (structuralSpans.relationSpans.length > 0) {
      for (const relLine of structuralSpans.relationSpans) {
        const cleanRel = relLine.replace(/^(?:father(?:\s*name)?|walid(?:\s*ka\s*naam)?|waldiyat|والد(?:\s*کا\s*نام)?|ولدیت|mother(?:\s*name)?|guardian)\s*[:=–-]?\s*/i, '').trim();
        if (cleanRel && cleanRel.length >= 2 && !CLASS_CATALOG[cleanRel.toLowerCase()]) {
          father_name = cleanRel;
          text = text.replace(relLine, ' ');
          break;
        }
      }
    }

    if (!father_name) {
      const relRegex = /\b(?:daughter\s+of|d\/o|son\s+of|s\/o|father\s*(?:name)?|walid\s*(?:ka\s*naam)?|waldiyat|والد\s*(?:کا\s*نام)?|ولدیت|دختر)\s*(?::|\s)\s*([a-zA-Z\u0600-\u06FF\s.'-]+?)(?=\s+(?:jo\s+k|jo\s+ke|jo|hai|hein|mein|ki|ka|ke|ko|class|grade|section|roll|gr|fee|dues|attendance|result|record|details)|[\r\n]|$|[.,?!;])/i;
      const relMatch = text.match(relRegex);
      if (relMatch) {
        const candidateFather = relMatch[1].trim().replace(/\s+/g, ' ');
        if (candidateFather.length >= 2 && !CLASS_CATALOG[candidateFather.toLowerCase()]) {
          father_name = candidateFather;
          text = text.replace(relMatch[0], ' ');
        }
      }
    }

    // 4. Extract Section (Only match explicit "section <name>" or pure color sections)
    let section = null;
    const secMatch = text.match(/\b(?:section|sec)\s*[:#-]?\s*([a-zA-Z]+)\b/i) ||
                     text.match(/\b(blue|green|yellow|red)\b/i);
    if (secMatch) {
      const secToken = (secMatch[1] || secMatch[0]).toLowerCase();
      if (SECTION_CATALOG[secToken]) {
        section = SECTION_CATALOG[secToken];
        text = text.replace(secMatch[0], ' ');
      }
    }

    // 5. Extract Class Name using atomic ordered matchers
    let class_name = null;
    for (const matcher of ORDERED_CLASS_MATCHERS) {
      const match = text.match(matcher.pattern);
      if (match) {
        if (matcher.canonical) {
          class_name = matcher.canonical;
        } else if (matcher.canonicalDigit) {
          const digit = match[1] || match[0].match(/\d+/)?.[0];
          class_name = DIGIT_CANONICAL[digit] || 'Eight';
        }
        text = text.replace(match[0], ' ');
        break;
      }
    }

    // Fallback: Check for named base classes or words followed by section
    if (!class_name) {
      for (const [classKey, canonicalClass] of Object.entries(CLASS_CATALOG)) {
        const wordRegex = new RegExp(`\\b${classKey}\\b`, 'i');
        if (wordRegex.test(raw)) {
          // If it's a number word like "eight", check if followed by section or in school context
          if (/^(one|two|three|four|five|six|seven|eight|nine|ten|1|2|3|4|5|6|7|8|9|10)$/i.test(classKey)) {
            if (section || /\b(class|grade|mein|me|ki|ka|ke|students?|bachay|bache|bachy|strength)\b/i.test(raw)) {
              class_name = canonicalClass;
              text = text.replace(wordRegex, ' ');
              break;
            }
          } else {
            class_name = canonicalClass;
            text = text.replace(wordRegex, ' ');
            break;
          }
        }
      }
    }

    // 6. Detect domain field keywords
    const sLower = raw.toLowerCase();
    const isAdmissionCapability = (
      /\b(kya\s+(?:tum|aap)|can\s+you|could\s+you)\b/i.test(sLower) &&
      /\b(admission|admissions|dakhla|dakhlay|dakhil)\b/i.test(sLower) &&
      /\b(kar\s*sakt|kr\s*sakt|bana\s*sakt|generate|print|create|handle|voucher|form)\b/i.test(sLower)
    ) || (
      sLower.includes('admission') && sLower.includes('voucher') && (sLower.includes('print') || sLower.includes('skty') || sLower.includes('sakte') || sLower.includes('kya'))
    );
    const isAdmissionStart = !isAdmissionCapability && (
      /\b(new\s+admission|naya\s+admission|fresh\s+admission|admission\s+(?:karna|kro|karo|karein|karwana|bhejna|submit|start)|dakhla\s+(?:karna|kro|karo|karein)|student\s+(?:add|admit|dakhil)\s+karo)\b/i.test(sLower)
    );
    const isTeacherQuery = /\b(teachers?|asatza|asatiza|asateza|faculty|teaching\s*staff)\b/i.test(sLower);
    const isStaffQuery = /\b(admin\s*staff|administrative|administration|mulazmeen|mulazmin|employees|all\s*staff|total\s*staff)\b/i.test(sLower) && !isTeacherQuery;
    const isClassesListQuery = /\b((?:kitn[eyia]|ktn|how\s+many)\s+(?:classes|sections?)|(?:classes|sections?)\s+(?:kitn[eyia]|ktn)|total\s+(?:classes|sections?)|classes\s+batao|tamam\s+classes|all\s+classes)\b/i.test(sLower) && !/\b(strength|tadaad|count|bachay|bache|bachy|students?)\b/i.test(sLower);
    const isDefaulterQuery = /\b(defaulters?|defaulter|unpaid\s+students?|unpaid\s+list|baqaya\s+list)\b/i.test(sLower);
    const isFeeQuery = !isAdmissionCapability && !isAdmissionStart && /\b(fee|fees|dues|balance|pending|challan|collection|recovery|فیس|بقایا)\b/i.test(sLower);
    const isAttendanceQuery = /\b(attendance|hazri|absent|present|حاضری)\b/i.test(sLower);
    const isResultQuery = /\b(result|results|marks|grade|percentage|رزلٹ|نمبر)\b/i.test(sLower);
    const isTimetableQuery = /\b(timetable|schedule|period|periods|routine|ٹائم\s*ٹیبل)\b/i.test(sLower);
    const isProfileQuery = /\b(profile|detail|details|info|information|record|records|مکمل\s*ریکارڈ)\b/i.test(sLower) && !/\b(records?\s*(?:count|tadaad|total|historical|database)|database\s*records|total\s*student\s*records)\b/i.test(sLower);

    const requested_fields = [];
    if (isFeeQuery) requested_fields.push('fee');
    if (isAttendanceQuery) requested_fields.push('attendance');
    if (isResultQuery) requested_fields.push('result');
    if (isTimetableQuery) requested_fields.push('timetable');
    if (isProfileQuery) requested_fields.push('profile');

    const isClassWise = /\b(class(?:es)?\s*-?\s*wise|section\s*-?\s*wise|har\s*class|tamam\s*class(?:es)?|sab\s*class(?:es)?|all\s*class(?:es)?|all\s+the\s+class(?:es)?)\b/i.test(sLower) ||
                        /\b(class(?:es)?\s+ki\s+strength|class(?:es)?\s+wise\s+students|all\s+class(?:es)?\s+student\s+breakdown)\b/i.test(sLower);

    const isStudentStrengthQuery = /\b(live\s+strength|current\s+strength|overall\s+strength|total\s+strength|total\s+active\s+strength|active\s+strength|school\s+ki\s+strength|school\s+strength)\b/i.test(sLower) ||
                                  /\b(strength|tadaad|headcount)\b/i.test(sLower) ||
                                  /\b(ktn|kitn[eyia]|how\s+many|ab\s+kitn[eyia])\s*(?:ab\s+)?(?:currently\s+)?(?:students?|bachay|bache|bachy|talba|talib\s*ilm|larke|larkiyan|larka|larki|admissions?|enrolled)\b/i.test(sLower) ||
                                  /\b(?:total\s+(?:students?|bachay|bache|bachy|talba|talib\s*ilm)|(?:students?|bachay|bache|bachy|talba|talib\s*ilm)\s*(?:kitn[eyia]|ktn|tadaad|count))\b/i.test(sLower) ||
                                  /\b(total\s+bachay|total\s+students|bachay\s+kitn|students\s+kitn|talba\s+kitn)\b/i.test(sLower) ||
                                  /\b(gender\s+breakdown|larke\s+aur\s+larkiyan|boys\s+and\s+girls|male\s+female|total\s+student\s+records|historical\s+database\s+student\s+records|database\s+student\s+records|enrolled\s+hain\s+filhal|kul\s+talba|ab\s+kitne\s+bachay)\b/i.test(sLower);

    let nameText = text
      .replace(/^(?:(?:hey|hi|hello)\s+)?(?:jarvis\s+)?(?:school\s+(?:saas|mein)\s+)?(?:ni|nahi|no|na|mera|meri|mere|matlab|maqsad|just|sirf|only|mujhe|mujhy|please|kindly|zara|bhai)?\s*/i, ' ')
      .replace(/^(?:find\s+student|find\s*karo|find|search\s+for\s+student|search\s+for|search\s+student|search\s*karo|search|lookup\s*karo|lookup|check\s*karo|check|dhundo|dhoondo|talaash\s*karo|تلاش\s*کریں|ڈھونڈیں)\s+/i, ' ')
      .replace(/^(?:student|talib\s*ilm|taliba|bacha|bache|bachi|طالب\s*علم|طالبہ)\s+/i, ' ')
      .replace(/\b(?:jo\s+k|jo\s+ke|jo|hai|hein|hain|tha|thi|the|hoga|hogi|hoge|student\s+hai|student|students|talib\s*ilm|taliba|class|classes|grade|section|sections|list|roster|names|naam|bachay|bache|bachy|talba|school)\b/gi, ' ')
      .replace(/\b(?:complete|mukammal|tamam|record|records|profile|details|detail|info|information|please|plz|karo|find|search|dikhao|batao|btao|wise|strength|live|ktn|ktni|ktne|kitne|kitny|kitni|kitna|current|active|total|overall|historical|database|breakdown|boys|girls|larke|larki|larkiyan|male|female|gender|jins|aaj|today|aj|aaye|aye|present|absent|summary|rate|collection|recovery|unpaid|defaulters|defaulter|school|ni|nahi|no|na|mera|meri|mere|matlab|maqsad|just|sirf|only|mujhe|mujhy|baary|bare|janna|poochna|create|entry|entries|koi|naya|nayi|new|dues|balance|konsi|konsa|konse|kounsi|kounsa|kounse|kaun|kaunsa|kaunsi|kaunse|kon|kis|kisko|kiska|kiski|kiske|kahan|kidhar|kab|kyun|kyu|kya|kia|what|which|where|when|who|whose|whom|gr|number|num|confirm|confirmation|receipt|concession|discount|wapas|dobara|again|bas|jama|raqam|baqaya|tha|thi|the|hoga|hogi|hoge)\b/gi, ' ')
      // Strip trailing request clauses including pronouns, question words, and conjunctions
      .replace(/\s+(?:ko|ka|ki|ke|k|ny|ne|se|aur|and|ya|or|wali|wala|wale|uski|uske|uska|unki|unke|unka|iski|iske|iska|inki|inke|inka|apna|apni|apne)?\s*(?:ktn[eyia]|kitn[eyia]|how\s*much|tadaad)?\s*(?:fee\s+details|fee\s+status|pending\s+fee|fee|fees|dues|balance|pending|challan|result|marks|attendance|hazri|timetable|profile|record|details|detail|info|information|list|roster|names|batao|btao|dikhao|do|dein|bhejo|check|search\s*karo|search|find|dhundo|dhoondo|baary|bare|janna).*/i, ' ')
      // Strip standalone pronouns and postpositions
      .replace(/\b(?:ko|ka|ki|ke|k|ny|ne|se|par|pe|mein|me|main|aur|and|ya|or|wali|wala|wale|unka|unki|unke|iska|iski|iske|uska|uski|uske|inka|inki|inke|is|us|iss|uss|do|dein|bhejo|ni|nahi|no|na|just|sirf|only|mujhe|mujhy|koi|kuch|konsi|konsa|konse|kounsi|kounsa|kounse|kaun|kaunsa|kaunsi|kaunse|kon|kis|kisko|kiska|kiski|kiske|kahan|kidhar|kab|kyun|kyu|kya|kia|what|which|where|when|who|whose|whom|gr|number|num|confirm|confirmation|receipt|concession|discount|wapas|dobara|again|bas|jama|raqam|baqaya|tha|thi|the|hoga|hogi|hoge)\b/gi, ' ')
      .replace(/[.?!;:,،؟]/g, ' ')
      .replace(/^(?:bhai|yaar|janab|sir|plz|please|kindly|zara|mujhe|mujhy|hey|hi|hello|jarvis|ni|nahi|no|just|sirf)\s+/i, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    let student_name = null;
    const isExplicitSearch = /\b(find\s+student|search\s+student|search\s+for|search|find|dhundo|dhoondo|talaash)\b/i.test(raw);
    const domainQueryWithoutStudent = isTeacherQuery || isStaffQuery || isClassesListQuery || isClassWise || isDefaulterQuery || (isStudentStrengthQuery && !isExplicitSearch) || (isFeeQuery && /(total|overall|summary|collection|recovery|kul|school)/i.test(sLower) && !isExplicitSearch);

    const DOMAIN_OP_WORDS = new Set([
      'admission', 'admissions', 'dakhla', 'dakhlay', 'admit', 'karna', 'kro', 'karo', 'karein', 'karwana',
      'fee', 'fees', 'challan', 'challans', 'voucher', 'vouchers', 'hazri', 'attendance', 'result',
      'batao', 'btao', 'dikhao', 'check', 'do', 'dein', 'sirf', 'just', 'only',
      'nahi', 'ni', 'mat', 'no', 'na', 'kuch', 'hai', 'hain', 'ka', 'ki', 'ke', 'ko', 'se', 'mein', 'me',
      'tha', 'thi', 'the', 'hoga', 'hogi', 'hoge',
      'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
      'clear', 'paid', 'unpaid', 'status', 'create', 'entry', 'entries', 'koi', 'new', 'naya', 'nayi', 'dues', 'balance',
      'konsi', 'konsa', 'konse', 'kounsi', 'kounsa', 'kounse', 'kaun', 'kaunsa', 'kaunsi', 'kaunse', 'kon', 'kis', 'kisko', 'kiska', 'kiski', 'kiske', 'kahan', 'kidhar', 'kab', 'kyun', 'kya', 'kia', 'what', 'which', 'where', 'when', 'who', 'whose', 'whom',
      'gr', 'number', 'num', 'confirm', 'confirmation', 'receipt', 'concession', 'discount', 'wapas', 'dobara', 'again', 'bas', 'jama', 'raqam', 'baqaya',
      'اس', 'بچے', 'بچہ', 'کا', 'کی', 'کے', 'کو', 'اور', 'نام', 'کلاس', 'بتائیں', 'بتاؤ', 'بتانا', 'دکھائیں', 'دکھاؤ', 'دیکھیں', 'دیکھو', 'چیک', 'معلومات', 'تفصیلات', 'تفصیل', 'کیا', 'ہے', 'ہیں', 'تھا', 'تھی', 'تھے', 'فیس', 'چالان', 'واجبات', 'بقایا', 'رقم', 'روپے', 'جمع', 'حاضری', 'ریکارڈ', 'داخلہ', 'کرنا', 'کریں', 'کرو', 'کر', 'صرف', 'نہیں', 'نہ', 'کونسا', 'کونسی', 'کونسے', 'کون', 'کس', 'کسکی', 'کسکا', 'کسکے', 'کہاں', 'کب', 'کیوں'
    ]);

    if (nameText.length >= 2 && !domainQueryWithoutStudent) {
      const nameWords = nameText.toLowerCase().split(/\s+/).filter(Boolean);
      const allDomainWords = nameWords.length > 0 && nameWords.every(w => DOMAIN_OP_WORDS.has(w));
      if (!allDomainWords && !CLASS_CATALOG[nameText.toLowerCase()] && !/^(student|students|class|classes|section|sections|school|saas|growth|strategy|diary|lesson|paper|exam|codebase|audit|search|find|batao|btao|details|detail|record|records|kitne|kitny|kitni|kitna|ktn|strength|live|current|active|wise|list|roster|names|do|dein|dikhao|bhejo|uska|iski|uski|unka|count|total|tadaad|historical|database|breakdown|boys|girls|larke|larki|larkiyan|male|female|gender|jins|mulazmeen|mulazmin|bhai|yaar|janab|sir|aaj|today|aj|aaye|aye|present|absent|summary|rate|collection|recovery|fee|fees|hazri|attendance|result|marks|unpaid|defaulters|defaulter|ni|nahi|no|na|just|sirf|only|mujhe|mujhy|mera|meri|mere|matlab|maqsad|baary|bare|janna|admission|dakhla|karna|kro|karo|gr|number|num|confirm|receipt|concession|wapas|dobara|bas|tha|thi|the|hoga|hogi)$/i.test(nameText)) {
        if (!gr_number || !nameText.toUpperCase().includes(gr_number)) {
          student_name = nameText;
        }
      }
    }

    // Dedicated Urdu Script Entity Parsing
    if (/[\u0600-\u06FF]/.test(raw)) {
      const cleanUrdu = raw.replace(/[.,!?;:()،؟\u060C\u061F]/g, ' ').trim();
      const urduWords = cleanUrdu.split(/\s+/).filter(Boolean);
      const remainingUrdu = urduWords.filter(w => !DOMAIN_OP_WORDS.has(w));
      if (remainingUrdu.length > 0 && remainingUrdu.length <= 4) {
        let urduName = remainingUrdu.join(' ');
        urduName = urduName
          .replace(/ہانیہ/g, 'Hania')
          .replace(/نوید/g, 'Naveed')
          .replace(/علی/g, 'Ali')
          .replace(/فاطمہ/g, 'Fatima')
          .replace(/احمد/g, 'Ahmed')
          .replace(/زین/g, 'Zain')
          .replace(/مہنور/g, 'Mahnoor');
        student_name = urduName;
      } else {
        student_name = null;
      }
    }

    // Structural entity span prioritization for multi-line / segmented input
    if (structuralSpans.entitySpans.length > 0) {
      for (const entLine of structuralSpans.entitySpans) {
        const cleanEnt = entLine.replace(/^(?:student\s*name|candidate\s*name|student(?:\s*ka\s*naam)?|naam|نام)\s*[:=–-]?\s*/i, '').trim();
        const entWords = cleanEnt.toLowerCase().split(/\s+/).filter(Boolean);
        const hasCommandToken = entWords.some(w => DOMAIN_OP_WORDS.has(w) || /^(?:is|iski|student|details|detail|record|records|batao|btao|dikhao)$/i.test(w));
        if (cleanEnt.length >= 2 && !hasCommandToken && !CLASS_CATALOG[cleanEnt.toLowerCase()]) {
          student_name = cleanEnt;
          break;
        }
      }
    }

    // Command Span and Command Token Person Protection (JARVIS 4.4: COMMAND_AS_PERSON_ENTITY = 0)
    if (student_name) {
      const sLowerCheck = student_name.toLowerCase();
      const isCommandPhrase = (
        /\b(?:details|detail|record|records|profile|btao|batao|dikhao|check|dein|do|bhejo|janna|poochna)\b/i.test(sLowerCheck) ||
        /\b(?:is\s*student|student\s*ki|ki\s*details|student\s*details)\b/i.test(sLowerCheck)
      );
      if (isCommandPhrase || structuralSpans.commandSpans.some(cs => cs.toLowerCase() === sLowerCheck || cs.toLowerCase().startsWith(sLowerCheck))) {
        student_name = null;
      }
    }

    // Context resolution
    const hasPronounRef = /\b(iski|iska|iske|unka|unki|unke|us\s*ka|us\s*ki|us\s*ke|iss\s*ka|iss\s*ki|iss\s*ke)\b/i.test(sLower);
    const hasClassContextRef = /\b(is\s*class|iss\s*class|same\s*class)\b/i.test(sLower);
    const activeContextStudent = context.currentStudent || context.lastStudent || null;
    const activeContextClass = context.currentClass || context.lastClass || null;

    let intent = null;

    if (isAdmissionCapability) {
      intent = 'admission.capability';
      student_name = null;
      if (context) {
        delete context.currentStudent;
        delete context.lastStudent;
      }
    } else if (isAdmissionStart) {
      intent = 'admission.start';
      student_name = null;
      if (context) {
        delete context.currentStudent;
        delete context.lastStudent;
      }
    } else if (isDefaulterQuery) {
      intent = 'school.get_fee_defaulters';
    } else if (isTeacherQuery) {
      intent = 'school.get_teacher_count';
    } else if (isStaffQuery) {
      intent = 'school.get_staff_count';
    } else if (isClassesListQuery) {
      intent = 'school.get_classes_list';
    } else if (isClassWise) {
      intent = 'school.get_class_strength';
    } else if (isExplicitSearch && (student_name || gr_number || father_name)) {
      intent = 'school.search_student';
    } else if ((class_name || (activeContextClass && hasClassContextRef)) && /\b(list|roster|all\s+students|tamam\s+bachay|names|naam|kon\s+kon|students\s+ki\s+list|students|bachay)\b/i.test(sLower) && !/\b(strength|tadaad|count|kitn[eyia]|ktn|how\s+many)\b/i.test(sLower)) {
      intent = 'school.get_class_students';
    } else if (class_name && (isStudentStrengthQuery || /\b(mein\s+kitn[eyia]|kitn[eyia]\s+students|kitn[eyia]\s+bachay|students\s+hain|bachay\s+hain)\b/i.test(sLower))) {
      intent = 'school.get_class_strength';
    } else if (isFeeQuery) {
      if (student_name || gr_number || father_name || roll_number || (hasPronounRef && activeContextStudent)) {
        intent = 'school.get_student_fee';
      } else if (class_name || hasClassContextRef || (activeContextClass && /(is\s*class|class)/i.test(sLower))) {
        intent = 'school.get_class_fee_summary';
      } else {
        intent = 'school.get_fee_summary';
      }
    } else if (isAttendanceQuery) {
      if (student_name || gr_number || father_name || roll_number || (hasPronounRef && activeContextStudent && !hasClassContextRef)) {
        intent = 'school.get_student_attendance';
      } else if (class_name || hasClassContextRef || (activeContextClass && /(is\s*class|class)/i.test(sLower))) {
        intent = 'school.get_class_attendance';
      } else {
        intent = 'school.get_attendance';
      }
    } else if (isResultQuery) {
      if (student_name || gr_number || father_name || roll_number || (hasPronounRef && activeContextStudent)) {
        intent = 'school.get_student_result';
      } else if (class_name || hasClassContextRef || activeContextClass) {
        intent = 'school.get_class_result_summary';
      } else {
        intent = 'school.get_class_result_summary';
      }
    } else if (isTimetableQuery) {
      intent = 'school.get_timetable';
    } else if (isProfileQuery) {
      intent = 'school.get_student_profile';
    } else if (student_name || gr_number || father_name) {
      intent = 'school.search_student';
    } else if (isStudentStrengthQuery) {
      intent = 'school.get_students_count';
    } else if (class_name) {
      intent = 'school.get_class_strength';
    } else {
      intent = 'school.get_students_count';
    }

    const candidateTokens = raw
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 0);

    return {
      raw_query: raw,
      rawQuery: raw,
      normalized_query: sLower,
      intent,
      student_name,
      studentName: student_name,
      father_name,
      fatherName: father_name,
      class_name,
      className: class_name,
      class_constraint: class_name,
      section,
      section_constraint: section,
      gr_number,
      grNumber: gr_number,
      gr_constraint: gr_number,
      roll_number,
      rollNumber: roll_number,
      roll_constraint: roll_number,
      candidate_person_tokens: candidateTokens,
      requested_fields,
      confidence: student_name ? 0.95 : (class_name ? 0.85 : 0.7),
      unresolved_tokens: []
    };
  }
}

export class EntityExtractor {
  static parseStructuredQuery(input, context = {}) {
    return StudentQueryParser.parse(input, context);
  }

  static extractStudentSearchEntity(input) {
    const parsed = StudentQueryParser.parse(input);
    return {
      success: Boolean(parsed.student_name || parsed.gr_number),
      student_name: parsed.student_name,
      father_name: parsed.father_name,
      class_name: parsed.class_name,
      gr_number: parsed.gr_number,
      entities: parsed
    };
  }

  static extractFeeQueryEntity(input) {
    const parsed = StudentQueryParser.parse(input);
    if (parsed.intent === 'school.get_fee_defaulters') {
      return { scope: 'defaulters', type: 'school.get_fee_defaulters', parsed };
    }
    if (parsed.student_name || parsed.gr_number || parsed.father_name) {
      return {
        scope: 'individual',
        personName: parsed.student_name,
        fatherName: parsed.father_name,
        className: parsed.class_name,
        grNumber: parsed.gr_number,
        type: 'school.get_student_fee',
        parsed
      };
    }
    if (parsed.class_name) {
      return {
        scope: 'class',
        className: parsed.class_name,
        type: 'school.get_class_fee_summary',
        parsed
      };
    }
    return { scope: 'school', type: 'school.get_fee_summary', parsed };
  }

  static extractPersonName(input) {
    const parsed = StudentQueryParser.parse(input);
    return parsed.student_name || null;
  }

  static extractClassName(input) {
    const parsed = StudentQueryParser.parse(input);
    return parsed.class_name || null;
  }

  static extractExamAndSubjectEntity(input) {
    const parsed = StudentQueryParser.parse(input);
    const s = String(input || '').toLowerCase();

    let examType = null;
    if (/(mid\s*term|midterm)/i.test(s)) examType = 'Mid-Term';
    else if (/(final\s*term|annual|final)/i.test(s)) examType = 'Final';
    else if (/(half\s*year|halfyear)/i.test(s)) examType = 'Half-Year';
    else if (/(monthly|test)/i.test(s)) examType = 'Monthly';

    let subject = null;
    const subMatch = s.match(/\b(english|urdu|math|mathematics|science|general science|islamiat|islamiyat|computer|physics|chemistry|biology|social studies|pak studies)\b/i);
    if (subMatch) {
      subject = subMatch[1];
    }

    return {
      scope: parsed.student_name ? 'individual' : (parsed.class_name ? 'class' : 'school'),
      personName: parsed.student_name,
      className: parsed.class_name,
      examType,
      subject,
      parsed
    };
  }

  static extractTimetableEntity(input) {
    const parsed = StudentQueryParser.parse(input);
    const s = String(input || '').toLowerCase();

    let day = null;
    const dayMatch = s.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|somwar|mangal|budh|jumeraat|juma|hafta|itwar)\b/i);
    if (dayMatch) {
      const dayMap = {
        'somwar': 'Monday', 'mangal': 'Tuesday', 'budh': 'Wednesday', 'jumeraat': 'Thursday',
        'juma': 'Friday', 'hafta': 'Saturday', 'itwar': 'Sunday'
      };
      day = dayMap[dayMatch[1].toLowerCase()] || dayMatch[1];
    }

    if (/(aaj|today)/i.test(s)) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      day = days[new Date().getDay()];
    } else if (/(kal|tomorrow)/i.test(s)) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      day = days[(new Date().getDay() + 1) % 7];
    }

    return {
      className: parsed.class_name,
      teacherName: parsed.student_name,
      day,
      parsed
    };
  }

  static extractDateEntity(input) {
    const s = String(input || '').toLowerCase();
    const today = new Date().toISOString().split('T')[0];

    if (/(aaj|today|آج)/i.test(s)) {
      return { date: today, label: 'today' };
    }
    if (/(kal|yesterday|گزشتہ\s*کل)/i.test(s) && /(guzra|guzri|beeta|yesterday)/i.test(s)) {
      const y = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      return { date: y, label: 'yesterday' };
    }
    const match = s.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (match) {
      return { date: match[1], label: 'specific_date' };
    }
    return { date: null, label: 'default' };
  }

  static extractGoogleSearchQuery(input) {
    const raw = String(input || '').trim().replace(/[.?!;:]+$/, '');
    const googleMatch = raw.match(/(?:google\s*pe\s+(.+?)\s+search\s*karo|search\s+(.+?)\s+on\s*google|google\s*search\s+(.+)|google\s*pe\s+search\s*karo\s+(.+))/i);
    if (googleMatch) {
      const q = (googleMatch[1] || googleMatch[2] || googleMatch[3] || googleMatch[4] || '').trim();
      return q ? { success: true, query: q } : { success: false, query: null };
    }
    return { success: false, query: null };
  }

  static validateStudentName(name) {
    if (!name || typeof name !== 'string') {
      return { valid: false, reason: "Name is empty" };
    }
    const clean = name.trim();
    if (clean.length < 2 || clean.length > 50) {
      return { valid: false, reason: `Invalid name length (${clean.length})` };
    }

    const forbiddenTokens = [
      'school', 'saas', 'database', 'system', 'search', 'karo', 'dhundo', 'dhoondo',
      'batao', 'dikhao', 'check', 'class', 'roll', 'number', 'gr', 'record',
      'information', 'info', 'mein', 'aur', 'iski', 'uski', 'find', 'lookup',
      'talib', 'ilm', 'student', 'students', 'fee', 'fees', 'pending', 'dues',
      'total', 'kitni', 'kitne', 'aaj', 'today', 'attendance'
    ];

    const words = clean.toLowerCase().split(/\s+/);
    for (const w of words) {
      if (forbiddenTokens.includes(w)) {
        return { valid: false, reason: `Extracted entity contains non-name token: "${w}"` };
      }
    }

    const validCharacters = /^[\p{L}\p{N}\s.'-]+$/u;
    if (!validCharacters.test(clean)) {
      return { valid: false, reason: "Extracted entity contains invalid characters" };
    }

    return { valid: true };
  }
}

export const entityExtractor = new EntityExtractor();
