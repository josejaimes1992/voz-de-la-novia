/* Voz de la Novia — Biblia: buscar citas y proyectarlas (estilo Holyrics) */
"use strict";
const BB={pick:false,versions:null,ver:null,data:null,loading:false,err:'',b:42,c:2,v:null,live:false,q:'',hits:null,remote:null};
const BB_GROUPS=[[0,5,'#7a4a22'],[5,17,'#d9821e'],[17,22,'#c0392b'],[22,39,'#8e3a9d'],[39,43,'#3f51b5'],[43,44,'#0e8fa3'],[44,57,'#1a9a58'],[57,65,'#14806a'],[65,66,'#7cb342']];
const BB_ALIAS={salmo:'Salmos',sl:'Salmos',ps:'Salmos',apoc:'Apocalipsis',rev:'Apocalipsis',revelacion:'Apocalipsis',hch:'Hechos',hech:'Hechos',stgo:'Santiago',sant:'Santiago',cant:'Cantares',cantar:'Cantares',mc:'Marcos',mr:'Marcos',mrc:'Marcos',jn:'Juan',lc:'Lucas',mt:'Mateo',ro:'Romanos',rom:'Romanos',gal:'Gálatas',ga:'Gálatas',fil:'Filipenses',flp:'Filipenses',flm:'Filemón',heb:'Hebreos',he:'Hebreos',jud:'Judas',ec:'Eclesiastés',ecl:'Eclesiastés',pr:'Proverbios',prov:'Proverbios',is:'Isaías',jr:'Jeremías',jer:'Jeremías',lm:'Lamentaciones',lam:'Lamentaciones',ez:'Ezequiel',dn:'Daniel',os:'Oseas',jl:'Joel',am:'Amós',abd:'Abdías',jon:'Jonás',mi:'Miqueas',nah:'Nahúm',hab:'Habacuc',sof:'Sofonías',hag:'Hageo',zac:'Zacarías',mal:'Malaquías',gn:'Génesis',gen:'Génesis',ex:'Éxodo',lv:'Levítico',lev:'Levítico',nm:'Números',num:'Números',dt:'Deuteronomio',deut:'Deuteronomio',jos:'Josué',jue:'Jueces',rt:'Rut',esd:'Esdras',ne:'Nehemías',neh:'Nehemías',est:'Ester',ef:'Efesios',col:'Colosenses',tit:'Tito'};

(function(){ const st=document.createElement('style'); st.textContent=`
.bb{display:grid;gap:12px}
.bb-find{display:flex;gap:8px;align-items:center}
.bb-find .search{flex:1}
.bb-sug{display:grid;gap:4px;max-height:50vh;overflow:auto}
.bb-sug button{text-align:left;border:1px solid var(--line);background:var(--surface);border-radius:10px;padding:8px 12px;color:inherit;font:inherit;cursor:pointer}
.bb-sug button b{color:var(--accent)}
.bb-sug button small{display:block;color:var(--muted);font-size:13px;line-height:1.35}
.bb-wrap{display:grid;grid-template-columns:minmax(0,1fr);gap:12px}
.bb-books{display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:3px}
.bb-bk{border:0;border-radius:6px;color:#fff;padding:6px 2px 4px;cursor:pointer;display:grid;line-height:1.05;text-align:center;font-family:var(--f-ui)}
.bb-bk b{font-size:19px;font-weight:600}
.bb-bk small{font-size:10px;opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bb-bk[aria-pressed="true"]{outline:3px solid var(--ink);outline-offset:-3px;filter:brightness(.82)}
.bb-nums{display:grid;grid-template-columns:repeat(auto-fill,minmax(44px,1fr));gap:3px}
.bb-n{border:0;border-radius:6px;background:#8a5a2b;color:#fff;font:600 18px/1 var(--f-ui);padding:10px 0;cursor:pointer}
.bb-nums.vs .bb-n{background:#b38652}
.bb-n[aria-pressed="true"]{background:#2b1a0c;outline:2px solid var(--accent)}
.bb-h{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin:2px 0 6px}
.bb-h b{font-family:var(--f-display);font-size:20px}
.bb-vlist{border:1px solid var(--line);border-radius:10px;background:var(--surface);overflow:auto;max-height:70vh}
.bb-v{display:block;width:100%;text-align:justify;border:0;border-bottom:1px solid var(--line);background:none;color:inherit;font:inherit;font-size:16px;line-height:1.45;padding:9px 12px;cursor:pointer}
.bb-v b{color:var(--accent);margin-right:4px;font-family:var(--f-ui)}
.bb-v[aria-current="true"]{background:#5b6b16;color:#fff}
.bb-v[aria-current="true"] b{color:#fff}
.bb-v.onscr{box-shadow:inset 4px 0 0 #e05a4f}
.bb-bar{position:sticky;bottom:0;z-index:5;display:flex;gap:6px;flex-wrap:wrap;align-items:center;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:8px;margin-top:4px;box-shadow:0 -6px 18px rgba(0,0,0,.08)}
.bb-bar .ref{flex:1;min-width:140px;font-weight:700;font-size:15px}
.bb-bar .ref small{display:block;font-weight:500;color:var(--muted);font-size:12px}
.bb-bar .btn[aria-pressed="true"]{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
.bb-note{color:var(--muted);font-size:12px}
.bb-ver{border:1px solid var(--line);background:var(--surface);color:inherit;border-radius:8px;padding:4px 6px;font:600 13px var(--f-ui)}
.bb-pickbtn{border:1px solid var(--line);background:var(--surface);color:inherit;border-radius:10px;padding:6px 12px;font:600 14px var(--f-ui);cursor:pointer}
@media (max-width:979px){.bb-h .bb-note{display:none}.bb-h b{white-space:nowrap}.bb-right{display:none;order:-1}.bb-right.open{display:block}.bb-vlist{max-height:62vh}.bb-books{grid-template-columns:repeat(6,minmax(0,1fr))}.bb-bk b{font-size:16px}}
@media (min-width:980px){.bb-pickbtn{display:none}}
@media (min-width:980px){
  .bb-wrap{grid-template-columns:380px minmax(0,1fr);align-items:start}
  .bb-left{position:sticky;top:8px}
  .bb-books{grid-template-columns:repeat(11,minmax(0,1fr))}
  .bb-pick{display:grid;grid-template-columns:1fr 1fr;gap:10px}
}
`; document.head.appendChild(st); })();

function bbNorm(s){ return (s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/\s+/g,''); }
function bbBooks(){ return BB.data?BB.data.books:[]; }
function bbColor(i){ for(const [a,b,c] of BB_GROUPS) if(i>=a&&i<b) return c; return '#555'; }
function bbRef(b,c,v){ const bk=bbBooks()[b]; if(!bk) return ''; return `${bk[1]} ${c+1}${v!=null?':'+(v+1):''}`; }
async function bbLoad(){
  if(BB.data||BB.loading) return; BB.loading=true; BB.err='';
  try{
    if(!BB.versions){ try{ BB.versions=(await (await fetch('/biblia/versiones')).json()).versions; }catch{ BB.versions=[{id:'RV1909',name:'Reina-Valera 1909',url:'/biblia/rv1909.json'}]; } }
    let pref=null; try{ pref=localStorage.getItem('vdn-biblia'); }catch{}
    const v=BB.versions.find(x=>x.id===(BB.ver||pref))||BB.versions[0]; BB.ver=v.id;
    const r=await fetch(v.url); if(!r.ok) throw new Error(r.status); BB.data=await r.json(); }
  catch(e){ BB.err='No se pudo cargar la Biblia. Revisa tu internet.'; }
  BB.loading=false; if(V.view==='bible') render();
}
/* "jn 3 16", "Juan 3:16", "1co13:4", "sal 23" */
function bbParse(q){
  const mm=(q||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().match(/^([123])?\s*([a-zñ]+)\.?\s*(\d+)?\s*(?:[:.\s]\s*(\d+))?\s*(?:-\s*(\d+))?$/); if(!mm) return null;
  const num=mm[1]||'', word=mm[2]; const bi=bbFindBook(num,word); if(bi<0) return null;
  const bk=bbBooks()[bi]; let c=mm[3]?Math.max(1,parseInt(mm[3],10)):1; c=Math.min(c,bk[3].length);
  let v=mm[4]?parseInt(mm[4],10):null; if(v!=null) v=Math.min(Math.max(1,v),bk[3][c-1].length);
  return {b:bi,c:c-1,v:v!=null?v-1:null};
}
function bbFindBook(num,word){
  const books=bbBooks(); if(!word) return -1;
  const alias=BB_ALIAS[word]; const key=num+word;
  let best=-1, bestScore=0;
  books.forEach((bk,i)=>{ const n=bbNorm(bk[1]), a=bbNorm(bk[2]); let sc=0;
    if(a===key) sc=100; else if(alias&&!num&&bbNorm(alias)===n) sc=90; else if(alias&&num&&bbNorm(num+alias)===n) sc=90;
    else if(n===key) sc=95; else if(n.startsWith(key)) sc=60-(n.length-key.length)*0.1;
    if(sc>bestScore){ bestScore=sc; best=i; } });
  return best;
}
function bbSearchWords(q){
  const toks=bbNorm(q.replace(/\s+/g,' ')).length?(q||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().split(/[^a-zñ0-9]+/).filter(x=>x.length>1):[];
  if(!toks.length) return []; const out=[];
  bbBooks().forEach((bk,b)=>bk[3].forEach((ch,c)=>ch.forEach((tx,v)=>{ if(out.length>=80) return; const n=tx.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase(); if(toks.every(t=>n.includes(t))) out.push({b,c,v,tx}); })));
  return out;
}
window.viewBible=function(){
  bbLoad();
  if(!BB.data) return `<div class="loading">${BB.err?esc(BB.err):'Abriendo la Biblia…'}</div>`;
  const books=bbBooks(), bk=books[BB.b], ch=bk[3][BB.c]||[]; const can=S.canWrite;
  const r=BB.remote||(typeof PJ!=='undefined'&&PJ.remote)||null;
  const onRef=r&&r.mode==='text'&&r.bible?r.bible:null;
  return `<div class="bb">
    <div class="bb-find"><div class="search">${ICON.search}<input id="bb-q" type="search" autocomplete="off" placeholder="Escribe la cita (Jn 3 16) o palabras del versículo" value="${esc(BB.q)}" aria-label="Buscar en la Biblia"></div></div>
    <div class="bb-sug" id="bb-sug">${bbSugHtml()}</div>
    <div class="bb-wrap">
      <div class="bb-left">
        <div class="bb-h"><b>${esc(bk[1])} ${BB.c+1}</b><button class="bb-pickbtn" data-act="bb-pick">${BB.pick?'Cerrar':'📚 Libro y capítulo'}</button>${BB.versions&&BB.versions.length>1?`<select id="bb-ver" class="bb-ver" aria-label="Versión">${BB.versions.map(v=>`<option value="${esc(v.id)}" ${v.id===BB.ver?'selected':''}>${esc(v.id)}</option>`).join('')}</select>`:`<span class="bb-note">${esc(BB.data.name)}</span>`}</div>
        <div class="bb-vlist" id="bb-vlist">${ch.map((t,i)=>`<button class="bb-v${onRef&&onRef.b===BB.b&&onRef.c===BB.c&&onRef.v===i?' onscr':''}" data-act="bb-v" data-v="${i}" aria-current="${BB.v===i}"><b>${i+1}</b>${esc(t||'—')}</button>`).join('')}</div>
      </div>
      <div class="bb-right${BB.pick?' open':''}">
        <div class="bb-books">${books.map((x,i)=>`<button class="bb-bk" style="background:${bbColor(i)}" data-act="bb-b" data-b="${i}" aria-pressed="${i===BB.b}" title="${esc(x[1])}"><b>${esc(x[2])}</b><small>${esc(x[1])}</small></button>`).join('')}</div>
        <div class="bb-pick" style="margin-top:10px">
          <div><div class="bb-h"><b style="font-size:16px">Capítulo</b></div><div class="bb-nums">${bk[3].map((_,i)=>`<button class="bb-n" data-act="bb-c" data-c="${i}" aria-pressed="${i===BB.c}">${i+1}</button>`).join('')}</div></div>
          <div><div class="bb-h"><b style="font-size:16px">Versículo</b></div><div class="bb-nums vs">${ch.map((_,i)=>`<button class="bb-n" data-act="bb-v" data-v="${i}" aria-pressed="${BB.v===i}">${i+1}</button>`).join('')}</div></div>
        </div>
      </div>
    </div>
    ${can?`<div class="bb-bar">
      <span class="ref">${BB.v!=null?esc(bbRef(BB.b,BB.c,BB.v)):'Elige un versículo'}<small>${BB.live?'● En vivo: al tocar un versículo sale en pantalla':'Toca “Proyectar” para ponerlo en pantalla'}</small></span>
      <button class="btn" data-act="bb-step" data-d="-1" aria-label="Versículo anterior">◀</button>
      <button class="btn ${BB.live?'':'pri'}" data-act="bb-proj" aria-pressed="${BB.live}">${ICON.screen}${BB.live?'En vivo':'Proyectar'}</button>
      <button class="btn" data-act="bb-step" data-d="1" aria-label="Versículo siguiente">▶</button>
      <button class="btn" data-act="bb-mode" data-m="black" aria-pressed="${r&&r.mode==='black'}">Negro</button>
      <button class="btn" data-act="bb-mode" data-m="logo" aria-pressed="${r&&r.mode==='logo'}">Logo</button>
      <button class="btn" data-act="proj-style">🎨 Fondo</button><button class="btn" data-act="open-proj">Abrir pantalla</button>
    </div>`:''}
    <p class="bb-note">${esc(BB.data.name)} · ${esc(BB.data.note||'')}</p>
  </div>`;
};
function bbSugHtml(){
  const q=BB.q.trim(); if(!q||!BB.data) return '';
  const p=bbParse(q); let h='';
  if(p){ const bk=bbBooks()[p.b]; const t=p.v!=null?bk[3][p.c][p.v]:bk[3][p.c][0]; h+=`<button data-act="bb-go" data-b="${p.b}" data-c="${p.c}" data-v="${p.v==null?'':p.v}"><b>${esc(bbRef(p.b,p.c,p.v))}</b> — Enter para ir<small>${esc((t||'').slice(0,160))}</small></button>`; }
  if(!p&&q.length>=3){ const hits=bbSearchWords(q); h+=hits.length?hits.map(x=>`<button data-act="bb-go" data-b="${x.b}" data-c="${x.c}" data-v="${x.v}"><b>${esc(bbRef(x.b,x.c,x.v))}</b><small>${esc(x.tx)}</small></button>`).join('')+(hits.length>=80?'<p class="bb-note">Se muestran los primeros 80. Agrega otra palabra para afinar.</p>':''):'<p class="bb-note">Sin resultados.</p>'; }
  return h;
}
function bbAfter(){
  const vs=$('#bb-ver'); if(vs) vs.addEventListener('change',e=>{ BB.ver=e.target.value; try{ localStorage.setItem('vdn-biblia',BB.ver); }catch{} BB.data=null; render(); });
  const qi=$('#bb-q'); if(!qi) return;
  qi.addEventListener('input',e=>{ BB.q=e.target.value; clearTimeout(BB.t); BB.t=setTimeout(()=>{ const s=$('#bb-sug'); if(s) s.innerHTML=bbSugHtml(); },120); });
  qi.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); const p=bbParse(BB.q); if(p){ bbGo(p.b,p.c,p.v); } else { const f=$('#bb-sug button'); if(f) f.click(); } } else if(e.key==='Escape'){ BB.q=''; qi.value=''; $('#bb-sug').innerHTML=''; qi.blur(); } });
  if(BB.focusQ){ BB.focusQ=false; qi.focus(); const n=qi.value.length; try{ qi.setSelectionRange(n,n); }catch{} }
  const cur=document.querySelector('#bb-vlist [aria-current="true"]'); if(cur){ const L=$('#bb-vlist'); const a=cur.getBoundingClientRect(), b=L.getBoundingClientRect(); if(a.top<b.top||a.bottom>b.bottom) L.scrollTop+=a.top-b.top-L.clientHeight/3; }
}
function bbGo(b,c,v){ BB.b=b; BB.c=c; BB.v=v; BB.q=''; render(); if(v!=null&&BB.live) bbProject(); }
async function bbProject(){
  if(BB.v==null||!S.canWrite) return; const bk=bbBooks()[BB.b]; const text=bk[3][BB.c][BB.v]||''; const ref=bbRef(BB.b,BB.c,BB.v);
  const st={mode:'text',title:ref,text,label:BB.data.id,ref:`${ref} · ${BB.data.id}`,songId:null,programId:null,idx:BB.v,total:bk[3][BB.c].length,bible:{b:BB.b,c:BB.c,v:BB.v}};
  BB.remote=st; BB.live=true; render();
  try{ BB.remote=await api('/api/proyector',{method:'POST',body:JSON.stringify(st)}); }
  catch(e){ if(e.message==='auth'){ lostAuth(); } else toast('No se pudo poner en pantalla. Revisa el internet.'); }
  if(V.view==='bible') render();
}
async function bbMode(m){ const r=BB.remote||{}; if(r.mode===m){ if(BB.v!=null) return bbProject(); m='logo'; }
  BB.remote={...r,mode:m}; render(); try{ BB.remote=await api('/api/proyector',{method:'POST',body:JSON.stringify({...r,mode:m})}); }catch{ toast('No se pudo cambiar la pantalla.'); } if(V.view==='bible') render(); }
function bbStep(d){
  const books=bbBooks(); let {b,c,v}=BB; if(v==null){ v=d>0?-1:books[b][3][c].length; }
  v+=d;
  if(v>=books[b][3][c].length){ if(c+1<books[b][3].length){ c++; v=0; } else if(b+1<books.length){ b++; c=0; v=0; } else return; }
  if(v<0){ if(c>0){ c--; v=books[b][3][c].length-1; } else if(b>0){ b--; c=books[b][3].length-1; v=books[b][3][c].length-1; } else return; }
  BB.b=b; BB.c=c; BB.v=v; render(); if(BB.live) bbProject();
}
document.addEventListener('click',ev=>{
  const el=ev.target.closest('[data-act]'); if(!el) return; const a=el.dataset.act, d=el.dataset;
  if(a==='bb-b'){ BB.b=+d.b; BB.c=0; BB.v=null; render(); }
  else if(a==='bb-c'){ BB.c=+d.c; BB.v=null; BB.pick=false; render(); const L=$('#bb-vlist'); if(L) L.scrollTop=0; }
  else if(a==='bb-v'){ const v=+d.v; const again=BB.v===v; BB.v=v; BB.pick=false; render(); if(BB.live||again) bbProject(); }
  else if(a==='bb-pick'){ BB.pick=!BB.pick; render(); window.scrollTo({top:0}); }
  else if(a==='bb-go'){ bbGo(+d.b,+d.c,d.v===''?null:+d.v); }
  else if(a==='bb-proj'){ if(BB.live&&BB.remote&&BB.remote.bible&&BB.v!=null&&BB.remote.bible.v===BB.v&&BB.remote.mode==='text'){ BB.live=false; render(); toast('Modo en vivo apagado: tocar un versículo ya no lo proyecta.'); } else if(BB.v==null) toast('Primero elige un versículo.'); else bbProject(); }
  else if(a==='bb-step') bbStep(+d.d);
  else if(a==='bb-mode') bbMode(d.m);
});
/* Teclado (como Holyrics): escribir busca; flechas cambian de versículo */
document.addEventListener('keydown',e=>{
  if(V.view!=='bible'||e.ctrlKey||e.metaKey||e.altKey) return; const inField=e.target.closest('input,textarea,select');
  if(inField) return;
  if(e.key==='ArrowRight'||e.key==='ArrowDown'||e.key==='PageDown'){ e.preventDefault(); bbStep(1); }
  else if(e.key==='ArrowLeft'||e.key==='ArrowUp'||e.key==='PageUp'){ e.preventDefault(); bbStep(-1); }
  else if(e.key==='Enter'&&BB.v!=null&&S.canWrite){ e.preventDefault(); bbProject(); }
  else if(e.key.length===1&&/[\p{L}\p{N}]/u.test(e.key)){ BB.q=e.key; BB.focusQ=true; e.preventDefault(); render(); }
});
window.bibleAfterRender=bbAfter;
