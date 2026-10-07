const dynamicImport = new Function('specifier', 'return import(specifier)');

let mPromise = null;
function getModule() {
  if (!mPromise) {
    mPromise = dynamicImport('./argus-loop-discovery.mjs');
  }
  return mPromise;
}

module.exports = {
  async mineMarketLoops(...args) {
    const m = await getModule();
    return m.argusLoopDiscoveryEngine.mineMarketLoops(...args);
  },
  async matchLiveLoop(...args) {
    const m = await getModule();
    return m.argusLoopDiscoveryEngine.matchLiveLoop(...args);
  },
  get argusLoopDiscoveryEngine() {
    return {
      mineMarketLoops: (...args) => module.exports.mineMarketLoops(...args),
      matchLiveLoop: (...args) => module.exports.matchLiveLoop(...args)
    };
  }
};
