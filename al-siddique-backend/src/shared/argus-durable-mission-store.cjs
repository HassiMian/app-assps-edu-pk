const dynamicImport = new Function('specifier', 'return import(specifier)');

let mPromise = null;
function getModule() {
  if (!mPromise) {
    mPromise = dynamicImport('./argus-durable-mission-store.mjs');
  }
  return mPromise;
}

module.exports = {
  async saveMission(...args) {
    const m = await getModule();
    return m.argusDurableMissionStore.saveMission(...args);
  },
  async getMission(...args) {
    const m = await getModule();
    return m.argusDurableMissionStore.getMission(...args);
  },
  async listMissions(...args) {
    const m = await getModule();
    return m.argusDurableMissionStore.listMissions(...args);
  },
  async getActiveMissions(...args) {
    const m = await getModule();
    return m.argusDurableMissionStore.getActiveMissions(...args);
  },
  async closeMission(...args) {
    const m = await getModule();
    return m.argusDurableMissionStore.closeMission(...args);
  },
  async getActiveMission(...args) {
    const m = await getModule();
    return m.argusDurableMissionStore.getActiveMission(...args);
  },
  async closeActiveMission(...args) {
    const m = await getModule();
    return m.argusDurableMissionStore.closeActiveMission(...args);
  },
  async logShadowSignal(...args) {
    const m = await getModule();
    return m.argusAppendOnlyShadowLedger.logShadowSignal(...args);
  },
  async appendOutcome(...args) {
    const m = await getModule();
    return m.argusAppendOnlyShadowLedger.appendOutcome(...args);
  },
  async getCalibrationMetrics(...args) {
    const m = await getModule();
    return m.argusAppendOnlyShadowLedger.getCalibrationMetrics(...args);
  },
  get argusDurableMissionStore() {
    return {
      saveMission: (...args) => module.exports.saveMission(...args),
      getMission: (...args) => module.exports.getMission(...args),
      listMissions: (...args) => module.exports.listMissions(...args),
      getActiveMissions: (...args) => module.exports.getActiveMissions(...args),
      getActiveMission: (...args) => module.exports.getActiveMission(...args),
      closeActiveMission: (...args) => module.exports.closeActiveMission(...args),
      closeMission: (...args) => module.exports.closeMission(...args)
    };
  },
  get argusAppendOnlyShadowLedger() {
    return {
      logShadowSignal: (...args) => module.exports.logShadowSignal(...args),
      appendOutcome: (...args) => module.exports.appendOutcome(...args),
      getCalibrationMetrics: (...args) => module.exports.getCalibrationMetrics(...args),
      getCalibrationReport: async (...args) => {
        const m = await getModule();
        return m.argusAppendOnlyShadowLedger.getCalibrationReport(...args);
      }
    };
  }
};
