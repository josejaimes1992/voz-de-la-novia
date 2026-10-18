/* Indicador de sincronización de la versión de escritorio */
(()=>{
  const el=document.createElement('button'); el.id='dk-sync'; el.type='button';
  el.style.cssText='position:fixed;left:10px;bottom:10px;white-space:nowrap;max-width:calc(100vw - 20px);overflow:hidden;text-overflow:ellipsis;z-index:9000;font:600 12px/1 system-ui,Segoe UI,sans-serif;border-radius:999px;padding:7px 11px;border:1px solid rgba(128,128,128,.35);background:rgba(20,20,22,.88);color:#efece4;cursor:pointer;display:flex;gap:6px;align-items:center;backdrop-filter:blur(6px);opacity:.9';
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
  /* Menú pequeño: sincronizar o empezar de nuevo */
  const menu=document.createElement('div'); menu.hidden=true;
  menu.style.cssText='position:fixed;left:10px;bottom:46px;z-index:9001;background:#141416;color:#efece4;border:1px solid #2a2a2e;border-radius:12px;padding:6px;display:grid;gap:4px;min-width:260px;box-shadow:0 10px 30px rgba(0,0,0,.4);font:500 13px/1.3 system-ui,Segoe UI,sans-serif';
  document.body.appendChild(menu);
  const mi=(t,f)=>{ const b=document.createElement('button'); b.type='button'; b.textContent=t; b.style.cssText='all:unset;cursor:pointer;padding:9px 10px;border-radius:8px'; b.onmouseenter=()=>b.style.background='#232327'; b.onmouseleave=()=>b.style.background=''; b.onclick=()=>{ menu.hidden=true; f(); }; menu.appendChild(b); };
  async function doSync(){ const t=tok(); if(!t){ alert('Ingresa con tu usuario para sincronizar.'); return; } S.syncing=true; draw();
    try{ S=await (await fetch('/api/desktop/sync',{method:'POST',headers:{authorization:'Bearer '+t}})).json(); }catch{} draw(); if(window.loadData) try{ loadData(); }catch{} }
  async function doReset(){ const t=tok(); if(!t){ alert('Primero ingresa con tu usuario de administrador (botón Ingresar).'); return; }
    const msg=S.mode==='local'?'Esto borra las alabanzas, programas y usuarios de ESTA PC y vuelve a la pantalla de bienvenida, para que puedas conectarte con la nube de tu iglesia.\nLa Biblia y los Mensajes se conservan.\n\nEscribe tu contraseña para confirmar:':'Esto desconecta esta PC de la nube y vuelve a la pantalla de bienvenida. Lo que no se haya subido se perderá.\n\nEscribe tu contraseña para confirmar:';
    const pw=prompt(msg); if(!pw) return;
    const r=await fetch('/api/desktop/reset',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+t},body:JSON.stringify({password:pw})});
    const d=await r.json().catch(()=>({})); if(!r.ok){ alert(d.error||'No se pudo.'); return; }
    try{ localStorage.removeItem('vdn-token'); }catch{} location.href='/'; }
  document.addEventListener('click',e=>{ if(!menu.hidden&&!menu.contains(e.target)&&e.target!==el) menu.hidden=true; });
  el.onclick=async()=>{
    if(S.mode==='local'||(S.mode==='cloud'&&!S.needLogin)){ menu.innerHTML='';
      mi(S.mode==='local'?'↻ Buscar Mensajes nuevos':'↻ Sincronizar ahora',doSync);
      mi(S.mode==='local'?'☁ Conectar con la nube de mi iglesia (empezar de nuevo)':'⟲ Desconectar y empezar de nuevo',doReset);
      menu.hidden=!menu.hidden; return; }
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
