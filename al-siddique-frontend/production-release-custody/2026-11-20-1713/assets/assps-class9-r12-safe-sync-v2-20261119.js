(()=>{
'use strict';
if(window.__ASSPS_IX_R12_REPAIR_V2__)return;
window.__ASSPS_IX_R12_REPAIR_V1__=true;
const TARGETS={"297":{"id":"paper_assps_3146fcd4906549e26bc712bbf89d34ca","old":"374ae1b4f911198bdd4e692463c62b408077a5ca6635bfff7fb15802d02fbdda","previous":"bb0c2163ea08ef116c9b0089295c4c0001a343ceb96fdd6d3705b1f8297fda26","new":"763c4718b1b2e1d25b6f48c58ce97e3e6541d666804aebbf2d1dc48c36b59f41"},"298":{"id":"paper_assps_f3b66ce1bee10f68524e984be8b53eb6","old":"31240cb3b4dd5bb54c205d25363024d97d9d7ea499ebff06cbe0856f75dab49b","previous":"d3512f50b9a2aa3de26fdaf9c83552623dd75549874abb6770a99a639bf60a64","new":"73b4a3acb99f74afaf64170b21872059d3e9f1bc4e2a85d36a60587bace2567f"},"299":{"id":"paper_assps_29b21cc39dfc71ea47911225935e3d5a","old":"53b0e7d7be7a3a209ac64bb762298d7e4124f9c384c062b110d7e664c240998d","previous":"56c5a98b6a90542e38b8351ccf9a390f5b2863c822c2e998fd748003f372cd24","new":"3062fce4f88988182ddfd90ed40880afc344faf0a5f5497ccce9880a047accbf"},"300":{"id":"paper_assps_7994e4c7b99b8302c825b7d6d9049152","old":"1fa7ee16be977069e742e7fab79c8ddcfa2c2e178203f23ab9e8584b9853202a","previous":"a8fc38bb2c9fe9958ffdb02092baadafc9f1e6bc1eb23aa92aa7979489c14c16","new":"b8b9c7804a1d3ce6c1a83cb739a41c53b90074bbf9b7190d4b06fa79e3494594"}};
const BASE='al_siddique_paper_store';
let busy=false;
function normal(v){return String(v||'').trim().toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'')}
function scope(u){
 const tenant=normal(u.tenant_id||u.tenantId);if(tenant)return 'tenant-'+tenant;
 const school=normal(u.school_id||u.schoolId);if(school)return 'school-'+school;
 const code=normal(u.school_code||u.schoolCode);if(code)return 'code-'+code;
 const email=normal(u.email);return email?'user-'+email:'public';
}
function core(p){return JSON.stringify({
 sections:(p.official_section||[]).map(s=>({heading:String(s.heading||''),content:String(s.content||''),marks:Number(s.marks),instructions:String(s.instructions||'')})),
 title:String(p.config?.title||''),classLevel:String(p.config?.classLevel||''),subjectName:String(p.config?.subjectName||''),totalMarks:Number(p.config?.totalMarks)
})}
async function sha(s){
 const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));
 return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('');
}
function auth(){
 try{
 const raw=localStorage.getItem('al_siddique_user')||sessionStorage.getItem('al_siddique_user');
 const user=JSON.parse(raw||'null');
 if(!user||String(user.school_id||user.schoolId)!=='1'||!['admin','principal','super_admin'].includes(String(user.role||'').toLowerCase()))return null;
 const token=localStorage.getItem('al_siddique_token');
 return token?{user,token}:null;
 }catch(_){return null}
}
async function fetchPaper(id,token){
 const r=await fetch('/api/portal/paper-studio/papers/'+id,{cache:'no-store',credentials:'same-origin',headers:{Authorization:'Bearer '+token,Accept:'application/json'}});
 if(!r.ok)throw Error('Status '+r.status);
 const j=await r.json();
 return j?.success===true?j.data:null;
}
async function sync(){
 if(busy||!location.pathname.includes('paper-generator')||!crypto?.subtle)return;
 const a=auth();if(!a)return;
 busy=true;
 try{
 const key=BASE+'__'+scope(a.user);
 const st=sessionStorage.getItem(key)!==null?sessionStorage:localStorage;
 const raw=st.getItem(key);if(!raw)return;
 const parsed=JSON.parse(raw);if(!Array.isArray(parsed.savedPapers))return;
 const indices=new Map(parsed.savedPapers.map((p,i)=>[String(p?.id||''),i]));
 const changes=new Map();
 for(const [id,t] of Object.entries(TARGETS)){
  const idx=indices.get(t.id);if(idx===undefined)continue;
  const local=parsed.savedPapers[idx];
  if(local?.sourceReference && local.sourceReference!=='paper_vault:'+id)continue;
  const currentHash=await sha(core(local));
  if(currentHash===t.new)continue;
  if(currentHash!==t.old&&currentHash!==t.previous){console.info('ASSPS IX: local edits preserved for '+id);continue}
  const server=await fetchPaper(id,a.token);
  if(server?.document?.chatAssessmentImport!==true||server?.document?.chatAssessmentSchoolId!==1||server?.document?.academicAudit?.version!=='BOARD_STYLE_R1_R2_RENDER_SAFE_20261119')continue;
  const paper=server.document.nativePaper;
  if(paper?.id!==t.id||paper?.name!==local.name||await sha(core(paper))!==t.new)continue;
  changes.set(idx,{...local,...paper,id:t.id,sourceReference:'paper_vault:'+id,editorSettings:local.editorSettings||paper.editorSettings,serverRevision:Number(server.revision||3)});
 }
 if(!changes.size)return;
 const before=st.getItem(key);if(before!==raw)return; // refuse to overwrite cross-tab changes
 const current=auth();if(!current||current.token!==a.token||scope(current.user)!==scope(a.user))return;
 for(const [idx,paper] of changes)parsed.savedPapers[idx]=paper;
 const updated=JSON.stringify(parsed);
 st.setItem(key,updated);
 try{
 const check=JSON.parse(st.getItem(key));
 if(!Array.isArray(check.savedPapers)||check.savedPapers.length!==indices.size)throw Error('Read-back not valid');
 }catch(e){st.setItem(key,raw);throw e}
 window.dispatchEvent(new Event('al_siddique_paper_store_updated'));
 console.info('ASSPS IX: '+changes.size+' unedited Round 1/2 drafts synced to corrected server revisions.');
 setTimeout(()=>{if(location.pathname.includes('paper-generator'))location.reload()},500);
 }catch(e){console.warn('ASSPS IX safe sync skipped:',String(e.message||e).slice(0,160))}
 finally{busy=false}
}
setTimeout(sync,900);
setTimeout(sync,3600);
setTimeout(sync,8500);
window.addEventListener('focus',sync);
window.addEventListener('al_siddique_paper_store_updated',()=>setTimeout(sync,750));
})();
