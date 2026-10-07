/**
 * JARVIS ARGUS 6.9 — Canonical Temporal Market Intent Engine
 *
 * Parses conversational market queries across English, Roman Urdu, Urdu Script,
 * and mixed WhatsApp shorthand into structured TemporalMarketIntent objects.
 *
 * CORE INVARIANTS:
 * - A future temporal expression MUST NEVER be silently collapsed into a current-market query.
 * - CURRENT_NO_TRADE != FUTURE_NO_SETUP.
 * - ZERO FABRICATED SIGNALS OR DECORATIVE CONFIDENCE SCORES.
 */

'use strict';

export const TEMPORAL_MODES = {
  CURRENT_SETUP: 'CURRENT_SETUP',
  FUTURE_SETUP: 'FUTURE_SETUP',
  SESSION_SETUP: 'SESSION_SETUP',
  POST_EVENT_SETUP: 'POST_EVENT_SETUP',
  CONDITIONAL_SETUP: 'CONDITIONAL_SETUP',
  MONITOR_UNTIL: 'MONITOR_UNTIL',
  MARKET_OUTLOOK: 'MARKET_OUTLOOK'
};

export const REQUESTED_TASKS = {
  SETUP: 'SETUP',
  OUTLOOK: 'OUTLOOK',
  LEVELS: 'LEVELS',
  MONITOR: 'MONITOR',
  DECISION: 'DECISION',
  RESEARCH: 'RESEARCH'
};

export const SESSIONS = {
  ASIA: 'ASIA',
  LONDON: 'LONDON',
  NEW_YORK: 'NEW_YORK',
  LONDON_NY_OVERLAP: 'LONDON_NY_OVERLAP',
  ANY: 'ANY'
};

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

export const SYMBOL_MAP = {
  'gold': 'XAUUSD', 'xau': 'XAUUSD', 'xauusd': 'XAUUSD',
  'sona': 'XAUUSD', 'sone': 'XAUUSD', 'sonay': 'XAUUSD',
  'سونا': 'XAUUSD', 'سونے': 'XAUUSD', 'گولڈ': 'XAUUSD',
  'euro': 'EURUSD', 'eur': 'EURUSD', 'eurusd': 'EURUSD',
  'pound': 'GBPUSD', 'gbp': 'GBPUSD', 'gbpusd': 'GBPUSD',
  'yen': 'USDJPY', 'jpy': 'USDJPY', 'usdjpy': 'USDJPY',
  'dollar': 'DXY', 'dxy': 'DXY', 'usd': 'DXY',
  'bitcoin': 'BTCUSD', 'btc': 'BTCUSD', 'btcusd': 'BTCUSD'
};

export class TemporalMarketParser {
  /**
   * Parse inbound text into a validated TemporalMarketIntent
   * @param {string} rawText
   * @param {Date|string} [referenceDate]
   * @returns {Object} TemporalMarketIntent
   */
  static parse(rawText = '', referenceDate = new Date()) {
    const text = String(rawText || '').trim();
    const lower = text.toLowerCase();
    const refDate = new Date(referenceDate);

    // 1. Resolve Asset
    const asset = this.resolveAsset(lower);

    // 2. Resolve Temporal Clues
    const temporalInfo = this.extractTemporalClues(lower, text, refDate);

    // 3. Resolve Requested Task
    const requestedTask = this.resolveRequestedTask(lower, text);

    // 4. Resolve Depth & Quality
    const requestedDepth = (
      /\b(?:deep\s*analysis|deep\s*research|deep|gehra\s*jaiza|gehri\s*research|mukammal\s*analysis|detailed\s*analysis|full\s*research)\b/i.test(lower) ||
      /(?:گہرا\s*تجزیہ|مکمل\s*تجزیہ)/.test(text)
    ) ? 'DEEP' : 'STANDARD';

    const requestedConfidence = (
      /\b(?:high\s*probability|high\s*conviction|tagra\s*setup|tagri\s*trade|best\s*setup|strong\s*setup|sure\s*setup|aala\s*setup|high\s*prob)\b/i.test(lower) ||
      /(?:مضبوط\s*سیٹ\s*اپ|بہترین\s*سیٹ\s*اپ)/.test(text)
    ) ? 'HIGH_PROBABILITY' : 'STANDARD';

    // 5. Detect Conditionals
    const conditionalLanguage = (
      /\b(?:agar|ager|if|in\s*case\s*of|under\s*what\s*criteria|what\s*condition|break\s*ho|retrace\s*bane|reject\s*kare|rejection\s*mile|bounce\s*kare|cross\s*kare|candle\s*close|support\s*hold|support\s*par|support\s*pe|drop\s*to|drops\s*to|retests?)\b/i.test(lower) ||
      /(?:اگر|جب|بریک|ریٹریس|سپورٹ)/.test(text)
    );

    // 6. Detect Monitoring Requests
    const isPureMonitoringWord = /\b(?:monitor|track|watch|nazar\s*rakh|dekhte\s*rah|keep\s*tracking|keep\s*an\s*eye|follow|alert\s*karna|bata\s*dena\s*jab|inform\s*karna)\b/i.test(lower) || /(?:مانیٹر|ٹریک|نظر\s*رکھو)/.test(text);
    const hasUntilBoundary = /\b(?:until|till|jab\s*tak|tak)\b/i.test(lower) || /(?:تک|جب\s*تک)/.test(text);
    const monitoringRequested = isPureMonitoringWord || (hasUntilBoundary && (/\b(?:dekho|batao|check|dekhna)\b/i.test(lower) || /(?:دیکھو|دیکھنا|بتاؤ)/.test(text)));

    // 7. Synthesize Temporal Mode
    const hasPostEventPhrase = /\b(?:after|post|k\s*baad|ke\s*baad|k\s*bad)\b/i.test(lower) || /(?:کے\s*بعد)/.test(text);

    let temporalMode = TEMPORAL_MODES.CURRENT_SETUP;
    if (monitoringRequested && (hasUntilBoundary || isPureMonitoringWord || conditionalLanguage || temporalInfo.hasExplicitFutureDay || temporalInfo.hasSession || temporalInfo.hasEvent || /\bdekho|dekh\b/i.test(lower))) {
      temporalMode = TEMPORAL_MODES.MONITOR_UNTIL;
    } else if (temporalInfo.hasEvent && hasPostEventPhrase) {
      temporalMode = TEMPORAL_MODES.POST_EVENT_SETUP;
    } else if (temporalInfo.hasSession) {
      temporalMode = TEMPORAL_MODES.SESSION_SETUP;
    } else if (conditionalLanguage && !temporalInfo.hasExplicitFutureDay && !temporalInfo.hasRelativeDay) {
      temporalMode = TEMPORAL_MODES.CONDITIONAL_SETUP;
    } else if (requestedTask === REQUESTED_TASKS.OUTLOOK || requestedTask === REQUESTED_TASKS.LEVELS || requestedTask === REQUESTED_TASKS.RESEARCH) {
      temporalMode = TEMPORAL_MODES.MARKET_OUTLOOK;
    } else if (temporalInfo.hasExplicitFutureDay || temporalInfo.hasRelativeDay) {
      temporalMode = TEMPORAL_MODES.FUTURE_SETUP;
    } else if (/\b(?:abhi|now|current|is\s*waqt|iss\s*time|live|right\s*now)\b/i.test(lower) || /(?:ابھی)/.test(text)) {
      temporalMode = TEMPORAL_MODES.CURRENT_SETUP;
    }

    return {
      asset,
      requestedTask,
      temporalMode,
      targetDate: temporalInfo.targetDate,
      targetDay: temporalInfo.targetDay,
      targetSession: temporalInfo.targetSession,
      timezone: 'UTC',
      requestedDepth,
      requestedConfidence,
      monitoringRequested,
      conditionalLanguage,
      rawTemporalExpression: temporalInfo.rawExpression || 'NOW',
      confidence: temporalInfo.confidence
    };
  }

  static resolveAsset(lower) {
    for (const [alias, sym] of Object.entries(SYMBOL_MAP)) {
      const regex = new RegExp(`(?:^|\\b|\\s)${alias}(?:$|\\b|\\s)`, 'i');
      if (regex.test(lower)) return sym;
    }
    return 'XAUUSD';
  }

  static resolveRequestedTask(lower, text) {
    if (/(?:ابھی)/.test(text)) {
      return REQUESTED_TASKS.SETUP;
    }
    if (/\b(?:levels?|support|resistance)\b/i.test(lower) && /\b(?:sirf\s*levels|only\s*levels|koi\s*signal\s*na\s*do|trade\s*na\s*do)\b/i.test(lower)) {
      return REQUESTED_TASKS.LEVELS;
    }
    if (/\b(?:levels?|support|resistance|key\s*levels?|pivots?)\b/i.test(lower) && !/\b(?:setup|entry|buy|sell|trade)\b/i.test(lower)) {
      return REQUESTED_TASKS.LEVELS;
    }
    if (/\b(?:track|monitor|watch|record\s*paper)\b/i.test(lower)) {
      return REQUESTED_TASKS.MONITOR;
    }
    if (/\b(?:buy\s*karein\s*ya\s*wait|le\s*lun\s*ya\s*wait|sell\s*karein\s*ya\s*wait|wait\s*karein)\b/i.test(lower)) {
      return REQUESTED_TASKS.DECISION;
    }
    if (/\b(?:trade\s*mat\s*dena|signal\s*mat\s*dena|no\s*signals?|sirf\s*analysis|sirf\s*scenarios|order\s*place\s*mat|scene\s*kya\s*hai|kya\s*scene\s*hai|outlook|view|forecast|prediction|kya\s*(?:kr|kar)\s*s[ak]+ta\s*hai|kya\s*karega|kaisa\s*rahega|situation\s*kya\s*hai|structure\s*overview|macro\s*perspective|bias|kahan\s*tak\s*gir\s*sakta|kahan\s*jayegi|sentiment|what\s*do\s*you\s*think|kya\s*lagta\s*hai)\b/i.test(lower) || /(?:سین\s*کیا\s*ہے|کیا\s*کر\s*سکتا\s*ہے|صورتحال|آؤٹ\s*لک|منظر\s*نامہ|کہاں\s*جائے\s*گی)/.test(text)) {
      return REQUESTED_TASKS.OUTLOOK;
    }
    if (/\b(?:deep\s*analysis|gehra\s*jaiza|deep\s*research|full\s*research|research\s*report)\b/i.test(lower) && !/\b(?:setup|entry|signal)\b/i.test(lower)) {
      return REQUESTED_TASKS.RESEARCH;
    }
    return REQUESTED_TASKS.SETUP;
  }

  static extractTemporalClues(lower, text, refDate) {
    let hasExplicitFutureDay = false;
    let hasRelativeDay = false;
    let hasSession = false;
    let hasEvent = false;
    let targetDay = null;
    let targetDate = null;
    let targetSession = SESSIONS.ANY;
    let rawExpression = '';
    let confidence = 0.85;

    // 0. Next Week / End of Week
    if (/\b(?:next\s*week|aglay\s*hafte|agle\s*hafte)\b/i.test(lower) || /(?:اگلے\s*ہفتے)/.test(text)) {
      hasExplicitFutureDay = true;
      targetDay = 'NEXT_WEEK';
      const target = new Date(refDate);
      target.setUTCDate(refDate.getUTCDate() + 7);
      targetDate = target.toISOString().split('T')[0];
      rawExpression = 'next week';
      confidence = 0.95;
    } else if (/\b(?:end\s*of\s*week|hafte\s*k\s*aakhir)\b/i.test(lower)) {
      hasExplicitFutureDay = true;
      targetDay = 'END_OF_WEEK';
      const target = new Date(refDate);
      target.setUTCDate(refDate.getUTCDate() + (5 - refDate.getUTCDay() + 7) % 7);
      targetDate = target.toISOString().split('T')[0];
      rawExpression = 'end of week';
      confidence = 0.95;
    }

    // 1. Explicit Day of Week
    if (!targetDay) {
      for (const [dayStr, dayIndex] of Object.entries(DAY_MAP)) {
        const dayRegex = new RegExp(`(?:^|\\b|\\s)${dayStr}(?:$|\\b|\\s|k\\s*liye|ke\\s*liye|ko)?`, 'i');
        if (dayRegex.test(lower) || text.includes(dayStr)) {
          hasExplicitFutureDay = true;
          targetDay = DAY_NAMES[dayIndex];
          rawExpression = dayStr;

          // Calculate upcoming target date
          const currentDayIndex = refDate.getUTCDay();
          let diff = dayIndex - currentDayIndex;
          if (diff < 0) diff += 7;
          if (diff === 0 && !lower.includes('aaj') && !lower.includes('today')) {
            diff = 0;
          }
          const target = new Date(refDate);
          target.setUTCDate(refDate.getUTCDate() + diff);
          targetDate = target.toISOString().split('T')[0];
          confidence = 0.95;
          break;
        }
      }
    }

    // 2. Relative Day (check day_after_tomorrow BEFORE tomorrow!)
    if (!targetDate) {
      if (/\b(?:parson|day\s*after\s*tomorrow)\b/i.test(lower) || /(?:پرسوں)/.test(text)) {
        hasRelativeDay = true;
        const target = new Date(refDate);
        target.setUTCDate(refDate.getUTCDate() + 2);
        targetDate = target.toISOString().split('T')[0];
        targetDay = 'DAY_AFTER_TOMORROW';
        rawExpression = 'day_after_tomorrow';
        confidence = 0.92;
      } else if (/\b(?:kal|tomorrow|aglay\s*din|agle\s*din)\b/i.test(lower) || /(?:کل)/.test(text)) {
        hasRelativeDay = true;
        const target = new Date(refDate);
        target.setUTCDate(refDate.getUTCDate() + 1);
        targetDate = target.toISOString().split('T')[0];
        targetDay = 'TOMORROW';
        rawExpression = 'tomorrow';
        confidence = 0.92;
      } else if (/\b(?:aaj|today|current)\b/i.test(lower) || /(?:آج)/.test(text)) {
        targetDate = refDate.toISOString().split('T')[0];
        targetDay = DAY_NAMES[refDate.getUTCDay()];
        rawExpression = 'today';
        confidence = 0.90;
      }
    }

    // 3. Sessions
    if (/\b(?:overlap|london\s*ny\s*overlap)\b/i.test(lower)) {
      hasSession = true;
      targetSession = SESSIONS.LONDON_NY_OVERLAP;
      rawExpression = 'London NY Overlap';
    } else if (/\b(?:london|ldn)\b/i.test(lower) || /(?:لندن)/.test(text)) {
      hasSession = true;
      targetSession = SESSIONS.LONDON;
      rawExpression = rawExpression ? `${rawExpression} London` : 'London session';
    } else if (/\b(?:new\s*york|ny|ny\s*session|us\s*session)\b/i.test(lower) || /(?:نیویارک)/.test(text)) {
      hasSession = true;
      targetSession = SESSIONS.NEW_YORK;
      rawExpression = rawExpression ? `${rawExpression} NY` : 'NY session';
    } else if (/\b(?:asia|tokyo|asian)\b/i.test(lower) || /(?:ایشیا)/.test(text)) {
      hasSession = true;
      targetSession = SESSIONS.ASIA;
      rawExpression = rawExpression ? `${rawExpression} Asia` : 'Asia session';
    }

    // 4. Macro Events
    if (/\b(?:nfp|non\s*farm|cpi|inflation|fomc|fed\s*rate|powell|news|unemployment|claims|data)\b/i.test(lower) || /(?:این\s*ایف\s*پی|سی\s*پی\s*آئی|ایف\s*او\s*ایم\s*سی|نیوز|ڈیٹا)/.test(text)) {
      hasEvent = true;
      rawExpression = rawExpression ? `${rawExpression} (Macro Event)` : 'Macro Event';
    }

    // Default target date to today if none detected
    if (!targetDate) {
      targetDate = refDate.toISOString().split('T')[0];
      targetDay = DAY_NAMES[refDate.getUTCDay()];
    }

    return {
      hasExplicitFutureDay,
      hasRelativeDay,
      hasSession,
      hasEvent,
      targetDay,
      targetDate,
      targetSession,
      rawExpression,
      confidence
    };
  }
}
