/* Voz de la Novia — Biblia: buscar citas y proyectarlas (estilo Holyrics) */
"use strict";
const BB={pick:false,versions:null,ver:null,data:null,loading:false,err:'',b:0,c:0,v:0,live:false,q:'',hits:null,remote:null};
const BB_GROUPS=[[0,5,'#7a4a22'],[5,17,'#d9821e'],[17,22,'#c0392b'],[22,39,'#8e3a9d'],[39,43,'#3f51b5'],[43,44,'#0e8fa3'],[44,57,'#1a9a58'],[57,65,'#14806a'],[65,66,'#7cb342']];
const BB_ALIAS={salmo:'Salmos',sl:'Salmos',ps:'Salmos',apoc:'Apocalipsis',rev:'Apocalipsis',revelacion:'Apocalipsis',hch:'Hechos',hech:'Hechos',stgo:'Santiago',sant:'Santiago',cant:'Cantares',cantar:'Cantares',mc:'Marcos',mr:'Marcos',mrc:'Marcos',jn:'Juan',lc:'Lucas',mt:'Mateo',ro:'Romanos',rom:'Romanos',gal:'Gálatas',ga:'Gálatas',fil:'Filipenses',flp:'Filipenses',flm:'Filemón',heb:'Hebreos',he:'Hebreos',jud:'Judas',ec:'Eclesiastés',ecl:'Eclesiastés',pr:'Proverbios',prov:'Proverbios',is:'Isaías',jr:'Jeremías',jer:'Jeremías',lm:'Lamentaciones',lam:'Lamentaciones',ez:'Ezequiel',dn:'Daniel',os:'Oseas',jl:'Joel',am:'Amós',abd:'Abdías',jon:'Jonás',mi:'Miqueas',nah:'Nahúm',hab:'Habacuc',sof:'Sofonías',hag:'Hageo',zac:'Zacarías',mal:'Malaquías',gn:'Génesis',gen:'Génesis',ex:'Éxodo',lv:'Levítico',lev:'Levítico',nm:'Números',num:'Números',dt:'Deuteronomio',deut:'Deuteronomio',jos:'Josué',jue:'Jueces',rt:'Rut',esd:'Esdras',ne:'Nehemías',neh:'Nehemías',est:'Ester',ef:'Efesios',col:'Colosenses',tit:'Tito'};

(function(){ const st=document.createElement('style'); st.textContent=`
.bb{display:grid;gap:12px}
.bb-find{display:flex;gap:8px;align-items:center}
.bb-find .search{flex:1}
.bb-sug{display:grid;gap:4px;max-height:50vh;overflow:auto}
.bb-sug button{text-align:left;border:1px solid var(--line);background:var(--surface);border-radius:10px;padding:8px 12px;color:inherit;font:inherit;cursor:pointer}
.bb-sug button b{color:var(--accent)}
.bb-sug button.sel{border-color:var(--accent);background:var(--accent-soft)}
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
.bb-live{display:grid;gap:2px;flex:none;text-align:center}
.bb-live small{font-size:11px;color:#e05a4f;font-weight:700}
.bb-scr{position:relative;width:200px;aspect-ratio:16/9;border-radius:6px;overflow:hidden;display:grid;place-items:center;padding:6px 8px 14px;border:2px solid #e05a4f}
.bb-scr i{position:absolute;inset:0;background:#000}
.bb-scr span{position:relative;font:700 9.5px/1.25 var(--f-ui);display:-webkit-box;-webkit-line-clamp:6;-webkit-box-orient:vertical;overflow:hidden;text-shadow:0 1px 3px rgba(0,0,0,.6)}
.bb-scr em{position:absolute;left:0;right:0;bottom:3px;font:700 8px var(--f-ui);font-style:normal}
@media (max-width:600px){.bb-scr{width:140px}}
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
    fetch('/api/proyector/estilo').then(x=>x.json()).then(x=>{ BB.style=x; }).catch(()=>{});
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
    <div class="bb-find"><button class="btn pri" data-act="bb-quick" title="Cita rápida: escribe el libro, el capítulo y el versículo">⚡ Cita rápida</button><div class="search">${ICON.search}<input id="bb-q" type="search" autocomplete="off" placeholder="Buscar palabras del versículo o una cita" value="${esc(BB.q)}" aria-label="Buscar en la Biblia"></div></div>
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
      ${bbLiveBox(r)}
      <span class="ref">${BB.v!=null?esc(bbRef(BB.b,BB.c,BB.v)):'Elige un versículo'}<small>${BB.live?'● En vivo · ▶ ◀ envían el siguiente · Enter o doble clic proyecta el marcado':'Enter, doble clic o “Proyectar” lo pone en pantalla'}</small></span>
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
/* ---------- Buscador rápido (como Holyrics): letras → libro, Enter → capítulo, Enter → versículo ---------- */
const BB_POP=['Juan','Salmos','Mateo','Marcos','Lucas','Hechos','Romanos','Génesis','Isaías','Apocalipsis','Hebreos','Efesios','Proverbios','1 Juan','1 Corintios','Éxodo','Daniel','Jeremías','Santiago','Gálatas','Filipenses','Colosenses','Ezequiel','Josué','Jueces'];
const BB_COMMON=new Set(['la','las','lo','los','de','del','el','en','es','un','una','mi','su','se','si','no','me','te','le','y','o','a','al','con','por','para','que','ya','yo','tu','ni','pues','mas','ha','he','son','fue']);
function bbCands(num,word){
  const books=bbBooks(); if(!word) return []; const key=(num||'')+word; const alias=BB_ALIAS[word]; const out=[];
  books.forEach((bk,i)=>{ const n=bbNorm(bk[1]), a=bbNorm(bk[2]); let sc=0;
    if(n===key) sc=120; else if(a===key) sc=110; else if(alias&&bbNorm((num||'')+alias)===n) sc=105; else if(n.startsWith(key)) sc=60; else if(a.startsWith(key)&&key.length>=2) sc=50;
    if(!sc) return; const pi=BB_POP.indexOf(bk[1]); if(sc<100) sc+=pi>=0?(30-pi):0; out.push({i,sc}); });
  return out.sort((x,y)=>y.sc-x.sc||x.i-y.i).map(x=>x.i);
}
function bbQuick(q){
  const t=(q||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/^\s+/,'');
  const m=t.match(/^([123])?\s*([a-zñ]+)\.?(?:\s+|(?=\d))?(\d+)?(\s*[:.\s]\s*)?(\d+)?\s*$/); if(!m) return null;
  const [,num,word,ch,sep,vs]=m; const cands=bbCands(num,word); if(!cands.length) return null;
  const b=cands[Math.min(BB.sel||0,cands.length-1)]; const bk=bbBooks()[b];
  if(ch==null) return {stage:'book',cands,b,word,num};
  const c=Math.min(Math.max(1,+ch),bk[3].length)-1;
  if(!sep) return {stage:'chapter',cands,b,c};
  const v=vs!=null&&vs!==''?Math.min(Math.max(1,+vs),bk[3][c].length)-1:null;
  return {stage:'verse',cands,b,c,v};
}
function bbQuickSug(Q){
  const books=bbBooks();
  if(Q.stage==='book') return Q.cands.slice(0,6).map((i,k)=>`<button data-act="bb-pickbook" data-b="${i}" class="${k===(BB.sel||0)?'sel':''}"><b>${esc(books[i][1])}</b>${k===(BB.sel||0)?' — Enter o espacio':''}<small>${books[i][3].length} capítulos</small></button>`).join('')+(Q.cands.length>1?'<p class="bb-note">↑ ↓ para elegir otro libro</p>':'');
  const bk=books[Q.b];
  if(Q.stage==='chapter') return `<button data-act="bb-go" data-b="${Q.b}" data-c="${Q.c}" data-v=""><b>${esc(bk[1])} ${Q.c+1}</b> — Enter para elegir el versículo<small>Capítulos 1 a ${bk[3].length}</small></button>`;
  const v=Q.v; const tx=v!=null?bk[3][Q.c][v]:''; return `<button data-act="bb-go" data-b="${Q.b}" data-c="${Q.c}" data-v="${v==null?'':v}"><b>${esc(bbRef(Q.b,Q.c,v))}</b> — Enter${BB.live?' para proyectar':' para ir'}<small>${v!=null?esc(tx):`Versículos 1 a ${bk[3][Q.c].length}`}</small></button>`;
}
function bbSugHtml(){
  const q=BB.q.trim(); if(!q||!BB.data) return '';
  const Q=bbQuick(BB.q); if(Q) return bbQuickSug(Q);
  const p=bbParse(q); let h='';
  if(p){ const bk=bbBooks()[p.b]; const t=p.v!=null?bk[3][p.c][p.v]:bk[3][p.c][0]; h+=`<button data-act="bb-go" data-b="${p.b}" data-c="${p.c}" data-v="${p.v==null?'':p.v}"><b>${esc(bbRef(p.b,p.c,p.v))}</b> — Enter para ir<small>${esc((t||'').slice(0,160))}</small></button>`; }
  if(!p&&q.length>=3){ const hits=bbSearchWords(q); h+=hits.length?hits.map(x=>`<button data-act="bb-go" data-b="${x.b}" data-c="${x.c}" data-v="${x.v}"><b>${esc(bbRef(x.b,x.c,x.v))}</b><small>${esc(x.tx)}</small></button>`).join('')+(hits.length>=80?'<p class="bb-note">Se muestran los primeros 80. Agrega otra palabra para afinar.</p>':''):'<p class="bb-note">Sin resultados.</p>'; }
  return h;
}
function bbAfter(){
  const vs=$('#bb-ver'); if(vs) vs.addEventListener('change',e=>{ BB.ver=e.target.value; try{ localStorage.setItem('vdn-biblia',BB.ver); }catch{} BB.data=null; render(); });
  const qi=$('#bb-q'); if(!qi) return;
  const sug=()=>{ const s=$('#bb-sug'); if(s) s.innerHTML=bbSugHtml(); };
  qi.addEventListener('input',e=>{ const prev=BB.q; BB.q=e.target.value;
    /* espacio después de las letras del libro = elegir el libro (como Holyrics) */
    if(/\s$/.test(BB.q)&&!/\s$/.test(prev)&&BB.q.length>prev.length){ const Q=bbQuick(BB.q.trimEnd()); if(Q&&Q.stage==='book'&&Q.word.length>=2&&!BB_COMMON.has(Q.word)) { bbPickBook(Q.b); return; } }
    if(BB.q.length<prev.length||!/\s$/.test(BB.q)) BB.sel=BB.q.length>prev.length&&/[a-zñ]$/i.test(BB.q)?0:BB.sel;
    clearTimeout(BB.t); BB.t=setTimeout(sug,40); });
  qi.addEventListener('keydown',e=>{
    const Q=bbQuick(BB.q);
    if((e.key==='ArrowDown'||e.key==='ArrowUp')&&Q&&Q.stage==='book'){ e.preventDefault(); BB.sel=Math.max(0,Math.min(Q.cands.length-1,(BB.sel||0)+(e.key==='ArrowDown'?1:-1))); sug(); return; }
    if(e.key==='Enter'||(e.key==='Tab'&&Q&&Q.stage==='book')){ e.preventDefault();
      if(Q&&Q.stage==='book'){ bbPickBook(Q.b); return; }
      if(Q&&Q.stage==='chapter'){ BB.b=Q.b; BB.c=Q.c; BB.v=null; BB.pick=false; BB.q=`${bbBooks()[Q.b][1]} ${Q.c+1}:`; BB.focusQ=true; render(); const L=$('#bb-vlist'); if(L) L.scrollTop=0; return; }
      if(Q&&Q.stage==='verse'){ if(Q.v==null){ BB.b=Q.b; BB.c=Q.c; BB.v=null; BB.q=''; render(); return; } BB.sel=0; bbGo(Q.b,Q.c,Q.v); const n=$('#bb-q'); if(n) n.blur(); return; }
      const p=bbParse(BB.q); if(p){ bbGo(p.b,p.c,p.v); } else { const f=$('#bb-sug button'); if(f) f.click(); } }
    else if(e.key==='Escape'){ BB.q=''; BB.sel=0; qi.value=''; $('#bb-sug').innerHTML=''; qi.blur(); }
    else if(e.key==='Backspace'&&/\s$/.test(BB.q)&&Q&&Q.stage==='book'){ /* borra el libro completo */ }
  });
  if(BB.focusQ){ BB.focusQ=false; qi.focus(); const n=qi.value.length; try{ qi.setSelectionRange(n,n); }catch{} }
  const LL=$('#bb-vlist'); if(LL){ const k=BB.b+':'+BB.c; if(BB.lsKey===k) LL.scrollTop=BB.listScroll||0; else { BB.lsKey=k; BB.listScroll=0; } LL.addEventListener('scroll',()=>{ BB.listScroll=LL.scrollTop; },{passive:true}); }
  const cur=document.querySelector('#bb-vlist [aria-current="true"]'); if(cur){ const L=$('#bb-vlist'); const a=cur.getBoundingClientRect(), b=L.getBoundingClientRect(); if(a.top<b.top||a.bottom>b.bottom) L.scrollTop+=a.top-b.top-L.clientHeight/3; }
}
function bbPickBook(b){ const bk=bbBooks()[b]; BB.b=b; BB.c=0; BB.v=null; BB.sel=0; BB.q=bk[1]+' '; BB.focusQ=true; render(); }
function bbGo(b,c,v){ BB.b=b; BB.c=c; BB.v=v; BB.q=''; render(); }
/* Vista previa de lo que está en pantalla ahora */
function bbLiveBox(r){
  const x=BB.style||{}; const bg=x.img?`url('${x.img}') center/cover, ${x.bg||'#000'}`:(x.bg||'#000');
  const txt=!r?'':r.mode==='black'?'':r.mode==='logo'?'<img src="/vdn-logo.jpg?v=2" alt="" style="height:70%">':esc((r.text||'').slice(0,220));
  return `<div class="bb-live" title="En pantalla ahora"><div class="bb-scr" style="background:${bg}">${x.img?`<i style="opacity:${x.dim??.35}"></i>`:''}<span style="color:${x.color||'#fff'}">${txt}</span>${r&&r.mode==='text'&&r.ref?`<em style="color:${x.ref||'#e9c45a'}">${esc(r.ref)}</em>`:''}</div><small>${!r?'Pantalla':r.mode==='black'?'■ Negro':r.mode==='logo'?'Logo':'● En pantalla'}</small></div>`;
}
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
function bbStep(d,noProj){
  const books=bbBooks(); let {b,c,v}=BB; if(v==null){ v=d>0?-1:books[b][3][c].length; }
  v+=d;
  if(v>=books[b][3][c].length){ if(c+1<books[b][3].length){ c++; v=0; } else if(b+1<books.length){ b++; c=0; v=0; } else return; }
  if(v<0){ if(c>0){ c--; v=books[b][3][c].length-1; } else if(b>0){ b--; c=books[b][3].length-1; v=books[b][3][c].length-1; } else return; }
  BB.b=b; BB.c=c; BB.v=v; render(); if(BB.live&&!noProj) bbProject();
  setTimeout(()=>{ const cur=document.querySelector('#bb-vlist [aria-current="true"]'), L=$('#bb-vlist'); if(cur&&L){ const a=cur.getBoundingClientRect(), bb=L.getBoundingClientRect(); if(a.top<bb.top||a.bottom>bb.bottom) L.scrollTop+=a.top-bb.top-L.clientHeight/3; } },10);
}
document.addEventListener('click',ev=>{
  const el=ev.target.closest('[data-act]'); if(!el) return; const a=el.dataset.act, d=el.dataset;
  if(a==='bb-b'){ BB.b=+d.b; BB.c=0; BB.v=null; render(); }
  else if(a==='bb-c'){ BB.c=+d.c; BB.v=null; BB.pick=false; render(); const L=$('#bb-vlist'); if(L) L.scrollTop=0; }
  else if(a==='bb-v'){ const v=+d.v; const now=Date.now(); const dbl=BB.lastTap&&BB.lastTap.v===v&&BB.lastTap.c===BB.c&&now-BB.lastTap.t<450; BB.lastTap={v,c:BB.c,t:now}; BB.v=v; BB.pick=false; render(); if(dbl&&S.canWrite){ BB.lastTap=null; bbProject(); } }
  else if(a==='bb-pick'){ BB.pick=!BB.pick; render(); window.scrollTo({top:0}); }
  else if(a==='bb-quick'){ qkOpen(''); }
  else if(a==='qk-book'){ qkAccept(+d.b); qkDraw(); qkFocus(); }
  else if(a==='qk-close'){ qkClose(); }
  else if(a==='bb-pickbook'){ bbPickBook(+d.b); }
  else if(a==='bb-go'){ bbGo(+d.b,+d.c,d.v===''?null:+d.v); }
  else if(a==='bb-proj'){ if(BB.live&&BB.remote&&BB.remote.bible&&BB.v!=null&&BB.remote.bible.v===BB.v&&BB.remote.mode==='text'){ BB.live=false; render(); toast('Modo en vivo apagado: tocar un versículo ya no lo proyecta.'); } else if(BB.v==null) toast('Primero elige un versículo.'); else bbProject(); }
  else if(a==='bb-step') bbStep(+d.d);
  else if(a==='bb-mode') bbMode(d.m);
});
/* Teclado (como Holyrics): escribir busca; flechas cambian de versículo */
document.addEventListener('keydown',e=>{
  if(V.view!=='bible'||e.ctrlKey||e.metaKey||e.altKey) return; const inField=e.target.closest('input,textarea,select');
  if(inField) return;
  if(e.key==='ArrowDown'){ e.preventDefault(); bbStep(1,true); }
  else if(e.key==='ArrowUp'){ e.preventDefault(); bbStep(-1,true); }
  else if(e.key==='ArrowRight'||e.key==='PageDown'){ e.preventDefault(); bbStep(1); }
  else if(e.key==='ArrowLeft'||e.key==='PageUp'){ e.preventDefault(); bbStep(-1); }
  else if(e.key==='Enter'&&BB.v!=null&&S.canWrite){ e.preventDefault(); bbProject(); }
  else if(e.key.length===1&&/[\p{L}\p{N}]/u.test(e.key)){ e.preventDefault(); qkOpen(e.key); }
});
window.bibleAfterRender=bbAfter;

/* ================= Cita rápida (como Holyrics): Libro → Capítulo → Versículo, sin Enter ================= */
const QK={open:false,stage:'book',num:'',txt:'',b:null,ch:'',vs:''};
(function(){ const st=document.createElement('style'); st.textContent=`
.qk{position:fixed;inset:0;z-index:70;background:rgba(10,12,18,.55);display:grid;place-items:center;padding:16px}
.qk-box{background:var(--surface);color:var(--ink);border-radius:16px;width:min(760px,100%);padding:18px 22px 26px;box-shadow:0 30px 80px rgba(0,0,0,.45);position:relative;text-align:center}
.qk-esc{position:absolute;right:16px;top:12px;font-size:13px;color:var(--muted);background:none;border:0;cursor:pointer}
.qk-f{margin:10px 0 4px}
.qk-l{font-family:var(--f-display);font-size:30px;font-weight:700;color:var(--muted)}
.qk-f.on .qk-l{color:var(--ink)}
.qk-v{font-family:var(--f-ui);font-size:40px;font-weight:700;min-height:52px;line-height:1.25;color:var(--accent)}
.qk-f.on .qk-v::after{content:"";display:inline-block;width:3px;height:38px;background:var(--accent);margin-left:3px;vertical-align:-6px;animation:qkb 1s steps(1) infinite}
@keyframes qkb{50%{opacity:0}}
.qk-c{display:flex;flex-wrap:wrap;gap:4px 10px;justify-content:center;font-size:16px;color:var(--muted);min-height:24px}
.qk-c button{background:none;border:0;color:inherit;font:inherit;cursor:pointer;padding:2px 4px;border-radius:6px}
.qk-c button.top{color:var(--ink);font-weight:700;background:var(--accent-soft)}
.qk-prev{margin-top:14px;font-size:15px;color:var(--muted);line-height:1.45;min-height:22px}
.qk-in{position:absolute;opacity:0;left:0;top:0;width:1px;height:1px;border:0;padding:0}
@media (max-width:560px){.qk{place-items:start center;padding-top:40px}.qk-l{font-size:22px}.qk-v{font-size:30px;min-height:40px}}
`; document.head.appendChild(st); })();
const QK_PAD='  ';
function qkCands(){ return bbCands(QK.num,bbNorm(QK.txt)); }
function qkOpen(first){
  if(!BB.data) return; Object.assign(QK,{open:true,stage:'book',num:'',txt:'',b:null,ch:'',vs:''});
  let root=$('#qk'); if(!root){ root=document.createElement('div'); root.id='qk'; root.className='qk'; document.body.appendChild(root);
    root.addEventListener('click',e=>{ if(e.target===root) qkClose(); }); }
  root.innerHTML=`<div class="qk-box" role="dialog" aria-label="Cita rápida"><button class="qk-esc" data-act="qk-close">Esc para cancelar</button>
    <div class="qk-f" id="qk-fb"><div class="qk-l">Libro</div><div class="qk-v" id="qk-vb"></div><div class="qk-c" id="qk-c"></div></div>
    <div class="qk-f" id="qk-fc"><div class="qk-l">Capítulo</div><div class="qk-v" id="qk-vc"></div></div>
    <div class="qk-f" id="qk-fv"><div class="qk-l">Versículo</div><div class="qk-v" id="qk-vv"></div></div>
    <div class="qk-prev" id="qk-prev"></div>
    <input class="qk-in" id="qk-in" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" inputmode="text" value="${QK_PAD}" aria-label="Escribe la cita"></div>`;
  const inp=$('#qk-in');
  inp.addEventListener('input',()=>{ const v=inp.value; if(v.length<QK_PAD.length){ qkBack(); } else { for(const ch of v.slice(QK_PAD.length)) qkFeed(ch); } inp.value=QK_PAD; try{ inp.setSelectionRange(QK_PAD.length,QK_PAD.length); }catch{} qkDraw(); });
  inp.addEventListener('keydown',e=>{
    if(e.key==='Escape'){ e.preventDefault(); qkClose(); }
    else if(e.key==='Enter'){ e.preventDefault(); qkFeed('\n'); qkDraw(); }
    else if(e.key==='Tab'){ e.preventDefault(); qkFeed(' '); qkDraw(); }
    else if(e.key==='Backspace'&&inp.value===QK_PAD&&inp.selectionStart===QK_PAD.length){ /* lo maneja 'input' */ }
  });
  root.querySelector('.qk-box').addEventListener('click',()=>qkFocus());
  if(first) qkFeed(first); qkDraw(); qkFocus();
}
function qkFocus(){ const i=$('#qk-in'); if(i){ i.focus(); try{ i.setSelectionRange(QK_PAD.length,QK_PAD.length); }catch{} } }
function qkClose(){ QK.open=false; const r=$('#qk'); if(r) r.remove(); }
function qkMaxCh(){ return QK.b!=null?bbBooks()[QK.b][3].length:0; }
function qkMaxV(){ const c=+QK.ch; return QK.b!=null&&c?bbBooks()[QK.b][3][c-1].length:0; }
function qkAccept(b){ QK.b=b; QK.stage='chapter'; QK.ch=''; QK.vs=''; if(qkMaxCh()===1){ QK.ch='1'; QK.stage='verse'; } }
function qkFeed(ch){
  const isD=/\d/.test(ch), isL=/[\p{L}]/u.test(ch), isSep=ch===' '||ch==='\n'||ch===':'||ch==='.'||ch===',';
  if(QK.stage==='book'){
    if(isD){ if(!QK.txt&&!QK.num&&/[123]/.test(ch)){ QK.num=ch; return; } if(QK.txt){ const c=qkCands(); if(c.length){ qkAccept(c[0]); return qkFeed(ch); } } return; }
    if(isL){ const prev=QK.txt; QK.txt+=ch; const c=qkCands(); if(!c.length){ QK.txt=prev; return; } if(c.length===1) qkAccept(c[0]); return; }
    if(isSep&&QK.txt){ const c=qkCands(); if(c.length) qkAccept(c[0]); } return;
  }
  if(QK.stage==='chapter'){
    const max=qkMaxCh();
    if(isD){ const n=QK.ch+ch; if(+n<1||+n>max) return; QK.ch=n; if(+n*10>max){ QK.stage='verse'; } return; }
    if(isSep&&QK.ch){ if(ch==='\n'&&false) return; QK.stage='verse'; } return;
  }
  if(QK.stage==='verse'){
    const max=qkMaxV();
    if(isD){ const n=QK.vs+ch; if(+n<1||+n>max) return; QK.vs=n; if(+n*10>max) qkFinish(); return; }
    if(ch==='\n'||ch===' '){ qkFinish(); } return;
  }
}
function qkBack(){
  if(QK.stage==='verse'){ if(QK.vs){ QK.vs=QK.vs.slice(0,-1); return; } QK.stage='chapter'; QK.ch=QK.ch.slice(0,-1); if(qkMaxCh()===1){ QK.stage='book'; QK.b=null; QK.txt=QK.txt.slice(0,-1); } return; }
  if(QK.stage==='chapter'){ if(QK.ch){ QK.ch=QK.ch.slice(0,-1); return; } QK.stage='book'; QK.b=null; QK.txt=QK.txt.slice(0,-1); if(!QK.txt) QK.num=QK.num; return; }
  if(QK.txt) QK.txt=QK.txt.slice(0,-1); else QK.num='';
}
function qkFinish(){
  if(QK.b==null||!QK.ch) return; const c=+QK.ch-1, v=QK.vs?+QK.vs-1:null; qkClose();
  BB.pick=false; BB.q=''; bbGo(QK.b,c,v); setTimeout(()=>{ const L=$('#bb-vlist'); if(L&&v==null) L.scrollTop=0; },20);
}
function qkDraw(){
  if(!QK.open) return; const books=bbBooks();
  const fb=$('#qk-fb'), fc=$('#qk-fc'), fv=$('#qk-fv'); if(!fb) return;
  fb.classList.toggle('on',QK.stage==='book'); fc.classList.toggle('on',QK.stage==='chapter'); fv.classList.toggle('on',QK.stage==='verse');
  $('#qk-vb').textContent=QK.b!=null?books[QK.b][1]:((QK.num?QK.num+' ':'')+QK.txt.toUpperCase().slice(0,1)+QK.txt.slice(1));
  const c=QK.stage==='book'&&(QK.txt||QK.num)?qkCands():[];
  $('#qk-c').innerHTML=QK.stage==='book'?c.slice(0,10).map((i,k)=>`<button data-act="qk-book" data-b="${i}" class="${k===0?'top':''}">${esc(books[i][1])}</button>`).join('<span>–</span>'):'';
  $('#qk-vc').textContent=QK.ch; $('#qk-vv').textContent=QK.vs;
  const pv=$('#qk-prev');
  if(QK.b!=null&&QK.ch){ const cc=+QK.ch-1; pv.innerHTML=QK.vs?`<b>${esc(bbRef(QK.b,cc,+QK.vs-1))}</b> ${esc(books[QK.b][3][cc][+QK.vs-1]||'')}`:`${esc(books[QK.b][1])} ${QK.ch}: versículos 1 a ${books[QK.b][3][cc].length} · Enter abre el capítulo`; }
  else if(QK.b!=null) pv.textContent=`Capítulos 1 a ${books[QK.b][3].length}`;
  else pv.textContent=QK.stage==='book'&&!c.length&&!QK.txt?'Escribe las primeras letras del libro (para 1 Juan: 1 jua)':(c.length>1?'Sigue escribiendo, o Enter / espacio para el resaltado':'');
}
