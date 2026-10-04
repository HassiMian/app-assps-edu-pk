const dynamicImport = new Function('specifier', 'return import(specifier)');

let mPromise = null;
function getModule() {
  if (!mPromise) {
    mPromise = dynamicImport('./argus-forensic-metrics.mjs');
  }
  return mPromise;
}

module.exports = {
  async computeMetricsFromTrades(...args) {
    const m = await getModule();
    return m.argusForensicMetrics.computeMetricsFromTrades(...args);
  },
  async computeBootstrapConfidenceIntervals(...args) {
    const m = await getModule();
    return m.argusForensicMetrics.computeBootstrapConfidenceIntervals(...args);
  },
  async runMonteCarloRobustness(...args) {
    const m = await getModule();
    return m.argusForensicMetrics.runMonteCarloRobustness(...args);
  },
  async testParameterSensitivity(...args) {
    const m = await getModule();
    return m.argusForensicMetrics.testParameterSensitivity(...args);
  },
  async testManagementRules(...args) {
    const m = await getModule();
    return m.argusForensicMetrics.testManagementRules(...args);
  },
  async computeBreakdowns(...args) {
    const m = await getModule();
    return m.argusForensicMetrics.computeBreakdowns(...args);
  },
  get argusForensicMetrics() {
    return {
      computeMetricsFromTrades: (...args) => module.exports.computeMetricsFromTrades(...args),
      computeBootstrapConfidenceIntervals: (...args) => module.exports.computeBootstrapConfidenceIntervals(...args),
      runMonteCarloRobustness: (...args) => module.exports.runMonteCarloRobustness(...args),
      testParameterSensitivity: (...args) => module.exports.testParameterSensitivity(...args),
      testManagementRules: (...args) => module.exports.testManagementRules(...args),
      computeBreakdowns: (...args) => module.exports.computeBreakdowns(...args)
    };
  }
};
