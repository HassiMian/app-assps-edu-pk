const dynamicImport = new Function('specifier', 'return import(specifier)');

let mPromise = null;
function getModule() {
  if (!mPromise) {
    mPromise = dynamicImport('./dataset-auditor.mjs');
  }
  return mPromise;
}

module.exports = {
  async generateCanonicalDatasets(...args) {
    const m = await getModule();
    return m.datasetAuditor.generateCanonicalDatasets(...args);
  },
  async auditDataset(...args) {
    const m = await getModule();
    return m.datasetAuditor.auditDataset(...args);
  },
  async loadDataset(...args) {
    const m = await getModule();
    return m.datasetAuditor.loadDataset(...args);
  },
  get datasetAuditor() {
    return {
      generateCanonicalDatasets: (...args) => module.exports.generateCanonicalDatasets(...args),
      auditDataset: (...args) => module.exports.auditDataset(...args),
      loadDataset: (...args) => module.exports.loadDataset(...args)
    };
  }
};
