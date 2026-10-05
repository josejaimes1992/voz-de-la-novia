/* Voz de la Novia — control de proyección en vivo (solo equipo) */
"use strict";
const PJ={min:false,q:'',open:false,programId:null,songIds:[],si:0,remote:null,ws:null,retry:0,online:false,timer:null,sending:false};

(function(){ const st=document.createElement('style'); st.textContent=`
.pj{position:fixed;inset:0;z-index:45;background:var(--bg);display:flex;flex-direction:column;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
.pj-top{display:flex;gap:8px;align-items:center;padding:8px 16px;border-bottom:1px solid var(--line);background:var(--surface);flex-wrap:wrap}
.pj-top .ttl{flex:1;min-width:0;font-family:var(--f-display);font-weight:700;font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pj-top a.btn{text-decoration:none;color:inherit}
.pj-st{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--muted);font-weight:600}
.pj-st::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--danger)}
.pj-st.on::before{background:var(--ok)}
.pj-songs{display:flex;gap:6px;overflow-x:auto;padding:10px 16px 0;scrollbar-width:none}
.pj-songs .chip{font-family:var(--f-ui);font-weight:600;white-space:nowrap}
.pj-songs .chip[aria-pressed="true"]{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
.pj-body{flex:1;overflow:auto;padding:12px 16px 20px}
.pj-now{display:grid;grid-template-columns:minmax(0,220px) minmax(0,1fr);gap:14px;align-items:center;margin-bottom:14px}
.pj-scr{aspect-ratio:16/9;background:#000;border-radius:8px;border:1px solid var(--line);display:grid;place-items:center;padding:8px;overflow:hidden;color:#fff;text-align:center;font-weight:700;font-size:11px;line-height:1.25;white-space:pre-line}
.pj-scr img{height:70%;width:auto}
.pj-now small{color:var(--muted);font-size:13px;display:block}
.pj-now b{font-size:15px}
.pj-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px}
.pj-sl{display:grid;gap:6px;text-align:left;border:1px solid var(--line);background:var(--surface);border-radius:10px;padding:10px 12px;min-height:96px;align-content:start}
.pj-sl:hover{border-color:var(--accent)}
.pj-sl .h{display:flex;justify-content:space-between;gap:8px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--accent);font-weight:700}
.pj-sl .h span:last-child{color:var(--muted);font-family:var(--f-mono)}
.pj-sl p{margin:0;white-space:pre-line;font-size:15px;line-height:1.35}
.pj-sl[aria-current="true"]{border:2px solid var(--accent);background:var(--accent-soft);padding:9px 11px}
.pj-bot{display:grid;grid-template-columns:1fr 1fr 1.4fr 1.4fr;gap:8px;padding:8px 16px;border-top:1px solid var(--line);background:var(--surface)}
.pj-bot .btn{justify-content:center;padding:12px 8px;font-size:15px}
.pj-bot .btn[aria-pressed="true"]{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
.pj-empty{color:var(--muted);padding:20px 0}

.pj-find{position:relative;padding:10px 16px 0}
.pj-find input{width:100%;font:inherit;font-size:16px;padding:10px 12px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:inherit}
.pj-res{display:grid;gap:4px;margin-top:6px}
.pj-r{display:flex;gap:8px;align-items:center;border:1px solid var(--line);background:var(--surface);border-radius:10px;padding:6px 6px 6px 12px}
.pj-r .t{flex:1;min-width:0;text-align:left;background:none;border:0;color:inherit;font:inherit;padding:6px 0;cursor:pointer}
.pj-r .t b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:15px}
.pj-r .t small{color:var(--muted);font-size:12px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pj-r .btn{padding:8px 10px;font-size:13px;white-space:nowrap}
.pj-mini{position:fixed;left:8px;right:8px;bottom:calc(8px + env(safe-area-inset-bottom,0px));z-index:44;display:flex;gap:6px;align-items:center;background:var(--ink);color:var(--bg);border-radius:14px;padding:6px 6px 6px 12px;box-shadow:0 8px 28px rgba(0,0,0,.35);max-width:760px;margin:0 auto}
.pj-mini .lv{flex:1;min-width:0;font-size:13px;line-height:1.25;cursor:pointer;background:none;border:0;color:inherit;text-align:left;padding:4px 0;font-family:inherit}
.pj-mini .lv b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:14px}
.pj-mini .lv i{font-style:normal;color:#e05a4f;font-weight:700;margin-right:4px}
.pj-mini button.mb{min-width:44px;height:40px;border-radius:10px;border:0;background:rgba(127,127,127,.25);color:inherit;font:600 15px/1 inherit;font-family:inherit;cursor:pointer;padding:0 10px}
.pj-mini button.mb.pri{background:var(--accent);color:var(--accent-ink)}
body.pj-has-mini{padding-bottom:70px}
body.pj-has-mini .toast{bottom:calc(86px + env(safe-area-inset-bottom,0px))}
.pj-top .ttl{min-width:140px}
.row{touch-action:manipulation}
@media (max-width:560px){.pj-now{grid-template-columns:120px minmax(0,1fr)}.pj-bot{grid-template-columns:1fr 1fr}}
`; document.head.appendChild(st); })();

/* Divide la letra en diapositivas: por sección y párrafo, máx. 4 líneas */
function pjSlides(song){
  const body=(song&&song.body&&song.body.trim())?song.body:(song&&song.bodyPro)||'';
  const out=[]; let label='', block=[];
  const flush=()=>{ if(!block.length) return; const n=Math.ceil(block.length/4), size=Math.ceil(block.length/n);
    for(let i=0;i<block.length;i+=size) out.push({label,text:block.slice(i,i+size).join('\n')}); block=[]; };
  for(const L of parseSong(body)){
    if(L.type==='sec'){ flush(); label=L.text; continue; }
    if(L.type==='gap'){ flush(); continue; }
    if(L.chordOnly) continue; const ly=L.lyric.replace(/\s+/g,' ').trim(); if(ly) block.push(ly);
  }
  flush(); return out;
}
function pjSong(){ return S.songs.get(PJ.songIds[PJ.si]); }
/* Agrega una canción a la lista en vivo (después de la actual) y, si se pide, la proyecta ya */
function pjAdd(id,show){
  if(!S.songs.has(id)) return; let i=PJ.songIds.indexOf(id);
  if(i<0){ i=Math.min(PJ.si+1,PJ.songIds.length); PJ.songIds.splice(i,0,id); }
  PJ.si=i; if(show){ if(pjSlides(pjSong()).length) pjShow(0); else toast('Esa canción no tiene letra para proyectar.'); }
}
function pjFind(q){
  const toks=searchTokens(q); if(!toks.length) return [];
  const out=[]; for(const s of S.songs.values()){ const m=matchSong(s,toks,'all'); if(m) out.push({s,m}); }
  out.sort((a,b)=>b.m.score-a.m.score||COLL.compare(a.s.title,b.s.title)); return out.slice(0,8);
}
function pjResHtml(){
  if(!PJ.q.trim()) return '';
  const r=pjFind(PJ.q); if(!r.length) return '<p class="muted" style="margin:6px 2px;font-size:13px">Sin resultados.</p>';
  return r.map(({s,m})=>`<div class="pj-r"><button class="t" data-act="pj-pick" data-id="${esc(s.id)}" title="Tocar: ver sus diapositivas · Doble clic: proyectar"><b>${esc(s.title)}</b><small>${m.line?esc(m.line):esc(keyText(songKey(s)))}</small></button><button class="btn pri" data-act="pj-go" data-id="${esc(s.id)}">▶ Proyectar</button></div>`).join('');
}

function openProj(opt){
  if(!S.canWrite) return;
  if(PJ.open&&opt.songId){ pjAdd(opt.songId,!!opt.show); if(!opt.stayMin) PJ.min=false; pjRender(true); return; }
  if(opt.programId){ const p=S.programs.get(opt.programId); PJ.programId=opt.programId; PJ.songIds=(p?.items||[]).map(it=>it.songId).filter(id=>S.songs.has(id)); }
  else { PJ.programId=null; PJ.songIds=[opt.songId]; }
  if(!PJ.songIds.length) return;
  PJ.si=0; PJ.open=true; PJ.min=false; PJ.q='';
  const r=PJ.remote; if(r&&r.songId){ const i=PJ.songIds.indexOf(r.songId); if(i>=0) PJ.si=i; }
  pjConnect(); pjRender(true); if(typeof keepAwake==='function') keepAwake(true);
}
function closeProj(){ PJ.open=false; PJ.min=false; document.body.classList.remove('pj-has-mini'); $('#proj-root').innerHTML=''; if(typeof render==='function'&&V.view==='song') render(); if(PJ.ws){ PJ.ws.onclose=null; try{ PJ.ws.close(); }catch{} PJ.ws=null; } clearTimeout(PJ.timer); if(!V.live&&typeof keepAwake==='function') keepAwake(false); }

function pjConnect(){
  if(PJ.ws&&PJ.ws.readyState<2) return;
  const url=(location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws/proyector';
  let ws; try{ ws=new WebSocket(url); }catch{ return pjLater(); }
  PJ.ws=ws;
  ws.onopen=()=>{ PJ.retry=0; PJ.online=true; pjRender(); };
  ws.onmessage=ev=>{ if(ev.data==='pong') return; try{ const d=JSON.parse(ev.data); if(d._style){ PJ.style=d._style; return; } PJ.remote=d; pjRender(); }catch{} };
  ws.onclose=()=>{ PJ.online=false; if(PJ.open){ pjRender(); pjLater(); } };
  ws.onerror=()=>{ try{ ws.close(); }catch{} };
}
function pjLater(){ if(!PJ.open) return; PJ.retry=Math.min(PJ.retry+1,5); clearTimeout(PJ.timer); PJ.timer=setTimeout(pjConnect,500*2**PJ.retry); }
setInterval(()=>{ if(PJ.ws&&PJ.ws.readyState===1) PJ.ws.send('ping'); },25000);

async function pjSend(st){
  const prev=PJ.remote; PJ.remote={...st,by:S.user?.name||'',at:Date.now()}; pjRender();
  try{ const r=await api('/api/proyector',{method:'POST',body:JSON.stringify(st)}); PJ.remote=r; pjRender(); }
  catch(e){ PJ.remote=prev; pjRender(); if(e.message==='auth'){ closeProj(); lostAuth(); } else toast('No se pudo cambiar la pantalla. Revisa el internet.'); }
}
function pjShow(i){
  const s=pjSong(); if(!s) return; const sl=pjSlides(s); if(!sl[i]) return;
  pjSend({mode:'text',title:s.title,text:sl[i].text,label:sl[i].label,songId:s.id,programId:PJ.programId,idx:i,total:sl.length});
}
function pjStep(d){
  const r=PJ.remote, s=pjSong(); if(!s) return; const n=pjSlides(s).length;
  const here=r&&r.mode==='text'&&r.songId===s.id;
  if(!here){ return pjShow(d>0?0:Math.max(0,n-1)); }
  const i=r.idx+d;
  if(i>=0&&i<n) return pjShow(i);
  const j=PJ.si+(d>0?1:-1);
  if(j>=0&&j<PJ.songIds.length){ PJ.si=j; const m=pjSlides(pjSong()).length; pjRender(true); return pjShow(d>0?0:Math.max(0,m-1)); }
}
function pjMode(m){ const r=PJ.remote||{}; if(r.mode===m) m='text'; if(m==='text'&&!r.text){ return pjShow(0); } pjSend({...r,mode:m}); }

function pjRender(scrollTop){
  const root=$('#proj-root'); if(!PJ.open){ root.innerHTML=''; document.body.classList.remove('pj-has-mini'); return; }
  const s=pjSong(); const sl=s?pjSlides(s):[]; const r=PJ.remote||{mode:'logo'};
  document.body.classList.toggle('pj-has-mini',PJ.min);
  if(PJ.min){
    const what=r.mode==='black'?'Pantalla en negro':r.mode==='logo'?'Logo':`${r.title||''}${r.total?` · ${r.idx+1}/${r.total}`:''}`;
    root.innerHTML=`<div class="pj-mini" role="region" aria-label="Proyección en vivo">
      <button class="lv" data-act="pj-max" title="Abrir el control"><b><i>●</i>${esc(what)}</b><span style="opacity:.75">${PJ.online?'En vivo · toca para abrir el control':'Reconectando…'}</span></button>
      <button class="mb" data-act="pj-step" data-d="-1" aria-label="Anterior">◀</button><button class="mb pri" data-act="pj-step" data-d="1" aria-label="Siguiente">▶</button>
      <button class="mb" data-act="pj-mode" data-m="black" aria-pressed="${r.mode==='black'}" title="Negro">■</button></div>`;
    return;
  }
  const qf=document.activeElement&&document.activeElement.id==='pj-q'; const qpos=qf?document.activeElement.selectionStart:0;
  const body=$('#pj-body'); const keep=body&&!scrollTop?body.scrollTop:0;
  const onSong=r.mode==='text'&&s&&r.songId===s.id;
  const scr=r.mode==='black'?'':r.mode==='logo'?'<img src="/vdn-logo.jpg?v=2" alt="">':esc(r.text||'');
  root.innerHTML=`<div class="pj" role="dialog" aria-label="Proyección">
    <div class="pj-top"><button class="btn ghost" data-act="pj-close" aria-label="Cerrar proyección">${ICON.x}</button>
      <span class="ttl">${esc(s?s.title:'')}</span>
      <span class="pj-st ${PJ.online?'on':''}">${PJ.online?'Conectado':'Reconectando…'}</span>
      <button class="btn" data-act="pj-min" title="Esconder el control para buscar en el cancionero">${ICON.search}Seguir buscando</button>
      <button class="btn" data-act="proj-style">🎨 Fondo</button><button class="btn" data-act="open-proj">${ICON.screen}Abrir pantalla</button></div>
    <div class="pj-find"><input id="pj-q" type="search" placeholder="Buscar otra canción para proyectar…" value="${esc(PJ.q)}" autocomplete="off" aria-label="Buscar canción"><div class="pj-res" id="pj-res">${pjResHtml()}</div></div>
    ${PJ.songIds.length>1?`<div class="pj-songs">${PJ.songIds.map((id,i)=>`<button class="chip" data-act="pj-song" data-i="${i}" aria-pressed="${i===PJ.si}">${i+1}. ${esc(S.songs.get(id)?.title||'')}</button>`).join('')}</div>`:''}
    <div class="pj-body" id="pj-body">
      <div class="pj-now"><div class="pj-scr">${scr}</div><div><small>En pantalla ahora</small><b>${r.mode==='black'?'Pantalla en negro':r.mode==='logo'?'Logo':esc((r.title||'')+(r.total?` · ${r.idx+1} de ${r.total}`:''))}</b>${r.by?`<small>Último cambio: ${esc(r.by)}</small>`:''}</div></div>
      ${sl.length?`<div class="pj-grid">${sl.map((x,i)=>`<button class="pj-sl" data-act="pj-show" data-i="${i}" aria-current="${onSong&&r.idx===i}"><span class="h"><span>${esc(x.label||'')}</span><span>${i+1}</span></span><p>${esc(x.text)}</p></button>`).join('')}</div>`:'<p class="pj-empty">Esta canción no tiene letra para proyectar.</p>'}
    </div>
    <div class="pj-bot">
      <button class="btn" data-act="pj-mode" data-m="black" aria-pressed="${r.mode==='black'}">Negro</button>
      <button class="btn" data-act="pj-mode" data-m="logo" aria-pressed="${r.mode==='logo'}">Logo</button>
      <button class="btn" data-act="pj-step" data-d="-1">${ICON.back}Anterior</button>
      <button class="btn pri" data-act="pj-step" data-d="1">Siguiente <span style="transform:rotate(180deg);display:inline-flex">${ICON.back}</span></button>
    </div></div>`;
  const qi=$('#pj-q'); if(qi){ qi.addEventListener('input',e=>{ PJ.q=e.target.value; clearTimeout(PJ.qt); PJ.qt=setTimeout(()=>{ const box=$('#pj-res'); if(box) box.innerHTML=pjResHtml(); },80); }); if(qf){ qi.focus(); try{ qi.setSelectionRange(qpos,qpos); }catch{} } }
  const nb=$('#pj-body'); if(nb){ nb.scrollTop=keep; if(!scrollTop){ const c=nb.querySelector('[aria-current="true"]'); if(c){ const a=c.getBoundingClientRect(), b=nb.getBoundingClientRect(); if(a.top<b.top||a.bottom>b.bottom) c.scrollIntoView({block:'nearest',behavior:'smooth'}); } } }
}

document.addEventListener('click',ev=>{
  const el=ev.target.closest('[data-act]'); if(!el) return; const a=el.dataset.act, ds=el.dataset;
  switch(a){
    case 'proj-song': if(PJ.open){ openProj({songId:V.songId,show:true,stayMin:true}); PJ.min=true; pjRender(); toast('En pantalla: '+(S.songs.get(V.songId)?.title||'')); } else openProj({songId:V.songId}); break;
    case 'pj-min': PJ.min=true; pjRender(); break;
    case 'pj-max': PJ.min=false; pjRender(true); break;
    case 'pj-pick': { const now=Date.now(); const dbl=PJ.lastPick&&PJ.lastPick.id===ds.id&&now-PJ.lastPick.t<450; PJ.lastPick={id:ds.id,t:now}; pjAdd(ds.id,dbl); PJ.q=dbl?'':PJ.q; pjRender(true); break; }
    case 'pj-go': pjAdd(ds.id,true); PJ.q=''; pjRender(true); break;
    case 'proj-prog': openProj({programId:V.programId}); break;
    case 'pj-close': closeProj(); break;
    case 'pj-show': pjShow(+ds.i); break;
    case 'pj-step': pjStep(+ds.d); break;
    case 'pj-mode': pjMode(ds.m); break;
    case 'pj-song': PJ.si=+ds.i; pjRender(true); break;
  }
});
document.addEventListener('keydown',e=>{
  if(!PJ.open||e.target.closest('input,textarea,select')) return;
  const k=e.key;
  if(PJ.min){ if(k==='PageDown'){ e.preventDefault(); pjStep(1); } else if(k==='PageUp'){ e.preventDefault(); pjStep(-1); } return; }
  if(k==='ArrowRight'||k==='ArrowDown'||k==='PageDown'||k===' '){ e.preventDefault(); pjStep(1); }
  else if(k==='ArrowLeft'||k==='ArrowUp'||k==='PageUp'){ e.preventDefault(); pjStep(-1); }
  else if(k==='b'||k==='B'||k==='.') pjMode('black');
  else if(k==='l'||k==='L') pjMode('logo');
  else if(k==='Escape') closeProj();
  else if(/^[1-9]$/.test(k)) pjShow(+k-1);
});

/* Doble toque / doble clic en una canción de la lista mientras se proyecta: la proyecta al instante */
document.addEventListener('click',ev=>{
  if(PJ.swallow&&Date.now()<PJ.swallow){ ev.preventDefault(); ev.stopPropagation(); PJ.swallow=0; return; }
  if(!PJ.open||!PJ.min) return; const el=ev.target.closest('[data-act="open-song"]');
  if(el) PJ.lastRow={id:el.dataset.id,t:Date.now()};
},true);
document.addEventListener('pointerdown',ev=>{
  const last=PJ.lastRow; if(!PJ.open||!PJ.min||!last) return;
  if(Date.now()-last.t<450&&V.view==='song'&&V.songId===last.id&&!ev.target.closest('.pj-mini')){
    ev.preventDefault(); PJ.lastRow=null; PJ.swallow=Date.now()+700; pjAdd(last.id,true); pjRender(); toast('En pantalla: '+(S.songs.get(last.id)?.title||'')); }
},true);

/* Abre la pantalla del proyector; si ya se eligió el monitor externo, la abre directamente allí */
async function openProyector(){
  let feat='';
  try{ if('getScreenDetails' in window){ const st=await navigator.permissions.query({name:'window-management'}).catch(()=>null);
    if(st&&st.state==='granted'){ const sd=await window.getScreenDetails(); let saved=null; try{ saved=localStorage.getItem('vdn-screen'); }catch{}
      const key=x=>`${x.label||''}|${x.left},${x.top}|${x.width}x${x.height}`; let s=sd.screens.find(x=>key(x)===saved)||sd.screens.find(x=>!x.isPrimary&&x!==sd.currentScreen);
      if(s) feat=`popup,left=${s.availLeft},top=${s.availTop},width=${s.availWidth},height=${s.availHeight}`; } } }catch{}
  const w=window.open('/proyector','vdn-proyector',feat); if(!w) toast('El navegador bloqueó la ventana. Permite ventanas emergentes para esta página.'); else { try{ w.focus(); }catch{} }
}
document.addEventListener('click',ev=>{ const el=ev.target.closest('[data-act="open-proj"]'); if(el){ ev.preventDefault(); openProyector(); } });

/* ---------- Fondo y letra de la pantalla ---------- */
const PJ_BG=[['Negro','#000000'],['Azul noche','linear-gradient(160deg,#0b1d3a 0%,#02060f 100%)'],['Azul real','linear-gradient(135deg,#1e3c72 0%,#2a5298 100%)'],['Morado','linear-gradient(135deg,#2b1055 0%,#7597de 140%)'],['Vino','linear-gradient(160deg,#3a0a12 0%,#120206 100%)'],['Dorado','radial-gradient(circle at 50% 30%,#5a4416 0%,#1a1206 70%)'],['Verde','linear-gradient(160deg,#0f2e1f 0%,#030b07 100%)'],['Amanecer','linear-gradient(180deg,#2c1a4a 0%,#c0574a 120%)'],['Gris','linear-gradient(160deg,#2b2f36 0%,#0d0f12 100%)'],['Celeste','linear-gradient(135deg,#0f4c75 0%,#3282b8 100%)']];
const PJ_FONTS=['Figtree','Montserrat','Poppins','Oswald','Merriweather','Lora'];
const PJ_COLORS=['#ffffff','#fff6d8','#e9c45a','#9fd3ff','#000000'];
let PJS=null, PJF=[];
async function styleOpen(){
  try{ PJS=await (await fetch('/api/proyector/estilo')).json(); }catch{ PJS={bg:'#000000',img:'',dim:.35,color:'#ffffff',ref:'#e9c45a',font:'Figtree',upper:false,size:1,margin:4,shadow:true}; }
  try{ PJF=(await api('/api/fondos')).fondos||[]; }catch{ PJF=[]; }
  styleDraw();
}
function stylePrev(){ const x=PJS; return `<div style="aspect-ratio:16/9;border-radius:10px;overflow:hidden;position:relative;border:1px solid var(--line);background:${x.img?`url('${x.img}') center/cover,`:''}${x.bg}"><div style="position:absolute;inset:0;background:#000;opacity:${x.img?x.dim:0}"></div><div style="position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:0 ${x.margin}%;font-family:'${x.font}',sans-serif;font-weight:700;color:${x.color};font-size:${Math.round(22*x.size)}px;line-height:1.2;${x.upper?'text-transform:uppercase;':''}${x.shadow?'text-shadow:0 2px 8px rgba(0,0,0,.7);':''}"><span>Cuán grande es Él<br>Santo, santo es el Señor</span></div><div style="position:absolute;left:0;right:0;bottom:6%;text-align:center;font-family:'${x.font}',sans-serif;font-weight:700;font-size:12px;color:${x.ref}">Juan 3:16 · RVR1960</div></div>`; }
function styleDraw(){
  const x=PJS; if(!document.getElementById('pjs-font-css')){ const l=document.createElement('link'); l.id='pjs-font-css'; l.rel='stylesheet'; l.href='https://fonts.googleapis.com/css2?family=Figtree:wght@700&family=Montserrat:wght@700&family=Poppins:wght@700&family=Merriweather:wght@700&family=Oswald:wght@600&family=Lora:wght@700&display=swap'; document.head.appendChild(l); }
  const sw=(bg,on,act,extra='')=>`<button type="button" data-act="${act}" ${extra} aria-pressed="${on}" style="width:56px;height:36px;border-radius:8px;border:${on?'3px solid var(--accent)':'1px solid var(--line)'};background:${bg};background-size:cover;background-position:center;cursor:pointer"></button>`;
  $('#modal-root').innerHTML=`<div class="scrim" data-act="close-modal"><div class="modal" role="dialog" aria-label="Fondo y letra" data-stop style="width:min(640px,100%)">
    <header><h3>🎨 Fondo y letra de la pantalla</h3><button type="button" class="btn ghost" data-act="close-modal" aria-label="Cerrar">${ICON.x}</button></header>
    <div class="body" style="display:grid;gap:14px">
      <div id="pjs-prev">${stylePrev()}</div>
      <div><b style="font-size:14px">Fondo de color</b><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${PJ_BG.map(([n,v],i)=>`<span title="${n}">${sw(v,!x.img&&x.bg===v,'pjs-bg',`data-i="${i}"`)}</span>`).join('')}</div></div>
      <div><b style="font-size:14px">Fondo con imagen</b><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;align-items:center">${PJF.map(f=>sw(`url('${f.url}')`,x.img===f.url,'pjs-img',`data-u="${f.url}"`)).join('')}
        <label class="btn" style="cursor:pointer">＋ Subir imagen<input type="file" id="pjs-up" accept="image/*" hidden></label>${x.img?`<button type="button" class="btn ghost" data-act="pjs-noimg">Quitar imagen</button><button type="button" class="btn ghost danger" data-act="pjs-delimg" data-u="${x.img}">Borrar esta imagen</button>`:''}</div>
        ${x.img?`<label class="f" style="margin-top:8px">Oscurecer la imagen (para que se lea mejor): ${Math.round(x.dim*100)}%<input type="range" min="0" max="0.85" step="0.05" value="${x.dim}" id="pjs-dim"></label>`:''}</div>
      <div class="grid2">
        <label class="f">Tipo de letra<select id="pjs-font">${PJ_FONTS.map(f=>`<option ${f===x.font?'selected':''} style="font-family:'${f}'">${f}</option>`).join('')}</select></label>
        <label class="f">Tamaño de la letra: ${Math.round(x.size*100)}%<input type="range" min="0.6" max="1.3" step="0.05" value="${x.size}" id="pjs-size"></label>
      </div>
      <div><b style="font-size:14px">Color de la letra</b><div style="display:flex;gap:6px;margin-top:6px;align-items:center">${PJ_COLORS.map(c=>sw(c,x.color===c,'pjs-color',`data-c="${c}"`)).join('')}<span class="muted" style="font-size:13px;margin-left:8px">Cita:</span>${['#e9c45a','#ffffff','#9fd3ff'].map(c=>sw(c,x.ref===c,'pjs-ref',`data-c="${c}"`)).join('')}</div></div>
      <div class="grid2">
        <label class="f">Margen a los lados: ${x.margin}% <small class="muted">(súbelo si la TV corta los bordes)</small><input type="range" min="0" max="12" step="1" value="${x.margin}" id="pjs-margin"></label>
        <div style="display:grid;gap:6px;align-content:end"><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="pjs-upper" ${x.upper?'checked':''}> TODO EN MAYÚSCULAS</label><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="pjs-shadow" ${x.shadow?'checked':''}> Sombra en la letra</label></div>
      </div>
      <p class="muted" style="margin:0;font-size:12.5px">Los cambios se ven al instante en la pantalla del proyector.</p>
    </div></div></div>`;
  const on=(id,ev,fn)=>{ const el=$(id); if(el) el.addEventListener(ev,fn); };
  on('#pjs-font','change',e=>styleSet({font:e.target.value}));
  on('#pjs-size','input',e=>styleSet({size:+e.target.value},true));
  on('#pjs-margin','input',e=>styleSet({margin:+e.target.value},true));
  on('#pjs-dim','input',e=>styleSet({dim:+e.target.value},true));
  on('#pjs-upper','change',e=>styleSet({upper:e.target.checked}));
  on('#pjs-shadow','change',e=>styleSet({shadow:e.target.checked}));
  on('#pjs-up','change',async e=>{ const f=e.target.files[0]; if(!f) return; toast('Subiendo imagen…');
    try{ const r=await fetch('/api/fondos',{method:'POST',headers:{Authorization:'Bearer '+S.token,'Content-Type':'application/octet-stream'},body:f}); const d=await r.json(); if(!r.ok) throw 0; PJF.unshift({url:d.url}); styleSet({img:d.url}); }catch{ toast('No se pudo subir esa imagen.'); } });
}
let PJS_T=null;
function styleSet(ch,soft){ Object.assign(PJS,ch); if(typeof BB!=='undefined') BB.style={...PJS}; if(soft){ const pv=$('#pjs-prev'); if(pv) pv.innerHTML=stylePrev(); const lab=document.activeElement&&document.activeElement.closest('label'); if(lab&&lab.firstChild&&lab.firstChild.nodeType===3){ const k=document.activeElement.id; const v=PJS[k.replace('pjs-','')]; lab.firstChild.nodeValue=lab.firstChild.nodeValue.replace(/\d+%/, (k==='pjs-margin'?v:Math.round(v*100))+'%'); } } else styleDraw();
  clearTimeout(PJS_T); PJS_T=setTimeout(async()=>{ try{ PJS=await api('/api/proyector/estilo',{method:'POST',body:JSON.stringify(PJS)}); }catch(e){ if(e.message==='auth') lostAuth(); else toast('No se pudo guardar el estilo.'); } },soft?250:0); }
document.addEventListener('click',ev=>{ const el=ev.target.closest('[data-act]'); if(!el) return; const a=el.dataset.act, d=el.dataset;
  if(a==='proj-style') styleOpen();
  else if(a==='pjs-bg') styleSet({bg:PJ_BG[+d.i][1],img:''});
  else if(a==='pjs-img') styleSet({img:d.u});
  else if(a==='pjs-noimg') styleSet({img:''});
  else if(a==='pjs-delimg'){ (async()=>{ try{ await api('/api/fondos/'+d.u.split('/').pop(),{method:'DELETE'}); PJF=PJF.filter(f=>f.url!==d.u); styleSet({img:''}); }catch{ toast('No se pudo borrar.'); } })(); }
  else if(a==='pjs-color') styleSet({color:d.c});
  else if(a==='pjs-ref') styleSet({ref:d.c});
});

/* F9: poner la pantalla en negro (y volver a mostrar lo que había) desde cualquier parte */
document.addEventListener('keydown',async e=>{ if(e.key!=='F9') return; e.preventDefault(); if(!S.token){ toast('Ingresa con tu usuario para controlar la pantalla.'); return; }
  try{ const r=await api('/api/proyector/negro',{method:'POST'}); PJ.remote=r; if(typeof BB!=='undefined') BB.remote=r; if(typeof MS!=='undefined') MS.remote=r; toast(r.mode==='black'?'■ Pantalla en negro (F9 para volver)':'Pantalla restaurada'); if(PJ.open) pjRender(); if(V.view==='bible'||V.view==='mensaje') render(); }
  catch(err){ if(err.message==='auth') lostAuth(); else toast('No se pudo cambiar la pantalla.'); } });
