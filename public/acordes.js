/* Voz de la Novia — diagramas y sonido de acordes.
   Posiciones de guitarra y ukelele: chords-db (MIT, David Rubert), ver chords-LICENSE.txt */
(function(){
"use strict";
const SHARP=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLAT =['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];

/* Intervalos para piano y para cuando no hay posición en la base */
const IV={major:[0,4,7],minor:[0,3,7],dim:[0,3,6],dim7:[0,3,6,9],aug:[0,4,8],'5':[0,7],'6':[0,4,7,9],m6:[0,3,7,9],
  '7':[0,4,7,10],maj7:[0,4,7,11],m7:[0,3,7,10],m7b5:[0,3,6,10],mmaj7:[0,3,7,11],sus2:[0,2,7],sus4:[0,5,7],sus:[0,5,7],
  '7sus4':[0,5,7,10],'9':[0,4,7,10,14],maj9:[0,4,7,11,14],m9:[0,3,7,10,14],add9:[0,4,7,14],madd9:[0,3,7,14],
  '11':[0,4,7,10,14,17],m11:[0,3,7,10,14,17],'13':[0,4,7,10,14,21],'69':[0,4,7,9,14],m69:[0,3,7,9,14],'7b9':[0,4,7,10,13],'7#9':[0,4,7,10,15]};

/* Sufijo escrito en la canción → sufijo de la base */
function normSuffix(raw){
  let s=(raw||'').replace(/[()\s]/g,'');
  const map={'':'major','M':'major','maj':'major','m':'minor','min':'minor','-':'minor','mi':'minor',
    'M7':'maj7','Maj7':'maj7','7M':'maj7','maj7':'maj7','Δ':'maj7','Δ7':'maj7',
    '°':'dim','º':'dim','dim':'dim','°7':'dim7','º7':'dim7','dim7':'dim7',
    'ø':'m7b5','ø7':'m7b5','m7b5':'m7b5','m7-5':'m7b5','+':'aug','aug':'aug','+5':'aug',
    'sus':'sus','sus4':'sus4','4':'sus4','sus2':'sus2','2':'sus2','7sus':'7sus4','7sus4':'7sus4','74':'7sus4',
    'add9':'add9','add2':'add9','madd9':'madd9','madd2':'madd9','m2':'madd9','m9':'m9','maj9':'maj9','M9':'maj9',
    '6':'6','m6':'m6','69':'69','6/9':'69','m69':'m69','7':'7','9':'9','11':'11','m11':'m11','13':'13','5':'5',
    'm7':'m7','mmaj7':'mmaj7','mM7':'mmaj7','mmaj':'mmaj7','7b9':'7b9','7#9':'7#9'};
  if(s in map) return map[s];
  if(/^m(?!aj)/.test(s)) return /7/.test(s)?'m7':'minor';
  if(/maj7|M7/.test(s)) return 'maj7';
  if(/7/.test(s)) return '7';
  return 'major';
}
function chordName(root,raw,bass,flat){
  const n=flat?FLAT:SHARP; return n[root]+(raw||'')+(bass!=null&&bass!==root?'/'+n[bass]:'');
}

let DB=null, loading=null;
function load(){ if(DB) return Promise.resolve(DB); if(!loading) loading=fetch('/chords.json?v=1').then(r=>r.json()).then(d=>{DB=d; return d;}).catch(()=>{ loading=null; return null; }); return loading; }

/* Devuelve las posiciones posibles para guitarra/ukelele */
function positions(inst,root,raw,bass){
  if(!DB||!DB[inst]) return [];
  const byRoot=DB[inst][String(root)]||{}; const suf=normSuffix(raw);
  if(bass!=null && bass!==root){
    const pre=suf==='minor'?'m/':(suf==='major'?'/':null);
    if(pre){ for(const nm of [SHARP[bass],FLAT[bass]]){ const p=byRoot[pre+nm]; if(p&&p.length) return p; } }
  }
  return byRoot[suf]||byRoot[suf==='sus'?'sus4':suf]||byRoot[suf.startsWith('m')&&suf!=='maj7'&&suf!=='maj9'?'minor':'major']||[];
}
function pianoNotes(root,raw,bass){
  const iv=IV[normSuffix(raw)]||IV.major; const notes=iv.map(i=>60+root+i);
  if(bass!=null&&bass!==root) notes.unshift(48+bass); else notes.unshift(48+root);
  return notes;
}

/* ---------- Dibujos ---------- */
function fretChar(c){ return c==='x'?-1:(c>='a'?c.charCodeAt(0)-87:Number(c)); }
function fretSVG(pos,strings,size){
  const [fr,fi,base,barres]=pos; const frets=[...fr].map(fretChar); const fingers=[...fi].map(Number);
  const W=size||120, padX=16, top=26, rows=4, sp=(W-2*padX)/(strings-1), fh=sp*1.15, H=top+rows*fh+18;
  let s=`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="cd-svg" aria-hidden="true">`;
  const nutW=base===1?4:1;
  s+=`<rect x="${padX}" y="${top-nutW}" width="${(strings-1)*sp}" height="${nutW}" fill="currentColor"/>`;
  for(let r=1;r<=rows;r++) s+=`<line x1="${padX}" x2="${padX+(strings-1)*sp}" y1="${top+r*fh}" y2="${top+r*fh}" stroke="currentColor" stroke-opacity=".45" stroke-width="1"/>`;
  for(let i=0;i<strings;i++) s+=`<line x1="${padX+i*sp}" x2="${padX+i*sp}" y1="${top}" y2="${top+rows*fh}" stroke="currentColor" stroke-opacity=".7" stroke-width="${1+ (strings-1-i)*0.12}"/>`;
  if(base>1) s+=`<text x="${padX-5}" y="${top+fh*0.65}" font-size="10" text-anchor="end" fill="currentColor" font-family="sans-serif">${base}</text>`;
  (barres||[]).forEach(b=>{ const idx=frets.map((f,i)=>f===b?i:-1).filter(i=>i>=0); if(idx.length<2) return; const a=Math.min(...idx), z=Math.max(...idx);
    s+=`<rect x="${padX+a*sp-sp*0.32}" y="${top+(b-0.5)*fh-sp*0.32}" width="${(z-a)*sp+sp*0.64}" height="${sp*0.64}" rx="${sp*0.32}" fill="var(--cd-dot,currentColor)"/>`; });
  frets.forEach((f,i)=>{ const x=padX+i*sp;
    if(f<0) s+=`<text x="${x}" y="${top-8}" font-size="11" text-anchor="middle" fill="currentColor" fill-opacity=".7" font-family="sans-serif">×</text>`;
    else if(f===0) s+=`<circle cx="${x}" cy="${top-11}" r="${sp*0.2}" fill="none" stroke="currentColor" stroke-width="1.3"/>`;
    else { const isBar=(barres||[]).includes(f)&&frets.filter(v=>v===f).length>1;
      if(!isBar) s+=`<circle cx="${x}" cy="${top+(f-0.5)*fh}" r="${sp*0.32}" fill="var(--cd-dot,currentColor)"/>`;
      if(fingers[i]) s+=`<text x="${x}" y="${top+(f-0.5)*fh+3.5}" font-size="${Math.max(8,sp*0.42)}" text-anchor="middle" fill="var(--cd-dot-ink,#fff)" font-family="sans-serif" font-weight="700">${fingers[i]}</text>`; }
  });
  return s+'</svg>';
}
function pianoSVG(notes,size){
  const W=size||150, white=14, ww=W/white, wh=ww*4.2, bh=wh*0.6, bw=ww*0.62, H=wh+4;
  const on=new Set(notes);
  const isBlack=p=>[1,3,6,8,10].includes(p%12);
  let s=`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="cd-svg" aria-hidden="true">`;
  let wi=0; const wx={};
  for(let p=0;p<24;p++){ if(isBlack(p)) continue; wx[p]=wi*ww;
    s+=`<rect x="${wi*ww+0.5}" y="0.5" width="${ww-1}" height="${wh}" rx="2" fill="${on.has(p)?'var(--cd-hi,#c90)':'var(--cd-key,#fff)'}" stroke="currentColor" stroke-opacity=".5"/>`; wi++; }
  for(let p=0;p<24;p++){ if(!isBlack(p)) continue; const x=wx[p-1]+ww-bw/2;
    s+=`<rect x="${x}" y="0.5" width="${bw}" height="${bh}" rx="1.5" fill="${on.has(p)?'var(--cd-hi,#c90)':'currentColor'}" stroke="currentColor" stroke-opacity=".6"/>`; }
  return s+'</svg>';
}
function diagram(inst,root,raw,bass,vi=0,size){
  if(inst==='piano'){ const iv=IV[normSuffix(raw)]||IV.major; const pos=iv.map(i=>{ let p=root+i; while(p>=24) p-=12; return p; });
    if(bass!=null&&bass!==root) pos.push(bass<root?bass:bass); return pianoSVG(pos,size); }
  const ps=positions(inst,root,raw,bass); if(!ps.length) return '<div class="cd-none">Sin diagrama</div>';
  return fretSVG(ps[vi%ps.length], inst==='ukulele'?4:6, size);
}
function count(inst,root,raw,bass){ return inst==='piano'?1:positions(inst,root,raw,bass).length; }

/* ---------- Sonido ---------- */
let ctx=null, master=null; const cache=new Map();
let unlocked=false;
function unlockMedia(){
  if(unlocked) return; unlocked=true;
  try{ if(navigator.audioSession) navigator.audioSession.type='playback'; }catch{}
  try{ const a=document.createElement('audio'); a.setAttribute('playsinline',''); a.loop=true; a.volume=0.01;
    a.src='data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='; const pr=a.play(); if(pr&&pr.catch) pr.catch(()=>{}); window.__vdnSilent=a; }catch{}
}
function audio(){
  unlockMedia();
  if(!ctx){ const C=window.AudioContext||window.webkitAudioContext; if(!C) return null; ctx=new C({latencyHint:'interactive'});
    master=ctx.createGain(); master.gain.value=1.0; const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=6000;
    const comp=ctx.createDynamicsCompressor(); comp.threshold.value=-18; comp.knee.value=12; comp.ratio.value=4; comp.attack.value=0.003; comp.release.value=0.25;
    const out=ctx.createGain(); out.gain.value=1.6;
    master.connect(lp); lp.connect(comp); comp.connect(out); out.connect(ctx.destination); }
  return ctx;
}
function whenReady(fn){ const c=audio(); if(!c) return false; if(c.state!=='running'){ c.resume().then(fn,fn); } else fn(); return true; }
function pluck(midi,decay){
  const key=midi+':'+decay; if(cache.has(key)) return cache.get(key);
  const sr=ctx.sampleRate, f=440*Math.pow(2,(midi-69)/12), N=Math.max(2,Math.round(sr/f)), len=Math.floor(sr*2.4);
  const buf=ctx.createBuffer(1,len,sr), d=buf.getChannelData(0); let prev=0;
  for(let i=0;i<N;i++){ const r=Math.random()*2-1; prev=prev*0.55+r*0.45; d[i]=prev; }
  for(let i=N;i<len;i++){ d[i]=decay*0.5*(d[i-N]+d[i-N+1]); }
  let peak=0; for(let i=0;i<len;i++) peak=Math.max(peak,Math.abs(d[i])); if(peak>0) for(let i=0;i<len;i++) d[i]/=peak;
  cache.set(key,buf); return buf;
}
function playPluck(notes,decay,gap,vol){
  const t0=ctx.currentTime+0.02;
  notes.forEach((m,i)=>{ const src=ctx.createBufferSource(); src.buffer=pluck(m,decay); const g=ctx.createGain(); g.gain.value=vol/Math.sqrt(notes.length);
    src.connect(g); g.connect(master); src.start(t0+i*gap); });
}
function playPiano(notes){
  const t0=ctx.currentTime+0.02;
  notes.forEach((m,i)=>{ const f=440*Math.pow(2,(m-69)/12); const g=ctx.createGain(); const peak=0.32/Math.sqrt(notes.length)*(i===0?0.8:1);
    g.gain.setValueAtTime(0.0001,t0); g.gain.exponentialRampToValueAtTime(peak,t0+0.012); g.gain.exponentialRampToValueAtTime(peak*0.35,t0+0.5); g.gain.exponentialRampToValueAtTime(0.0001,t0+2.6);
    g.connect(master);
    [[1,'sine',1],[2,'sine',0.35],[3,'triangle',0.12],[4,'sine',0.06]].forEach(([h,type,a])=>{ const o=ctx.createOscillator(); o.type=type; o.frequency.value=f*h; const ga=ctx.createGain(); ga.gain.value=a; o.connect(ga); ga.connect(g); o.start(t0); o.stop(t0+2.7); });
  });
}
function play(inst,root,raw,bass,vi=0){
  return whenReady(()=>{
    if(inst==='piano'){ playPiano(pianoNotes(root,raw,bass)); return; }
    const ps=positions(inst,root,raw,bass);
    const notes=ps.length?ps[vi%ps.length][4].slice().sort((a,b)=>a-b):pianoNotes(root,raw,bass);
    if(inst==='ukulele') playPluck(notes,0.990,0.022,0.8); else playPluck(notes,0.996,0.028,0.85);
  });
}

function note(midi,inst){ return whenReady(()=>{ if(inst==='piano') playPiano([midi]); else playPluck([midi],0.997,0,0.9); }); }
function tone(freq,secs){ return whenReady(()=>{ const t0=ctx.currentTime+0.02, o=ctx.createOscillator(), g=ctx.createGain(); o.type='triangle'; o.frequency.value=freq;
  g.gain.setValueAtTime(0.0001,t0); g.gain.exponentialRampToValueAtTime(0.35,t0+0.03); g.gain.setValueAtTime(0.35,t0+secs-0.15); g.gain.exponentialRampToValueAtTime(0.0001,t0+secs); o.connect(g); g.connect(master); o.start(t0); o.stop(t0+secs+0.05); }); }

/* ---------- Metrónomo ---------- */
const metro={on:false,bpm:80,beat:0,next:0,timer:null,onBeat:null};
function clickAt(t,accent){ const o=ctx.createOscillator(), g=ctx.createGain(); o.frequency.value=accent?1600:1000;
  g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(accent?0.5:0.3,t+0.002); g.gain.exponentialRampToValueAtTime(0.0001,t+0.06);
  o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t+0.07); }
function metroStart(bpm,onBeat){
  if(!audio()) return false; if(ctx.state!=='running') ctx.resume(); metroStop(); metro.on=true; metro.bpm=bpm; metro.beat=0; metro.next=ctx.currentTime+0.06; metro.onBeat=onBeat;
  metro.timer=setInterval(()=>{ while(metro.next<ctx.currentTime+0.12){ const b=metro.beat%4; clickAt(metro.next,b===0);
      const delay=Math.max(0,(metro.next-ctx.currentTime)*1000); setTimeout(()=>metro.onBeat&&metro.onBeat(b),delay);
      metro.next+=60/metro.bpm; metro.beat++; } },25);
  return true;
}
function metroStop(){ if(metro.timer) clearInterval(metro.timer); metro.timer=null; metro.on=false; }

window.Acordes={note,tone,load,diagram,count,play,positions,normSuffix,chordName,metroStart,metroStop,metro,ready:()=>!!DB};
})();
