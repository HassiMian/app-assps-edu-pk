/**
 * JARVIS ARGUS 7.2 — Trading Comprehension Engine (CommonJS Proxy)
 */
'use strict';

let _mjs;
async function _load() {
  if (!_mjs) _mjs = await import('./argus-trading-comprehension.mjs');
  return _mjs;
}

class TradingComprehension {
  constructor() { this.name = 'ARGUS_Trading_Comprehension_7_2_CJS'; }
  async parse(userQuery, options) {
    const m = await _load();
    return m.tradingComprehension.parse(userQuery, options);
  }
}

const tradingComprehension = new TradingComprehension();

module.exports = {
  TradingComprehension,
  tradingComprehension,
  TRADING_HORIZONS: {
    SCALP: { id: 'SCALP', label: 'Scalp', timeframes: ['M1', 'M5', 'M15'], typicalHold: '5–30 minutes' },
    SESSION: { id: 'SESSION', label: 'Session Trade', timeframes: ['M15', 'H1'], typicalHold: '1–4 hours' },
    INTRADAY: { id: 'INTRADAY', label: 'Intraday', timeframes: ['M15', 'H1'], typicalHold: '2–8 hours' },
    ONE_DAY: { id: 'ONE_DAY', label: 'One Day', timeframes: ['H1', 'H4'], typicalHold: 'Same day' },
    MULTI_DAY: { id: 'MULTI_DAY', label: 'Multi-Day / Swing', timeframes: ['H4', 'D1'], typicalHold: '2–5 days' },
    SWING: { id: 'SWING', label: 'Swing', timeframes: ['H4', 'D1'], typicalHold: '2–7 days' },
    WEEKLY_OUTLOOK: { id: 'WEEKLY_OUTLOOK', label: 'Weekly Outlook', timeframes: ['D1', 'W1'], typicalHold: '5–10 days' }
  },
  USER_GOALS: {
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
    // Backward-compatible aliases:
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
  }
};
