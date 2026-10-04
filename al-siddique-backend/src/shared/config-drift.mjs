import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {ROOT} from './config.mjs';
const WATCH=['package.json','.env.example','controller/server.mjs','model-gateway/server.mjs','growth/server.mjs','argus/server.mjs','security/server.mjs','shared/authz.mjs','shared/resource-governor.mjs'];
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
export function currentDriftSnapshot(){const files={};for(const rel of WATCH){const p=path.join(ROOT,rel);if(fs.existsSync(p))files[rel]=sha(p)}return {at:new Date().toISOString(),files}}
export function baselinePath(){return path.join(ROOT,'runtime','config-baseline.json')}
export function writeDriftBaseline(){const s=currentDriftSnapshot();fs.mkdirSync(path.dirname(baselinePath()),{recursive:true});fs.writeFileSync(baselinePath(),JSON.stringify(s,null,2));return s}
export function checkConfigDrift(){let base=null;try{base=JSON.parse(fs.readFileSync(baselinePath(),'utf8'))}catch{}const now=currentDriftSnapshot();if(!base)return {ok:false,status:'NO_BASELINE',changed:[],current:now};const changed=[];for(const k of new Set([...Object.keys(base.files||{}),...Object.keys(now.files||{})]))if(base.files?.[k]!==now.files?.[k])changed.push(k);return {ok:changed.length===0,status:changed.length?'DRIFT_DETECTED':'CLEAN',changed,baselineAt:base.at,checkedAt:now.at};}
