const ranks={low:1,medium:2,high:3,critical:4};
export function escalationPlan(alert,{nowMs=Date.now()}={}){
  const sev=String(alert?.severity||'medium').toLowerCase();
  const age=Math.max(0,nowMs-Date.parse(alert?.created_at||alert?.createdAt||new Date().toISOString()));
  const stages=[{channel:'local',role:'operator',afterMs:0}];
  if(ranks[sev]>=3)stages.push({channel:'webhook',role:'principal',afterMs:sev==='critical'?0:5*60_000});
  else if(sev==='medium')stages.push({channel:'webhook',role:'operations',afterMs:30*60_000});
  else stages.push({channel:'webhook',role:'operations',afterMs:2*60*60_000});
  return stages.filter(s=>age>=s.afterMs).map(s=>({...s,severity:sev}));
}
export function shouldEscalate(alert,opts){return escalationPlan(alert,opts).length>0}
