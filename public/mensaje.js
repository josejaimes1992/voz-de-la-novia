/* Voz de la Novia — Mensaje: buscar citas de los sermones y proyectarlas (como la Biblia) */
"use strict";
const MS={auto:0,listScroll:0,edit:false,list:null,loading:false,err:'',cur:null,curId:null,p:null,part:0,live:false,q:'',res:null,remote:null,imp:null};
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
  if(MS.loading||(MS.list&&!force)) return;
  MS.loading=true; MS.err=''; fetch('/api/proyector/estilo').then(x=>x.json()).then(x=>{ MS.style=x; if(typeof BB!=='undefined'&&!BB.style) BB.style=x; }).catch(()=>{});
  try{ MS.list=(await api('/api/sermons')).sermons; }catch(e){ if(e.message==='auth'){ lostAuth(); } MS.err='No se pudo cargar la lista de mensajes.'; }
  MS.loading=false; if(V.view==='mensaje') render();
}
async function msOpen(id,p){
  if(MS.curId!==id){ MS.listScroll=0; MS.qIn=''; } MS.curId=id; MS.edit=false; MS.p=p!=null?p:null; MS.part=0; if(!MS.cur||MS.cur.id!==id){ MS.cur=null; render();
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
  msLoadList();
  const can=S.canWrite; const r=MS.remote||(typeof PJ!=='undefined'&&PJ.remote)||null; const onP=r&&r.mode==='text'&&r.sermon?r.sermon:null;
  let h=`<div class="bb">
    ${MS.curId&&MS.cur?`<div class="bb-find"><div class="search">${ICON.search}<input id="ms-qin" type="search" autocomplete="off" placeholder="Buscar en este mensaje…" value="${esc(MS.qIn||'')}" aria-label="Buscar en este mensaje"></div><button class="btn ghost" data-act="ms-back" title="Volver a la lista y buscar en todos los mensajes">Buscar en todos</button></div>
    <div id="ms-resin" class="bb-sug" style="max-height:26vh">${msInHtml()}</div>`:`<div class="bb-find"><div class="search">${ICON.search}<input id="ms-q" type="search" autocomplete="off" placeholder="Busca una frase en todos los mensajes, un título o un código (65-1125)" value="${esc(MS.q)}" aria-label="Buscar en el Mensaje"></div></div>
    <div id="ms-res" class="bb-sug">${msResHtml()}</div>`}`;
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
      <div class="bb-vlist" id="ms-plist" style="max-height:66vh">${s.paras.map((p,i)=>`<button class="ms-p${onP&&onP.id===s.id&&onP.p===i?' onscr':''}" data-act="ms-p" data-i="${i}" aria-current="${MS.p===i}"><b>${esc(p.n)}</b>${MS.qIn&&MS.qIn.trim().length>1?msMark(p.t,MS.qIn):esc(p.t)}</button>`).join('')}</div>`;
    if(can){ const P=MS.p!=null?s.paras[MS.p]:null; const steps=P?msSteps(P.t):0; const onThis=onP&&onP.id===s.id&&onP.p===MS.p;
      h+=`<div class="bb-bar">
        ${window.bbLiveBox?bbLiveBox(r):''}
        <span class="ref">${P?`Párrafo ${esc(P.n)}${onThis&&steps?` · ${Math.round((MS.part/steps)*100)}% leído`:''}`:'Elige un párrafo'}<small>${MS.live?'● En vivo · ↓↑ o ⏬⏫ bajan/suben el texto y pasan de párrafo · ▶◀ párrafo · F9 negro':'Enter, doble clic o “Proyectar” lo pone en pantalla'}</small></span>
        <button class="btn" data-act="ms-step" data-d="-1" aria-label="Párrafo anterior">◀</button>
        <button class="btn" data-act="ms-scroll" data-d="-1" title="Subir el texto en pantalla (Re Pág)">⏫</button>
        <button class="btn ${MS.live?'':'pri'}" data-act="ms-proj" aria-pressed="${MS.live}">${ICON.screen}${MS.live?'En vivo':'Proyectar'}</button>
        <button class="btn" data-act="ms-scroll" data-d="1" title="Bajar el texto en pantalla (Av Pág)">⏬</button>
        <button class="btn" data-act="ms-step" data-d="1" aria-label="Párrafo siguiente">▶</button>
        <select id="ms-auto" class="bb-ver" title="Desplazamiento automático mientras se lee" aria-label="Desplazamiento automático">${[[0,'Auto: no'],[0.6,'Auto: lento'],[1,'Auto: normal'],[1.6,'Auto: rápido']].map(([v,t])=>`<option value="${v}" ${+MS.auto===v?'selected':''}>${t}</option>`).join('')}</select>
        <button class="btn" data-act="ms-mode" data-m="black" aria-pressed="${r&&r.mode==='black'}" title="F9">Negro</button>
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
/* Buscar dentro del mensaje abierto */
function msInHits(){ const s=MS.cur, q=(MS.qIn||'').trim(); if(!s||q.length<2) return null; const toks=msNorm(q).split(/[^a-z0-9ñ]+/).filter(t=>t.length>1); if(!toks.length) return null; const phrase=toks.join(' ');
  const out=[]; s.paras.forEach((p,i)=>{ const n=msNorm(p.t); if(toks.every(t=>n.includes(t))){ const at=Math.max(0,n.indexOf(n.includes(phrase)?phrase:toks[0])-60); out.push({i,n:p.n,exact:n.includes(phrase),snip:(at?'…':'')+p.t.slice(at,at+200)+(p.t.length>at+200?'…':'')}); } });
  return out.sort((a,b)=>(b.exact?1:0)-(a.exact?1:0)||a.i-b.i); }
function msInHtml(){ const H=msInHits(); if(!H) return ''; if(!H.length) return '<p class="bb-note">No aparece en este mensaje. Prueba con otra palabra o “Buscar en todos”.</p>';
  return `<p class="bb-note" style="margin:0 2px">${H.length} ${H.length===1?'párrafo':'párrafos'} · Enter va al siguiente</p>`+H.slice(0,40).map(h=>`<button data-act="ms-inhit" data-i="${h.i}"><b>Párrafo ${esc(h.n)}</b><small class="ms-snip">${msMark(h.snip,MS.qIn)}</small></button>`).join(''); }
function msResHtml(){
  if(!MS.q.trim()) return ''; const R=MS.res; if(!R) return '<p class="bb-note">Buscando…</p>';
  let h=''; for(const t of R.titles||[]) h+=`<button data-act="ms-open" data-id="${esc(t.id)}"><b>${esc(t.code)} · ${esc(t.title)}</b>${t.place?`<small>${esc(t.place)}</small>`:''}</button>`;
  for(const x of R.paras||[]) h+=`<button data-act="ms-go" data-id="${esc(x.id)}" data-n="${esc(x.n)}"><b>${esc(x.code)} · Párrafo ${esc(x.n)}</b> <span class="bb-note">${esc(x.title)}</span><small class="ms-snip">${msMark(x.snip,MS.q)}</small></button>`;
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
function msSteps(t){ const x=(typeof BB!=='undefined'&&BB.style)||MS.style||{}; const z=+x.size||1; const per=Math.max(12,Math.round(40/(z*z)*(x.upper?0.82:1))); return Math.max(0,Math.ceil(t.split(/\s+/).length/per)-1); }
function msGoPara(i,keepFocus){ MS.p=i; MS.part=0; if(keepFocus) MS.focusQ=true; render(); setTimeout(msScroll,20); }
function msOnScreen(){ const s=MS.cur, r=MS.remote; return !!(MS.live&&s&&r&&r.mode==='text'&&r.sermon&&r.sermon.id===s.id&&r.sermon.p===MS.p); }
async function msProject(){
  const s=MS.cur; if(!s||MS.p==null||!S.canWrite) return; const P=s.paras[MS.p]; const steps=msSteps(P.t); MS.part=Math.max(0,Math.min(MS.part,steps));
  const st={mode:'text',read:true,title:s.title,text:P.t,num:P.n,label:'Mensaje',ref:`${s.code||''}${s.code?'\n':''}${s.title}`,sc:steps?MS.part/steps:0,auto:+MS.auto||0,songId:null,programId:null,idx:MS.p,total:s.paras.length,sermon:{id:s.id,p:MS.p,part:MS.part}};
  MS.remote=st; MS.live=true; render(); setTimeout(msScroll,20);
  try{ MS.remote=await api('/api/proyector',{method:'POST',body:JSON.stringify(st)}); }catch(e){ if(e.message==='auth') lostAuth(); else toast('No se pudo poner en pantalla. Revisa el internet.'); }
  if(V.view==='mensaje') render();
}
async function msMode(m){ const r=MS.remote||{}; if(r.mode===m){ if(MS.p!=null) return msProject(); m='logo'; }
  MS.remote={...r,mode:m}; render(); try{ MS.remote=await api('/api/proyector',{method:'POST',body:JSON.stringify({...r,mode:m})}); }catch{ toast('No se pudo cambiar la pantalla.'); } if(V.view==='mensaje') render(); }
function msStep(d,noProj){
  const s=MS.cur; if(!s) return; if(MS.p==null){ MS.p=d>0?0:s.paras.length-1; }
  else { const p=MS.p+d; if(p<0||p>=s.paras.length) return; MS.p=p; } MS.part=0;
  render(); setTimeout(msScroll,20); if(MS.live&&!noProj) msProject();
}
/* Bajar/subir el texto del párrafo en pantalla; al llegar al final pasa al siguiente párrafo */
function msScrollLive(d){
  const s=MS.cur; if(!s||MS.p==null) return; const r=MS.remote; const onThis=r&&r.sermon&&r.sermon.id===s.id&&r.sermon.p===MS.p&&r.mode==='text';
  if(!onThis){ return msProject(); }
  const steps=msSteps(s.paras[MS.p].t); const np=MS.part+d; MS.auto=0;
  if(np>=0&&np<=steps){ MS.part=np; return msProject(); }
  if(d>0&&MS.p+1<s.paras.length){ MS.p++; MS.part=0; return msProject(); }
  if(d<0&&MS.p>0){ MS.p--; MS.part=msSteps(s.paras[MS.p].t); return msProject(); }
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
  const qn=$('#ms-qin'); if(qn){ const upd=()=>{ const b=$('#ms-resin'); if(b) b.innerHTML=msInHtml(); const L=$('#ms-plist'); if(L){ const s=MS.cur; L.querySelectorAll('.ms-p').forEach(el=>{ const p=s.paras[+el.dataset.i]; el.innerHTML=`<b>${esc(p.n)}</b>${MS.qIn&&MS.qIn.trim().length>1?msMark(p.t,MS.qIn):esc(p.t)}`; }); } };
    qn.addEventListener('input',e=>{ MS.qIn=e.target.value; MS.inIdx=-1; clearTimeout(MS.ti); MS.ti=setTimeout(upd,120); });
    qn.addEventListener('keydown',e=>{ if(e.key==='Escape'){ MS.qIn=''; qn.value=''; upd(); qn.blur(); } else if(e.key==='Enter'){ e.preventDefault(); const H=msInHits(); if(H&&H.length){ MS.inIdx=((MS.inIdx??-1)+1)%H.length; msGoPara(H[MS.inIdx].i,true); } } });
    if(MS.focusQ){ MS.focusQ=false; qn.focus(); const n=qn.value.length; try{ qn.setSelectionRange(n,n); }catch{} } }
  const qi=$('#ms-q'); if(qi){ qi.addEventListener('input',e=>{ MS.q=e.target.value; clearTimeout(MS.t); MS.res=null; const b=$('#ms-res'); if(b&&!MS.q.trim()) b.innerHTML=''; MS.t=setTimeout(msSearch,220); });
    qi.addEventListener('keydown',e=>{ if(e.key==='Escape'){ MS.q=''; qi.value=''; MS.res=null; $('#ms-res').innerHTML=''; qi.blur(); } });
    if(MS.focusQ){ MS.focusQ=false; qi.focus(); const n=qi.value.length; try{ qi.setSelectionRange(n,n); }catch{} } }
  const L=$('#ms-plist'); if(L){ L.scrollTop=MS.listScroll||0; L.addEventListener('scroll',()=>{ MS.listScroll=L.scrollTop; },{passive:true}); }
  const au=$('#ms-auto'); if(au) au.addEventListener('change',e=>{ MS.auto=+e.target.value; if(MS.live&&MS.p!=null) msProject(); });
  const fi=$('#ms-file'); if(fi) fi.addEventListener('change',()=>{ const f=[...fi.files]; fi.value=''; if(f.length) msImport(f); });
}
document.addEventListener('click',ev=>{
  const el=ev.target.closest('[data-act]'); if(!el) return; const a=el.dataset.act, d=el.dataset;
  if(a==='ms-open') msOpen(d.id,null);
  else if(a==='ms-go'){ (async()=>{ const gq=MS.q; await msOpen(d.id,null); const s=MS.cur; if(!s) return; MS.qIn=gq; const i=s.paras.findIndex(p=>p.n===d.n); MS.p=i>=0?i:null; MS.part=0; render(); setTimeout(msScroll,30); })(); }
  else if(a==='ms-back'){ MS.curId=null; MS.p=null; MS.edit=false; render(); }
  else if(a==='ms-edit'){ MS.edit=true; V.confirm=null; render(); window.scrollTo(0,0); }
  else if(a==='ms-edit-cancel'){ MS.edit=false; V.confirm=null; render(); }
  else if(a==='ms-edit-save') msSaveEdit();
  else if(a==='ms-del'){ V.confirm='ms-del'; render(); }
  else if(a==='ms-del-yes'){ (async()=>{ try{ await api('/api/sermons/'+encodeURIComponent(MS.curId),{method:'DELETE'}); toast('Mensaje borrado.'); MS.curId=null; MS.cur=null; MS.edit=false; V.confirm=null; await msLoadList(true); render(); }catch{ toast('No se pudo borrar.'); } })(); }
  else if(a==='ms-p'){ const i=+d.i; const now=Date.now(); const dbl=MS.lastTap&&MS.lastTap.i===i&&now-MS.lastTap.t<450; MS.lastTap={i,t:now}; if(MS.p!==i){ MS.p=i; MS.part=0; } render(); if(dbl&&S.canWrite){ MS.lastTap=null; MS.part=0; msProject(); } }
  else if(a==='ms-scroll') msScrollLive(+d.d);
  else if(a==='ms-inhit') msGoPara(+d.i,false);
  else if(a==='ms-proj'){ if(MS.p==null) toast('Primero elige un párrafo.'); else if(MS.live&&MS.remote&&MS.remote.sermon&&MS.remote.mode==='text'&&MS.remote.sermon.p===MS.p){ MS.live=false; render(); toast('Modo en vivo apagado.'); } else msProject(); }
  else if(a==='ms-step') msStep(+d.d);
  else if(a==='ms-mode') msMode(d.m);
});
document.addEventListener('keydown',e=>{
  if(V.view!=='mensaje'||e.ctrlKey||e.metaKey||e.altKey||e.target.closest('input,textarea,select')) return;
  if(MS.cur&&(e.key==='ArrowDown'||e.key==='ArrowUp')){ e.preventDefault(); const d=e.key==='ArrowDown'?1:-1;
    /* en vivo: baja/sube el texto dentro del párrafo y sigue con el siguiente; si no, solo marca */
    if(msOnScreen()) msScrollLive(d); else msStep(d,true); }
  else if(MS.cur&&e.key==='ArrowRight'){ e.preventDefault(); msStep(1); }
  else if(MS.cur&&e.key==='ArrowLeft'){ e.preventDefault(); msStep(-1); }
  else if(MS.cur&&(e.key==='PageDown'||e.key===' ')){ e.preventDefault(); msScrollLive(1); }
  else if(MS.cur&&e.key==='PageUp'){ e.preventDefault(); msScrollLive(-1); }
  else if(e.key==='Enter'&&MS.p!=null&&S.canWrite){ e.preventDefault(); MS.part=0; msProject(); }
  else if(e.key.length===1&&/[\p{L}\p{N}]/u.test(e.key)){ e.preventDefault(); MS.focusQ=true; if(MS.curId&&MS.cur){ MS.qIn=e.key; MS.inIdx=-1; render(); } else { MS.q=e.key; render(); clearTimeout(MS.t); MS.t=setTimeout(msSearch,400); } }
});
window.mensajeAfterRender=msAfter;
