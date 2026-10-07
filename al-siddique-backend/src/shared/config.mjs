import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function loadEnv(file=path.join(ROOT,'.env')){
  if(!fs.existsSync(file)) return;
  for(const raw of fs.readFileSync(file,'utf8').split(/\r?\n/)){
    const line=raw.trim(); if(!line||line.startsWith('#')) continue;
    const i=line.indexOf('='); if(i<1) continue;
    const k=line.slice(0,i).trim(), v=line.slice(i+1).trim();
    if(process.env[k]===undefined) process.env[k]=v;
  }
}
export function validateSecrets(options = {}) {
  const isProduction = (process.env.NODE_ENV === 'production') || (process.env.JARVIS_MODE === 'production');
  const required = options.required || [];
  const missing = [];

  for (const key of required) {
    const val = process.env[key];
    if (!val || String(val).trim().length === 0) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    const err = `[Security] Startup validation: Missing required secrets (${missing.join(', ')}).`;
    if (isProduction || options.strict) {
      throw new Error(err);
    }
    return { ok: false, missing, error: err };
  }

  return { ok: true, missing: [] };
}

export function safeRedacted(val) {
  if (!val) return 'NOT_SET';
  const s = String(val);
  if (s.length <= 6) return '******';
  return `${s.slice(0, 3)}...${s.slice(-3)}`;
}

export {ROOT};
