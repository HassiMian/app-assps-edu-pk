/**
 * JARVIS ARGUS 7.4 — Opportunity Scanner (CommonJS Proxy)
 */
'use strict';

const dynamicImport = new Function('specifier', 'return import(specifier)');
let mPromise = null;
function getModule() {
  if (!mPromise) {
    mPromise = dynamicImport('./argus-opportunity-scanner.mjs');
  }
  return mPromise;
}

module.exports = {
  CANDIDATE_STATUS: {
    VALID: 'VALID',
    CONDITIONAL: 'CONDITIONAL',
    REJECTED: 'REJECTED'
  },
  ACTIONABLE_TRIGGER_CLASSES: {
    BREAK_AND_RETEST: 'BREAK_AND_RETEST',
    LIQUIDITY_SWEEP_REVERSAL: 'LIQUIDITY_SWEEP_REVERSAL',
    DISPLACEMENT_FVG_RETRACE: 'DISPLACEMENT_FVG_RETRACE',
    VWAP_RECLAIM: 'VWAP_RECLAIM',
    STRUCTURE_BREAK_CONTINUATION: 'STRUCTURE_BREAK_CONTINUATION'
  },
  SIGNAL_LIFECYCLE: {
    REJECTED: 'REJECTED',
    RESEARCH_ONLY: 'RESEARCH_ONLY',
    WATCH_ONLY: 'WATCH_ONLY',
    WAIT_FOR_REGIME: 'WAIT_FOR_REGIME',
    WAIT_FOR_TRIGGER: 'WAIT_FOR_TRIGGER',
    TRIGGERED: 'TRIGGERED',
    VALIDATING: 'VALIDATING',
    CERTIFIED: 'CERTIFIED',
    ACTIVE: 'ACTIVE',
    INVALIDATED: 'INVALIDATED',
    EXPIRED: 'EXPIRED'
  },
  REGIME_CERTIFICATION: {
    COMPATIBLE: 'COMPATIBLE',
    CONDITIONAL: 'CONDITIONAL',
    INCOMPATIBLE: 'INCOMPATIBLE',
    UNVERIFIED: 'UNVERIFIED'
  },
  StrategyRegimeCertification: {
    certify: async (...args) => { const m = await getModule(); return m.StrategyRegimeCertification.certify(...args); }
  },
  ArgusOpportunityScanner: class ArgusOpportunityScanner {
    constructor() { this.name = 'ARGUS_Opportunity_Scanner_7_4_CJS'; }
    async scan(...args) { const m = await getModule(); return m.argusOpportunityScanner.scan(...args); }
    async getAbstentionRate(...args) { const m = await getModule(); return m.argusOpportunityScanner.getAbstentionRate(...args); }
  },
  argusOpportunityScanner: {
    scan: async (...args) => { const m = await getModule(); return m.argusOpportunityScanner.scan(...args); },
    getAbstentionRate: async (...args) => { const m = await getModule(); return m.argusOpportunityScanner.getAbstentionRate(...args); }
  }
};
