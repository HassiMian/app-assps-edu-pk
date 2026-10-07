/**
 * JARVIS ARGUS 7.2 — Position Watch Engine (CommonJS Proxy)
 */
'use strict';

let _mjs;
async function _load() {
  if (!_mjs) _mjs = await import('./argus-position-watch.mjs');
  return _mjs;
}

class ArgusPositionWatch {
  constructor() { this.name = 'ARGUS_Position_Watch_7_2_CJS'; }
  async declarePosition(userId, params) { const m = await _load(); return m.argusPositionWatch.declarePosition(userId, params); }
  async reviewPosition(watchId, evidence) { const m = await _load(); return m.argusPositionWatch.reviewPosition(watchId, evidence); }
  async findActivePosition(userId, symbol) { const m = await _load(); return m.argusPositionWatch.findActivePosition(userId, symbol); }
  async getActivePositions(userId) { const m = await _load(); return m.argusPositionWatch.getActivePositions(userId); }
  async getActivePosition(userId) { const m = await _load(); return m.argusPositionWatch.getActivePosition(userId); }
  async getAllActivePositions() { const m = await _load(); return m.argusPositionWatch.getAllActivePositions(); }
  async closePosition(watchId, reason) { const m = await _load(); return m.argusPositionWatch.closePosition(watchId, reason); }
  async closeAllPositions(userId, reason) { const m = await _load(); return m.argusPositionWatch.closeAllPositions(userId, reason); }
}

const argusPositionWatch = new ArgusPositionWatch();

module.exports = {
  ArgusPositionWatch,
  argusPositionWatch,
  THESIS_STATE: {
    INTACT: 'THESIS_INTACT',
    THESIS_INTACT: 'THESIS_INTACT',
    STRENGTHENING: 'THESIS_STRENGTHENING',
    THESIS_STRENGTHENING: 'THESIS_STRENGTHENING',
    WEAKENING: 'THESIS_WEAKENING',
    THESIS_WEAKENING: 'THESIS_WEAKENING',
    INVALIDATION_APPROACHING: 'INVALIDATION_APPROACHING',
    INVALIDATED: 'INVALIDATED',
    TARGET_REACHED: 'TARGET_REACHED',
    TP1_REACHED: 'TP1_REACHED',
    TP2_REACHED: 'TP2_REACHED',
    EXIT_REVIEW_REQUIRED: 'EXIT_REVIEW_REQUIRED',
    DATA_UNAVAILABLE: 'DATA_UNAVAILABLE',
    TARGET_APPROACHING: 'TARGET_APPROACHING',
    EVENT_RISK_INCREASED: 'EVENT_RISK_INCREASED',
    INSUFFICIENT_DATA: 'INSUFFICIENT_FRESH_DATA'
  },
  WATCH_STATUS: { ACTIVE: 'ACTIVE', CLOSED: 'CLOSED', INVALIDATED: 'INVALIDATED' }
};
