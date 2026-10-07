import { timingSafeEqual } from 'node:crypto';
import { bearer } from './lib.mjs';

function safeEq(a,b){const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));return x.length===y.length&&x.length>0&&timingSafeEqual(x,y);}
export function tokenRegistry(){
  const master=process.env.JARVIS_SERVICE_TOKEN||'';
  return {
    master:{token:master,scopes:['*']},
    controller:{token:process.env.JARVIS_CONTROLLER_TOKEN||master,scopes:['status:read','events:read','events:write','route:execute','brief:read','arena:run','approval:read','approval:write']},
    school:{token:process.env.JARVIS_SCHOOL_TOKEN||master,scopes:['school:read','school:operate']},
    growth:{token:process.env.JARVIS_GROWTH_TOKEN||master,scopes:['growth:read','growth:operate','events:write']},
    argus:{token:process.env.JARVIS_ARGUS_TOKEN||master,scopes:['argus:read','argus:research','events:write']},
    security:{token:process.env.JARVIS_SECURITY_TOKEN||master,scopes:['security:read','security:scan','events:write']},
    model:{token:process.env.JARVIS_MODEL_TOKEN||master,scopes:['status:read','arena:run','model:generate']},
    edge:{token:process.env.JARVIS_EDGE_TOKEN||'',scopes:['cloud:edge']}
  };
}
export function authorize(req,needed=[]){
  const presented=bearer(req);if(!presented)throw Object.assign(new Error('Unauthorized'),{status:401});
  const entries=Object.entries(tokenRegistry()).filter(([,v])=>v.token&&safeEq(presented,v.token));
  if(!entries.length)throw Object.assign(new Error('Unauthorized'),{status:401});
  const [principal,rec]=entries[0];const ok=rec.scopes.includes('*')||needed.every(s=>rec.scopes.includes(s));
  if(!ok)throw Object.assign(new Error(`Forbidden: missing scope ${needed.join(',')}`),{status:403});
  return {principal,scopes:rec.scopes};
}
export function serviceToken(name){const r=tokenRegistry()[name];return r?.token||process.env.JARVIS_SERVICE_TOKEN||'';}
