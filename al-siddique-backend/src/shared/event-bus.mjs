import { EventEmitter } from 'node:events';
import path from 'node:path';
import { ensureDir, openDb, now } from './lib.mjs';

export class EventBus {
  constructor({dbPath}){
    ensureDir(path.dirname(dbPath));
    this.ee=new EventEmitter();
    this.ee.setMaxListeners(100);
    this.db=openDb(dbPath,`CREATE TABLE IF NOT EXISTS events(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      at TEXT NOT NULL,
      topic TEXT NOT NULL,
      source TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'info',
      correlation_id TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL DEFAULT '{}'
    ); CREATE INDEX IF NOT EXISTS idx_events_topic_at ON events(topic,at DESC);`);
  }
  publish(topic,payload={},meta={}){
    const evt={at:now(),topic:String(topic),source:String(meta.source||'unknown'),severity:String(meta.severity||'info'),correlationId:String(meta.correlationId||''),payload};
    this.db.prepare('INSERT INTO events(at,topic,source,severity,correlation_id,payload_json) VALUES(?,?,?,?,?,?)').run(evt.at,evt.topic,evt.source,evt.severity,evt.correlationId,JSON.stringify(payload));
    this.ee.emit(topic,evt);this.ee.emit('*',evt);return evt;
  }
  subscribe(topic,fn){this.ee.on(topic,fn);return()=>this.ee.off(topic,fn);}
  recent(limit=100){return this.db.prepare('SELECT * FROM events ORDER BY id DESC LIMIT ?').all(Math.max(1,Math.min(500,Number(limit)||100))).map(r=>({...r,payload:JSON.parse(r.payload_json||'{}')}));}
}
