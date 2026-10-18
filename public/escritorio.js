/* Indicador de sincronización de la versión de escritorio */
(()=>{
  const el=document.createElement('button'); el.id='dk-sync'; el.type='button';
  el.style.cssText='position:fixed;left:10px;bottom:10px;z-index:9000;font:600 12px/1 system-ui,Segoe UI,sans-serif;border-radius:999px;padding:7px 11px;border:1px solid rgba(128,128,128,.35);background:rgba(20,20,22,.88);color:#efece4;cursor:pointer;display:flex;gap:6px;align-items:center;backdrop-filter:blur(6px);opacity:.9';
  document.body.appendChild(el);
  let S={}; const tok=()=>{ try{ return JSON.parse(localStorage.getItem('vdn-token')||'null'); }catch{ return null; } };
  const ago=t=>{ if(!t) return 'nunca'; const m=Math.round((Date.now()-t)/60000); return m<1?'ahora':m<60?`hace ${m} min`:m<1440?`hace ${Math.round(m/60)} h`:`hace ${Math.round(m/1440)} d`; };
  function draw(){
    if(S.mode==='local'){ const ready=S.rvr&&S.nSermons>0; let t=S.syncing&&S.sermons?`Bajando mensajes ${S.sermons}`:S.syncing?'Bajando Biblia y Mensajes…':ready?`${S.nSermons} mensajes · RVR1960`:S.online===false?'Sin internet · conéctate una vez para bajar Biblia y Mensajes':'Bajando Biblia y Mensajes…';
      el.innerHTML=`<span style="color:${ready?'#9fd39f':'#e9c45a'}">●</span> ${t}`; el.title='Tus alabanzas y programas quedan solo en esta PC. La Biblia RVR1960 y los Mensajes se bajan una vez y se actualizan solos cuando hay internet.\n\nClic para buscar Mensajes nuevos.'; return; }
    if(S.mode!=='cloud'){ el.hidden=true; return; }
    let dot='#9fd39f', txt=`Sincronizado ${ago(S.lastPull)}`;
    if(S.syncing){ dot='#e9c45a'; txt='Sincronizando…'; }
    else if(S.mode==='cloud'&&S.needLogin){ dot='#ff8a7a'; txt='Vuelve a conectar la nube'; }
    else if(S.online===false){ dot='#ff8a7a'; txt='Sin internet'+(S.pending?` · ${S.pending} cambio${S.pending>1?'s':''} por subir`:''); }
    else if(S.pending){ dot='#e9c45a'; txt=`${S.pending} cambio${S.pending>1?'s':''} por subir`; }
    if(S.sermons) txt+=` · mensajes ${S.sermons}`;
    el.innerHTML=`<span style="color:${dot}">●</span> ${txt}`;
    el.title=`Nube: ${S.cloud||''}\nÚltima bajada: ${ago(S.lastPull)}\nÚltima subida: ${ago(S.lastPush)}${S.error?`\n${S.error}`:''}\n\nClic para sincronizar ahora.`;
  }
  const up=document.createElement('button'); up.type='button'; up.hidden=true;
  up.style.cssText='position:fixed;left:10px;bottom:46px;z-index:9000;font:700 12px/1 system-ui,Segoe UI,sans-serif;border-radius:999px;padding:7px 11px;border:0;background:#e9c45a;color:#14110a;cursor:pointer';
  document.body.appendChild(up);
  up.onclick=()=>{ const u='https://web-production-2c736.up.railway.app/descargar'; if(window.vdnNative) vdnNative.openExternal(u); else window.open(u,'_blank'); };
  async function poll(){ try{ S=await (await fetch('/api/desktop/status')).json(); draw(); up.hidden=!S.update; if(S.update) up.textContent=`⬆ Nueva versión ${S.update} — descargar`; }catch{} }
  el.onclick=async()=>{
    if(S.mode!=='cloud'&&S.mode!=='local') return;
    const t=tok(); if(!t){ alert('Ingresa con tu usuario para sincronizar.'); return; }
    if(S.mode==='cloud'&&S.needLogin){ const pw=prompt('Escribe tu contraseña de la nube para volver a conectar:'); if(!pw) return;
      const r=await fetch('/api/desktop/relogin',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+t},body:JSON.stringify({password:pw})});
      if(!r.ok){ const d=await r.json().catch(()=>({})); alert(d.error||'No se pudo conectar.'); } poll(); return; }
    S.syncing=true; draw();
    try{ S=await (await fetch('/api/desktop/sync',{method:'POST',headers:{authorization:'Bearer '+t}})).json(); }catch{}
    draw(); if(window.loadData) try{ loadData(); }catch{}
  };
  poll(); setInterval(poll,10000);
})();
