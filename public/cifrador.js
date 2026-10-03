/* Voz de la Novia — cifrador: detecta acordes en un audio y los coloca sobre la letra.
   Todo se calcula en el navegador: no sube nada extra al servidor. */
"use strict";
const CIF={};

/* ---------- FFT (radix 2, real) ---------- */
function cifFFT(n){
  const rev=new Uint32Array(n), bits=Math.log2(n);
  for(let i=0;i<n;i++){ let r=0; for(let b=0;b<bits;b++) r|=((i>>b)&1)<<(bits-1-b); rev[i]=r; }
  const cos=new Float64Array(n/2), sin=new Float64Array(n/2); for(let i=0;i<n/2;i++){ cos[i]=Math.cos(2*Math.PI*i/n); sin[i]=-Math.sin(2*Math.PI*i/n); }
  const re=new Float64Array(n), im=new Float64Array(n);
  return function(input,mag){
    for(let i=0;i<n;i++){ re[rev[i]]=input[i]; im[rev[i]]=0; }
    for(let size=2;size<=n;size<<=1){ const half=size>>1, step=n/size;
      for(let i=0;i<n;i+=size){ for(let j=0,k=0;j<half;j++,k+=step){ const a=i+j,b=a+half; const tr=re[b]*cos[k]-im[b]*sin[k], ti=re[b]*sin[k]+im[b]*cos[k]; re[b]=re[a]-tr; im[b]=im[a]-ti; re[a]+=tr; im[a]+=ti; } } }
    for(let i=0;i<n/2;i++) mag[i]=Math.hypot(re[i],im[i]);
  };
}

/* ---------- Análisis: muestras mono -> acordes ---------- */
const CIF_MAJ=[6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88];
const CIF_MIN=[6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17];
function cifCorr(a,b){ const n=a.length; let ma=0,mb=0; for(let i=0;i<n;i++){ ma+=a[i]; mb+=b[i]; } ma/=n; mb/=n; let s=0,sa=0,sb2=0; for(let i=0;i<n;i++){ const x=a[i]-ma,y=b[i]-mb; s+=x*y; sa+=x*x; sb2+=y*y; } return s/Math.sqrt(sa*sb2||1); }
function cifDetectKey(total){
  let best=null; for(let r=0;r<12;r++) for(const minor of [false,true]){ const prof=minor?CIF_MIN:CIF_MAJ; const rot=Array.from({length:12},(_,i)=>prof[(i-r+12)%12]); const c=cifCorr(total,rot); if(!best||c>best.c) best={idx:r,minor,c}; }
  return best;
}
function cifDiatonic(key){
  const tonic=key.minor?(key.idx+3)%12:key.idx; /* relativo mayor */
  const set=new Map(); [[0,false],[2,true],[4,true],[5,false],[7,false],[9,true]].forEach(([d,m])=>set.set(((tonic+d)%12)+(m?'m':''),true));
  return set;
}
function cifAnalyze(x,sr,onProgress){
  const N=8192, hop=2048, nb=N/2, fft=cifFFT(N), win=new Float64Array(N), frame=new Float64Array(N), mag=new Float64Array(nb);
  for(let i=0;i<N;i++) win[i]=0.5-0.5*Math.cos(2*Math.PI*i/(N-1));
  /* qué semitono corresponde a cada banda de frecuencia */
  const pcT=new Int8Array(nb).fill(-1), pcB=new Int8Array(nb).fill(-1), wT=new Float32Array(nb);
  for(let k=1;k<nb;k++){ const f=k*sr/N; const m=69+12*Math.log2(f/440); const d=Math.abs(m-Math.round(m)); if(d>0.42) continue; const pc=((Math.round(m)%12)+12)%12;
    if(f>=110&&f<=2000){ pcT[k]=pc; wT[k]=1-d; } if(f>=41&&f<=200) pcB[k]=pc; }
  const frames=Math.max(1,Math.floor((x.length-N)/hop)+1); const T=[], B=[], E=new Float32Array(frames);
  for(let t=0;t<frames;t++){
    const off=t*hop; let e=0; for(let i=0;i<N;i++){ const v=x[off+i]||0; frame[i]=v*win[i]; e+=v*v; } E[t]=Math.sqrt(e/N);
    fft(frame,mag); const ct=new Float32Array(12), cb=new Float32Array(12);
    for(let k=1;k<nb;k++){ if(pcT[k]>=0) ct[pcT[k]]+=mag[k]*wT[k]; if(pcB[k]>=0) cb[pcB[k]]+=mag[k]; }
    T.push(ct); B.push(cb);
    if(onProgress&&t%200===0) onProgress(t/frames);
  }
  /* suaviza en el tiempo (≈0,5 s) y normaliza */
  const smooth=(arr,w)=>arr.map((_,t)=>{ const o=new Float32Array(12); let n=0; for(let k=Math.max(0,t-w);k<=Math.min(arr.length-1,t+w);k++){ for(let i=0;i<12;i++) o[i]+=arr[k][i]; n++; } for(let i=0;i<12;i++) o[i]/=n; return o; });
  const Ts=smooth(T,2), Bs=smooth(B,2);
  const total=new Array(12).fill(0); Ts.forEach((c,t)=>{ for(let i=0;i<12;i++) total[i]+=c[i]*E[t]; });
  const key=cifDetectKey(total); const dia=cifDiatonic(key);
  const eMax=Math.max(...E)||1;
  /* plantillas: 12 mayores + 12 menores + silencio */
  const states=[]; for(let r=0;r<12;r++){ states.push({r,m:false,pcs:[r,(r+4)%12,(r+7)%12]}); states.push({r,m:true,pcs:[r,(r+3)%12,(r+7)%12]}); }
  const S=states.length; const em=new Array(frames);
  for(let t=0;t<frames;t++){
    const c=Ts[t], b=Bs[t]; let n=0; for(let i=0;i<12;i++) n+=c[i]*c[i]; n=Math.sqrt(n)||1; let bmax=0; for(let i=0;i<12;i++) bmax=Math.max(bmax,b[i]); bmax=bmax||1;
    const row=new Float32Array(S+1);
    for(let s=0;s<S;s++){ const st=states[s]; let dot=0; dot+=c[st.pcs[0]]*1.0+c[st.pcs[1]]*0.85+c[st.pcs[2]]*0.9; const tn=Math.sqrt(1+0.85*0.85+0.9*0.9);
      let sc=dot/(n*tn); sc+=0.18*(b[st.r]/bmax); if(dia.has(st.r+(st.m?'m':''))) sc+=0.06; row[s]=sc; }
    row[S]=E[t]<eMax*0.04?1.2:0.2; em[t]=row;
  }
  /* Viterbi: penaliza los cambios para evitar saltos falsos */
  const P=0.55; let prev=new Float32Array(S+1); const back=[]; for(let s=0;s<=S;s++) prev[s]=em[0][s];
  for(let t=1;t<frames;t++){ let bi=0; for(let s=1;s<=S;s++) if(prev[s]>prev[bi]) bi=s; const cur=new Float32Array(S+1), bk=new Int16Array(S+1);
    for(let s=0;s<=S;s++){ const stay=prev[s], jump=prev[bi]-P; if(stay>=jump){ cur[s]=stay+em[t][s]; bk[s]=s; } else { cur[s]=jump+em[t][s]; bk[s]=bi; } }
    back.push(bk); prev=cur; }
  let s=0; for(let k=1;k<=S;k++) if(prev[k]>prev[s]) s=k; const path=new Int16Array(frames); path[frames-1]=s; for(let t=frames-1;t>0;t--){ s=back[t-1][s]; path[t-1]=s; }
  /* a segmentos */
  const dt=hop/sr, segs=[]; for(let t=0;t<frames;t++){ const st=path[t]; const last=segs[segs.length-1]; if(last&&last.s===st) last.t1=(t+1)*dt+N/sr/2; else segs.push({s:st,t0:t*dt+N/sr/2,t1:(t+1)*dt+N/sr/2}); }
  if(segs.length) segs[0].t0=0;
  /* une segmentos muy cortos con el vecino */
  for(let changed=true;changed;){ changed=false; for(let i=0;i<segs.length;i++){ const g=segs[i]; if(g.t1-g.t0<0.6&&segs.length>1){ const j=i>0?i-1:i+1; const o=segs[j]; o.t0=Math.min(o.t0,g.t0); o.t1=Math.max(o.t1,g.t1); segs.splice(i,1); changed=true; break; } }
    for(let i=1;i<segs.length;i++) if(segs[i].s===segs[i-1].s){ segs[i-1].t1=segs[i].t1; segs.splice(i,1); changed=true; break; } }
  const out=segs.map(g=>g.s===S?{t0:g.t0,t1:g.t1,root:null,minor:false}:{t0:g.t0,t1:g.t1,root:states[g.s].r,minor:states[g.s].m});
  return {key:{idx:key.idx,minor:key.minor},segments:out,duration:x.length/sr};
}
CIF.analyze=cifAnalyze; CIF.detectKey=cifDetectKey;
if(typeof module!=='undefined') module.exports=CIF;

/* ---------- Letra + tiempos + acordes -> cifrado ---------- */
const CIF_N=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
function cifName(seg,shift,flat){ if(seg.root==null) return null; const r=((seg.root+shift)%12+12)%12; const sharp=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'], fl=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B']; return (flat?fl:sharp)[r]+(seg.minor?'m':''); }
/* items: [{type:'sec',text}|{type:'gap'}|{type:'ln',text,t}] ; t = segundo en que empieza la línea (o null) */
function cifBuild(items,segments,duration,opts){
  const shift=opts&&opts.shift||0, flat=!!(opts&&opts.flat);
  const segs=segments.filter(s=>s.root!=null);
  const lines=items.filter(i=>i.type==='ln'&&i.t!=null);
  const durs=[]; for(let i=0;i+1<lines.length;i++) durs.push(lines[i+1].t-lines[i].t); durs.sort((a,b)=>a-b);
  const med=durs.length?durs[Math.floor(durs.length/2)]:4;
  const chordsIn=(a,b)=>segs.filter(s=>s.t1>a+0.15&&s.t0<b-0.15);
  const chordLine=list=>{ const names=[]; for(const s of list){ const n=cifName(s,shift,flat); if(n&&names[names.length-1]!==n) names.push(n); } return names.length?names.map(n=>`[${n}]`).join(' '):''; };
  const out=[];
  if(lines.length){ const intro=chordLine(chordsIn(0,lines[0].t)); if(intro&&lines[0].t>1.5){ out.push('# Intro'); out.push(intro); out.push(''); } }
  for(let k=0;k<items.length;k++){
    const it=items[k];
    if(it.type==='sec'){ out.push('# '+it.text); continue; }
    if(it.type==='gap'){ if(out.length&&out[out.length-1]!=='') out.push(''); continue; }
    if(it.t==null){ out.push(it.text); continue; }
    const idx=lines.indexOf(it), next=lines[idx+1];
    let t0=it.t, t1=next?next.t:Math.min(duration,t0+med*1.3), extraFrom=null;
    if(next&&t1-t0>med*2.2){ extraFrom=t0+med*1.3; t1=extraFrom; }
    const text=it.text, starts=[0]; for(let i=1;i<text.length;i++) if(text[i-1]===' '&&text[i]!==' ') starts.push(i);
    const place=[]; let lastName=null;
    const tail=Math.max(0.35,(t1-t0)*0.12);
    for(const s of chordsIn(t0,t1)){
      if(s.t0>t0+0.15&&s.t0>t1-tail) continue; /* cambia justo al final: pertenece a la línea siguiente */
      const n=cifName(s,shift,flat); if(!n||n===lastName) continue;
      let pos=s.t0<=t0+0.15?0:Math.round((s.t0-t0)/(t1-t0)*text.length);
      let best=starts.reduce((b,x)=>Math.abs(x-pos)<Math.abs(b-pos)?x:b,starts[0]);
      while(place.some(p=>p.pos===best)){ const nx=starts.find(x=>x>best); if(nx==null){ best=text.length; break; } best=nx; }
      place.push({pos:best,n}); lastName=n;
    }
    place.sort((a,b)=>a.pos-b.pos);
    let line=''; let cur=0; for(const p of place){ if(p.pos>=text.length){ line+=text.slice(cur)+(cur<text.length?' ':'')+`[${p.n}]`; cur=text.length; continue; } line+=text.slice(cur,p.pos)+`[${p.n}]`; cur=p.pos; } line+=text.slice(cur);
    out.push(line);
    if(extraFrom!=null){ const inst=chordLine(chordsIn(extraFrom,next.t)); if(inst) out.push(inst); }
    if(!next){ const fin=chordLine(chordsIn(t1,duration)); if(fin&&duration-t1>2){ out.push(''); out.push('# Final'); out.push(fin); } }
  }
  return out.join('\n').replace(/\n{3,}/g,'\n\n').trim();
}
CIF.build=cifBuild; CIF.name=cifName;
if(typeof module!=='undefined') module.exports=CIF;

/* ---------- Letra desde la transcripción ---------- */
function cifNormTok(t){ return String(t).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9ñ\s]/g,' ').split(/\s+/).filter(Boolean); }
function cifEq(a,b){ return a===b||(a.length>=4&&b.length>=4&&a.slice(0,4)===b.slice(0,4)); }
/* Arma estrofas y coros a partir de los segmentos que devuelve el servicio */
function cifItemsFromTranscript(tr){
  let lines=[];
  for(const g of tr.segments||[]){ const words=(tr.words||[]).filter(w=>w.s>=g.s-0.05&&w.s<g.e+0.05);
    if(words.length>11){ let cut=Math.floor(words.length/2), best=-1; for(let k=3;k<words.length-3;k++){ const gap=words[k].s-words[k-1].e; if(gap>best&&Math.abs(k-words.length/2)<words.length/3){ best=gap; cut=k; } }
      lines.push({text:words.slice(0,cut).map(w=>w.w).join(' '),t:words[0].s,e:words[cut-1].e}); lines.push({text:words.slice(cut).map(w=>w.w).join(' '),t:words[cut].s,e:words[words.length-1].e}); }
    else if(g.t) lines.push({text:g.t,t:g.s,e:g.e}); }
  lines=lines.map(l=>({...l,text:l.text.replace(/\s+/g,' ').replace(/\s+([,.;:!?])/g,'$1').trim()})).filter(l=>cifNormTok(l.text).length);
  if(!lines.length) return [];
  const gaps=[]; for(let i=1;i<lines.length;i++) gaps.push(lines[i].t-lines[i-1].e); const sg=[...gaps].sort((a,b)=>a-b); const med=sg.length?sg[Math.floor(sg.length/2)]:0.5;
  const stanzas=[[lines[0]]]; for(let i=1;i<lines.length;i++){ if(gaps[i-1]>Math.max(2.2,med*2)||stanzas[stanzas.length-1].length>=8) stanzas.push([]); stanzas[stanzas.length-1].push(lines[i]); }
  const key=st=>cifNormTok(st.map(l=>l.text).join(' ')).join(' ');
  const sim=(a,b)=>{ const A=new Set(a.split(' ')), B=b.split(' '); if(!A.size||!B.length) return 0; return B.filter(x=>A.has(x)).length/Math.max(A.size,B.length); };
  const keys=stanzas.map(key); const isCoro=keys.map((k,i)=>keys.some((o,j)=>j!==i&&sim(k,o)>=0.6));
  const items=[]; let n=0; const ROM=['I','II','III','IV','V','VI','VII','VIII','IX','X'];
  stanzas.forEach((st,i)=>{ if(i) items.push({type:'gap'}); items.push({type:'sec',text:isCoro[i]?'Coro':'Estrofa '+(ROM[n++]||n)}); st.forEach(l=>items.push({type:'ln',text:l.text.charAt(0).toUpperCase()+l.text.slice(1),t:Math.max(0,l.t-0.1)})); });
  return items;
}
/* Ubica cada línea de la letra existente en lo que se escucha en el audio */
function cifAlignLines(lines,tr){
  const W=[]; for(const w of tr.words||[]) for(const t of cifNormTok(w.w)) W.push({t,s:w.s});
  let p=0, found=0;
  for(const ln of lines){ const toks=cifNormTok(ln.text); if(!toks.length) continue; const k=Math.min(5,toks.length);
    let best=null; for(let j=p;j<Math.min(W.length,p+90);j++){ if(!toks.slice(0,2).some(x=>cifEq(x,W[j].t))) continue;
      let sc=0; const win=W.slice(j,j+k+3).map(w=>w.t); toks.slice(0,k).forEach((x,i)=>{ if(win.some(y=>cifEq(x,y))) sc+=i<2?1.5:1; });
      sc-=(j-p)*0.01; if(!best||sc>best.sc) best={sc,j}; }
    if(best&&best.sc>=Math.min(2.5,k*1.2)){ ln.t=Math.max(0,W[best.j].s-0.1); p=best.j+Math.max(1,toks.length-2); found++; } }
  return found;
}
CIF.itemsFromTranscript=cifItemsFromTranscript; CIF.alignLines=cifAlignLines;
if(typeof module!=='undefined') module.exports=CIF;

/* ======================= Pantalla del cifrador (navegador) ======================= */
if(typeof window!=='undefined'){
const CS={songId:null,audioId:null,res:null,busy:false,times:[],items:[],keyMode:'song',target:'bodyPro',raf:null,err:'',tr:null,trBusy:false,trMsg:'',trEnabled:null,fromTr:false,autoTr:false};
const CIF_ROOT_HUE=[0,30,55,85,120,160,190,210,235,265,295,330];
function cifSong(){ return S.songs.get(CS.songId); }
function cifItems(s){
  const src=(s.body&&s.body.trim())?s.body:(s.bodyPro||''); const items=[];
  for(const L of parseSong(src)){ if(L.type==='sec') items.push({type:'sec',text:L.text}); else if(L.type==='gap') items.push({type:'gap'}); else if(!L.chordOnly){ const t=L.lyric.replace(/\s+/g,' ').trim(); if(t) items.push({type:'ln',text:t,t:null}); } }
  return items;
}
function cifLyricItems(){ return CS.items.filter(i=>i.type==='ln'); }
function cifRelMaj(k){ return k.minor?(k.idx+3)%12:k.idx; }
function cifOpts(){
  const s=cifSong(), ka=CS.res&&CS.res.key, ks=parseKey(s&&s.key);
  if(CS.keyMode==='song'&&ks&&ka){ const shift=((cifRelMaj(ks)-cifRelMaj(ka))%12+12)%12; return {shift:shift>6?shift-12:shift,flat:useFlatFor(ks,0),key:ks}; }
  return {shift:0,flat:ka?useFlatFor(ka,0):false,key:ka};
}
window.cifOpen=function(id){
  const s=S.songs.get(id); if(!s||!(s.audio||[]).length){ toast('Primero sube un audio a esta canción.'); return; }
  cifStop(); Object.assign(CS,{songId:id,audioId:(s.sync&&s.audio.some(a=>a.id===s.sync.audio))?s.sync.audio:s.audio[0].id,res:null,busy:false,err:'',keyMode:s.key?'song':'audio',target:'bodyPro'});
  CS.items=cifItems(s); CS.tr=null; CS.trMsg=''; CS.fromTr=false; if(!cifLyricItems().length) CS.target='body'; const ly=cifLyricItems();
  if(CS.trEnabled===null) fetch('/api/transcribe/status').then(r=>r.json()).then(d=>{ CS.trEnabled=!!d.enabled; cifPaintTr(); }).catch(()=>{});
  if(s.sync&&Array.isArray(s.sync.times)&&s.sync.times.length===ly.length&&s.sync.audio===CS.audioId) ly.forEach((l,i)=>l.t=s.sync.times[i]);
  V.view='cifrar'; render(); window.scrollTo(0,0); cifAnalyzeCurrent();
};
window.viewCifrar=function(){
  const s=cifSong(); if(!s){ V.view='list'; return viewSongs(); }
  const ly=cifLyricItems();
  return `<button class="btn ghost back" data-act="cif-back">${ICON.back}Volver a la canción</button>
  <h2 style="font-family:var(--f-display);font-size:24px;margin:0 0 4px">Sacar acordes del audio</h2>
  <p class="muted" style="margin:0 0 14px">${esc(s.title)}</p>
  <section class="cif-box">
    <div class="cif-step"><span>1</span><b>Escuchar y detectar</b></div>
    ${(s.audio||[]).length>1?`<label class="f">Audio<select id="cif-aud">${s.audio.map(a=>`<option value="${esc(a.id)}" ${a.id===CS.audioId?'selected':''}>${esc(a.name)}</option>`).join('')}</select></label>`:''}
    <audio id="cif-audio" controls preload="auto" src="/audio/${esc(CS.audioId)}" style="width:100%"></audio>
    <div id="cif-status" class="muted" style="font-size:13.5px"></div>
    <div class="cif-now"><div><small>Ahora</small><b id="cif-now">—</b></div><div><small>Sigue</small><b id="cif-next">—</b></div><div><small>Tono del audio</small><b id="cif-key">—</b></div></div>
    <div class="cif-tl" id="cif-tl"></div>
  </section>
  <section class="cif-box">
    <div class="cif-step"><span>2</span><b>Sincronizar la letra</b></div>
    <div id="cif-tr" class="cif-tr"></div>
    ${ly.length?`<p class="muted" style="margin:0;font-size:13.5px">Dale play y pulsa <b>Marcar línea</b> (o la barra espaciadora) justo cuando empieza a cantarse cada línea. Toca una línea marcada para volver a escucharla desde ahí.</p>
    <div class="actions"><button class="btn pri cif-mark" data-act="cif-mark" id="cif-markbtn">Marcar línea</button><button class="btn" data-act="cif-undo">Deshacer</button><button class="btn ghost" data-act="cif-reset">Empezar de nuevo</button></div>
    <div id="cif-lines" class="cif-lines"></div>`:`<p style="margin:0">Esta canción todavía no tiene letra. Transcríbela desde el audio con el botón de arriba, escríbela en <b>Editar</b>, o guarda solo los acordes detectados.</p>`}
  </section>
  <section class="cif-box">
    <div class="cif-step"><span>3</span><b>Revisar y guardar</b></div>
    <div id="cif-opts"></div>
    <div id="cif-prev" class="preview" style="max-height:none"></div>
    <div class="actions"><button class="btn pri" data-act="cif-save" id="cif-save">Guardar borrador</button><span class="muted" style="font-size:13px">Queda marcado como “detección automática” hasta que alguien lo revise.</span></div>
  </section>`;
};
window.cifAfterRender=function(){ if(V.view!=='cifrar') return; cifPaintTr(); cifPaintLines(); cifPaintTimeline(); cifPaintResult(); cifStatus(); cifLoop();
  const sel=$('#cif-aud'); if(sel) sel.addEventListener('change',e=>{ CS.audioId=e.target.value; CS.res=null; render(); cifAnalyzeCurrent(); }); };
function cifStatus(){ const el=$('#cif-status'); if(!el) return; el.textContent=CS.err||(CS.busy?'Analizando el audio… puede tardar unos segundos.':CS.res?`Listo: ${CS.res.segments.filter(x=>x.root!=null).length} acordes detectados en ${Math.floor(CS.res.duration/60)}:${String(Math.round(CS.res.duration%60)).padStart(2,'0')}.`:''); const k=$('#cif-key'); if(k&&CS.res) k.textContent=keyText(CS.res.key); }
async function cifAnalyzeCurrent(){
  CS.busy=true; CS.err=''; cifStatus();
  try{
    const ab=await (await fetch('/audio/'+CS.audioId)).arrayBuffer();
    const AC=window.AudioContext||window.webkitAudioContext; const tmp=new AC(); const dec=await new Promise((ok,ko)=>{ const p=tmp.decodeAudioData(ab,ok,ko); if(p&&p.then) p.then(ok,ko); }); tmp.close&&tmp.close();
    const sr=22050; const OAC=window.OfflineAudioContext||window.webkitOfflineAudioContext; const off=new OAC(1,Math.ceil(dec.duration*sr),sr);
    const src=off.createBufferSource(); src.buffer=dec; src.connect(off.destination); src.start(0);
    const rendered=await new Promise((ok,ko)=>{ off.oncomplete=e=>ok(e.renderedBuffer); const p=off.startRendering(); if(p&&p.then) p.then(ok,ko); });
    await new Promise(r=>setTimeout(r,30));
    CS.res=cifAnalyze(rendered.getChannelData(0),sr);
  }catch(e){ console.error(e); CS.err='No se pudo analizar este audio. Prueba con otro archivo o recarga la página.'; }
  CS.busy=false; if(V.view==='cifrar'){ cifStatus(); cifPaintTimeline(); cifPaintResult(); }
  if(CS.autoTr&&CS.res){ CS.autoTr=false; if(CS.trEnabled===null){ try{ const d=await (await fetch('/api/transcribe/status')).json(); CS.trEnabled=!!d.enabled; }catch{} } if(CS.trEnabled) cifTranscribe(); else cifPaintTr(); }
}
function cifChordLabel(seg){ if(!seg||seg.root==null) return '—'; const o=cifOpts(); return fmtChord(cifName(seg,o.shift,o.flat),0,o.flat,V.latin); }
function cifPaintTimeline(){
  const tl=$('#cif-tl'); if(!tl) return; if(!CS.res){ tl.innerHTML=''; return; }
  const d=CS.res.duration||1;
  tl.innerHTML=`<div class="cif-tl-in">${CS.res.segments.map((g,i)=>`<button class="cif-seg" data-act="cif-seek" data-t="${g.t0.toFixed(2)}" style="width:${((g.t1-g.t0)/d*100).toFixed(3)}%;${g.root==null?'':`background:hsla(${CIF_ROOT_HUE[g.root]},60%,50%,${g.minor?0.22:0.38})`}" title="${esc(cifChordLabel(g))}">${(g.t1-g.t0)/d>0.025?esc(cifChordLabel(g)):''}</button>`).join('')}</div><div class="cif-head" id="cif-head"></div>`;
}
function cifPaintLines(){
  const box=$('#cif-lines'); if(!box) return; const ly=cifLyricItems(); const next=ly.findIndex(l=>l.t==null);
  let k=0; box.innerHTML=CS.items.map(it=>{ if(it.type==='sec') return `<div class="cif-sec">${esc(it.text)}</div>`; if(it.type==='gap') return ''; const i=k++;
    return `<div class="cif-ln${it.t!=null?' done':''}${i===next?' nextl':''}" data-i="${i}"><button class="cif-tm" data-act="cif-here" data-i="${i}" title="Marcar esta línea en el segundo actual">${it.t!=null?cifFmt(it.t):'⏱'}</button><button class="cif-tx" data-act="cif-line" data-i="${i}">${esc(it.text)}</button></div>`; }).join('');
  const b=$('#cif-markbtn'); if(b){ const n=ly.filter(l=>l.t!=null).length; b.textContent=next<0?'Todas las líneas marcadas ✓':`Marcar línea ${n+1} de ${ly.length}`; b.disabled=next<0; }
}
function cifPaintTr(){
  const box=$('#cif-tr'); if(!box) return; const hasLy=cifLyricItems().length&&!CS.fromTr;
  const label=hasLy?'🎤 Sincronizar automáticamente con la voz':'🎤 Transcribir la letra del audio';
  const help=hasLy?'Escucha la voz y ubica cada línea de la letra sola. Después puedes corregir a mano.':'Escribe la letra que se canta en el audio, separada en estrofas y coros, con su tiempo.';
  box.innerHTML=CS.trEnabled===false?`<p class="muted" style="margin:0;font-size:13px">La transcripción automática todavía no está activada: falta configurar la clave del servicio.</p>`
    :`<div class="actions"><button class="btn" data-act="cif-tr" ${CS.trBusy?'disabled':''}>${CS.trBusy?'Escuchando la voz…':label}</button><span class="muted" style="font-size:12.5px">${esc(CS.trMsg||help)}</span></div>`;
}
async function cifTranscribe(){
  if(CS.trBusy) return; CS.trBusy=true; CS.trMsg='Enviando el audio al servicio… suele tardar entre 10 y 60 segundos.'; cifPaintTr();
  try{
    const r=await fetch(`/api/transcribe/${encodeURIComponent(CS.songId)}/${CS.audioId}`,{method:'POST',headers:{Authorization:'Bearer '+S.token}});
    const d=await r.json().catch(()=>({}));
    if(!r.ok){ CS.trMsg={no_key:'Falta configurar la clave del servicio de transcripción.',bad_key:'La clave del servicio no es válida. Revísala en Railway.',quota:'El servicio no tiene saldo o está ocupado. Revisa tu cuenta.',too_large:'El audio es demasiado largo para transcribir.',unauthorized:'Vuelve a ingresar con tu usuario.'}[d.error]||'No se pudo transcribir. Inténtalo de nuevo.'; }
    else { CS.tr=d;
      if(cifLyricItems().length&&!CS.fromTr){ const ly=cifLyricItems(); ly.forEach(l=>l.t=null); const n=cifAlignLines(ly,d); CS.trMsg=`Ubiqué ${n} de ${ly.length} líneas. Revisa las marcas y corrige las que falten con ⏱.`; }
      else { const items=cifItemsFromTranscript(d); if(items.length){ CS.items=items; CS.fromTr=true; CS.target='body'; CS.trMsg='Letra transcrita. Revísala: el servicio puede equivocarse con palabras cantadas.'; } else CS.trMsg='No se escuchó letra cantada en este audio.'; }
      if(d.cached) CS.trMsg+=' (ya estaba transcrito: sin costo)'; }
  }catch(e){ CS.trMsg='No se pudo conectar con el servicio.'; }
  CS.trBusy=false; if(CS.fromTr){ render(); } else { cifPaintTr(); cifPaintLines(); cifPaintResult(); }
}
function cifFmt(t){ return Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0'); }
function cifResultText(){
  if(!CS.res) return ''; const o=cifOpts(); const ly=cifLyricItems();
  if(!ly.length){ const names=[]; for(const g of CS.res.segments){ const n=cifName(g,o.shift,o.flat); if(n&&names[names.length-1]!==n) names.push(n); } const rows=[]; for(let i=0;i<names.length;i+=4) rows.push(names.slice(i,i+4).map(n=>`[${n}]`).join('   ')); return '# Acordes\n'+rows.join('\n'); }
  return cifBuild(CS.items,CS.res.segments,CS.res.duration,o);
}
function cifPaintResult(){
  const op=$('#cif-opts'), pv=$('#cif-prev'), sv=$('#cif-save'); if(!op||!pv) return;
  const s=cifSong(); const ka=CS.res&&CS.res.key, ks=parseKey(s.key); const ly=cifLyricItems(); const marked=ly.filter(l=>l.t!=null).length;
  const sameKey=ka&&ks&&cifRelMaj(ka)===cifRelMaj(ks);
  const dupW=CS.fromTr&&window.findDuplicate?findDuplicate({title:s.title,body:cifResultText()},[...S.songs.values()].filter(x=>x.id!==s.id)):null;
  op.innerHTML=!CS.res?'':`${s.titleAuto?`<label class="f" style="margin-bottom:8px">Título de la canción<input id="cif-title" value="${esc(CS.title||cifSuggestTitle())}"></label>`:''}${dupW?`<div class="banner" style="color:var(--danger);border:1px solid var(--danger)"><b>Atención:</b> parece que esta canción ya existe como ${esc(dupLabel(dupW))}. <button class="btn" data-act="open-song" data-id="${esc(dupW.song.id)}">Abrir la existente</button></div>`:''}<div class="grid2">
    ${ks&&!sameKey?`<label class="f">Tono del cifrado<select id="cif-keymode"><option value="song" ${CS.keyMode==='song'?'selected':''}>Tono de la canción (${esc(keyText(ks))})</option><option value="audio" ${CS.keyMode==='audio'?'selected':''}>Tono del audio (${esc(keyText(ka))}) — cambia el tono de la canción</option></select></label>`:''}
    <label class="f">Guardar en<select id="cif-target"><option value="bodyPro" ${CS.target==='bodyPro'?'selected':''}>Versión original (recomendado)</option><option value="body" ${CS.target==='body'?'selected':''}>Acordes básicos (reemplaza los actuales)</option></select></label></div>
    ${ly.length&&marked<ly.length?`<p class="muted" style="margin:6px 0 0;font-size:13px">Faltan ${ly.length-marked} líneas por marcar: quedarán sin acordes.</p>`:''}`;
  const km=$('#cif-keymode'); if(km) km.addEventListener('change',e=>{ CS.keyMode=e.target.value; cifPaintTimeline(); cifPaintResult(); });
  const tg=$('#cif-target'); if(tg) tg.addEventListener('change',e=>{ CS.target=e.target.value; });
  const ti=$('#cif-title'); if(ti) ti.addEventListener('input',e=>{ CS.title=e.target.value; });
  const txt=cifResultText(); pv.innerHTML=CS.res?renderSheet(txt,{chords:true,key:cifOpts().key}):'<p class="muted">El resultado aparecerá aquí cuando termine el análisis.</p>';
  if(sv) sv.disabled=!CS.res||(ly.length&&!marked);
}
function cifLoop(){
  if(CS.raf) cancelAnimationFrame(CS.raf);
  const tick=()=>{ if(V.view!=='cifrar'){ CS.raf=null; return; } const a=$('#cif-audio'); if(a&&CS.res){ const t=a.currentTime, d=CS.res.duration||1; const segs=CS.res.segments;
      const i=segs.findIndex(g=>t>=g.t0&&t<g.t1); const cur=segs[i]; let nx=null; for(let j=i+1;j<segs.length;j++){ if(segs[j].root!=null){ nx=segs[j]; break; } }
      const n=$('#cif-now'), nn=$('#cif-next'), h=$('#cif-head'); if(n) n.textContent=cifChordLabel(cur); if(nn) nn.textContent=nx?cifChordLabel(nx):'—'; if(h) h.style.left=(t/d*100)+'%';
      const ly=cifLyricItems(); let li=-1; ly.forEach((l,k)=>{ if(l.t!=null&&l.t<=t+0.05) li=k; }); document.querySelectorAll('.cif-ln').forEach(el=>el.classList.toggle('sing',Number(el.dataset.i)===li&&!a.paused)); }
    CS.raf=requestAnimationFrame(tick); };
  CS.raf=requestAnimationFrame(tick);
}
function cifStop(){ if(CS.raf) cancelAnimationFrame(CS.raf); CS.raf=null; const a=document.getElementById('cif-audio'); if(a) a.pause(); }
function cifMark(i){ const a=$('#cif-audio'); if(!a) return; const ly=cifLyricItems(); if(i==null) i=ly.findIndex(l=>l.t==null); if(i<0) return; ly[i].t=Math.max(0,a.currentTime-0.15); if(a.paused&&i===0) a.play().catch(()=>{}); cifPaintLines(); cifPaintResult(); }
function cifChordSig(t){ return String(t||'').split('\n').map(l=>(l.match(/\[[^\]]*\]/g)||[]).join('')).join('|').replace(/\|+$/,''); }
window.cifChordSig=cifChordSig;
async function cifSave(){
  const s=cifSong(); if(!s||!CS.res) return; const txt=cifResultText(); const o=cifOpts();
  const data=JSON.parse(JSON.stringify(s)); data[CS.target]=txt; if(CS.target==='bodyPro') data.chordsProAuto=true; else data.chordsAuto=true;
  if(CS.keyMode==='audio'||!s.key) data.key=keyCanon(CS.res.key.idx,CS.res.key.minor);
  if(CS.fromTr){ data.lyricsAuto=true; if(CS.target==='bodyPro'&&!(data.body||'').trim()) data.body=txt.replace(/\[[^\]]*\]/g,''); }
  data.sync={audio:CS.audioId,times:cifLyricItems().map(l=>l.t==null?null:Math.round(l.t*100)/100),at:Date.now()};
  if(s.titleAuto){ const t=(CS.title||cifSuggestTitle()||'').trim(); if(t) data.title=t; delete data.titleAuto; }
  delete data.updatedBy; delete data.updatedAt;
  if(await writeDoc('songs',data)){ cifStop(); toast('Cifrado guardado como borrador. Revísalo y corrígelo con “Poner acordes tocando”.'); if(CS.target==='bodyPro'){ V.ver='original'; lsSet('vdn-ver','original'); } go('song',{songId:s.id,shift:0}); }
}
document.addEventListener('click',ev=>{
  const el=ev.target.closest('[data-act]'); if(!el) return; const a=el.dataset.act, d=el.dataset;
  if(a==='cif-open') cifOpen(d.id||V.songId);
  else if(a==='cif-back'){ cifStop(); go('song',{songId:CS.songId}); }
  else if(a==='cif-mark') cifMark();
  else if(a==='cif-here') cifMark(Number(d.i));
  else if(a==='cif-undo'){ const ly=cifLyricItems(); let k=-1; ly.forEach((l,i)=>{ if(l.t!=null) k=i; }); if(k>=0){ ly[k].t=null; cifPaintLines(); cifPaintResult(); } }
  else if(a==='cif-reset'){ cifLyricItems().forEach(l=>l.t=null); const au=$('#cif-audio'); if(au){ au.pause(); au.currentTime=0; } cifPaintLines(); cifPaintResult(); }
  else if(a==='cif-line'){ const l=cifLyricItems()[Number(d.i)]; const au=$('#cif-audio'); if(l&&l.t!=null&&au){ au.currentTime=Math.max(0,l.t-0.3); au.play().catch(()=>{}); } }
  else if(a==='cif-seek'){ const au=$('#cif-audio'); if(au){ au.currentTime=Number(d.t); } }
  else if(a==='cif-save') cifSave();
  else if(a==='cif-tr') cifTranscribe();
});
function cifSuggestTitle(){ const l=cifLyricItems()[0]; if(!l) return ''; const w=l.text.replace(/[,.;:!?¡¿"]/g,'').split(/\s+/).slice(0,6).join(' '); return w.charAt(0).toUpperCase()+w.slice(1); }
/* ---------- Crear una canción nueva a partir de un audio ---------- */
window.cifNewFromAudio=function(){
  $('#modal-root').innerHTML=`<div class="scrim" data-act="close-modal"><form class="modal" id="cifnew" role="dialog" aria-label="Crear desde un audio" data-stop style="width:min(480px,100%)">
    <header><h3>Crear canción desde un audio</h3><button type="button" class="btn ghost" data-act="close-modal" aria-label="Cerrar">${ICON.x}</button></header>
    <div class="body" style="display:grid;gap:12px">
      <p class="muted" style="margin:0;font-size:13.5px">Sube la grabación: la app saca los acordes y, si quieres, escribe la letra. Después revisas y guardas.</p>
      <label class="f">Título (opcional)<input id="cn-title" placeholder="Si lo dejas vacío, se toma de la primera línea cantada"></label>
      <label class="drop" style="cursor:pointer"><input id="cn-file" type="file" accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.webm,.flac,.3gp,.amr" hidden required><b id="cn-fname">Elegir el audio</b><span>MP3, M4A (notas de voz), WAV… hasta 100 MB</span></label>
      <label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" id="cn-tr" checked> Escribir la letra automáticamente (servicio externo, unos centavos por canción)</label>
      <div id="cn-prog" class="muted" style="font-size:13.5px" hidden></div>
      <button class="btn pri" type="submit" id="cn-go" style="justify-content:center">Crear y sacar letra y acordes</button>
    </div></form></div>`;
  const fi=$('#cn-file'); fi.addEventListener('change',()=>{ $('#cn-fname').textContent=fi.files[0]?fi.files[0].name:'Elegir el audio'; });
  $('#cifnew').addEventListener('submit',async ev=>{ ev.preventDefault(); const file=fi.files[0]; if(!file){ toast('Elige un audio primero.'); return; }
    const AUD={mp3:'audio/mpeg',m4a:'audio/mp4',aac:'audio/aac',wav:'audio/wav',ogg:'audio/ogg',webm:'audio/webm',flac:'audio/flac','3gp':'audio/3gpp',amr:'audio/amr'};
    const ext=(file.name.split('.').pop()||'').toLowerCase(); const type=(file.type&&file.type.startsWith('audio/'))?file.type:AUD[ext];
    if(!type){ toast('Ese archivo no parece un audio.'); return; } if(file.size>100*1024*1024){ toast('El archivo es muy grande. El máximo es 100 MB.'); return; }
    const prog=$('#cn-prog'), go=$('#cn-go'); prog.hidden=false; go.disabled=true;
    const title=$('#cn-title').value.trim(); const wantTr=$('#cn-tr').checked;
    const song={id:newId('c'),title:title||'Nueva canción desde audio',author:'',key:'',category:'',body:'',notes:''}; if(!title) song.titleAuto=true;
    prog.textContent='Creando la canción…';
    if(!(await writeDoc('songs',song))){ go.disabled=false; prog.hidden=true; return; }
    const ok=await new Promise(res=>{ const xhr=new XMLHttpRequest(); xhr.open('POST',`/api/audio/${encodeURIComponent(song.id)}?name=${encodeURIComponent(file.name.replace(/\.[^.]+$/,'').slice(0,80))}`);
      xhr.setRequestHeader('Authorization','Bearer '+S.token); xhr.setRequestHeader('Content-Type',type);
      xhr.upload.onprogress=e=>{ if(e.lengthComputable){ const pc=Math.round(e.loaded/e.total*100); prog.textContent=pc<100?`Subiendo el audio… ${pc}%`:'Comprimiendo el audio…'; } };
      xhr.onload=()=>res(xhr.status===200); xhr.onerror=()=>res(false); xhr.send(file); });
    if(!ok){ prog.textContent='No se pudo subir el audio. La canción quedó creada sin audio; puedes subirlo desde la canción.'; go.disabled=false; return; }
    lastSig=''; await loadData(); closeModal(); CS.autoTr=wantTr; CS.title=title; cifOpen(song.id);
    toast(wantTr?'Analizando el audio y escribiendo la letra…':'Analizando el audio…');
  });
};
document.addEventListener('click',ev=>{ const el=ev.target.closest('[data-act]'); if(el&&el.dataset.act==='cif-new') cifNewFromAudio(); });
document.addEventListener('keydown',e=>{ if(V.view!=='cifrar') return; const tag=(e.target.tagName||'').toLowerCase(); if(['input','textarea','select'].includes(tag)) return;
  if(e.code==='Space'||e.key===' '){ e.preventDefault(); cifMark(); } });
}
