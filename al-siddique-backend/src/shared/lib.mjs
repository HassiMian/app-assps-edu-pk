import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdirSync, existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

export function ensureDir(p){ if(!existsSync(p)) mkdirSync(p,{recursive:true}); }
export function now(){ return new Date().toISOString(); }
export function sha256(v){ return createHash('sha256').update(String(v)).digest('hex'); }
export function json(res,status,payload,extra={}){ const body=JSON.stringify(payload); res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-frame-options':'DENY',...extra}); res.end(body); }
export function text(res,status,body,type='text/plain; charset=utf-8'){ res.writeHead(status,{'content-type':type,'cache-control':'no-store','x-content-type-options':'nosniff','x-frame-options':'DENY'}); res.end(body); }
export async function readBody(req,max=256_000){ let size=0, chunks=[]; for await(const c of req){ size+=c.length; if(size>max) throw Object.assign(new Error('Request too large'),{status:413}); chunks.push(c); } if(!chunks.length) return {}; try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw Object.assign(new Error('Invalid JSON'),{status:400});} }
export function bearer(req){ const h=String(req.headers.authorization||''); return h.startsWith('Bearer ')?h.slice(7):''; }
export function requireToken(req, token){ if(!token) throw Object.assign(new Error('Service token is not configured'),{status:503}); const a=Buffer.from(bearer(req)), b=Buffer.from(token); if(a.length!==b.length || !timingSafeEqual(a,b)) throw Object.assign(new Error('Unauthorized'),{status:401}); }
export function openDb(path, ddl=''){ const db=new DatabaseSync(path); if(ddl) db.exec(ddl); return db; }
export function id(prefix='job'){ return `${prefix}_${Date.now().toString(36)}_${randomBytes(4).toString('hex')}`; }
export function safeError(e){ return String(e?.message||e||'Unknown error').slice(0,800); }
export async function fetchJson(url, options={}, timeoutMs=5000){ const r=await fetch(url,{...options,signal:AbortSignal.timeout(timeoutMs)}); const t=await r.text(); let data={}; try{data=t?JSON.parse(t):{};}catch{data={raw:t};} if(!r.ok){const e=new Error(data.error||data.message||`${r.status} ${r.statusText}`); e.status=r.status; throw e;} return data; }
export class PriorityQueue{
  constructor({concurrency=1}={}){this.concurrency=concurrency;this.active=0;this.items=[];this.seq=0;}
  add(fn,{priority=50,label='job'}={}){return new Promise((resolve,reject)=>{this.items.push({fn,priority,label,seq:this.seq++,resolve,reject});this.items.sort((a,b)=>a.priority-b.priority||a.seq-b.seq);this.pump();});}
  async pump(){while(this.active<this.concurrency&&this.items.length){const item=this.items.shift();this.active++;Promise.resolve().then(item.fn).then(item.resolve,item.reject).finally(()=>{this.active--;this.pump();});}}
  snapshot(){return {active:this.active,queued:this.items.length,next:this.items[0]?.label||null};}
}
export function localhostOnly(req){ const ip=req.socket.remoteAddress||''; return ip==='127.0.0.1'||ip==='::1'||ip==='::ffff:127.0.0.1'; }
