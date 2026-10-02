/* Voz de la Novia — afinador con micrófono y tonos de referencia */
"use strict";
const TUN={stream:null,ctx:null,an:null,buf:null,raf:null,hist:[],mode:lsGet('vdn-tun-mode','guitar'),a4:lsGet('vdn-tun-a4',440),target:null,last:0};
const TUNINGS={
  guitar:{name:'Guitarra (estándar)',notes:[40,45,50,55,59,64]},
  guitarD:{name:'Guitarra medio tono abajo',notes:[39,44,49,54,58,63]},
  dropD:{name:'Guitarra Drop D',notes:[38,45,50,55,59,64]},
  bass:{name:'Bajo (4 cuerdas)',notes:[28,33,38,43]},
  ukulele:{name:'Ukelele',notes:[67,60,64,69]},
  chromatic:{name:'Cromático (cualquier nota)',notes:[]}
};
function tunName(m){ const n=noteName(m,false,V.latin); return n; }
function tunFreq(m){ return TUN.a4*Math.pow(2,(m-69)/12); }

function openTuner(){
  $('#modal-root').innerHTML=`<div class="scrim" data-act="tun-close"><div class="modal" role="dialog" aria-label="Afinador" data-stop style="width:min(480px,100%)">
    <header><h3>Afinador</h3><button class="btn ghost" data-act="tun-close" aria-label="Cerrar">${ICON.x}</button></header>
    <div class="body" id="tun-body" style="display:grid;gap:14px"></div></div></div>`;
  tunDraw();
}
function tunDraw(){
  const T=TUNINGS[TUN.mode]; const b=$('#tun-body'); if(!b) return;
  b.innerHTML=`<label class="f">Instrumento<select id="tun-mode">${Object.entries(TUNINGS).map(([k,t])=>`<option value="${k}" ${TUN.mode===k?'selected':''}>${t.name}</option>`).join('')}</select></label>
    <div class="tun-face" aria-live="polite">
      <div class="tun-note" id="tun-note">—</div>
      <div class="tun-meter"><div class="tun-scale">${[-50,-25,0,25,50].map(c=>`<span style="left:${50+c}%">${c>0?'+':''}${c}</span>`).join('')}</div><div class="tun-needle" id="tun-needle"></div><div class="tun-zone"></div></div>
      <div class="tun-info"><span id="tun-hz">— Hz</span><span id="tun-cents"></span></div>
      <div class="tun-hint" id="tun-hint">${TUN.stream?'Toca una cuerda…':'Pulsa “Activar micrófono” y toca una cuerda.'}</div>
    </div>
    ${T.notes.length?`<div><small class="muted">Cuerdas · toca una para escuchar su sonido de referencia</small><div class="tun-strings">${T.notes.map((m,i)=>`<button class="tun-str ${TUN.target===m?'on':''}" data-act="tun-ref" data-m="${m}"><b>${esc(tunName(m))}</b><small>${T.notes.length-i}ª</small></button>`).join('')}</div></div>`:''}
    <div class="actions">${TUN.stream?'<button class="btn" data-act="tun-stop">Apagar micrófono</button>':'<button class="btn pri" data-act="tun-start">🎤 Activar micrófono</button>'}<span class="spacer"></span>
      <label style="display:inline-flex;gap:6px;align-items:center;font-size:13px;color:var(--muted)">La =<input id="tun-a4" type="number" min="415" max="466" value="${TUN.a4}" style="width:64px;border:1px solid var(--line);border-radius:6px;padding:4px 6px;background:var(--bg)"> Hz</label></div>`;
  $('#tun-mode').addEventListener('change',e=>{ TUN.mode=e.target.value; lsSet('vdn-tun-mode',TUN.mode); TUN.target=null; tunDraw(); });
  $('#tun-a4').addEventListener('change',e=>{ const v=Math.max(415,Math.min(466,Number(e.target.value)||440)); TUN.a4=v; lsSet('vdn-tun-a4',v); });
}
async function tunStart(){
  try{
    TUN.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
  }catch(e){ toast('No se pudo usar el micrófono. Revisa que la página tenga permiso para usarlo.'); return; }
  const C=window.AudioContext||window.webkitAudioContext; TUN.ctx=new C();
  const src=TUN.ctx.createMediaStreamSource(TUN.stream); const hp=TUN.ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=30;
  TUN.an=TUN.ctx.createAnalyser(); TUN.an.fftSize=4096; src.connect(hp); hp.connect(TUN.an); TUN.buf=new Float32Array(TUN.an.fftSize);
  try{ if(navigator.wakeLock) TUN.lock=await navigator.wakeLock.request('screen'); }catch{}
  tunDraw(); tunLoop();
}
function tunStop(){
  if(TUN.raf) cancelAnimationFrame(TUN.raf); TUN.raf=null;
  if(TUN.stream) TUN.stream.getTracks().forEach(t=>t.stop()); TUN.stream=null;
  if(TUN.ctx) TUN.ctx.close().catch(()=>{}); TUN.ctx=null; TUN.hist=[];
  if(TUN.lock){ TUN.lock.release().catch(()=>{}); TUN.lock=null; }
}
/* Detección de tono por autocorrelación (YIN simplificado) */
function tunPitch(buf,sr){
  let rms=0; for(let i=0;i<buf.length;i++) rms+=buf[i]*buf[i]; rms=Math.sqrt(rms/buf.length); if(rms<0.008) return -1;
  const N=buf.length, half=Math.floor(N/2), d=new Float32Array(half);
  const minLag=Math.floor(sr/1400), maxLag=Math.min(half-1,Math.floor(sr/38));
  for(let tau=minLag;tau<=maxLag;tau++){ let s=0; for(let i=0;i<half;i++){ const x=buf[i]-buf[i+tau]; s+=x*x; } d[tau]=s; }
  let run=0; const cm=new Float32Array(half); cm[minLag]=1;
  for(let tau=minLag;tau<=maxLag;tau++){ run+=d[tau]; cm[tau]=run? d[tau]*(tau-minLag+1)/run : 1; }
  let tau=-1; for(let t=minLag+1;t<maxLag;t++){ if(cm[t]<0.12){ while(t+1<maxLag&&cm[t+1]<cm[t]) t++; tau=t; break; } }
  if(tau<0){ let best=1e9; for(let t=minLag+1;t<maxLag;t++) if(cm[t]<best){ best=cm[t]; tau=t; } if(best>0.3) return -1; }
  const a=cm[tau-1]||cm[tau], b=cm[tau], c=cm[tau+1]||cm[tau]; const den=a+c-2*b; const shift=den?(a-c)/(2*den):0;
  return sr/(tau+shift);
}
function tunLoop(){
  if(!TUN.an){ return; }
  TUN.an.getFloatTimeDomainData(TUN.buf);
  const f=tunPitch(TUN.buf,TUN.ctx.sampleRate); const now=performance.now();
  if(f>0){ TUN.hist.push(f); if(TUN.hist.length>7) TUN.hist.shift(); TUN.last=now;
    const sorted=[...TUN.hist].sort((x,y)=>x-y); const fm=sorted[Math.floor(sorted.length/2)];
    let midi=Math.round(69+12*Math.log2(fm/TUN.a4)); const T=TUNINGS[TUN.mode];
    if(T.notes.length){ midi=TUN.target??T.notes.reduce((best,m)=>Math.abs(Math.log2(fm/tunFreq(m)))<Math.abs(Math.log2(fm/tunFreq(best)))?m:best,T.notes[0]); }
    const cents=Math.max(-50,Math.min(50,1200*Math.log2(fm/tunFreq(midi))));
    const ok=Math.abs(cents)<=5;
    const nn=$('#tun-note'), nd=$('#tun-needle'), hz=$('#tun-hz'), ce=$('#tun-cents'), hi=$('#tun-hint');
    if(nn){ nn.textContent=tunName(midi)+(Math.floor(midi/12)-1); nn.className='tun-note'+(ok?' ok':''); }
    if(nd){ nd.style.left=(50+cents)+'%'; nd.className='tun-needle'+(ok?' ok':''); }
    if(hz) hz.textContent=fm.toFixed(1)+' Hz'; if(ce) ce.textContent=(cents>0?'+':'')+cents.toFixed(0)+' cents';
    if(hi) hi.textContent=ok?'¡Afinado!':(cents<0?'Muy bajo: aprieta (sube) la cuerda':'Muy alto: afloja (baja) la cuerda');
  } else if(now-TUN.last>1500){ const hi=$('#tun-hint'); if(hi&&TUN.stream) hi.textContent='Toca una cuerda…'; TUN.hist=[]; }
  TUN.raf=requestAnimationFrame(tunLoop);
}
document.addEventListener('click',ev=>{
  const el=ev.target.closest('[data-act]'); if(!el) return; const a=el.dataset.act;
  if(a==='tuner') openTuner();
  else if(a==='tun-close'){ if(el.classList.contains('scrim')&&ev.target.closest('[data-stop]')) return; tunStop(); closeModal(); }
  else if(a==='tun-start') tunStart();
  else if(a==='tun-stop'){ tunStop(); tunDraw(); }
  else if(a==='tun-ref'){ const m=Number(el.dataset.m); TUN.target=TUN.target===m?null:m; if(window.Acordes) Acordes.note(m,'guitar'); document.querySelectorAll('.tun-str').forEach(b=>b.classList.toggle('on',Number(b.dataset.m)===TUN.target)); }
});
