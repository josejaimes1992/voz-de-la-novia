/* Voz de la Novia — Reproductor de alabanzas con audio: playlists, cola y reproducción en segundo plano
   (sigue sonando con la pantalla del teléfono apagada; controles en la pantalla de bloqueo y en el teclado de la PC) */
"use strict";
const RP={ q:[], i:-1, shuffle:false, repeat:'all', view:'lists', edit:null, add:'', pick:null };
const rpEl=document.createElement('audio'); rpEl.preload='metadata'; rpEl.setAttribute('playsinline',''); rpEl.hidden=true; document.body.appendChild(rpEl);
const rpLS=(k,v)=>{ try{ if(v===undefined) return JSON.parse(localStorage.getItem(k)||'null'); localStorage.setItem(k,JSON.stringify(v)); }catch{ return null; } };

/* ---- Datos ---- */
function rpWithAudio(){ return [...S.songs.values()].filter(s=>(s.audio||[]).length).sort((a,b)=>String(a.title).localeCompare(String(b.title),'es')); }
function rpLists(){ const m=S.token&&S.playlists?[...S.playlists.values()]:(rpLS('vdn-playlists')||[]); return m.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)); }
function rpGet(id){ return rpLists().find(p=>p.id===id)||null; }
function rpTrack(t){ const s=S.songs.get(t.songId); if(!s||!(s.audio||[]).length) return null; const a=s.audio.find(x=>x.id===t.audioId)||s.audio[0]; return {s,a}; }
let rpSaveT={};
function rpSave(pl,now){
  pl.updatedAt=Date.now();
  if(S.token){ if(!S.playlists) S.playlists=new Map(); S.playlists.set(pl.id,pl);
    clearTimeout(rpSaveT[pl.id]); const go=()=>api('/api/playlists/'+encodeURIComponent(pl.id),{method:'PUT',body:JSON.stringify({name:pl.name,items:pl.items})}).catch(()=>toast('No se pudo guardar la playlist. Revisa el internet.'));
    if(now) go(); else rpSaveT[pl.id]=setTimeout(go,600); }
  else { const L=(rpLS('vdn-playlists')||[]).filter(p=>p.id!==pl.id); L.push(pl); rpLS('vdn-playlists',L); }
}
async function rpDelete(id){
  if(S.token){ try{ await api('/api/playlists/'+encodeURIComponent(id),{method:'DELETE'}); }catch{} if(S.playlists) S.playlists.delete(id); }
  else rpLS('vdn-playlists',(rpLS('vdn-playlists')||[]).filter(p=>p.id!==id));
}
function rpNew(name,items){ const pl={id:'pl-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),name:(name||'Mi playlist').slice(0,80),items:items||[]}; rpSave(pl,true); return pl; }

/* ---- Reproducción ---- */
function rpPlay(items,start,shuffle){
  let q=(items||[]).filter(t=>rpTrack(t)); if(!q.length){ toast('No hay alabanzas con audio en esta lista.'); return; }
  RP.shuffle=!!shuffle; let first=q[start||0]||q[0];
  if(shuffle){ q=q.slice(); for(let i=q.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [q[i],q[j]]=[q[j],q[i]]; } if(start!=null){ q=[first,...q.filter(x=>x!==first)]; } first=q[0]; }
  RP.q=q; rpLoad(q.indexOf(first),true);
}
function rpLoad(i,play){
  if(i<0||i>=RP.q.length) return; RP.i=i; const tr=rpTrack(RP.q[i]); if(!tr){ return rpNext(); }
  rpEl.src='/audio/'+tr.a.id; if(play) rpEl.play().catch(()=>{});
  if('mediaSession' in navigator){ try{ navigator.mediaSession.metadata=new MediaMetadata({ title:tr.s.title||'Alabanza', artist:tr.s.author||(document.title||'Voz de la Novia'), album:'Voz de la Novia',
    artwork:[{src:'/icon-192.png',sizes:'192x192',type:'image/png'},{src:'/icon-512.png',sizes:'512x512',type:'image/png'}] }); }catch{} }
  rpPersist(); rpBar(); rpPanelRefresh();
}
function rpNext(auto){
  if(!RP.q.length) return;
  if(auto&&RP.repeat==='one'){ rpEl.currentTime=0; rpEl.play().catch(()=>{}); return; }
  if(RP.i+1<RP.q.length) return rpLoad(RP.i+1,true);
  if(RP.repeat==='all'||!auto) return rpLoad(0,true);
  rpEl.pause(); rpBar();
}
function rpPrev(){ if(rpEl.currentTime>4){ rpEl.currentTime=0; return; } rpLoad(RP.i>0?RP.i-1:RP.q.length-1,true); }
function rpToggle(){ if(!RP.q.length) return; if(!rpEl.src) return rpLoad(Math.max(0,RP.i),true); rpEl.paused?rpEl.play().catch(()=>{}):rpEl.pause(); }
function rpStop(){ rpEl.pause(); rpEl.removeAttribute('src'); try{ rpEl.load(); }catch{} RP.q=[]; RP.i=-1; rpPersist(); rpBar(); if('mediaSession' in navigator) try{ navigator.mediaSession.metadata=null; }catch{} }
function rpPersist(){ rpLS('vdn-rp',{q:RP.q,i:RP.i,shuffle:RP.shuffle,repeat:RP.repeat,t:Math.floor(rpEl.currentTime||0)}); }
rpEl.addEventListener('ended',()=>rpNext(true));
rpEl.addEventListener('play',()=>{ rpBar(); if('mediaSession' in navigator) navigator.mediaSession.playbackState='playing'; });
rpEl.addEventListener('pause',()=>{ rpBar(); rpPersist(); if('mediaSession' in navigator) navigator.mediaSession.playbackState='paused'; });
rpEl.addEventListener('error',()=>{ if(!rpEl.src) return; toast('No se pudo reproducir este audio'+(navigator.onLine?'':' (sin internet)')+'. Paso al siguiente.'); setTimeout(()=>rpNext(true),1200); });
let rpTick=0; rpEl.addEventListener('timeupdate',()=>{ const now=Date.now(); if(now-rpTick<500) return; rpTick=now; rpProg();
  if('mediaSession' in navigator&&navigator.mediaSession.setPositionState&&isFinite(rpEl.duration)) try{ navigator.mediaSession.setPositionState({duration:rpEl.duration,position:Math.min(rpEl.currentTime,rpEl.duration),playbackRate:rpEl.playbackRate}); }catch{}
  if(now%5000<600) rpPersist(); });
if('mediaSession' in navigator){ const ms=navigator.mediaSession; const h=(a,f)=>{ try{ ms.setActionHandler(a,f); }catch{} };
  h('play',()=>rpEl.play()); h('pause',()=>rpEl.pause()); h('previoustrack',rpPrev); h('nexttrack',()=>rpNext());
  h('seekbackward',d=>{ rpEl.currentTime=Math.max(0,rpEl.currentTime-(d.seekOffset||10)); }); h('seekforward',d=>{ rpEl.currentTime=Math.min(rpEl.duration||1e9,rpEl.currentTime+(d.seekOffset||10)); });
  h('seekto',d=>{ if(d.seekTime!=null) rpEl.currentTime=d.seekTime; }); h('stop',rpStop); }

/* ---- Barra del reproductor (abajo, en todas las pantallas) ---- */
const rpCss=document.createElement('style'); rpCss.textContent=`
.rp-bar{position:fixed;left:8px;right:8px;bottom:calc(8px + env(safe-area-inset-bottom,0px));z-index:45;max-width:760px;margin:0 auto;background:#121214;color:#f3efe4;border:1px solid #2c2a24;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.4);padding:8px 10px 10px;display:grid;gap:6px}
body.pj-has-mini .rp-bar{bottom:calc(76px + env(safe-area-inset-bottom,0px))}
body.rp-on{padding-bottom:96px} body.rp-on.pj-has-mini{padding-bottom:160px}
body.rp-on .ch-fab{bottom:calc(108px + env(safe-area-inset-bottom,0px))} body.rp-on .ch-panel{bottom:calc(172px + env(safe-area-inset-bottom,0px))}
body.rp-on .toast{bottom:calc(110px + env(safe-area-inset-bottom,0px))}
.rp-row{display:flex;align-items:center;gap:8px;min-width:0}
.rp-art{width:40px;height:40px;border-radius:9px;flex:none;background:#000 url(/icon-192.png) center/cover;border:1px solid #2c2a24}
.rp-ti{flex:1;min-width:0;cursor:pointer}.rp-ti b{display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rp-ti small{display:block;font-size:12px;color:#a7a395;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rp-b{all:unset;cursor:pointer;width:38px;height:38px;border-radius:50%;display:grid;place-items:center;font-size:17px;color:#f3efe4;flex:none}.rp-b:hover{background:#26241f}.rp-b.on{color:#e9c45a}
.rp-b.pl{background:#e9c45a;color:#14110a;width:44px;height:44px;font-size:19px}.rp-b.pl:hover{background:#f1d27a}
.rp-pg{display:flex;align-items:center;gap:8px;font:600 11px system-ui,sans-serif;color:#a7a395}.rp-pg input{flex:1;accent-color:#e9c45a;height:4px}
@media(max-width:520px){.rp-b.sm{display:none}}
.rp-list{display:grid;gap:8px}.rp-card{display:flex;align-items:center;gap:10px;border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:var(--surface)}
.rp-card .t{flex:1;min-width:0}.rp-card .t b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rp-card .t small{color:var(--muted)}
.rp-card.all{background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 18%,var(--surface)),var(--surface))}
.rp-it{display:flex;align-items:center;gap:8px;padding:7px 4px;border-bottom:1px solid var(--line)}.rp-it .t{flex:1;min-width:0;cursor:pointer}.rp-it .t b{font-weight:600;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rp-it .t small{color:var(--muted);font-size:12px}
.rp-it.cur{background:color-mix(in srgb,var(--accent) 14%,transparent);border-radius:8px}.rp-it .n{width:22px;text-align:right;color:var(--muted);font-size:12px}
.rp-ib{all:unset;cursor:pointer;width:30px;height:30px;border-radius:8px;display:grid;place-items:center;color:var(--muted)}.rp-ib:hover{background:var(--sunk);color:var(--ink)}
.rp-tabs{display:flex;gap:6px}.rp-tabs button[aria-pressed=true]{background:var(--accent);color:var(--accent-ink,#fff);border-color:var(--accent)}
`; document.head.appendChild(rpCss);
const rpBarEl=document.createElement('div'); rpBarEl.className='rp-bar'; rpBarEl.hidden=true; rpBarEl.setAttribute('role','region'); rpBarEl.setAttribute('aria-label','Reproductor'); document.body.appendChild(rpBarEl);
const rpT=s=>!isFinite(s)?'0:00':`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
function rpBar(){
  const tr=RP.i>=0&&RP.q[RP.i]?rpTrack(RP.q[RP.i]):null; const on=!!tr; rpBarEl.hidden=!on; document.body.classList.toggle('rp-on',on); if(!on) return;
  rpBarEl.innerHTML=`<div class="rp-row"><span class="rp-art"></span><span class="rp-ti" data-rp="song" title="Ver la letra"><b>${esc(tr.s.title)}</b><small>${esc(tr.s.author||'')}${tr.s.author?' · ':''}${RP.i+1} de ${RP.q.length}${tr.s.audio.length>1?` · ${esc(tr.a.name||'')}`:''}</small></span>
    <button class="rp-b sm${RP.shuffle?' on':''}" data-rp="shuffle" title="Aleatorio">🔀</button><button class="rp-b" data-rp="prev" title="Anterior">⏮</button><button class="rp-b pl" data-rp="toggle" title="Reproducir / Pausa">${rpEl.paused?'▶':'⏸'}</button><button class="rp-b" data-rp="next" title="Siguiente">⏭</button>
    <button class="rp-b sm${RP.repeat!=='none'?' on':''}" data-rp="repeat" title="Repetir: ${RP.repeat==='one'?'esta alabanza':RP.repeat==='all'?'toda la lista':'no'}">${RP.repeat==='one'?'🔂':'🔁'}</button><button class="rp-b" data-rp="panel" title="Playlists y cola">☰</button><button class="rp-b sm" data-rp="close" title="Cerrar el reproductor">✕</button></div>
    <div class="rp-pg"><span id="rp-cur">${rpT(rpEl.currentTime)}</span><input type="range" id="rp-seek" min="0" max="${isFinite(rpEl.duration)?Math.floor(rpEl.duration):0}" step="1" value="${Math.floor(rpEl.currentTime||0)}" aria-label="Posición"><span id="rp-dur">${rpT(rpEl.duration)}</span></div>`;
}
function rpProg(){ const a=document.getElementById('rp-cur'), d=document.getElementById('rp-dur'), r=document.getElementById('rp-seek'); if(!r) return;
  if(a) a.textContent=rpT(rpEl.currentTime); if(d) d.textContent=rpT(rpEl.duration); if(isFinite(rpEl.duration)) r.max=Math.floor(rpEl.duration); if(!r.matches(':active')) r.value=Math.floor(rpEl.currentTime||0); }
rpEl.addEventListener('loadedmetadata',rpProg);
rpBarEl.addEventListener('input',e=>{ if(e.target.id==='rp-seek') rpEl.currentTime=+e.target.value; });
rpBarEl.addEventListener('click',e=>{ const b=e.target.closest('[data-rp]'); if(!b) return; const k=b.dataset.rp;
  if(k==='toggle') rpToggle(); else if(k==='next') rpNext(); else if(k==='prev') rpPrev();
  else if(k==='shuffle'){ RP.shuffle=!RP.shuffle; if(RP.shuffle&&RP.q.length>1){ const cur=RP.q[RP.i]; const rest=RP.q.filter((_,i)=>i!==RP.i); for(let i=rest.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [rest[i],rest[j]]=[rest[j],rest[i]]; } RP.q=[cur,...rest]; RP.i=0; } rpPersist(); rpBar(); rpPanelRefresh(); }
  else if(k==='repeat'){ RP.repeat=RP.repeat==='all'?'one':RP.repeat==='one'?'none':'all'; rpPersist(); rpBar(); toast(RP.repeat==='all'?'Repetir toda la lista':RP.repeat==='one'?'Repetir esta alabanza':'Sin repetir'); }
  else if(k==='panel'){ RP.view='queue'; rpOpen(); }
  else if(k==='close') rpStop();
  else if(k==='song'){ const t=RP.q[RP.i]; if(t&&typeof go==='function'){ V.tab='songs'; V.lastSongId=t.songId; const so=S.songs.get(t.songId); go('song',{songId:t.songId,shift:0,capo:Number(so&&so.capo)||0}); } } });

/* ---- Panel: playlists, edición y cola ---- */
function rpOpen(view){ if(view) RP.view=view; const root=document.getElementById('modal-root'); if(!root) return;
  root.innerHTML=`<div class="scrim" data-rp-close><div class="modal" role="dialog" aria-label="Reproductor" style="width:min(620px,100%)" id="rp-panel"></div></div>`; rpPanelRefresh(); }
function rpPanelRefresh(){ const box=document.getElementById('rp-panel'); if(!box) return; const keep=box.querySelector('.body'); const st=keep?keep.scrollTop:0; box.innerHTML=rpPanelHtml(); const nb=box.querySelector('.body'); if(nb&&RP.view!=='queue') nb.scrollTop=st;
  if(RP.view==='queue'){ const c=box.querySelector('.rp-it.cur'); if(c) c.scrollIntoView({block:'center'}); }
  const f=box.querySelector('#rp-add'); if(f&&RP.focusAdd){ f.focus(); const l=f.value.length; try{ f.setSelectionRange(l,l); }catch{} RP.focusAdd=false; } }
function rpPanelHtml(){
  const all=rpWithAudio(); const L=rpLists();
  const head=(t,back)=>`<header>${back?`<button type="button" class="btn ghost" data-rpp="back" aria-label="Volver">‹</button>`:''}<h3 style="flex:1">${t}</h3><button type="button" class="btn ghost" data-rp-close aria-label="Cerrar">✕</button></header>`;
  const tabs=`<div class="rp-tabs"><button class="chip" data-rpp="tab" data-v="lists" aria-pressed="${RP.view==='lists'}">Playlists</button><button class="chip" data-rpp="tab" data-v="queue" aria-pressed="${RP.view==='queue'}">Sonando ahora${RP.q.length?` (${RP.q.length})`:''}</button></div>`;
  if(RP.view==='edit'){ const pl=rpGet(RP.edit); if(!pl){ RP.view='lists'; return rpPanelHtml(); }
    const inPl=new Set(pl.items.map(t=>t.songId)); const q=(RP.add||'').trim(); const nq=typeof msNorm==='function'?msNorm(q):q.toLowerCase();
    const res=q?all.filter(s=>(typeof msNorm==='function'?msNorm(`${s.title} ${s.author||''}`):`${s.title} ${s.author||''}`.toLowerCase()).includes(nq)).slice(0,60):all.slice(0,60);
    return `${head('Editar playlist',true)}<div class="body" style="display:grid;gap:12px">
      <label class="f">Nombre<input id="rp-name" value="${esc(pl.name)}" maxlength="80"></label>
      <div><b>${pl.items.length} alabanza${pl.items.length===1?'':'s'}</b>${pl.items.length?` <button class="btn sm pri" data-rpp="play" data-id="${esc(pl.id)}" style="margin-left:8px">▶ Reproducir</button>`:''}
        <div style="margin-top:6px">${pl.items.map((t,k)=>{ const tr=rpTrack(t); return `<div class="rp-it"><span class="n">${k+1}</span><span class="t"><b>${esc(tr?tr.s.title:'(sin audio)')}</b>${tr&&tr.s.audio.length>1?`<small><select data-rpp="aud" data-k="${k}" class="input" style="padding:1px 6px;font-size:12px">${tr.s.audio.map(a=>`<option value="${esc(a.id)}" ${a.id===tr.a.id?'selected':''}>${esc(a.name)}</option>`).join('')}</select></small>`:''}</span>
          <button class="rp-ib" data-rpp="up" data-k="${k}" title="Subir">↑</button><button class="rp-ib" data-rpp="down" data-k="${k}" title="Bajar">↓</button><button class="rp-ib" data-rpp="rm" data-k="${k}" title="Quitar">✕</button></div>`; }).join('')||'<p class="muted" style="margin:6px 0">Agrega alabanzas con el buscador de abajo.</p>'}</div></div>
      <div style="border-top:1px solid var(--line);padding-top:10px"><b>Agregar alabanzas con audio</b>
        <input id="rp-add" class="input" type="search" placeholder="Buscar por nombre o autor…" value="${esc(RP.add||'')}" style="width:100%;margin:6px 0" autocomplete="off">
        ${res.map(s=>`<div class="rp-it"><span class="t" data-rpp="pre" data-s="${esc(s.id)}" title="Escuchar"><b>${esc(s.title)}</b><small>${esc(s.author||'')}${s.audio.length>1?` · ${s.audio.length} audios`:''}</small></span>${inPl.has(s.id)?'<span class="muted" style="font-size:12px">✓ agregada</span>':''}<button class="btn sm" data-rpp="add" data-s="${esc(s.id)}">＋</button></div>`).join('')||'<p class="muted">Sin resultados.</p>'}</div>
      <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><button class="btn ghost danger" data-rpp="del" data-id="${esc(pl.id)}">Borrar playlist</button><button class="btn pri" data-rpp="back">Listo</button></div></div>`; }
  if(RP.view==='queue'){
    return `${head('🎧 Reproductor')}<div class="body" style="display:grid;gap:10px">${tabs}
      ${RP.q.length?`<div>${RP.q.map((t,k)=>{ const tr=rpTrack(t); return `<div class="rp-it${k===RP.i?' cur':''}"><span class="n">${k===RP.i&&!rpEl.paused?'♪':k+1}</span><span class="t" data-rpp="jump" data-k="${k}"><b>${esc(tr?tr.s.title:'—')}</b><small>${esc(tr?tr.s.author||'':'')}</small></span></div>`; }).join('')}</div>`:'<p class="muted">No hay nada sonando. Elige una playlist o "Todas con audio".</p>'}</div>`; }
  return `${head('🎧 Reproductor')}<div class="body" style="display:grid;gap:12px">${tabs}
    <div class="rp-card all"><span class="t"><b>Todas las alabanzas con audio</b><small>${all.length} alabanza${all.length===1?'':'s'}</small></span><button class="btn sm pri" data-rpp="all">▶</button><button class="btn sm" data-rpp="all" data-sh="1" title="Aleatorio">🔀</button></div>
    <div class="rp-list">${L.map(pl=>{ const n=pl.items.filter(t=>rpTrack(t)).length; return `<div class="rp-card"><span class="t"><b>${esc(pl.name)}</b><small>${n} alabanza${n===1?'':'s'}</small></span><button class="btn sm pri" data-rpp="play" data-id="${esc(pl.id)}" ${n?'':'disabled'}>▶</button><button class="btn sm" data-rpp="play" data-id="${esc(pl.id)}" data-sh="1" title="Aleatorio" ${n?'':'disabled'}>🔀</button><button class="btn sm" data-rpp="edit" data-id="${esc(pl.id)}" title="Editar">✎</button></div>`; }).join('')}</div>
    <button class="btn" data-rpp="new" style="justify-self:start">＋ Nueva playlist</button>
    <p class="muted" style="margin:0;font-size:12.5px">Sigue sonando con la pantalla del teléfono apagada o con otra app abierta; los controles aparecen en la pantalla de bloqueo. En la PC también responde a las teclas multimedia.${S.token?'':' Ingresa con tu usuario para guardar tus playlists en la nube.'}</p></div>`;
}
document.addEventListener('click',e=>{
  if(e.target.closest('[data-rp-close]')&&(e.target.hasAttribute('data-rp-close')||e.target.closest('button[data-rp-close]'))){ const r=document.getElementById('modal-root'); if(r) r.innerHTML=''; return; }
  const b=e.target.closest('[data-rpp]'); if(!b) { const o=e.target.closest('[data-act="rp-open"]'); if(o){ e.preventDefault(); RP.view='lists'; rpOpen(); } const so=e.target.closest('[data-act="rp-song"]'); if(so){ e.preventDefault(); rpPlaySong(so.dataset.s); } const sp=e.target.closest('[data-act="rp-pick"]'); if(sp){ e.preventDefault(); rpPickFor(sp.dataset.s); } return; }
  const k=b.dataset.rpp, d=b.dataset; const pl=RP.edit?rpGet(RP.edit):null;
  if(k==='tab'){ RP.view=d.v; rpPanelRefresh(); }
  else if(k==='back'){ RP.view='lists'; RP.add=''; rpPanelRefresh(); }
  else if(k==='all'){ rpPlay(rpWithAudio().map(s=>({songId:s.id,audioId:s.audio[0].id})),0,!!d.sh); RP.view='queue'; rpPanelRefresh(); }
  else if(k==='play'){ const p=rpGet(d.id); if(p){ rpPlay(p.items,0,!!d.sh); RP.view='queue'; rpPanelRefresh(); } }
  else if(k==='edit'){ RP.edit=d.id; RP.view='edit'; RP.add=''; rpPanelRefresh(); }
  else if(k==='new'){ const p=rpNew('Playlist '+(rpLists().length+1)); RP.edit=p.id; RP.view='edit'; RP.add=''; rpPanelRefresh(); setTimeout(()=>{ const n=document.getElementById('rp-name'); if(n){ n.focus(); n.select(); } },30); }
  else if(k==='del'){ if(!confirm('¿Borrar esta playlist? Las alabanzas no se borran.')) return; rpDelete(d.id).then(()=>{ RP.view='lists'; rpPanelRefresh(); }); }
  else if(k==='jump'){ rpLoad(+d.k,true); }
  else if(pl&&k==='add'){ const s=S.songs.get(d.s); if(!s) return; pl.items.push({songId:s.id,audioId:s.audio[0].id}); rpSave(pl); rpPanelRefresh(); }
  else if(pl&&k==='rm'){ pl.items.splice(+d.k,1); rpSave(pl); rpPanelRefresh(); }
  else if(pl&&(k==='up'||k==='down')){ const i=+d.k, j=k==='up'?i-1:i+1; if(j<0||j>=pl.items.length) return; [pl.items[i],pl.items[j]]=[pl.items[j],pl.items[i]]; rpSave(pl); rpPanelRefresh(); }
  else if(k==='pre'){ const s=S.songs.get(d.s); if(s) rpPlay([{songId:s.id,audioId:s.audio[0].id}],0); }
  else if(k==='pick'){ const s=S.songs.get(d.s); if(!s) return; let p=d.id==='new'?rpNew(prompt('Nombre de la nueva playlist:','Playlist '+(rpLists().length+1))||'Mi playlist'):rpGet(d.id); if(!p) return;
    if(!p.items.some(t=>t.songId===s.id)) p.items.push({songId:s.id,audioId:(d.a||s.audio[0].id)}); rpSave(p,true); const r=document.getElementById('modal-root'); if(r) r.innerHTML=''; toast(`Agregada a "${p.name}".`); }
});
document.addEventListener('input',e=>{ const t=e.target; if(!t) return;
  if(t.id==='rp-name'){ const pl=rpGet(RP.edit); if(pl){ pl.name=t.value.slice(0,80)||'Mi playlist'; rpSave(pl); } }
  if(t.id==='rp-add'){ RP.add=t.value; clearTimeout(RP.addT); RP.addT=setTimeout(()=>{ RP.focusAdd=true; rpPanelRefresh(); },200); } });
document.addEventListener('change',e=>{ const t=e.target; if(t&&t.dataset&&t.dataset.rpp==='aud'){ const pl=rpGet(RP.edit); if(pl&&pl.items[+t.dataset.k]){ pl.items[+t.dataset.k].audioId=t.value; rpSave(pl); } } });

/* Desde una alabanza: "＋ A playlist" y "▶ En el reproductor" */
window.rpPickFor=function(songId){ const s=S.songs.get(songId); if(!s||!(s.audio||[]).length) return; const L=rpLists(); const root=document.getElementById('modal-root'); if(!root) return;
  root.innerHTML=`<div class="scrim" data-rp-close><div class="modal" role="dialog" aria-label="Agregar a playlist" style="width:min(420px,100%)"><header><h3 style="flex:1">Agregar a playlist</h3><button type="button" class="btn ghost" data-rp-close aria-label="Cerrar">✕</button></header>
    <div class="body" style="display:grid;gap:8px"><p class="muted" style="margin:0">${esc(s.title)}</p>${L.map(p=>`<button class="btn" data-rpp="pick" data-s="${esc(s.id)}" data-id="${esc(p.id)}" style="justify-content:space-between">${esc(p.name)}<small class="muted">${p.items.length}${p.items.some(t=>t.songId===s.id)?' · ✓ ya está':''}</small></button>`).join('')}
    <button class="btn pri" data-rpp="pick" data-s="${esc(s.id)}" data-id="new">＋ Nueva playlist</button></div></div></div>`; };
window.rpOpen=rpOpen; window.rpPlaySong=function(songId,audioId){ const s=S.songs.get(songId); if(s&&(s.audio||[]).length) rpPlay([{songId,audioId:audioId||s.audio[0].id}],0); };

/* Al volver a abrir la app se recupera la cola (en pausa) */
(function rpRestore(){ const st=rpLS('vdn-rp'); if(!st||!st.q||!st.q.length) return; let tries=0;
  const t=setInterval(()=>{ tries++; if(S.songs&&S.songs.size){ clearInterval(t); RP.q=st.q.filter(x=>rpTrack(x)); RP.shuffle=!!st.shuffle; RP.repeat=st.repeat||'all'; if(!RP.q.length) return;
    RP.i=Math.min(Math.max(0,st.i|0),RP.q.length-1); const tr=rpTrack(RP.q[RP.i]); rpEl.src='/audio/'+tr.a.id; rpEl.addEventListener('loadedmetadata',function f(){ rpEl.removeEventListener('loadedmetadata',f); if(st.t) try{ rpEl.currentTime=st.t; }catch{} },{once:true}); rpBar(); }
    else if(tries>40) clearInterval(t); },500); })();
