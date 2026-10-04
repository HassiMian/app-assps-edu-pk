const dynamicImport = new Function('specifier', 'return import(specifier)');

let mPromise = null;
function getModule() {
  if (!mPromise) {
    mPromise = dynamicImport('./immutable-trade-ledger.mjs');
  }
  return mPromise;
}

module.exports = {
  async reconstructStrategyTrades(...args) {
    const m = await getModule();
    return m.immutableTradeLedger.reconstructStrategyTrades(...args);
  },
  async getTradesByStrategy(...args) {
    const m = await getModule();
    return m.immutableTradeLedger.getTradesByStrategy(...args);
  },
  async getAllTrades(...args) {
    const m = await getModule();
    return m.immutableTradeLedger.getAllTrades(...args);
  },
  get immutableTradeLedger() {
    return {
      reconstructStrategyTrades: (...args) => module.exports.reconstructStrategyTrades(...args),
      getTradesByStrategy: (...args) => module.exports.getTradesByStrategy(...args),
      getAllTrades: (...args) => module.exports.getAllTrades(...args)
    };
  }
};
