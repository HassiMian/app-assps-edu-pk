import fs from 'node:fs';import path from 'node:path';
export function commissioningPlan({profile='local-only',hardware={},connectors={}}={}){const steps=[
 {id:'preflight',risk:1,automatic:true,command:'npm run preflight'},
 {id:'migrations',risk:2,automatic:true,command:'npm run migrate'},
 {id:'hardware-audit',risk:1,automatic:true,command:'npm run hardware:audit'},
 {id:'ollama-benchmark',risk:1,automatic:true,command:'npm run benchmark:ollama'},
 {id:'hermes-benchmark',risk:1,automatic:true,command:'npm run hermes:benchmark'},
 {id:'backup',risk:1,automatic:true,command:'npm run backup:encrypted'},
 {id:'restore-drill',risk:1,automatic:true,command:'npm run restore:drill'},
 {id:'tests',risk:1,automatic:true,command:'npm test'},
 {id:'sustained-load',risk:1,automatic:true,command:'npm run load:test'},
 {id:'deployment-evidence',risk:1,automatic:true,command:'npm run accept:v13'}];
 if(profile==='hybrid-oracle'||profile==='cloud-control')steps.push({id:'oracle-deploy',risk:3,automatic:false,approvalRequired:true,reason:'Requires operator-owned OCI credentials, network/TLS changes and explicit authorization.'});
 return {profile,hardwareTier:hardware.tier||'unknown',connectorReady:Boolean(connectors.ok),principle:'Commissioning may automate verification and local setup, but cannot self-grant credentials or bypass approval gates.',steps};}
export function writeCommissioningPlan(file,data){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(data,null,2));return file;}
