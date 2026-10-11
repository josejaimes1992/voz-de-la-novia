/* Voz de la Novia — chat interno del equipo (cabina, músicos, director) */
"use strict";
const CH={list:[],open:false,unread:0,ws:null,retry:0,token:null,loaded:false,seen:0};
const CH_QUICK=['Más lento','Más rápido','Repetir el coro','Siguiente alabanza','Subir volumen','Bajar volumen','Revisar micrófono','Ya vamos'];
(function(){ const st=document.createElement('style'); st.textContent=`
.ch-fab{position:fixed;right:16px;bottom:calc(18px + env(safe-area-inset-bottom,0px));z-index:62;width:54px;height:54px;border-radius:50%;border:0;background:var(--accent);color:var(--accent-ink);box-shadow:0 8px 24px rgba(0,0,0,.35);display:grid;place-items:center;cursor:pointer}
.ch-fab svg{width:26px;height:26px}
.ch-fab b{position:absolute;top:-3px;right:-3px;min-width:20px;height:20px;padding:0 5px;border-radius:10px;background:#e0453a;color:#fff;font:700 11.5px/20px var(--f-ui);box-shadow:0 0 0 2px var(--bg)}
@media (max-width:640px){.ch-fab{bottom:calc(96px + env(safe-area-inset-bottom,0px));width:50px;height:50px}body:has(.pj) .ch-fab{bottom:calc(84px + env(safe-area-inset-bottom,0px))}}
body:has(.pj-mini) .ch-fab,body:has(.pj) .ch-fab{bottom:calc(84px + env(safe-area-inset-bottom,0px))}
body:has(.pjm-body) .ch-fab{bottom:calc(250px + env(safe-area-inset-bottom,0px));right:10px;width:44px;height:44px;opacity:.9}
body:has(.pj) .ch-panel{bottom:calc(150px + env(safe-area-inset-bottom,0px))}
.ch-panel{position:fixed;right:16px;bottom:calc(84px + env(safe-area-inset-bottom,0px));z-index:63;width:min(380px,calc(100vw - 24px));height:min(560px,calc(100vh - 140px));display:flex;flex-direction:column;background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.45);overflow:hidden}
@media (max-width:640px){.ch-panel{right:12px;left:12px;width:auto;bottom:calc(10px + env(safe-area-inset-bottom,0px));height:min(78vh,620px)}}
.ch-h{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid var(--line)}
.ch-h b{flex:1;font-size:15.5px}.ch-h small{display:block;font-weight:500;color:var(--muted);font-size:12px}
.ch-x{border:0;background:var(--sunk);color:var(--ink);width:30px;height:30px;border-radius:50%;font-size:18px;cursor:pointer}
.ch-list{flex:1;overflow:auto;padding:10px 12px;display:flex;flex-direction:column;gap:8px}
.ch-m{max-width:85%;align-self:flex-start;background:var(--sunk);border-radius:14px 14px 14px 4px;padding:7px 11px}
.ch-m.me{align-self:flex-end;background:var(--accent-soft);border-radius:14px 14px 4px 14px}
.ch-m .w{display:flex;gap:8px;justify-content:space-between;font-size:11.5px;color:var(--muted);margin-bottom:2px}.ch-m .w b{color:var(--accent)}
.ch-m p{margin:0;font-size:15px;line-height:1.35;white-space:pre-wrap;word-wrap:break-word}
.ch-day{align-self:center;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin:4px 0}
.ch-empty{margin:auto;text-align:center;color:var(--muted);font-size:14px;padding:20px}
.ch-q{display:flex;gap:6px;overflow-x:auto;padding:8px 12px 0;scrollbar-width:none}
.ch-q button{flex:none;border:1px solid var(--line);background:var(--bg);color:inherit;border-radius:999px;padding:5px 10px;font:600 12.5px var(--f-ui);cursor:pointer}
.ch-f{display:flex;gap:8px;padding:10px 12px;border-top:1px solid var(--line);margin-top:8px}
.ch-f input{flex:1;min-width:0;font:inherit;font-size:16px;padding:10px 12px;border-radius:12px;border:1px solid var(--line);background:var(--bg);color:inherit}
.ch-f button{border:0;border-radius:12px;background:var(--accent);color:var(--accent-ink);font:700 14px var(--f-ui);padding:0 14px;cursor:pointer}
.ch-pop{position:fixed;left:50%;top:calc(12px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:96;width:min(560px,94vw);display:flex;gap:12px;align-items:flex-start;background:#13202e;color:#fff;border:2px solid #5aa9e6;border-radius:16px;padding:12px 14px;box-shadow:0 16px 50px rgba(0,0,0,.55);cursor:pointer;animation:chIn .25s ease}
@keyframes chIn{from{transform:translate(-50%,-20px);opacity:0}}
.ch-pop .i{font-size:24px;line-height:1}.ch-pop b{display:block;color:#9fd3ff;font-size:13px}.ch-pop p{margin:2px 0 0;font-size:17px;line-height:1.35;font-weight:600}
`; document.head.appendChild(st); })();
const CH_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z"/><path d="M8.5 11h7M8.5 14.5h4"/></svg>';
function chTime(t){ const d=new Date(t); return d.toLocaleTimeString('es',{hour:'numeric',minute:'2-digit'}); }
function chDay(t){ const d=new Date(t), n=new Date(); if(d.toDateString()===n.toDateString()) return 'Hoy'; const y=new Date(n); y.setDate(n.getDate()-1); if(d.toDateString()===y.toDateString()) return 'Ayer'; return d.toLocaleDateString('es',{weekday:'long',day:'numeric',month:'short'}); }
function chMine(m){ return S.user&&(m.uid===S.user.id||m.by===S.user.name); }
function chDraw(){
  let fab=document.getElementById('ch-fab');
  if(!S.user){ if(fab) fab.remove(); const p=document.getElementById('ch-panel'); if(p) p.remove(); return; }
  if(!fab){ fab=document.createElement('button'); fab.id='ch-fab'; fab.className='ch-fab'; fab.setAttribute('aria-label','Chat del equipo'); fab.title='Chat del equipo'; fab.addEventListener('click',()=>{ CH.open=!CH.open; chDraw(); }); document.body.appendChild(fab); }
  fab.innerHTML=CH_ICON+(CH.unread?`<b>${CH.unread>9?'9+':CH.unread}</b>`:'');
  let pn=document.getElementById('ch-panel');
  if(!CH.open){ if(pn) pn.remove(); return; }
  CH.unread=0; CH.seen=Date.now(); try{ localStorage.setItem('vdn-chat-seen',String(CH.seen)); }catch{} fab.innerHTML=CH_ICON;
  const keep=pn&&pn.querySelector('#ch-in'); const draft=keep?keep.value:''; const focused=keep&&document.activeElement===keep;
  if(!pn){ pn=document.createElement('div'); pn.id='ch-panel'; pn.className='ch-panel'; pn.setAttribute('role','dialog'); pn.setAttribute('aria-label','Chat del equipo'); document.body.appendChild(pn); }
  let last=''; const msgs=CH.list.map(m=>{ const d=chDay(m.at); const sep=d!==last?`<div class="ch-day">${esc(d)}</div>`:''; last=d; return sep+`<div class="ch-m${chMine(m)?' me':''}"><div class="w"><b>${esc(chMine(m)?'Tú':m.by)}</b><span>${esc(chTime(m.at))}</span></div><p>${esc(m.text)}</p></div>`; }).join('');
  pn.innerHTML=`<div class="ch-h"><b>Chat del equipo<small>Notas entre cabina, músicos y dirección</small></b><button class="ch-x" data-ch="close" aria-label="Cerrar">×</button></div>
    <div class="ch-list" id="ch-list">${!CH.loaded?'<div class="ch-empty">Cargando…</div>':msgs||'<div class="ch-empty">Aún no hay mensajes.<br>Escribe una nota para el equipo.</div>'}</div>
    <div class="ch-q">${CH_QUICK.map(q=>`<button data-ch="quick" data-t="${esc(q)}">${esc(q)}</button>`).join('')}</div>
    <form class="ch-f" id="ch-f"><input id="ch-in" maxlength="500" autocomplete="off" placeholder="Escribe una nota…" value="${esc(draft)}" aria-label="Mensaje"><button type="submit">Enviar</button></form>`;
  const L=pn.querySelector('#ch-list'); L.scrollTop=L.scrollHeight;
  pn.querySelector('#ch-f').addEventListener('submit',e=>{ e.preventDefault(); const i=pn.querySelector('#ch-in'); chSend(i.value); i.value=''; i.focus(); });
  if(focused) pn.querySelector('#ch-in').focus();
}
async function chSend(text){ text=String(text||'').trim(); if(!text) return;
  try{ await api('/api/chat',{method:'POST',body:JSON.stringify({text})}); if(!CH.ws||CH.ws.readyState!==1) chLoad(); }
  catch(e){ toast('No se pudo enviar. Revisa el internet.'); } }
async function chLoad(){ if(!S.user) return; try{ const d=await api('/api/chat'); CH.list=d.messages||[]; CH.loaded=true;
  let seen=0; try{ seen=+localStorage.getItem('vdn-chat-seen')||0; }catch{} if(!CH.open) CH.unread=CH.list.filter(m=>m.at>seen&&!chMine(m)).length; chDraw(); }catch{} }
function chPop(m){
  const old=document.getElementById('ch-pop'); if(old) old.remove();
  const el=document.createElement('div'); el.id='ch-pop'; el.className='ch-pop'; el.innerHTML=`<span class="i">💬</span><div><b>${esc(m.by)} · ${esc(chTime(m.at))}</b><p>${esc(m.text)}</p></div>`;
  el.addEventListener('click',()=>{ el.remove(); CH.open=true; chDraw(); }); document.body.appendChild(el); setTimeout(()=>el.remove(),9000);
  try{ const a=new (window.AudioContext||window.webkitAudioContext)(); const o=a.createOscillator(), g=a.createGain(); o.frequency.value=880; g.gain.value=.06; o.connect(g); g.connect(a.destination); o.start(); setTimeout(()=>{ o.frequency.value=1320; },110); setTimeout(()=>{ o.stop(); a.close(); },240); }catch{}
  try{ navigator.vibrate&&navigator.vibrate(120); }catch{}
}
function chConnect(){
  if(!S.user||!S.token) return; if(CH.ws&&CH.ws.readyState<=1&&CH.token===S.token) return;
  if(CH.ws){ try{ CH.ws.onclose=null; CH.ws.close(); }catch{} }
  CH.token=S.token; const ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws/equipo?t='+encodeURIComponent(S.token)); CH.ws=ws;
  ws.onopen=()=>{ CH.retry=0; chLoad(); };
  ws.onmessage=e=>{ let d; try{ d=JSON.parse(e.data); }catch{ return; } if(d&&d._sung&&window.setSung){ setSung(d._sung); return; } if(!d||!d._chat) return; const m=d._chat; if(CH.list.some(x=>x.id===m.id)) return; CH.list.push(m); if(CH.list.length>120) CH.list.shift();
    if(!chMine(m)){ if(!CH.open) CH.unread++; chPop(m); } chDraw(); };
  ws.onclose=()=>{ CH.ws=null; if(!S.user) return; CH.retry=Math.min(CH.retry+1,6); setTimeout(chConnect,1000*CH.retry*2); };
  const ping=setInterval(()=>{ if(ws.readyState===1) ws.send('ping'); else if(ws.readyState>1) clearInterval(ping); },25000);
}
document.addEventListener('click',e=>{ const b=e.target.closest('[data-ch]'); if(!b) return; if(b.dataset.ch==='close'){ CH.open=false; chDraw(); } else if(b.dataset.ch==='quick') chSend(b.dataset.t); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&CH.open&&e.target.closest&&e.target.closest('#ch-panel')){ CH.open=false; chDraw(); } });
/* Se activa al ingresar y se apaga al salir */
let chWasUser=null;
setInterval(()=>{ const u=S.user?S.user.id:null; if(u!==chWasUser){ chWasUser=u; if(u){ chLoad(); chConnect(); } else { if(CH.ws){ try{ CH.ws.onclose=null; CH.ws.close(); }catch{} CH.ws=null; } CH.list=[]; CH.loaded=false; CH.unread=0; CH.open=false; } chDraw(); } },1000);
document.addEventListener('visibilitychange',()=>{ if(!document.hidden&&S.user){ chConnect(); chLoad(); } });
