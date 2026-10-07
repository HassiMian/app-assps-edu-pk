/**
 * JARVIS ARGUS 7.4 — Mathematical Signal Validator (CommonJS Proxy)
 */
'use strict';

const dynamicImport = new Function('specifier', 'return import(specifier)');
let mPromise = null;
function getModule() {
  if (!mPromise) {
    mPromise = dynamicImport('./argus-mathematical-validator.mjs');
  }
  return mPromise;
}

module.exports = {
  SIGNAL_STATUS: {
    RESEARCH_ONLY: 'RESEARCH_ONLY',
    CONDITIONAL: 'CONDITIONAL',
    VALIDATED: 'VALIDATED',
    CERTIFIED: 'CERTIFIED',
    REJECTED: 'REJECTED',
    NO_TRADE: 'NO_TRADE'
  },
  REJECTION_CODES: {
    INSUFFICIENT_RR_RATIO: 'INSUFFICIENT_RR_RATIO',
    WHOLE_ZONE_RR_VIOLATION: 'WHOLE_ZONE_RR_VIOLATION',
    COST_ADJUSTED_RR_VIOLATION: 'COST_ADJUSTED_RR_VIOLATION',
    STOPS_LEVEL_VIOLATION: 'BROKER_STOPS_LEVEL_VIOLATION',
    MISSING_OR_INVALID_ENTRY: 'MISSING_OR_INVALID_ENTRY',
    MISSING_OR_INVALID_STOP_LOSS: 'MISSING_OR_INVALID_STOP_LOSS',
    MISSING_OR_INVALID_TARGET_1: 'MISSING_OR_INVALID_TARGET_1',
    STRATEGY_REGIME_INELIGIBLE: 'STRATEGY_REGIME_INELIGIBLE',
    PRICE_LEVEL_PROVENANCE_MISSING: 'PRICE_LEVEL_PROVENANCE_MISSING'
  },
  ArgusMathematicalValidator: class ArgusMathematicalValidator {
    constructor() { this.name = 'ARGUS_Mathematical_Signal_Validator_7_4_CJS'; }
    async createSignalCandidate(...args) { const m = await getModule(); return m.argusMathematicalValidator.createSignalCandidate(...args); }
    async validateSignal(...args) { const m = await getModule(); return m.argusMathematicalValidator.validateSignal(...args); }
    async validateConditionalScenario(...args) { const m = await getModule(); return m.argusMathematicalValidator.validateConditionalScenario(...args); }
    async validateWholeZoneRR(...args) { const m = await getModule(); return m.argusMathematicalValidator.validateWholeZoneRR(...args); }
    async validateExecutionRealities(...args) { const m = await getModule(); return m.argusMathematicalValidator.validateExecutionRealities(...args); }
  },
  argusMathematicalValidator: {
    createSignalCandidate: async (...args) => { const m = await getModule(); return m.argusMathematicalValidator.createSignalCandidate(...args); },
    validateSignal: async (...args) => { const m = await getModule(); return m.argusMathematicalValidator.validateSignal(...args); },
    validateConditionalScenario: async (...args) => { const m = await getModule(); return m.argusMathematicalValidator.validateConditionalScenario(...args); },
    validateWholeZoneRR: async (...args) => { const m = await getModule(); return m.argusMathematicalValidator.validateWholeZoneRR(...args); },
    validateExecutionRealities: async (...args) => { const m = await getModule(); return m.argusMathematicalValidator.validateExecutionRealities(...args); }
  }
};
