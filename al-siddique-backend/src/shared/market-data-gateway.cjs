const dynamicImport = new Function('specifier', 'return import(specifier)');

let mPromise = null;
function getModule() {
  if (!mPromise) {
    mPromise = dynamicImport('./market-data-gateway.mjs');
  }
  return mPromise;
}

module.exports = {
  async getReconciledQuote(symbol) {
    const m = await getModule();
    return m.marketDataGateway.getReconciledQuote(symbol);
  },
  async getMultiTimeframeCandles(symbol, timeframes) {
    const m = await getModule();
    return m.marketDataGateway.getMultiTimeframeCandles(symbol, timeframes);
  },
  get marketDataGateway() {
    return {
      getReconciledQuote: (...args) => module.exports.getReconciledQuote(...args),
      getMultiTimeframeCandles: (...args) => module.exports.getMultiTimeframeCandles(...args)
    };
  }
};
