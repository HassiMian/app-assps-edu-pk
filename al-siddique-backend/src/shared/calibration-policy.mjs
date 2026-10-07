import fs from 'node:fs';
import path from 'node:path';
import {ROOT} from './config.mjs';
import {hardwareAudit,recommendModelPolicy} from './hardware-policy.mjs';

function readJson(name){const p=path.join(ROOT,'runtime',name);try{return JSON.parse(fs.readFileSync(p,'utf8'))}catch{return null}}
function validModelRows(report){return Array.isArray(report?.results)?report.results.filter(r=>r?.model&&Number(r.score)>=1):[]}
export function deriveCalibrationPolicy(){
  const hw=readJson('hardware-audit.json')||hardwareAudit();
  const base=recommendModelPolicy(hw);
  const bench=readJson('ollama-benchmark.json');
  const load=readJson('sustained-load.json');
  const hermes=readJson('hermes-benchmark.json');
  const rows=validModelRows(bench).sort((a,b)=>(b.score-a.score)||((a.avgMs??1e9)-(b.avgMs??1e9)));
  const champion=bench?.champion||rows[0]?.model||null;
  const lowMemory=Number(hw.totalRamGB||0)<10;
  const loadHealthy=load?load.successRate>=0.95:true;
  const p95=Number(load?.latencyMs?.p95||0);
  const memorySoft=lowMemory?0.72:0.78;
  const memoryHard=lowMemory?0.84:0.88;
  const cpuSoft=load&&Number(load.system?.maxLoad)>Number(hw.cores||1)*0.9?0.72:0.82;
  const roles={fast:champion,reasoning:champion,coding:champion,finance:champion,vision:null};
  const policy={
    generatedAt:new Date().toISOString(),version:1,source:{hardware:Boolean(hw),ollama:Boolean(bench),load:Boolean(load),hermes:Boolean(hermes)},
    hardwareTier:base.tier,maxConcurrentInference:1,memorySoft,memoryHard,cpuSoft,
    models:roles,ollamaChampion:champion,hermesPreferred:Boolean(hermes?.available&&hermes?.passRate>=0.8),
    loadHealthy,p95Ms:p95||null,heavyJobsOffHours:lowMemory||!loadHealthy||(p95>2500),
    notes:[...base.notes, champion?`Ollama champion: ${champion}`:'No validated Ollama champion yet.', loadHealthy?'Sustained load acceptable.':'Sustained-load evidence is below acceptance threshold.']
  };
  return policy;
}
export function saveCalibrationPolicy(file=path.join(ROOT,'runtime','active-policy.json')){const policy=deriveCalibrationPolicy();fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(policy,null,2));return policy}
export function loadCalibrationPolicy(){return readJson('active-policy.json')||deriveCalibrationPolicy()}
