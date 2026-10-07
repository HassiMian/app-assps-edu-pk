const dynamicImport = new Function('specifier', 'return import(specifier)');

let mPromise = null;
function getModule() {
  if (!mPromise) {
    mPromise = dynamicImport('./argus-strategy-registry.mjs');
  }
  return mPromise;
}

module.exports = {
  async registerStrategy(...args) {
    const m = await getModule();
    return m.argusStrategyRegistry.registerStrategy(...args);
  },
  async updateStatus(...args) {
    const m = await getModule();
    return m.argusStrategyRegistry.updateStatus(...args);
  },
  async isSignalEligible(...args) {
    const m = await getModule();
    return m.argusStrategyRegistry.isSignalEligible(...args);
  },
  async evaluateStrategyFit(...args) {
    const m = await getModule();
    return m.argusStrategyRegistry.evaluateStrategyFit(...args);
  },
  async monitorRetirement(...args) {
    const m = await getModule();
    return m.argusStrategyRegistry.monitorRetirement(...args);
  },
  async getStrategy(...args) {
    const m = await getModule();
    return m.argusStrategyRegistry.getStrategy(...args);
  },
  async getAllStrategies(...args) {
    const m = await getModule();
    return m.argusStrategyRegistry.getAllStrategies(...args);
  },
  async getStrategiesForSymbol(...args) {
    const m = await getModule();
    return m.argusStrategyRegistry.getStrategiesForSymbol(...args);
  },
  async getStrategiesForRegime(...args) {
    const m = await getModule();
    return m.argusStrategyRegistry.getStrategiesForRegime(...args);
  },
  async getStrategiesForHorizon(...args) {
    const m = await getModule();
    return m.argusStrategyRegistry.getStrategiesForHorizon(...args);
  },
  async getEmpiricallyEligibleStrategies(...args) {
    const m = await getModule();
    return m.argusStrategyRegistry.getEmpiricallyEligibleStrategies(...args);
  },
  async analyzeCoverageGaps(...args) {
    const m = await getModule();
    return m.argusStrategyRegistry.analyzeCoverageGaps(...args);
  },
  EMPIRICAL_STATUS: {
    ACCEPTED: 'ACCEPTED',
    CONDITIONAL: 'CONDITIONAL',
    RETUNE: 'RETUNE',
    REJECTED: 'REJECTED',
    RESEARCH_ONLY: 'RESEARCH_ONLY'
  },
  EMPIRICAL_RESEARCH_STATUS: {
    ACCEPTED: 'ACCEPTED',
    CONDITIONAL: 'CONDITIONAL',
    RETUNE: 'RETUNE',
    REJECTED: 'REJECTED',
    RESEARCH_ONLY: 'RESEARCH_ONLY'
  },
  get argusStrategyRegistry() {
    return {
      registerStrategy: (...args) => module.exports.registerStrategy(...args),
      updateStatus: (...args) => module.exports.updateStatus(...args),
      isSignalEligible: (...args) => module.exports.isSignalEligible(...args),
      evaluateStrategyFit: (...args) => module.exports.evaluateStrategyFit(...args),
      monitorRetirement: (...args) => module.exports.monitorRetirement(...args),
      getStrategy: (...args) => module.exports.getStrategy(...args),
      getAllStrategies: (...args) => module.exports.getAllStrategies(...args),
      getStrategiesForSymbol: (...args) => module.exports.getStrategiesForSymbol(...args),
      getStrategiesForRegime: (...args) => module.exports.getStrategiesForRegime(...args),
      getStrategiesForHorizon: (...args) => module.exports.getStrategiesForHorizon(...args),
      getEmpiricallyEligibleStrategies: (...args) => module.exports.getEmpiricallyEligibleStrategies(...args),
      analyzeCoverageGaps: (...args) => module.exports.analyzeCoverageGaps(...args)
    };
  }
};
