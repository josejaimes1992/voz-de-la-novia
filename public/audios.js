/* Voz de la Novia — audios por canción (ensayos, originales, voces) */
"use strict";
const AUD_ACCEPT='audio/*,.mp3,.m4a,.aac,.wav,.ogg,.webm,.flac,.3gp,.amr';
const AUD_EXT_TYPE={mp3:'audio/mpeg',m4a:'audio/mp4',aac:'audio/aac',wav:'audio/wav',ogg:'audio/ogg',webm:'audio/webm',flac:'audio/flac','3gp':'audio/3gpp',amr:'audio/amr'};
function audSize(n){ return n>1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB'; }
function audioSection(s,compact){
  const list=s.audio||[];
  if(!list.length&&!S.canWrite) return '';
  return `<section class="aud" aria-label="Audios de la canción">
    <div class="aud-h"><b>Audios</b>${S.canWrite?`<label class="btn" style="cursor:pointer">＋ Subir audio<input type="file" accept="${AUD_ACCEPT}" data-aud-up="${esc(s.id)}" hidden></label>`:''}</div>
    <div id="aud-prog" class="muted" style="font-size:13px" hidden></div>
    ${list.length?list.map(a=>`<div class="aud-row">
      <div class="aud-meta"><b>${esc(a.name)}</b><small class="muted">${esc(a.by||'')} · ${esc(fmtWhen(a.at))}${a.duration?' · '+Math.floor(a.duration/60)+':'+String(a.duration%60).padStart(2,'0'):''} · ${audSize(a.size||0)}${a.original&&a.original>a.size*1.2?` (comprimido de ${audSize(a.original)})`:''}</small></div>
      <audio controls preload="none" src="/audio/${esc(a.id)}" data-aud-player></audio>
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
