/* Voz de la Novia — Mensaje: buscar citas de los sermones y proyectarlas (como la Biblia) */
"use strict";
const MS={edit:false,list:null,loading:false,err:'',cur:null,curId:null,p:null,part:0,live:false,q:'',res:null,remote:null,imp:null};
const MS_WORDS=55;

(function(){ const st=document.createElement('style'); st.textContent=`
.ms-list{display:grid;gap:4px}
.ms-row{display:flex;gap:10px;align-items:baseline;text-align:left;border:1px solid var(--line);background:var(--surface);border-radius:10px;padding:9px 12px;color:inherit;font:inherit;cursor:pointer;width:100%}
.ms-row code{font-family:var(--f-mono);font-size:12.5px;color:var(--accent);flex:none;min-width:72px}
.ms-row span{flex:1;min-width:0}
.ms-row small{display:block;color:var(--muted);font-size:12.5px;margin-top:2px}
.ms-p{display:block;width:100%;text-align:justify;border:0;border-bottom:1px solid var(--line);background:none;color:inherit;font:inherit;font-size:16px;line-height:1.5;padding:10px 12px;cursor:pointer}
.ms-p b{color:var(--accent);margin-right:6px;font-family:var(--f-ui)}
.ms-p[aria-current="true"]{background:#5b6b16;color:#fff}.ms-p[aria-current="true"] b{color:#fff}
.ms-p.onscr{box-shadow:inset 4px 0 0 #e05a4f}
.ms-head{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.ms-head h2{font-family:var(--f-display);font-size:22px;margin:0;flex:1;min-width:200px}
.ms-snip mark{background:var(--accent-soft);color:inherit;border-radius:3px}
.ms-imp{border:1px dashed var(--line);border-radius:12px;padding:12px 14px;background:var(--surface);font-size:14px}
`; document.head.appendChild(st); })();

function msNorm(s){ return (s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase(); }
async function msLoadList(force){
  if(MS.loading||(MS.list&&!force)) return; if(!S.token){ return; }
  MS.loading=true; MS.err='';
  try{ MS.list=(await api('/api/sermons')).sermons; }catch(e){ if(e.message==='auth'){ lostAuth(); } MS.err='No se pudo cargar la lista de mensajes.'; }
  MS.loading=false; if(V.view==='mensaje') render();
}
async function msOpen(id,p){
  MS.curId=id; MS.edit=false; MS.p=p!=null?p:null; MS.part=0; if(!MS.cur||MS.cur.id!==id){ MS.cur=null; render();
    try{ MS.cur=await api('/api/sermons/'+encodeURIComponent(id)); }catch{ toast('No se pudo abrir el mensaje.'); MS.curId=null; } }
  MS.q=''; MS.res=null; render(); if(MS.p!=null) setTimeout(msScroll,30);
}
/* Un párrafo largo se proyecta en partes */
function msParts(t){
  const w=t.split(/\s+/); if(w.length<=MS_WORDS*1.25) return [t];
  const n=Math.ceil(w.length/MS_WORDS), size=Math.ceil(w.length/n); const out=[]; let i=0;
  while(i<w.length){ let j=Math.min(w.length,i+size);
    for(let k=j;k>i+size*0.6&&k<w.length;k--){ if(/[.;:!?]$/.test(w[k-1])){ j=k; break; } }
    out.push(w.slice(i,j).join(' ')); i=j; }
  return out;
}
window.viewMensaje=function(){
  if(!S.token) return `<div class="empty"><b>Mensaje</b>Ingresa con tu usuario para buscar y proyectar citas del Mensaje.</div>`;
  msLoadList();
  const can=S.canWrite; const r=MS.remote||(typeof PJ!=='undefined'&&PJ.remote)||null; const onP=r&&r.mode==='text'&&r.sermon?r.sermon:null;
  let h=`<div class="bb">
    <div class="bb-find"><div class="search">${ICON.search}<input id="ms-q" type="search" autocomplete="off" placeholder="Busca una frase del Mensaje, un título o un código (65-1125)" value="${esc(MS.q)}" aria-label="Buscar en el Mensaje"></div></div>
    <div id="ms-res" class="bb-sug">${msResHtml()}</div>`;
  if(MS.curId){
    const s=MS.cur;
    if(!s) return h+'<div class="loading">Abriendo el mensaje…</div></div>';
    if(MS.edit&&can){
      const txt=s.paras.map(p=>`${p.n} ${p.t}`).join('\n\n');
      return h+`<div class="ms-head"><button class="btn ghost" data-act="ms-edit-cancel">${ICON.back}Cancelar</button><h2>Editar mensaje</h2></div>
        <div class="grid2"><label class="f">Título<input id="ms-e-title" value="${esc(s.title)}"></label><label class="f">Código<input id="ms-e-code" value="${esc(s.code||'')}" placeholder="65-1125"></label><label class="f">Ciudad<input id="ms-e-place" value="${esc(s.place||'')}" placeholder="Jeffersonville, Indiana, E.U.A."></label></div>
        <p class="muted" style="margin:0;font-size:13px">Cada párrafo empieza con su número y se separa del siguiente con una línea en blanco. Puedes corregir el texto, unir o separar párrafos.</p>
        <textarea id="ms-e-text" spellcheck="true" style="width:100%;min-height:60vh;font:inherit;font-size:16px;line-height:1.5;padding:12px;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:inherit;resize:vertical">${esc(txt)}</textarea>
        <div class="actions"><button class="btn pri" data-act="ms-edit-save">Guardar cambios</button><button class="btn" data-act="ms-edit-cancel">Cancelar</button>${S.isAdmin?`<span style="flex:1"></span>${V.confirm==='ms-del'?`<span class="confirm">¿Borrar este mensaje? <button class="btn danger" data-act="ms-del-yes">Sí, borrar</button><button class="btn" data-act="confirm-no">No</button></span>`:`<button class="btn ghost danger" data-act="ms-del">Borrar mensaje</button>`}`:''}</div></div>`;
    }
    h+=`<div class="ms-head"><button class="btn ghost" data-act="ms-back">${ICON.back}Mensajes</button><h2>${esc(s.title)}${s.place?`<small style="display:block;font-family:var(--f-ui);font-size:13.5px;color:var(--muted);font-weight:500;margin-top:2px">${esc(s.place)}</small>`:''}</h2><code style="color:var(--accent)">${esc(s.code||'')}</code>${can?`<button class="btn" data-act="ms-edit">${ICON.edit}Editar</button>`:''}</div>
      <div class="bb-vlist" id="ms-plist" style="max-height:66vh">${s.paras.map((p,i)=>`<button class="ms-p${onP&&onP.id===s.id&&onP.p===i?' onscr':''}" data-act="ms-p" data-i="${i}" aria-current="${MS.p===i}"><b>${esc(p.n)}</b>${esc(p.t)}</button>`).join('')}</div>`;
    if(can){ const P=MS.p!=null?s.paras[MS.p]:null; const parts=P?msParts(P.t):[];
      h+=`<div class="bb-bar">
        <span class="ref">${P?`¶${esc(P.n)}${parts.length>1?` · parte ${MS.part+1} de ${parts.length}`:''}`:'Elige un párrafo'}<small>${MS.live?'● En vivo: al tocar un párrafo sale en pantalla':'Toca “Proyectar” para ponerlo en pantalla'}</small></span>
        <button class="btn" data-act="ms-step" data-d="-1" aria-label="Anterior">◀</button>
        <button class="btn ${MS.live?'':'pri'}" data-act="ms-proj" aria-pressed="${MS.live}">${ICON.screen}${MS.live?'En vivo':'Proyectar'}</button>
        <button class="btn" data-act="ms-step" data-d="1" aria-label="Siguiente">▶</button>
        <button class="btn" data-act="ms-mode" data-m="black" aria-pressed="${r&&r.mode==='black'}">Negro</button>
        <button class="btn" data-act="ms-mode" data-m="logo" aria-pressed="${r&&r.mode==='logo'}">Logo</button>
        <button class="btn" data-act="proj-style">🎨 Fondo</button><button class="btn" data-act="open-proj">Abrir pantalla</button></div>`; }
    return h+'</div>';
  }
  if(can) h+=`<div class="ms-imp"><div class="ms-head"><b style="flex:1">Biblioteca: ${MS.list?MS.list.length:'…'} mensajes</b><label class="btn" style="cursor:pointer">＋ Importar mensajes<input type="file" id="ms-file" accept=".pdf,.txt,.zip,application/pdf,text/plain,application/zip" multiple hidden></label></div>
    ${MS.imp?`<p style="margin:8px 0 0">${esc(MS.imp)}</p>`:`<p class="muted" style="margin:6px 0 0;font-size:13px">Descarga los mensajes en PDF (por ejemplo desde Message Hub) y súbelos aquí: puedes elegir muchos a la vez o un .zip. Se guardan solo para el equipo.</p>`}</div>`;
  if(MS.err) h+=`<div class="banner">${esc(MS.err)}</div>`;
  if(!MS.list) h+='<div class="loading">Cargando mensajes…</div>';
  else if(!MS.list.length) h+=`<div class="empty"><b>Aún no hay mensajes</b>${can?'Usa “Importar mensajes” para agregarlos.':'El equipo todavía no ha subido mensajes.'}</div>`;
  else h+=`<div class="ms-list">${MS.list.map(s=>`<button class="ms-row" data-act="ms-open" data-id="${esc(s.id)}"><code>${esc(s.code||'—')}</code><span>${esc(s.title)}${s.place?`<small>${esc(s.place)}</small>`:''}</span></button>`).join('')}</div>`;
  return h+'</div>';
};
function msMark(text,q){ const toks=msNorm(q).split(/[^a-z0-9ñ]+/).filter(t=>t.length>1); let out=esc(text); for(const t of toks){ const re=new RegExp('('+t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').split('').map(c=>({a:'[aáà]',e:'[eéè]',i:'[iíì]',o:'[oóò]',u:'[uúùü]',n:'[nñ]'}[c]||c)).join('')+')','gi'); out=out.replace(re,'<mark>$1</mark>'); } return out; }
function msResHtml(){
  if(!MS.q.trim()) return ''; const R=MS.res; if(!R) return '<p class="bb-note">Buscando…</p>';
  let h=''; for(const t of R.titles||[]) h+=`<button data-act="ms-open" data-id="${esc(t.id)}"><b>${esc(t.code)} · ${esc(t.title)}</b>${t.place?`<small>${esc(t.place)}</small>`:''}</button>`;
  for(const x of R.paras||[]) h+=`<button data-act="ms-go" data-id="${esc(x.id)}" data-n="${esc(x.n)}"><b>${esc(x.code)} ¶${esc(x.n)}</b> <span class="bb-note">${esc(x.title)}</span><small class="ms-snip">${msMark(x.snip,MS.q)}</small></button>`;
  if(!h) h='<p class="bb-note">Sin resultados.</p>'; if(R.more) h+='<p class="bb-note">Hay más resultados: agrega otra palabra para afinar.</p>';
  return h;
}
async function msSearch(){
  const q=MS.q.trim(); if(q.length<2){ MS.res=null; const b=$('#ms-res'); if(b) b.innerHTML=''; return; }
  const my=++MS.seq||(MS.seq=1);
  try{ const r=await api('/api/sermons/search?q='+encodeURIComponent(q)); if(my!==MS.seq) return; MS.res=r; }catch{ MS.res={titles:[],paras:[]}; }
  const b=$('#ms-res'); if(b) b.innerHTML=msResHtml();
}
function msScroll(){ const cur=document.querySelector('#ms-plist [aria-current="true"]'); const L=$('#ms-plist'); if(cur&&L){ const a=cur.getBoundingClientRect(), b=L.getBoundingClientRect(); if(a.top<b.top||a.bottom>b.bottom) L.scrollTop+=a.top-b.top-L.clientHeight/4; } }
async function msProject(){
  const s=MS.cur; if(!s||MS.p==null||!S.canWrite) return; const P=s.paras[MS.p]; const parts=msParts(P.t); MS.part=Math.min(MS.part,parts.length-1);
  const ref=`${s.title}${s.code?' · '+s.code:''} · ¶${P.n}${parts.length>1?` (${MS.part+1}/${parts.length})`:''}`;
  const st={mode:'text',title:s.title,text:parts[MS.part],label:'Mensaje',ref,songId:null,programId:null,idx:MS.p,total:s.paras.length,sermon:{id:s.id,p:MS.p,part:MS.part}};
  MS.remote=st; MS.live=true; render(); setTimeout(msScroll,20);
  try{ MS.remote=await api('/api/proyector',{method:'POST',body:JSON.stringify(st)}); }catch(e){ if(e.message==='auth') lostAuth(); else toast('No se pudo poner en pantalla. Revisa el internet.'); }
  if(V.view==='mensaje') render();
}
async function msMode(m){ const r=MS.remote||{}; if(r.mode===m){ if(MS.p!=null) return msProject(); m='logo'; }
  MS.remote={...r,mode:m}; render(); try{ MS.remote=await api('/api/proyector',{method:'POST',body:JSON.stringify({...r,mode:m})}); }catch{ toast('No se pudo cambiar la pantalla.'); } if(V.view==='mensaje') render(); }
function msStep(d){
  const s=MS.cur; if(!s) return; if(MS.p==null){ MS.p=d>0?0:s.paras.length-1; MS.part=0; }
  else { const parts=msParts(s.paras[MS.p].t); const np=MS.part+d;
    if(np>=0&&np<parts.length) MS.part=np;
    else { const p=MS.p+d; if(p<0||p>=s.paras.length) return; MS.p=p; MS.part=d>0?0:msParts(s.paras[p].t).length-1; } }
  render(); setTimeout(msScroll,20); if(MS.live) msProject();
}
/* Importar: PDF, texto o .zip con muchos */
async function msImport(files){
  if(files.some(f=>/\.zip$/i.test(f.name))&&!window.JSZip&&window.ioZip){ try{ await ioZip(); }catch{} }
  const list=[]; for(const f of files){ if(/\.zip$/i.test(f.name)&&window.JSZip){ try{ const z=await JSZip.loadAsync(f); for(const [n,e] of Object.entries(z.files)){ if(e.dir||!/\.(pdf|txt)$/i.test(n)) continue; list.push({name:n.split('/').pop(),blob:await e.async('blob')}); } }catch{ toast('No se pudo abrir el .zip '+f.name); } } else list.push({name:f.name,blob:f}); }
  if(!list.length){ toast('No hay PDF ni texto para importar.'); return; }
  let ok=0, bad=[]; for(let i=0;i<list.length;i++){ const it=list[i]; MS.imp=`Importando ${i+1} de ${list.length}: ${it.name}…`; if(V.view==='mensaje') render();
    try{ const r=await fetch('/api/sermons/import',{method:'POST',headers:{Authorization:'Bearer '+S.token,'X-File-Name':encodeURIComponent(it.name),'Content-Type':'application/octet-stream'},body:it.blob}); if(r.ok) ok++; else bad.push(it.name); }catch{ bad.push(it.name); } }
  MS.imp=`Listo: ${ok} ${ok===1?'mensaje importado':'mensajes importados'}.${bad.length?` No se pudieron leer ${bad.length}: ${bad.slice(0,5).join(', ')}${bad.length>5?'…':''}`:''}`;
  await msLoadList(true); render();
}
async function msSaveEdit(){
  const s=MS.cur; if(!s) return; const raw=($('#ms-e-text').value||'').replace(/\r/g,'');
  const paras=[]; let last=0;
  for(const blk of raw.split(/\n\s*\n/)){ const b=blk.replace(/\s+/g,' ').trim(); if(!b) continue;
    const m=b.match(/^(?:¶\s*)?(\d{1,4}[a-z]?)[.)]?\s+(.+)$/i);
    if(m){ paras.push({n:m[1],t:m[2]}); last=parseInt(m[1],10)||last; } else { last++; paras.push({n:String(last),t:b}); } }
  if(!paras.length){ toast('El texto está vacío.'); return; }
  try{ MS.cur=await api('/api/sermons/'+encodeURIComponent(s.id),{method:'PUT',body:JSON.stringify({title:$('#ms-e-title').value,code:$('#ms-e-code').value,place:$('#ms-e-place').value,paras})}); MS.edit=false; MS.p=null; toast('Mensaje guardado.'); msLoadList(true); render(); }
  catch(e){ if(e.message==='auth') lostAuth(); else toast('No se pudo guardar.'); }
}
function msAfter(){
  const qi=$('#ms-q'); if(qi){ qi.addEventListener('input',e=>{ MS.q=e.target.value; clearTimeout(MS.t); MS.res=null; const b=$('#ms-res'); if(b&&!MS.q.trim()) b.innerHTML=''; MS.t=setTimeout(msSearch,220); });
    qi.addEventListener('keydown',e=>{ if(e.key==='Escape'){ MS.q=''; qi.value=''; MS.res=null; $('#ms-res').innerHTML=''; qi.blur(); } });
    if(MS.focusQ){ MS.focusQ=false; qi.focus(); const n=qi.value.length; try{ qi.setSelectionRange(n,n); }catch{} } }
  const fi=$('#ms-file'); if(fi) fi.addEventListener('change',()=>{ const f=[...fi.files]; fi.value=''; if(f.length) msImport(f); });
}
document.addEventListener('click',ev=>{
  const el=ev.target.closest('[data-act]'); if(!el) return; const a=el.dataset.act, d=el.dataset;
  if(a==='ms-open') msOpen(d.id,null);
  else if(a==='ms-go'){ (async()=>{ await msOpen(d.id,null); const s=MS.cur; if(!s) return; const i=s.paras.findIndex(p=>p.n===d.n); MS.p=i>=0?i:null; MS.part=0; render(); setTimeout(msScroll,30); if(MS.live&&MS.p!=null) msProject(); })(); }
  else if(a==='ms-back'){ MS.curId=null; MS.p=null; MS.edit=false; render(); }
  else if(a==='ms-edit'){ MS.edit=true; V.confirm=null; render(); window.scrollTo(0,0); }
  else if(a==='ms-edit-cancel'){ MS.edit=false; V.confirm=null; render(); }
  else if(a==='ms-edit-save') msSaveEdit();
  else if(a==='ms-del'){ V.confirm='ms-del'; render(); }
  else if(a==='ms-del-yes'){ (async()=>{ try{ await api('/api/sermons/'+encodeURIComponent(MS.curId),{method:'DELETE'}); toast('Mensaje borrado.'); MS.curId=null; MS.cur=null; MS.edit=false; V.confirm=null; await msLoadList(true); render(); }catch{ toast('No se pudo borrar.'); } })(); }
  else if(a==='ms-p'){ const i=+d.i; const again=MS.p===i; if(!again){ MS.p=i; MS.part=0; } render(); if(MS.live||again) msProject(); }
  else if(a==='ms-proj'){ if(MS.p==null) toast('Primero elige un párrafo.'); else if(MS.live&&MS.remote&&MS.remote.sermon&&MS.remote.mode==='text'&&MS.remote.sermon.p===MS.p){ MS.live=false; render(); toast('Modo en vivo apagado.'); } else msProject(); }
  else if(a==='ms-step') msStep(+d.d);
  else if(a==='ms-mode') msMode(d.m);
});
document.addEventListener('keydown',e=>{
  if(V.view!=='mensaje'||e.ctrlKey||e.metaKey||e.altKey||e.target.closest('input,textarea,select')) return;
  if(MS.cur&&(e.key==='ArrowRight'||e.key==='ArrowDown'||e.key==='PageDown')){ e.preventDefault(); msStep(1); }
  else if(MS.cur&&(e.key==='ArrowLeft'||e.key==='ArrowUp'||e.key==='PageUp')){ e.preventDefault(); msStep(-1); }
  else if(e.key==='Enter'&&MS.p!=null&&S.canWrite){ e.preventDefault(); msProject(); }
  else if(e.key.length===1&&/[\p{L}\p{N}]/u.test(e.key)){ MS.q=e.key; MS.focusQ=true; e.preventDefault(); render(); clearTimeout(MS.t); MS.t=setTimeout(msSearch,400); }
});
window.mensajeAfterRender=msAfter;
