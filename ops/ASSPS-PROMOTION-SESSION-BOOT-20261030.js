// Small, promotion-route-only session restoration before AuthProvider mounts.
// All other routes import the original production bootstrap without changes.
const route=String(window.location.pathname||'');
if(route==='/students/promote'||route.startsWith('/students/promote/')){
  try{
    const store=window.localStorage;
    const prevToken=store.getItem('al_siddique_token');
    const refresh=store.getItem('al_siddique_refresh_token');
    const loginAt=Number(store.getItem('al_siddique_login_at')||0);
    const previous=JSON.parse(store.getItem('al_siddique_user')||'null');
    const windowValid=!loginAt || (Number.isFinite(loginAt)&&loginAt>0&&Date.now()>=loginAt&&Date.now()-loginAt<12*60*60*1000);
    if(windowValid&&prevToken&&refresh&&previous&&Number.isSafeInteger(Number(previous.id))){
      const who=async token=>{
        const r=await fetch('/api/auth/me',{method:'GET',headers:{Authorization:'Bearer '+token,Accept:'application/json'},cache:'no-store',credentials:'same-origin'});
        return r.status
      };
      if(await who(prevToken)===401){
        const r=await fetch('/api/auth/refresh',{method:'POST',
          headers:{'Content-Type':'application/json',Accept:'application/json'},
          body:JSON.stringify({refreshToken:refresh}),cache:'no-store',credentials:'same-origin'});
        if(r.ok){
          const result=await r.json();
          const actor=result.user||{};
          const school=x=>x.school_id??x.schoolId??null;
          if(result.token&&result.refreshToken&&Number(actor.id)===Number(previous.id)&&
             String(school(actor))===String(school(previous))&&
             String(actor.role||'').toLowerCase()===String(previous.role||'').toLowerCase()&&
             store.getItem('al_siddique_refresh_token')===refresh &&
             await who(result.token)===200){
            store.setItem('al_siddique_token',result.token);
            store.setItem('al_siddique_refresh_token',result.refreshToken);
            store.setItem('al_siddique_user',JSON.stringify(actor));
          }
        }
      }
    }
  } catch {
    // The regular server-backed AuthProvider will enforce sign-in. No bypass.
  }
}
await import('./index-D_DnmAgX.js');
