import path from 'node:path';import { ensureDir,openDb,now,id } from './lib.mjs';
export class ApprovalStore{
  constructor(dbPath){ensureDir(path.dirname(dbPath));this.db=openDb(dbPath,`CREATE TABLE IF NOT EXISTS approvals(id TEXT PRIMARY KEY,created_at TEXT,updated_at TEXT,division TEXT,action TEXT,risk_level INTEGER,status TEXT,payload_json TEXT,requested_by TEXT,decided_by TEXT,decision_note TEXT);`)}
  request({division,action,riskLevel=3,payload={},requestedBy='system'}){const aid=id('approval');this.db.prepare('INSERT INTO approvals VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(aid,now(),now(),division,action,riskLevel,'pending',JSON.stringify(payload),requestedBy,'','');return this.get(aid)}
  get(id){const r=this.db.prepare('SELECT * FROM approvals WHERE id=?').get(id);return r?{...r,payload:JSON.parse(r.payload_json||'{}')}:null}
  list(limit=100){return this.db.prepare('SELECT * FROM approvals ORDER BY created_at DESC LIMIT ?').all(Math.min(500,Number(limit)||100)).map(r=>({...r,payload:JSON.parse(r.payload_json||'{}')}))}
  decide(id,{approve,by='principal',note=''}){const r=this.get(id);if(!r)throw Object.assign(new Error('approval not found'),{status:404});if(r.status!=='pending')throw Object.assign(new Error('approval already decided'),{status:409});this.db.prepare('UPDATE approvals SET status=?,updated_at=?,decided_by=?,decision_note=? WHERE id=?').run(approve?'approved':'rejected',now(),by,String(note),id);return this.get(id)}
}
