/* ASSPS student GR integration: in-memory school roster, no master changes. */
(function(){
'use strict';
if(window.__asspsGRPrint)return;window.__asspsGRPrint=true;
if(!/^\/paper-generator\/?$/i.test(location.pathname))return;
const clsNames=['Starter','Mover','Flyer','One','Two','Three','Four','Five','Six','Seven','Pre Nine','Nine'];
const numbers={'1':'One','2':'Two','3':'Three','4':'Four','5':'Five','6':'Six','7':'Seven','8':'Eight','9':'Nine','10':'Ten'};
let modal=null,students=[],chosen=null,loadedClass='',btn=null,updating=false,working=false;
const normalize=x=>String(x||'').trim().toLowerCase().replace(/[\s\-]/g,'');
function clazz(v){const s=String(v||'').trim().replace(/^(?:class|grade|جماعت)\s*[:\-]?\s*/i,'');const alias={playgroup:'Starter',nursery:'Mover',prep:'Flyer',prenine:'Pre Nine'};return numbers[s]||alias[normalize(s)]||clsNames.find(n=>normalize(n)===normalize(s))||s;}
const same=(a,b)=>!!(a&&b&&normalize(clazz(a))===normalize(clazz(b)));
const paper=()=>document.getElementById('paper-canvas');
const pages=()=>[...(paper()?.querySelectorAll('.preview-container')||[])];
function paperClass(){
 const p=pages()[0];if(!p)return '';
 for(const td of p.querySelectorAll('td')){
  const kids=[...td.children];
  if(/^(class name|class|جماعت)$/i.test(String(kids[0]?.textContent||'').trim()))return clazz(kids[1]?.textContent);
 }
 // Compact worksheet headers may deliberately hide Class while preserving it in paper config.
 const code=String(p.querySelector('[data-assps-paper-code]')?.getAttribute('data-assps-paper-code')||'');
 const codePart=code.match(/^ASSPS-(STARTER|MOVER|FLYER|PRE[- ]?NINE|C[1-9])(?:-|$)/i)?.[1];
 if(codePart){const match=codePart.toUpperCase().match(/^C([1-9])$/);return clazz(match?match[1]:codePart)}
 // Native Paper Information class input remains mounted even in the visual Studio shell.
 for(const node of [...document.querySelectorAll('input,select')]){
  if(node.closest('#assps-paper-studio-r1, #assps-gr-modal'))continue;
  const aria=String(node.getAttribute('aria-label')||'');
  const label=String(node.closest('label')?.textContent||'');
  if(/^(class|grade)(?: name)?$/i.test(aria.trim())||/^(class|grade)\s*:?$/i.test(label.trim())){
   const value=clazz(node.value);if(clsNames.includes(value))return value;
  }
 }
 return '';
}
function fill(root,person){
 if(!root)return;
 for(const el of root.querySelectorAll('[data-personalization-field="student.name"],[data-personalization-field="student.rollNumber"]')){
  if(el.__asspsBlank===undefined)el.__asspsBlank=el.textContent;
  const data=person?(el.dataset.personalizationField==='student.name'?person.name:person.gr):el.__asspsBlank;
  if(el.textContent!==data)el.textContent=data;
  if(person){el.style.height='auto';el.style.fontWeight='600';el.style.overflowWrap='anywhere';}
  if(el.dataset.personalizationField==='student.rollNumber'){
   const label=el.previousElementSibling;
   if(label&&/^(roll number|roll no\.?|رول نمبر)$/i.test(label.textContent.trim()))label.textContent=/رول/.test(label.textContent)?'جی آر نمبر':'GR Number';
   for(const n of [...el.parentNode.childNodes]){
    if(n.nodeType===3&&/roll\s*(?:number|no\.?)/i.test(n.textContent))n.textContent=n.textContent.replace(/roll\s*(?:number|no\.?)/ig,'GR Number');
   }
  }
 }
}
function preview(){if(updating)return;updating=true;try{if(pages().length)fill(paper(),chosen);}finally{updating=false;}}
const byId=id=>modal?.querySelector('#'+id);
function message(t,bad=false){const m=byId('gr-msg');if(m){m.textContent=t;m.style.color=bad?'#a32d27':'#2c4a65';}}
function busy(b){working=b;modal?.querySelectorAll('button').forEach(x=>{if(x.id!=='gr-close')x.disabled=b;});}
function filtered(){const s=byId('gr-section')?.value||'*';return students.filter(x=>s==='*'||normalize(x.section)===normalize(s));}
function selector(id,items,placeholder,key,text){
 const el=byId(id);el.replaceChildren(new Option(placeholder,''));
 items.forEach(x=>el.add(new Option(text(x),key(x))));
}
function refreshList(){
 const f=filtered();
 selector('gr-student',f,'Select student',x=>x.id,x=>x.name+' — GR '+x.gr);
 selector('gr-batch',Array.from({length:Math.ceil(f.length/5)},(_,i)=>i),'Select batch (max 5)',i=>String(i),i=>'Batch '+(i+1)+': '+(i*5+1)+'–'+Math.min((i+1)*5,f.length));
 chosen=null;preview();byId('gr-count').textContent=f.length+' students with GR numbers';message('Select one student or choose a batch.');
}
async function loadStudents(){
 if(working)return;
 const className=clazz(byId('gr-class').value),actual=paperClass();
 if(!className||!same(className,actual)){message('Paper class is '+(actual||'unknown')+'. Choose the same class.',true);return;}
 try{
  busy(true);message('Loading authorized Students List...');
  const token=localStorage.getItem('al_siddique_token')||sessionStorage.getItem('al_siddique_token')||'';
  const headers={Accept:'application/json'};if(token)headers.Authorization='Bearer '+token;
  const r=await fetch('/api/students?class='+encodeURIComponent(className)+'&active=true',{headers,credentials:'same-origin',cache:'no-store'});
  if(!r.ok)throw Error('Students List HTTP '+r.status);
  const json=await r.json();if(!json.success||!Array.isArray(json.data))throw Error('Invalid school roster');
  const unique=new Map();let noGR=0;
  for(const s of json.data){
   if(!same(s.class,className)||s.is_active===false)continue;
   const id=String(s.id||s.student_id||'').trim(),name=String(s.name||'').trim(),gr=String(s.gr_number||'').trim();
   if(!id||!name)continue;if(!gr){noGR++;continue;}
   if(!unique.has(id))unique.set(id,{id,name,gr,section:String(s.section||'').trim()});
  }
  students=[...unique.values()].sort((a,b)=>a.section.localeCompare(b.section)||a.gr.localeCompare(b.gr,undefined,{numeric:true}));
  loadedClass=className;if(!students.length)throw Error('No active students with GR found');
  const section=byId('gr-section');section.replaceChildren(new Option('All sections','*'));
  [...new Set(students.map(x=>x.section).filter(Boolean))].sort().forEach(x=>section.add(new Option(x,x)));
  refreshList();if(noGR)message(noGR+' students excluded because GR is missing.',true);
 }catch(e){students=[];loadedClass='';chosen=null;preview();message(e.message,true);}
 finally{busy(false);}
}

function makeHtml(list){
 if(!same(paperClass(),loadedClass))throw Error('Class changed. Reload Students List.');
 if(!pages().length||paper()?.querySelector('.half-paper'))throw Error('Use Single A4 preview.');
 if(!list.length||list.length>5||list.some(s=>!s.name||!s.gr))throw Error('Select up to 5 students with GR Numbers.');
 const master=pages();
 if(master.some(p=>!p.querySelector('[data-personalization-field="student.name"]')||!p.querySelector('[data-personalization-field="student.rollNumber"]')))throw Error('Paper header lacks name/GR placeholders.');
 const out=document.createElement('div');out.id='paper-canvas';out.style.cssText='padding:0;margin:0;width:100%;background:#fff';
 list.forEach(student=>master.forEach(p=>{
  const clone=p.cloneNode(true);clone.removeAttribute('id');clone.style.zoom='1';
  clone.querySelectorAll('script,iframe,form,object,embed').forEach(e=>e.remove());
  clone.querySelectorAll('*').forEach(el=>{el.removeAttribute('contenteditable');[...el.attributes].forEach(a=>{if(/^on/i.test(a.name))el.removeAttribute(a.name);});});
  fill(clone,student);out.appendChild(clone);
 }));
 const html=out.outerHTML;
 if(new Blob([html]).size>2250000)throw Error('Batch too large; choose fewer students.');
 return html;
}
async function download(list){
 let html;try{html=makeHtml(list);}catch(e){message(e.message,true);return;}
 let popup=null;try{popup=window.open('about:blank','_blank');}catch(_){}
 try{
  busy(true);message('Generating '+list.length+' student copies with embedded Jameel font...');
  const token=localStorage.getItem('al_siddique_token')||sessionStorage.getItem('al_siddique_token')||'';
  const headers={'Content-Type':'application/json',Accept:'application/pdf'};
  if(token)headers.Authorization='Bearer '+token;
  const response=await fetch('/api/portal/paper-studio/print-jameel-pdf',{method:'POST',credentials:'same-origin',cache:'no-store',headers,body:JSON.stringify({html})});
  if(!response.ok)throw Error('Print service HTTP '+response.status);
  const blob=await response.blob();
  if(blob.type!=='application/pdf'||blob.size<3000)throw Error('Invalid PDF response');
  const url=URL.createObjectURL(blob);
  if(popup){popup.location.href=url;try{popup.opener=null;}catch(_){}}
  else{const a=document.createElement('a');a.href=url;a.download='ASSPS-'+loadedClass+'-Student-GR.pdf';document.body.appendChild(a);a.click();a.remove();}
  setTimeout(()=>URL.revokeObjectURL(url),600000);
  message(list.length+' personalized copy/copies ready. Saved Paper unchanged.');
 }catch(e){try{popup?.close();}catch(_){}message(e.message,true);}
 finally{busy(false);}
}

function close(){modal?.remove();modal=null;}
function open(){
 if(modal||!pages().length)return;
 modal=document.createElement('div');modal.id='assps-gr-modal';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
 modal.innerHTML='<div class="gr-box"><div class="gr-head"><div><h3>Student Name + GR Print</h3><small>Linked to school Students List</small></div><button id="gr-close">✕</button></div>'+
 '<div class="gr-cols"><div><label>Class on paper</label><select id="gr-class"></select></div><div><label>Section</label><select id="gr-section"><option value="*">All sections</option></select></div></div>'+
 '<div class="gr-actions"><button id="gr-load">Load Students List</button></div>'+
 '<label>Student name · GR number</label><select id="gr-student"><option value="">Load students first</option></select>'+
 '<div class="gr-actions"><button id="gr-single" class="gr-primary">Print / PDF selected student</button><button id="gr-clear">Clear selection</button></div>'+
 '<label>Class batch (5 students per PDF)</label><select id="gr-batch"><option value="">Load students first</option></select>'+
 '<div class="gr-actions"><button id="gr-many" class="gr-primary">Print / PDF selected batch</button></div>'+
 '<div id="gr-count">No roster loaded</div><div id="gr-msg" role="status">Choose the class shown on the open assessment.</div>'+
 '<p class="gr-note">Student name and GR appear only in personalized copies. Saved Paper stays unchanged. Official finalized print jobs remain separate.</p></div>';
 document.body.appendChild(modal);
 const classEl=byId('gr-class');classEl.add(new Option('Choose class',''));
 clsNames.forEach(c=>classEl.add(new Option(c,c)));
 if(clsNames.includes(paperClass()))classEl.value=paperClass();
 byId('gr-close').onclick=close;
 modal.onclick=e=>{if(e.target===modal)close();};
 modal.onkeydown=e=>{if(e.key==='Escape')close();};
 byId('gr-class').onchange=()=>{students=[];loadedClass='';chosen=null;preview();message('Class changed. Reload students.');};
 byId('gr-load').onclick=loadStudents;
 byId('gr-section').onchange=refreshList;
 byId('gr-student').onchange=()=>{chosen=students.find(x=>x.id===byId('gr-student').value)||null;preview();};
 byId('gr-single').onclick=()=>{if(!chosen){message('Select one student first.',true);return;}download([chosen]);};
 byId('gr-clear').onclick=()=>{chosen=null;byId('gr-student').value='';preview();message('Selection cleared.');};
 byId('gr-many').onclick=()=>{
  const v=byId('gr-batch').value;if(!/^\d+$/.test(v)){message('Select a batch first.',true);return;}
  download(filtered().slice(Number(v)*5,Number(v)*5+5));
 };
 if(classEl.value)loadStudents();
}

const css=[
 '#assps-gr-button{background:#f6f9fc;border:1px solid #acbdce;border-radius:8px;padding:9px 11px;color:#183a57;font:600 12px Arial;cursor:pointer;white-space:nowrap}',
 '#assps-gr-modal{position:fixed;inset:0;z-index:2147483001;background:#15283b80;display:flex;align-items:center;justify-content:center;padding:12px}',
 '#assps-gr-modal .gr-box{width:min(510px,100%);max-height:90vh;overflow:auto;box-sizing:border-box;border-radius:14px;background:#fff;padding:20px;box-shadow:0 20px 60px #0c1b2d40;color:#243b51;font:13px Arial}',
 '#assps-gr-modal .gr-head{display:flex;justify-content:space-between;align-items:start;border-bottom:1px solid #dce5ec;padding-bottom:12px}',
 '#assps-gr-modal h3{margin:0;color:#173957;font:700 20px "Times New Roman"}',
 '#assps-gr-modal small,.gr-note{color:#6a7e91;font-size:11px}',
 '#assps-gr-modal .gr-cols{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
 '#assps-gr-modal label{display:block;margin:12px 0 5px;font-size:11px;font-weight:700}',
 '#assps-gr-modal select{width:100%;box-sizing:border-box;padding:9px;border:1px solid #b7c8d8;border-radius:8px}',
 '#assps-gr-modal button{padding:10px;border:1px solid #b7c8d8;border-radius:8px;background:white;cursor:pointer}',
 '#assps-gr-modal button.gr-primary{background:#183a57;color:#fff;border-color:#183a57}',
 '#assps-gr-modal button:disabled{opacity:.45;cursor:wait}',
 '#assps-gr-modal .gr-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}',
 '#assps-gr-modal #gr-count{font-weight:700;margin-top:14px}',
 '#assps-gr-modal #gr-msg{padding:10px;background:#f5f8fa;border:1px solid #dee6ee;border-radius:8px;margin-top:9px;line-height:1.5}',
 '#assps-gr-modal .gr-note{line-height:1.55;margin-top:12px}',
 '@media(max-width:450px){#assps-gr-modal .gr-cols{grid-template-columns:1fr}}'
].join('\n');
let pending=false;
function attach(){
 if(!document.querySelector('#assps-gr-style')){
  const style=document.createElement('style');style.id='assps-gr-style';style.textContent=css;document.head.appendChild(style);
 }
 const native=[...document.querySelectorAll('button')].find(b=>/Print\s*\/\s*Save\s*PDF/i.test(b.textContent||''));
 if(native&&pages().length){
  if(!btn){btn=document.createElement('button');btn.type='button';btn.id='assps-gr-button';btn.textContent='Student Name + GR Print';btn.onclick=open;}
  if(btn.parentElement!==native.parentElement||btn.previousElementSibling!==native)native.insertAdjacentElement('afterend',btn);
 }
 preview();
}
new MutationObserver(()=>{
 if(!pending){pending=true;setTimeout(()=>{pending=false;attach();},180);}
}).observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});else attach();
})();
