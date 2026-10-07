import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
function sha(file){return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')}
function latestDir(root){if(!root||!fs.existsSync(root))return '';return fs.readdirSync(root,{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>path.join(root,x.name)).sort().at(-1)||''}
export function verifyRemoteBackupPair({localRoot,remoteRoot}){
  const local=latestDir(localRoot),remote=latestDir(remoteRoot);if(!local||!remote)return {ok:false,reason:'Local or remote backup directory missing',local,remote};
  const lm=path.join(local,'manifest.json'),rm=path.join(remote,'manifest.json');if(!fs.existsSync(lm)||!fs.existsSync(rm))return {ok:false,reason:'manifest.json missing',local,remote};
  const l=JSON.parse(fs.readFileSync(lm,'utf8')),r=JSON.parse(fs.readFileSync(rm,'utf8'));const wanted=new Map((l.files||[]).map(x=>[x.file,x]));const checks=[];
  for(const [name,meta] of wanted){const lf=path.join(local,name),rf=path.join(remote,name);checks.push({file:name,localExists:fs.existsSync(lf),remoteExists:fs.existsSync(rf),encryptedShaMatch:fs.existsSync(lf)&&fs.existsSync(rf)?sha(lf)===sha(rf):false,plainShaMatch:(r.files||[]).find(x=>x.file===name)?.plainSha256===meta.plainSha256});}
  const ok=checks.length>0&&checks.every(x=>x.localExists&&x.remoteExists&&x.encryptedShaMatch&&x.plainShaMatch);return {ok,local,remote,checks,localManifestSha:sha(lm),remoteManifestSha:sha(rm)};
}
