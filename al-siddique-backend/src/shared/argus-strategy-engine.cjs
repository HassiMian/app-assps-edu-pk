const dynamicImport = new Function('specifier', 'return import(specifier)');

let mPromise = null;
function getModule() {
  if (!mPromise) {
    mPromise = dynamicImport('./argus-strategy-engine.mjs');
  }
  return mPromise;
}

module.exports = {
  async evaluateCrossAssetContext(...args) {
    const m = await getModule();
    return m.argusStrategyEngine.evaluateCrossAssetContext(...args);
  },
  async evaluateChasingRisk(...args) {
    const m = await getModule();
    return m.argusStrategyEngine.evaluateChasingRisk(...args);
  },
  async calculateConfluenceMatrix(...args) {
    const m = await getModule();
    return m.argusStrategyEngine.calculateConfluenceMatrix(...args);
  },
  async runResearchCouncil(...args) {
    const m = await getModule();
    return m.argusStrategyEngine.runResearchCouncil(...args);
  },
  async generateHighConvictionSetup(...args) {
    const m = await getModule();
    return m.argusStrategyEngine.generateHighConvictionSetup(...args);
  },
  async formatResponseByIntent(...args) {
    const m = await getModule();
    return m.argusStrategyEngine.formatResponseByIntent(...args);
  },
  get argusStrategyEngine() {
    return {
      evaluateCrossAssetContext: (...args) => module.exports.evaluateCrossAssetContext(...args),
      evaluateChasingRisk: (...args) => module.exports.evaluateChasingRisk(...args),
      calculateConfluenceMatrix: (...args) => module.exports.calculateConfluenceMatrix(...args),
      runResearchCouncil: (...args) => module.exports.runResearchCouncil(...args),
      generateHighConvictionSetup: (...args) => module.exports.generateHighConvictionSetup(...args),
      formatResponseByIntent: (...args) => module.exports.formatResponseByIntent(...args)
    };
  }
};
