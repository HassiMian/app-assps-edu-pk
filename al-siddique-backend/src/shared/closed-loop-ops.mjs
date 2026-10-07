import path from 'node:path';
import { ensureDir, openDb, now, id } from './lib.mjs';

export function scoreHealth({divisions={},resources={},configDrift={},pendingApprovals=0,restore={}}={}){
  let score=100; const findings=[];
  for(const [name,state] of Object.entries(divisions||{})){
    const ok=Boolean(state?.ok ?? state?.status?.ok ?? !state?.error);
    if(!ok){score-=18;findings.push({severity:'high',code:`${name.toUpperCase()}_UNHEALTHY`,message:`${name} service is unhealthy or unreachable.`});}
  }
  const mem=Number(resources?.usedRatio ?? resources?.memoryRatio ?? resources?.memory?.ratio ?? 0);
  if(mem>=0.9){score-=20;findings.push({severity:'critical',code:'MEMORY_CRITICAL',message:'Memory pressure >= 90%.'});}
  else if(mem>=0.8){score-=10;findings.push({severity:'medium',code:'MEMORY_HIGH',message:'Memory pressure >= 80%.'});}
  if(configDrift?.ok===false){score-=15;findings.push({severity:'high',code:'CONFIG_DRIFT',message:'Critical configuration drift detected.'});}
  if(Number(pendingApprovals)>20){score-=5;findings.push({severity:'low',code:'APPROVAL_BACKLOG',message:'Approval backlog is above 20 items.'});}
  if(restore?.status==='FAILED'){score-=15;findings.push({severity:'high',code:'RESTORE_DRILL_FAILED',message:'Latest restore verification failed.'});}
  score=Math.max(0,Math.min(100,score));
  const band=score>=90?'HEALTHY':score>=75?'DEGRADED':score>=50?'AT_RISK':'CRITICAL';
  return {score,band,findings};
}

export class RemediationStore{
  constructor(dbPath){ensureDir(path.dirname(dbPath));this.db=openDb(dbPath,`CREATE TABLE IF NOT EXISTS remediation_proposals(
    id TEXT PRIMARY KEY,created_at TEXT,updated_at TEXT,source_event TEXT,division TEXT,action TEXT,risk_level INTEGER,status TEXT,evidence_json TEXT,plan_json TEXT,approval_id TEXT,verification_json TEXT
  );`)}
  create({sourceEvent='',division='system',action,riskLevel=2,evidence={},plan={}}){const rid=id('rem');this.db.prepare('INSERT INTO remediation_proposals VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(rid,now(),now(),sourceEvent,division,action,riskLevel,'proposed',JSON.stringify(evidence),JSON.stringify(plan),'',JSON.stringify({}));return this.get(rid)}
  get(rid){const r=this.db.prepare('SELECT * FROM remediation_proposals WHERE id=?').get(rid);return r?this.#map(r):null}
  list(limit=100){return this.db.prepare('SELECT * FROM remediation_proposals ORDER BY created_at DESC LIMIT ?').all(Math.min(500,Number(limit)||100)).map(r=>this.#map(r))}
  linkApproval(rid,aid){this.db.prepare('UPDATE remediation_proposals SET approval_id=?,status=?,updated_at=? WHERE id=?').run(aid,'awaiting_approval',now(),rid);return this.get(rid)}
  mark(rid,status,verification={}){this.db.prepare('UPDATE remediation_proposals SET status=?,verification_json=?,updated_at=? WHERE id=?').run(status,JSON.stringify(verification),now(),rid);return this.get(rid)}
  #map(r){return {...r,evidence:JSON.parse(r.evidence_json||'{}'),plan:JSON.parse(r.plan_json||'{}'),verification:JSON.parse(r.verification_json||'{}')}}
}

export function playbookForEvent(evt={}){
  const topic=String(evt.topic||''); const payload=evt.payload||{};
  if(topic==='system.memory_pressure' || payload.code==='MEMORY_CRITICAL') return {division:'system',action:'defer_heavy_jobs',riskLevel:1,autoSafe:true,plan:{steps:['pause new heavy jobs','keep school/controller responsive','recheck memory after cooldown']}};
  if(topic==='system.service_failed') return {division:payload.service||'system',action:'restart_failed_service',riskLevel:2,autoSafe:false,plan:{steps:['capture failure evidence','restart with bounded backoff','verify /health','journal result']}};
  if(topic==='system.config_drift') return {division:'system',action:'restore_known_config_or_review_change',riskLevel:3,autoSafe:false,plan:{steps:['freeze high-impact changes','compare baseline hash','require Principal review','restore only approved known-good config']}};
  if(topic==='backup.restore_failed') return {division:'system',action:'investigate_backup_integrity',riskLevel:3,autoSafe:false,plan:{steps:['stop backup rotation','preserve failed artifact','run integrity diagnostics','require approval before restore action']}};
  if(topic==='growth.campaign_underperforming') return {division:'growth',action:'propose_campaign_experiment',riskLevel:1,autoSafe:true,plan:{steps:['analyze funnel','propose one controlled experiment','do not increase spend without approval']}};
  if(topic==='argus.regime_changed') return {division:'argus',action:'refresh_research_snapshot',riskLevel:1,autoSafe:true,plan:{steps:['refresh research snapshot','check strategy eligibility','remain paper/research only']}};
  return null;
}
