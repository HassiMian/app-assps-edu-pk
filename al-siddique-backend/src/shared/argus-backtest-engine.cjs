const dynamicImport = new Function('specifier', 'return import(specifier)');

let mPromise = null;
function getModule() {
  if (!mPromise) {
    mPromise = dynamicImport('./argus-backtest-engine.mjs');
  }
  return mPromise;
}

module.exports = {
  async runBacktest(...args) {
    const m = await getModule();
    return m.argusBacktestEngine.runBacktest(...args);
  },
  async recordPaperScenario(...args) {
    const m = await getModule();
    return m.argusBacktestEngine.recordPaperScenario(...args);
  },
  async evaluatePaperScenarios(...args) {
    const m = await getModule();
    return m.argusBacktestEngine.evaluatePaperScenarios(...args);
  },
  async getCalibrationMetrics(...args) {
    const m = await getModule();
    return m.argusBacktestEngine.getCalibrationMetrics(...args);
  },
  get argusBacktestEngine() {
    return {
      runBacktest: (...args) => module.exports.runBacktest(...args),
      recordPaperScenario: (...args) => module.exports.recordPaperScenario(...args),
      evaluatePaperScenarios: (...args) => module.exports.evaluatePaperScenarios(...args),
      getCalibrationMetrics: (...args) => module.exports.getCalibrationMetrics(...args)
    };
  }
};
