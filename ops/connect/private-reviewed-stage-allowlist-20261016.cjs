'use strict';
// Read-only Node source-test gate. Never grants live auth or production deployment.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const cp=require('node:child_process');
const CURRENT='/root/workspace/apex-connect-eslint-full-source-reconcile-20261016';
const BUILD='SAsg3cC_el5cq2_nN2a46';
const COMMIT='9fcca4320bdbeb834f6494d1af82d82f1d9b818f';
const LINT='520ddbd1a0d347a8e3d12e2fce14c4a2ca8b700cb87cf93be3c65efb449b8b83';
function allowed(stage) {
 if(typeof stage!=='string'||!path.isAbsolute(stage))return false;
 if(stage.startsWith('/root/assps-release-candidates/'))
   return path.resolve(stage)===stage;
 if(stage!==CURRENT)return false;
 try {
  if(fs.readFileSync(path.join(stage,'.next/BUILD_ID'),'utf8').trim()!==BUILD)return false;
  const digest=crypto.createHash('sha256').update(fs.readFileSync(path.join(stage,'eslint.config.mjs'))).digest('hex');
  if(digest!==LINT)return false;
  const source=cp.execFileSync('git',['-C',stage,'rev-parse','HEAD'],{timeout:5000,encoding:'utf8'}).trim();
  return source===COMMIT;
 } catch {return false;}
}
module.exports={allowed};
