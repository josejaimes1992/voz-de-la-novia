/* Voz de la Novia — audios por canción (ensayos, originales, voces) */
"use strict";
const AUD_ACCEPT='audio/*,.mp3,.m4a,.aac,.wav,.ogg,.webm,.flac,.3gp,.amr';
const AUD_EXT_TYPE={mp3:'audio/mpeg',m4a:'audio/mp4',aac:'audio/aac',wav:'audio/wav',ogg:'audio/ogg',webm:'audio/webm',flac:'audio/flac','3gp':'audio/3gpp',amr:'audio/amr'};
function audSize(n){ return n>1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB'; }
function audioSection(s,compact){
  const list=s.audio||[];
  if(!list.length&&!S.canWrite) return '';
  return `<section class="aud" aria-label="Audios de la canción">
    <div class="aud-h"><b>Audios</b>${S.canWrite?`<label class="btn" style="cursor:pointer">＋ Subir audio<input type="file" accept="${AUD_ACCEPT}" data-aud-up="${esc(s.id)}" hidden></label><button class="btn" data-act="aud-rec" data-id="${esc(s.id)}" title="Grabar con el micrófono (por ejemplo, mientras suena el video)">🎙 Grabar</button>`:''}</div>
    <div id="aud-prog" class="muted" style="font-size:13px" hidden></div>
    ${list.length?list.map(a=>`<div class="aud-row">
      <div class="aud-meta"><b>${esc(a.name)}</b><small class="muted">${esc(a.by||'')} · ${esc(fmtWhen(a.at))}${a.duration?' · '+Math.floor(a.duration/60)+':'+String(a.duration%60).padStart(2,'0'):''} · ${audSize(a.size||0)}${a.original&&a.original>a.size*1.2?` (comprimido de ${audSize(a.original)})`:''}</small></div>
      <audio controls ${S.canWrite?'':'controlslist="nodownload" oncontextmenu="return false"'} preload="none" src="/audio/${esc(a.id)}" data-aud-player></audio>
      <div class="aud-ops"><span class="muted" style="font-size:12px">Velocidad</span>${[0.75,0.9,1].map(r=>`<button class="chip" data-act="aud-rate" data-r="${r}">${r===1?'Normal':r+'×'}</button>`).join('')}
        ${S.isAdmin||(S.user&&S.user.name===a.by)?(V.confirm==='aud-'+a.id?`<span class="confirm">¿Borrar? <button class="btn danger" data-act="aud-del-yes" data-s="${esc(s.id)}" data-id="${esc(a.id)}">Sí</button><button class="btn" data-act="confirm-no">No</button></span>`:`<button class="btn ghost danger" data-act="aud-del" data-id="${esc(a.id)}">Borrar</button>`):''}</div>
    </div>`).join(''):`<p class="muted" style="margin:0;font-size:13px">Aún no hay audios. Sube la canción original o un ensayo (MP3, M4A, WAV… hasta 100 MB). Se comprime solo para ocupar poco espacio.</p>`}
  </section>`;
}
function audUpload(songId,file){
  if(!file) return;
  if(file.size>100*1024*1024){ toast('El archivo es muy grande. El máximo es 100 MB.'); return; }
  const ext=(file.name.split('.').pop()||'').toLowerCase(); const type=(file.type&&file.type.startsWith('audio/'))?file.type:AUD_EXT_TYPE[ext];
  if(!type){ toast('Ese archivo no parece un audio. Usa MP3, M4A, WAV u OGG.'); return; }
  const name=file.name.replace(/\.[^.]+$/,'').slice(0,80);
  const prog=$('#aud-prog'); if(prog){ prog.hidden=false; prog.textContent='Subiendo… 0%'; }
  const xhr=new XMLHttpRequest(); xhr.open('POST',`/api/audio/${encodeURIComponent(songId)}?name=${encodeURIComponent(name)}`);
  xhr.setRequestHeader('Authorization','Bearer '+S.token); xhr.setRequestHeader('Content-Type',type);
  xhr.upload.onprogress=e=>{ if(prog&&e.lengthComputable){ const pc=Math.round(e.loaded/e.total*100); prog.textContent=pc<100?`Subiendo… ${pc}%`:'Comprimiendo el audio… puede tardar unos segundos'; } };
  xhr.onload=async()=>{ if(prog) prog.hidden=true;
    if(xhr.status===200){ let m='Audio subido.'; try{ const r=JSON.parse(xhr.responseText).audio; if(r.original>r.size*1.2) m=`Audio subido y comprimido: ${audSize(r.original)} → ${audSize(r.size)}.`; }catch{} toast(m); lastSig=''; await loadData(); render(); }
    else if(xhr.status===401){ lostAuth(); } else if(xhr.status===415) toast('Formato de audio no compatible.'); else if(xhr.status===413) toast('El archivo es muy grande.'); else toast('No se pudo subir el audio.'); };
  xhr.onerror=()=>{ if(prog) prog.hidden=true; toast('No se pudo subir el audio. Revisa tu conexión.'); };
  xhr.send(file);
}
document.addEventListener('change',e=>{ const el=e.target; if(el.dataset&&el.dataset.audUp){ audUpload(el.dataset.audUp,el.files[0]); el.value=''; } });
document.addEventListener('click',async ev=>{
  const el=ev.target.closest('[data-act]'); if(!el) return; const a=el.dataset.act, d=el.dataset;
  if(a==='aud-rate'){ const row=el.closest('.aud-row'); const p=row&&row.querySelector('audio'); if(p){ p.playbackRate=Number(d.r); p.preservesPitch=true; row.querySelectorAll('[data-act=aud-rate]').forEach(b=>b.setAttribute('aria-pressed',b===el)); } }
  else if(a==='aud-del'){ V.confirm='aud-'+d.id; render(); }
  else if(a==='aud-del-yes'){ V.confirm=null; try{ await api(`/api/audio/${encodeURIComponent(d.s)}/${d.id}`,{method:'DELETE'}); toast('Audio borrado.'); lastSig=''; await loadData(); render(); }catch(e){ if(e.code===401) lostAuth(); else toast(e.code===403?'Solo quien lo subió o el administrador puede borrarlo.':'No se pudo borrar el audio.'); } }
});
/* Solo un audio suena a la vez */
document.addEventListener('play',e=>{ if(e.target.tagName==='AUDIO') document.querySelectorAll('audio').forEach(x=>{ if(x!==e.target) x.pause(); }); },true);

/* ---------- Grabar con el micrófono (por ejemplo, mientras suena la canción en otro equipo o en YouTube) ---------- */
window.recordAudio=function(){
  return new Promise(async resolve=>{
    if(!navigator.mediaDevices||!window.MediaRecorder){ toast('Este navegador no permite grabar audio.'); return resolve(null); }
    let stream; try{ stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:true}}); }catch{ toast('Permite el micrófono para grabar.'); return resolve(null); }
    const type=['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg'].find(t=>MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(t))||'';
    const rec=new MediaRecorder(stream,type?{mimeType:type,audioBitsPerSecond:96000}:undefined); const chunks=[]; let t0=0, tick=null, done=false;
    const root=document.createElement('div'); root.className='scrim'; root.style.zIndex='60';
    root.innerHTML=`<div class="modal" role="dialog" aria-label="Grabar audio" style="width:min(420px,100%)"><header><h3>🎙 Grabar audio</h3></header><div class="body" style="display:grid;gap:12px;text-align:center">
      <p class="muted" style="margin:0;font-size:13.5px">Pon a sonar la canción (en YouTube, otro teléfono o el parlante) cerca del micrófono. Mientras más clara se escuche la voz, mejor saldrá la letra.</p>
      <div id="rec-t" style="font:700 40px var(--f-mono)">0:00</div><canvas id="rec-v" width="320" height="50" style="width:100%;height:50px"></canvas>
      <div class="actions" style="justify-content:center"><button class="btn pri" id="rec-stop" style="background:#d93a2f;border-color:#d93a2f">■ Terminar y usar</button><button class="btn" id="rec-cancel">Cancelar</button></div>
      <p class="muted" style="margin:0;font-size:12px">Máximo 10 minutos.</p></div></div>`;
    document.body.appendChild(root);
    const AC=window.AudioContext||window.webkitAudioContext; let ac=null, an=null; try{ ac=new AC(); an=ac.createAnalyser(); an.fftSize=512; ac.createMediaStreamSource(stream).connect(an); }catch{}
    const cv=root.querySelector('#rec-v'), g=cv.getContext('2d'); const buf=new Uint8Array(512);
    const draw=()=>{ if(done) return; if(an){ an.getByteTimeDomainData(buf); g.clearRect(0,0,320,50); g.strokeStyle='#d93a2f'; g.lineWidth=2; g.beginPath(); for(let i=0;i<buf.length;i+=2){ const x=i/buf.length*320, y=buf[i]/255*50; i?g.lineTo(x,y):g.moveTo(x,y); } g.stroke(); } requestAnimationFrame(draw); };
    const finish=(use)=>{ if(done) return; done=true; clearInterval(tick); rec.onstop=()=>{ stream.getTracks().forEach(t=>t.stop()); try{ ac&&ac.close(); }catch{} root.remove();
        if(!use) return resolve(null); const blob=new Blob(chunks,{type:rec.mimeType||'audio/webm'}); if(blob.size<4000){ toast('La grabación quedó vacía.'); return resolve(null); }
        const ext=/mp4/.test(blob.type)?'m4a':/ogg/.test(blob.type)?'ogg':'webm'; const d=new Date();
        resolve(new File([blob],`Grabación ${d.toLocaleDateString('es')} ${d.toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'})}.${ext}`.replace(/[\/:]/g,'-'),{type:blob.type.split(';')[0]})); };
      try{ rec.stop(); }catch{ rec.onstop(); } };
    rec.ondataavailable=e=>{ if(e.data&&e.data.size) chunks.push(e.data); };
    root.querySelector('#rec-stop').onclick=()=>finish(true); root.querySelector('#rec-cancel').onclick=()=>finish(false);
    rec.start(1000); t0=Date.now(); draw();
    tick=setInterval(()=>{ const s=Math.floor((Date.now()-t0)/1000); const el=root.querySelector('#rec-t'); if(el) el.textContent=`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; if(s>=600) finish(true); },250);
  });
};
document.addEventListener('click',async ev=>{ const el=ev.target.closest('[data-act="aud-rec"]'); if(!el) return; const f=await recordAudio(); if(f) audUpload(el.dataset.id,f); });
