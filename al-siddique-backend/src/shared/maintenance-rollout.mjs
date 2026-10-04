import path from 'node:path';
import {ensureDir,openDb,now,id} from './lib.mjs';

export class MaintenanceStore{
  constructor(dbPath){ensureDir(path.dirname(dbPath));this.db=openDb(dbPath,`CREATE TABLE IF NOT EXISTS maintenance_windows(id TEXT PRIMARY KEY,created_at TEXT,starts_at TEXT,ends_at TEXT,title TEXT,status TEXT,scope TEXT,note TEXT);`)}
  create({title='Maintenance',startsAt,endsAt,scope='system',note=''}){if(!startsAt||!endsAt||Date.parse(endsAt)<=Date.parse(startsAt))throw Object.assign(new Error('valid startsAt/endsAt required'),{status:400});const mid=id('maint');this.db.prepare('INSERT INTO maintenance_windows VALUES(?,?,?,?,?,?,?,?)').run(mid,now(),startsAt,endsAt,title,'scheduled',scope,note);return this.get(mid)}
  get(mid){return this.db.prepare('SELECT * FROM maintenance_windows WHERE id=?').get(mid)||null}
  list(limit=100){return this.db.prepare('SELECT * FROM maintenance_windows ORDER BY starts_at DESC LIMIT ?').all(Math.min(500,Number(limit)||100))}
  active(at=Date.now()){return this.list(500).filter(x=>x.status==='scheduled'&&Date.parse(x.starts_at)<=at&&Date.parse(x.ends_at)>=at)}
  cancel(mid){this.db.prepare("UPDATE maintenance_windows SET status='cancelled' WHERE id=? AND status='scheduled'").run(mid);return this.get(mid)}
}

export class RolloutStore{
  constructor(dbPath){ensureDir(path.dirname(dbPath));this.db=openDb(dbPath,`CREATE TABLE IF NOT EXISTS rollouts(id TEXT PRIMARY KEY,created_at TEXT,updated_at TEXT,version TEXT,status TEXT,stage INTEGER,stages_json TEXT,snapshot_path TEXT,note TEXT);`)}
  create({version,stages=['preflight','canary','full'],snapshotPath='',note=''}){if(!version)throw Object.assign(new Error('version required'),{status:400});const rid=id('rollout'),ts=now();this.db.prepare('INSERT INTO rollouts VALUES(?,?,?,?,?,?,?,?,?)').run(rid,ts,ts,version,'planned',0,JSON.stringify(stages),snapshotPath,note);return this.get(rid)}
  get(rid){const r=this.db.prepare('SELECT * FROM rollouts WHERE id=?').get(rid);return r?{...r,stages:JSON.parse(r.stages_json||'[]')}:null}
  list(limit=100){return this.db.prepare('SELECT * FROM rollouts ORDER BY created_at DESC LIMIT ?').all(Math.min(500,Number(limit)||100)).map(r=>({...r,stages:JSON.parse(r.stages_json||'[]')}))}
  advance(rid,{healthOk=false,note=''}){const r=this.get(rid);if(!r)throw Object.assign(new Error('rollout not found'),{status:404});if(!healthOk)throw Object.assign(new Error('health gate failed'),{status:409});const next=Math.min(r.stage+1,r.stages.length);const status=next>=r.stages.length?'completed':'running';this.db.prepare('UPDATE rollouts SET stage=?,status=?,updated_at=?,note=? WHERE id=?').run(next,status,now(),note||r.note,rid);return this.get(rid)}
  rollback(rid,{verified=false,note=''}){const r=this.get(rid);if(!r)throw Object.assign(new Error('rollout not found'),{status:404});if(!verified||!r.snapshot_path)throw Object.assign(new Error('verified snapshot required'),{status:409});this.db.prepare("UPDATE rollouts SET status='rolled_back',updated_at=?,note=? WHERE id=?").run(now(),note||'rollback verified',rid);return this.get(rid)}
}
