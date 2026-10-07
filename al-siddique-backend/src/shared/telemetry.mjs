import path from 'node:path';
import { ensureDir, openDb, now, id } from './lib.mjs';

export class TelemetryStore {
  constructor(dbPath, retentionDays=30){
    ensureDir(path.dirname(dbPath)); this.retentionDays=retentionDays;
    this.db=openDb(dbPath,`CREATE TABLE IF NOT EXISTS telemetry(
      id TEXT PRIMARY KEY, created_at TEXT NOT NULL, metric TEXT NOT NULL, division TEXT NOT NULL,
      value REAL, status TEXT NOT NULL, payload_json TEXT NOT NULL
    ); CREATE INDEX IF NOT EXISTS idx_telemetry_metric_time ON telemetry(metric,created_at);`);
  }
  record(metric,{division='system',value=null,status='ok',payload={}}={}){
    const rid=id('tel'); this.db.prepare('INSERT INTO telemetry VALUES(?,?,?,?,?,?,?)').run(rid,now(),metric,division,value,status,JSON.stringify(payload)); return rid;
  }
  recent({metric='',division='',limit=200}={}){
    const clauses=[], args=[]; if(metric){clauses.push('metric=?');args.push(metric)} if(division){clauses.push('division=?');args.push(division)}
    const sql=`SELECT * FROM telemetry ${clauses.length?'WHERE '+clauses.join(' AND '):''} ORDER BY created_at DESC LIMIT ?`; args.push(Math.min(2000,Number(limit)||200));
    return this.db.prepare(sql).all(...args).map(r=>({...r,payload:JSON.parse(r.payload_json||'{}')}));
  }
  prune(){ const cutoff=new Date(Date.now()-this.retentionDays*86400000).toISOString(); return this.db.prepare('DELETE FROM telemetry WHERE created_at < ?').run(cutoff).changes; }
}
