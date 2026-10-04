/**
 * JARVIS ARGUS 7.4 — Fundamental Intelligence Engine (CommonJS Proxy)
 */
'use strict';

const dynamicImport = new Function('specifier', 'return import(specifier)');
let mPromise = null;
function getModule() {
  if (!mPromise) {
    mPromise = dynamicImport('./argus-fundamental-engine.mjs');
  }
  return mPromise;
}

module.exports = {
  EVENT_STATUS: {
    VERIFIED_UPCOMING: 'VERIFIED_UPCOMING',
    VERIFIED_RELEASED: 'VERIFIED_RELEASED',
    STALE: 'STALE',
    CONFLICTED: 'CONFLICTED',
    UNAVAILABLE: 'UNAVAILABLE'
  },
  ArgusFundamentalEngine: class ArgusFundamentalEngine {
    constructor() { this.name = 'ARGUS_Fundamental_Intelligence_Engine_7_4_CJS'; }
    async getMacroFundamentals(...args) { const m = await getModule(); return m.argusFundamentalEngine.getMacroFundamentals(...args); }
    async getEconomicCalendar(...args) { const m = await getModule(); return m.argusFundamentalEngine.getEconomicCalendar(...args); }
    async getCrossAssetContext(...args) { const m = await getModule(); return m.argusFundamentalEngine.getCrossAssetContext(...args); }
    async getMacroNewsModel(...args) { const m = await getModule(); return m.argusFundamentalEngine.getMacroNewsModel(...args); }
    async evaluateMacroTechnicalConflict(...args) { const m = await getModule(); return m.argusFundamentalEngine.evaluateMacroTechnicalConflict(...args); }
  },
  argusFundamentalEngine: {
    getMacroFundamentals: async (...args) => { const m = await getModule(); return m.argusFundamentalEngine.getMacroFundamentals(...args); },
    getEconomicCalendar: async (...args) => { const m = await getModule(); return m.argusFundamentalEngine.getEconomicCalendar(...args); },
    getCrossAssetContext: async (...args) => { const m = await getModule(); return m.argusFundamentalEngine.getCrossAssetContext(...args); },
    getMacroNewsModel: async (...args) => { const m = await getModule(); return m.argusFundamentalEngine.getMacroNewsModel(...args); },
    evaluateMacroTechnicalConflict: async (...args) => { const m = await getModule(); return m.argusFundamentalEngine.evaluateMacroTechnicalConflict(...args); }
  }
};
