import path from 'node:path';
import { ensureDir, openDb, now, id } from './lib.mjs';

export class AlertStore {
  constructor(dbPath){ensureDir(path.dirname(dbPath));this.db=openDb(dbPath,`CREATE TABLE IF NOT EXISTS alerts(
    id TEXT PRIMARY KEY,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,dedupe_key TEXT NOT NULL,severity TEXT NOT NULL,
    division TEXT NOT NULL,title TEXT NOT NULL,message TEXT NOT NULL,status TEXT NOT NULL,occurrences INTEGER NOT NULL DEFAULT 1,
    last_seen_at TEXT NOT NULL,ack_by TEXT NOT NULL DEFAULT '',payload_json TEXT NOT NULL
  ); CREATE INDEX IF NOT EXISTS idx_alerts_dedupe ON alerts(dedupe_key,status);`)}
  raise({dedupeKey,severity='medium',division='system',title,message,payload={}}){
    const existing=this.db.prepare("SELECT * FROM alerts WHERE dedupe_key=? AND status IN ('open','acknowledged') ORDER BY created_at DESC LIMIT 1").get(dedupeKey);
    if(existing){this.db.prepare('UPDATE alerts SET occurrences=occurrences+1,last_seen_at=?,updated_at=?,severity=?,message=?,payload_json=? WHERE id=?').run(now(),now(),severity,message,JSON.stringify(payload),existing.id);return this.get(existing.id)}
    const aid=id('alert'),ts=now();this.db.prepare('INSERT INTO alerts VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run(aid,ts,ts,dedupeKey,severity,division,title,message,'open',1,ts,'',JSON.stringify(payload));return this.get(aid)
  }
  get(aid){const r=this.db.prepare('SELECT * FROM alerts WHERE id=?').get(aid);return r?this.#map(r):null}
  list({status='',limit=100}={}){const rows=status?this.db.prepare('SELECT * FROM alerts WHERE status=? ORDER BY updated_at DESC LIMIT ?').all(status,limit):this.db.prepare('SELECT * FROM alerts ORDER BY updated_at DESC LIMIT ?').all(limit);return rows.map(r=>this.#map(r))}
  acknowledge(aid,by='operator'){this.db.prepare("UPDATE alerts SET status='acknowledged',ack_by=?,updated_at=? WHERE id=?").run(by,now(),aid);return this.get(aid)}
  resolve(aid,payload={}){this.db.prepare("UPDATE alerts SET status='resolved',updated_at=?,payload_json=? WHERE id=?").run(now(),JSON.stringify(payload),aid);return this.get(aid)}
  #map(r){return {...r,payload:JSON.parse(r.payload_json||'{}')}}
}

export function alertsFromHealth(health={}){
  return (health.findings||[]).map(f=>({dedupeKey:`health:${f.code}`,severity:f.severity||'medium',division:'system',title:f.code,message:f.message,payload:f}));
}
