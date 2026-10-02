/* Voz de la Novia — lector de himnarios: usa el índice para saber dónde empieza y termina cada canción,
   une la página con acordes y la página de solo letra, y reconoce estrofas (I, II…), coros y notas. */
"use strict";
const HYM_INDEX_RE=/^\s*(.{3,}?)\s*[.·…_]{4,}\s*(\d{1,4})\s*$/;
const HYM_ROMAN=/^(I|II|III|IV|V|VI|VII|VIII|IX|X)\.?$/;
const HYM_CREDIT=/^(alabanza\s+compuesta|compuesta\s+por|composici[oó]n|autor(?:a)?\s*:|letra\s+y\s+m[uú]sica|m[uú]sica\s*:|letra\s*:|arreglo)/i;

function hymNorm(t){ return norm(t).replace(/[^a-z0-9ñ]+/g,' ').trim(); }
function hymSep(tok){ return /^[–—\-~|/·•]+$/.test(tok)||/^\/\/$/.test(tok); }
function hymIsChordLine(line){
  const toks=line.trim().split(/\s+/).filter(t=>t&&!hymSep(t)&&!/^(x\d+|\(x?\d+\)|\d+x)$/i.test(t));
  return toks.length>0 && toks.every(t=>parseChord(t.replace(/^\(|\)$/g,'').replace(/[,;.]$/,'')));
}
/* Si una línea de acordes termina con "~ texto", se queda con la parte de acordes */
function hymChordPart(line){
  const i=line.indexOf('~'); const left=i>=0?line.slice(0,i):line;
  if(left.trim()&&hymIsChordLine(left)) return left.replace(/[–—~]/g,' ').replace(/(^|\s)-(?=\s|$)/g,'$1 ').replace(/\s+$/,'');
  return null;
}
function hymHeader(t){
  const s=t.trim(); if(!s) return null;
  let m;
  if(HYM_ROMAN.test(s)) return 'Estrofa '+s.replace('.','');
  if((m=/^estrofa\s+([ivx\d]+)\.?$/i.exec(s))) return 'Estrofa '+m[1].toUpperCase();
  if((m=/^pre[-\s]?coro\b(.*)$/i.exec(s))) return 'Pre-coro'+m[1].replace(/:$/,'');
  if((m=/^coro\b(\s+[ivx\d]+)?\s*(\(.*\))?\s*:?$/i.exec(s))) return 'Coro'+(m[1]?m[1].toUpperCase():'')+(m[2]?' '+m[2]:'');
  if((m=/^(puente|intro|introducci[oó]n|final|interludio|outro)\b(.*)$/i.exec(s)) && s.length<40) return m[1].charAt(0).toUpperCase()+m[1].slice(1).toLowerCase()+m[2].replace(/:$/,'');
  if(/^si\s+(se\s+)?repite/i.test(s)) return s.replace(/:$/,'').replace(/^./,c=>c.toUpperCase());
  return null;
}
function hymFooter(lines){
  const L=lines.slice(); let num=null; const credits=[];
  while(L.length&&!L[L.length-1].trim()) L.pop();
  if(L.length&&/^\s*\d{1,4}\s*$/.test(L[L.length-1])){ num=Number(L.pop().trim()); }
  for(let k=0;k<4;k++){ while(L.length&&!L[L.length-1].trim()) L.pop(); if(L.length&&HYM_CREDIT.test(L[L.length-1].trim())) credits.unshift(L.pop().trim()); else break; }
  return {lines:L,num,credits};
}
function hymFindIndex(pages){
  const entries=[], indexPages=new Set();
  pages.forEach((p,i)=>{ const hits=[]; for(const l of p.split('\n')){ const m=HYM_INDEX_RE.exec(l); if(m) hits.push({title:m[1].trim(),page:Number(m[2])}); } if(hits.length>=3){ indexPages.add(i); entries.push(...hits); } });
  return {entries,indexPages};
}
function hymPageMap(pages){
  const nums=pages.map(p=>hymFooter(p.split('\n')).num);
  const off={}; nums.forEach((n,i)=>{ if(n!=null){ const o=i-n; off[o]=(off[o]||0)+1; } });
  const best=Object.entries(off).sort((a,b)=>b[1]-a[1])[0]; const offset=best?Number(best[0]):0;
  return {toIdx:n=>{ const i=nums.indexOf(n); return i>=0?i:n+offset; },nums};
}
/* Una página con acordes encima de la letra */
function hymChordPage(lines){
  const out=[]; let key='', titleLine=null, repeat=[];
  let i=0; while(i<lines.length&&!lines[i].trim()) i++;
  if(i<lines.length && !hymIsChordLine(lines[i])){ titleLine=lines[i].trim(); i++;
    const m=/\(([A-G][#b]?m?)\)\s*$/.exec(titleLine)||/:\s*([A-Za-z#bé]+m?)\s*$/.exec(titleLine); if(m){ const k=parseKey(m[1]); if(k) key=keyCanon(k.idx,k.minor); } }
  for(;i<lines.length;i++){
    const raw=lines[i].replace(/\s+$/,''), t=raw.trim();
    if(!t){ out.push(''); continue; }
    if(/^~/.test(t)){ continue; }
    if(/^\(.*(misma|mismos|igual).*\)$/i.test(t)){ repeat.push(t.slice(1,-1)); continue; }
    const h=hymHeader(t); if(h){ out.push('# '+h); continue; }
    const cp=hymChordPart(raw); if(cp!==null){ out.push(cp); continue; }
    out.push(raw);
  }
  const body=convertChordsOverLyrics(out.join('\n')).replace(/\n{3,}/g,'\n\n').trim();
  return {body,key,titleLine,repeat};
}
/* Una página de solo letra (texto centrado) dividida en secciones */
function hymLyricPage(lines,title){
  const secs=[]; let cur={h:null,lines:[]}; let skippedTitle=false;
  for(const raw of lines){
    const t=raw.trim();
    if(!skippedTitle&&t){ skippedTitle=true; if(hymNorm(t)===hymNorm(title)||hymNorm(title).startsWith(hymNorm(t))||hymNorm(t).startsWith(hymNorm(title).split(' (')[0])) continue; }
    const h=hymHeader(t);
    if(h){ if(cur.h||cur.lines.some(x=>x)) secs.push(cur); cur={h,lines:[]}; continue; }
    cur.lines.push(t);
  }
  if(cur.h||cur.lines.some(x=>x)) secs.push(cur);
  secs.forEach(s=>{ while(s.lines.length&&!s.lines[0]) s.lines.shift(); while(s.lines.length&&!s.lines[s.lines.length-1]) s.lines.pop(); });
  return secs.filter(s=>s.lines.length);
}
function hymCountChordLines(lines){ return lines.filter(l=>l.trim()&&(hymIsChordLine(l)||hymChordPart(l)!==null)).length; }

function hymnalParse(pages,fileName){
  const {entries,indexPages}=hymFindIndex(pages); if(entries.length<3) return null;
  const map=hymPageMap(pages);
  const list=entries.map(e=>({...e,idx:map.toIdx(e.page)})).filter(e=>e.idx>=0&&e.idx<pages.length&&!indexPages.has(e.idx)).sort((a,b)=>a.idx-b.idx);
  const songs=[];
  list.forEach((e,n)=>{
    const end=n+1<list.length?list[n+1].idx-1:pages.length-1;
    const chordPages=[], lyricPages=[], credits=[];
    for(let p=e.idx;p<=end;p++){
      if(indexPages.has(p)) continue;
      const f=hymFooter(pages[p].split('\n')); credits.push(...f.credits);
      if(!f.lines.some(l=>l.trim())) continue;
      (hymCountChordLines(f.lines)>=2?chordPages:lyricPages).push(f.lines);
    }
    const title=e.title.replace(/\s+/g,' ');
    let body='', key='';
    const lyr=hymLyricPage(lyricPages.flat(),title);
    if(chordPages.length){
      const cp=hymChordPage(chordPages.flat()); key=cp.key; body=cp.body;
      const have=new Set((body.match(/^#\s*(.+)$/gm)||[]).map(h=>hymNorm(h.replace(/^#\s*/,'').replace(/\(.*\)/,''))));
      const firstIsI=lyr.length&&lyr[0].h&&/^Estrofa I$/.test(lyr[0].h);
      if(firstIsI && !/^#/.test(body)) { body='# Estrofa I\n'+body; have.add('estrofa i'); }
      const extra=lyr.filter(s=>s.h && !have.has(hymNorm(s.h.replace(/\(.*\)/,''))) && !/^Coro$/.test(s.h) && !/^Estrofa I$/.test(s.h));
      if(extra.length){
        const note=cp.repeat.length?' (mismos acordes)':'';
        body+='\n\n'+extra.map(s=>`# ${s.h}${/^Estrofa/.test(s.h)?note:''}\n${s.lines.join('\n')}`).join('\n\n');
      }
    } else {
      body=lyr.map(s=>(s.h?`# ${s.h}\n`:'')+s.lines.join('\n')).join('\n\n');
    }
    const author=(credits.find(c=>/compuesta|autor|letra y m/i.test(c))||'').replace(/^(alabanza\s+)?compuesta\s+por\s*/i,'').replace(/^autor(a)?\s*:\s*/i,'').trim();
    songs.push({title:niceCase(title),author,key,bpm:'',capo:0,body:body.trim(),notes:[credits.filter(c=>!/compuesta|autor/i.test(c)).join(' · '),`Importado de “${fileName}”, pág. ${e.page}.`].filter(Boolean).join(' '),hasChords:chordPages.length>0});
  });
  return songs;
}

/* ---------- Texto a partir de palabras con posición (PDF) ----------
   words: [[x0,y0,x1,y1,texto],...] de una página. Agrupa en líneas y, cuando una línea es de acordes,
   coloca cada acorde sobre la letra de la línea siguiente según su posición real en la página. */
function wordsToTextSimple(words){
  if(!words||!words.length) return '';
  const ws=words.map(w=>({x0:+w[0],y0:+w[1],x1:+w[2],y1:+w[3],t:String(w[4])})).filter(w=>w.t.trim());
  ws.sort((a,b)=>a.y0-b.y0||a.x0-b.x0);
  const lines=[];
  for(const w of ws){ const h=w.y1-w.y0; const L=lines.find(l=>Math.abs(l.y0-w.y0)<=Math.max(1.5,h*0.3)); if(L){ L.w.push(w); L.y1=Math.max(L.y1,w.y1); } else lines.push({y0:w.y0,y1:w.y1,w:[w]}); }
  lines.sort((a,b)=>a.y0-b.y0); lines.forEach(l=>l.w.sort((a,b)=>a.x0-b.x0));
  const hs=lines.map(l=>l.y1-l.y0).sort((a,b)=>a-b); const lh=hs[Math.floor(hs.length/2)]||12;
  const isChordWords=l=>{ const toks=l.w.map(w=>w.t).filter(t=>!hymSep(t)); return toks.length>0&&toks.every(t=>parseChord(t.replace(/^\(|\)$/g,'').replace(/[,;.]$/,''))); };
  const minX=Math.min(...ws.map(w=>w.x0));
  const plain=l=>{ let s=''; let prev=null; for(const w of l.w){ if(prev){ const cw=(prev.x1-prev.x0)/Math.max(1,prev.t.length); const gap=w.x0-prev.x1; s+=gap>cw*3?'   ':' '; } s+=w.t; prev=w; } return s; };
  const out=[]; let prevY1=null;
  for(let i=0;i<lines.length;i++){
    const l=lines[i];
    if(prevY1!=null && l.y0-prevY1>lh*0.9) out.push('');
    const next=lines[i+1];
    if(isChordWords(l) && next && !isChordWords(next) && next.y0-l.y1<lh*1.2){
      /* línea de letra con columnas conocidas */
      let lyric=''; const cols=[]; let prev=null;
      for(const w of next.w){ if(prev) lyric+=' '; cols.push({w,start:lyric.length}); lyric+=w.t; prev=w; }
      const avg=(next.w.reduce((a,w)=>a+(w.x1-w.x0),0)/Math.max(1,next.w.reduce((a,w)=>a+w.t.length,0)))||5;
      const place=[];
      for(const c of l.w){ if(hymSep(c.t)) continue; const x=c.x0; let col;
        const hit=cols.find(k=>x>=k.w.x0-avg*0.5&&x<k.w.x1);
        if(hit){ let off=Math.round((x-hit.w.x0)/((hit.w.x1-hit.w.x0)/hit.w.t.length)); off=Math.max(0,Math.min(hit.w.t.length-1,off)); if(off<=1) off=0; col=hit.start+off; }
        else if(x<next.w[0].x0){ col=0; }
        else { const before=[...cols].reverse().find(k=>k.w.x1<=x); col=before?before.start+before.w.t.length+Math.max(1,Math.round((x-before.w.x1)/avg)):lyric.length+1; }
        place.push({col,t:c.t}); }
      let ch=''; for(const p of place){ const col=Math.max(p.col,ch.length?ch.length+1:0); ch=ch.padEnd(col,' ')+p.t; }
      out.push(ch); out.push(lyric); prevY1=next.y1; i++; continue;
    }
    if(isChordWords(l)){ out.push(l.w.filter(w=>!hymSep(w.t)).map(w=>w.t).join(' ')); prevY1=l.y1; continue; }
    out.push(plain(l)); prevY1=l.y1;
  }
  return out.join('\n');
}

/* Detecta páginas a dos columnas (una franja vertical vacía en el centro) y las lee columna por columna */
function wordsToText(words){
  if(!words||words.length<20) return wordsToTextSimple(words);
  const ws=words.filter(w=>String(w[4]).trim()); const minX=Math.min(...ws.map(w=>+w[0])), maxX=Math.max(...ws.map(w=>+w[2])); const W=maxX-minX; if(W<=0) return wordsToTextSimple(words);
  const bins=200, cover=new Array(bins).fill(0);
  for(const w of ws){ const a=Math.max(0,Math.floor((+w[0]-minX)/W*bins)), b=Math.min(bins-1,Math.floor((+w[2]-minX)/W*bins)); for(let i=a;i<=b;i++) cover[i]++; }
  let best=-1, bestVal=Infinity;
  for(let i=Math.floor(bins*0.3);i<=Math.floor(bins*0.7);i++){ if(cover[i]<bestVal){ bestVal=cover[i]; best=i; } }
  if(best<0||bestVal>ws.length*0.03) return wordsToTextSimple(words);
  const gx=minX+(best+0.5)/bins*W;
  const left=ws.filter(w=>+w[2]<=gx), right=ws.filter(w=>+w[0]>=gx), cross=ws.filter(w=>+w[0]<gx&&+w[2]>gx);
  if(left.length<ws.length*0.2||right.length<ws.length*0.2) return wordsToTextSimple(words);
  /* Palabras que cruzan el centro (encabezados a todo el ancho) van arriba o abajo según su posición */
  const colTop=Math.min(...left.concat(right).map(w=>+w[1]));
  const crossTop=cross.filter(w=>+w[1]<=colTop+2), crossBot=cross.filter(w=>+w[1]>colTop+2);
  const lineOf=w=>Math.round(+w[1]); const crossLines=new Set(cross.map(lineOf));
  /* Las palabras de una línea que cruza se quedan con esa línea */
  const pull=arr=>arr.filter(w=>!crossLines.has(lineOf(w)));
  const keepTop=crossTop.concat(left.concat(right).filter(w=>crossTop.some(c=>lineOf(c)===lineOf(w))));
  const keepBot=crossBot.concat(left.concat(right).filter(w=>crossBot.some(c=>lineOf(c)===lineOf(w))));
  return [wordsToTextSimple(keepTop),wordsToTextSimple(pull(left)),wordsToTextSimple(pull(right)),wordsToTextSimple(keepBot)].filter(t=>t.trim()).join('\n\n');
}

/* ---------- Himnarios numerados ("2  HALLÉ UN BUEN AMIGO   H/FA") ---------- */
const NUM_HEAD=/^\s*(\d{1,4})\s*[.)\-–]?\s+([^\d].{1,90}?)(?:\s+([A-ZÁÉ]{1,3})\s*\/\s*([A-Za-zé#♯b♭]{1,5}m?))?\s*$/;
const LAT_KEY={DO:0,RE:2,MI:4,FA:5,SOL:7,LA:9,SI:11,C:0,D:2,E:4,F:5,G:7,A:9,B:11};
function keyFromCode(code){
  if(!code) return ''; const m=/^(DO|RE|MI|FA|SOL|LA|SI|[A-G])(#|♯|B|♭)?(M|MENOR)?$/i.exec(code.trim().toUpperCase().replace('É','E'));
  if(!m) return ''; let i=LAT_KEY[m[1].toUpperCase()]; if(m[2]) i=(i+(m[2]==='#'||m[2]==='♯'?1:11))%12; return keyCanon(i,!!m[3]);
}
function isUpperish(t){ const L=t.replace(/[^A-Za-zÁÉÍÓÚÑÜáéíóúñü]/g,''); if(L.length<3) return false; const up=L.replace(/[^A-ZÁÉÍÓÚÑÜ]/g,'').length; return up/L.length>0.85; }
function isNoiseLine(t){ const toks=t.trim().split(/\s+/); if(toks.length>=6&&toks.filter(x=>x.length===1).length/toks.length>=0.8) return true; const c=t.replace(/\s/g,''); if(c.length>=8&&/^(.)\1(?:(.)\2)+$/.test(c)) return true; return false; }
function hymCleanPages(pages){
  /* Quita encabezados y pies que se repiten en muchas páginas, números de página y texto decorativo */
  const keyOf=l=>norm(l).replace(/[^a-z]/g,'');
  const count=new Map(); pages.forEach(p=>{ const seen=new Set(); for(const l of p.split('\n')){ const k=keyOf(l); if(k.length>=6&&!seen.has(k)){ seen.add(k); count.set(k,(count.get(k)||0)+1); } } });
  const rep=new Set([...count].filter(([k,n])=>pages.length>=4&&n>=Math.max(3,pages.length*0.3)).map(([k])=>k));
  return pages.map(p=>{ const L=p.split('\n'); const nz=L.map((l,i)=>l.trim()?i:-1).filter(i=>i>=0); const edge=new Set([...nz.slice(0,2),...nz.slice(-2)]);
    return L.filter((l,i)=>{ const t=l.trim(); if(!t) return true; if(rep.has(keyOf(l))) return false;
      if(edge.has(i)&&/^(\d{1,4}|[ivxlc]+|p[aá]g(ina)?\.?\s*\d+|-\s*\d+\s*-)$/i.test(t)){ const isRomanStanza=/^[ivx]+$/i.test(t)&&nz.indexOf(i)<nz.length-2; if(!isRomanStanza) return false; }
      if(isNoiseLine(t)) return false; return true; }).join('\n'); });
}
function hymFindNumberedIndex(pages){
  const entries=[]; pages.forEach((p,i)=>{ const hits=[]; for(const l of p.split('\n')){ let m=/^\s*(\d{1,4})[.)\-]?\s+(.+?)\s*(?:[.·…_]{2,}|\s{2,})\s*(\d{1,4})\s*$/.exec(l); if(m){ hits.push({num:+m[1],title:m[2].trim(),page:+m[3],pi:i}); continue; } m=HYM_INDEX_RE.exec(l); if(m) hits.push({num:null,title:m[1].trim(),page:+m[2],pi:i}); } if(hits.length>=6) entries.push(...hits); });
  return entries;
}
/* ---------- ¿Esto es letra de canción? ---------- */
const NOTE_WORD=/^(DO|RE|MI|FA|SOL|LA|SI|[A-G])(#|♯|B|♭)?(M|MENOR|MAYOR|7|M7|MAJ7|SUS\d?|DIM|AUG)?$/i;
function hymLyricWords(t){ return String(t).replace(/\[[^\]]*\]/g,' ').split(/\s+/).map(w=>w.replace(/[^\p{L}]/gu,'')).filter(w=>w.length>=2&&!parseChord(w)&&!HYM_ROMAN.test(w.toUpperCase())); }
function isLyricLine(t){ if(/^\s*#/.test(t)) return false; const w=hymLyricWords(t); return w.length>=2||(w.length===1&&w[0].length>=4); }
function lyricCountOf(text){ return String(text).split('\n').filter(isLyricLine).length; }
function hasSongShape(lines){ const n=lines.filter(isLyricLine).length; const sec=lines.some(l=>hymHeader(String(l).replace(/^#\s*/,''))); return n>=3||(n>=2&&sec); }
function validTitle(t){
  const toks=t.split(/\s+/).filter(Boolean); if(!toks.length) return false;
  const words=toks.map(w=>w.replace(/[^\p{L}#♯♭]/gu,'')).filter(w=>w.length>=3&&!NOTE_WORD.test(w)&&!parseChord(w));
  if(!words.length) return false;
  const noteish=toks.filter(w=>{ const c=w.replace(/[^\p{L}#♯♭0-9]/gu,''); return !c||/^\d+$/.test(c)||NOTE_WORD.test(c)||parseChord(c); }).length;
  if(noteish/toks.length>=0.5) return false;
  if(hymHeader(t)) return false;
  return true;
}
/* Quita del cuerpo líneas que no son letra, acordes ni títulos de sección (números sueltos, restos) */
function cleanBodyLines(lines){ return lines.filter(raw=>{ const t=raw.trim(); if(!t) return true; if(hymHeader(t)) return true; if(hymIsChordLine(t)||hymChordPart(raw)!==null) return true; return isLyricLine(t); }); }

function numberedParse(rawPages,fileName){
  const pages=hymCleanPages(rawPages); const index=hymFindNumberedIndex(rawPages);
  const indexPages=new Set(index.map(e=>e.pi));
  const lines=[]; pages.forEach((p,pi)=>{ if(indexPages.has(pi)) return; for(const l of p.split('\n')) lines.push({t:l,pi}); });
  let heads=[];
  lines.forEach((L,i)=>{ const t=L.t.trim(); const m=NUM_HEAD.exec(t); if(!m) return; const title=m[2].trim();
    if(!isUpperish(title)&&!m[3]) return; if(!validTitle(title)) return; if(hymIsChordLine(title)) return;
    heads.push({i,num:+m[1],title,code:m[3]?m[3]+'/'+m[4]:'',key:keyFromCode(m[4]),pi:L.pi}); });
  /* Un encabezado solo cuenta si debajo hay forma de canción (estrofa o coro con letra).
     Si no la hay, no es una canción: sus líneas se quedan con la canción anterior y luego se limpian. */
  for(let pass=0;pass<6;pass++){
    const keep=heads.filter((h,n)=>{ const end=n+1<heads.length?heads[n+1].i:lines.length; return hasSongShape(lines.slice(h.i+1,end).map(l=>l.t)); });
    if(keep.length===heads.length) break; heads=keep;
  }
  if(heads.length<5) return null;
  const out=[];
  heads.forEach((h,n)=>{
    const end=n+1<heads.length?heads[n+1].i:lines.length;
    const body=cleanBodyLines(lines.slice(h.i+1,end).map(l=>l.t));
    while(body.length&&!body[body.length-1].trim()) body.pop();
    const conv=[]; for(const raw of body){ const t=raw.trim(); const hd=hymHeader(t); if(hd){ conv.push('# '+hd); continue; } const cp=hymChordPart(raw); conv.push(cp!==null?cp:t); }
    const text=convertChordsOverLyrics(conv.join('\n')).replace(/\n{3,}/g,'\n\n').trim();
    const lyricCount=lyricCountOf(text);
    const doubts=[];
    const prev=heads[n-1];
    /* Solo pregunto si es probable que una canción se haya "comido" a otra */
    if(prev&&h.num>prev.num+1&&out[n-1]&&out[n-1].lyricCount>40){ const miss=h.num-prev.num-1; out[n-1].doubts.push(`Es larga y después falta ${miss===1?'la n.º '+(prev.num+1):'de la n.º '+(prev.num+1)+' a la '+(h.num-1)}: puede que tenga otra canción pegada al final.`); }
    if(lyricCount>90) doubts.push('Es muy larga: puede que incluya otra canción sin título reconocible.');
    out.push({title:niceCase(h.title),num:h.num,author:'',key:h.key,bpm:'',capo:0,body:text,lyricCount,notes:`N.º ${h.num}${h.code?' · '+h.code:''} · Importado de “${fileName}”.`,hasChords:/\[/.test(text),doubts});
  });
  const found=new Set(heads.map(h=>h.num)); const missing=index.filter(e=>e.num!=null&&!found.has(e.num));
  out.missing=missing.map(e=>`${e.num}. ${e.title}`);
  return out;
}
