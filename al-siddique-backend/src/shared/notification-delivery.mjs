import fs from 'node:fs';import path from 'node:path';import {ensureDir,openDb,now,id} from './lib.mjs';
function allowedWebhook(url){try{const u=new URL(url);if(u.protocol!=='https:')return false;const hosts=String(process.env.JARVIS_NOTIFICATION_ALLOWED_HOSTS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);return hosts.includes(u.hostname.toLowerCase())}catch{return false}}
export class NotificationOutbox{
  constructor(dbPath){ensureDir(path.dirname(dbPath));this.db=openDb(dbPath,`CREATE TABLE IF NOT EXISTS notification_outbox(
    id TEXT PRIMARY KEY,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,dedupe_key TEXT NOT NULL,alert_id TEXT NOT NULL,
    channel TEXT NOT NULL,target TEXT NOT NULL,status TEXT NOT NULL,attempt INTEGER NOT NULL DEFAULT 0,max_attempts INTEGER NOT NULL DEFAULT 4,
    next_attempt_at TEXT NOT NULL DEFAULT '',payload_json TEXT NOT NULL,last_error TEXT NOT NULL DEFAULT ''
  ); CREATE UNIQUE INDEX IF NOT EXISTS idx_notify_dedupe ON notification_outbox(dedupe_key);`)}
  enqueue({alertId='',channel='local',target='operations',payload={},maxAttempts=4}){const key=`${alertId}:${channel}:${target}`;const existing=this.db.prepare('SELECT * FROM notification_outbox WHERE dedupe_key=?').get(key);if(existing)return this.#map(existing);const nid=id('notify'),ts=now();this.db.prepare('INSERT INTO notification_outbox VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run(nid,ts,ts,key,alertId,channel,target,'queued',0,Math.max(1,Math.min(8,Number(maxAttempts)||4)),'',JSON.stringify(payload),'');return this.get(nid)}
  due(limit=50){return this.db.prepare("SELECT * FROM notification_outbox WHERE status IN ('queued','retry') AND (next_attempt_at='' OR next_attempt_at<=?) ORDER BY created_at LIMIT ?").all(now(),Math.min(200,Number(limit)||50)).map(r=>this.#map(r))}
  get(nid){const r=this.db.prepare('SELECT * FROM notification_outbox WHERE id=?').get(nid);return r?this.#map(r):null}
  markSuccess(nid){this.db.prepare("UPDATE notification_outbox SET status='delivered',attempt=attempt+1,updated_at=?,last_error='' WHERE id=?").run(now(),nid);return this.get(nid)}
  markFailure(nid,error){const r=this.get(nid);if(!r)return null;const attempt=r.attempt+1;if(attempt>=r.max_attempts){this.db.prepare("UPDATE notification_outbox SET status='dead',attempt=?,updated_at=?,last_error=? WHERE id=?").run(attempt,now(),String(error||''),nid)}else{const delay=Math.min(15*60_000,5000*(2**Math.max(0,attempt-1)));this.db.prepare("UPDATE notification_outbox SET status='retry',attempt=?,updated_at=?,last_error=?,next_attempt_at=? WHERE id=?").run(attempt,now(),String(error||''),new Date(Date.now()+delay).toISOString(),nid)}return this.get(nid)}
  list(limit=100){return this.db.prepare('SELECT * FROM notification_outbox ORDER BY created_at DESC LIMIT ?').all(Math.min(500,Number(limit)||100)).map(r=>this.#map(r))}
  #map(r){return {...r,payload:JSON.parse(r.payload_json||'{}')}}
}
export async function deliverNotification(item,{runtimeDir='runtime'}={}){
  if(item.channel==='local'){ensureDir(runtimeDir);const file=path.join(runtimeDir,'notifications.jsonl');fs.appendFileSync(file,JSON.stringify({at:now(),target:item.target,alertId:item.alert_id,payload:item.payload})+'\n');return {ok:true,method:'local-log',file}}
  if(item.channel==='webhook'){
    const url=String(process.env.JARVIS_NOTIFICATION_WEBHOOK_URL||'');if(!url)return {ok:false,error:'Webhook URL is not configured'};if(!allowedWebhook(url))return {ok:false,error:'Webhook host is not in JARVIS_NOTIFICATION_ALLOWED_HOSTS or URL is not HTTPS'};
    const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),5000);try{const headers={'content-type':'application/json'};const tok=String(process.env.JARVIS_NOTIFICATION_WEBHOOK_TOKEN||'');if(tok)headers.authorization=`Bearer ${tok}`;const r=await fetch(url,{method:'POST',headers,body:JSON.stringify({target:item.target,alertId:item.alert_id,payload:item.payload}),signal:ctrl.signal});if(!r.ok)return {ok:false,error:`Webhook HTTP ${r.status}`};return {ok:true,method:'https-webhook',status:r.status}}catch(e){return {ok:false,error:e?.message||String(e)}}finally{clearTimeout(timer)}
  }
  return {ok:false,error:`Unsupported notification channel: ${item.channel}`};
}
