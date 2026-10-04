const HTTPS = /^https:\/\//i;
function hostAllowed(url, allowlist=''){
  try{const u=new URL(url);const allowed=String(allowlist||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);return HTTPS.test(url)&&allowed.includes(u.hostname.toLowerCase())}catch{return false}
}
export function connectorReadiness(env=process.env){
  const hermes={configured:Boolean(env.HERMES_API_URL),model:env.HERMES_MODEL||null};
  const ollama={configured:Boolean(env.OLLAMA_URL||env.OLLAMA_HOST||'http://127.0.0.1:11434'),local:true};
  const fred={configured:Boolean(env.FRED_API_KEY),seriesAllowlist:Boolean(env.ARGUS_FRED_SERIES)};
  const cftc={configured:Boolean(env.CFTC_GOLD_DATA_URL),official:Boolean(env.CFTC_GOLD_DATA_URL&&/^https:\/\/(www\.)?cftc\.gov\//i.test(env.CFTC_GOLD_DATA_URL))};
  const webhook={configured:Boolean(env.ALERT_WEBHOOK_URL),safe:Boolean(env.ALERT_WEBHOOK_URL&&hostAllowed(env.ALERT_WEBHOOK_URL,env.ALERT_WEBHOOK_ALLOWLIST))};
  const remoteBackup={configured:Boolean(env.REMOTE_BACKUP_DIR||env.OCI_BACKUP_TARGET)};
  const oracle={configured:Boolean(env.ORACLE_PUBLIC_HOST||env.ORACLE_CONTROL_URL),tls:Boolean((env.ORACLE_PUBLIC_HOST||env.ORACLE_CONTROL_URL||'').startsWith('https://'))};
  const blockers=[];
  if(cftc.configured&&!cftc.official)blockers.push('cftc_not_official_https');
  if(webhook.configured&&!webhook.safe)blockers.push('webhook_not_https_allowlisted');
  return {ok:blockers.length===0,blockers,hermes,ollama,fred,cftc,webhook,remoteBackup,oracle};
}
