/**
 * JARVIS ARGUS 7.2 — Automated Position Monitoring Worker (CommonJS Proxy)
 */
'use strict';

let _mjs;
async function _load() {
  if (!_mjs) _mjs = await import('./argus-monitoring-worker.mjs');
  return _mjs;
}

class ArgusMonitoringWorker {
  constructor() { this.name = 'ARGUS_Monitoring_Worker_7_2_CJS'; }
  async start() { const m = await _load(); return m.argusMonitoringWorker.start(); }
  async stop() { const m = await _load(); return m.argusMonitoringWorker.stop(); }
  async runMonitoringCycle(provider) { const m = await _load(); return m.argusMonitoringWorker.runMonitoringCycle(provider); }
  async getMonitoringStatus() { const m = await _load(); return m.argusMonitoringWorker.getMonitoringStatus(); }
  async formatAlertMessage(watch, review, evidence) { const m = await _load(); return m.argusMonitoringWorker.formatAlertMessage(watch, review, evidence); }
}

const argusMonitoringWorker = new ArgusMonitoringWorker();

module.exports = {
  ArgusMonitoringWorker,
  argusMonitoringWorker
};
