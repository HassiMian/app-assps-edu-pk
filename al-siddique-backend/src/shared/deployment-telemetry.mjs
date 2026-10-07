export function edgeFreshness(edges=[],maxAgeMs=120000,nowMs=Date.now()){
  return edges.map(e=>{const age=Math.max(0,nowMs-Date.parse(e.updated_at||e.updatedAt||0));return {...e,ageMs:age,fresh:Number.isFinite(age)&&age<=maxAgeMs}})
}
export function deploymentHealth({edges=[],localHealth={},oracleMode=false,maxEdgeAgeMs=120000}={}){
  const e=edgeFreshness(edges,maxEdgeAgeMs);const stale=e.filter(x=>!x.fresh);const localBad=Object.entries(localHealth||{}).filter(([,v])=>v!==true).map(([k])=>k);const blockers=[];if(oracleMode&&(!e.length||stale.length))blockers.push('edge_heartbeat');if(localBad.length)blockers.push('local_services');return {ok:blockers.length===0,blockers,edges:e,localBad};
}
