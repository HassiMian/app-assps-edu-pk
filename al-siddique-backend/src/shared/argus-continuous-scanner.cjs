/**
 * JARVIS ARGUS — Continuous Owner-Only Market Scanner & Watch Engine (CommonJS Proxy)
 */
'use strict';

let _mjs;
async function _load() {
  if (!_mjs) _mjs = await import('./argus-continuous-scanner.mjs');
  return _mjs;
}

const SETUP_STATE = {
  OBSERVING: 'OBSERVING',
  CANDIDATE: 'CANDIDATE',
  WATCH_CANDIDATE: 'WATCH_CANDIDATE',
  WAIT_FOR_TRIGGER: 'WAIT_FOR_TRIGGER',
  CERTIFIED: 'CERTIFIED',
  VALIDATED_PAPER_SETUP: 'VALIDATED_PAPER_SETUP',
  TRIGGERED: 'TRIGGERED',
  ACTIVE: 'ACTIVE',
  WEAKENING: 'WEAKENING',
  TARGET_APPROACHING: 'TARGET_APPROACHING',
  TARGET_REACHED: 'TARGET_REACHED',
  TARGET_1_REACHED: 'TARGET_1_REACHED',
  TARGET_2_REACHED: 'TARGET_2_REACHED',
  INVALIDATED: 'INVALIDATED',
  EXPIRED: 'EXPIRED',
  STALE_SETUP_EXPIRED: 'STALE_SETUP_EXPIRED',
  MISSED_ENTRY: 'MISSED_ENTRY'
};

class ArgusContinuousMarketScanner {
  constructor(options = {}) {
    this.name = 'ARGUS_Continuous_Market_Scanner_7_5_CJS';
    this.options = options;
  }

  set notificationHook(fn) {
    this._notificationHook = fn;
    _load().then(m => { m.argusContinuousScanner.notificationHook = fn; }).catch(() => {});
  }

  get notificationHook() {
    return this._notificationHook;
  }

  async start() {
    const m = await _load();
    if (this._notificationHook) {
      m.argusContinuousScanner.notificationHook = this._notificationHook;
    }
    return m.argusContinuousScanner.start();
  }
  async stop() { const m = await _load(); return m.argusContinuousScanner.stop(); }
  async registerMarketWatch(params) { const m = await _load(); return m.argusContinuousScanner.registerMarketWatch(params); }
  async registerCandidateSetup(setup) { const m = await _load(); return m.argusContinuousScanner.registerCandidateSetup(setup); }
  async getLatestActiveSetup(userId) { const m = await _load(); return m.argusContinuousScanner.getLatestActiveSetup(userId); }
  async runContinuousScanCycle(provider) { const m = await _load(); return m.argusContinuousScanner.runContinuousScanCycle(provider); }
  async evaluatePositionWatches(provider) { const m = await _load(); return m.argusContinuousScanner.evaluatePositionWatches(provider); }
  async revalidatePersistedSetups(price, atr) { const m = await _load(); return m.argusContinuousScanner.revalidatePersistedSetups(price, atr); }
  async getScannerStatus() { const m = await _load(); return m.argusContinuousScanner.getScannerStatus(); }
  async sendAlert(alertRecord, hook) { const m = await _load(); return m.argusContinuousScanner.sendAlert(alertRecord, hook); }
}

const argusContinuousScanner = new ArgusContinuousMarketScanner();

module.exports = {
  SETUP_STATE,
  ArgusContinuousMarketScanner,
  argusContinuousScanner
};
