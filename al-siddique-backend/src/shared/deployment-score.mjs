export function deploymentScore({divisions={},resources={},drift={ok:true},connectors={ok:true},hermes={},policy={},openAlerts=0}={}){
  const weights={services:35,resource:15,drift:15,connectors:15,ai:10,alerts:10};
  const vals=Object.values(divisions||{});
  const online=vals.length?vals.filter(v=>v?.ok).length/vals.length:0;
  const used=Number(resources.usedRatio||0);
  const resourceScore=Math.max(0,Math.min(1,(0.9-used)/0.3));
  const aiScore=(policy?.ollamaChampion||hermes?.configured)?1:0.5;
  const alertScore=Math.max(0,1-Math.min(Number(openAlerts||0),10)/10);
  const score=Math.round(online*weights.services+resourceScore*weights.resource+(drift?.ok?1:0)*weights.drift+(connectors?.ok?1:0)*weights.connectors+aiScore*weights.ai+alertScore*weights.alerts);
  return {score,status:score>=90?'READY':score>=75?'GOOD':score>=55?'DEGRADED':'AT_RISK',components:{services:Math.round(online*100),resources:Math.round(resourceScore*100),drift:Boolean(drift?.ok),connectors:Boolean(connectors?.ok),ai:Boolean(policy?.ollamaChampion||hermes?.configured),openAlerts:Number(openAlerts||0)}};
}
