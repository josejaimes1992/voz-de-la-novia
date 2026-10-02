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
function wordsToText(words){
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
