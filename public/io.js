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
  try{
    if(S.token){ const r=await fetch('/api/pdf-words',{method:'POST',headers:{Authorization:'Bearer '+S.token,'Content-Type':'application/pdf'},body:file});
      if(r.ok){ const d=await r.json(); if(d.pages&&d.pages.length) return d.pages.map(wordsToText); } }
  }catch{}
  return readPdfBrowser(file);
}
async function readPdfBrowser(file){
  await ioLoadScript(PDFJS_SRC); const lib=window.pdfjsLib; if(!lib) throw new Error('No se pudo cargar el lector de PDF. Revisa tu conexión.');
  lib.GlobalWorkerOptions.workerSrc=PDFJS_WORKER;
  const pdf=await lib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise; const pages=[];
  for(let i=1;i<=pdf.numPages;i++){
    const page=await pdf.getPage(i); const tc=await page.getTextContent(); const vh=page.getViewport({scale:1}).height; const words=[];
    for(const it of tc.items){ if(!it.str||!it.str.trim()) continue; const x=it.transform[4], h=Math.abs(it.transform[3])||10, y0=vh-it.transform[5]-h, cw=it.width/Math.max(1,it.str.length); let pos=0;
      for(const m of it.str.matchAll(/\S+/g)){ const x0=x+m.index*cw; words.push([x0,y0,x0+m[0].length*cw,y0+h,m[0]]); pos++; } }
    pages.push(wordsToText(words));
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
const PROPER=['Dios','Jesús','Jesucristo','Cristo','Jehová','Señor','Espíritu Santo','Espíritu','Emanuel','Emmanuel','Mesías','Rey de reyes','Cordero','Sion','Israel','Jerusalén','Canaán','Jordán','Abraham','Isaac','Jacob','Moisés','Elías','Eliseo','David','Pedro','Pablo','Juan','María','Miguel','Gabriel','Josué','Noé','Getsemaní','Calvario','Gólgota','Belén','Nazaret','Egipto','Faraón','Biblia','Edén','Babilonia','Salomón','Sansón','Daniel','Ezequiel','Isaías','Jeremías','Lázaro','Marta','Zaqueo','Rut','Ester','Gedeón','Samuel','Saúl','Goliat'];
const PROPER_MAP=new Map(PROPER.map(p=>[p.toLocaleLowerCase('es'),p]));
function fixProper(t){ let out=t; for(const [lo,p] of PROPER_MAP){ out=out.replace(new RegExp('(^|[^\\p{L}])'+lo.replace(/ /g,'\\s+')+'(?=$|[^\\p{L}])','gu'),(m,pre)=>pre+p); } return out; }
function sentence(t){ const l=t.toLocaleLowerCase('es'); const i=l.search(/\p{L}/u); const s=i<0?l:l.slice(0,i)+l.charAt(i).toLocaleUpperCase('es')+l.slice(i+1); return fixProper(s); }
function niceCase(t){ const letters=t.replace(/[^A-Za-zÁÉÍÓÚÑÜáéíóúñü]/g,''); if(letters && letters===letters.toUpperCase()) return sentence(t); return t; }
/* Pasa a minúsculas las líneas de letra escritas en MAYÚSCULAS, sin tocar acordes ni títulos de sección */
function lyricCase(body){
  return body.split('\n').map(line=>{ if(/^\s*#/.test(line)) return line;
    const parts=line.split(/(\[[^\]]*\])/); const text=parts.filter((p,i)=>i%2===0).join(''); const letters=text.replace(/[^A-Za-zÁÉÍÓÚÑÜáéíóúñü]/g,'');
    if(!letters||letters!==letters.toUpperCase()) return line;
    const low=sentence(text); let k=0; return parts.map((p,i)=>{ if(i%2) return p; const seg=low.slice(k,k+p.length); k+=p.length; return seg; }).join('');
  }).join('\n');
}
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
  return finishSong({title:niceCase(title||fallbackTitle||'Sin título'),author:meta.author||'',key:meta.key||'',bpm:meta.bpm||'',capo:meta.capo||0,body:(b=>IO.lower?lyricCase(b):b)(convertChordsOverLyrics(lines.join('\n')).replace(/\n{3,}/g,'\n\n').trim())});
}
function finishSong(s){
  let k=parseKey(s.key);
  if(!k){ const m=/\[([^\]]+)\]/.exec(s.body); const c=m&&parseChord(m[1]); if(c) k={idx:c.root,minor:/^m(?!aj)/.test(c.suf)}; }
  s.key=k?keyCanon(k.idx,k.minor):'';
  s.dupOf=findDuplicate(s,[...S.songs.values()]); s.dup=!!s.dupOf;
  s.include=!s.dup && !!s.body.trim(); if(s.dup) s.dupAct='skip'; return s;
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
  IO.errors=errors; IO.hymnal=IO.files.some(f=>hymFindIndex(f.pages).entries.length>=3); if(IO.lower===undefined) IO.lower=true;
  IO.numbered=false; let numCount=0, hymCount=0;
  for(const f of IO.files){ const np=numberedParse(f.pages,f.name); if(np&&np.length>=5){ IO.numbered=true; numCount+=np.length; } if(IO.hymnal){ const hp=hymnalParse(f.pages,f.name); hymCount+=hp?hp.length:0; } }
  if(IO.mode==='auto'&&IO.numbered&&numCount>=hymCount) IO.mode='numbered';
  if(IO.mode==='auto'&&IO.hymnal) IO.mode='hymnal'; if(IO.mode==='auto') IO.mode=IO.files.length>1?'file':(IO.files[0]&&IO.files[0].pages.length>1&&IO.files[0].ext==='pdf'?'titles':'titles');
  ioBuild();
}
function ioBuild(){
  const chunks=[]; IO.missing=[];
  for(const f of IO.files){
    if(IO.mode==='numbered'){ const ns=numberedParse(f.pages,f.name+(f.ext?'.'+f.ext:'')); if(ns&&ns.length){ IO.missing=(IO.missing||[]).concat(ns.missing||[]); ns.forEach(h=>{ const c=finishSong({...h,body:IO.lower?lyricCase(h.body):h.body}); if(h.doubts&&h.doubts.length){ c.doubts=h.doubts; c.include=false; } chunks.push(c); }); continue; } }
    if(IO.mode==='hymnal'){ const hs=hymnalParse(f.pages,f.name+(f.ext?'.'+f.ext:'')); if(hs&&hs.length){ hs.forEach(h=>chunks.push(finishSong({...h,body:IO.lower?lyricCase(h.body):h.body}))); continue; } }
    const all=f.pages.join('\n\n');
    if(isChordPro(all)&&IO.mode!=='sep'){ chunks.push(makeSong(all,f.name)); continue; }
    if(IO.mode==='file') chunks.push(makeSong(all,f.name));
    else if(IO.mode==='page') f.pages.forEach((p,i)=>chunks.push(makeSong(p,f.name+' '+(i+1))));
    else splitText(all,IO.mode).forEach((t,i)=>chunks.push(makeSong(t,f.name+(i?' '+(i+1):''))));
  }
  /* Descarta fragmentos sin forma de canción: solo números, acordes, una línea suelta */
  const valid=chunks.filter(c=>c.body&&hasSongShape(c.body.split('\n')));
  IO.discarded=chunks.length-valid.length;
  IO.chunks=valid;
  /* Repetidas dentro del mismo archivo */
  IO.chunks.forEach((c,i)=>{ if(c.dup) return; const d=findDuplicate(c,IO.chunks.slice(0,i)); if(d){ c.dup=true; c.dupOf={...d,inBatch:true}; c.include=false; } });
  IO.confirmDup=false; ioRender();
}
function ioRender(){
  const opts=$('#imp-opts'), list=$('#imp-list'); if(!opts) return;
  const errs=(IO.errors||[]).map(e=>`<div class="banner" style="color:var(--danger)">${esc(e)}</div>`).join('');
  if(!IO.files.length){ opts.innerHTML=''; list.innerHTML=errs; return; }
  const modes=[...(IO.numbered?[['numbered','Himnario numerado (N.º y TÍTULO, columnas, índice)']]:[]),...(IO.hymnal?[['hymnal','Himnario con índice (detecta cada canción, une acordes y letra)']]:[]),['file','Un archivo = una canción'],['titles','Detectar títulos (números o MAYÚSCULAS)'],['page','Una página = una canción'],['sep','Separadas con una línea ---']];
  opts.innerHTML=`<label class="f">¿Cómo están separadas las canciones?<select id="imp-mode">${modes.map(([v,t])=>`<option value="${v}" ${IO.mode===v?'selected':''}>${t}</option>`).join('')}</select></label>`;
  opts.innerHTML+=`<label style="display:flex;gap:8px;align-items:center;font-size:13.5px;margin-top:8px"><input type="checkbox" id="imp-lower" ${IO.lower?'checked':''}> Pasar la letra en MAYÚSCULAS a minúsculas (mantiene Dios, Jesús, Señor…)</label>`;
  $('#imp-mode').addEventListener('change',e=>{ IO.mode=e.target.value; ioBuild(); });
  $('#imp-lower').addEventListener('change',e=>{ IO.lower=e.target.checked; ioBuild(); });
  const n=IO.chunks.filter(c=>c.include).length;
  const nd=IO.chunks.filter(c=>c.dup).length; const nsys=IO.chunks.filter(c=>c.dup&&c.dupOf&&!c.dupOf.inBatch).length;
  const sh=ioShiftGuess();
  list.innerHTML=errs+(sh?`<div class="banner shiftbar"><b>Los títulos parecen corridos un lugar.</b> En ${sh.n} canciones, la letra corresponde al título de la ${sh.d>0?'siguiente':'anterior'}. <button class="btn pri" data-act="imp-shift" data-d="${sh.d}">Corregir títulos</button></div>`:'')+(nd?`<div class="banner dupbar"><b>${nd} ${nd===1?'canción ya está':'canciones ya están'} en el sistema o ${nd===1?'está repetida':'están repetidas'}.</b> Las comparé por título y por letra. Elige qué hacer con cada una (o con todas a la vez). Toca “Comparar” para ver la que ya tienes junto a la del PDF.${nsys>1?`<label class="f" style="margin-top:8px">A todas las que ya existen:<select id="imp-dupall"><option value="">Elegir…</option>${DUP_OPTS.map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></label>`:''}</div>`:'')+(IO.confirmDup?ioDupConfirm():'')+`<p style="margin:0;color:var(--muted);font-size:13px">Se encontraron ${IO.chunks.length} canciones. Revisa títulos y tonos; pulsa “Ver” para corregir la letra antes de importar.</p>
    ${ioDoubtBanner()}
    <div class="imp-rows">${IO.chunks.map((c,i)=>IO.onlyDoubts&&!(c.doubts&&c.doubts.length)?'':`<div class="imp-row${c.doubts&&c.doubts.length?' doubt':''}">
      <input type="checkbox" data-imp="include" data-i="${i}" ${c.include?'checked':''} aria-label="Incluir">
      <input data-imp="title" data-i="${i}" value="${esc(c.title)}" aria-label="Título">
      <select data-imp="key" data-i="${i}" aria-label="Tono"><option value="">Tono</option>${ALL_KEYS.map(k=>`<option value="${k}" ${c.key===k?'selected':''}>${esc(keyText(parseKey(k)))}</option>`).join('')}</select>
      <button class="btn ghost" data-act="imp-view" data-i="${i}">Ver</button>
      ${c.dup?`<span class="pill dup" title="${esc((c.dupOf&&c.dupOf.inBatch?'Repetida en este mismo archivo: ':'Ya está en el sistema: ')+(c.dupOf?dupLabel(c.dupOf):''))}">${c.dupOf&&c.dupOf.inBatch?'Repetida en el archivo':'Ya existe'}</span>`:''}
      ${c.dup&&c.dupOf?`<small class="dupinfo">${c.dupOf.inBatch?'Igual a':'Ya existe como'} ${esc(dupLabel(c.dupOf))}</small>`:''}
      ${c.dup&&c.dupOf&&!c.dupOf.inBatch?`<div class="dupact"><select data-imp="dupact" data-i="${i}" aria-label="Qué hacer con esta canción">${DUP_OPTS.map(([v,t])=>`<option value="${v}" ${c.dupAct===v?'selected':''}>${t}${v==='pro'&&c.dupOf.song.bodyPro&&c.dupOf.song.bodyPro.trim()?' (reemplaza la que tiene)':''}</option>`).join('')}</select><button class="btn ghost" data-act="imp-cmp" data-i="${i}">${c.cmp?'Cerrar comparación':'Comparar'}</button></div>`:''}
      ${c.dup&&c.dupOf&&!c.dupOf.inBatch&&c.dupOf.sim>=0.8&&chNorm(c.title)!==chNorm(c.dupOf.song.title)?`<div class="tmis">⚠ El título del PDF («${esc(c.title)}») no coincide con su letra: esa letra es «${esc(c.dupOf.song.title)}». <button class="btn ghost" data-act="imp-usetitle" data-i="${i}">Usar «${esc(c.dupOf.song.title)}»</button></div>`:''}
      ${c.cmp&&c.dupOf?(()=>{ const ex=c.dupOf.song, chm=c.dupAct==='cpro'||c.dupAct==='cnew', tab=c.cmpTab||'ex';
        return `<div class="cmp-tabs" role="tablist"><button data-act="imp-tab" data-i="${i}" data-t="ex" aria-pressed="${tab==='ex'}">Ya en el sistema</button><button data-act="imp-tab" data-i="${i}" data-t="pdf" aria-pressed="${tab==='pdf'}">Del PDF</button>${chm?`<button data-act="imp-tab" data-i="${i}" data-t="res" aria-pressed="${tab==='res'}">Resultado</button>`:''}</div>
        <div class="cmp t-${tab}${chm?' three':''}"><div class="p-ex"><h4>Ya en el sistema · «${esc(ex.title)}»${ex.key?' · '+esc(keyText(parseKey(ex.key))):''}</h4><pre>${esc(ex.body||'')}</pre>${ex.bodyPro&&ex.bodyPro.trim()?`<h4>Su versión Original</h4><pre>${esc(ex.bodyPro)}</pre>`:''}</div>
          <div class="p-pdf"><h4>Del PDF · «${esc(c.title)}»${c.key?' · '+esc(keyText(parseKey(c.key))):''}</h4><textarea data-imp="body" data-i="${i}" class="body">${esc(c.body)}</textarea></div>
          ${chm?`<div class="p-res"><h4>Resultado · tu letra con los acordes del PDF</h4><pre>${esc(chordsResult(c))}</pre></div>`:''}</div>`; })():''}
      ${c.hasChords===false?'<span class="pill">Solo letra</span>':''}
      ${c.doubts&&c.doubts.length?`<div class="ask"><b>Tengo una duda${c.num?` con la n.º ${c.num}`:''}:</b> ${esc(c.doubts.join(' '))}
        <div class="ask-snip">${esc(c.body.split('\n').filter(l=>l.trim()&&!/^#/.test(l)).slice(0,3).join(' / ').replace(/\[[^\]]*\]/g,'').slice(0,160))}…</div>
        <div class="actions"><button class="btn pri" data-act="imp-ok" data-i="${i}">Sí, es una canción</button>${i>0?`<button class="btn" data-act="imp-merge" data-i="${i}">Unir con la anterior</button>`:''}<button class="btn danger" data-act="imp-drop" data-i="${i}">No es una canción</button></div></div>`:''}
      ${c.open?`<textarea data-imp="body" data-i="${i}" class="body" style="grid-column:1/-1;min-height:220px">${esc(c.body)}</textarea>`:''}
    </div>`).join('')}</div>
    <div class="actions" style="position:sticky;bottom:-12px;background:var(--surface);padding-block:10px"><button class="btn pri" data-act="imp-go" ${n?'':'disabled'}>Importar ${n} ${n===1?'canción':'canciones'}</button><span id="imp-prog" style="font-size:13px;color:var(--muted)"></span></div>`;
}
document.addEventListener('input',e=>{ const el=e.target; if(!el.dataset||!el.dataset.imp) return; const c=IO.chunks[+el.dataset.i]; if(!c) return; if(el.dataset.imp==='title') c.title=el.value; else if(el.dataset.imp==='body') c.body=el.value; });
document.addEventListener('change',e=>{ const el=e.target; if(!el.dataset||!el.dataset.imp) return; const c=IO.chunks[+el.dataset.i]; if(!c) return;
  if(el.dataset.imp==='include'){ c.include=el.checked; if(c.dup&&c.dupOf&&!c.dupOf.inBatch){ c.dupAct=el.checked?(c.dupAct&&c.dupAct!=='skip'?c.dupAct:(c.dupOf.song.bodyPro&&c.dupOf.song.bodyPro.trim()?'cnew':'cpro')):'skip'; } if(el.checked&&c.doubts) c.doubts=[]; ioRender(); } else if(el.dataset.imp==='key') c.key=el.value;
  else if(el.dataset.imp==='dupact'){ c.dupAct=el.value; c.include=el.value!=='skip'; ioRender(); } });
document.addEventListener('change',e=>{ if(e.target.id!=='imp-dupall'||!e.target.value) return; const v=e.target.value; IO.chunks.forEach(c=>{ if(c.dup&&c.dupOf&&!c.dupOf.inBatch){ c.dupAct=v; c.include=v!=='skip'; } }); ioRender(); });
const DUP_OPTS=[['skip','No subir: me quedo con la que ya tengo'],
  ['cpro','Solo los acordes del PDF sobre MI letra → versión “Original”'],
  ['cnew','Solo los acordes del PDF sobre MI letra → otra versión aparte'],
  ['pro','PDF completo (su letra y acordes) → versión “Original”'],
  ['new','PDF completo (su letra y acordes) → otra versión aparte'],
  ['body','PDF completo → reemplaza mi versión “Básica”']];
/* ---------- Pasar solo los acordes de una letra a otra (sin tocar la letra) ---------- */
const chStrip=l=>l.replace(/\[[^\]]*\]/g,'');
function chList(l){ const out=[]; let pos=0; l.replace(/\[([^\]]*)\]|([^\[]+)/g,(m,c,t)=>{ if(c!=null) out.push({pos,ch:c}); else pos+=t.length; return m; }); return out; }
const chNorm=t=>plainNorm(t).trim().replace(/\s+/g,' ');
function chWords(t){ const w=[]; t.replace(/[\p{L}\p{N}'’]+/gu,(m,i)=>{ w.push({s:i,e:i+m.length,n:chNorm(m)}); return m; }); return w; }
function chSim(a,b){ if(!a.length||!b.length) return 0; const A=new Set(a.map(x=>x.n)), B=new Set(b.map(x=>x.n)); let k=0; for(const x of A) if(B.has(x)) k++; return k/Math.max(A.size,B.size); }
function chPlace(base,src){
  const bw=chWords(base), sw=chWords(src.t); if(!bw.length) return base;
  /* emparejar palabras iguales en orden (LCS) */
  const n=sw.length,m=bw.length,L=Array.from({length:n+1},()=>new Array(m+1).fill(0));
  for(let i=n-1;i>=0;i--) for(let j=m-1;j>=0;j--) L[i][j]=sw[i].n===bw[j].n?L[i+1][j+1]+1:Math.max(L[i+1][j],L[i][j+1]);
  const map=new Array(n).fill(-1); for(let i=0,j=0;i<n&&j<m;){ if(sw[i].n===bw[j].n){ map[i]=j; i++; j++; } else if(L[i+1][j]>=L[i][j+1]) i++; else j++; }
  const at=i=>{ if(map[i]>=0) return map[i]; let a=i-1; while(a>=0&&map[a]<0) a--; let b=i+1; while(b<n&&map[b]<0) b++;
    const ja=a>=0?map[a]:-1, jb=b<n?map[b]:m; const r=(i-a)/((b-a)||1); return Math.max(0,Math.min(m-1,Math.round(ja+(jb-ja)*r))); };
  const ins=[];
  for(const c of src.ch){ let wi=sw.findIndex(w=>c.pos<w.e); if(wi<0){ ins.push({p:base.length,ch:c.ch}); continue; } const off=Math.max(0,c.pos-sw[wi].s); const j=at(wi); ins.push({p:Math.min(bw[j].s+Math.min(off,Math.max(0,bw[j].e-bw[j].s-1)),base.length),ch:c.ch}); }
  let out=base; ins.sort((a,b)=>b.p-a.p); for(const x of ins) out=out.slice(0,x.p)+'['+x.ch+']'+out.slice(x.p); return out;
}
function transferChords(target,source){
  const src=source.split('\n').filter(l=>!/^\s*#/.test(l)&&chStrip(l).trim()&&chList(l).length).map(l=>{ const t=chStrip(l); return {t,w:chWords(t),ch:chList(l)}; });
  let last=-1;
  return target.split('\n').map(line=>{ if(/^\s*#/.test(line)) return line; const base=chStrip(line); if(!base.trim()) return base; const bw=chWords(base);
    let best=-1,bs=0; src.forEach((x,k)=>{ let sc=chSim(bw,x.w); if(k===last+1) sc+=0.05; if(sc>bs){ bs=sc; best=k; } });
    if(best<0||bs<0.5) return base; last=best; return chPlace(base,src[best]); }).join('\n');
}
function chordsResult(c){ const ex=c.dupOf&&c.dupOf.song; if(!ex) return c.body; return transferChords(ex.body||ex.bodyPro||'',c.body); }
function ioDupConfirm(){ const d=IO.chunks.filter(c=>c.include&&c.dup); return `<div class="banner" style="border:2px solid var(--danger);display:grid;gap:8px"><b style="color:var(--danger)">Alto: vas a importar ${d.length} ${d.length===1?'canción que ya existe':'canciones que ya existen'}</b><ul style="margin:0;padding-left:18px">${d.map(c=>`<li>${esc(c.title)} → ${esc(dupLabel(c.dupOf))}</li>`).join('')}</ul><div class="actions"><button class="btn danger" data-act="imp-go-force">Importar de todas formas</button><button class="btn" data-act="imp-dup-off">Desmarcarlas y continuar</button></div></div>`; }
async function ioImport(force){
  const sel=IO.chunks.filter(c=>c.include && c.title.trim()); if(!sel.length) return;
  if(!force&&sel.some(c=>c.dup&&(!c.dupOf||c.dupOf.inBatch))){ IO.confirmDup=true; ioRender(); document.getElementById('imp-list').scrollIntoView({behavior:'smooth'}); return; }
  const btn=document.querySelector('[data-act="imp-go"]'); if(btn) btn.disabled=true; const prog=$('#imp-prog');
  const writes=sel.map(c=>{ const ex=c.dup&&c.dupOf&&!c.dupOf.inBatch?c.dupOf.song:null; const act=ex?c.dupAct:'add';
    const chm=act==='cpro'||act==='cnew'; const body=chm?chordsResult(c):c.body;
    if(ex&&(act==='pro'||act==='cpro'||act==='body')){ const d=JSON.parse(JSON.stringify(ex)); delete d.id; if(act!=='body'){ d.bodyPro=body; } else { d.body=body; if(c.key) d.key=c.key; } d.updatedAt=Date.now(); return {col:'songs',id:ex.id,data:d}; }
    const data={title:c.title.trim(),author:c.author||'',key:c.key||'',category:'',bpm:c.bpm||'',capo:c.capo||0,body:c.body,notes:c.notes||'',updatedAt:Date.now()};
    if(ex&&(act==='new'||act==='cnew')){ data.versionOf=ex.versionOf||ex.id; data.body=body; if(chm||c.dupOf.sim>=0.8) data.title=ex.title; if(!data.author&&ex.author) data.author=ex.author; }
    return {col:'songs',id:newId('c'),data}; });
  let done=0;
  for(let i=0;i<writes.length;i+=50){
    const part=writes.slice(i,i+50);
    try{ const r=await api('/api/batch',{method:'POST',body:JSON.stringify({writes:part})}); done+=part.length; if(prog) prog.textContent=`Guardadas ${done} de ${writes.length}…`; }
    catch(e){ if(e.code===401){ lostAuth(); return; } toast(`Se guardaron ${done} canciones; el resto falló. Inténtalo de nuevo.`); if(btn) btn.disabled=false; await loadData(); return; }
  }
  closeModal(); lastSig=''; await loadData(); const nUp=writes.filter(w=>S.songs.has(w.id)&&sel.some(c=>c.dupOf&&c.dupOf.song&&c.dupOf.song.id===w.id)).length; toast(`${done} ${done===1?'canción guardada':'canciones guardadas'}${nUp?` (${nUp} ${nUp===1?'actualizada':'actualizadas'})`:''}.`);
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
  if(!S.canWrite) return;
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
  if(!S.canWrite) return;
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

document.addEventListener('click',ev=>{ const el=ev.target.closest('[data-act]'); if(!el) return;
  if(el.dataset.act==='imp-go-force'){ IO.confirmDup=false; ioImport(true); }
  else if(el.dataset.act==='imp-dup-off'){ IO.chunks.forEach(c=>{ if(c.dup) c.include=false; }); IO.confirmDup=false; ioRender(); }
});

function ioDoubtBanner(){
  const disc=IO.discarded?`<div class="banner muted">No tomé en cuenta ${IO.discarded} ${IO.discarded===1?'fragmento':'fragmentos'} sin forma de canción (números sueltos, acordes o una sola línea).</div>`:'';
  return disc+ioDoubtBanner2();
}
function ioDoubtBanner2(){
  const nd=IO.chunks.filter(c=>c.doubts&&c.doubts.length).length; const miss=IO.missing||[];
  return (nd?`<div class="banner ask-banner"><b>Necesito tu ayuda con ${nd} ${nd===1?'parte':'partes'} antes de importarlas.</b> No estoy seguro de dónde empiezan o terminan. Mientras no me respondas, no se importan.
    <div class="actions" style="margin-top:6px"><button class="btn" data-act="imp-only-doubts">${IO.onlyDoubts?'Ver todas':'Ver solo las dudas'}</button></div></div>`:'')
   +(miss.length?`<div class="banner"><b>Del índice no encontré ${miss.length}:</b> ${esc(miss.slice(0,15).join(' · '))}${miss.length>15?'…':''}. Puede que estén en una página escaneada o con otro formato.</div>`:'');
}
document.addEventListener('click',ev=>{ const el=ev.target.closest('[data-act]'); if(!el) return; const a=el.dataset.act, i=+el.dataset.i, c=IO.chunks[i];
  if(a==='imp-ok'&&c){ c.doubts=[]; c.include=!c.dup; ioRender(); }
  else if(a==='imp-drop'&&c){ IO.chunks.splice(i,1); ioRender(); }
  else if(a==='imp-merge'&&c&&i>0){ const p=IO.chunks[i-1]; p.body=(p.body+'\n\n'+(c.title?'# '+c.title+'\n':'')+c.body).trim(); IO.chunks.splice(i,1); ioRender(); toast('Unida con “'+p.title+'”.'); }
  else if(a==='imp-only-doubts'){ IO.onlyDoubts=!IO.onlyDoubts; ioRender(); }
});

document.addEventListener('click',e=>{ const b=e.target.closest('[data-act^="imp-"]'); if(!b) return; const a=b.dataset.act; const c=IO.chunks[+b.dataset.i];
  if(a==='imp-cmp'&&c){ c.cmp=!c.cmp; if(c.cmp&&!c.cmpTab) c.cmpTab='ex'; ioRender(); }
  else if(a==='imp-tab'&&c){ c.cmpTab=b.dataset.t; ioRender(); }
  else if(a==='imp-usetitle'&&c){ c.title=c.dupOf.song.title; ioRender(); }
  else if(a==='imp-shift'){ ioShiftApply(+b.dataset.d); } });
/* Si los títulos quedaron corridos (la letra de cada una con el título de la vecina) */
function ioShiftGuess(){ const C=IO.chunks; if(C.length<3) return null; const sure=C.filter(c=>c.dupOf&&!c.dupOf.inBatch&&c.dupOf.sim>=0.8); if(sure.length<2) return null;
  for(const d of [1,-1]){ let n=0; C.forEach((c,i)=>{ if(c.dupOf&&!c.dupOf.inBatch&&c.dupOf.sim>=0.8&&C[i+d]&&chNorm(C[i+d].title)===chNorm(c.dupOf.song.title)) n++; }); if(n>=2&&n>=sure.length*0.4) return {d,n}; } return null; }
function ioShiftApply(d){ const T=IO.chunks.map(c=>c.title); IO.chunks.forEach((c,i)=>{ if(T[i+d]!=null) c.title=T[i+d]; });
  IO.chunks.forEach((c,i)=>{ const keep=c.dupAct; c.dupOf=findDuplicate(c,[...S.songs.values()]); c.dup=!!c.dupOf; if(c.dup){ c.dupAct=keep||'skip'; c.include=c.dupAct!=='skip'; } else { delete c.dupAct; c.include=!!c.body.trim(); } });
  toast('Títulos corregidos. Revisa la lista.'); ioRender(); }
(function(){ const st=document.createElement('style'); st.textContent=`
.dupbar{border:1px solid var(--accent);display:grid;gap:4px}
.dupact{grid-column:1/-1;display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.dupact select{flex:1;min-width:220px;padding:7px 8px;border-radius:8px;border:1px solid var(--line);background:var(--surface);color:inherit;font:inherit;font-size:13.5px}
.cmp{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr;gap:10px}
.cmp.three{grid-template-columns:1fr 1fr 1fr}
.cmp-tabs{grid-column:1/-1;display:none;gap:4px}
.cmp-tabs button{flex:1;border:1px solid var(--line);background:var(--surface);color:var(--muted);border-radius:8px;padding:8px 4px;font:600 13px var(--f-ui);cursor:pointer}
.cmp-tabs button[aria-pressed="true"]{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
.tmis{grid-column:1/-1;font-size:13px;color:#e0a43a;display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.shiftbar{border:1px solid #e0a43a;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.cmp h4{margin:4px 0;font-size:12.5px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
.cmp pre,.cmp textarea{margin:0;max-height:320px;min-height:220px;overflow:auto;white-space:pre-wrap;font:12.5px/1.45 var(--f-mono);background:var(--sunk);border:1px solid var(--line);border-radius:8px;padding:8px;width:100%;box-sizing:border-box;color:inherit}
@media (max-width:760px){.cmp,.cmp.three{grid-template-columns:1fr}.cmp-tabs{display:flex}.cmp.t-ex>div:not(.p-ex),.cmp.t-pdf>div:not(.p-pdf),.cmp.t-res>div:not(.p-res){display:none}}
`; document.head.appendChild(st); })();
