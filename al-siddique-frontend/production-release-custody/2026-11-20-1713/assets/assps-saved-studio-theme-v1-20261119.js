(()=>{
'use strict';
if(window.__ASSPS_SAVED_THEME_V1__)return;
window.__ASSPS_SAVED_THEME_V1__=true;
const S='assps-saved-studio-theme';
const style=document.createElement('style');
style.id='assps-saved-studio-theme-v1';
style.textContent=[
'body.'+S+'{background:#eef3f7!important;color:#173650!important}',
'body.'+S+' [data-assps-saved-toolbar]{background:#fff!important;border:1px solid #d5e1e9!important;border-radius:12px!important;box-shadow:0 5px 22px #163b5c10!important;padding:16px 20px!important}',
'body.'+S+' [data-assps-saved-card]{background:#fff!important;color:#153853!important;border:1px solid #d6e1e9!important;border-top:2px solid #b8cedd!important;border-radius:12px!important;box-shadow:0 5px 20px #15385312!important}',
'body.'+S+' [data-assps-saved-card] *{text-shadow:none!important}',
'body.'+S+' [data-assps-saved-card] [data-assps-saved-metric]{background:#eef3f7!important;color:#173b58!important;border:1px solid #dbe5ec!important;border-radius:7px!important}',
'body.'+S+' [data-assps-saved-card] [data-assps-saved-metric] *{color:#173b58!important}',
'body.'+S+' [data-assps-saved-card] button[data-assps-saved-action="open"]{background:#163b5c!important;color:#fff!important;border:1px solid #163b5c!important;border-radius:8px!important;box-shadow:none!important}',
'body.'+S+' [data-assps-saved-card] button[data-assps-saved-action="rename"]{background:#f4f7fa!important;color:#163b5c!important;border:1px solid #becdd9!important;border-radius:8px!important;box-shadow:none!important}',
'body.'+S+' [data-assps-saved-card] button[data-assps-saved-action="delete"]{background:#fff!important;color:#8c3d49!important;border:1px solid #d7b7be!important;border-radius:8px!important;box-shadow:none!important}',
'body.'+S+' [data-assps-saved-card] button[data-assps-saved-action="unavailable"]{background:#eef2f5!important;color:#657a8b!important;border:1px solid #d9e1e7!important;box-shadow:none!important;border-radius:8px!important}',
'body.'+S+' [data-assps-saved-toolbar] input{background:#f7f9fb!important;border:1px solid #d5e1e9!important;color:#143b59!important;border-radius:8px!important}',
'body.'+S+' [data-assps-saved-card] [style*="color: rgb(238, 0, 0)"]{color:#a14e5b!important}',
].join('\n');
document.head.appendChild(style);
let pending=false;
function theme(){
 const on=location.pathname.replace(/\/$/,'')==='/paper-generator'&&new URLSearchParams(location.search).get('tab')==='saved';
 document.body.classList.toggle(S,on);
 if(!on)return;
 const buttons=[...document.querySelectorAll('button')];
 for(const b of buttons){
  const name=String(b.textContent||'').trim().replace(/\s+/g,' ');
  const action=/^Open\s*&\s*Edit(?:\s*Original)?$/i.test(name)?'open':/^Rename$/i.test(name)?'rename':/^Delete$/i.test(name)?'delete':/^Revision unavailable$/i.test(name)?'unavailable':'';
  if(!action)continue;
  let c=b.parentElement;
  while(c&&c!==document.body){
   const rect=c.getBoundingClientRect();
   if(rect.width>220&&rect.width<700&&rect.height>=140&&rect.height<650&&/(Assessment|Class |English|Biology|Islamiyat|revision|Paper)/i.test(c.textContent||''))break;
   c=c.parentElement;
  }
  if(!c||c===document.body)continue;
  if(c.getAttribute('data-assps-saved-card')!=='1')c.setAttribute('data-assps-saved-card','1');
  if(b.dataset.asspsSavedAction!==action)b.dataset.asspsSavedAction=action;
  const names=[...c.querySelectorAll('div,span')];
  for(const n of names){
   const txt=String(n.textContent||'').trim();
   if(!/^(MCQ|Short|Long|marks)$/i.test(txt))continue;
   const metric=n.parentElement;
   if(metric&&metric!==c&&metric.getBoundingClientRect().width<130&&metric.getBoundingClientRect().height<100)metric.setAttribute('data-assps-saved-metric','1');
  }
 }
 const titles=[...document.querySelectorAll('h1,h2,h3,div')].filter(x=>x.children.length===0&&String(x.textContent||'').trim()==='Saved Papers');
 for(const x of titles){
  let p=x.parentElement;
  for(let j=0;j<4&&p&&p!==document.body;j++,p=p.parentElement){
   const box=p.getBoundingClientRect();
   if(p.querySelector('input')&&box.width>500&&box.height<250){p.setAttribute('data-assps-saved-toolbar','1');break;}
  }
 }
}
const observer=new MutationObserver(()=>{if(pending)return;pending=true;setTimeout(()=>{pending=false;theme();},120);});
observer.observe(document.documentElement,{subtree:true,childList:true});
window.addEventListener('popstate',theme);
window.addEventListener('focus',theme);
setInterval(theme,3000);
theme();
})();

