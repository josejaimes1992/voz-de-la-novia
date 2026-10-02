/* Voz de la Novia — equipo: cuenta, usuarios, registro de cambios, historial */
"use strict";
const ROLE_NAME={admin:'Administrador',moderator:'Moderador'};
const ACTION_NAME={create:'Creó',update:'Editó',delete:'Borró',import:'Importó',restore:'Restauró',audio:'Subió audio','audio-delete':'Borró audio'};
const COL_NAME={songs:'canción',programs:'programa'};

function modal(title,inner,width){
  $('#modal-root').innerHTML=`<div class="scrim" data-act="close-modal"><div class="modal" role="dialog" aria-label="${esc(title)}" data-stop style="width:min(${width||520}px,100%)">
    <header><h3>${esc(title)}</h3><button class="btn ghost" data-act="close-modal" aria-label="Cerrar">${ICON.x}</button></header>
    <div class="body" id="m-body" style="display:grid;gap:10px">${inner}</div></div></div>`;
}

/* ---------- Menú de cuenta ---------- */
function openUserMenu(){
  const u=S.user;
  modal(u.name,`<p class="muted" style="margin:0">${esc(ROLE_NAME[u.role]||u.role)} · usuario <b>${esc(u.username)}</b></p>
    <div class="menu">
      ${S.isAdmin?`<button class="btn" data-act="t-changes">Cambios del equipo ${S.unread?`<span class="badge">${S.unread}</span>`:''}</button><button class="btn" data-act="t-users">Usuarios</button>`:''}
      <button class="btn" data-act="t-pass">Cambiar mi contraseña</button>
      <button class="btn danger" data-act="t-logout">Salir</button>
    </div>`,380);
}
async function teamLogout(){ try{ await api('/api/logout',{method:'POST'}); }catch{} setUser(null); S.token=null; lsSet('vdn-token',null); closeModal(); if(V.view==='edit'){ V.draft=null; V.view='list'; } render(); toast('Sesión cerrada.'); }
function openPassword(){
  modal('Cambiar mi contraseña',`<form id="pw-form" style="display:grid;gap:10px">
    <label class="f">Contraseña actual<input id="pw-cur" type="password" autocomplete="current-password" required></label>
    <label class="f">Nueva contraseña (mínimo 6)<input id="pw-new" type="password" autocomplete="new-password" minlength="6" required></label>
    <p id="pw-err" class="confirm" hidden></p><button class="btn pri" type="submit" style="justify-content:center">Guardar</button></form>`,400);
  $('#pw-form').addEventListener('submit',async ev=>{ ev.preventDefault(); const err=$('#pw-err');
    const r=await fetch('/api/me/password',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+S.token},body:JSON.stringify({current:$('#pw-cur').value,password:$('#pw-new').value})});
    if(r.ok){ closeModal(); toast('Contraseña cambiada.'); return; }
    err.textContent=r.status===403?'La contraseña actual no es correcta.':'La nueva contraseña debe tener al menos 6 caracteres.'; err.hidden=false; });
}

/* ---------- Usuarios (administrador) ---------- */
async function openUsers(){
  modal('Usuarios','<p class="muted">Cargando…</p>',560);
  let d; try{ d=await api('/api/users'); }catch{ $('#m-body').innerHTML='<p>No se pudo cargar la lista.</p>'; return; }
  $('#m-body').innerHTML=`<div style="display:grid;gap:6px">${d.users.map(u=>`<div class="urow"><div><b>${esc(u.name)}</b> <small class="muted">@${esc(u.username)}</small><br><small class="muted">${esc(ROLE_NAME[u.role]||u.role)}${u.active?'':' · desactivado'}</small></div>
      <div class="actions">${u.id===S.user.id?'<small class="muted">Tú</small>':`<select data-urole="${u.id}" aria-label="Rol">${Object.keys(ROLE_NAME).map(r=>`<option value="${r}" ${u.role===r?'selected':''}>${ROLE_NAME[r]}</option>`).join('')}</select>
      <button class="btn" data-act="u-reset" data-id="${u.id}" data-n="${esc(u.name)}">Nueva contraseña</button>
      <button class="btn ${u.active?'danger':''}" data-act="u-active" data-id="${u.id}" data-v="${u.active?0:1}">${u.active?'Desactivar':'Activar'}</button>`}</div></div>`).join('')}</div>
    <form id="u-new" style="display:grid;gap:8px;border-top:1px solid var(--line);padding-top:12px"><b style="font-family:var(--f-display)">Agregar usuario</b>
      <div class="grid2"><label class="f">Nombre<input id="u-name" required placeholder="Ej. DAVID"></label><label class="f">Usuario para ingresar<input id="u-user" required placeholder="ej. david" autocapitalize="none" pattern="[a-z0-9._\\-]{2,30}"></label>
      <label class="f">Rol<select id="u-role"><option value="moderator">Moderador (crea y edita)</option><option value="admin">Administrador</option></select></label><label class="f">Contraseña inicial<input id="u-pass" required minlength="6"></label></div>
      <p id="u-err" class="confirm" hidden></p><button class="btn pri" type="submit" style="justify-content:center">Crear usuario</button></form>`;
  $('#u-new').addEventListener('submit',async ev=>{ ev.preventDefault(); const err=$('#u-err');
    try{ await api('/api/users',{method:'POST',body:JSON.stringify({name:$('#u-name').value.trim().toUpperCase(),username:$('#u-user').value.trim().toLowerCase(),role:$('#u-role').value,password:$('#u-pass').value})}); toast('Usuario creado.'); openUsers(); }
    catch(e){ err.textContent='Revisa los datos: el usuario debe ser único, en minúsculas y sin espacios; la contraseña de 6 o más caracteres.'; err.hidden=false; } });
}
async function userPatch(id,body,msg){ try{ await api('/api/users/'+id,{method:'PATCH',body:JSON.stringify(body)}); toast(msg); openUsers(); }catch{ toast('No se pudo actualizar el usuario.'); } }
function openReset(id,name){
  modal('Nueva contraseña para '+name,`<form id="r-form" style="display:grid;gap:10px"><label class="f">Nueva contraseña (mínimo 6)<input id="r-pass" required minlength="6"></label>
    <p class="muted" style="margin:0;font-size:13px">Su sesión se cerrará en todos sus dispositivos.</p><button class="btn pri" type="submit" style="justify-content:center">Guardar</button></form>`,400);
  $('#r-form').addEventListener('submit',ev=>{ ev.preventDefault(); userPatch(id,{password:$('#r-pass').value},'Contraseña actualizada.'); });
}
document.addEventListener('change',e=>{ const el=e.target; if(el.dataset&&el.dataset.urole) userPatch(Number(el.dataset.urole),{role:el.value},'Rol actualizado.'); });

/* ---------- Registro de cambios ---------- */
async function teamPoll(){
  if(!S.isAdmin) return;
  try{ const d=await api('/api/changes/unread'); const before=S.unread; S.unread=d.unread||0; authButton();
    if(S.unread>before && teamPoll.started) toast(`Hay ${S.unread} ${S.unread===1?'cambio nuevo':'cambios nuevos'} del equipo.`);
    if(!teamPoll.started && S.unread) toast(`Tienes ${S.unread} ${S.unread===1?'cambio nuevo':'cambios nuevos'} del equipo para revisar.`);
  }catch{}
  if(!teamPoll.started){ teamPoll.started=true; setInterval(()=>{ if(document.visibilityState==='visible') teamPoll(); },60000); }
}
async function openChanges(){
  modal('Cambios del equipo','<p class="muted">Cargando…</p>',640);
  let d; try{ d=await api('/api/changes?limit=100'); }catch{ $('#m-body').innerHTML='<p>No se pudo cargar el registro.</p>'; return; }
  S.unread=d.unread; authButton();
  $('#m-body').innerHTML=`<div class="actions"><span class="muted" style="flex:1">${d.unread?`${d.unread} sin revisar`:'Todo revisado'}</span>${d.unread?'<button class="btn" data-act="c-seen-all">Marcar todo como revisado</button>':''}</div>
    <div style="display:grid;gap:6px">${d.changes.length?d.changes.map(c=>`<button class="chg ${c.seen?'':'unread'}" data-act="c-open" data-id="${c.id}">
      <span class="act ${esc(c.action)}">${esc(ACTION_NAME[c.action]||c.action)}</span>
      <span><b>${esc(c.title||'(sin título)')}</b><br><small>${esc(c.username)} · ${esc(COL_NAME[c.col]||c.col)} · ${esc(fmtWhen(Number(c.at)))}</small></span><span aria-hidden="true">›</span></button>`).join(''):'<p class="muted">Aún no hay cambios registrados.</p>'}</div>`;
}
function lineDiff(a,b){
  a=(a||'').split('\n'); b=(b||'').split('\n'); const n=a.length,m=b.length;
  if(n*m>250000) return (a.join('\n')===b.join('\n'))?'':`<span class="del">${esc(a.join('\n'))}</span><span class="add">${esc(b.join('\n'))}</span>`;
  const L=Array.from({length:n+1},()=>new Uint16Array(m+1));
  for(let i=n-1;i>=0;i--) for(let j=m-1;j>=0;j--) L[i][j]=a[i]===b[j]?L[i+1][j+1]+1:Math.max(L[i+1][j],L[i][j+1]);
  let i=0,j=0,out='',changed=false;
  while(i<n||j<m){
    if(i<n&&j<m&&a[i]===b[j]){ out+=esc(a[i])+'\n'; i++; j++; }
    else if(j<m&&(i>=n||L[i][j+1]>=L[i+1][j])){ out+=`<span class="add">+ ${esc(b[j])}</span>`; j++; changed=true; }
    else { out+=`<span class="del">− ${esc(a[i])}</span>`; i++; changed=true; }
  }
  return changed?out:'';
}
const FIELD_NAME={title:'Título',author:'Autor',key:'Tono',category:'Categoría',bpm:'Tempo',capo:'Capo',notes:'Notas',date:'Fecha',service:'Servicio'};
function changeSummary(c){
  const a=c.before||{}, b=c.after||{}; let html='';
  const nv=v=>(v===undefined||v===null||v===0||v==='0')?'':String(v); const fields=Object.keys(FIELD_NAME).filter(k=>nv(a[k])!==nv(b[k]));
  if(c.action!=='delete'&&c.before&&fields.length) html+=`<div class="diff">${fields.map(k=>`${FIELD_NAME[k]}: <span class="del">− ${esc(a[k]??'')}</span><span class="add">+ ${esc(b[k]??'')}</span>`).join('')}</div>`;
  if(c.action==='audio'||c.action==='audio-delete'){ const na=(a.audio||[]).map(x=>x.name).join('\n'), nb=(b.audio||[]).map(x=>x.name).join('\n'); const d=lineDiff(na,nb); return `<b>Audios</b><div class="diff">${d||esc(nb)}</div>`; }
  if(c.col==='songs'){
    const d1=lineDiff(a.body,b.body), d2=lineDiff(a.bodyPro,b.bodyPro);
    if(!c.before||!c.after){ const t=(c.after||c.before).body||''; html+=`<b>Letra (acordes básicos)</b><div class="diff">${esc(t)}</div>`; }
    else { if(d1) html+=`<b>Acordes básicos</b><div class="diff">${d1}</div>`; if(d2) html+=`<b>Versión original</b><div class="diff">${d2}</div>`; }
  } else if(c.col==='programs'){
    const names=p=>(p&&p.items||[]).map((it,i)=>`${i+1}. ${(S.songs.get(it.songId)||{}).title||'(canción borrada)'} · ${it.key||''}${it.note?' · '+it.note:''}`).join('\n');
    const d=c.before&&c.after?lineDiff(names(a),names(b)):esc(names(c.after||c.before)); if(d) html+=`<b>Canciones del programa</b><div class="diff">${d}</div>`;
  }
  return html||'<p class="muted">Sin diferencias de contenido (solo se guardó de nuevo).</p>';
}
async function openChange(id){
  let d; try{ d=await api('/api/changes/'+id); }catch{ toast('No se pudo abrir el cambio.'); return; }
  const c=d.change;
  modal(`${ACTION_NAME[c.action]||c.action}: ${c.title||''}`,`<p class="muted" style="margin:0">${esc(c.username)} · ${esc(fmtWhen(Number(c.at)))}</p>${changeSummary(c)}
    <div class="actions">${S.isAdmin?'<button class="btn" data-act="c-back">‹ Volver a cambios</button>':''}
      ${c.before&&c.col==='songs'&&S.isAdmin?`<button class="btn" data-act="c-restore" data-id="${c.id}">Restaurar la versión anterior</button>`:''}
      ${c.after&&S.songs.has(c.doc_id)?`<button class="btn" data-act="open-song" data-id="${esc(c.doc_id)}">Ver canción</button>`:''}</div>`,700);
  if(S.isAdmin&&!c.seen){ try{ await api('/api/changes/seen',{method:'POST',body:JSON.stringify({id:c.id})}); S.unread=Math.max(0,S.unread-1); authButton(); }catch{} }
  openChange.last=c;
}
async function restoreChange(){
  const c=openChange.last; if(!c||!c.before) return;
  if(V.confirm!=='restore'){ V.confirm='restore'; toast('Pulsa otra vez para confirmar la restauración.'); return; } V.confirm=null;
  const data={...c.before,id:c.doc_id}; delete data.updatedBy; delete data.updatedAt;
  if(await writeDoc(c.col,data)){ closeModal(); lastSig=''; await loadData(); toast('Versión anterior restaurada.'); }
}
async function openHistory(col,id){
  modal('Historial','<p class="muted">Cargando…</p>',560);
  let d; try{ d=await api(`/api/history/${col}/${encodeURIComponent(id)}`); }catch{ $('#m-body').innerHTML='<p>No se pudo cargar el historial.</p>'; return; }
  $('#m-body').innerHTML=d.history.length?`<div style="display:grid;gap:6px">${d.history.map(c=>`<button class="chg" data-act="c-open" data-id="${c.id}"><span class="act ${esc(c.action)}">${esc(ACTION_NAME[c.action]||c.action)}</span><span><b>${esc(c.username)}</b><br><small>${esc(fmtWhen(Number(c.at)))}</small></span><span aria-hidden="true">›</span></button>`).join('')}</div>`:'<p class="muted">Esta canción todavía no tiene cambios registrados.</p>';
}

document.addEventListener('click',async ev=>{
  const el=ev.target.closest('[data-act]'); if(!el) return; const a=el.dataset.act, ds=el.dataset;
  if(a==='t-logout') teamLogout(); else if(a==='t-pass') openPassword(); else if(a==='t-users') openUsers(); else if(a==='t-changes'||a==='c-back') openChanges();
  else if(a==='c-open') openChange(Number(ds.id)); else if(a==='c-restore') restoreChange();
  else if(a==='c-seen-all'){ try{ await api('/api/changes/seen',{method:'POST',body:JSON.stringify({all:true})}); S.unread=0; authButton(); openChanges(); }catch{ toast('No se pudo marcar.'); } }
  else if(a==='u-reset') openReset(Number(ds.id),ds.n);
  else if(a==='u-active') userPatch(Number(ds.id),{active:ds.v==='1'},ds.v==='1'?'Usuario activado.':'Usuario desactivado.');
});
if(S.isAdmin) teamPoll();
