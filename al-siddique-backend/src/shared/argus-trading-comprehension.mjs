/**
 * JARVIS ARGUS 7.2 — Trading Comprehension Engine
 *
 * Understanding-first conversational trading intelligence.
 * Evaluates meaning and intent BEFORE performing market analysis.
 *
 * Supports:
 * - English
 * - Roman Urdu
 * - Urdu Script
 * - Mixed Language
 * - Typo-Rich WhatsApp Language
 *
 * INVARIANTS:
 * - Understand before response
 * - CURRENT_EXPLICIT_INTENT > OLD_MARKET_MISSION
 * - REAL_MONEY_AUTONOMOUS_EXECUTION = 0
 */

export const TRADING_HORIZONS = {
  SCALP: { id: 'SCALP', label: 'Scalp', timeframes: ['M1', 'M5', 'M15'], typicalHold: '5–30 minutes' },
  SESSION: { id: 'SESSION', label: 'Session Trade', timeframes: ['M15', 'H1'], typicalHold: '1–4 hours' },
  INTRADAY: { id: 'INTRADAY', label: 'Intraday', timeframes: ['M15', 'H1'], typicalHold: '2–8 hours' },
  ONE_DAY: { id: 'ONE_DAY', label: 'One Day', timeframes: ['H1', 'H4'], typicalHold: 'Same day' },
  MULTI_DAY: { id: 'MULTI_DAY', label: 'Multi-Day / Swing', timeframes: ['H4', 'D1'], typicalHold: '2–5 days' },
  SWING: { id: 'SWING', label: 'Swing', timeframes: ['H4', 'D1'], typicalHold: '2–7 days' },
  WEEKLY_OUTLOOK: { id: 'WEEKLY_OUTLOOK', label: 'Weekly Outlook', timeframes: ['D1', 'W1'], typicalHold: '5–10 days' }
};

export const USER_GOALS = {
  MARKET_READ: 'MARKET_READ',
  SETUP_REQUEST: 'SETUP_REQUEST',
  SCALP_REQUEST: 'SCALP_REQUEST',
  INTRADAY_REQUEST: 'INTRADAY_REQUEST',
  SWING_REQUEST: 'SWING_REQUEST',
  WEEKLY_OUTLOOK: 'WEEKLY_OUTLOOK',
  LEVELS_REQUEST: 'LEVELS_REQUEST',
  FUNDAMENTAL_ANALYSIS: 'FUNDAMENTAL_ANALYSIS',
  TECHNICAL_ANALYSIS: 'TECHNICAL_ANALYSIS',
  POSITION_DECLARATION: 'POSITION_DECLARATION',
  POSITION_REVIEW: 'POSITION_REVIEW',
  POSITION_EXIT_REVIEW: 'POSITION_EXIT_REVIEW',
  MISSION_UPDATE: 'MISSION_UPDATE',
  NEWS_RISK: 'NEWS_RISK',
  STRATEGY_EXPLANATION: 'STRATEGY_EXPLANATION',
  CONDITIONAL_SCENARIO: 'CONDITIONAL_SCENARIO',

  // Backward-compatible aliases for 7.1 suites:
  WANTS_ENTRY: 'SETUP_REQUEST',
  WANTS_SCALP: 'SCALP_REQUEST',
  WANTS_INTRADAY: 'INTRADAY_REQUEST',
  WANTS_FULL_ANALYSIS: 'MARKET_READ',
  WANTS_POSITION_REVIEW: 'POSITION_REVIEW',
  WANTS_EXIT_DECISION: 'POSITION_EXIT_REVIEW',
  WANTS_SL_ADVICE: 'POSITION_REVIEW',
  WANTS_LEVELS: 'LEVELS_REQUEST',
  WANTS_NEWS: 'NEWS_RISK',
  WANTS_WEEKLY_OUTLOOK: 'WEEKLY_OUTLOOK',
  WANTS_CONDITIONAL: 'CONDITIONAL_SCENARIO',
  WANTS_COMPARISON: 'TECHNICAL_ANALYSIS',
  WANTS_MISSION_CLOSE: 'MISSION_UPDATE',
  WANTS_POSITION_DECLARE: 'POSITION_DECLARATION',
  GENERAL_MARKET_QUESTION: 'MARKET_READ'
};

export class TradingComprehension {
  constructor() {
    this.name = 'ARGUS_Trading_Comprehension_7_2';
  }

  detectLanguage(text = '') {
    const raw = String(text);
    const hasUrdu = /[\u0600-\u06FF]/.test(raw);
    const hasLatin = /[a-zA-Z]/.test(raw);
    if (hasUrdu && hasLatin) return 'MIXED';
    if (hasUrdu) return 'URDU_SCRIPT';
    if (/\b(?:kro|karo|btao|batao|mujhy|mujhe|aj|aaj|liye|le\s*li|li\s*hai|kidhar|chahiye|chahye|khatam|band|rha|rhi|rhe|mil|hai|hoon|kya|karun|karna|dekho|btao|bataen)\b/i.test(raw)) {
      return 'ROMAN_URDU';
    }
    return 'ENGLISH';
  }

  normalize(text = '') {
    return String(text)
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  parse(userQuery = '', options = {}) {
    const raw = String(userQuery);
    const normalized = this.normalize(raw);
    const lower = normalized.toLowerCase();
    const language = options.language || this.detectLanguage(raw);

    const asset = this._extractAsset(lower, raw);
    const requestedHorizons = this._classifyHorizons(lower, raw);
    const requestedStyle = this._classifyStyle(lower, raw);
    const requestedSession = this._extractSession(lower, raw);
    const requestedDuration = this._extractDuration(lower);
    const requestedDate = this._extractDate(lower, raw);
    const directionIfKnown = this._extractDirection(lower, raw);
    const entryIfKnown = this._extractPrice(lower, raw);
    const slIfKnown = this._extractSL(lower, raw);

    let userGoal = USER_GOALS.MARKET_READ;
    let confidence = 0.85;
    let openPositionDeclared = false;
    let wantsPositionReview = false;
    let wantsExitDecision = false;
    let wantsEntry = false;
    let wantsFullAnalysis = false;
    const ambiguities = [];
    const explicitConstraints = {};

    // 1. Mission Update / Close Detection
    if (/\b(?:close\s*(?:market\s*)?task|close\s*mission|band\s*karo|reset\s*mission|khatam|clear\s*mission)\b/i.test(lower) ||
        /مارکیٹ\s*ٹاسک\s*بند|مشن\s*ختم/.test(raw)) {
      userGoal = USER_GOALS.MISSION_UPDATE;
      confidence = 0.95;
    }
    // 1b. Conditional Scenario Detection ("agar 2900 break ho to kya karun?", "agar 4535 break ho to")
    else if (/\b(?:agar|if|suppose)\b.*?\b(?:break|cross|tote|toote|hold|retest|touches?)\b/i.test(lower) ||
             /اگر.*?(?:بریک|ٹوٹے|کراس)/.test(raw)) {
      userGoal = USER_GOALS.CONDITIONAL_SCENARIO;
      confidence = 0.95;
    }
    // 2. Position Declaration Detection ("maine buy le li hai", "position le li", etc.)
    else if (this._isPositionDeclaration(lower, raw)) {
      userGoal = USER_GOALS.POSITION_DECLARATION;
      openPositionDeclared = true;
      confidence = 0.92;
      if (entryIfKnown) explicitConstraints.declaredEntry = entryIfKnown;
      if (slIfKnown) explicitConstraints.declaredSL = slIfKnown;
      if (directionIfKnown) explicitConstraints.direction = directionIfKnown;
    }
    // 3. Position Exit Review ("exit kab karun", "nikal jaun?")
    else if (this._isExitDecision(lower, raw)) {
      userGoal = USER_GOALS.POSITION_EXIT_REVIEW;
      wantsExitDecision = true;
      wantsPositionReview = true;
      confidence = 0.90;
    }
    // 4. Position Review / Active Position Health Check ("position abhi valid hai?", "ab kya karun", "SL shift karna chahiye?")
    else if (this._isPositionReview(lower, raw)) {
      userGoal = USER_GOALS.POSITION_REVIEW;
      wantsPositionReview = true;
      confidence = 0.90;
    }
    // 5. News & Macro Risk Query
    else if (/\b(?:news\s*risk|event\s*risk|news\s*kya\s*hai|upcoming\s*news|economic\s*calendar|news\s*k[eay]?\s*baad|cpi|nfp|fomc)\b/i.test(lower) ||
             /نیوز\s*رسک|خبروں\s*کا\s*رسک/.test(raw)) {
      userGoal = USER_GOALS.NEWS_RISK;
      confidence = 0.90;
    }
    // 6. Strategy Explanation Query
    else if (/\b(?:explain\s*strategy|how\s*does\s*(?:the\s*)?strategy\s*work|strategy\s*(?:kaise|kya\s*hai)|tell\s*me\s*about\s*the\s*rules)\b/i.test(lower)) {
      userGoal = USER_GOALS.STRATEGY_EXPLANATION;
      confidence = 0.88;
    }
    // 7. Levels Only Request
    else if (/\b(?:levels?\b|support\s*(?:aur|and)?\s*resistance|key\s*levels?)\b/i.test(lower) &&
             !/\b(?:setup|full|deep|analysis|entry|scalp|intraday|trade)\b/i.test(lower) ||
             /کی\s*لیولز|صرف\s*لیولز/.test(raw)) {
      userGoal = USER_GOALS.LEVELS_REQUEST;
      confidence = 0.88;
    }
    // 8. Weekly Outlook
    else if (requestedHorizons.includes('WEEKLY_OUTLOOK') || /\b(?:weekly|hafte\s*ka|week\s*ahead|hafta\s*war)\b/i.test(lower) || /ہفتہ\s*وار/.test(raw)) {
      userGoal = USER_GOALS.WEEKLY_OUTLOOK;
      wantsFullAnalysis = true;
      confidence = 0.90;
    }
    // 9. Scalp Request
    else if (requestedHorizons.includes('SCALP')) {
      userGoal = USER_GOALS.SCALP_REQUEST;
      wantsEntry = true;
      confidence = 0.90;
    }
    // 10. Intraday Request
    else if (requestedHorizons.includes('INTRADAY') && !/\b(?:deep\s*analysis|full\s*(?:deep\s*)?analysis|mukammal|deeply\s*analysis)\b/i.test(lower)) {
      userGoal = USER_GOALS.INTRADAY_REQUEST;
      wantsEntry = true;
      confidence = 0.88;
    }
    // 11. Swing Request
    else if (requestedHorizons.includes('SWING') || requestedHorizons.includes('MULTI_DAY')) {
      userGoal = USER_GOALS.SWING_REQUEST;
      wantsEntry = true;
      confidence = 0.88;
    }
    // 12. Setup Request ("mujhy gold ka setup do", "trade do", "entry point exit point sl btao")
    else if (/\b(?:setup|signal|entry\s*point|exit\s*point|1\s*position\s*setup|position\s*setup|trade\s*setup)\b/i.test(lower) ||
             /سیٹ\s*اپ|ٹریڈ\s*سیٹ\s*اپ/.test(raw)) {
      userGoal = USER_GOALS.SETUP_REQUEST;
      wantsEntry = true;
      if (/\b(?:deep|deeply|full|mukammal)\b/i.test(lower)) wantsFullAnalysis = true;
      if (requestedHorizons.length === 0) requestedHorizons.push('INTRADAY');
      confidence = 0.90;
    }
    // 13. Deep Market Read / Comprehensive Analysis
    else if (/\b(?:deep\s*analysis|full\s*(?:deep\s*)?analysis|mukammal|comprehensive|puri\s*analysis|deeply\s*analysis)\b/i.test(lower) ||
             /مکمل\s*تجزیہ|گہرا\s*تجزیہ/.test(raw)) {
      userGoal = USER_GOALS.MARKET_READ;
      wantsFullAnalysis = true;
      wantsEntry = true;
      if (requestedHorizons.length === 0) {
        requestedHorizons.push('INTRADAY', 'ONE_DAY');
      }
      confidence = 0.90;
    }
    // 14. Default to General Market Read
    else {
      userGoal = USER_GOALS.MARKET_READ;
      wantsFullAnalysis = true;
      if (requestedHorizons.length === 0) requestedHorizons.push('INTRADAY');
      confidence = 0.80;
    }

    // Direction hint extraction
    const finalDirection = directionIfKnown || this._extractDirectionHint(lower, raw);

    const primaryHorizon = requestedHorizons[0] || 'INTRADAY';
    const requestedDepth = wantsFullAnalysis || /\b(?:deep|deeply|full|detail)\b/i.test(lower) ? 'DEEP' : 'STANDARD';

    // Position state inference
    let positionState = 'NONE';
    if (openPositionDeclared) positionState = 'DECLARED_ACTIVE';
    else if (wantsPositionReview || wantsExitDecision) positionState = 'UNDER_REVIEW';

    // Invariant: Explicit current intent outranks stale state
    const explicitIntentPriority = 10;

    return {
      // Phase 2 Canonical Contract Fields:
      rawText: raw,
      normalizedText: normalized,
      language,
      asset,
      userGoal,
      requestedHorizon: primaryHorizon,
      requestedHorizons,
      requestedStyle,
      temporalIntent: {
        requestedSession,
        requestedDate,
        requestedDuration,
        temporalMode: primaryHorizon === 'WEEKLY_OUTLOOK' ? 'FORWARD_SCENARIO' : 'CURRENT_SETUP'
      },
      positionState,
      referencedPosition: {
        direction: finalDirection,
        declaredEntry: entryIfKnown,
        stopLoss: slIfKnown
      },
      requestedDepth,
      explicitConstraints,
      confidence,
      ambiguities,
      explicitIntentPriority,

      // Backward-Compatible Aliases (for 7.1 suites & consumers):
      rawQuery: raw,
      wantsEntry,
      wantsFullAnalysis,
      wantsPositionReview,
      wantsExitDecision,
      openPositionDeclared,
      directionIfKnown: finalDirection,
      entryIfKnown,
      slIfKnown,
      requestedSession,
      requestedDate,
      requestedDuration,
      parsedAt: new Date().toISOString()
    };
  }

  _extractAsset(lower, raw = '') {
    const ASSET_PATTERNS = {
      XAUUSD: /\b(?:gold|xau|xauusd|sona|sone|sonay)\b/i,
      EURUSD: /\b(?:euro|eur|eurusd)\b/i,
      GBPUSD: /\b(?:pound|gbp|gbpusd|cable)\b/i,
      USDJPY: /\b(?:yen|jpy|usdjpy)\b/i,
      DXY:    /\b(?:dxy|dollar\s*index)\b/i,
      BTCUSD: /\b(?:btc|bitcoin)\b/i
    };
    if (/سونا|سونے|گولڈ/.test(raw)) return 'XAUUSD';
    if (/یورو/.test(raw)) return 'EURUSD';
    if (/پاؤنڈ/.test(raw)) return 'GBPUSD';
    if (/ین/.test(raw)) return 'USDJPY';
    if (/بٹ\s*کوائن/.test(raw)) return 'BTCUSD';

    for (const [sym, regex] of Object.entries(ASSET_PATTERNS)) {
      if (regex.test(lower)) return sym;
    }
    return 'XAUUSD';
  }

  _isPositionDeclaration(lower, raw = '') {
    return (
      /(?:maine?\s*(?:ye\s*)?(?:buy|sell|long|short|position)\s*(?:le\s*li|li|kiya|kr\s*li|kar\s*li)|position\s*(?:open(?:\s*hai)?|le\s*li(?:\s*hai)?|kiya|bna\s*li|bnai)|trade\s*(?:enter\s*kar\s*li(?:\s*hai)?|enter\s*ki|le\s*li(?:\s*hai)?)|entry\s*(?:le\s*li|lag\s*gai|ho\s*gai|ho\s*gayi|kiya)|i\s+(?:entered|bought|sold|opened|took)\b|(?:buy|sell|long|short)\s+kiya\s+\d)/i.test(lower) ||
      /(?:میں\s*نے\s*(?:پوزیشن|بائے|سیل|خرید|فروخت)\s*لے\s*لی\s*ہے|پوزیشن\s*اوپن\s*کی\s*ہے|ٹریڈ\s*اینٹر\s*کر\s*لی)/.test(raw)
    );
  }

  _isPositionReview(lower, raw = '') {
    return (
      /\b(?:ab\s*kya\s*karun|hold\s*(?:ya|or)\s*close|setup\s*(?:abhi\s*)?valid\s*hai|position\s*(?:abhi\s*)?valid|position\s*(?:kaisi|review|check)|trade\s*(?:kaisa|review)|thesis\s*(?:valid|check)|abhi\s*(?:kaisa|kya)\s*hai|monitor|review\s*(?:karo|kar\s*do|kro)|sl\s*shift)\b/i.test(lower) ||
      /(?:پوزیشن\s*(?:چیک|ریویو)|اب\s*کیا\s*کروں|دوبارہ\s*مارکیٹ\s*چیک|کیا\s*سیٹ\s*اپ\s*ابھی\s*ویلڈ\s*ہے|پوزیشن\s*ابھی\s*ویلڈ)/.test(raw)
    );
  }

  _isExitDecision(lower, raw = '') {
    return (
      /\b(?:exit\s*(?:ka\s*signal|karu|lun|lu|now|abhi)|nikal\s*jaun|band\s*karu|close\s*(?:karu|position|trade)|ab\s*exit|profit\s*(?:book|le\s*lun)|nikalna\s*(?:chahiye|chahye))\b/i.test(lower) ||
      /(?:اب\s*نکل\s*جاؤں|پوزیشن\s*بند\s*کروں|ایگزٹ\s*کروں)/.test(raw)
    );
  }

  _extractDirection(lower, raw = '') {
    if (/\b(?:buy|long|khareed|kharidi|kharid)\b/i.test(lower) || /خرید|بائے|لانگ/.test(raw)) return 'BUY';
    if (/\b(?:sell|short|bech|bechi|farokht)\b/i.test(lower) || /فروخت|سیل|شارٹ/.test(raw)) return 'SELL';
    return null;
  }

  _extractDirectionHint(lower, raw = '') {
    if (/\b(?:buy\s*(?:banti|karu|lun|karein)|bullish|long\s*entry)\b/i.test(lower) || /تیزی|بلش/.test(raw)) return 'BUY';
    if (/\b(?:sell\s*(?:banti|karu|lun|karein)|bearish|short\s*entry)\b/i.test(lower) || /مندی|بیئرش/.test(raw)) return 'SELL';
    return null;
  }

  _extractPrice(lower, raw = '') {
    const match = lower.match(/\b(\d{4}(?:\.\d{1,2})?)\b/);
    if (match) return parseFloat(match[1]);
    const dollarMatch = lower.match(/\$\s*(\d+(?:\.\d{1,2})?)/);
    if (dollarMatch) return parseFloat(dollarMatch[1]);
    return null;
  }

  _extractSL(lower, raw = '') {
    const slMatch = lower.match(/\b(?:sl|stop\s*loss|stoploss|سٹاپ\s*لاس)\s*[:=]?\s*(\d{4}(?:\.\d{1,2})?)\b/i);
    if (slMatch) return parseFloat(slMatch[1]);
    return null;
  }

  _classifyHorizons(lower, raw = '') {
    const horizons = [];
    if (/\b(?:scalp|scalping|quick\s*trade|jaldi|chhota\s*trade)\b/i.test(lower) || /اسکیلپ|فوری\s*ٹریڈ/.test(raw)) {
      horizons.push('SCALP');
    }
    if (/\b(?:intraday|intra[\s-]?day|din\s*(?:ka|ki|ke)\s*(?:andar|under))\b/i.test(lower) || /انٹرا\s*ڈے|آج\s*کے\s*دن/.test(raw)) {
      horizons.push('INTRADAY');
    }
    if (/\b(?:session\s*(?:trade|setup)|london\s*(?:session|trade)|ny\s*(?:session|trade)|asia\s*(?:session|trade))\b/i.test(lower) || /سیشن\s*سیٹ\s*اپ/.test(raw)) {
      horizons.push('SESSION');
    }
    if (/\b(?:swing|multi[\s-]?day|do\s*din|teen\s*din|hafte\s*ki)\b/i.test(lower) || /سوئنگ/.test(raw)) {
      horizons.push('SWING');
      horizons.push('MULTI_DAY');
    }
    if (/\b(?:weekly|hafta|haftay|hafte|week\s*(?:ka|ki|ke)|w1)\b/i.test(lower) || /ہفتہ\s*وار|ہفتے\s*کا/.test(raw)) {
      horizons.push('WEEKLY_OUTLOOK');
    }

    const durMin = this._extractDurationMinutes(lower);
    if (durMin !== null) {
      if (durMin <= 30) horizons.push('SCALP');
      else if (durMin <= 240) horizons.push('SESSION');
      else if (durMin <= 480) horizons.push('INTRADAY');
      else horizons.push('ONE_DAY');
    }

    if (/\b(?:aj\s*(?:ka|ke|ki|k\s*liye)|today|aaj)\b/i.test(lower) || /آج\s*کے\s*لیے/.test(raw)) {
      if (!horizons.includes('SCALP')) {
        horizons.push('INTRADAY');
        horizons.push('ONE_DAY');
      }
    }

    return [...new Set(horizons)];
  }

  _classifyStyle(lower, raw = '') {
    if (/\b(?:breakout|break\s*out)\b/i.test(lower) || /بریک\s*آؤٹ/.test(raw)) return 'BREAKOUT';
    if (/\b(?:reversal|ulta|palat)\b/i.test(lower) || /ریورسل/.test(raw)) return 'REVERSAL';
    if (/\b(?:retest|re[\s-]?test)\b/i.test(lower) || /ری\s*ٹیسٹ/.test(raw)) return 'RETEST';
    if (/\b(?:pullback|pull[\s-]?back|retrace)\b/i.test(lower)) return 'PULLBACK';
    if (/\b(?:sweep|liquidity\s*grab)\b/i.test(lower) || /سوئیپ/.test(raw)) return 'SWEEP';
    if (/\b(?:momentum|continuation)\b/i.test(lower)) return 'MOMENTUM';
    return null;
  }

  _extractSession(lower, raw = '') {
    if (/\b(?:london|ldn)\b/i.test(lower) || /لندن/.test(raw)) return 'LONDON';
    if (/\b(?:new\s*york|ny|newyork)\b/i.test(lower) || /نیویارک/.test(raw)) return 'NEW_YORK';
    if (/\b(?:asia|asian|tokyo)\b/i.test(lower) || /ایشیا/.test(raw)) return 'ASIA';
    if (/\b(?:overlap)\b/i.test(lower) || /اوورلیپ/.test(raw)) return 'LONDON_NY_OVERLAP';
    return null;
  }

  _extractDuration(lower) {
    const match = lower.match(/(\d+)\s*(?:ghant[eay]|hour|hr|minute|min)/i);
    if (match) {
      const val = parseInt(match[1]);
      const unit = match[0].toLowerCase();
      if (/min/i.test(unit)) return `${val} minutes`;
      return `${val} hours`;
    }
    return null;
  }

  _extractDurationMinutes(lower) {
    const match = lower.match(/(\d+)\s*(?:ghant[eay]|hour|hr|minute|min)/i);
    if (match) {
      const val = parseInt(match[1]);
      const unit = match[0].toLowerCase();
      if (/min/i.test(unit)) return val;
      return val * 60;
    }
    return null;
  }

  _extractDate(lower, raw = '') {
    if (/\b(?:monday|somwar|peer)\b/i.test(lower) || /پیر/.test(raw)) return 'MONDAY';
    if (/\b(?:tuesday|mangal)\b/i.test(lower) || /منگل/.test(raw)) return 'TUESDAY';
    if (/\b(?:wednesday|budh)\b/i.test(lower) || /بدھ/.test(raw)) return 'WEDNESDAY';
    if (/\b(?:thursday|jumeraat)\b/i.test(lower) || /جمعرات/.test(raw)) return 'THURSDAY';
    if (/\b(?:friday|jumma|juma)\b/i.test(lower) || /جمعہ/.test(raw)) return 'FRIDAY';
    if (/\b(?:kal|tomorrow)\b/i.test(lower) || /کل/.test(raw)) return 'TOMORROW';
    if (/\b(?:next\s*week|agle\s*hafte)\b/i.test(lower) || /اگلے\s*ہفتے/.test(raw)) return 'NEXT_WEEK';
    return null;
  }
}

export const tradingComprehension = new TradingComprehension();
