const dynamicImport = new Function('specifier', 'return import(specifier)');

let mPromise = null;
function getModule() {
  if (!mPromise) {
    mPromise = dynamicImport('./argus-mt5-desktop-operator.mjs');
  }
  return mPromise;
}

module.exports = {
  async discoverTerminal(...args) {
    const m = await getModule();
    return m.argusMt5DesktopOperator.discoverTerminal(...args);
  },
  async calculatePositionSize(...args) {
    const m = await getModule();
    return m.argusMt5DesktopOperator.calculatePositionSize(...args);
  },
  async prepareTradeProposal(...args) {
    const m = await getModule();
    return m.argusMt5DesktopOperator.prepareTradeProposal(...args);
  },
  async executeDemoOrder(...args) {
    const m = await getModule();
    return m.argusMt5DesktopOperator.executeDemoOrder(...args);
  },
  async monitorDemoPositions(...args) {
    const m = await getModule();
    return m.argusMt5DesktopOperator.monitorDemoPositions(...args);
  },
  async closeDemoPosition(...args) {
    const m = await getModule();
    return m.argusMt5DesktopOperator.closeDemoPosition(...args);
  },
  async getJournalMetrics(...args) {
    const m = await getModule();
    return m.argusMt5DesktopOperator.getJournalMetrics(...args);
  },
  get argusMt5DesktopOperator() {
    return {
      discoverTerminal: (...args) => module.exports.discoverTerminal(...args),
      calculatePositionSize: (...args) => module.exports.calculatePositionSize(...args),
      prepareTradeProposal: (...args) => module.exports.prepareTradeProposal(...args),
      executeDemoOrder: (...args) => module.exports.executeDemoOrder(...args),
      monitorDemoPositions: (...args) => module.exports.monitorDemoPositions(...args),
      closeDemoPosition: (...args) => module.exports.closeDemoPosition(...args),
      getJournalMetrics: (...args) => module.exports.getJournalMetrics(...args)
    };
  }
};
