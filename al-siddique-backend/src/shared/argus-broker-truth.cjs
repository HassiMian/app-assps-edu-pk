/**
 * JARVIS ARGUS 7.4 — Broker Tick Truth, Market Tradability & Market Clock Engine (CommonJS Proxy)
 */
'use strict';

const dynamicImport = new Function('specifier', 'return import(specifier)');
let mPromise = null;
function getModule() {
  if (!mPromise) {
    mPromise = dynamicImport('./argus-broker-truth.mjs');
  }
  return mPromise;
}

module.exports = {
  MARKET_OPEN_STATE: {
    OPEN: 'OPEN',
    CLOSED_WEEKEND: 'CLOSED_WEEKEND',
    CLOSED_SESSION: 'CLOSED_SESSION',
    BROKER_DISABLED: 'BROKER_DISABLED',
    HOLIDAY_SUSPECTED: 'HOLIDAY_SUSPECTED',
    STALE_FEED: 'STALE_FEED',
    UNKNOWN: 'UNKNOWN'
  },
  QUOTE_FRESHNESS: {
    FRESH: 'FRESH',
    STALE: 'STALE',
    OFFLINE: 'OFFLINE',
    CLOSED: 'CLOSED',
    LAST_VALID_QUOTE: 'LAST_VALID_QUOTE'
  },
  MarketClock: {
    getClock: async (...args) => {
      const m = await getModule();
      return m.MarketClock.getClock(...args);
    },
    getNextTradableSession: async (...args) => {
      const m = await getModule();
      return m.MarketClock.getNextTradableSession(...args);
    }
  },
  MarketTradabilityEngine: {
    evaluateTradability: async (...args) => {
      const m = await getModule();
      return m.MarketTradabilityEngine.evaluateTradability(...args);
    }
  },
  BrokerTickTruth: {
    create: async (...args) => {
      const m = await getModule();
      return m.BrokerTickTruth.create(...args);
    }
  },
  BrokerCandleCertification: {
    certify: async (...args) => {
      const m = await getModule();
      return m.BrokerCandleCertification.certify(...args);
    }
  },
  LiveOpenMarketTruthGate: {
    evaluate: async (...args) => {
      const m = await getModule();
      return m.LiveOpenMarketTruthGate.evaluate(...args);
    }
  }
};
