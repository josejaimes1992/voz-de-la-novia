/* Voz de la Novia — equipo: cuenta, usuarios, registro de cambios, historial */
"use strict";
const ROLE_NAME={admin:'Administrador',moderator:'Moderador'};
const ACTION_NAME={create:'Creó',update:'Editó',delete:'Borró',import:'Importó',restore:'Restauró',audio:'Subió audio','audio-delete':'Borró audio',trash:'Mandó a papelera',untrash:'Rescató de papelera'};
const COL_NAME={songs:'canción',programs:'programa'};

function modal(title,inner,width){
  $('#modal-root').innerHTML=`<div class="scrim" data-act="close-modal"><div class="modal" role="dialog" aria-label="${esc(title)}" data-stop style="width:min(${width||520}px,100%)">
    <header><h3>${esc(title)}</h3><button class="btn ghost" data-act="close-modal" aria-label="Cerrar">${ICON.x}</button></header>
    <div class="body" id="m-body" style="display:grid;gap:10px">${inner}</div></div></div>`;
}

/* ---------- Equipo: fotos y nombres completos ---------- */
S.team=S.team||new Map();
async function loadTeam(){ if(!S.user) return; try{ const d=await api('/api/team'); S.team=new Map(d.team.map(u=>[u.id,u])); S.teamByName=new Map(d.team.map(u=>[u.name,u])); if(V.view==='song') render(); }catch{} }
function teamOf(id,name){ return (id!=null&&S.team.get(Number(id)))||(name&&S.teamByName&&S.teamByName.get(name))||null; }
function initials(u){ const s=(u&&(u.full_name||u.name))||'?'; return s.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase(); }
function avatar(u,size){ size=size||32; const st=`width:${size}px;height:${size}px;font-size:${Math.round(size*.38)}px`;
  return u&&u.photo?`<img class="ava" src="${esc(u.photo)}" alt="" style="${st}">`:`<span class="ava ini" style="${st}" aria-hidden="true">${esc(initials(u))}</span>`; }
function whoHtml(id,name,size){ const u=teamOf(id,name); return `<span class="who">${avatar(u||{name},size||22)}<span>${esc(u&&u.full_name?u.full_name:name||'')}</span></span>`; }
(function(){ const st=document.createElement('style'); st.textContent=`
.ava{border-radius:50%;object-fit:cover;flex:none;display:inline-grid;place-items:center;background:var(--accent-soft);color:var(--accent);font-weight:700;border:1px solid var(--line)}
.who{display:inline-flex;align-items:center;gap:6px;vertical-align:middle}
.ucard{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:center;border:1px solid var(--line);border-radius:10px;padding:10px 12px;background:var(--surface);text-align:left;width:100%}
.ucard:hover{border-color:var(--accent)}
.ucard.off{opacity:.6}
.ucard small{color:var(--muted)}
.ph{display:flex;align-items:center;gap:14px}
.ulog{border:1px solid var(--line);border-radius:8px;padding:8px 12px;background:var(--surface);display:grid;gap:4px}
.ulog .h{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.ulog ul{margin:0;padding-left:18px;font-size:13px}
.ulog s{color:var(--muted)}
.utabs{display:flex;gap:4px}
`; document.head.appendChild(st); })();

/* Reduce la foto a 320×320 (JPEG) antes de subirla */
function photoFromFile(file){ return new Promise((res,rej)=>{ if(!file||!/^image\//.test(file.type)) return rej(new Error('type'));
  const img=new Image(); const url=URL.createObjectURL(file);
  img.onload=()=>{ const s=Math.min(img.naturalWidth,img.naturalHeight); const c=document.createElement('canvas'); c.width=c.height=320;
    c.getContext('2d').drawImage(img,(img.naturalWidth-s)/2,(img.naturalHeight-s)/2,s,s,0,0,320,320); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg',.85)); };
  img.onerror=()=>{ URL.revokeObjectURL(url); rej(new Error('img')); }; img.src=url; }); }
function photoField(cur){ return `<div class="ph"><span id="ph-prev">${avatar(cur,72)}</span><div style="display:grid;gap:6px">
  <label class="btn" style="cursor:pointer">${cur&&cur.photo?'Cambiar foto':'Poner foto'}<input type="file" accept="image/*" id="ph-in" hidden></label>
  ${cur&&cur.photo?'<button type="button" class="btn ghost" id="ph-del">Quitar foto</button>':''}</div></div>`; }
function wirePhoto(state,base){
  const show=()=>{ $('#ph-prev').innerHTML=avatar({...base,photo:state.photo===undefined?base.photo:state.photo},72); };
  $('#ph-in')?.addEventListener('change',async e=>{ const f=e.target.files[0]; if(!f) return; try{ state.photo=await photoFromFile(f); show(); }catch{ toast('Elige una imagen (JPG o PNG).'); } });
  $('#ph-del')?.addEventListener('click',()=>{ state.photo=null; show(); });
}

/* ---------- Menú de cuenta ---------- */
function openUserMenu(){
  const u=S.user;
  modal('Mi cuenta',`<div class="ph">${avatar(u,56)}<div><b style="font-size:16px">${esc(u.full_name||u.name)}</b><br><small class="muted">${esc(ROLE_NAME[u.role]||u.role)} · usuario <b>${esc(u.username)}</b></small></div></div>
    <div class="menu">
      ${S.isAdmin?`<button class="btn" data-act="t-changes">Cambios del equipo ${S.unread?`<span class="badge">${S.unread}</span>`:''}</button><button class="btn" data-act="t-users">Gestor de usuarios</button>`:''}
      <button class="btn" data-act="t-profile">Mi perfil (nombre y foto)</button>
      <button class="btn" data-act="t-pass">Cambiar mi contraseña</button>
      <button class="btn danger" data-act="t-logout">Salir</button>
    </div>`,400);
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
function openProfile(){
  const u=S.user; const st={};
  modal('Mi perfil',`<form id="pf" style="display:grid;gap:12px">${photoField(u)}
    <label class="f">Nombre completo<input id="pf-full" value="${esc(u.full_name||'')}" placeholder="Ej. José David Jaimes Ruiz" maxlength="80"></label>
    <p class="muted" style="margin:0;font-size:13px">Nombre corto: <b>${esc(u.name)}</b> · usuario <b>${esc(u.username)}</b> (los cambia el administrador)</p>
    <button class="btn pri" type="submit" style="justify-content:center">Guardar</button></form>`,440);
  wirePhoto(st,u);
  $('#pf').addEventListener('submit',async ev=>{ ev.preventDefault(); const body={full_name:$('#pf-full').value}; if(st.photo!==undefined) body.photo=st.photo;
    try{ const d=await api('/api/me',{method:'PATCH',body:JSON.stringify(body)}); S.user={...S.user,...d.user}; closeModal(); toast('Perfil actualizado.'); loadTeam(); authButton(); }
    catch(e){ if(e.code===401) lostAuth(); else toast('No se pudo guardar. Prueba con otra foto.'); } });
}

/* ---------- Gestor de usuarios (administrador) ---------- */
const UM={users:[],tab:'users'};
async function openUsers(tab){
  UM.tab=tab||'users';
  modal('Gestor de usuarios','<p class="muted">Cargando…</p>',640);
  if(UM.tab==='log') return drawUserLog();
  let d; try{ d=await api('/api/users'); }catch{ $('#m-body').innerHTML='<p>No se pudo cargar la lista.</p>'; return; }
  UM.users=d.users;
  $('#m-body').innerHTML=`${umTabs()}
    <div style="display:grid;gap:8px">${d.users.map(u=>`<button class="ucard ${u.active?'':'off'}" data-act="u-edit" data-id="${u.id}">${avatar(u,44)}
      <span><b>${esc(u.full_name||u.name)}</b>${u.full_name?` <small>(${esc(u.name)})</small>`:''}<br><small>@${esc(u.username)} · ${esc(ROLE_NAME[u.role]||u.role)}${u.active?'':' · desactivado'}${u.id===S.user.id?' · tú':''}</small></span>
      <span class="btn" aria-hidden="true">Editar</span></button>`).join('')}</div>
    <button class="btn pri" data-act="u-new" style="justify-content:center">＋ Agregar usuario</button>`;
}
function umTabs(){ return `<div class="seg utabs" role="group"><button data-act="u-tab" data-v="users" aria-pressed="${UM.tab==='users'}">Usuarios</button><button data-act="u-tab" data-v="log" aria-pressed="${UM.tab==='log'}">Historial de cambios</button></div>`; }
function userForm(u){
  const isNew=!u; const self=u&&u.id===S.user.id; const st={};
  modal(isNew?'Agregar usuario':'Editar usuario',`<form id="uf" style="display:grid;gap:12px">${photoField(u)}
    <label class="f">Nombre completo<input id="uf-full" value="${esc(u?.full_name||'')}" placeholder="Ej. Jorge Luis Pérez Gómez" maxlength="80"></label>
    <div class="grid2">
      <label class="f">Nombre corto (aparece en los cambios)<input id="uf-name" required maxlength="40" value="${esc(u?.name||'')}" placeholder="Ej. JORGE" style="text-transform:uppercase"></label>
      <label class="f">Usuario para ingresar${isNew?'':' (no se cambia)'}<input id="uf-user" ${isNew?'required':'disabled'} value="${esc(u?.username||'')}" placeholder="ej. jorge" autocapitalize="none" pattern="[a-z0-9._\-]{2,30}"></label>
      <label class="f">Rol<select id="uf-role" ${self?'disabled':''}><option value="moderator" ${u?.role==='moderator'?'selected':''}>Moderador (crea y edita)</option><option value="admin" ${u?.role==='admin'?'selected':''}>Administrador</option></select></label>
      <label class="f">${isNew?'Contraseña inicial':'Nueva contraseña (opcional)'}<input id="uf-pass" type="text" ${isNew?'required':''} minlength="6" autocomplete="new-password" placeholder="${isNew?'mínimo 6':'déjala vacía para no cambiarla'}"></label>
    </div>
    ${!isNew&&!self?`<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="uf-active" ${u.active?'checked':''}> Usuario activo (puede ingresar)</label>`:''}
    ${!isNew?`<p class="muted" style="margin:0;font-size:12.5px">${u.created_at?'Creado el '+esc(fmtWhen(u.created_at)):''}${u.updated_at?' · Última modificación '+esc(fmtWhen(u.updated_at)):''}${!self?' · Si cambias la contraseña o lo desactivas, su sesión se cierra en todos sus dispositivos.':''}</p>`:''}
    <p id="uf-err" class="confirm" hidden></p>
    <div class="actions"><button class="btn pri" type="submit">${isNew?'Crear usuario':'Guardar cambios'}</button><button class="btn" type="button" data-act="u-back">Cancelar</button></div></form>`,560);
  wirePhoto(st,u||{});
  $('#uf').addEventListener('submit',async ev=>{ ev.preventDefault(); const err=$('#uf-err'); err.hidden=true;
    const pass=$('#uf-pass').value;
    if(pass&&pass.length<6){ err.textContent='La contraseña debe tener al menos 6 caracteres.'; err.hidden=false; return; }
    const body={full_name:$('#uf-full').value,name:$('#uf-name').value.trim().toUpperCase(),role:$('#uf-role').value};
    if(st.photo!==undefined) body.photo=st.photo; if(pass) body.password=pass;
    if(!isNew&&$('#uf-active')) body.active=$('#uf-active').checked;
    try{
      if(isNew){ body.username=$('#uf-user').value.trim().toLowerCase(); await api('/api/users',{method:'POST',body:JSON.stringify(body)}); toast('Usuario creado.'); }
      else { if(self) delete body.role; const d=await api('/api/users/'+u.id,{method:'PATCH',body:JSON.stringify(body)}); if(self) S.user={...S.user,...d.user}; toast('Cambios guardados.'); }
      loadTeam(); authButton(); openUsers();
    }catch(e){ if(e.code===401){ closeModal(); lostAuth(); return; }
      err.textContent=isNew?'Revisa los datos: el usuario debe ser único, en minúsculas y sin espacios; la contraseña de 6 o más caracteres.':'No se pudo guardar. Revisa los datos o prueba con otra foto.'; err.hidden=false; } });
}
const ULOG_ACT={create:'Creó el usuario',update:'Modificó',profile:'Actualizó su perfil',password:'Cambió su contraseña'};
async function drawUserLog(){
  let d; try{ d=await api('/api/user-log'); }catch{ $('#m-body').innerHTML=umTabs()+'<p>No se pudo cargar el historial.</p>'; return; }
  $('#m-body').innerHTML=umTabs()+(d.log.length?`<div style="display:grid;gap:8px">${d.log.map(l=>{ const self=l.actor_id===l.target_id;
    return `<div class="ulog"><div class="h">${whoHtml(l.actor_id,l.actor_name,24)}<span class="muted">${esc(ULOG_ACT[l.action]||l.action)}${self||l.action==='profile'||l.action==='password'?'':' a'}</span>${self?'':whoHtml(l.target_id,l.target_name,24)}<small class="muted" style="margin-left:auto">${esc(fmtWhen(l.at))}</small></div>
      <ul>${(l.detail||[]).map(x=>`<li><b>${esc(x.field)}:</b> ${x.before!==undefined&&x.before!==''?`<s>${esc(x.before)}</s> → `:''}${esc(x.after||'')}</li>`).join('')}</ul></div>`; }).join('')}</div>`:'<p class="muted">Todavía no hay cambios de usuarios registrados.</p>');
}

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
      <span><b>${esc(c.title||'(sin título)')}</b><br><small>${whoHtml(c.user_id,c.username,18)} · ${esc(COL_NAME[c.col]||c.col)} · ${esc(fmtWhen(Number(c.at)))}</small></span><span aria-hidden="true">›</span></button>`).join(''):'<p class="muted">Aún no hay cambios registrados.</p>'}</div>`;
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
  modal(`${ACTION_NAME[c.action]||c.action}: ${c.title||''}`,`<p class="muted" style="margin:0">${whoHtml(c.user_id,c.username,26)} · ${esc(fmtWhen(Number(c.at)))}</p>${changeSummary(c)}
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
  $('#m-body').innerHTML=d.history.length?`<div style="display:grid;gap:6px">${d.history.map(c=>`<button class="chg" data-act="c-open" data-id="${c.id}"><span class="act ${esc(c.action)}">${esc(ACTION_NAME[c.action]||c.action)}</span><span><b>${whoHtml(c.user_id,c.username,22)}</b><br><small>${esc(fmtWhen(Number(c.at)))}</small></span><span aria-hidden="true">›</span></button>`).join('')}</div>`:'<p class="muted">Esta canción todavía no tiene cambios registrados.</p>';
}

document.addEventListener('click',async ev=>{
  const el=ev.target.closest('[data-act]'); if(!el) return; const a=el.dataset.act, ds=el.dataset;
  if(a==='t-logout') teamLogout(); else if(a==='t-pass') openPassword(); else if(a==='t-profile') openProfile(); else if(a==='t-users'||a==='u-back') openUsers(); else if(a==='u-tab') openUsers(ds.v); else if(a==='u-new') userForm(null); else if(a==='u-edit') userForm(UM.users.find(u=>u.id===Number(ds.id))); else if(a==='t-changes'||a==='c-back') openChanges();
  else if(a==='c-open') openChange(Number(ds.id)); else if(a==='c-restore') restoreChange();
  else if(a==='c-seen-all'){ try{ await api('/api/changes/seen',{method:'POST',body:JSON.stringify({all:true})}); S.unread=0; authButton(); openChanges(); }catch{ toast('No se pudo marcar.'); } }
});
if(S.isAdmin) teamPoll();
if(S.user) loadTeam();
