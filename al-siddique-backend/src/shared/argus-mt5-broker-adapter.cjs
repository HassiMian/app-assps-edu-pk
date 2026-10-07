const dynamicImport = new Function('specifier', 'return import(specifier)');

let mPromise = null;
function getModule() {
  if (!mPromise) {
    mPromise = dynamicImport('./argus-mt5-broker-adapter.mjs');
  }
  return mPromise;
}

module.exports = {
  async getAccountInfo(...args) {
    const m = await getModule();
    return m.argusMt5BrokerAdapter.getAccountInfo(...args);
  },
  async getLiveSymbolSpecs(...args) {
    const m = await getModule();
    return m.argusMt5BrokerAdapter.getLiveSymbolSpecs(...args);
  },
  async calculateLivePositionSize(...args) {
    const m = await getModule();
    return m.argusMt5BrokerAdapter.calculateLivePositionSize(...args);
  },
  async reconcileMarketData(...args) {
    const m = await getModule();
    return m.argusMt5BrokerAdapter.reconcileMarketData(...args);
  },
  async submitBrokerDemoOrder(...args) {
    const m = await getModule();
    return m.argusMt5BrokerAdapter.submitBrokerDemoOrder(...args);
  },
  async modifyPositionSLTP(...args) {
    const m = await getModule();
    return m.argusMt5BrokerAdapter.modifyPositionSLTP(...args);
  },
  async partialClosePosition(...args) {
    const m = await getModule();
    return m.argusMt5BrokerAdapter.partialClosePosition(...args);
  },
  async fullClosePosition(...args) {
    const m = await getModule();
    return m.argusMt5BrokerAdapter.fullClosePosition(...args);
  },
  async reconcileHistory(...args) {
    const m = await getModule();
    return m.argusMt5BrokerAdapter.reconcileHistory(...args);
  },
  async discoverTradableGoldSymbol(...args) {
    const m = await getModule();
    return m.argusMt5BrokerAdapter.discoverTradableGoldSymbol(...args);
  },
  async getBrokerCandles(...args) {
    const m = await getModule();
    return m.argusMt5BrokerAdapter.getBrokerCandles(...args);
  },
  async getExecutionAuthorityQuote(...args) {
    const m = await getModule();
    return m.argusMt5BrokerAdapter.getExecutionAuthorityQuote(...args);
  },
  get argusMt5BrokerAdapter() {
    return {
      getAccountInfo: (...args) => module.exports.getAccountInfo(...args),
      getLiveSymbolSpecs: (...args) => module.exports.getLiveSymbolSpecs(...args),
      calculateLivePositionSize: (...args) => module.exports.calculateLivePositionSize(...args),
      reconcileMarketData: (...args) => module.exports.reconcileMarketData(...args),
      submitBrokerDemoOrder: (...args) => module.exports.submitBrokerDemoOrder(...args),
      modifyPositionSLTP: (...args) => module.exports.modifyPositionSLTP(...args),
      partialClosePosition: (...args) => module.exports.partialClosePosition(...args),
      fullClosePosition: (...args) => module.exports.fullClosePosition(...args),
      reconcileHistory: (...args) => module.exports.reconcileHistory(...args),
      discoverTradableGoldSymbol: (...args) => module.exports.discoverTradableGoldSymbol(...args),
      getBrokerCandles: (...args) => module.exports.getBrokerCandles(...args),
      getExecutionAuthorityQuote: (...args) => module.exports.getExecutionAuthorityQuote(...args)
    };
  }
};
