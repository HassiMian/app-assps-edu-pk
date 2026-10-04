/**
 * JARVIS ARGUS 7.4 — Circuit Breaker & Signal Certificate Engine (CommonJS Proxy)
 */
'use strict';

const dynamicImport = new Function('specifier', 'return import(specifier)');
let mPromise = null;
function getModule() {
  if (!mPromise) {
    mPromise = dynamicImport('./argus-circuit-breaker.mjs');
  }
  return mPromise;
}

module.exports = {
  CIRCUIT_BLOCKERS: {
    MARKET_CLOSED: 'MARKET_CLOSED',
    MARKET_CLOSED_WEEKEND: 'MARKET_CLOSED_WEEKEND',
    BROKER_TICK_STALE: 'BROKER_TICK_STALE',
    CANDLE_DEPTH_INSUFFICIENT: 'CANDLE_DEPTH_INSUFFICIENT',
    REGIME_UNVERIFIED: 'REGIME_UNVERIFIED',
    REGIME_INCOMPATIBLE: 'REGIME_INCOMPATIBLE',
    EVENT_TIME_CONFLICT: 'EVENT_TIME_CONFLICT',
    EVENT_CONTEXT_UNAVAILABLE: 'EVENT_CONTEXT_UNAVAILABLE',
    BROKER_DATA_UNAVAILABLE: 'BROKER_DATA_UNAVAILABLE',
    PRICE_LEVEL_PROVENANCE_MISSING: 'PRICE_LEVEL_PROVENANCE_MISSING',
    WHOLE_ZONE_RR_FAIL: 'WHOLE_ZONE_RR_FAIL',
    COST_ADJUSTED_RR_FAIL: 'COST_ADJUSTED_RR_FAIL',
    SPREAD_TOO_HIGH: 'SPREAD_TOO_HIGH',
    BROKER_STOPS_FAIL: 'BROKER_STOPS_FAIL'
  },
  ArgusDataQualityCircuitBreaker: {
    evaluate: async (...args) => {
      const m = await getModule();
      return m.ArgusDataQualityCircuitBreaker.evaluate(...args);
    }
  },
  signalCertificateStore: {
    issueCertificate: async (...args) => {
      const m = await getModule();
      return m.signalCertificateStore.issueCertificate(...args);
    },
    getCertificate: async (...args) => {
      const m = await getModule();
      return m.signalCertificateStore.getCertificate(...args);
    }
  }
};
