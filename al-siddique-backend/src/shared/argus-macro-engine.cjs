const dynamicImport = new Function('specifier', 'return import(specifier)');

let mPromise = null;
function getModule() {
  if (!mPromise) {
    mPromise = dynamicImport('./argus-macro-engine.mjs');
  }
  return mPromise;
}

module.exports = {
  async classifyRegime(...args) {
    const m = await getModule();
    return m.argusMacroEngine.classifyRegime(...args);
  },
  async computeCrossAssetMatrix(...args) {
    const m = await getModule();
    return m.argusMacroEngine.computeCrossAssetMatrix(...args);
  },
  async evaluateEventRisk(...args) {
    const m = await getModule();
    return m.argusMacroEngine.evaluateEventRisk(...args);
  },
  async generateCausalMacroReasoning(...args) {
    const m = await getModule();
    return m.argusMacroEngine.generateCausalMacroReasoning(...args);
  },
  async compareAssets(...args) {
    const m = await getModule();
    return m.argusMacroEngine.compareAssets(...args);
  },
  get argusMacroEngine() {
    return {
      classifyRegime: (...args) => module.exports.classifyRegime(...args),
      computeCrossAssetMatrix: (...args) => module.exports.computeCrossAssetMatrix(...args),
      evaluateEventRisk: (...args) => module.exports.evaluateEventRisk(...args),
      generateCausalMacroReasoning: (...args) => module.exports.generateCausalMacroReasoning(...args),
      compareAssets: (...args) => module.exports.compareAssets(...args)
    };
  }
};
