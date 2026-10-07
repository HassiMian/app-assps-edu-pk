const dynamicImport = new Function('specifier', 'return import(specifier)');

let mPromise = null;
function getModule() {
  if (!mPromise) {
    mPromise = dynamicImport('./argus-broker-candle-engine.mjs');
  }
  return mPromise;
}

module.exports = {
  async getSession(...args) {
    const m = await getModule();
    return m.argusBrokerCandleEngine.getSession(...args);
  },
  async calculateATR(...args) {
    const m = await getModule();
    return m.argusBrokerCandleEngine.calculateATR(...args);
  },
  async analyzeStructure(...args) {
    const m = await getModule();
    return m.argusBrokerCandleEngine.analyzeStructure(...args);
  },
  async classifyRegime(...args) {
    const m = await getModule();
    return m.argusBrokerCandleEngine.classifyRegime(...args);
  },
  async extractLiquidity(...args) {
    const m = await getModule();
    return m.argusBrokerCandleEngine.extractLiquidity(...args);
  },
  async validateDisplacementFVG(...args) {
    const m = await getModule();
    return m.argusBrokerCandleEngine.validateDisplacementFVG(...args);
  },
  async buildMarketEvidenceBundle(...args) {
    const m = await getModule();
    return m.argusBrokerCandleEngine.buildMarketEvidenceBundle(...args);
  },
  get argusBrokerCandleEngine() {
    return {
      getSession: (...args) => module.exports.getSession(...args),
      calculateATR: (...args) => module.exports.calculateATR(...args),
      analyzeStructure: (...args) => module.exports.analyzeStructure(...args),
      classifyRegime: (...args) => module.exports.classifyRegime(...args),
      extractLiquidity: (...args) => module.exports.extractLiquidity(...args),
      validateDisplacementFVG: (...args) => module.exports.validateDisplacementFVG(...args),
      buildMarketEvidenceBundle: (...args) => module.exports.buildMarketEvidenceBundle(...args)
    };
  }
};
