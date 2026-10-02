/* Voz de la Novia — selección múltiple de canciones y papelera (60 días) */
"use strict";
const TR={items:null,sel:new Set(),loading:false,confirm:false,days:60};

/* ---------- Selección en la lista de canciones ---------- */
function selWrap(html){
  if(!V.sel) return html;
  html=html.replace(/<button class="row" data-act="open-song" data-id="([^"]+)">/g,(m,id)=>{ const on=V.sel.has(id.replace(/&quot;/g,'"').replace(/&amp;/g,'&'));
    return `<button class="row${on?' picked':''}" data-act="sel-toggle" data-id="${id}" aria-pressed="${on}"><span class="cbx" aria-hidden="true"></span>`; });
  const n=V.sel.size, vis=V._visible||[]; const allOn=vis.length&&vis.every(id=>V.sel.has(id));
  return html+`<div style="height:90px"></div><div class="selbar" role="region" aria-label="Canciones seleccionadas"><div class="in">
    <b>${n} ${n===1?'seleccionada':'seleccionadas'}</b>
    <button class="btn" data-act="sel-all">${allOn?'Quitar todas':`Seleccionar las ${vis.length} visibles`}</button>
    <button class="btn" data-act="sel-prog" ${n?'':'disabled'}>Agregar a programa</button>
    ${S.isAdmin?(V.confirm==='sel-trash'?`<span class="confirm">¿Mandar ${n} a la papelera? <button class="btn danger" data-act="sel-trash-yes">Sí</button><button class="btn" data-act="confirm-no">No</button></span>`:`<button class="btn danger" data-act="sel-trash" ${n?'':'disabled'}>Mover a la papelera</button>`):''}
    <button class="btn ghost" data-act="sel-start">Cancelar</button></div></div>`;
}
function selProgPicker(){
  const ids=[...V.sel]; const list=[...S.programs.values()].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  $('#modal-root').innerHTML=`<div class="scrim" data-act="close-modal"><div class="modal" role="dialog" aria-label="Agregar a programa" data-stop>
    <header><h3>Agregar ${ids.length} ${ids.length===1?'canción':'canciones'} a…</h3><button class="btn ghost" data-act="close-modal" aria-label="Cerrar">${ICON.x}</button></header>
    <div class="body"><div class="list">${list.map(p=>{ const f=fmtDate(p.date); return `<button class="row" data-act="sel-prog-to" data-id="${esc(p.id)}"><span class="cal" style="width:44px"><small>${esc(f.m)}</small><b style="font-size:18px">${esc(f.d)}</b></span><span class="t"><b>${esc(p.title)}</b><small>${(p.items||[]).length} canciones</small></span></button>`; }).join('')}
    <button class="row" data-act="sel-prog-to" data-id="__new"><span class="key sm">${ICON.plus}</span><span class="t"><b>Nuevo programa</b><small>Crear con estas canciones</small></span></button></div></div></div></div>`;
}
async function selProgTo(pid){
  const ids=[...V.sel].filter(id=>S.songs.has(id));
  let p=pid==='__new'?{id:newId('p'),title:'Nuevo programa',date:new Date().toISOString().slice(0,10),service:'',notes:'',items:[]}:JSON.parse(JSON.stringify(S.programs.get(pid)));
  p.items=[...(p.items||[]),...ids.map(id=>{ const s=S.songs.get(id), k=songKey(s); return {songId:id,key:k?keyCanon(k.idx,k.minor):'',note:''}; })];
  closeModal(); if(await writeDoc('programs',p)){ toast(`${ids.length} ${ids.length===1?'canción agregada':'canciones agregadas'} a “${p.title}”.`); V.sel=null; render(); }
}
async function selTrash(){
  const ids=[...V.sel]; V.confirm=null;
  try{ const r=await api('/api/trash',{method:'POST',body:JSON.stringify({ids})}); toast(`${r.count} ${r.count===1?'canción enviada':'canciones enviadas'} a la papelera. Puedes rescatarlas durante 60 días.`); V.sel=null; lastSig=''; await loadData(); render(); }
  catch(e){ if(e.code===401) lostAuth(); else toast(e.code===403?'Solo el administrador puede borrar canciones.':'No se pudieron mover a la papelera.'); }
}

/* ---------- Papelera ---------- */
function viewTrash(){
  if(!S.isAdmin){ V.view='list'; return viewSongs(); }
  if(TR.items===null&&!TR.loading) loadTrash();
  const items=TR.items||[]; const n=TR.sel.size;
  const left=t=>Math.max(0,Math.ceil((t+TR.days*86400000-Date.now())/86400000));
  return `<button class="btn ghost back" data-act="go-list">${ICON.back}Canciones</button>
  <div class="toolbar"><h2 style="font-family:var(--f-display);font-size:24px;flex:1">Papelera</h2></div>
  <p class="muted" style="margin:-6px 0 14px">Las canciones borradas se guardan aquí ${TR.days} días. Después se eliminan solas, con sus audios.</p>
  ${TR.items===null?'<div class="loading">Cargando…</div>':!items.length?'<div class="empty"><b>La papelera está vacía</b>Las canciones que borres aparecerán aquí.</div>':`
  <div class="actions" style="margin-bottom:10px"><button class="btn" data-act="tr-all">${n===items.length?'Quitar todas':'Seleccionar todas'}</button>
    <button class="btn pri" data-act="tr-restore" ${n?'':'disabled'}>Rescatar ${n||''}</button>
    ${TR.confirm?`<span class="confirm">¿Eliminar ${n} para siempre? No se puede deshacer. <button class="btn danger" data-act="tr-purge-yes">Sí, eliminar</button><button class="btn" data-act="tr-no">No</button></span>`:`<button class="btn danger" data-act="tr-purge" ${n?'':'disabled'}>Eliminar definitivamente</button>`}</div>
  <div style="display:grid;gap:6px">${items.map(it=>`<button class="trow${TR.sel.has(it.trashId)?' picked':''}" data-act="tr-toggle" data-id="${esc(it.trashId)}"><span class="cbx" aria-hidden="true"></span>
    <span><b style="font-family:var(--f-display)">${esc(it.title||'(sin título)')}</b><br><small class="muted">Borrada por ${esc(it.deletedBy||'')} · ${esc(fmtWhen(it.deletedAt))}${it.audio?` · ${it.audio} audio${it.audio>1?'s':''}`:''}</small></span>
    <span class="days">${left(it.deletedAt)} días</span></button>`).join('')}</div>`}`;
}
async function loadTrash(){ TR.loading=true; try{ const d=await api('/api/trash'); TR.items=d.items; TR.days=d.days||60; }catch(e){ TR.items=[]; if(e.code===401) lostAuth(); } TR.loading=false; if(V.view==='trash') render(); }

document.addEventListener('click',async ev=>{
  const el=ev.target.closest('[data-act]'); if(!el) return; const a=el.dataset.act, d=el.dataset;
  if(a==='sel-start'){ V.sel=V.sel?null:new Set(); V.confirm=null; render(); }
  else if(a==='sel-toggle'){ V.sel.has(d.id)?V.sel.delete(d.id):V.sel.add(d.id); render(); }
  else if(a==='sel-all'){ const vis=V._visible||[]; const allOn=vis.length&&vis.every(id=>V.sel.has(id)); vis.forEach(id=>allOn?V.sel.delete(id):V.sel.add(id)); render(); }
  else if(a==='sel-prog') selProgPicker();
  else if(a==='sel-prog-to') selProgTo(d.id);
  else if(a==='sel-trash'){ V.confirm='sel-trash'; render(); }
  else if(a==='sel-trash-yes') selTrash();
  else if(a==='go-trash'){ V.sel=null; TR.items=null; TR.sel=new Set(); TR.confirm=false; V.view='trash'; render(); window.scrollTo(0,0); }
  else if(a==='tr-toggle'){ TR.sel.has(d.id)?TR.sel.delete(d.id):TR.sel.add(d.id); render(); }
  else if(a==='tr-all'){ const all=(TR.items||[]).map(i=>i.trashId); TR.sel=TR.sel.size===all.length?new Set():new Set(all); render(); }
  else if(a==='tr-no'){ TR.confirm=false; render(); }
  else if(a==='tr-purge'){ TR.confirm=true; render(); }
  else if(a==='tr-restore'||a==='tr-purge-yes'){
    const ids=[...TR.sel]; TR.confirm=false;
    try{ const r=await api(a==='tr-restore'?'/api/trash/restore':'/api/trash/purge',{method:'POST',body:JSON.stringify({ids})});
      toast(a==='tr-restore'?`${r.count} ${r.count===1?'canción rescatada':'canciones rescatadas'}.`:`${r.count} eliminada${r.count===1?'':'s'} para siempre.`);
      TR.sel=new Set(); TR.items=null; lastSig=''; await loadData(); loadTrash(); }
    catch(e){ if(e.code===401) lostAuth(); else toast('No se pudo completar la acción.'); }
  }
});
