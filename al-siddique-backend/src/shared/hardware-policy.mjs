import os from 'node:os';
import {spawnSync} from 'node:child_process';

function gpuInfo(){
  const candidates = process.platform === 'win32'
    ? [['powershell',['-NoProfile','-Command','Get-CimInstance Win32_VideoController | Select-Object Name,AdapterRAM | ConvertTo-Json -Compress']]]
    : [['nvidia-smi',['--query-gpu=name,memory.total','--format=csv,noheader,nounits']],['lspci',[]]];
  for(const [cmd,args] of candidates){
    try{const r=spawnSync(cmd,args,{encoding:'utf8',timeout:2500});if(r.status===0&&String(r.stdout||'').trim())return String(r.stdout).trim();}catch{}
  }
  return '';
}
export function hardwareAudit(){
  const totalRam=os.totalmem(), freeRam=os.freemem(), cores=os.cpus()?.length||1;
  return {platform:process.platform,arch:process.arch,cpu:os.cpus()?.[0]?.model||'unknown',cores,totalRamBytes:totalRam,freeRamBytes:freeRam,totalRamGB:+(totalRam/1073741824).toFixed(2),freeRamGB:+(freeRam/1073741824).toFixed(2),gpu:gpuInfo()};
}
export function recommendModelPolicy(hw=hardwareAudit()){
  const ram=hw.totalRamGB;
  // Conservative recommendations intended to keep School OS responsive on shared hardware.
  if(ram < 6) return {tier:'very-low-memory',maxConcurrentInference:1,fast:'<=1.5B Q4',reasoning:'remote-or-queued',coding:'remote-or-queued',finance:'<=1.5B Q4',notes:['Do not keep a large model resident.','Prefer deterministic tools and remote optional fallback.']};
  if(ram < 10) return {tier:'low-memory',maxConcurrentInference:1,fast:'1.5B-3B Q4',reasoning:'3B Q4 sequential',coding:'3B Q4 sequential',finance:'3B Q4 sequential',notes:['Unload idle models.','Run backtests/video jobs off-hours.']};
  if(ram < 18) return {tier:'medium-memory',maxConcurrentInference:1,fast:'3B Q4',reasoning:'7B-9B Q4 sequential',coding:'7B Q4 sequential',finance:'7B Q4 sequential',notes:['Keep one model loaded at a time.']};
  return {tier:'higher-memory',maxConcurrentInference:1,fast:'3B-7B',reasoning:'7B-14B Q4',coding:'7B-14B Q4',finance:'7B-14B Q4',notes:['Still preserve one-heavy-job-at-a-time policy on a shared school machine.']};
}
