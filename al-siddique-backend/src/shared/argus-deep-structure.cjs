const dynamicImport = new Function('specifier', 'return import(specifier)');

let mPromise = null;
function getModule() {
  if (!mPromise) {
    mPromise = dynamicImport('./argus-deep-structure.mjs');
  }
  return mPromise;
}

module.exports = {
  async analyzeStructure(...args) {
    const m = await getModule();
    return m.argusDeepStructureEngine.analyzeStructure(...args);
  },
  async synthesizeMtfNarrative(...args) {
    const m = await getModule();
    return m.argusDeepStructureEngine.synthesizeMtfNarrative(...args);
  },
  async generateLiquidityMap(...args) {
    const m = await getModule();
    return m.argusDeepStructureEngine.generateLiquidityMap(...args);
  },
  async detectLiquiditySweep(...args) {
    const m = await getModule();
    return m.argusDeepStructureEngine.detectLiquiditySweep(...args);
  },
  async extractFairValueGaps(...args) {
    const m = await getModule();
    return m.argusDeepStructureEngine.extractFairValueGaps(...args);
  },
  async extractOrderBlocks(...args) {
    const m = await getModule();
    return m.argusDeepStructureEngine.extractOrderBlocks(...args);
  },
  async calculateDealingRange(...args) {
    const m = await getModule();
    return m.argusDeepStructureEngine.calculateDealingRange(...args);
  },
  async evaluateSession(...args) {
    const m = await getModule();
    return m.argusDeepStructureEngine.evaluateSession(...args);
  },
  async evaluateAuctionContext(...args) {
    const m = await getModule();
    return m.argusDeepStructureEngine.evaluateAuctionContext(...args);
  },
  get argusDeepStructureEngine() {
    return {
      analyzeStructure: (...args) => module.exports.analyzeStructure(...args),
      synthesizeMtfNarrative: (...args) => module.exports.synthesizeMtfNarrative(...args),
      generateLiquidityMap: (...args) => module.exports.generateLiquidityMap(...args),
      detectLiquiditySweep: (...args) => module.exports.detectLiquiditySweep(...args),
      extractFairValueGaps: (...args) => module.exports.extractFairValueGaps(...args),
      extractOrderBlocks: (...args) => module.exports.extractOrderBlocks(...args),
      calculateDealingRange: (...args) => module.exports.calculateDealingRange(...args),
      evaluateSession: (...args) => module.exports.evaluateSession(...args),
      evaluateAuctionContext: (...args) => module.exports.evaluateAuctionContext(...args)
    };
  }
};
