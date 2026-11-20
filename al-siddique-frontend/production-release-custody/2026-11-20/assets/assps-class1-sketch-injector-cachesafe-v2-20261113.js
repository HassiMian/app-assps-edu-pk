/* ASSPS Paper Workspace: persistent, high-resolution Class One English sketch companion.
 * Master paper #283 stores a seven-item illustration manifest. This layer draws
 * the matching illustrations as non-editable siblings of question text, preventing
 * rich-text editor corruption and preserving the native Saved Paper structure.
 * Assets are immutable, printable high-DPI PNGs from professionally drawn vector
 * source, not an edited photograph or screenshot. */
(function(){
  'use strict';
  if(window.__asspsClass1SketchesV1)return;
  window.__asspsClass1SketchesV1=true;
  if(!/^\/paper-generator\/?$/i.test(location.pathname))return;

  const code='ASSPS-C1-ENG-SKETCH-20261113';
  const roots=[
    {key:'pencil',look:/\bis a pencil\b/i,alt:'One pencil — clean line sketch'},
    {key:'butterflies',look:/\bare butterflies\b/i,alt:'Two butterflies — clean line sketches'},
    {key:'kite',look:/\bis a kite\b/i,alt:'One kite — clean line sketch'},
    {key:'balls',look:/\bare balls\b/i,alt:'Three balls — clean line sketches'},
    {key:'notebook',look:/\bis a notebook\b/i,alt:'One notebook — clean line sketch'},
    {key:'cans',look:/\bare cans\b/i,alt:'Two cans — clean line sketches'},
    {key:'fans',look:/\bare fans\b/i,alt:'Three fans — clean line sketches'}
  ];
  const src=key=>'https://app.assps.edu.pk/assets/assps-worksheet-sketch-'+key+'-v1-20261113.png';
  let pending=false,inProgress=false;

  function safeWorksheet(canvas){
    if(!canvas||!canvas.querySelector('.preview-container'))return false;
    const text=String(canvas.textContent||'');
    return text.includes(code)||
      (/\bClass\s*(?:Name)?\s*(?:One|1)\b/i.test(text)&&
       /\bEnglish\b/i.test(text)&&
       /is a pencil/i.test(text)&&/are butterflies/i.test(text)&&
       /are cans/i.test(text)&&/are fans/i.test(text)&&/Underline all the nouns/i.test(text));
  }
  function findRows(canvas){
    let rows=[...canvas.querySelectorAll('[data-numbered-response-row]')];
    if(rows.length) return rows;
    rows=[...canvas.querySelectorAll('[data-short-table] tr')];
    return rows;
  }
  function attachSketch(row,item){
    if(row.querySelector('[data-assps-worksheet-sketch="'+item.key+'"]'))return false;
    const target=row.matches('tr')?row.lastElementChild:(row.querySelector(':scope > div[dir]')||row);
    if(!target)return false;
    const img=document.createElement('img');
    img.setAttribute('data-assps-worksheet-sketch',item.key);
    img.src=src(item.key);
    img.alt=item.alt;
    img.width=150;img.height=53;
    img.decoding='sync';img.loading='eager';
    img.style.cssText='display:inline-block;flex:0 0 150px;width:150px;height:53px;max-width:34%;object-fit:contain;object-position:center;vertical-align:middle;break-inside:avoid;page-break-inside:avoid;float:none;margin-left:10px';
    if(!target.matches('td')&&getComputedStyle(target).display!=='flex'){
      target.style.display='flex';
      target.style.alignItems='center';
    }
    if(target.matches('td')){
      target.style.whiteSpace='normal';
      img.style.marginLeft='16px';
    }else{
      target.style.alignItems='center';
      target.style.flexWrap='nowrap';
    }
    target.appendChild(img);
    return true;
  }
  function render(){
    if(inProgress)return;
    const canvas=document.querySelector('#paper-canvas');
    if(!safeWorksheet(canvas))return;
    inProgress=true;
    try{
      const rows=findRows(canvas);
      for(const item of roots){
        const matching=rows.find(r=>item.look.test(
          String(r.textContent||'').replace(/\s+/g,' ')
        ));
        if(matching)attachSketch(matching,item);
      }
    }finally{inProgress=false;}
  }
  function schedule(){
    if(pending)return;
    pending=true;
    setTimeout(()=>{pending=false;render();},110);
  }
  // The click-capture hook ensures sketches are in the DOM before the existing
  // Print / Save PDF action serializes the current A4 paper to the private PDF API.
  document.addEventListener('click',event=>{
    const btn=event.target?.closest?.('button');
    if(btn&&/Print\s*\/\s*Save\s*PDF/i.test(btn.textContent||''))render();
  },true);
  new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});
  else render();
})();
