/**
 * JARVIS 4.0 — Business Semantic Interpreter
 * 
 * Extracts high-level business concepts, financial transaction semantics,
 * and grammatical modality from natural language across Roman Urdu,
 * Urdu script, English, and mixed dialects.
 */

export class BusinessSemanticInterpreter {
  /**
   * Interpret natural language utterance into structured business semantics
   */
  static interpret(rawText, context = {}) {
    const text = String(rawText || '').trim();
    const lower = text.toLowerCase();

    const modality = this._detectModality(text, lower);
    const financial = this._extractFinancialSemantics(text, lower, modality);
    const academic = this._extractAcademicSemantics(text, lower, modality);
    const operational = this._extractOperationalSemantics(text, lower, modality);
    const openDomain = this._extractOpenDomainSemantics(text, lower);
    const publicInfo = this._extractPublicInfoSemantics(text, lower);

    return {
      rawText: text,
      modality, // 'QUERY' (Read) | 'COMMAND' (Write) | 'CONVERSATIONAL' | 'AMBIGUOUS'
      financial,
      academic,
      operational,
      openDomain,
      publicInfo,
      contextEntities: {
        activeStudent: context.activeStudent || null,
        activeCandidate: context.activeCandidate || null,
        activeClass: context.activeClass || null,
        lastIntent: context.lastIntent || null
      }
    };
  }

  /**
   * 1. Detect Modality (Query/Read vs Command/Write)
   * Prevents READ/WRITE confusion at the fundamental grammatical level.
   */
  static _detectModality(raw, lower) {
    // English imperative start
    if (/^(?:admit|enroll|register|onboard|record|mark|settle|post|clear|close)\b/i.test(lower)) {
      return 'COMMAND';
    }

    // Explicit Command Markers (Write / Action requests)
    const commandMarkers = [
      /\b(?:kar\s*do|kr\s*do|kardo|krdo|kar\s*dain|kar\s*dein|kardain|kardein|karo|karein|krn|krna|karlo|krlo|lo)\b/i,
      /\b(?:laga\s*do|lgado|lga\s*do|lagao|lagayein|lagaein|chala\s*do|bana\s*do|generate\s*kar\s*do|save\s*kar\s*do|post\s*kar\s*do)\b/i,
      /\b(?:clear\s*kar|close\s*kar|settle\s*kar|mark\s*kar|mark\s*karo|mark\s*karein|update\s*kar|submit\s*kar|pay\s*kar|jama\s*kar|bhar\s*do|enter\s*kar)\b/i,
      /\b(?:admit\s*kar|dakhil\s*kar|dakhla\s*karo|dakhla\s*kar|enroll\s*kar|show\s*krdo|show\s*kar\s*do)\b/i,
      /کر\s*دو|کر\s*دیں|کریں|کرو|لگا\s*دو|لگائیں|لگاؤ|بنا\s*دو|جمع\s*کر|ادا\s*کر|داخل\s*کر|مارک\s*کر|پیڈ\s*کر|درج\s*کر/
    ];

    // Explicit Query Markers (Read / Information requests)
    const queryMarkers = [
      /\b(?:kitn[aiy]|kitney|how\s*many|how\s*much|total|count|tadaad)\b/i,
      /\b(?:check\s*karo|check\s*karein|batao|btao|bata\s*do|dikhao|dikhayein|search|find|nikalo|status|report|summary|show|show\s*me)\b/i,
      /\b(?:hai\?|hain\?|kya\s*hai|kia\s*hai|kia\s*status|kya\s*status|clear\s*hai|paid\s*hai|hui\?|hua\?|aaye\?)\b/i,
      /\b(?:hai\s*kya|hai\s*kia|mil\s*gaye\?|aaye\s*hain\?|bache\s*hain\?|pending\s*hai\?)\b/i,
      /کتنے|کتنی|کتنا|تعداد|بتاؤ|بتائیں|دکھاؤ|کیا\s*ہے|چیک\s*کرو|ہے\؟/
    ];

    const hasCommand = commandMarkers.some(m => m.test(raw));
    const hasQuery = queryMarkers.some(m => m.test(raw));

    if (hasCommand && !hasQuery) return 'COMMAND';
    if (hasQuery && !hasCommand) return 'QUERY';

    // Disambiguation for collision cases (e.g. "fee kitni pending hai, clear kar do")
    if (hasCommand && hasQuery) {
      // If ends with a command imperative, the intent is execution/write
      if (/(?:kar\s*do|kr\s*do|kardo|krdo|dein|dain|karo|کر\s*دو|کردو|لگائیں|لگاؤ|laga\s*do|lgado|lga\s*do|lagao|lagayein|dal\s*do|bana\s*do|band\s*karo)\s*(?:please|plz|sir|bhai)?\s*[.!]?$/i.test(raw.trim())) {
        return 'COMMAND';
      }
      // If asking to inspect/check/show summary report
      if (/(?:check\s*karo|dikhao|dikhayein|batao|btao|summary|report)\b/i.test(raw)) {
        return 'QUERY';
      }
      return 'AMBIGUOUS';
    }

    // Default heuristics based on sentence structure
    if (raw.endsWith('?') || /\b(?:kya|kia|who|what|where|when|why|how)\b/i.test(lower)) {
      return 'QUERY';
    }

    if (/\b(?:hello|hi|salam|assalam|hey|adaab|shukriya|thanks|thank\s*you|kaun\s*ho)\b/i.test(lower)) {
      return 'CONVERSATIONAL';
    }

    return 'AMBIGUOUS';
  }

  /**
   * 2. Extract Financial Semantics
   */
  static _extractFinancialSemantics(raw, lower, modality) {
    // Guard against market queries colliding with school financial ledger
    const isMarketCandidate = (
      /\b(?:gold|xau|xauusd|sona|sone|sonay|forex|eurusd|gbpusd|dxy|dollar|crypto|btc|bitcoin|market|trading|trade\s*setup|trend|cpi)\b/i.test(lower) ||
      /سونا|سونے|گولڈ|مارکیٹ/i.test(raw)
    ) && !/\b(?:student|students|school|bachay|bachon|class|classes|dakhla|admission|gr\b|roll)\b/i.test(lower);

    if (isMarketCandidate) {
      return { isFinancial: false };
    }

    const isFinancialTopic = (
      /\b(?:fee|fees|fess|fe|challan|challans|voucher|vouchers|chalan|arrears|dues|outstanding|balance|payment|payments|hisab|hisaab|pese|paise|rupay|rupaye|raqam|pkr|rs|bill|billing|recovery|collection|cash|account|baqi|baki|baqaya|zero|adaigi|wasool|wasooli|jama|jamaa|ledger)\b/i.test(lower) ||
      /فیس|چالان|واجبات|بقایا|پیسے|روپے|رقم|ریکوری|وصولی|کیش|اکاؤنٹ|باقی|صفر|کھاتہ|لیجر/i.test(raw)
    );

    if (!isFinancialTopic) {
      return { isFinancial: false };
    }

    // Semantic: Cash already received by hand at school
    const cashReceivedSemantics = (
      /\b(?:cash|by\s*hand|naqad|hath\s*mein|hath\s*me|cash\s*in\s*hand|at\s*front\s*desk|nipta|niptao|mukao|wasool)\b/i.test(lower) ||
      /\b(?:pese\s*mil\s*(?:gaye|gye|chuke)|paise\s*mil\s*(?:gaye|gye)|cash\s*mil\s*(?:gaya|gya|chuka))\b/i.test(lower) ||
      /\b(?:receive\s*ho\s*(?:gaye|gai|gye|chuki)|le\s*li\s*hai|le\s*liye\s*hain|jama\s*ho\s*(?:gaye|chuke))\b/i.test(lower) ||
      /\b(?:aaye\s*hain|aa\s*gaye|aa\s*chuke|received|mil\s*chuki|mil\s*chuka)\b/i.test(lower) ||
      /نقد|کیش|پیسے\s*مل\s*گئے|وصول\s*ہو\s*گئے|لے\s*لیے|مل\s*چکی|مل\s*گئی|وصول\s*ہو\s*چکی|وصول/i.test(raw)
    );

    // Semantic: Ledger write / settlement requested
    const ledgerWriteRequested = (
      modality === 'COMMAND' &&
      (
        /\b(?:pay|submit|jama|jamaa|paid|clear|settle|close|post|mark|laga\s*do|dal\s*do|enter\s*(?:kar|karo|kr|karein|do)|enter|zero\s*kar|band\s*kr|band\s*karo|barabar|show\s*krdo|record|update|nipta|niptao|mukao|charha\s*do|charha)\b/i.test(lower) ||
        /\b(?:hisab\s*band|hisab\s*barabar|account\s*clear|baki\s*zero|remaining\s*zero|zero\s*show|kissa\s*mukao|chithi\s*nipta|chithi\s*niptao)\b/i.test(lower) ||
        /جمع|ادا|کلیئر|پوسٹ|مارک|سیٹل|بند\s*کر|پیڈ|زیرو|صفر|درج|برابر/i.test(raw)
      )
    );

    // Semantic: External gateway request (JazzCash, Card, Bank, Online portal)
    const isGatewayRequested = (
      /\b(?:jazzcash|easypaisa|bank|online\s*gateway|credit\s*card|debit\s*card|portal\s*pay|link\s*bhejo)\b/i.test(lower)
    );

    // Semantic: Amount extraction
    let extractedAmount = null;
    const amtMatch = raw.match(/\b(?:pkr|rs\.?|rupees|روپے)?\s*([0-9]{3,6})\b/i);
    if (amtMatch) {
      const p = Number(amtMatch[1]);
      if (p >= 100 && p <= 500000) extractedAmount = p;
    }

    // Semantic: Full vs Partial
    const isExplicitFull = /\b(?:poori|poora|full|all|tamam|sab|kul|complete)\b/i.test(lower) || /پوری|تمام|مکمل/i.test(raw);
    const isExplicitPartial = extractedAmount !== null && !isExplicitFull;

    // Semantic: Query for fee summary vs individual fee
    const isSummaryScope = (
      /\b(?:school\s*ki\s*(?:total|overall|collection|pending|fee)|total\s*collection|total\s*pending|fee\s*recovery|overall|all\s*students|kul\s*kitni|summary\s*report|collection\s*summary|challan\s*collect|recovery\s*percentage|kul\s*recovery|recovery\s*hisab)\b/i.test(lower) ||
      /مدرسہ|مدرسے|اسکول|مجموعی|کل\s*فیس|ریکوری/i.test(raw)
    ) && !/\b(?:iski|iska|uska|uski)\b/i.test(lower);

    return {
      isFinancial: true,
      cashReceived: cashReceivedSemantics,
      ledgerWriteRequested,
      isGatewayRequested,
      paymentMode: isGatewayRequested ? 'GATEWAY' : 'cash',
      paymentSource: isGatewayRequested ? 'ONLINE_GATEWAY' : 'MANUAL_SCHOOL_COLLECTION',
      amount: extractedAmount,
      isExplicitFull,
      isExplicitPartial,
      isSummaryScope,
      inferredAction: ledgerWriteRequested
        ? (isExplicitPartial ? 'RECORD_PARTIAL_PAYMENT' : 'RECORD_FULL_PAYMENT')
        : (isSummaryScope ? 'READ_FEE_SUMMARY' : 'READ_STUDENT_FEE')
    };
  }

  /**
   * 3. Extract Academic Semantics (Admissions, Classes, Exams)
   */
  static _extractAcademicSemantics(raw, lower, modality) {
    const isAdmission = (
      /\b(?:admission|admissions|admisn|dakhla|dakhlay|dakhil|enroll|enrollment|admit|onboard|candidate)\b/i.test(lower) ||
      /داخلہ|داخلے|داخل/i.test(raw)
    );

    const isClassQuery = (
      /\b(?:class|classes|grade|grades|jamaat|jamaatain)\b/i.test(lower) ||
      /کلاس|جماعت/i.test(raw) ||
      /\b(?:starter|mover|flyer|nursery|prep|pehli|doosri|teesri|chothi|panchween|chhati|saatween|aathween|pre\s*nine|hifaz)\b/i.test(lower) ||
      /\b(?:one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:blue|green|yellow|red)\b/i.test(lower) ||
      /ہفتم|ہشتم|پنجم|چہارم|سوم|دوم|اول/i.test(raw)
    );

    const admissionWriteRequested = isAdmission && (
      modality === 'COMMAND' ||
      /^(?:admit|enroll|register|onboard)\b/i.test(lower) ||
      /\b(?:create|confirm|naya|new|register|tiyar|tayyar|onboard|applicant|registry|form)\b/i.test(lower) ||
      /کنفرم|تیار|نیا\s*داخلہ/i.test(raw)
    );

    return {
      isAdmission,
      isClassQuery,
      admissionWriteRequested
    };
  }

  /**
   * 4. Extract Operational Semantics (Attendance, Staff, Student Search)
   */
  static _extractOperationalSemantics(raw, lower, modality) {
    const isAttendance = (
      /\b(?:attendance|present|absent|hazri|hazir|ghair\s*hazir|pohnche|mojudgi)\b/i.test(lower) ||
      /حاضری|حاضر|غیر\s*حاضر|پہنچے|موجودگی/i.test(raw)
    );

    const isAttendanceWrite = isAttendance &&
      !/\b(?:check|summary|report|status|dikhao|batao|kitne|how\s*many)\b/i.test(lower) &&
      !/رپورٹ|خلاصہ|دکھائیں|کتنے/i.test(raw) &&
      (
        modality === 'COMMAND' ||
        /\b(?:lagao|lagayein|lagaein|laga\s*do|mark\s*karo|mark\s*karein|mark\s*all|darj\s*karo|darj\s*farmayein|darj\s*karein|darj)\b/i.test(lower) ||
        /لگائیں|لگاؤ|درج\s*کر|درج\s*فرمائیں/i.test(raw)
      );

    const isStaff = (
      /\b(?:teacher|teachers|staff|faculty|headmaster|principal|peon|guard|asatza|asatiza)\b/i.test(lower) ||
      /اساتذہ|اسٹاف|عملہ|ٹیچرز|ٹیچر/i.test(raw)
    );

    const isStudentCount = (
      /\b(?:school\s*(?:mein|me|main|ki\s*total)|total\s*students|total\s*student\s*strength|student\s*body|headcount|enrolled\s*in\s*school|kul\s*kitne\s*talba|kul\s*kitne\s*bachay|dakhil\s*hain)\b/i.test(lower) ||
      /مدرسے\s*میں|مدرسہ\s*میں|اسکول\s*میں|کل\s*کتنے\s*بچے|طلباء\s*کی\s*کل\s*تعداد|بچوں\s*کی\s*کل\s*تعداد|زیر\s*تعلیم/i.test(raw)
    ) && !/\b(?:class|grade|jamaat)\b/i.test(lower) && !isStaff;

    const isStudentRoster = (
      /\b(?:student|students|bachay|bache|bachon|strength|headcount|enrolled|tadaad)\b/i.test(lower) ||
      /طلباء|طالب\s*علم|بچے|بچوں/i.test(raw)
    );

    const isStudentSearch = (
      /\b(?:search|find|dhoondo|check|talaash|record|profile|details)\b/i.test(lower) &&
      !isAttendance && !isStaff
    );

    return {
      isAttendance,
      isAttendanceWrite,
      isStaff,
      isStudentCount,
      isStudentRoster,
      isStudentSearch
    };
  }

  /**
   * 5. Extract Open Domain Semantics (ARGUS market, Browser, Desktop)
   */
  static _extractOpenDomainSemantics(raw, lower) {
    const isSchoolExplicit = (
      /\b(?:student|students|bachay|bachon|school|class|classes|teacher|teachers|staff|attendance|fee|fees|challan|challans|voucher|vouchers|dakhla|admission|admissions|session\s*2026|gr\b|roll\s*number)\b/i.test(lower) ||
      /اسکول|طلباء|طالب\s*علم|کلاس|اساتذہ|حاضری|فیس|چالان|داخلہ/i.test(raw)
    );

    const isMarket = !isSchoolExplicit && (
      /\b(?:gold|xau|xauusd|sona|sone|sonay|forex|fx|eurusd|euro|eur|gbpusd|pound|gbp|usdjpy|yen|jpy|dxy|dollar|usd|crude|oil|crypto|btc|bitcoin|eth|ethereum)\b/i.test(lower) ||
      /\b(?:market|trading|trade|setup|signal|signals|analysis|trend|levels|support|resistance|breakout|pullback|reversal|target|entry|stoploss|invalidation|bias|regime)\b/i.test(lower) ||
      /\b(?:bullish|bearish|long|short|buy\s*banta|sell\s*banta|buy|sell|le\s*lun|bech\s*dun|kidhar\s*ja\s*sakta|kya\s*ban\s*sakta|setup\s*do|signal\s*do|trend\s*batao|levels\s*do|rate)\b/i.test(lower) ||
      /\b(?:london\s*session|new\s*york\s*session|asian\s*session|cpi|fomc|nfp|inflation|interest\s*rate)\b/i.test(lower) ||
      /سونا|سونے|گولڈ|مارکیٹ|قیمت|تجزیہ|سیٹ\s*اپ|سگنل|رجحان|ڈالر|فاریکس|خرید|فروخت|سیل|بائے|لیولز|منظرنامہ|اسٹاپ\s*لاس|سٹاپ\s*لاس|انویلڈیشن|مومینٹم|سیشن/i.test(raw)
    );

    const isBrowser = (
      /\b(?:browse|google|website|search\s*online|webpage|open\s*url|download\s*pdf)\b/i.test(lower) ||
      /\b(?:google\s*pe|search\s*karo|internet\s*pe)\b/i.test(lower)
    );

    const isDesktop = (
      /\b(?:notepad|calculator|desktop|open\s*app|type\s*text|screen\s*state|window|print|printer|recipt|receipt)\b/i.test(lower) ||
      /پرنٹ|رسید/i.test(raw)
    );

    return {
      isMarket,
      isBrowser,
      isDesktop
    };
  }

  /**
   * 6. Extract Public Info Semantics (Timings, Location, Helpline)
   */
  static _extractPublicInfoSemantics(raw, lower) {
    const isMarketCandidate = (
      /\b(?:gold|xau|xauusd|sona|sone|sonay|forex|eurusd|gbpusd|dxy|dollar|crypto|btc|bitcoin|market|trading|trade|setup|pullback|entry|liquidity|levels?)\b/i.test(lower) ||
      /سونا|گولڈ|مارکیٹ/i.test(raw)
    );
    if (isMarketCandidate) return false;

    return (
      /\b(?:timing|timings|operating\s*hours|location|address|where\s*is|kahan|waqia|kidhar|helpline|(?:phone|contact|mobile)\s*number|school\s*ka\s*pata)\b/i.test(lower) ||
      /اوقات|کہاں|واقع|ہیلپ\s*لائن|(?:فون|رابطہ|موبائل)\s*نمبر|سکول\s*کا\s*پتہ/i.test(raw)
    );
  }
}
