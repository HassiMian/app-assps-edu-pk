/* ASSPS Starter Urdu color picture worksheet — paper #293.
   Scoped to its immutable paper code and the native 2-per-A4 preview.
   Does not mutate master paper, student records or editor data. */
(function(){
 'use strict';
 if(window.__asspsStarterColor2upV2)return;
 window.__asspsStarterColor2upV2=true;
 if(!/^\/paper-generator\/?$/i.test(location.pathname))return;

 const PAPER_CODE='ASSPS-STARTER-URDU-PICTURE-2UP-20261117';
 const KEYS=['cat','flower','fish','book','apple','ball','mango','sun'];
 const BASE='https://app.assps.edu.pk/assets/assps-starter-color-pic-';
 const getSrc=key=>BASE+key+'-20261117-v1.png';
 let pending=false,active=false;

 function valid(canvas){
   if(!canvas)return false;
   const halves=[...canvas.querySelectorAll('.half-paper')];
   if(halves.length!==2)return false;
   // The paper code is printed by the native ASSPS header, not inferred from the route.
   const first=String(halves[0].textContent||'');
   const second=String(halves[1].textContent||'');
   const matched=half=>half.querySelector('[data-assps-paper-code]')?.getAttribute('data-assps-paper-code')===PAPER_CODE||String(half.textContent||'').includes(PAPER_CODE);
   return matched(halves[0])&&matched(halves[1]);
 }

 function rowsForHalf(half){
   const sections=[...half.querySelectorAll('section[data-official-section]')];
   const worksheet=sections.find(s=>/تصویر\s*دیکھ\s*کر\s*پہلا\s*حرف\s*لکھیں/.test(s.textContent||''))||sections[0];
   if(!worksheet)return [];
   const grid=worksheet.querySelector('[data-short-two-column]');
   if(grid){
     const columns=[...grid.children];
     if(columns.length!==2)return [];
     const right=[...columns[0].querySelectorAll('[data-numbered-response-row]')];
     const left=[...columns[1].querySelectorAll('[data-numbered-response-row]')];
     if(right.length!==4||left.length!==4)return [];
     grid.dataset.asspsColorPictureGrid='true';
     grid.style.direction='rtl';
     grid.style.columnGap='8px';
     grid.style.rowGap='0px';
     grid.style.alignItems='start';
     return [...right,...left];
   }
   // The native classifier may choose a single column for an image-letter worksheet.
   // Place its eight editable item rows into the same 4x2 layout without replacing content.
   const rows=[...worksheet.querySelectorAll('[data-numbered-response-row]')];
   if(rows.length!==8)return [];
   const parent=rows[0].parentElement;
   if(!parent||rows.some(r=>r.parentElement!==parent))return [];
   parent.dataset.asspsColorPictureGrid='true';
   parent.style.display='grid';
   parent.style.gridTemplateColumns='minmax(0,1fr) minmax(0,1fr)';
   parent.style.direction='rtl';
   parent.style.columnGap='8px';
   parent.style.rowGap='0';
   rows.forEach((r,i)=>{r.style.gridColumn=i<4?'1':'2';r.style.gridRow=String(i%4+1)});
   return rows;
 }

 function decorate(row,key){
   if(row.querySelector('[data-assps-starter-picture="'+key+'"]'))return;
   // Keep the source text and the editable inline item; only style the live print surface.
   row.setAttribute('data-assps-picture-row',key);
   row.style.display='flex';
   row.style.flexDirection='row';
   row.style.alignItems='center';
   row.style.justifyContent='flex-start';
   row.style.direction='ltr';
   row.style.gap='5px';
   row.style.height='55px';
   row.style.marginBottom='0';
   row.style.breakInside='avoid';
   row.style.pageBreakInside='avoid';
   const text=row.querySelector(':scope > div[dir]');
   if(text){
     text.style.flex='0 0 153px';
     text.style.width='153px';
     text.style.maxWidth='calc(100% - 96px)';
     text.style.display='inline-flex';
     text.style.justifyContent='flex-start';
     text.style.textAlign='left';
     text.style.minWidth='0';
     text.style.alignItems='center';
     text.style.whiteSpace='nowrap';
     text.style.overflow='hidden';
     text.style.direction='ltr';
     text.querySelectorAll('div').forEach(cell=>{cell.style.textAlign='left';cell.style.marginLeft='0';cell.style.marginRight='0';});
     const serial=text.querySelector('[data-item-serial]');
     if(serial)serial.style.display='none';
   }
   const img=document.createElement('img');
   img.setAttribute('data-assps-starter-picture',key);
   img.setAttribute('alt','Color picture worksheet item');
   img.src=getSrc(key);
   img.width=90;img.height=55;
   img.loading='eager';img.decoding='sync';
   img.style.cssText='width:90px;height:55px;flex:0 0 90px;display:block;object-fit:contain;object-position:center;max-width:40%;break-inside:avoid;page-break-inside:avoid';
   row.insertBefore(img,row.firstChild);
 }

 function render(){
   if(active)return;
   const canvas=document.getElementById('paper-canvas');
   if(!valid(canvas))return;
   active=true;
   try{
     const halves=[...canvas.querySelectorAll('.half-paper')];
     const mapping=halves.map(rowsForHalf);
     if(mapping.some(rows=>rows.length!==8))return;
     for(const rows of mapping){
       rows.forEach((row,i)=>decorate(row,KEYS[i]));
     }
   }finally{active=false;}
 }

 function schedule(){
   if(pending)return;
   pending=true;
   setTimeout(()=>{pending=false;render();},130);
 }
 document.addEventListener('click',event=>{
   const button=event.target?.closest?.('button');
   if(button&&/Print\s*\/\s*Save\s*PDF/i.test(button.textContent||''))render();
 },true);
 new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
})();
