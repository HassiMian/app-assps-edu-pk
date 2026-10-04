const dynamicImport = new Function('specifier', 'return import(specifier)');

let mPromise = null;
function getModule() {
  if (!mPromise) {
    mPromise = dynamicImport('./argus-truth-auditor.mjs');
  }
  return mPromise;
}

module.exports = {
  async runFullReconstruction(...args) {
    const m = await getModule();
    return m.argusTruthAuditor.runFullReconstruction(...args);
  },
  async auditMarketLoops(...args) {
    const m = await getModule();
    return m.argusTruthAuditor.auditMarketLoops(...args);
  },
  async auditMacroAndNewsTruth(...args) {
    const m = await getModule();
    return m.argusTruthAuditor.auditMacroAndNewsTruth(...args);
  },
  async reconstructPaperForward200(...args) {
    const m = await getModule();
    return m.argusTruthAuditor.reconstructPaperForward200(...args);
  },
  async runCalibrationTests(...args) {
    const m = await getModule();
    return m.argusTruthAuditor.runCalibrationTests(...args);
  },
  async generateEvidenceManifest(...args) {
    const m = await getModule();
    return m.argusTruthAuditor.generateEvidenceManifest(...args);
  },
  get argusTruthAuditor() {
    return {
      runFullReconstruction: (...args) => module.exports.runFullReconstruction(...args),
      auditMarketLoops: (...args) => module.exports.auditMarketLoops(...args),
      auditMacroAndNewsTruth: (...args) => module.exports.auditMacroAndNewsTruth(...args),
      reconstructPaperForward200: (...args) => module.exports.reconstructPaperForward200(...args),
      runCalibrationTests: (...args) => module.exports.runCalibrationTests(...args),
      generateEvidenceManifest: (...args) => module.exports.generateEvidenceManifest(...args)
    };
  }
};
