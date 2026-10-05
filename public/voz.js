/* Voz de la Novia — buscar hablando (micrófono en los buscadores) */
"use strict";
(function(){ const st=document.createElement('style'); st.textContent=`
.search input.has-mic{padding-right:46px}
.mic{position:absolute;right:4px;top:50%;transform:translateY(-50%);width:38px;height:34px;border:0;border-radius:8px;background:transparent;color:var(--muted);display:grid;place-items:center;cursor:pointer}
.mic:hover{background:var(--sunk);color:var(--ink)}
.mic svg{position:static;transform:none;width:20px;height:20px;color:inherit}
.mic.on{background:#d93a2f;color:#fff;animation:micp 1.1s infinite}
@keyframes micp{0%{box-shadow:0 0 0 0 rgba(217,58,47,.6)}100%{box-shadow:0 0 0 12px rgba(217,58,47,0)}}
`; document.head.appendChild(st); })();
const MIC_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
const VZ={on:null,rec:null,stream:null,timer:null};
/* Pone un botón de micrófono dentro de cada buscador marcado */
function vzDecorate(){
  for(const id of ['q','bb-q','ms-q','ms-qin','lb-q','pj-q']){ const inp=document.getElementById(id); if(!inp||inp.dataset.mic) continue;
    const box=inp.closest('.search')||inp.parentElement; if(!box) continue; if(getComputedStyle(box).position==='static') box.style.position='relative';
    inp.dataset.mic='1'; inp.classList.add('has-mic'); if(!inp.closest('.search')) inp.style.paddingRight='46px';
    const b=document.createElement('button'); b.type='button'; b.className='mic'; b.title='Buscar hablando'; b.setAttribute('aria-label','Buscar hablando'); b.innerHTML=MIC_SVG; b.dataset.for=id;
    b.addEventListener('click',e=>{ e.preventDefault(); e.stopPropagation(); vzToggle(id,b); }); box.appendChild(b); }
}
new MutationObserver(()=>vzDecorate()).observe(document.documentElement,{childList:true,subtree:true});
function vzPut(id,text){
  const inp=document.getElementById(id); if(!inp) return; text=String(text||'').replace(/[.!?¡¿]+$/,'').trim(); if(!text){ toast('No se entendió. Intenta de nuevo, más cerca del teléfono.'); return; }
  inp.value=text; inp.dispatchEvent(new Event('input',{bubbles:true})); if(id==='bb-q'&&window.bbParse&&bbParse(text)) inp.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
  toast('Buscando: “'+text+'”');
}
function vzStop(){ const b=document.querySelector('.mic.on'); if(b) b.classList.remove('on'); clearTimeout(VZ.timer);
  if(VZ.rec&&VZ.rec.state==='recording'){ try{ VZ.rec.stop(); }catch{} } if(VZ.on&&VZ.on.stop){ try{ VZ.on.stop(); }catch{} } VZ.on=null; }
function vzToggle(id,btn){
  if(btn.classList.contains('on')){ vzStop(); return; }
  vzStop(); const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(SR){ let got=false, failed=false;
    const r=new SR(); r.lang=(navigator.language||'').toLowerCase().startsWith('es')?navigator.language:'es-419'; r.interimResults=true; r.maxAlternatives=1; r.continuous=false;
    r.onresult=e=>{ const res=e.results[e.results.length-1]; const t=[...e.results].map(x=>x[0].transcript).join(' '); const inp=document.getElementById(id); if(inp&&!res.isFinal){ inp.value=t; } if(res.isFinal){ got=true; vzStop(); vzPut(id,t); } };
    r.onerror=e=>{ if(e.error==='not-allowed'||e.error==='service-not-allowed'||e.error==='network'||e.error==='audio-capture'){ failed=true; btn.classList.remove('on'); VZ.on=null; if(e.error==='not-allowed') toast('Permite el micrófono para buscar hablando.'); else vzRecord(id,btn); } };
    r.onend=()=>{ if(!got&&!failed){ btn.classList.remove('on'); VZ.on=null; } };
    try{ r.start(); VZ.on=r; btn.classList.add('on'); toast('Habla ahora: el nombre del cántico o una frase de la letra'); }catch{ vzRecord(id,btn); }
    return; }
  vzRecord(id,btn);
}
/* Si el navegador no reconoce la voz, se graba un momento y lo transcribe el servidor */
async function vzRecord(id,btn){
  if(!navigator.mediaDevices||!window.MediaRecorder){ toast('Este navegador no permite buscar por voz.'); return; }
  let stream; try{ stream=await navigator.mediaDevices.getUserMedia({audio:true}); }catch{ toast('Permite el micrófono para buscar hablando.'); return; }
  const type=['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg'].find(t=>MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(t))||'';
  const rec=new MediaRecorder(stream,type?{mimeType:type}:undefined); const chunks=[]; VZ.rec=rec;
  rec.ondataavailable=e=>{ if(e.data&&e.data.size) chunks.push(e.data); };
  rec.onstop=async()=>{ stream.getTracks().forEach(t=>t.stop()); btn.classList.remove('on'); const blob=new Blob(chunks,{type:rec.mimeType||'audio/webm'}); if(blob.size<1500){ toast('No se escuchó nada.'); return; }
    toast('Entendiendo…');
    try{ const r=await fetch('/api/voz',{method:'POST',headers:{'Content-Type':blob.type||'audio/webm',...(S.token?{Authorization:'Bearer '+S.token}:{})},body:blob}); const d=await r.json(); if(!r.ok) throw new Error(d.error||r.status); vzPut(id,d.text); }
    catch(e){ toast(String(e.message)==='limit'?'Demasiadas búsquedas por voz seguidas. Espera un momento.':'No se pudo entender la voz. Intenta de nuevo.'); } };
  rec.start(); btn.classList.add('on'); toast('Habla ahora… (toca el micrófono para terminar)'); clearTimeout(VZ.timer); VZ.timer=setTimeout(()=>{ if(rec.state==='recording') rec.stop(); },6000);
}
