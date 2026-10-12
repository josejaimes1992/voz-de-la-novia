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
@media (max-width:620px){.au-pair{grid-template-columns:1fr}}`;
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
  for(const s of songs){ if(seenMerge.has(s.id)||(s.auditOk||[]).includes('merge')) continue;
    const c={body:s.body||'',num:null}; const cands=ioSplitCands(c);
    const n=lyr(s).length;
    if(cands.length) merged.push({s,why:`Dentro de la letra aparece otro título: «${cands[0].label}».`,cands});
    else if(n>90) merged.push({s,why:`Es muy larga (${n} líneas de letra): puede tener otra canción pegada.`,cands:[]}); }
  const author=[]; for(const s of songs){ const t={body:s.body||'',author:''}; ioTakeAuthor(t); if(t.author&&t.body!==s.body) author.push({s,author:t.author,body:t.body}); }
  const key=[]; for(const s of songs){ if(s.key&&s.key.trim()) continue; const g=ioGuessKey((s.bodyPro&&s.bodyPro.trim())?s.bodyPro:s.body); if(g) key.push({s,key:keyCanon(g.idx,g.minor)}); }
  return {dup,merged,author,key,total:songs.length,at:Date.now()};
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
  if(t==='dup'){ const A=x.a,B=x.b; return `<div class="au-it"><h4>${link(A)} <span style="color:var(--muted)">↔</span> ${link(B)}</h4>
    <div class="why">${x.title?'Mismo título.':`La letra es ${Math.round(x.sim*100)}% igual.`}</div>
    <div class="au-pair"><div><b>${esc(A.title)}</b> ${A.key?`· ${esc(A.key)}`:''} ${A.bodyPro&&A.bodyPro.trim()?'· <span class="pill ok">Original</span>':''}<pre>${snip(A)}</pre></div><div><b>${esc(B.title)}</b> ${B.key?`· ${esc(B.key)}`:''} ${B.bodyPro&&B.bodyPro.trim()?'· <span class="pill ok">Original</span>':''}<pre>${snip(B)}</pre></div></div>
    <div class="acts"><button class="btn" data-act="au-ver" data-i="${i}" title="Quedan unidas: la segunda pasa a ser otra versión de la primera">🔗 Son versiones de la misma</button>${S.isAdmin?`<button class="btn" data-act="au-del" data-id="${esc(B.id)}">🗑 Borrar «${esc(B.title.slice(0,28))}»</button><button class="btn" data-act="au-del" data-id="${esc(A.id)}">🗑 Borrar «${esc(A.title.slice(0,28))}»</button>`:''}<button class="btn ghost" data-act="au-notdup" data-i="${i}">No son la misma</button></div></div>`; }
  if(t==='merged'){ const s=x.s; return `<div class="au-it"><h4>${link(s)} ${s.key?`<small>${esc(s.key)}</small>`:''}</h4><div class="why">${esc(x.why)}</div>
    <div class="acts">${(x.cands||[]).map(c=>`<button class="btn" data-act="au-split" data-id="${esc(s.id)}" data-l="${c.l}">✂ Separar: crear «${esc(c.label)}» aparte</button>`).join('')}<button class="btn" data-act="au-pick" data-id="${esc(s.id)}">${AU.pick===s.id?'Cancelar':'✂ Elegir dónde separar…'}</button><button class="btn ghost" data-act="au-okmerge" data-id="${esc(s.id)}">Está bien así</button></div>
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
  else if(a==='au-notdup'){ const x=r.dup[+d.i]; if(!x) return; const A=docOf(x.a); A.notDup=[...new Set([...(x.a.notDup||[]),x.b.id])]; save([{col:'songs',id:x.a.id,data:A}],'Marcadas como canciones distintas.'); }
  else if(a==='au-ver'){ const x=r.dup[+d.i]; if(!x) return; const main=(x.a.bodyPro&&x.a.bodyPro.trim())||!(x.b.bodyPro&&x.b.bodyPro.trim())?x.a:x.b, other=main===x.a?x.b:x.a; const o=docOf(other); o.versionOf=groupOf(main); save([{col:'songs',id:other.id,data:o}],`«${other.title}» quedó como otra versión de «${main.title}».`); }
  else if(a==='au-del'){ const s=S1(d.id); if(!s) return; if(el.dataset.sure!=='1'){ el.dataset.sure='1'; el.textContent='¿Seguro? Toca otra vez'; el.classList.add('danger'); return; } (async()=>{ await removeDoc('songs',s.id); toast(`«${s.title}» a la papelera (se puede rescatar 60 días).`); AU.res=scan(); draw(); })(); }
  else if(a==='au-auth'){ const x=r.author.find(y=>y.s.id===d.id); if(!x) return; const o=docOf(x.s); o.body=x.body; if(!o.author) o.author=x.author; if(o.bodyPro){ const t={body:o.bodyPro,author:''}; ioTakeAuthor(t); o.bodyPro=t.body; } save([{col:'songs',id:x.s.id,data:o}],`Autor: ${x.author}.`); }
  else if(a==='au-auth-all'){ const w=r.author.map(x=>{ const o=docOf(x.s); o.body=x.body; if(!o.author) o.author=x.author; if(o.bodyPro){ const t={body:o.bodyPro,author:''}; ioTakeAuthor(t); o.bodyPro=t.body; } return {col:'songs',id:x.s.id,data:o}; }); save(w,`Listo: ${w.length} autores pasados a la ficha.`); }
  else if(a==='au-key'){ const x=r.key.find(y=>y.s.id===d.id); if(!x) return; const o=docOf(x.s); o.key=x.key; save([{col:'songs',id:x.s.id,data:o}],`Tono ${x.key} para «${x.s.title}».`); }
  else if(a==='au-key-all'){ const w=r.key.map(x=>{ const o=docOf(x.s); o.key=x.key; return {col:'songs',id:x.s.id,data:o}; }); save(w,`Listo: ${w.length} alabanzas con tono.`); }
});
document.addEventListener('click',ev=>{ const el=ev.target.closest('[data-act="open-audit"]'); if(!el) return; ev.preventDefault(); const det=el.closest('details'); if(det) det.open=false; openAudit(); });

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
