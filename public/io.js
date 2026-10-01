/* Voz de la Novia — importar (Word, PDF, texto, ChordPro, copia) y exportar (Holyrics, ChordPro/OnSong, copia) */
"use strict";
const IO={files:[],chunks:[],mode:'auto'};
const PDFJS_SRC='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

function ioLoadScript(src){ return new Promise((res,rej)=>{ if(document.querySelector(`script[data-src="${src}"]`)) return res(); const s=document.createElement('script'); s.src=src; s.dataset.src=src; s.onload=res; s.onerror=()=>rej(new Error('No se pudo cargar '+src)); document.head.appendChild(s); }); }
async function ioZip(){ if(!window.JSZip) await ioLoadScript('/jszip.min.js'); return window.JSZip; }
function ioDownload(blob,filename){ const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),60000); }
function ioSafeName(s){ return (s||'Sin título').replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,' ').trim().slice(0,80)||'Sin título'; }
function ioExt(name){ const m=/\.([a-z0-9]+)$/i.exec(name||''); return m?m[1].toLowerCase():''; }
function expandTabs(s){ let out=''; for(const ch of s){ if(ch==='\t'){ const n=8-(out.length%8); out+=' '.repeat(n); } else out+=ch; } return out; }

/* ---------- Lectura de archivos ---------- */
async function readDocx(file){
  const zip=await (await ioZip()).loadAsync(await file.arrayBuffer());
  const f=zip.file('word/document.xml'); if(!f) throw new Error('El archivo Word no tiene contenido legible.');
  const xml=new DOMParser().parseFromString(await f.async('string'),'application/xml');
  const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const pages=[[]]; let line='';
  for(const p of xml.getElementsByTagNameNS(W,'p')){
    const pPr=p.getElementsByTagNameNS(W,'pageBreakBefore')[0]; if(pPr && pPr.getAttribute('w:val')!=='0' && (pages[pages.length-1].length||line)){ pages.push([]); }
    line='';
    for(const el of p.getElementsByTagNameNS(W,'*')){
      const n=el.localName;
      if(n==='t') line+=el.textContent;
      else if(n==='tab' && el.parentNode.localName==='r') line+='\t';
      else if(n==='br'||n==='cr'){ if(el.getAttributeNS(W,'type')==='page'||el.getAttribute('w:type')==='page'){ pages[pages.length-1].push(expandTabs(line)); line=''; pages.push([]); } else { pages[pages.length-1].push(expandTabs(line)); line=''; } }
    }
    pages[pages.length-1].push(expandTabs(line));
  }
  return pages.map(p=>p.join('\n')).filter(t=>t.trim());
}
async function readPdf(file){
  await ioLoadScript(PDFJS_SRC); const lib=window.pdfjsLib; if(!lib) throw new Error('No se pudo cargar el lector de PDF. Revisa tu conexión.');
  lib.GlobalWorkerOptions.workerSrc=PDFJS_WORKER;
  const pdf=await lib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise; const pages=[];
  for(let i=1;i<=pdf.numPages;i++){
    const page=await pdf.getPage(i); const tc=await page.getTextContent();
    const items=tc.items.filter(it=>it.str!==undefined && it.str.length).map(it=>({x:it.transform[4],y:it.transform[5],s:it.str,w:it.width,h:Math.abs(it.transform[3])||10}));
    if(!items.length){ pages.push(''); continue; }
    const widths=items.filter(it=>it.s.trim().length>1).map(it=>it.w/it.s.length).sort((a,b)=>a-b);
    const cw=widths.length?widths[Math.floor(widths.length/2)]:5;
    const minX=Math.min(...items.map(it=>it.x));
    items.sort((a,b)=>b.y-a.y||a.x-b.x);
    const lines=[]; for(const it of items){ const L=lines.find(l=>Math.abs(l.y-it.y)<=Math.max(2,it.h*0.35)); if(L) L.items.push(it); else lines.push({y:it.y,h:it.h,items:[it]}); }
    lines.sort((a,b)=>b.y-a.y);
    const hs=lines.map(l=>l.h).sort((a,b)=>a-b); const lh=hs[Math.floor(hs.length/2)]*1.25;
    let out=[]; let prevY=null;
    for(const l of lines){
      if(prevY!=null && prevY-l.y>lh*1.7) out.push('');
      l.items.sort((a,b)=>a.x-b.x); let s='';
      for(const it of l.items){ const col=Math.max(0,Math.round((it.x-minX)/cw)); if(s.length<col) s=s.padEnd(col,' '); else if(s.length && !/\s$/.test(s) && !/^\s/.test(it.s) && it.x-minX>(s.length+0.6)*cw) s+=' '; s+=it.s; }
      out.push(s.replace(/\s+$/,'')); prevY=l.y;
    }
    pages.push(out.join('\n'));
  }
  return pages;
}
async function readText(file){ const t=await file.text(); return [t.replace(/^﻿/,'')]; }

/* ---------- ChordPro ---------- */
function isChordPro(t){ return /\{\s*(title|t|soc|start_of_chorus|key|artist|c|comment)\s*[:}]/i.test(t); }
function fromChordPro(text){
  const meta={}; const body=[];
  for(const raw of text.split(/\r?\n/)){
    const m=/^\s*\{\s*([a-z_]+)\s*(?::\s*(.*?))?\s*\}\s*$/i.exec(raw);
    if(m){ const k=m[1].toLowerCase(), v=(m[2]||'').trim();
      if(k==='title'||k==='t') meta.title=v; else if(k==='artist'||k==='subtitle'||k==='st'||k==='composer') meta.author=meta.author||v;
      else if(k==='key') meta.key=v; else if(k==='tempo') meta.bpm=parseInt(v)||''; else if(k==='capo') meta.capo=parseInt(v)||0;
      else if(k==='comment'||k==='c'||k==='ci'||k==='cb') body.push('# '+v);
      else if(k==='soc'||k==='start_of_chorus') body.push('# '+(v||'Coro'));
      else if(k==='sov'||k==='start_of_verse') body.push('# '+(v||'Estrofa'));
      else if(k==='sob'||k==='start_of_bridge') body.push('# '+(v||'Puente'));
      continue; }
    if(/^\s*#/.test(raw)) continue;
    body.push(raw.replace(/\s+$/,''));
  }
  return {...meta, body:body.join('\n').replace(/\n{3,}/g,'\n\n').trim()};
}
function toChordPro(s){
  const L=[`{title: ${s.title}}`]; if(s.author) L.push(`{artist: ${s.author}}`); if(s.key) L.push(`{key: ${s.key}}`); if(s.bpm) L.push(`{tempo: ${s.bpm}}`); if(s.capo) L.push(`{capo: ${s.capo}}`); L.push('');
  for(const line of (s.body||'').split(/\r?\n/)){ const m=/^\s*#+\s*(.*)$/.exec(line); L.push(m?`{comment: ${m[1]}}`:line); }
  if(s.notes) L.push('',`{comment: ${s.notes.replace(/[{}]/g,'')}}`);
  return L.join('\n')+'\n';
}

/* ---------- Partir el texto en canciones ---------- */
const META_RE=/^\s*(tono|key|clave|autor|author|artista|compositor|bpm|tempo|capo)\s*[:=]\s*(.+)$/i;
function isTitleLine(line){
  const t=line.trim(); if(t.length<3||t.length>70) return false;
  if(isChordLine(t)||SEC_RE.test(t)) return false;
  if(/^\d{1,4}\s*[-.)–]\s*\S/.test(t)) return true;
  const letters=t.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g,''); if(letters.length<4) return false;
  return letters===letters.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(letters);
}
function cleanTitle(t){ return t.trim().replace(/^\d{1,4}\s*[-.)–]\s*/,'').replace(/\s+/g,' ').replace(/^(.)(.*)$/,(m,a,b)=>a+b); }
function niceCase(t){ const letters=t.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g,''); if(letters && letters===letters.toUpperCase()){ const l=t.toLocaleLowerCase('es'); return l.charAt(0).toLocaleUpperCase('es')+l.slice(1); } return t; }
function splitText(text,mode){
  const lines=text.replace(/\r/g,'').split('\n');
  if(mode==='sep'){ const out=[]; let cur=[]; for(const l of lines){ if(/^\s*(-{3,}|\*{3,}|={3,}|_{3,})\s*$/.test(l)){ if(cur.join('').trim()) out.push(cur.join('\n')); cur=[]; } else cur.push(l); } if(cur.join('').trim()) out.push(cur.join('\n')); return out; }
  if(mode==='titles'){ const out=[]; let cur=[]; lines.forEach((l,i)=>{ const prevBlank=i===0||!lines[i-1].trim()||!cur.join('').trim(); if(prevBlank && isTitleLine(l) && cur.join('').trim()){ out.push(cur.join('\n')); cur=[]; } cur.push(l); }); if(cur.join('').trim()) out.push(cur.join('\n')); return out; }
  return [text];
}
function makeSong(text,fallbackTitle){
  let lines=text.replace(/\r/g,'').split('\n'); while(lines.length&&!lines[0].trim()) lines.shift();
  if(isChordPro(text)){ const c=fromChordPro(text); return finishSong({title:c.title||fallbackTitle,author:c.author||'',key:c.key||'',bpm:c.bpm||'',capo:c.capo||0,body:c.body}); }
  let title=''; const meta={};
  if(lines.length && !isChordLine(lines[0]) && !SEC_RE.test(lines[0]) && lines[0].trim().length<=80){ title=cleanTitle(lines.shift()); }
  while(lines.length && (META_RE.test(lines[0])||!lines[0].trim())){ const m=META_RE.exec(lines.shift()); if(!m) continue; const k=m[1].toLowerCase(), v=m[2].trim();
    if(/tono|key|clave/.test(k)) meta.key=v; else if(/bpm|tempo/.test(k)) meta.bpm=parseInt(v)||''; else if(k==='capo') meta.capo=parseInt(v)||0; else meta.author=v; }
  return finishSong({title:niceCase(title||fallbackTitle||'Sin título'),author:meta.author||'',key:meta.key||'',bpm:meta.bpm||'',capo:meta.capo||0,body:convertChordsOverLyrics(lines.join('\n')).replace(/\n{3,}/g,'\n\n').trim()});
}
function finishSong(s){
  let k=parseKey(s.key);
  if(!k){ const m=/\[([^\]]+)\]/.exec(s.body); const c=m&&parseChord(m[1]); if(c) k={idx:c.root,minor:/^m(?!aj)/.test(c.suf)}; }
  s.key=k?keyCanon(k.idx,k.minor):'';
  const nt=norm(s.title); s.dup=[...S.songs.values()].some(x=>norm(x.title)===nt);
  s.include=!s.dup && !!s.body.trim(); return s;
}

/* ---------- Ventana de importación ---------- */
function openImport(){
  IO.files=[]; IO.chunks=[]; IO.mode='auto'; IO.pages={};
  $('#modal-root').innerHTML=`<div class="scrim" data-act="close-modal"><div class="modal" role="dialog" aria-label="Importar canciones" data-stop style="width:min(760px,100%)">
    <header><h3>Importar canciones</h3><button class="btn ghost" data-act="close-modal" aria-label="Cerrar">${ICON.x}</button></header>
    <div class="body" id="imp-body" style="display:grid;gap:12px">
      <label class="drop" id="imp-drop"><input id="imp-file" type="file" multiple accept=".docx,.pdf,.txt,.cho,.chopro,.chordpro,.pro,.crd,.json" hidden>
        <b>Elige o arrastra archivos aquí</b><span>Word (.docx), PDF, texto (.txt), ChordPro / OnSong (.cho, .chopro) o una copia de Voz de la Novia (.json). Puedes elegir varios a la vez.</span></label>
      <div id="imp-opts"></div><div id="imp-list"></div>
    </div></div></div>`;
  const inp=$('#imp-file'), drop=$('#imp-drop');
  inp.addEventListener('change',()=>ioRead([...inp.files]));
  drop.addEventListener('dragover',e=>{ e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave',()=>drop.classList.remove('over'));
  drop.addEventListener('drop',e=>{ e.preventDefault(); drop.classList.remove('over'); ioRead([...e.dataTransfer.files]); });
}
async function ioRead(files){
  if(!files.length) return; const list=$('#imp-list'); list.innerHTML='<p class="muted">Leyendo archivos…</p>';
  const jsons=files.filter(f=>ioExt(f.name)==='json'); if(jsons.length){ if(!S.isAdmin){ list.innerHTML='<div class="banner">Solo el administrador puede restaurar una copia de seguridad.</div>'; return; } return ioBackup(jsons[0]); }
  IO.files=[]; const errors=[];
  for(const f of files){ const ext=ioExt(f.name);
    try{ let pages;
      if(ext==='docx') pages=await readDocx(f); else if(ext==='pdf') pages=await readPdf(f); else if(['txt','cho','chopro','chordpro','pro','crd'].includes(ext)) pages=await readText(f);
      else if(ext==='doc'){ errors.push(`${f.name}: es Word antiguo (.doc). Ábrelo en Word y guárdalo como .docx.`); continue; }
      else { errors.push(`${f.name}: formato no compatible.`); continue; }
      IO.files.push({name:f.name.replace(/\.[^.]+$/,''),ext,pages});
    }catch(e){ errors.push(`${f.name}: ${e.message||'no se pudo leer.'}`); }
  }
  IO.errors=errors; if(IO.mode==='auto') IO.mode=IO.files.length>1?'file':(IO.files[0]&&IO.files[0].pages.length>1&&IO.files[0].ext==='pdf'?'titles':'titles');
  ioBuild();
}
function ioBuild(){
  const chunks=[];
  for(const f of IO.files){
    const all=f.pages.join('\n\n');
    if(isChordPro(all)&&IO.mode!=='sep'){ chunks.push(makeSong(all,f.name)); continue; }
    if(IO.mode==='file') chunks.push(makeSong(all,f.name));
    else if(IO.mode==='page') f.pages.forEach((p,i)=>chunks.push(makeSong(p,f.name+' '+(i+1))));
    else splitText(all,IO.mode).forEach((t,i)=>chunks.push(makeSong(t,f.name+(i?' '+(i+1):''))));
  }
  IO.chunks=chunks.filter(c=>c.body.trim()||c.title); ioRender();
}
function ioRender(){
  const opts=$('#imp-opts'), list=$('#imp-list'); if(!opts) return;
  const errs=(IO.errors||[]).map(e=>`<div class="banner" style="color:var(--danger)">${esc(e)}</div>`).join('');
  if(!IO.files.length){ opts.innerHTML=''; list.innerHTML=errs; return; }
  const modes=[['file','Un archivo = una canción'],['titles','Detectar títulos (números o MAYÚSCULAS)'],['page','Una página = una canción'],['sep','Separadas con una línea ---']];
  opts.innerHTML=`<label class="f">¿Cómo están separadas las canciones?<select id="imp-mode">${modes.map(([v,t])=>`<option value="${v}" ${IO.mode===v?'selected':''}>${t}</option>`).join('')}</select></label>`;
  $('#imp-mode').addEventListener('change',e=>{ IO.mode=e.target.value; ioBuild(); });
  const n=IO.chunks.filter(c=>c.include).length;
  list.innerHTML=errs+`<p style="margin:0;color:var(--muted);font-size:13px">Se encontraron ${IO.chunks.length} canciones. Revisa títulos y tonos; pulsa “Ver” para corregir la letra antes de importar.</p>
    <div class="imp-rows">${IO.chunks.map((c,i)=>`<div class="imp-row">
      <input type="checkbox" data-imp="include" data-i="${i}" ${c.include?'checked':''} aria-label="Incluir">
      <input data-imp="title" data-i="${i}" value="${esc(c.title)}" aria-label="Título">
      <select data-imp="key" data-i="${i}" aria-label="Tono"><option value="">Tono</option>${ALL_KEYS.map(k=>`<option value="${k}" ${c.key===k?'selected':''}>${esc(keyText(parseKey(k)))}</option>`).join('')}</select>
      <button class="btn ghost" data-act="imp-view" data-i="${i}">Ver</button>
      ${c.dup?'<span class="pill" title="Ya hay una canción con este título">Ya existe</span>':''}
      ${c.open?`<textarea data-imp="body" data-i="${i}" class="body" style="grid-column:1/-1;min-height:220px">${esc(c.body)}</textarea>`:''}
    </div>`).join('')}</div>
    <div class="actions" style="position:sticky;bottom:-12px;background:var(--surface);padding-block:10px"><button class="btn pri" data-act="imp-go" ${n?'':'disabled'}>Importar ${n} ${n===1?'canción':'canciones'}</button><span id="imp-prog" style="font-size:13px;color:var(--muted)"></span></div>`;
}
document.addEventListener('input',e=>{ const el=e.target; if(!el.dataset||!el.dataset.imp) return; const c=IO.chunks[+el.dataset.i]; if(!c) return; if(el.dataset.imp==='title') c.title=el.value; else if(el.dataset.imp==='body') c.body=el.value; });
document.addEventListener('change',e=>{ const el=e.target; if(!el.dataset||!el.dataset.imp) return; const c=IO.chunks[+el.dataset.i]; if(!c) return;
  if(el.dataset.imp==='include'){ c.include=el.checked; ioRender(); } else if(el.dataset.imp==='key') c.key=el.value; });
async function ioImport(){
  const sel=IO.chunks.filter(c=>c.include && c.title.trim()); if(!sel.length) return;
  const btn=document.querySelector('[data-act="imp-go"]'); if(btn) btn.disabled=true; const prog=$('#imp-prog');
  const writes=sel.map(c=>({col:'songs',id:newId('c'),data:{title:c.title.trim(),author:c.author||'',key:c.key||'',category:'',bpm:c.bpm||'',capo:c.capo||0,body:c.body,notes:'',updatedAt:Date.now()}}));
  let done=0;
  for(let i=0;i<writes.length;i+=50){
    const part=writes.slice(i,i+50);
    try{ const r=await api('/api/batch',{method:'POST',body:JSON.stringify({writes:part})}); done+=part.length; if(prog) prog.textContent=`Guardadas ${done} de ${writes.length}…`; }
    catch(e){ if(e.code===401){ lostAuth(); return; } toast(`Se guardaron ${done} canciones; el resto falló. Inténtalo de nuevo.`); if(btn) btn.disabled=false; await loadData(); return; }
  }
  closeModal(); lastSig=''; await loadData(); toast(`${done} ${done===1?'canción importada':'canciones importadas'}.`);
}
async function ioBackup(file){
  let d; try{ d=JSON.parse(await file.text()); }catch{ toast('El archivo .json no es una copia válida.'); return; }
  if(!d||!Array.isArray(d.songs)){ toast('El archivo .json no es una copia de Voz de la Novia.'); return; }
  const writes=[...d.songs.map(s=>({col:'songs',s})),...(d.programs||[]).map(p=>({col:'programs',s:p}))].filter(w=>w.s&&w.s.id).map(w=>{ const data={...w.s}; delete data.id; return {col:w.col,id:String(w.s.id),data}; });
  $('#imp-list').innerHTML=`<p>Copia con ${d.songs.length} canciones y ${(d.programs||[]).length} programas. Las que tengan el mismo identificador se reemplazarán.</p><div class="actions"><button class="btn pri" id="bk-go">Restaurar copia</button><span id="imp-prog" style="font-size:13px;color:var(--muted)"></span></div>`;
  $('#bk-go').addEventListener('click',async()=>{ $('#bk-go').disabled=true; let done=0;
    for(let i=0;i<writes.length;i+=50){ try{ await api('/api/batch',{method:'POST',body:JSON.stringify({writes:writes.slice(i,i+50),restore:true})}); done+=Math.min(50,writes.length-i); $('#imp-prog').textContent=`Restaurados ${done} de ${writes.length}…`; }catch(e){ if(e.code===401){ lostAuth(); return; } toast('No se pudo terminar de restaurar.'); break; } }
    closeModal(); lastSig=''; await loadData(); toast('Copia restaurada.'); });
}

/* ---------- Exportar ---------- */
function holyricsText(s){
  const blocks=[]; let cur=[];
  for(const L of parseSong(s.body)){
    if(L.type==='sec'||L.type==='gap'){ if(cur.length){ blocks.push(cur.join('\r\n')); cur=[]; } continue; }
    if(L.chordOnly) continue; const t=L.lyric.replace(/\s+/g,' ').trim(); if(t) cur.push(t);
  }
  if(cur.length) blocks.push(cur.join('\r\n'));
  return '﻿'+blocks.join('\r\n\r\n')+'\r\n';
}
function openExport(scope){
  const list=scope==='program'?ioProgramSongs():ioFilteredSongs();
  const label=scope==='program'?`las ${list.length} canciones del programa, en su orden`:(list.length===S.songs.size?`todas las canciones (${list.length})`:`las ${list.length} canciones que estás viendo`);
  $('#modal-root').innerHTML=`<div class="scrim" data-act="close-modal"><div class="modal" role="dialog" aria-label="Exportar" data-stop style="width:min(520px,100%)">
    <header><h3>Exportar</h3><button class="btn ghost" data-act="close-modal" aria-label="Cerrar">${ICON.x}</button></header>
    <div class="body" style="display:grid;gap:10px"><p style="margin:0;color:var(--muted)">Se exportarán ${esc(label)}.</p>
      <button class="exp" data-act="exp" data-f="holyrics" data-scope="${scope}"><b>Holyrics</b><span>Un archivo .txt por canción (solo letra, una diapositiva por estrofa), en un .zip. En Holyrics: Archivo → Importar → Texto.</span></button>
      <button class="exp" data-act="exp" data-f="chordpro" data-scope="${scope}"><b>ChordPro (OnSong, OpenLP y otros)</b><span>Un archivo .cho por canción con letra y acordes, en un .zip.</span></button>
      ${scope==='program'?'':`<button class="exp" data-act="exp" data-f="json" data-scope="${scope}"><b>Copia de seguridad</b><span>Todo el cancionero y los programas en un archivo .json para restaurarlo después.</span></button>`}
    </div></div></div>`;
}
function ioFilteredSongs(){
  const q=norm(V.q); return sortedSongs().filter(s=>{ const k=songKey(s); const c=k?keyCanon(k.idx,k.minor):'?'; if(V.key!=='all'&&c!==V.key) return false; if(q&&!norm(s.title+' '+(s.author||'')+' '+(s.category||'')+' '+s.body.replace(/\[[^\]]*\]/g,'')).includes(q)) return false; return true; });
}
function ioProgramSongs(){ const p=S.programs.get(V.programId); return (p&&p.items||[]).map(it=>{ const s=S.songs.get(it.songId); if(!s) return null; const sh=itemShift(it); return {...s,key:it.key||s.key,body:sh?transposeBody(s.body,sh):s.body}; }).filter(Boolean); }
function transposeBody(body,sh){ return body.replace(/\[([^\]]+)\]/g,(m,c)=>'['+fmtChord(c,sh,false,false)+']'); }
async function ioExport(fmt,scope){
  const list=scope==='program'?ioProgramSongs():ioFilteredSongs(); const p=scope==='program'?S.programs.get(V.programId):null;
  const base=scope==='program'?slug(p.title||'programa')+(p.date?'-'+p.date:''):'voz-de-la-novia';
  try{
    if(fmt==='json'){ const data={app:'voz-de-la-novia',version:1,exportedAt:new Date().toISOString(),songs:[...S.songs.values()],programs:[...S.programs.values()]};
      ioDownload(new Blob([JSON.stringify(data,null,1)],{type:'application/json'}),`voz-de-la-novia-copia-${new Date().toISOString().slice(0,10)}.json`); closeModal(); toast('Copia descargada.'); return; }
    const JSZip=await ioZip(); const zip=new JSZip(); const used=new Set();
    list.forEach((s,i)=>{ let name=(scope==='program'?String(i+1).padStart(2,'0')+' - ':'')+ioSafeName(s.title); let n=name, k=2; while(used.has(n.toLowerCase())) n=name+' ('+(k++)+')'; used.add(n.toLowerCase());
      if(fmt==='holyrics') zip.file(n+'.txt',holyricsText(s)); else zip.file(n+'.cho',toChordPro({...s,body:sb(s)})); });
    const blob=await zip.generateAsync({type:'blob'}); ioDownload(blob,`${base}-${fmt==='holyrics'?'holyrics':'chordpro'}.zip`); closeModal(); toast(`${list.length} canciones exportadas.`);
  }catch(e){ toast('No se pudo exportar: '+(e.message||'error')); }
}
