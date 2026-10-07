import fs from 'node:fs';import path from 'node:path';import {openDb,now} from './lib.mjs';
export function runMigrations(dbPath, migrations=[]){
  fs.mkdirSync(path.dirname(dbPath),{recursive:true});const db=openDb(dbPath,'CREATE TABLE IF NOT EXISTS _jarvis_migrations(id TEXT PRIMARY KEY,applied_at TEXT NOT NULL,checksum TEXT NOT NULL);');
  try {
    const applied=[];for(const m of migrations){const old=db.prepare('SELECT checksum FROM _jarvis_migrations WHERE id=?').get(m.id);if(old){if(old.checksum!==m.checksum)throw new Error(`Migration checksum mismatch: ${m.id}`);continue;}db.exec('BEGIN IMMEDIATE');try{db.exec(m.sql);db.prepare('INSERT INTO _jarvis_migrations(id,applied_at,checksum) VALUES(?,?,?)').run(m.id,now(),m.checksum);db.exec('COMMIT');applied.push(m.id);}catch(e){try{db.exec('ROLLBACK')}catch{}throw e;}}
    return applied;
  } finally {
    db.close();
  }
}
