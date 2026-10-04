/* Voz de la Novia — Biblioteca: libros y material de estudio (PDF con visor liviano por páginas) */
"use strict";
const LB={list:null,cats:[],loading:false,q:'',cat:'all',cur:null,zoom:1,up:null,io:null,seenFor:null};

(function(){ const st=document.createElement('style'); st.textContent=`
.lb-top{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px}
.lb-top .search{flex:1;min-width:220px}
.lb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px}
.lb-card{display:grid;gap:6px;text-align:left;border:0;background:none;color:inherit;font:inherit;cursor:pointer;padding:0}
.lb-cover{aspect-ratio:3/4;border-radius:8px;overflow:hidden;background:var(--sunk);border:1px solid var(--line);display:grid;place-items:center;box-shadow:0 4px 14px rgba(0,0,0,.12)}
.lb-cover img{width:100%;height:100%;object-fit:cover;object-position:top;display:block}
.lb-card b{font-size:14.5px;line-height:1.25;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.lb-card small{color:var(--muted);font-size:12px}
.lb-badge{font-size:10.5px;border:1px solid var(--line);border-radius:999px;padding:1px 7px;color:var(--muted);margin-left:4px}
.lb-view{position:fixed;inset:0;z-index:40;background:#2a2a2e;display:flex;flex-direction:column;padding-top:env(safe-area-inset-top,0px)}
.lb-bar{display:flex;gap:6px;align-items:center;padding:8px 10px;background:var(--surface);border-bottom:1px solid var(--line);flex-wrap:wrap}
.lb-bar .ttl{flex:1;min-width:120px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lb-bar input{width:58px;font:inherit;padding:6px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:inherit;text-align:center}
.lb-pages{flex:1;overflow:auto;-webkit-overflow-scrolling:touch;padding:12px 0 40px}
.lb-pg{margin:0 auto 12px;background:#fff;box-shadow:0 2px 10px rgba(0,0,0,.35);position:relative;aspect-ratio:var(--ar,0.707)}
.lb-pg img{width:100%;height:100%;display:block}
.lb-pg span{position:absolute;inset:0;display:grid;place-items:center;color:#999;font:600 14px var(--f-ui)}
.lb-pg img+span{display:none}
`; document.head.appendChild(st); })();

function lbSize(n){ return n>1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB'; }
async function lbLoad(force){
  if(LB.loading||(LB.list&&!force&&LB.seenFor===!!S.token)) return; LB.loading=true;
  try{ const d=await api('/api/libros'); LB.list=d.libros; LB.cats=d.cats; LB.seenFor=!!S.token; }catch{ LB.list=LB.list||[]; }
  LB.loading=false; if(V.view==='libros') render();
}
const lbImg=(b,n,w)=>`/libro/${b.id}/${n}.jpg?w=${w}&s=${b.sig}`;
window.viewLibros=function(){
  lbLoad(); const can=S.canWrite;
  let h=`<div class="lb-top"><div class="search">${ICON.search}<input id="lb-q" type="search" placeholder="Buscar libro, estudio o autor" value="${esc(LB.q)}" autocomplete="off"></div>
    ${can?`<label class="btn pri" style="cursor:pointer">${ICON.plus}Subir PDF<input type="file" id="lb-file" accept="application/pdf,.pdf" multiple hidden></label>`:''}</div>
    ${LB.up?`<div class="banner">${esc(LB.up)}</div>`:''}`;
  if(!LB.list) return h+'<div class="loading">Abriendo la biblioteca…</div>';
  const cats=[...new Set(LB.list.map(b=>b.cat))];
  if(cats.length>1) h+=`<div class="chips"><button class="chip" data-act="lb-cat" data-c="all" aria-pressed="${LB.cat==='all'}">Todo<small>${LB.list.length}</small></button>${cats.map(c=>`<button class="chip" data-act="lb-cat" data-c="${esc(c)}" aria-pressed="${LB.cat===c}">${esc(c)}<small>${LB.list.filter(b=>b.cat===c).length}</small></button>`).join('')}</div>`;
  const q=norm(LB.q).trim(); const items=LB.list.filter(b=>(LB.cat==='all'||b.cat===LB.cat)&&(!q||norm(b.title+' '+b.author+' '+b.desc).includes(q)));
  if(!LB.list.length) return h+`<div class="empty"><b>La biblioteca está vacía</b>${can?'Sube libros, estudios o himnarios en PDF con “Subir PDF”. Se comprimen solos para ocupar poco.':(S.token?'El equipo todavía no ha subido material.':'Ingresa con tu usuario para ver todo el material del equipo.')}</div>`;
  if(!items.length) return h+'<div class="empty"><b>Sin resultados</b>Prueba con otra palabra.</div>';
  return h+`<div class="lb-grid">${items.map(b=>`<button class="lb-card" data-act="lb-open" data-id="${b.id}"><div class="lb-cover"><img loading="lazy" src="${lbImg(b,1,400)}" alt=""></div><b>${esc(b.title)}</b><small>${esc(b.author?b.author+' · ':'')}${b.pages} pág. · ${lbSize(b.size)}${can&&!b.public?'<span class="lb-badge">Solo equipo</span>':''}</small></button>`).join('')}</div>`;
};
function lbAfter(){
  const qi=$('#lb-q'); if(qi) qi.addEventListener('input',e=>{ LB.q=e.target.value; clearTimeout(LB.t); LB.t=setTimeout(()=>{ const pos=qi.selectionStart; render(); const n=$('#lb-q'); if(n){ n.focus(); try{ n.setSelectionRange(pos,pos); }catch{} } },150); });
  const fi=$('#lb-file'); if(fi) fi.addEventListener('change',()=>{ const f=[...fi.files]; fi.value=''; if(f.length) lbUpload(f); });
}
window.librosAfterRender=lbAfter;
async function lbUpload(files){
  let ok=0, bad=[];
  for(let i=0;i<files.length;i++){ const f=files[i];
    if(f.size>150*1024*1024){ bad.push(f.name+' (muy grande)'); continue; }
    const res=await new Promise(done=>{ const x=new XMLHttpRequest(); x.open('POST','/api/libros'); x.setRequestHeader('Authorization','Bearer '+S.token); x.setRequestHeader('X-File-Name',encodeURIComponent(f.name)); x.setRequestHeader('Content-Type','application/pdf');
      x.upload.onprogress=e=>{ if(e.lengthComputable){ const pc=Math.round(e.loaded/e.total*100); LB.up=pc<100?`Subiendo ${i+1} de ${files.length}: ${f.name}… ${pc}%`:`Comprimiendo ${f.name}… puede tardar un poco si es grande`; const b=document.querySelector('#view .banner'); if(b) b.textContent=LB.up; else if(V.view==='libros') render(); } };
      x.onload=()=>{ let d=null; try{ d=JSON.parse(x.responseText); }catch{} done(x.status===200?d:null); }; x.onerror=()=>done(null); x.send(f); });
    if(res){ ok++; if(res.orig>res.size*1.15) toast(`${res.title}: comprimido de ${lbSize(res.orig)} a ${lbSize(res.size)}`); } else bad.push(f.name);
  }
  LB.up=`Listo: ${ok} ${ok===1?'archivo subido':'archivos subidos'}.${bad.length?' No se pudieron subir: '+bad.join(', '):''} Toca un libro y luego ✏️ para cambiar el título, el autor o si lo ven todos.`;
  await lbLoad(true); render(); setTimeout(()=>{ LB.up=null; if(V.view==='libros') render(); },12000);
}
/* ---------- Visor ---------- */
function lbOpen(id){
  const b=LB.list&&LB.list.find(x=>x.id===id); if(!b) return; LB.cur=b;
  let last=1; try{ last=+localStorage.getItem('vdn-libro-'+id)||1; }catch{}
  try{ LB.zoom=+localStorage.getItem('vdn-libro-zoom')||1; }catch{}
  const root=document.createElement('div'); root.className='lb-view'; root.id='lb-view';
  root.innerHTML=`<div class="lb-bar"><button class="btn ghost" data-act="lb-close" aria-label="Cerrar">${ICON.back}</button><span class="ttl">${esc(b.title)}</span>
    <span style="display:flex;gap:4px;align-items:center"><input id="lb-pg" inputmode="numeric" value="${last}" aria-label="Página"><span class="muted" style="font-size:13px">/ ${b.pages}</span></span>
    <button class="btn" data-act="lb-zoom" data-d="-1" aria-label="Alejar">−</button><button class="btn" data-act="lb-zoom" data-d="1" aria-label="Acercar">+</button>
    <a class="btn" href="/libro/${b.id}.pdf?s=${b.sig}" target="_blank" rel="noopener" title="Abrir o descargar el PDF original">⬇ PDF</a>
    ${S.canWrite?`<button class="btn" data-act="lb-edit" title="Editar datos">${ICON.edit}</button>`:''}</div>
    <div class="lb-pages" id="lb-pages">${Array.from({length:b.pages},(_,i)=>`<div class="lb-pg" data-n="${i+1}" id="lb-p${i+1}"><span>${i+1}</span></div>`).join('')}</div>`;
  document.body.appendChild(root); document.body.style.overflow='hidden';
  lbLayout(); const box=$('#lb-pages');
  LB.io=new IntersectionObserver(es=>{ for(const e of es){ if(!e.isIntersecting) continue; const d=e.target; if(d.querySelector('img')) continue;
      const n=+d.dataset.n; const w=Math.min(1600,Math.ceil(d.clientWidth*(window.devicePixelRatio||1))); const im=new Image(); im.alt='Página '+n; im.decoding='async';
      im.onload=()=>{ d.style.setProperty('--ar',(im.naturalWidth/im.naturalHeight).toFixed(4)); if(n===1) box.style.setProperty('--ar0',(im.naturalWidth/im.naturalHeight).toFixed(4)); };
      im.src=lbImg(b,n,w); d.prepend(im); } },{root:box,rootMargin:'1200px 0px'});
  box.querySelectorAll('.lb-pg').forEach(d=>LB.io.observe(d));
  setTimeout(()=>{ const t=$('#lb-p'+last); if(t) box.scrollTop=t.offsetTop-10; },30);
  let sT; box.addEventListener('scroll',()=>{ clearTimeout(sT); sT=setTimeout(()=>{ const mid=box.scrollTop+box.clientHeight/3; let cur=1; for(const d of box.children){ if(d.offsetTop<=mid) cur=+d.dataset.n; else break; } const inp=$('#lb-pg'); if(inp&&document.activeElement!==inp) inp.value=cur; try{ localStorage.setItem('vdn-libro-'+b.id,cur); }catch{} },120); });
  const inp=$('#lb-pg'); inp.addEventListener('keydown',e=>{ if(e.key==='Enter'){ const n=Math.min(b.pages,Math.max(1,parseInt(inp.value,10)||1)); const t=$('#lb-p'+n); if(t) box.scrollTop=t.offsetTop-10; inp.blur(); } });
  inp.addEventListener('focus',()=>inp.select());
}
function lbLayout(){ const box=$('#lb-pages'); if(!box) return; const base=Math.min(box.clientWidth-16, 900); const w=Math.round(base*LB.zoom); box.querySelectorAll('.lb-pg').forEach(d=>d.style.width=w+'px'); }
function lbClose(){ const r=$('#lb-view'); if(LB.io) LB.io.disconnect(); if(r) r.remove(); document.body.style.overflow=''; LB.cur=null; }
addEventListener('resize',()=>{ if($('#lb-view')) lbLayout(); });
function lbEdit(){
  const b=LB.cur; if(!b) return; const mine=S.isAdmin||(S.user&&S.user.name===b.by);
  const m=document.createElement('div'); m.className='scrim'; m.style.zIndex='60'; m.id='lb-edit';
  m.innerHTML=`<div class="modal" role="dialog" aria-label="Datos del libro" style="width:min(480px,100%)"><header><h3>Datos del libro</h3><button type="button" class="btn ghost" data-act="lb-edit-close" aria-label="Cerrar">${ICON.x}</button></header>
    <div class="body" style="display:grid;gap:12px">
      <label class="f">Título<input id="lbe-t" value="${esc(b.title)}"></label>
      <label class="f">Autor<input id="lbe-a" value="${esc(b.author)}" placeholder="Opcional"></label>
      <label class="f">Sección<select id="lbe-c">${(LB.cats.length?LB.cats:['Libro','Estudio','Himnario','Revista','Otro']).map(c=>`<option ${c===b.cat?'selected':''}>${esc(c)}</option>`).join('')}</select></label>
      <label class="f">Descripción<textarea id="lbe-d" rows="3" style="font:inherit;padding:8px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:inherit">${esc(b.desc||'')}</textarea></label>
      <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="lbe-p" ${b.public?'checked':''}> Visible para todos (también sin usuario)</label>
      <p class="muted" style="margin:0;font-size:12.5px">${b.pages} páginas · ${lbSize(b.size)}${b.orig>b.size*1.15?` (comprimido de ${lbSize(b.orig)})`:''} · subido por ${esc(b.by||'')}</p>
      <div class="actions"><button class="btn pri" data-act="lb-edit-save">Guardar</button>${mine?`<span style="flex:1"></span><button class="btn ghost danger" data-act="lb-del">Borrar libro</button>`:''}</div>
    </div></div>`;
  document.body.appendChild(m);
}
document.addEventListener('click',async ev=>{
  const el=ev.target.closest('[data-act]'); if(!el) return; const a=el.dataset.act, d=el.dataset;
  if(a==='lb-open') lbOpen(d.id);
  else if(a==='lb-close') lbClose();
  else if(a==='lb-cat'){ LB.cat=d.c; render(); }
  else if(a==='lb-zoom'){ LB.zoom=Math.min(3,Math.max(0.5,+(LB.zoom*(+d.d>0?1.25:0.8)).toFixed(3))); try{ localStorage.setItem('vdn-libro-zoom',LB.zoom); }catch{} const box=$('#lb-pages'); const r=box.scrollTop/box.scrollHeight; lbLayout(); box.scrollTop=r*box.scrollHeight; }
  else if(a==='lb-edit') lbEdit();
  else if(a==='lb-edit-close'){ const m=$('#lb-edit'); if(m) m.remove(); }
  else if(a==='lb-edit-save'){ const b=LB.cur; try{ const r=await api('/api/libros/'+b.id,{method:'PUT',body:JSON.stringify({title:$('#lbe-t').value,author:$('#lbe-a').value,cat:$('#lbe-c').value,desc:$('#lbe-d').value,public:$('#lbe-p').checked})});
      Object.assign(b,r); const i=LB.list.findIndex(x=>x.id===b.id); if(i>=0) LB.list[i]=b; $('#lb-edit').remove(); const t=document.querySelector('#lb-view .ttl'); if(t) t.textContent=b.title; toast('Guardado.'); render(); }catch(e){ if(e.message==='auth') lostAuth(); else toast('No se pudo guardar.'); } }
  else if(a==='lb-del'){ if(el.dataset.sure!=='1'){ el.dataset.sure='1'; el.textContent='¿Seguro? Pulsa otra vez'; return; } try{ await api('/api/libros/'+LB.cur.id,{method:'DELETE'}); $('#lb-edit').remove(); lbClose(); toast('Libro borrado.'); await lbLoad(true); render(); }catch{ toast('No se pudo borrar.'); } }
});
document.addEventListener('keydown',e=>{ if(!$('#lb-view')||e.target.closest('input,textarea,select')) return; const box=$('#lb-pages');
  if(e.key==='Escape'){ if($('#lb-edit')) $('#lb-edit').remove(); else lbClose(); }
  else if(e.key==='PageDown'||e.key===' '){ e.preventDefault(); box.scrollBy({top:box.clientHeight*0.9}); } else if(e.key==='PageUp'){ e.preventDefault(); box.scrollBy({top:-box.clientHeight*0.9}); } });
