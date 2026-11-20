/* ASSPS Paper Generator — Jameel-safe Ctrl+P bridge; no font files shipped. */
(function(){
  'use strict';
  if(window.__asspsJameelPrintBridgeV1)return;
  window.__asspsJameelPrintBridgeV1=true;
  function isPaperGenerator(){
    return /^\/paper[-_]generator\/?$/i.test(window.location.pathname||'');
  }
  function getPrintAction(){
    var all=document.querySelectorAll('button');
    for(var i=0;i<all.length;i++){
      var item=all[i];
      if(item.disabled||item.getAttribute('aria-disabled')==='true')continue;
      var name=String(item.textContent||'').replace(/\s+/g,' ').trim();
      if(/Print\s*\/\s*Save\s*PDF/i.test(name))return item;
    }
    return null;
  }
  function onKeyDown(event){
    if(!isPaperGenerator()||event.defaultPrevented||event.altKey||event.shiftKey)return;
    if(!(event.ctrlKey||event.metaKey)||String(event.key||'').toLowerCase()!=='p')return;
    var preview=document.querySelector('#paper-canvas, [data-official-section]');
    var button=preview&&getPrintAction();
    if(!button)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    button.click();
  }
  document.addEventListener('keydown',onKeyDown,true);
})();
