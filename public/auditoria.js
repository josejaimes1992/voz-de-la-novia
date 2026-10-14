/* Voz de la Novia — Auditoría de la biblioteca de alabanzas.
   Revisa todo lo que ya está cargado y propone arreglos:
   1) Repetidas (misma letra o mismo título)   2) Dos canciones pegadas en una
   3) Autor escrito dentro de la letra          4) Sin tono (se calcula por los acordes) */
(function(){
const AU={open:false,res:null,tab:'dup',more:{},pick:null,busy:false};
const css=`.au-tabs{display:flex;gap:6px;flex-wrap:wrap}.au-tabs button{border:1px solid var(--line);background:var(--surface);color:inherit;border-radius:999px;padding:6px 12px;font:inherit;font-size:13px;font-weight:600;cursor:pointer}
.au-tabs button[aria-pressed="true"]{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}.au-tabs small{opacity:.75;margin-left:4px}
.au-list{display:grid;gap:8px}.au-it{border:1px solid var(--line);border-radius:10px;padding:10px 12px;background:var(--surface);display:grid;gap:6px}
.au-it h4{margin:0;font-size:15px;display:flex;gap:8px;flex-wrap:wrap;align-items:baseline}.au-it h4 a{color:inherit;text-decoration:underline;text-decoration-color:var(--line);cursor:pointer}
.au-it .why{font-size:13px;color:var(--muted)}.au-it .acts{display:flex;gap:6px;flex-wrap:wrap}.au-it .acts .btn{font-size:13px;padding:5px 10px}
.au-pair{display:grid;grid-template-columns:1fr 1fr;gap:8px}.au-pair>div{border:1px solid var(--line);border-radius:8px;padding:8px;background:var(--bg);font-size:13px;min-width:0}
.au-pair pre{white-space:pre-wrap;margin:6px 0 0;max-height:150px;overflow:auto;font:12px/1.4 var(--f-mono,monospace);color:var(--muted)}
.au-pick{display:grid;gap:2px;max-height:240px;overflow:auto;border:1px solid var(--line);border-radius:8px;padding:6px;background:var(--bg)}
.au-pick button{text-align:left;border:0;background:transparent;color:inherit;font:inherit;font-size:13px;padding:4px 8px;border-radius:6px;cursor:pointer}.au-pick button:hover{background:var(--accent-soft);color:var(--accent)}
.au-sum{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}.au-sum div{border:1px solid var(--line);border-radius:10px;padding:10px;background:var(--surface)}.au-sum b{font-size:22px;display:block}
.au-mem{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:8px}.au-m{border:1px solid var(--line);border-radius:8px;padding:8px;background:var(--bg);font-size:13px;min-width:0;display:grid;gap:3px;align-content:start}.au-m.glued{border-color:var(--danger)}.au-m a{color:inherit;cursor:pointer}
.au-m pre{white-space:pre-wrap;margin:4px 0 0;max-height:120px;overflow:auto;font:12px/1.4 var(--f-mono,monospace);color:var(--muted)}
.wb{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(300px,1fr);gap:10px;overflow-x:auto;padding-bottom:6px}.wb-c{border:1px solid var(--line);border-radius:10px;padding:10px;background:var(--surface);display:grid;gap:7px;align-content:start;min-width:0}
.wb-c.new{border-color:#2fa36b}.wb-c input,.wb-c textarea{border:1px solid var(--line);border-radius:6px;background:var(--bg);color:inherit;padding:5px 8px;font:inherit;min-width:0;width:100%;box-sizing:border-box}
.wb-c textarea{min-height:46vh;font:13px/1.45 var(--f-mono,monospace);resize:vertical}.wb-c .row3{display:grid;grid-template-columns:1fr 90px;gap:6px}.wb-c .acts{display:flex;gap:5px;flex-wrap:wrap}.wb-c .acts .btn{font-size:12px;padding:5px 8px}
.wb-c .fld{display:flex;gap:4px}.wb-c .fld button{border:1px solid var(--line);background:var(--bg);color:inherit;border-radius:999px;font:inherit;font-size:12px;padding:2px 9px;cursor:pointer}.wb-c .fld button[aria-pressed=true]{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
.wb-cut{border:1px dashed #2fa36b;border-radius:8px;padding:8px;display:grid;gap:6px;background:color-mix(in srgb,#2fa36b 8%,transparent)}
@media (max-width:620px){.au-pair{grid-template-columns:1fr}.wb{grid-auto-columns:88vw}}`;
function addCss(){ if(document.getElementById('au-css')) return; const s=document.createElement('style'); s.id='au-css'; s.textContent=css; document.head.appendChild(s); }
const groupOf=s=>s.versionOf||s.id;
const lyr=s=>lyricLines(s).map(l=>l.t);
const strip=b=>String(b||'').replace(/\[[^\]]*\]/g,'');

/* ---------- Revisión ---------- */
function scan(){
  const songs=[...S.songs.values()].filter(s=>s&&s.id&&!s.deleted);
  const sh=new Map(), size=new Map();
  for(const s of songs){ const set=lyricShingles(s); size.set(s.id,set.size); for(const t of set){ let a=sh.get(t); if(!a) sh.set(t,a=[]); a.push(s.id); } }
  const pair=new Map();
  for(const ids of sh.values()){ if(ids.length<2||ids.length>25) continue; for(let i=0;i<ids.length;i++) for(let j=i+1;j<ids.length;j++){ const k=ids[i]<ids[j]?ids[i]+'|'+ids[j]:ids[j]+'|'+ids[i]; pair.set(k,(pair.get(k)||0)+1); } }
  const byId=new Map(songs.map(s=>[s.id,s]));
  const dup=[], merged=[], seenMerge=new Set();
  const ok=(a,b)=>(a.notDup||[]).includes(b.id)||(b.notDup||[]).includes(a.id);
  for(const [k,n] of pair){ const [ia,ib]=k.split('|'); const A=byId.get(ia), B=byId.get(ib); if(!A||!B) continue; if(groupOf(A)===groupOf(B)||ok(A,B)) continue;
    const sa=size.get(ia), sb=size.get(ib), mn=Math.min(sa,sb), mx=Math.max(sa,sb); if(mn<4) continue; const sim=n/mn; if(sim<0.6) continue;
    if(mn/mx<0.55&&sim>=0.8){ const big=sa>sb?A:B, small=sa>sb?B:A; if(!(big.auditOk||[]).includes('merge')){ merged.push({s:big,why:`Contiene casi toda la letra de «${small.title}»: puede tener esa canción pegada.`,other:small}); seenMerge.add(big.id); } }
    else dup.push({a:A,b:B,sim}); }
  // mismo título, letra distinta pero sin letra para comparar
  const byTitle=new Map(); for(const s of songs){ const t=plainNorm(s.title||'').trim(); if(!t||t==='sin titulo') continue; let a=byTitle.get(t); if(!a) byTitle.set(t,a=[]); a.push(s); }
  for(const arr of byTitle.values()) if(arr.length>1) for(let i=0;i<arr.length;i++) for(let j=i+1;j<arr.length;j++){ const A=arr[i],B=arr[j]; if(groupOf(A)===groupOf(B)||ok(A,B)) continue; if(dup.some(d=>(d.a===A&&d.b===B)||(d.a===B&&d.b===A))) continue; if(Math.min(size.get(A.id),size.get(B.id))<4) dup.push({a:A,b:B,sim:0,title:true}); }
  dup.sort((x,y)=>y.sim-x.sim);
  /* Agrupar: cada canción aparece una sola vez, junto a todas sus parecidas */
  const par=new Map(); const F=x=>{ while(par.get(x)!==x){ par.set(x,par.get(par.get(x))); x=par.get(x); } return x; };
  for(const d of dup){ for(const z of [d.a.id,d.b.id]) if(!par.has(z)) par.set(z,z); par.set(F(d.a.id),F(d.b.id)); }
  const cl=new Map(); for(const d of dup){ const r=F(d.a.id); let c=cl.get(r); if(!c) cl.set(r,c={ids:new Set(),links:[]}); c.ids.add(d.a.id); c.ids.add(d.b.id); c.links.push(d); }
  const groups=[...cl.values()].map(c=>{ const members=[...c.ids].map(id=>byId.get(id)).filter(Boolean); const deg=new Map(); c.links.forEach(l=>{ deg.set(l.a.id,(deg.get(l.a.id)||0)+1); deg.set(l.b.id,(deg.get(l.b.id)||0)+1); });
    const linked=(x,y)=>c.links.some(l=>(l.a.id===x&&l.b.id===y)||(l.a.id===y&&l.b.id===x));
    const glued=new Set(); for(const m of members){ const nb=c.links.filter(l=>l.a.id===m.id||l.b.id===m.id).map(l=>l.a.id===m.id?l.b.id:l.a.id); for(let i=0;i<nb.length;i++) for(let j=i+1;j<nb.length;j++) if(!linked(nb[i],nb[j])&&size.get(m.id)>1.5*Math.max(size.get(nb[i]),size.get(nb[j]))) glued.add(m.id); }
    members.sort((x,y)=>(deg.get(y.id)||0)-(deg.get(x.id)||0));
    return {members,links:c.links,glued,best:Math.max(...c.links.map(l=>l.sim))}; }).sort((x,y)=>y.best-x.best);
  for(const s of songs){ if(seenMerge.has(s.id)||(s.auditOk||[]).includes('merge')) continue;
    const c={body:s.body||'',num:null}; const cands=ioSplitCands(c);
    const n=lyr(s).length;
    if(cands.length) merged.push({s,why:`Dentro de la letra aparece otro título: «${cands[0].label}».`,cands});
    else if(n>90) merged.push({s,why:`Es muy larga (${n} líneas de letra): puede tener otra canción pegada.`,cands:[]}); }
  const author=[]; for(const s of songs){ const t={body:s.body||'',author:''}; ioTakeAuthor(t); if(t.author&&t.body!==s.body) author.push({s,author:t.author,body:t.body}); }
  const key=[]; for(const s of songs){ if(s.key&&s.key.trim()) continue; const g=ioGuessKey((s.bodyPro&&s.bodyPro.trim())?s.bodyPro:s.body); if(g) key.push({s,key:keyCanon(g.idx,g.minor)}); }
  return {dup:groups,pairs:dup,merged,author,key,total:songs.length,at:Date.now()};
}

/* ---------- Guardar ---------- */
async function batch(writes){ for(let i=0;i<writes.length;i+=50){ await api('/api/batch',{method:'POST',body:JSON.stringify({writes:writes.slice(i,i+50)})}); } lastSig=''; await loadData(); }
const docOf=s=>{ const d=JSON.parse(JSON.stringify(s)); delete d.id; d.updatedAt=Date.now(); return d; };
async function save(writes,msg){ if(AU.busy) return; AU.busy=true; try{ await batch(writes); toast(msg); AU.res=scan(); draw(); }catch(e){ if(e.code===401) lostAuth(); else toast(e.code===403?'No tienes permiso para cambiar algunas canciones.':'No se pudo guardar. Revisa el internet.'); } AU.busy=false; }
function splitWrites(s,line){
  const L=String(s.body||'').split('\n'); if(!(line>0&&line<L.length)) return null;
  const before=L.slice(0,line).join('\n').replace(/\s+$/,''), after=L.slice(line);
  const head=after[0].replace(/\[[^\]]*\]/g,'').trim(); const m=/^\s*(\d{1,4})\s*[.)\-–]?\s+([^\d\[].{1,90}?)\s*$/.exec(head);
  let title; if(m&&/\p{L}{3}/u.test(m[2])){ title=m[2].trim(); after.shift(); } else title=head.replace(/^#\s*/,'');
  const body2=after.join('\n').replace(/^\s*\n+/,'').trim(); if(!before.trim()||!body2) return null;
  const nw={title:niceCase(title.slice(0,90))||'Sin título',author:'',key:'',category:s.category||'',bpm:'',capo:0,body:body2,notes:`Separada de «${s.title}» en la auditoría.`,updatedAt:Date.now()};
  ioTakeAuthor(nw); const g=ioGuessKey(body2); if(g) nw.key=keyCanon(g.idx,g.minor);
  const d=docOf(s); d.body=before;
  return [{col:'songs',id:s.id,data:d},{col:'songs',id:newId('c'),data:nw}];
}

/* ---------- Pantalla ---------- */
const TABS=[['dup','Repetidas'],['merged','Pegadas'],['author','Autor en la letra'],['key','Sin tono']];
function link(s){ return `<a data-act="open-song" data-id="${esc(s.id)}">${esc(s.title||'Sin título')}</a>`; }
function snip(s){ return esc(lyr(s).slice(0,6).join('\n')); }
function itemHtml(t,x,i){
  if(t==='dup'){ const M=x.members; const sim=(a,b)=>{ const l=x.links.find(l=>(l.a===a&&l.b===b)||(l.a===b&&l.b===a)); return l?(l.title&&!l.sim?'mismo título':Math.round(l.sim*100)+'%'):''; };
    return `<div class="au-it"><h4>${M.length} canciones parecidas</h4>
    <div class="au-mem">${M.map((m,k)=>`<div class="au-m${x.glued.has(m.id)?' glued':''}"><div><b>${link(m)}</b> ${m.key?`<small>${esc(m.key)}</small>`:''} ${m.bodyPro&&m.bodyPro.trim()?'<span class="pill ok">Original</span>':''} ${(m.audio||[]).length?'<span class="pill">🎧</span>':''}</div>
      <small class="why">${k?`${sim(M[0],m)||sim(...M.filter(o=>o!==m&&sim(o,m)).slice(0,1),m)||''} igual`:'principal'}${x.glued.has(m.id)?' · ⚠ parece tener canciones pegadas':''}</small><pre>${snip(m)}</pre></div>`).join('')}</div>
    <div class="acts"><button class="btn pri" data-act="au-wb" data-i="${i}">🔎 Revisar y editar lado a lado</button><button class="btn" data-act="au-ver" data-i="${i}" title="La principal queda y las demás pasan a ser sus versiones">🔗 Unir todas como versiones</button><button class="btn ghost" data-act="au-notdup" data-i="${i}">No son la misma</button></div></div>`; }
  if(t==='merged'){ const s=x.s; return `<div class="au-it"><h4>${link(s)} ${s.key?`<small>${esc(s.key)}</small>`:''}</h4><div class="why">${esc(x.why)}</div>
    <div class="acts">${(x.cands||[]).map(c=>`<button class="btn" data-act="au-split" data-id="${esc(s.id)}" data-l="${c.l}">✂ Separar: crear «${esc(c.label)}» aparte</button>`).join('')}<button class="btn" data-act="au-pick" data-id="${esc(s.id)}">${AU.pick===s.id?'Cancelar':'✂ Elegir dónde separar…'}</button><button class="btn pri" data-act="au-wb1" data-id="${esc(s.id)}"${x.other?` data-o="${esc(x.other.id)}"`:''}>🔎 Revisar y editar</button><button class="btn ghost" data-act="au-okmerge" data-id="${esc(s.id)}">Está bien así</button></div>
    ${AU.pick===s.id?`<div class="au-pick"><small style="color:var(--muted);padding:2px 4px">Toca la línea donde <b>empieza la otra canción</b>:</small>${String(s.body||'').split('\n').map((l,n)=>n>0&&strip(l).trim()?`<button data-act="au-split" data-id="${esc(s.id)}" data-l="${n}">${esc(strip(l).trim().slice(0,90))}</button>`:'').join('')}</div>`:''}</div>`; }
  if(t==='author'){ return `<div class="au-it"><h4>${link(x.s)}</h4><div class="why">En la letra dice el autor: <b>${esc(x.author)}</b>${x.s.author?` (la ficha tiene «${esc(x.s.author)}»)`:''}</div><div class="acts"><button class="btn" data-act="au-auth" data-id="${esc(x.s.id)}">Pasar «${esc(x.author)}» a la ficha y quitarlo de la letra</button></div></div>`; }
  if(t==='key'){ return `<div class="au-it"><h4>${link(x.s)}</h4><div class="why">No tiene tono. Por sus acordes está en <b>${esc(keyLong(parseKey(x.key).idx,parseKey(x.key).minor))}</b> (${esc(x.key)}).</div><div class="acts"><button class="btn" data-act="au-key" data-id="${esc(x.s.id)}">Poner ${esc(x.key)}</button></div></div>`; }
  return '';
}
function draw(){
  const root=document.getElementById('au-body'); if(!root) return; const r=AU.res;
  if(!r){ root.innerHTML='<p style="color:var(--muted)">Revisando todas las alabanzas…</p>'; return; }
  const list=r[AU.tab]||[]; const lim=AU.more[AU.tab]||40;
  const bulk=AU.tab==='author'&&list.length?`<button class="btn pri" data-act="au-auth-all">${list.length===1?'Arreglarla':`Arreglar las ${list.length}`}</button>`:AU.tab==='key'&&list.length?`<button class="btn pri" data-act="au-key-all">${list.length===1?'Ponerle el tono':`Poner el tono a las ${list.length}`}</button>`:'';
  const help={dup:'Canciones con la misma letra o el mismo título. Únelas como versiones, borra la que sobra o márcalas como distintas.',merged:'Canciones que parecen traer otra canción pegada. Sepáralas en 2 con un toque.',author:'La letra trae una línea como «Intérprete: …» o «Autor: …». Se pasa a la ficha del autor y se quita de la letra.',key:'Alabanzas sin tono: lo calculé por la armonía de sus acordes (el primero y el último pesan más). Revisa y aplica.'}[AU.tab];
  root.innerHTML=`<div class="au-sum">${TABS.map(([k,t])=>`<div><b>${r[k].length}</b>${t}</div>`).join('')}</div>
    <div class="au-tabs" role="tablist">${TABS.map(([k,t])=>`<button data-act="au-tab" data-t="${k}" aria-pressed="${AU.tab===k}">${t}<small>${r[k].length}</small></button>`).join('')}<button data-act="au-rescan" style="margin-left:auto">↻ Revisar de nuevo</button></div>
    <p style="margin:0;font-size:13px;color:var(--muted)">${help}</p>${bulk?`<div>${bulk}</div>`:''}
    <div class="au-list">${list.length?list.slice(0,lim).map((x,i)=>itemHtml(AU.tab,x,i)).join(''):'<p style="color:var(--muted)">✓ Nada que arreglar aquí.</p>'}</div>
    ${list.length>lim?`<button class="btn" data-act="au-more">Ver ${Math.min(40,list.length-lim)} más (quedan ${list.length-lim})</button>`:''}`;
}
window.openAudit=function(){
  if(!S.canWrite){ toast('Ingresa con tu usuario para usar la auditoría.'); return; }
  addCss(); AU.open=true; AU.res=null; AU.pick=null;
  $('#modal-root').innerHTML=`<div class="scrim" data-act="close-modal"><div class="modal" role="dialog" aria-label="Auditoría de alabanzas" data-stop style="width:min(860px,100%)">
    <header><h3>🩺 Auditoría de alabanzas</h3><button class="btn ghost" data-act="close-modal" aria-label="Cerrar">${ICON.x}</button></header>
    <div class="body" id="au-body" style="display:grid;gap:12px"></div></div></div>`;
  draw(); setTimeout(()=>{ try{ AU.res=scan(); }catch(e){ console.error(e); AU.res={dup:[],merged:[],author:[],key:[],total:0}; toast('No se pudo revisar todo.'); } if(!AU.res.dup.length&&!AU.res.merged.length&&AU.tab==='dup') AU.tab=AU.res.author.length?'author':AU.res.key.length?'key':'dup'; draw(); },30);
};
document.addEventListener('click',ev=>{ const el=ev.target.closest('[data-act^="au-"]'); if(!el) return; const a=el.dataset.act, d=el.dataset, r=AU.res; ev.preventDefault();
  const S1=id=>S.songs.get(id);
  if(a==='au-tab'){ AU.tab=d.t; AU.pick=null; draw(); }
  else if(a==='au-more'){ AU.more[AU.tab]=(AU.more[AU.tab]||40)+40; draw(); }
  else if(a==='au-rescan'){ AU.res=null; draw(); setTimeout(()=>{ AU.res=scan(); draw(); },30); }
  else if(a==='au-open'){ closeModal(); V.songId=d.id; go('song'); }
  else if(a==='au-pick'){ AU.pick=AU.pick===d.id?null:d.id; draw(); }
  else if(a==='au-split'){ const s=S1(d.id); const w=s&&splitWrites(s,+d.l); if(!w) return toast('No se pudo separar en esa línea.'); AU.pick=null; save(w,`Separadas: «${s.title}» y «${w[1].data.title}».`); }
  else if(a==='au-okmerge'){ const s=S1(d.id); if(!s) return; const x=docOf(s); x.auditOk=[...new Set([...(s.auditOk||[]),'merge'])]; save([{col:'songs',id:s.id,data:x}],'Listo, no la vuelvo a marcar.'); }
  else if(a==='au-notdup'){ const x=r.dup[+d.i]; if(!x) return; const w=x.members.map(m=>{ const o=docOf(m); o.notDup=[...new Set([...(m.notDup||[]),...x.members.filter(n=>n!==m).map(n=>n.id)])]; return {col:'songs',id:m.id,data:o}; }); save(w,'Marcadas como canciones distintas.'); }
  else if(a==='au-ver'){ const x=r.dup[+d.i]; if(!x) return; const score=m=>((m.audio||[]).length?100:0)+(m.bodyPro&&m.bodyPro.trim()?10:0)+(/\[/.test(m.body||'')?5:0); const main=[...x.members].sort((p,q)=>score(q)-score(p))[0]; const g=groupOf(main);
    const w=x.members.filter(m=>m!==main&&groupOf(m)!==g).map(m=>{ const o=docOf(m); o.versionOf=g; return {col:'songs',id:m.id,data:o}; }); save(w,`Quedaron como versiones de «${main.title}».`); }
  else if(a==='au-wb'){ const x=r.dup[+d.i]; if(x) wbOpen(x.members.map(m=>m.id)); }
  else if(a==='au-wb1'){ wbOpen([d.id,...(d.o?[d.o]:[])]); }
  else if(a==='au-del'){ const s=S1(d.id); if(!s) return; if(el.dataset.sure!=='1'){ el.dataset.sure='1'; el.textContent='¿Seguro? Toca otra vez'; el.classList.add('danger'); return; } (async()=>{ await removeDoc('songs',s.id); toast(`«${s.title}» a la papelera (se puede rescatar 60 días).`); AU.res=scan(); draw(); })(); }
  else if(a==='au-auth'){ const x=r.author.find(y=>y.s.id===d.id); if(!x) return; const o=docOf(x.s); o.body=x.body; if(!o.author) o.author=x.author; if(o.bodyPro){ const t={body:o.bodyPro,author:''}; ioTakeAuthor(t); o.bodyPro=t.body; } save([{col:'songs',id:x.s.id,data:o}],`Autor: ${x.author}.`); }
  else if(a==='au-auth-all'){ const w=r.author.map(x=>{ const o=docOf(x.s); o.body=x.body; if(!o.author) o.author=x.author; if(o.bodyPro){ const t={body:o.bodyPro,author:''}; ioTakeAuthor(t); o.bodyPro=t.body; } return {col:'songs',id:x.s.id,data:o}; }); save(w,`Listo: ${w.length} autores pasados a la ficha.`); }
  else if(a==='au-key'){ const x=r.key.find(y=>y.s.id===d.id); if(!x) return; const o=docOf(x.s); o.key=x.key; save([{col:'songs',id:x.s.id,data:o}],`Tono ${x.key} para «${x.s.title}».`); }
  else if(a==='au-key-all'){ const w=r.key.map(x=>{ const o=docOf(x.s); o.key=x.key; return {col:'songs',id:x.s.id,data:o}; }); save(w,`Listo: ${w.length} alabanzas con tono.`); }
});
document.addEventListener('click',ev=>{ const el=ev.target.closest('[data-act="open-audit"]'); if(!el) return; ev.preventDefault(); const det=el.closest('details'); if(det) det.open=false; openAudit(); });

/* ---------- Mesa de revisión: canciones lado a lado, editables; crear canción nueva con un texto seleccionado ---------- */
const WB={ids:[],draft:{},field:{},cut:null,fresh:new Set()};
function wbField(s){ return WB.field[s.id]||((s.body&&s.body.trim())?'body':'bodyPro'); }
function wbVal(s,k){ const d=WB.draft[s.id]; if(d&&d[k]!=null) return d[k]; return k==='text'?(s[wbField(s)]||''):(s[k]||''); }
function wbDraw(){
  const root=document.getElementById('au-body'); if(!root) return;
  const songs=WB.ids.map(id=>S.songs.get(id)).filter(Boolean);
  root.innerHTML=`<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button class="btn" data-act="wb-back">← Volver a la auditoría</button><button class="btn pri" data-act="wb-done" title="Estas canciones no vuelven a salir juntas en la auditoría">✓ Ya las revisé</button><span style="font-size:13px;color:var(--muted)">Edita cualquiera y guarda. Para separar una canción pegada: <b>selecciona sus líneas</b> en la letra y toca <b>✂ Crear canción nueva</b>.</span></div>
    <div class="wb">${songs.map(s=>{ const f=wbField(s), hasPro=!!(s.bodyPro&&s.bodyPro.trim()), hasB=!!(s.body&&s.body.trim()); const others=songs.filter(o=>o!==s);
      return `<div class="wb-c${WB.fresh.has(s.id)?' new':''}" data-id="${esc(s.id)}">
        ${WB.fresh.has(s.id)?'<small style="color:#2fa36b;font-weight:700">✓ Canción nueva</small>':''}
        <input data-wb="title" value="${esc(wbVal(s,'title'))}" aria-label="Título" style="font-weight:700">
        <div class="row3"><input data-wb="author" value="${esc(wbVal(s,'author'))}" placeholder="Autor" aria-label="Autor"><input data-wb="key" value="${esc(wbVal(s,'key'))}" placeholder="Tono" aria-label="Tono"></div>
        ${hasPro&&hasB?`<div class="fld"><button data-act="wb-fld" data-f="body" aria-pressed="${f==='body'}">Básica</button><button data-act="wb-fld" data-f="bodyPro" aria-pressed="${f==='bodyPro'}">Original</button></div>`:''}
        <textarea data-wb="text" spellcheck="false">${esc(wbVal(s,'text'))}</textarea>
        ${WB.cut&&WB.cut.id===s.id?`<div class="wb-cut"><b style="font-size:13px">Nueva canción con ${WB.cut.lines} líneas seleccionadas</b><input id="wb-cut-t" value="${esc(WB.cut.title)}" placeholder="Título de la nueva canción"><label style="font-size:13px;display:flex;gap:6px;align-items:center"><input type="checkbox" id="wb-cut-rm" checked style="width:auto"> Quitar esas líneas de «${esc(s.title)}»</label><div class="acts"><button class="btn pri" data-act="wb-cut-go">Crear</button><button class="btn ghost" data-act="wb-cut-no">Cancelar</button></div></div>`:''}
        ${others.length?`<button class="btn" data-act="wb-keep" style="border-color:var(--accent);font-weight:700" title="Las demás se borran (o quedan como versión si tienen audio o están en un programa)">★ Quedarme con esta</button>`:''}
        <div class="acts"><button class="btn pri" data-act="wb-save">💾 Guardar</button><button class="btn" data-act="wb-cut">✂ Crear canción nueva</button>
          ${others.length?`<select data-wb="ver" style="font-size:12px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:inherit;padding:4px"><option value="">🔗 Hacer versión de…</option>${others.map(o=>`<option value="${esc(o.id)}">${esc(o.title)}</option>`).join('')}</select>`:''}
          ${others.length?`<button class="btn ghost" data-act="wb-notdup" title="No es la misma que las demás">≠ Distinta</button>`:''}
          ${S.isAdmin?`<button class="btn ghost" data-act="wb-del">🗑 Borrar</button>`:''}<button class="btn ghost" data-act="open-song" data-id="${esc(s.id)}">Abrir</button></div></div>`; }).join('')}</div>`;
}
function wbOpen(ids){ WB.ids=[...new Set(ids)]; WB.draft={}; WB.field={}; WB.cut=null; WB.fresh=new Set(); AU.wb=true; wbDraw(); const m=document.querySelector('#modal-root .modal'); if(m) m.style.width='min(1400px,100%)'; }
function wbBack(){ AU.wb=false; const m=document.querySelector('#modal-root .modal'); if(m) m.style.width='min(860px,100%)'; AU.res=scan(); draw(); }
async function wbWrite(writes,msg){ try{ await batch(writes); toast(msg); return true; }catch(e){ if(e.code===401) lostAuth(); else toast(e.code===403?'No tienes permiso para cambiar esta canción.':'No se pudo guardar. Revisa el internet.'); return false; } }
document.addEventListener('input',e=>{ const t=e.target; const k=t.dataset&&t.dataset.wb; if(!k||k==='ver') return; const c=t.closest('.wb-c'); if(!c) return; const id=c.dataset.id; (WB.draft[id]=WB.draft[id]||{})[k]=t.value; });
document.addEventListener('change',async e=>{ const t=e.target; if(!(t.dataset&&t.dataset.wb==='ver')||!t.value) return; const c=t.closest('.wb-c'); const s=S.songs.get(c.dataset.id), main=S.songs.get(t.value); if(!s||!main) return;
  const o=docOf(s); o.versionOf=groupOf(main); if(await wbWrite([{col:'songs',id:s.id,data:o}],`«${s.title}» ahora es versión de «${main.title}».`)) wbDraw(); });
document.addEventListener('click',async e=>{ const el=e.target.closest('[data-act^="wb-"]'); if(!el) return; e.preventDefault(); const a=el.dataset.act; const c=el.closest('.wb-c'); const s=c&&S.songs.get(c.dataset.id);
  if(a==='wb-back') return wbBack();
  if(a==='wb-keep'&&s){ if(el.dataset.sure!=='1'){ el.dataset.sure='1'; el.textContent='★ ¿Seguro? Toca otra vez'; return; }
    const inProg=new Set(); for(const p of (S.programs?S.programs.values():[])) for(const it of (p.items||[])) if(it&&it.songId) inProg.add(it.songId);
    const main=docOf(s); const d=WB.draft[s.id]||{}; if(d.title!=null&&d.title.trim()) main.title=d.title.trim(); if(d.author!=null) main.author=d.author.trim(); if(d.key!=null) main.key=d.key.trim(); if(d.text!=null) main[wbField(s)]=d.text.replace(/\s+$/,''); delete main.versionOf;
    const writes=[{col:'songs',id:s.id,data:main}], del=[]; let asVer=0;
    for(const id of WB.ids){ if(id===s.id) continue; const x=S.songs.get(id); if(!x) continue;
      if(S.isAdmin&&!(x.audio||[]).length&&!inProg.has(id)) del.push(id);
      else { const o=docOf(x); o.versionOf=s.id; writes.push({col:'songs',id,data:o}); asVer++; } }
    for(const y of S.songs.values()) if(y.versionOf&&del.includes(y.versionOf)&&!del.includes(y.id)&&y.id!==s.id&&!writes.some(w=>w.id===y.id)){ const o=docOf(y); o.versionOf=s.id; writes.push({col:'songs',id:y.id,data:o}); asVer++; }
    try{ await batch(writes); if(del.length) await api('/api/trash',{method:'POST',body:JSON.stringify({ids:del,keepAudio:true})}); lastSig=''; await loadData();
      toast(`Te quedaste con «${main.title}»${del.length?` · ${del.length} a la Papelera`:''}${asVer?` · ${asVer} como versión (tienen audio, están en un programa o tienen versiones)`:''}.`); WB.draft={}; wbBack(); }
    catch(err){ if(err.code===401) lostAuth(); else toast('No se pudo completar. Revisa el internet.'); }
    return; }
  if(a==='wb-done'){ const ids=WB.ids.filter(id=>S.songs.has(id)); const w=ids.map(id=>{ const x=S.songs.get(id); const o=docOf(x); const d=WB.draft[id]||{}; if(d.title!=null&&d.title.trim()) o.title=d.title.trim(); if(d.author!=null) o.author=d.author.trim(); if(d.key!=null) o.key=d.key.trim(); if(d.text!=null) o[wbField(x)]=d.text.replace(/\s+$/,'');
      o.notDup=[...new Set([...(x.notDup||[]),...ids.filter(j=>j!==id&&groupOf(S.songs.get(j))!==groupOf(x))])]; o.auditOk=[...new Set([...(x.auditOk||[]),'merge'])]; return {col:'songs',id,data:o}; });
    if(await wbWrite(w,'Listo: ya no vuelven a salir en la auditoría.')){ WB.draft={}; wbBack(); } return; }
  if(a==='wb-fld'&&s){ const d=WB.draft[s.id]; if(d) delete d.text; WB.field[s.id]=el.dataset.f; return wbDraw(); }
  if(a==='wb-save'&&s){ const d=WB.draft[s.id]||{}; const o=docOf(s); if(d.title!=null&&d.title.trim()) o.title=d.title.trim(); if(d.author!=null) o.author=d.author.trim(); if(d.key!=null) o.key=d.key.trim(); if(d.text!=null) o[wbField(s)]=d.text.replace(/\s+$/,'');
    if(await wbWrite([{col:'songs',id:s.id,data:o}],`Guardada «${o.title}».`)){ delete WB.draft[s.id]; wbDraw(); } return; }
  if(a==='wb-cut'&&s){ const ta=c.querySelector('textarea'); let a0=ta.selectionStart, b0=ta.selectionEnd; const v=ta.value; if(a0===b0){ toast('Primero selecciona en la letra las líneas de la otra canción.'); ta.focus(); return; }
    a0=v.lastIndexOf('\n',a0-1)+1; const nl=v.indexOf('\n',b0-1); b0=nl<0?v.length:nl; const sel=v.slice(a0,b0); const L=sel.split('\n').filter(l=>l.trim());
    const first=(L.find(l=>!/^\s*#/.test(l))||'').replace(/\[[^\]]*\]/g,'').replace(/^\s*(t[ií]tulo\s*:|\d{1,4}\s*[.)\-–]?)\s*/i,'').trim();
    const tl=L.find(l=>/^\s*t[ií]tulo\s*:/i.test(l)); WB.cut={id:s.id,a:a0,b:b0,text:sel,full:v,lines:L.length,title:niceCase((tl?tl.replace(/^\s*t[ií]tulo\s*:\s*/i,''):first).slice(0,80))||'Sin título'}; return wbDraw(); }
  if(a==='wb-cut-no'){ WB.cut=null; return wbDraw(); }
  if(a==='wb-cut-go'){ const X=WB.cut; const src=X&&S.songs.get(X.id); if(!src) return; const title=(document.getElementById('wb-cut-t').value||'').trim()||'Sin título'; const rm=document.getElementById('wb-cut-rm').checked;
    let body=X.text.split('\n').filter(l=>!/^\s*t[ií]tulo\s*:/i.test(l)).join('\n').replace(/^\s*\n+/,'').trim();
    const nw={title,author:'',key:'',category:src.category||'',bpm:'',capo:0,body,notes:`Separada de «${src.title}» en la auditoría.`,updatedAt:Date.now()}; ioTakeAuthor(nw); const g=ioGuessKey(nw.body); if(g) nw.key=keyCanon(g.idx,g.minor);
    const nid=newId('c'); const writes=[{col:'songs',id:nid,data:nw}];
    nw.notDup=[src.id]; { const o0=docOf(src); o0.auditOk=[...new Set([...(src.auditOk||[]),'merge'])]; o0.notDup=[...new Set([...(src.notDup||[]),nid])]; if(!rm) writes.push({col:'songs',id:src.id,data:o0}); }
    if(rm){ const o=docOf(src); o.auditOk=[...new Set([...(src.auditOk||[]),'merge'])]; o.notDup=[...new Set([...(src.notDup||[]),nid])]; const rest=(X.full.slice(0,X.a)+X.full.slice(X.b)).replace(/\n{3,}/g,'\n\n').trim(); o[wbField(src)]=rest; writes.push({col:'songs',id:src.id,data:o}); }
    if(await wbWrite(writes,`Creada «${title}»${rm?` y quitada de «${src.title}»`:''}.`)){ WB.cut=null; if(rm&&WB.draft[src.id]) delete WB.draft[src.id].text; WB.fresh.add(nid); WB.ids.splice(WB.ids.indexOf(src.id)+1,0,nid); wbDraw(); } return; }
  if(a==='wb-notdup'&&s){ const others=WB.ids.filter(id=>id!==s.id); const o=docOf(s); o.notDup=[...new Set([...(s.notDup||[]),...others])]; if(await wbWrite([{col:'songs',id:s.id,data:o}],`«${s.title}» marcada como distinta.`)) wbDraw(); return; }
  if(a==='wb-del'&&s){ if(el.dataset.sure!=='1'){ el.dataset.sure='1'; el.textContent='¿Seguro? Toca otra vez'; el.classList.add('danger'); return; } await removeDoc('songs',s.id); toast(`«${s.title}» a la papelera (se puede rescatar 60 días).`); WB.ids=WB.ids.filter(id=>id!==s.id); lastSig=''; await loadData(); if(WB.ids.length) wbDraw(); else wbBack(); return; }
});

/* ---------- Borrar en bloque (solo administrador). Nunca borra las que tienen audio. ---------- */
const BB={keepGroup:true,keepProg:true,onlyImported:false,busy:false};
function bulkPlan(){
  const songs=[...S.songs.values()].filter(s=>s&&s.id);
  const hasAud=s=>Array.isArray(s.audio)&&s.audio.length>0;
  const audioGroups=new Set(songs.filter(hasAud).map(groupOf));
  const inProg=new Set(); for(const p of (S.programs?S.programs.values():[])) for(const it of (p.items||[])) if(it&&it.songId) inProg.add(it.songId);
  const keep={audio:0,group:0,prog:0,manual:0}, del=[];
  for(const s of songs){
    if(hasAud(s)){ keep.audio++; continue; }
    if(BB.keepGroup&&audioGroups.has(groupOf(s))){ keep.group++; continue; }
    if(BB.keepProg&&inProg.has(s.id)){ keep.prog++; continue; }
    if(BB.onlyImported&&!/Importad[oa] de|Separada/i.test(s.notes||'')){ keep.manual++; continue; }
    del.push(s);
  }
  return {total:songs.length,keep,del};
}
function bulkDraw(){
  const root=document.getElementById('bb-body'); if(!root) return; const P=bulkPlan(); const k=P.keep; const nk=k.audio+k.group+k.prog+k.manual;
  root.innerHTML=`<div class="au-sum"><div><b>${P.total}</b>Alabanzas en total</div><div><b style="color:#2fa36b">${nk}</b>Se conservan</div><div><b style="color:var(--danger)">${P.del.length}</b>Se borran</div></div>
    <div class="au-it"><b>Se conservan siempre</b>
      <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" checked disabled> 🎧 Las que tienen audio <small style="color:var(--muted)">(${k.audio})</small></label>
      <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="bb-g" ${BB.keepGroup?'checked':''}> Las otras versiones de una alabanza que tiene audio <small style="color:var(--muted)">(${k.group})</small></label>
      <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="bb-p" ${BB.keepProg?'checked':''}> Las que están en tus programas <small style="color:var(--muted)">(${k.prog})</small></label>
      <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="bb-i" ${BB.onlyImported?'checked':''}> Borrar solo las que se subieron desde archivos (PDF/Word) y conservar las que se crearon a mano <small style="color:var(--muted)">(${k.manual} a mano)</small></label></div>
    ${P.del.length?`<details class="au-it"><summary style="cursor:pointer">Ver las ${P.del.length} que se borran</summary><div style="max-height:220px;overflow:auto;font-size:13px;columns:2;column-gap:18px">${P.del.slice(0,800).map(s=>`<div>${esc(s.title||'Sin título')}${s.key?` <small style="color:var(--muted)">${esc(s.key)}</small>`:''}</div>`).join('')}${P.del.length>800?'<div>…</div>':''}</div></details>
    <div class="au-it" style="border-color:var(--danger)"><b style="color:var(--danger)">Confirmar</b><span style="font-size:13px;color:var(--muted)">Van a la <b>Papelera</b> y puedes rescatarlas durante 60 días. Escribe <b>BORRAR</b> para confirmar.</span>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><input id="bb-ok" class="input" placeholder="BORRAR" autocomplete="off" style="flex:1;min-width:140px"><button class="btn danger" data-act="bb-go" ${BB.busy?'disabled':''}>🗑 Borrar ${P.del.length}</button></div><span id="bb-prog" style="font-size:13px;color:var(--muted)"></span></div>`:'<p style="color:var(--muted)">No hay nada que borrar con estas opciones.</p>'}`;
  const on=(id,fn)=>{ const el=document.getElementById(id); if(el) el.addEventListener('change',fn); };
  on('bb-g',e=>{ BB.keepGroup=e.target.checked; bulkDraw(); }); on('bb-p',e=>{ BB.keepProg=e.target.checked; bulkDraw(); }); on('bb-i',e=>{ BB.onlyImported=e.target.checked; bulkDraw(); });
}
window.openBulkDelete=function(){
  if(!S.isAdmin){ toast('Solo el administrador puede borrar en bloque.'); return; }
  addCss(); BB.busy=false;
  $('#modal-root').innerHTML=`<div class="scrim" data-act="close-modal"><div class="modal" role="dialog" aria-label="Borrar en bloque" data-stop style="width:min(720px,100%)">
    <header><h3>🗑 Borrar alabanzas en bloque</h3><button class="btn ghost" data-act="close-modal" aria-label="Cerrar">${ICON.x}</button></header>
    <div class="body" id="bb-body" style="display:grid;gap:12px"></div></div></div>`;
  bulkDraw();
};
document.addEventListener('click',async ev=>{ const el=ev.target.closest('[data-act="bb-go"],[data-act="open-bulkdel"]'); if(!el) return; ev.preventDefault();
  if(el.dataset.act==='open-bulkdel'){ const det=el.closest('details'); if(det) det.open=false; openBulkDelete(); return; }
  if(BB.busy) return; const inp=document.getElementById('bb-ok'); if(!inp||inp.value.trim().toUpperCase()!=='BORRAR'){ toast('Escribe BORRAR para confirmar.'); if(inp) inp.focus(); return; }
  const ids=bulkPlan().del.map(s=>s.id); BB.busy=true; el.disabled=true; const prog=document.getElementById('bb-prog'); let done=0, kept=0;
  try{ for(let i=0;i<ids.length;i+=200){ const r=await api('/api/trash',{method:'POST',body:JSON.stringify({ids:ids.slice(i,i+200),keepAudio:true})}); done+=r.count||0; kept+=r.kept||0; if(prog) prog.textContent=`Borradas ${done} de ${ids.length}…`; } }
  catch(e){ BB.busy=false; if(e.code===401) lostAuth(); else toast(`Se borraron ${done}; el resto falló. Inténtalo de nuevo.`); lastSig=''; await loadData(); bulkDraw(); return; }
  BB.busy=false; lastSig=''; await loadData(); closeModal(); render(); toast(`Listo: ${done} alabanzas a la Papelera${kept?` (${kept} con audio se conservaron)`:''}. Puedes rescatarlas 60 días.`);
});
})();
