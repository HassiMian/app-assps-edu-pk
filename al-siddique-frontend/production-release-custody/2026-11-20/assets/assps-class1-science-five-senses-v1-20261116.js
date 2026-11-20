/* ASSPS illustrated Class One Science Assessment #286.
 * Exact paper-scoped, no master paper text changes, no student data access.
 * Five immutable 1200x420 transparent professional diagrams, loaded for
 * authenticated preview and existing embedded-font PDF print service. */
(function(){
'use strict';
if(window.__asspsFiveSenseArtV1)return;
window.__asspsFiveSenseArtV1=true;
if(!/^\/paper-generator\/?$/i.test(location.pathname))return;

const CODE='ASSPS-C1-SCI-SENSES-20261116-A';
const DRAWINGS=[
 {key:'eye',alt:'Outlined drawing of an eye'},
 {key:'ear',alt:'Outlined drawing of an ear'},
 {key:'nose',alt:'Outlined drawing of a nose'},
 {key:'tongue',alt:'Outlined drawing of a tongue'},
 {key:'hand',alt:'Outlined drawing of a hand'}
];
const url=key=>'https://app.assps.edu.pk/assets/assps-c1-science-sense-'+key+'-v1-20261116.png';
let pending=false,locked=false;

function matchingPaper(canvas){
 if(!canvas?.querySelector('.preview-container'))return false;
 const text=String(canvas.textContent||'');
 if(text.includes(CODE))return true;
 // Alternative identification when configured Paper Code is hidden in preview.
 return /SCIENCE ASSESSMENT/i.test(text)&&/I see with my/i.test(text)&&
 /Write the name of each body part/i.test(text)&&/The tongue helps us taste/i.test(text)&&
 /Class(?: Name)?\s*:?\s*(?:One|1)\b/i.test(text);
}
function pictureSection(canvas){
 return [...canvas.querySelectorAll('[data-official-section]')].find(el=>
   /Look at the pictures[\s\S]{0,110}Write the name of each body part/i.test(String(el.textContent||'').replace(/\s+/g,' ')));
}
function candidateRows(section){
 let rows=[...section.querySelectorAll('[data-numbered-response-row]')];
 if(rows.length>=5)return rows;
 rows=[...section.querySelectorAll('[data-short-table] tr')];
 if(rows.length>=5)return rows;
 return [];
}
function annotateRow(row, drawing){
 if(row.querySelector('[data-assps-five-senses="'+drawing.key+'"]'))return false;
 const target=row.tagName==='TR'?row.lastElementChild:row.querySelector(':scope > div[dir]')||row;
 if(!target)return false;
 const img=document.createElement('img');
 img.dataset.asspsFiveSenses=drawing.key;
 img.src=url(drawing.key);
 img.alt=drawing.alt;
 img.width=150;img.height=53;
 img.loading='eager';img.decoding='sync';
 img.style.cssText='display:inline-block;flex:0 0 150px;width:150px;height:53px;max-width:36%;object-fit:contain;vertical-align:middle;margin-left:9px;break-inside:avoid;page-break-inside:avoid';
 if(target.tagName==='TD'){
   target.style.whiteSpace='normal';
   img.style.marginLeft='12px';
 }else{
   target.style.alignItems='center';
   target.style.flexWrap='nowrap';
 }
 target.appendChild(img);
 return true;
}
function render(){
 if(locked)return;
 const canvas=document.getElementById('paper-canvas');
 if(!matchingPaper(canvas))return;
 locked=true;
 try{
  const section=pictureSection(canvas);
  if(!section)return;
  const rows=candidateRows(section);
  if(rows.length!==5)return; // prevent silent row-shift/misleading diagrams
  DRAWINGS.forEach((item,i)=>annotateRow(rows[i],item));
 }finally{locked=false;}
}
function schedule(){
 if(pending)return;
 pending=true;
 setTimeout(()=>{pending=false;render();},140);
}
document.addEventListener('click',e=>{
 const button=e.target?.closest?.('button');
 if(button&&/Print\s*\/\s*Save\s*PDF/i.test(button.textContent||''))render();
},true);
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
})();
