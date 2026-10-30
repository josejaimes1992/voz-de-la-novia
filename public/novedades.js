/* Voz de la Novia — "Qué hay de nuevo": después de una mejora, se muestra una vez lo que cambió */
(()=>{
  const KEY='vdn-novedades-vista';
  const get=()=>{ try{ return localStorage.getItem(KEY)||''; }catch{ return 'x'; } };
  const set=v=>{ try{ localStorage.setItem(KEY,v); }catch{} };
  const vn=v=>String(v).split('.').map(n=>parseInt(n)||0).reduce((a,n)=>a*1000+n,0);
  const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  async function run(){
    let N=[]; try{ N=await (await fetch('/novedades.json',{cache:'no-cache'})).json(); }catch{ return; }
    if(!Array.isArray(N)||!N.length) return; const top=N[0].v; const seen=get();
    /* Primera vez en esta PC: si ya se usaba (hay sesión), se muestra lo de esta versión; si es nueva, nada */
    if(!seen){ let used=false; try{ used=!!localStorage.getItem('vdn-token'); }catch{} if(!used||!N[1]){ set(top); return; } return show(N,top,N[1].v); }
    if(seen==='x'||vn(seen)>=vn(top)) return; show(N,top,seen); }
  function show(N,top,seen){
    const nuevas=N.filter(x=>vn(x.v)>vn(seen)).slice(0,4);
    const box=document.createElement('div');
    box.style.cssText='position:fixed;inset:0;z-index:9500;background:rgba(0,0,0,.55);display:grid;place-items:center;padding:16px';
    box.innerHTML=`<div role="dialog" aria-label="Novedades" style="width:min(520px,100%);max-height:85vh;overflow:auto;background:#141416;color:#efece4;border:1px solid #3a3320;border-radius:18px;padding:20px 20px 16px;font:15px/1.5 system-ui,Segoe UI,sans-serif;box-shadow:0 20px 50px rgba(0,0,0,.5)">
      <div style="font-size:28px">✨</div><h2 style="margin:4px 0 2px;font-size:20px">¡Voz de la Novia se actualizó!</h2><p style="margin:0 0 12px;color:#a7a395;font-size:13.5px">Esto es lo nuevo:</p>
      ${nuevas.map(x=>`<div style="margin:0 0 12px"><b style="color:#e9c45a">Versión ${esc(x.v)}</b><ul style="margin:4px 0 0;padding-left:20px">${x.items.map(i=>`<li style="margin:3px 0">${esc(i)}</li>`).join('')}</ul></div>`).join('')}
      <button type="button" style="margin-top:4px;width:100%;border:0;border-radius:12px;padding:12px;background:#e9c45a;color:#14110a;font-weight:800;font-size:15px;cursor:pointer">Entendido</button></div>`;
    const close=()=>{ set(top); box.remove(); };
    box.querySelector('button').onclick=close; box.addEventListener('click',e=>{ if(e.target===box) close(); });
    document.body.appendChild(box);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(run,1500)); else setTimeout(run,1500);
})();
