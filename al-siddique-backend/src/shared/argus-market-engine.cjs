const dynamicImport = new Function('specifier', 'return import(specifier)');

let mPromise = null;
function getModule() {
  if (!mPromise) {
    mPromise = dynamicImport('./argus-market-engine.mjs');
  }
  return mPromise;
}

module.exports = {
  async getMarketSnapshot(symbol) {
    const m = await getModule();
    return m.argusMarketEngine.getMarketSnapshot(symbol);
  },
  async getTechnicalAnalysis(symbol) {
    const m = await getModule();
    return m.argusMarketEngine.getTechnicalAnalysis(symbol);
  },
  async generateTradeScenario(symbol, userQuery) {
    const m = await getModule();
    return m.argusMarketEngine.generateTradeScenario(symbol, userQuery);
  },
  async processMarketQuestion(userQuery, language, options) {
    const m = await getModule();
    return m.argusMarketEngine.processMarketQuestion(userQuery, language, options);
  },
  async processForwardMarketMission(...args) {
    const m = await getModule();
    return m.argusMarketEngine.processForwardMarketMission(...args);
  },
  async composeScenarioMessage(scenario, language) {
    const m = await getModule();
    return m.argusMarketEngine.composeScenarioMessage(scenario, language);
  },
  async getActiveMission(userId) {
    const m = await getModule();
    return m.argusMarketEngine.getActiveMission(userId);
  },
  async composeArgus7DeepDossier(data) {
    const m = await getModule();
    return m.argusMarketEngine.composeArgus7DeepDossier(data);
  },
  async closeActiveMission(userId) {
    const m = await getModule();
    return m.argusMarketEngine.closeActiveMission(userId);
  },
  async composeArgus71MarketRead(data) {
    const m = await getModule();
    return m.argusMarketEngine.composeArgus74MarketRead(data);
  },
  async composeArgus73MarketRead(data) {
    const m = await getModule();
    return m.argusMarketEngine.composeArgus74MarketRead(data);
  },
  async composeArgus74MarketRead(data) {
    const m = await getModule();
    return m.argusMarketEngine.composeArgus74MarketRead(data);
  },
  ARGUS_VERSION: '7.6.0',
  JARVIS_VERSION: '4.5.0',
  get argusMarketEngine() {
    return {
      getMarketSnapshot: (...args) => module.exports.getMarketSnapshot(...args),
      getTechnicalAnalysis: (...args) => module.exports.getTechnicalAnalysis(...args),
      generateTradeScenario: (...args) => module.exports.generateTradeScenario(...args),
      processMarketQuestion: (...args) => module.exports.processMarketQuestion(...args),
      processForwardMarketMission: (...args) => module.exports.processForwardMarketMission(...args),
      composeScenarioMessage: (...args) => module.exports.composeScenarioMessage(...args),
      getActiveMission: async (...args) => {
        const m = await getModule();
        return m.argusMarketEngine.getActiveMission(...args);
      },
      closeActiveMission: async (...args) => {
        const m = await getModule();
        return m.argusMarketEngine.closeActiveMission(...args);
      },
      composeArgus71MarketRead: (...args) => module.exports.composeArgus71MarketRead(...args),
      composeArgus73MarketRead: (...args) => module.exports.composeArgus73MarketRead(...args),
      composeArgus74MarketRead: (...args) => module.exports.composeArgus74MarketRead(...args)
    };
  }
};
