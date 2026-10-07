/**
 * CommonJS bridge for shared/argus-temporal-parser.mjs
 */
'use strict';

let _esmPromise = null;
async function getEsm() {
  if (!_esmPromise) {
    _esmPromise = import('./argus-temporal-parser.mjs');
  }
  return _esmPromise;
}

module.exports = {
  TEMPORAL_MODES: {
    CURRENT_SETUP: 'CURRENT_SETUP',
    FUTURE_SETUP: 'FUTURE_SETUP',
    SESSION_SETUP: 'SESSION_SETUP',
    POST_EVENT_SETUP: 'POST_EVENT_SETUP',
    CONDITIONAL_SETUP: 'CONDITIONAL_SETUP',
    MONITOR_UNTIL: 'MONITOR_UNTIL',
    MARKET_OUTLOOK: 'MARKET_OUTLOOK'
  },
  REQUESTED_TASKS: {
    SETUP: 'SETUP',
    OUTLOOK: 'OUTLOOK',
    LEVELS: 'LEVELS',
    MONITOR: 'MONITOR',
    DECISION: 'DECISION',
    RESEARCH: 'RESEARCH'
  },
  SESSIONS: {
    ASIA: 'ASIA',
    LONDON: 'LONDON',
    NEW_YORK: 'NEW_YORK',
    LONDON_NY_OVERLAP: 'LONDON_NY_OVERLAP',
    ANY: 'ANY'
  },
  parseTemporalMarketIntent: async (rawText, refDate) => {
    const esm = await getEsm();
    return esm.TemporalMarketParser.parse(rawText, refDate);
  },
  TemporalMarketParser: {
    parse: (rawText, refDate) => {
      // Synchronous fallback parser with identical core logic
      const text = String(rawText || '').trim();
      const lower = text.toLowerCase();
      const ref = new Date(refDate || Date.now());

      let asset = 'XAUUSD';
      if (/\b(?:eur|euro|eurusd)\b/i.test(lower)) asset = 'EURUSD';
      else if (/\b(?:gbp|pound|gbpusd)\b/i.test(lower)) asset = 'GBPUSD';
      else if (/\b(?:jpy|yen|usdjpy)\b/i.test(lower)) asset = 'USDJPY';
      else if (/\b(?:btc|bitcoin|btcusd)\b/i.test(lower)) asset = 'BTCUSD';
      else if (/\b(?:dollar|dxy|usd)\b/i.test(lower) && !/\b(?:gold|xau|xauusd)\b/i.test(lower)) asset = 'DXY';

      const DAY_MAP = {
        'monday': 1, 'mon': 1, 'peer': 1, 'پیر': 1,
        'tuesday': 2, 'tue': 2, 'mangal': 2, 'منگل': 2,
        'wednesday': 3, 'wed': 3, 'budh': 3, 'بدھ': 3,
        'thursday': 4, 'thu': 4, 'jumeraat': 4, 'jumerat': 4, 'جمعرات': 4,
        'friday': 5, 'fri': 5, 'jumma': 5, 'juma': 5, 'جمعہ': 5,
        'saturday': 6, 'sat': 6, 'hafta': 6, 'ہفتہ': 6,
        'sunday': 0, 'sun': 0, 'itwar': 0, 'اتوار': 0
      };
      const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

      let hasExplicitFutureDay = false;
      let hasRelativeDay = false;
      let hasSession = false;
      let hasEvent = false;
      let targetDay = null;
      let targetDate = null;
      let targetSession = 'ANY';
      let rawExpression = '';

      // 0. Next Week / End of Week
      if (/\b(?:next\s*week|aglay\s*hafte|agle\s*hafte)\b/i.test(lower) || /(?:اگلے\s*ہفتے)/.test(text)) {
        hasExplicitFutureDay = true;
        targetDay = 'NEXT_WEEK';
        const target = new Date(ref);
        target.setUTCDate(ref.getUTCDate() + 7);
        targetDate = target.toISOString().split('T')[0];
        rawExpression = 'next week';
      } else if (/\b(?:end\s*of\s*week|hafte\s*k\s*aakhir)\b/i.test(lower)) {
        hasExplicitFutureDay = true;
        targetDay = 'END_OF_WEEK';
        const target = new Date(ref);
        target.setUTCDate(ref.getUTCDate() + (5 - ref.getUTCDay() + 7) % 7);
        targetDate = target.toISOString().split('T')[0];
        rawExpression = 'end of week';
      }

      // 1. Explicit Day of Week
      if (!targetDay) {
        for (const [dayStr, dayIndex] of Object.entries(DAY_MAP)) {
          const dayRegex = new RegExp(`(?:^|\\b|\\s)${dayStr}(?:$|\\b|\\s|k\\s*liye|ke\\s*liye|ko)?`, 'i');
          if (dayRegex.test(lower) || text.includes(dayStr)) {
            hasExplicitFutureDay = true;
            targetDay = DAY_NAMES[dayIndex];
            rawExpression = dayStr;
            const currentDayIndex = ref.getUTCDay();
            let diff = dayIndex - currentDayIndex;
            if (diff < 0) diff += 7;
            const target = new Date(ref);
            target.setUTCDate(ref.getUTCDate() + diff);
            targetDate = target.toISOString().split('T')[0];
            break;
          }
        }
      }

      // 2. Relative Day (check day_after_tomorrow BEFORE tomorrow!)
      if (!targetDate) {
        if (/\b(?:parson|day\s*after\s*tomorrow)\b/i.test(lower) || /(?:پرسوں)/.test(text)) {
          hasRelativeDay = true;
          const target = new Date(ref);
          target.setUTCDate(ref.getUTCDate() + 2);
          targetDate = target.toISOString().split('T')[0];
          targetDay = 'DAY_AFTER_TOMORROW';
          rawExpression = 'day_after_tomorrow';
        } else if (/\b(?:kal|tomorrow|aglay\s*din|agle\s*din)\b/i.test(lower) || /(?:کل)/.test(text)) {
          hasRelativeDay = true;
          const target = new Date(ref);
          target.setUTCDate(ref.getUTCDate() + 1);
          targetDate = target.toISOString().split('T')[0];
          targetDay = 'TOMORROW';
          rawExpression = 'tomorrow';
        } else if (/\b(?:aaj|today|current)\b/i.test(lower) || /(?:آج)/.test(text)) {
          targetDate = ref.toISOString().split('T')[0];
          targetDay = DAY_NAMES[ref.getUTCDay()];
          rawExpression = 'today';
        }
      }

      // 3. Sessions
      if (/\b(?:overlap|london\s*ny\s*overlap)\b/i.test(lower)) {
        hasSession = true;
        targetSession = 'LONDON_NY_OVERLAP';
        rawExpression = 'London NY Overlap';
      } else if (/\b(?:london|ldn)\b/i.test(lower) || /(?:لندن)/.test(text)) {
        hasSession = true;
        targetSession = 'LONDON';
        rawExpression = rawExpression ? `${rawExpression} London` : 'London session';
      } else if (/\b(?:new\s*york|ny|ny\s*session|us\s*session)\b/i.test(lower) || /(?:نیویارک)/.test(text)) {
        hasSession = true;
        targetSession = 'NEW_YORK';
        rawExpression = rawExpression ? `${rawExpression} NY` : 'NY session';
      } else if (/\b(?:asia|tokyo|asian)\b/i.test(lower) || /(?:ایشیا)/.test(text)) {
        hasSession = true;
        targetSession = 'ASIA';
        rawExpression = rawExpression ? `${rawExpression} Asia` : 'Asia session';
      }

      // 4. Macro Events
      if (/\b(?:nfp|non\s*farm|cpi|inflation|fomc|fed\s*rate|powell|news|unemployment|claims|data)\b/i.test(lower) || /(?:این\s*ایف\s*پی|سی\s*پی\s*آئی|ایف\s*او\s*ایم\s*سی|نیوز|ڈیٹا)/.test(text)) {
        hasEvent = true;
        rawExpression = rawExpression ? `${rawExpression} (Macro Event)` : 'Macro Event';
      }

      if (!targetDate) {
        targetDate = ref.toISOString().split('T')[0];
        targetDay = DAY_NAMES[ref.getUTCDay()];
      }

      let requestedTask = 'SETUP';
      if (/(?:ابھی)/.test(text)) {
        requestedTask = 'SETUP';
      } else if (/\b(?:levels?|support|resistance)\b/i.test(lower) && /\b(?:sirf\s*levels|only\s*levels|koi\s*signal\s*na\s*do|trade\s*na\s*do)\b/i.test(lower)) {
        requestedTask = 'LEVELS';
      } else if (/\b(?:levels?|support|resistance|key\s*levels?|pivots?)\b/i.test(lower) && !/\b(?:setup|entry|buy|sell|trade)\b/i.test(lower)) {
        requestedTask = 'LEVELS';
      } else if (/\b(?:track|monitor|watch|record\s*paper)\b/i.test(lower)) {
        requestedTask = 'MONITOR';
      } else if (/\b(?:buy\s*karein\s*ya\s*wait|le\s*lun\s*ya\s*wait|sell\s*karein\s*ya\s*wait|wait\s*karein)\b/i.test(lower)) {
        requestedTask = 'DECISION';
      } else if (/\b(?:trade\s*mat\s*dena|signal\s*mat\s*dena|no\s*signals?|sirf\s*analysis|sirf\s*scenarios|order\s*place\s*mat|scene\s*kya\s*hai|kya\s*scene\s*hai|outlook|view|forecast|prediction|kya\s*(?:kr|kar)\s*s[ak]+ta\s*hai|kya\s*karega|kaisa\s*rahega|situation\s*kya\s*hai|structure\s*overview|macro\s*perspective|bias|kahan\s*tak\s*gir\s*sakta|kahan\s*jayegi|sentiment|what\s*do\s*you\s*think|kya\s*lagta\s*hai)\b/i.test(lower) || /(?:سین\s*کیا\s*ہے|کیا\s*کر\s*سکتا\s*ہے|صورتحال|آؤٹ\s*لک|منظر\s*نامہ|کہاں\s*جائے\s*گی)/.test(text)) {
        requestedTask = 'OUTLOOK';
      } else if (/\b(?:deep\s*analysis|gehra\s*jaiza|deep\s*research|full\s*research|research\s*report)\b/i.test(lower) && !/\b(?:setup|entry|signal)\b/i.test(lower)) {
        requestedTask = 'RESEARCH';
      }

      const requestedDepth = (
        /\b(?:deep\s*analysis|deep\s*research|deep|gehra\s*jaiza|gehri\s*research|mukammal\s*analysis|detailed\s*analysis|full\s*research)\b/i.test(lower) ||
        /(?:گہرا\s*تجزیہ|مکمل\s*تجزیہ)/.test(text)
      ) ? 'DEEP' : 'STANDARD';

      const requestedConfidence = (
        /\b(?:high\s*probability|high\s*conviction|tagra\s*setup|tagri\s*trade|best\s*setup|strong\s*setup|sure\s*setup|aala\s*setup|high\s*prob)\b/i.test(lower) ||
        /(?:مضبوط\s*سیٹ\s*اپ|بہترین\s*سیٹ\s*اپ)/.test(text)
      ) ? 'HIGH_PROBABILITY' : 'STANDARD';

      const conditionalLanguage = (
        /\b(?:agar|ager|if|in\s*case\s*of|under\s*what\s*criteria|what\s*condition|break\s*ho|retrace\s*bane|reject\s*kare|rejection\s*mile|bounce\s*kare|cross\s*kare|candle\s*close|support\s*hold|support\s*par|support\s*pe|drop\s*to|drops\s*to|retests?|sweep|liquidity\s*sweep)\b/i.test(lower) ||
        /(?:اگر|جب|بریک|ریٹریس|سپورٹ)/.test(text)
      );

      const isPureMonitoringWord = /\b(?:monitor|track|watch|nazar\s*rakh|dekhte\s*rah|keep\s*tracking|keep\s*an\s*eye|follow|alert\s*karna|bata\s*dena\s*jab|inform\s*karna)\b/i.test(lower) || /(?:مانیٹر|ٹریک|نظر\s*رکھو)/.test(text);
      const hasUntilBoundary = /\b(?:until|till|jab\s*tak|tak)\b/i.test(lower) || /(?:تک|جب\s*تک)/.test(text);
      const monitoringRequested = isPureMonitoringWord || (hasUntilBoundary && (/\b(?:dekho|batao|check|dekhna)\b/i.test(lower) || /(?:دیکھو|دیکھنا|بتاؤ)/.test(text)));

      const hasPostEventPhrase = /\b(?:after|post|k\s*baad|ke\s*baad|k\s*bad)\b/i.test(lower) || /(?:کے\s*بعد)/.test(text);

      let temporalMode = 'CURRENT_SETUP';
      if (monitoringRequested && (hasUntilBoundary || isPureMonitoringWord || conditionalLanguage || hasExplicitFutureDay || hasSession || hasEvent || /\bdekho|dekh\b/i.test(lower))) {
        temporalMode = 'MONITOR_UNTIL';
      } else if (hasEvent && hasPostEventPhrase) {
        temporalMode = 'POST_EVENT_SETUP';
      } else if (hasSession) {
        temporalMode = 'SESSION_SETUP';
      } else if (conditionalLanguage && !hasExplicitFutureDay && !hasRelativeDay) {
        temporalMode = 'CONDITIONAL_SETUP';
      } else if (requestedTask === 'OUTLOOK' || requestedTask === 'LEVELS' || requestedTask === 'RESEARCH') {
        temporalMode = 'MARKET_OUTLOOK';
      } else if (hasExplicitFutureDay || hasRelativeDay) {
        temporalMode = 'FUTURE_SETUP';
      } else if (/\b(?:abhi|now|current|is\s*waqt|iss\s*time|live|right\s*now)\b/i.test(lower) || /(?:ابھی)/.test(text)) {
        temporalMode = 'CURRENT_SETUP';
      }

      return {
        asset,
        requestedTask,
        temporalMode,
        targetDate,
        targetDay,
        targetSession,
        timezone: 'UTC',
        requestedDepth,
        requestedConfidence,
        monitoringRequested,
        conditionalLanguage,
        rawTemporalExpression: rawExpression || 'NOW',
        confidence: 0.95
      };
    }
  }
};
