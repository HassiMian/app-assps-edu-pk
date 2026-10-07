import { fetchJson, safeError } from './lib.mjs';

const DEFAULT_FRED_SERIES = new Set(['DGS10','DFII10','T10YIE','DTWEXBGS','FEDFUNDS','CPIAUCSL','UNRATE']);
export async function fetchFredSeries({seriesId,apiKey,startDate='',endDate=''}={}){
  const id=String(seriesId||'').trim().toUpperCase();
  const allow=new Set(String(process.env.ARGUS_FRED_SERIES||'').split(',').map(x=>x.trim().toUpperCase()).filter(Boolean));
  const whitelist=allow.size?allow:DEFAULT_FRED_SERIES;
  if(!whitelist.has(id))throw Object.assign(new Error(`FRED series not allowlisted: ${id}`),{status:403});
  const key=apiKey||process.env.FRED_API_KEY||'';if(!key)throw Object.assign(new Error('FRED_API_KEY is not configured'),{status:503});
  const u=new URL('https://api.stlouisfed.org/fred/series/observations');u.searchParams.set('series_id',id);u.searchParams.set('api_key',key);u.searchParams.set('file_type','json');
  if(startDate)u.searchParams.set('observation_start',startDate);if(endDate)u.searchParams.set('observation_end',endDate);
  const d=await fetchJson(u.toString(),{},15000);return {source:'FRED',seriesId:id,realtimeStart:d.realtime_start,realtimeEnd:d.realtime_end,observationStart:d.observation_start,observationEnd:d.observation_end,units:d.units,frequency:d.frequency,observations:(d.observations||[]).filter(x=>x.value!=='.').map(x=>({sourceTime:x.date,realtimeStart:x.realtime_start,realtimeEnd:x.realtime_end,value:Number(x.value)})).filter(x=>Number.isFinite(x.value))};
}

export async function fetchConfiguredCftcGold(){
  const url=String(process.env.CFTC_GOLD_DATA_URL||'').trim();
  if(!url)throw Object.assign(new Error('CFTC_GOLD_DATA_URL is not configured. Use an official/public CFTC dataset URL.'),{status:503});
  if(!/^https:\/\/(www\.)?cftc\.gov\//i.test(url))throw Object.assign(new Error('CFTC URL must be an official cftc.gov HTTPS URL'),{status:403});
  const r=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error(`CFTC ${r.status}`);const text=await r.text();
  return {source:'CFTC',url,receivedAt:new Date().toISOString(),bytes:Buffer.byteLength(text),sha256:await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)).then(b=>Buffer.from(b).toString('hex')),raw:text};
}
