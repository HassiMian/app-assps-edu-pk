(()=>{
 'use strict';
 if(window.__ASSPS_NATIVE_STUDIO_R1__)return;
 window.__ASSPS_NATIVE_STUDIO_R1__=true;
 const STYLE_ID='assps-native-studio-r1-style';
 const NAV_ID='assps-native-studio-r1-nav';
 const CL='assps-native-studio-active';
 const ancestorAttr='data-assps-studio-ancestor';
 const css=[
  'body.'+CL+'{--assps-studio-navy:#163b5c;--assps-studio-border:#d5e0e9;}',
  'body.'+CL+' ['+ancestorAttr+']{transform:none!important;filter:none!important;perspective:none!important;contain:none!important;isolation:auto!important;overflow:visible!important;clip-path:none!important;}',
  'body.'+CL+' .pts-generator-surface{position:fixed!important;top:214px!important;left:58px!important;right:0!important;bottom:0!important;height:calc(100dvh - 214px)!important;min-height:0!important;width:auto!important;max-width:none!important;z-index:950!important;display:grid!important;grid-template-columns:390px minmax(0,1fr)!important;grid-template-rows:minmax(0,1fr)!important;gap:11px!important;padding:10px!important;box-sizing:border-box!important;background:#edf2f6!important;color:#193b56!important;}',
  'body.'+CL+' .pts-generator-surface>style{display:none!important;}',
  'body.'+CL+' .pts-generator-surface>[data-paper-controls]{grid-column:1!important;grid-row:1!important;min-width:0!important;min-height:0!important;max-height:100%!important;height:100%!important;overflow-y:auto!important;overflow-x:hidden!important;background:#fff!important;border:1px solid #d3dfe8!important;border-radius:12px!important;box-shadow:0 3px 14px #183b5a12!important;padding:12px!important;box-sizing:border-box!important;backdrop-filter:none!important;scrollbar-width:thin!important;}',
  'body.'+CL+' .pts-generator-surface>#paper-canvas{grid-column:2!important;grid-row:1!important;min-width:0!important;min-height:0!important;max-width:100%!important;height:100%!important;overflow-y:auto!important;background:#e8eff5!important;border:1px solid #d5e0e9!important;border-radius:12px!important;padding:12px!important;box-shadow:0 3px 14px #183b5a0d!important;box-sizing:border-box!important;}',
  'body.'+CL+' .pts-generator-surface [data-paper-header-controls]{gap:7px!important;}',
  'body.'+CL+' .pts-generator-surface [data-paper-header-controls] select,body.'+CL+' .pts-generator-surface [data-paper-controls] input,body.'+CL+' .pts-generator-surface [data-paper-controls] select{border-color:#cedbe6!important;border-radius:7px!important;max-width:100%!important;}',
  'body.'+CL+' .pts-generator-surface [data-paper-controls]>div:first-child{gap:5px!important;margin-bottom:9px!important;}',
  'body.'+CL+' .pts-generator-surface [data-paper-controls] button{border-radius:7px!important;box-shadow:none!important;}',
  'body.'+CL+' .pts-generator-surface [data-paper-controls] button[data-assps-native-action=save],body.'+CL+' .pts-generator-surface [data-paper-controls] button[data-assps-native-action=print]{background:#163b5c!important;color:white!important;border:1px solid #163b5c!important;}',
  'body.'+CL+' .pts-generator-surface [data-paper-controls] button[data-assps-native-action=student]{background:#eef3f7!important;color:#163b5c!important;border:1px solid #d1dfe9!important;}',
  'body.'+CL+' .pts-generator-surface [data-paper-controls] summary{color:#163b5c!important;font-weight:700!important;}',
  'body.'+CL+' .pts-generator-surface [data-paper-controls] details{border-bottom:1px solid #e1e8ee!important;padding-bottom:7px!important;}',
  'body.'+CL+' .pts-generator-surface [data-paper-controls] [aria-label="Header Fields"],body.'+CL+' .pts-generator-surface [data-paper-controls] [aria-label="Compact Worksheet Header"]{border:1px solid #b8cedf!important;background:#fff!important;color:#163b5c!important;}',
  'body.'+CL+' .pts-generator-surface [data-section-inspector]{left:456px!important;right:auto!important;top:190px!important;max-height:calc(100dvh - 210px)!important;width:310px!important;background:#fff!important;color:#163b5c!important;border:1px solid #d2dee8!important;box-shadow:0 14px 40px #15375030!important;}',
  'body.'+CL+' .pts-generator-surface [data-section-inspector] button{color:#163b5c!important;}',
  'body.'+CL+' #'+NAV_ID+'{position:sticky;top:0;z-index:50;background:#fff;padding:7px 4px 10px;margin-bottom:10px;border-bottom:1px solid #dbe5ed;display:grid;gap:8px;}',
  'body.'+CL+' #'+NAV_ID+' .assps-n-title{font:700 15px Georgia,serif;color:#163b5c;display:flex;align-items:center;justify-content:space-between;}',
  'body.'+CL+' #'+NAV_ID+' .assps-n-hint{font:500 11px Arial,sans-serif;color:#536d83;}',
  'body.'+CL+' #'+NAV_ID+' .assps-n-tabs{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:3px;}',
  'body.'+CL+' #'+NAV_ID+' button{font:700 10px Arial,sans-serif;color:#163b5c;background:#f0f5f9;border:1px solid #cfdae5!important;box-shadow:none!important;border-radius:7px!important;padding:8px 3px!important;cursor:pointer;}',
  'body.'+CL+' #'+NAV_ID+' button[aria-current=step]{background:#163b5c!important;color:#fff!important;border-color:#163b5c!important;}',
  'body.'+CL+' #'+NAV_ID+' button.assps-n-classic{padding:5px 8px!important;font-size:10px!important;}',
  'body.assps-native-studio-classic .pts-generator-surface{position:relative!important;}',
  'body.assps-native-studio-classic #'+NAV_ID+'{position:sticky!important;}',
  '@media(max-width:1150px){body.'+CL+' .pts-generator-surface{grid-template-columns:315px minmax(0,1fr)!important;top:214px!important;height:calc(100dvh - 214px)!important;}}',
  '@media(max-width:850px){body.'+CL+' .pts-generator-surface{position:relative!important;left:auto!important;top:auto!important;right:auto!important;bottom:auto!important;width:100%!important;height:auto!important;display:flex!important;flex-direction:column!important;}body.'+CL+' .pts-generator-surface>#paper-canvas{height:68vh!important;}body.'+CL+' .pts-generator-surface>[data-paper-controls]{max-height:35vh!important;overflow-y:auto!important;}}',
  '@media print{body.'+CL+' .pts-generator-surface{position:static!important;display:block!important;padding:0!important;background:white!important;}body.'+CL+' .pts-generator-surface>[data-paper-controls],body.'+CL+' #'+NAV_ID+'{display:none!important;}body.'+CL+' .pts-generator-surface>#paper-canvas{height:auto!important;overflow:visible!important;box-shadow:none!important;border:0!important;padding:0!important;}}'
 ].join('\n');
 const style=document.createElement('style');style.id=STYLE_ID;style.textContent=css;document.head.appendChild(style);
 let root=null,ancestors=[],seen=false,cycleTimer=null;
 function isBuild(){return location.pathname.replace(/\/$/,'')==='/paper-generator' && new URLSearchParams(location.search).get('tab')!=='saved';}
 function markAncestors(next){
   for(const node of ancestors)if(!next.includes(node))node.removeAttribute(ancestorAttr);
   for(const node of next)node.setAttribute(ancestorAttr,'true');
   ancestors=next;
 }
 function nativeControl(t){
   const panel=root?.querySelector('[data-paper-controls]');
   const buttons=[...(panel?.querySelectorAll('button')||[])].filter(x=>!x.closest('#'+NAV_ID));
   return buttons.find(x=>String(x.textContent||'').trim().toLowerCase().includes(t.toLowerCase()));
 }
 function actionTags(){
   const map=[['Save Draft','save'],['Print / Save PDF','print'],['Student Name + GR Print','student']];
   for(const [label,id] of map){const b=nativeControl(label);if(b)b.dataset.asspsNativeAction=id;}
 }
 function nav(){
   const panel=root?.querySelector('[data-paper-controls]');
   if(!panel||document.getElementById(NAV_ID))return;
   const section=document.createElement('section');section.id=NAV_ID;section.setAttribute('aria-label','ASSPS Paper Studio original controls');
   const title=document.createElement('div');title.className='assps-n-title';title.textContent='ASSPS Paper Studio';
   const classical=document.createElement('button');classical.type='button';classical.className='assps-n-classic';classical.textContent='Classic layout';
   classical.addEventListener('click',()=>{
     const classic=document.body.classList.toggle('assps-native-studio-classic');
     document.body.classList.toggle(CL,!classic);
     classical.textContent=classic?'Studio layout':'Classic layout';
     if(!classic)requestFit();
   });
   title.appendChild(classical);section.appendChild(title);
   const hint=document.createElement('div');hint.className='assps-n-hint';hint.textContent='Original editor · all native buttons preserved';
   section.appendChild(hint);
   const tabs=document.createElement('div');tabs.className='assps-n-tabs';
   const steps=[['Content',()=>nativeControl('Question Menu')],['Header',()=>panel.querySelector('[data-paper-metadata-editor]')],['Layout',()=>[...panel.querySelectorAll('details')].find(d=>String(d.querySelector('summary')?.textContent||'').includes('Paper Style & Layout'))],['Students',()=>nativeControl('Student Name + GR Print')],['Export',()=>nativeControl('Save Draft')]];
   steps.forEach(([label,find],i)=>{
     const b=document.createElement('button');b.type='button';b.textContent=(i+1)+' '+label;
     if(i===0)b.setAttribute('aria-current','step');
     b.addEventListener('click',()=>{
       for(const c of tabs.children)c.removeAttribute('aria-current');
       b.setAttribute('aria-current','step');
       const target=find();
       if(!target)return;
       if(target.tagName==='DETAILS')target.open=true;
       target.scrollIntoView({behavior:'smooth',block:'nearest',inline:'nearest'});
     });
     tabs.appendChild(b);
   });
   section.appendChild(tabs);
   panel.prepend(section);
 }
 function requestFit(){
   if(!root||root.dataset.asspsFitRequested)return;
   const btn=nativeControl('Fit Page');
   if(btn){root.dataset.asspsFitRequested='true';setTimeout(()=>{if(root?.isConnected)btn.click();},260);}
 }
 function reset(){
   document.body.classList.remove(CL,'assps-native-studio-classic');
   markAncestors([]);
   root=null;seen=false;
 }
 function cycle(){
   if(!isBuild()){if(seen)reset();return;}
   const next=document.querySelector('.pts-generator-surface');
   if(!next){if(seen)reset();return;}
   if(next!==root){if(seen)reset();root=next;seen=true;}
   const asc=[];let p=root.parentElement;
   while(p&&p!==document.body){asc.push(p);p=p.parentElement;}
   markAncestors(asc);
   if(!document.body.classList.contains('assps-native-studio-classic'))document.body.classList.add(CL);
   nav();actionTags();requestFit();
 }
 const observer=new MutationObserver(()=>{if(!cycleTimer)cycleTimer=setTimeout(()=>{cycleTimer=null;cycle();},120);});
 observer.observe(document.documentElement,{subtree:true,childList:true});
 document.addEventListener('click',()=>setTimeout(cycle,90),true);
 window.addEventListener('popstate',cycle);
 window.addEventListener('resize',()=>setTimeout(cycle,120));
 cycle();
})();

