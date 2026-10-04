import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
export function buildEvidenceBundle(runtimeDir,{profileEvaluation,connectorReadiness,hardware,policy,drift,operations,restore,oracle,load}={}){
  fs.mkdirSync(runtimeDir,{recursive:true});
  const evidence={version:'13.0.0',generatedAt:new Date().toISOString(),profile:profileEvaluation||null,connectors:connectorReadiness||null,hardware:hardware||null,policy:policy||null,configDrift:drift||null,operations:operations||null,restore:restore||null,oracle:oracle||null,sustainedLoad:load||null};
  const blockers=[];
  if(profileEvaluation&&!profileEvaluation.ok)blockers.push(...profileEvaluation.errors);
  if(drift&&drift.ok===false)blockers.push('config_drift');
  if(operations&&['AT_RISK','CRITICAL','ATTENTION_REQUIRED'].includes(operations.status))blockers.push(`operations:${operations.status}`);
  if(profileEvaluation?.profile?.requires?.oracle&&oracle?.ready!==true)blockers.push('oracle_not_ready');
  if(profileEvaluation?.profile?.requires?.remoteBackup&&restore?.ok!==true)blockers.push('restore_evidence_missing_or_failed');
  evidence.blockers=[...new Set(blockers)];
  evidence.status=evidence.blockers.length?'BLOCKED':'DEPLOYABLE';
  const jsonPath=path.join(runtimeDir,'V13_DEPLOYMENT_EVIDENCE.json');
  fs.writeFileSync(jsonPath,JSON.stringify(evidence,null,2));
  const manifest={file:path.basename(jsonPath),sha256:hash(jsonPath),createdAt:new Date().toISOString()};
  fs.writeFileSync(path.join(runtimeDir,'V13_DEPLOYMENT_EVIDENCE.sha256.json'),JSON.stringify(manifest,null,2));
  return {...evidence,evidencePath:jsonPath,sha256:manifest.sha256};
}
