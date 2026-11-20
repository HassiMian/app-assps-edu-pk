(function () {
'use strict';
const STORE='al_siddique_paper_store';
const NAME_PREFIX='Assessment — ';
const PAPER_PREFIX='paper_assps_';
const MIN_POLL_MS=30000;
const BOOT_POLL_MS=5000;
let running=false;
let lastAttempt=0;
let lastScope='';
function normalize(value){
  return String(value||'').trim().toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'');
}
function schoolScope(user){
  const tenant=normalize(user.tenant_id||user.tenantId);
  if(tenant)return 'tenant-'+tenant;
  const school=normalize(user.school_id||user.schoolId);
  if(school)return 'school-'+school;
  const code=normalize(user.school_code||user.schoolCode);
  if(code)return 'code-'+code;
  const email=normalize(user.email);
  return email?'user-'+email:'public';
}
function authorizedSession(){
  let raw=localStorage.getItem('al_siddique_user')||sessionStorage.getItem('al_siddique_user');
  if(!raw)return null;
  const user=JSON.parse(raw);
  const role=String(user?.role||'').trim().toLowerCase();
  const school=String(user?.school_id||user?.schoolId||'');
  if(school!=='1'||!['admin','principal','super_admin'].includes(role))return null;
  const token=localStorage.getItem('al_siddique_token');
  if(!token)return null;
  return {user,token,key:schoolScope(user)};
}
function markInMilli(value,max){
  // Reject ambiguous numeric coercion (blank/string/null/booleans/Infinity).
  if(typeof value!=='number'||!Number.isFinite(value)||value<=0||value>max)return null;
  const literal=String(value);
  if(!/^\d+(?:\.\d{1,3})?$/.test(literal))return null;
  const parts=literal.split('.');
  return Number(parts[0])*1000+Number((parts[1]||'').padEnd(3,'0'));
}
function validPaper(p){
  if(!p||typeof p!=='object'||p.userAuthored!==true||p.creationMethod!=='manual'||
     p.lifecycleStatus!=='DRAFT'||p.documentFormat!=='pts-native-v13'||
     !String(p.id||'').startsWith(PAPER_PREFIX)||
     !String(p.name||'').startsWith(NAME_PREFIX)||!Array.isArray(p.official_section)||
     p.official_section.length<1||p.official_section.length>30||
     !Array.isArray(p.selectedQuestions?.official_section?.questions))return false;
  const total=markInMilli(p.config?.totalMarks,300);
  if(total===null)return false;
  const sections=p.official_section;
  let tally=0;
  for(const s of sections){
    if(!s||typeof s.heading!=='string'||!s.heading.trim()||
      typeof s.content!=='string'||!s.content.trim())return false;
    const m=markInMilli(s.marks,100);
    if(m===null)return false;
    tally+=m;
  }
  return tally===total;
}
async function get(url,token){
  const response=await fetch(url,{
    credentials:'same-origin',cache:'no-store',
    headers:{Authorization:'Bearer '+token,Accept:'application/json'}
  });
  if(!response.ok)throw new Error('Assessment sync HTTP '+response.status);
  const payload=await response.json();
  if(payload?.success!==true)throw new Error('Assessment sync invalid response');
  return payload;
}

function paperCore(p){
  return JSON.stringify({
    sections:(p.official_section||[]).map(s=>({
      heading:String(s.heading||''),content:String(s.content||''),
      marks:Number(s.marks),instructions:String(s.instructions||'')
    })),
    title:String(p.config?.title||''),classLevel:String(p.config?.classLevel||''),
    subjectName:String(p.config?.subjectName||''),totalMarks:Number(p.config?.totalMarks)
  });
}
function safeCanonicalMerge(base,record){
  const doc=record?.document_json;
  const revision=Number(record?.current_revision??record?.currentRevision??0);
  if(!doc||!Number.isInteger(revision)||revision<1||
    !Array.isArray(doc.sections)||doc.sections.length<1||doc.sections.length>30||
    String(doc.id)!==String(base.id)||doc.documentOrigin!=='USER_AUTHORED')return null;
  const metadata=doc.metadata||{}, scoring=doc.scoringPlan||{};
  if(String(metadata.classLevel||metadata.className||'')!==String(base.config.classLevel)||
     String(metadata.subjectName||metadata.subject||'').toLowerCase()!==String(base.config.subjectName).toLowerCase()||
     !Number.isFinite(Number(scoring.maximumObtainableMarks))||
     Number(scoring.maximumObtainableMarks)<=0||Number(scoring.maximumObtainableMarks)>300)return null;
  const sections=doc.sections.map((s,i)=>{
    const rawMarks=s.operationalSectionTotal??s.authoritativeSectionTotal;
    const milli=markInMilli(rawMarks,100);
    const marks=milli===null?NaN:milli/1000;
    const heading=String(s.heading||s.title||'').trim();
    const content=Array.isArray(s.nodes)?s.nodes.map(n=>String(n?.content||'')).filter(Boolean).join('\n'):'';
    if(!heading||!content||!Number.isFinite(marks)||marks<0||content.length>90000)return null;
    return {
      id:String(s.id||('server-section-'+(i+1))).replace(/^manual-section-/,''),
      type:'official_section',medium:base.config.language||'english',
      heading,text:heading,textUrdu:'',content,marks,
      sourceOrder:i+1,priority:'all',
      ...(s.instructions?{instructions:String(s.instructions)}:{}),
      ...(s.attemptRule?{attemptRule:s.attemptRule}:{})
    };
  });
  if(sections.some(x=>!x))return null;
  const sum=sections.reduce((n,x)=>n+x.marks,0);
  if(markInMilli(scoring.maximumObtainableMarks,300)!==Math.round(sum*1000))return null;
  const result={
    ...base,
    config:{...base.config,title:String(metadata.title||base.config.title),
      totalMarks:sum,examType:String(metadata.examType||base.config.examType),
      timeAllowed:String(metadata.timeAllowed||base.config.timeAllowed)},
    official_section:sections,
    selectedQuestions:{...base.selectedQuestions,official_section:{questions:sections,marks:sum}},
    official_section_marks:sum,
    canonicalDocument:doc,canonicalAuthority:'PaperDocumentV2',
    serverPaperId:String(base.id),serverRevision:revision,
    serverContentHash:String(record?.content_hash||record?.contentHash||''),
    persistenceMode:'ONLINE',persistenceAuthority:'SERVER_REVISION_SOURCE_OF_TRUTH'
  };
  return validPaper(result)?result:null;
}
async function latestCanonical(base,token){
  const response=await fetch('/api/assessment-studio/papers/'+encodeURIComponent(base.id),{
    credentials:'same-origin',cache:'no-store',
    headers:{Authorization:'Bearer '+token,Accept:'application/json'}
  });
  if(response.status===404)return null;
  if(!response.ok)throw new Error('Canonical paper read HTTP '+response.status);
  const value=await response.json();
  if(value?.success!==true||!value.data)return null;
  return safeCanonicalMerge(base,value.data);
}

async function remotePapers(token){
  const list=await get('/api/portal/paper-studio/papers?limit=200',token);
  if(!Array.isArray(list.data))throw new Error('Assessment list unavailable');
  const ids=list.data.filter(x=>x&&String(x.name||'').startsWith(NAME_PREFIX)&&
    /^\d+$/.test(String(x.id||''))).slice(0,150);
  const staged=[];
  for(let i=0;i<ids.length;i+=4){
    const page=await Promise.all(ids.slice(i,i+4).map(async item=>{
      const details=await get('/api/portal/paper-studio/papers/'+encodeURIComponent(item.id),token);
      const server=details.data;
      const document=server?.document;
      if(document?.chatAssessmentImport!==true||document.chatAssessmentSchoolId!==1)return null;
      const native=document.nativePaper;
      if(!validPaper(native))return null;
      const base={...native,sourceReference:'paper_vault:'+String(item.id)};
      return {base,canonical:await latestCanonical(base,token)};
    }));
    staged.push(...page.filter(Boolean));
  }
  return staged;
}
function importIntoStore(papers,key){
  const qualifiedKey=key==='public'?STORE:STORE+'__'+key;
  const emergency=sessionStorage.getItem(qualifiedKey);
  const storage=emergency!==null?sessionStorage:localStorage;
  const original=emergency!==null?emergency:localStorage.getItem(qualifiedKey);
  if(!original)return {added:0,ready:false};
  const parsed=JSON.parse(original);
  if(!Array.isArray(parsed?.savedPapers))return {added:0,ready:false};
  const previous=parsed.savedPapers;
  const known=new Set(previous.map(x=>String(x?.id||'')));
  const additions=[];
  const upgrades=new Map();
  const byId=new Map(previous.map(p=>[String(p?.id||''),p]));
  for(const item of papers){
    const base=item.base,remote=item.canonical;
    if(!validPaper(base))continue;
    const id=String(base.id);
    if(!known.has(id)){
      known.add(id);
      additions.push(remote||base);
      continue;
    }
    // Never replace a locally edited paper: only the original unchanged imported
    // baseline is eligible for a cross-device server-authoritative upgrade.
    const local=byId.get(id);
    if(!remote||Number(remote.serverRevision)<=Number(local?.serverRevision||0)||
       paperCore(local)!==paperCore(base))continue;
    upgrades.set(id,{
      ...local,...remote,
      editorSettings:local.editorSettings||remote.editorSettings,
      sourceReference:base.sourceReference
    });
  }
  if(!additions.length&&!upgrades.size)return {added:0,updated:0,ready:true};
  const kept=previous.map(p=>upgrades.get(String(p?.id||''))||p);
  const updated=JSON.stringify({...parsed,savedPapers:[...additions,...kept]});
  storage.setItem(qualifiedKey,updated);
  try{
    const readback=JSON.parse(storage.getItem(qualifiedKey));
    const unchanged=readback.savedPapers.slice(additions.length).filter(p=>!upgrades.has(String(p?.id||'')));
    const originalUnchanged=previous.filter(p=>!upgrades.has(String(p?.id||'')));
    if(readback.savedPapers.length!==previous.length+additions.length||
       JSON.stringify(unchanged)!==JSON.stringify(originalUnchanged))
      throw new Error('Existing saved papers were not preserved');
  }catch(error){
    storage.setItem(qualifiedKey,original);
    throw error;
  }
  return {added:additions.length,updated:upgrades.size,ready:true};
}
async function sync(force=false){
  if(running)return;
  const now=Date.now();
  if(!force&&now-lastAttempt<MIN_POLL_MS)return;
  let auth;
  try{auth=authorizedSession();}catch(_){return;}
  if(!auth)return;
  const scope=auth.key;
  if(scope!==lastScope){force=true;lastScope=scope;}
  lastAttempt=now;
  running=true;
  try{
    const papers=await remotePapers(auth.token);
    const current=authorizedSession();
    if(!current||current.key!==scope||current.token!==auth.token)return;
    const outcome=importIntoStore(papers,scope);
    if(outcome.added>0||outcome.updated>0){
      console.info('ASSPS Assessment Save Report: '+outcome.added+' newly imported, '+outcome.updated+' canonical upgrades; unrelated papers preserved.');
      window.dispatchEvent(new Event('al_siddique_paper_store_updated'));
      if(location.pathname.includes('paper-generator'))setTimeout(()=>location.reload(),200);
    }
  }catch(e){
    console.warn('Assessment Save Report synchronization skipped safely:',String(e.message||e).slice(0,160));
  }finally{running=false;}
}
function start(){
  setTimeout(()=>sync(true),300);
  setTimeout(()=>sync(true),2000);
  setTimeout(()=>sync(true),6500);
  setInterval(()=>sync(),MIN_POLL_MS);
  window.addEventListener('focus',()=>sync(true));
  window.addEventListener('storage',event=>{
    if(['al_siddique_user','al_siddique_token'].includes(event.key))sync(true);
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible')sync(true);
  });
  window.addEventListener('popstate',()=>sync(true));
  window.addEventListener('hashchange',()=>sync(true));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
})();

