/* Voz de la Novia — poner acordes tocando la letra (sin escribir corchetes) */
"use strict";
const PL={li:null,pos:null,root:7,q:'',bass:null,existing:null};
const PL_QUAL=[['','Mayor'],['m','menor'],['7','7'],['m7','m7'],['maj7','maj7'],['sus4','sus4'],['sus2','sus2'],['add9','add9'],['6','6'],['dim','dim'],['aug','aug']];

/* Recorre una línea y devuelve palabras con su posición en el texto y los acordes que tienen delante */
function plWords(line){
  const toks=[]; let i=0, cur=null;
  while(i<line.length){
    if(line[i]==='['){ const j=line.indexOf(']',i); if(j<0){ i++; continue; }
      const join=!!(cur&&cur.text); if(cur) toks.push(cur);
      cur={pos:i,chord:{text:line.slice(i+1,j),start:i,end:j+1},text:'',join}; i=j+1; continue; }
    if(/\s/.test(line[i])){ if(cur){ toks.push(cur); cur=null; } i++; continue; }
    if(!cur) cur={pos:i,chord:null,text:'',join:false};
    cur.text+=line[i]; i++;
  }
  if(cur) toks.push(cur);
  return toks;
}
function plRender(){
  const ta=edTA(), pv=$('#e-prev'); if(!ta||!pv) return;
  const k=parseKey($('#e-key').value); const flat=useFlatFor(k,0);
  const lines=ta.value.split('\n');
  let html='<p class="muted" style="margin:0 0 10px;font-size:13px">Toca una palabra para ponerle un acorde encima. Toca un acorde para cambiarlo o quitarlo.</p><div class="placer">';
  lines.forEach((line,li)=>{
    if(/^\s*#/.test(line)){ html+=`<div class="pl-sec">${esc(line.replace(/^\s*#+\s*/,''))}</div>`; return; }
    if(!line.trim()){ html+='<div class="pl-gap"></div>'; return; }
    const ws=plWords(line);
    html+='<div class="pl-ln">'+ws.map(w=>{
      const c=w.chord?esc(fmtChord(w.chord.text,0,flat,V.latin)):'';
      const inner=esc(w.text);
      return `<button type="button" class="pl-w${w.chord?' has':''}${w.join?' join':''}" data-act="pl-pick" data-li="${li}" data-pos="${w.pos}"><span class="pl-c">${c||'+'}</span><span class="pl-t">${inner||'&nbsp;'}</span></button>`;
    }).join('')+`<button type="button" class="pl-w end" data-act="pl-pick" data-li="${li}" data-pos="${line.length}" aria-label="Acorde al final de la línea"><span class="pl-c">+</span><span class="pl-t">&nbsp;</span></button></div>`;
  });
  pv.innerHTML=html+'</div>';
}
function plChordName(){ return SHARP[PL.root]+PL.q+(PL.bass!=null&&PL.bass!==PL.root?'/'+SHARP[PL.bass]:''); }
function plOpen(li,pos){
  const ta=edTA(); const line=ta.value.split('\n')[li]||''; PL.li=li; PL.pos=pos; PL.existing=null;
  if(line[pos]==='['){ const j=line.indexOf(']',pos); if(j>0){ PL.existing={start:pos,end:j+1,text:line.slice(pos+1,j)}; const c=parseChord(PL.existing.text); if(c){ PL.root=c.root; PL.q=c.suf; PL.bass=c.bass; } } }
  plDraw();
}
function plUsed(){ const set=new Map(); const re=/\[([^\]]+)\]/g; let m; const t=edTA().value; while((m=re.exec(t))){ const c=parseChord(m[1]); if(c){ const n=SHARP[c.root]+c.suf+(c.bass!=null?'/'+SHARP[c.bass]:''); set.set(n,c); } } return set; }
function plDraw(){
  const nameOf=i=>V.latin?noteName(i,false,true):SHARP[i];
  const used=plUsed();
  $('#modal-root').innerHTML=`<div class="scrim" data-act="close-modal"><div class="modal" role="dialog" aria-label="Elegir acorde" data-stop style="width:min(460px,100%)">
    <header><h3>Acorde: <span style="color:var(--chord)">${esc(fmtChord(plChordName(),0,false,V.latin))}</span></h3><button class="btn ghost" data-act="close-modal" aria-label="Cerrar">${ICON.x}</button></header>
    <div class="body" style="display:grid;gap:12px">
      ${used.size?`<div><small class="muted">Usados en esta canción</small><div class="pl-grid">${[...used.keys()].map(n=>`<button class="chip" data-act="pl-used" data-n="${esc(n)}">${esc(fmtChord(n,0,false,V.latin))}</button>`).join('')}</div></div>`:''}
      <div><small class="muted">Nota</small><div class="pl-grid">${SHARP.map((n,i)=>`<button class="chip" data-act="pl-root" data-v="${i}" aria-pressed="${PL.root===i}">${esc(nameOf(i))}</button>`).join('')}</div></div>
      <div><small class="muted">Tipo</small><div class="pl-grid">${PL_QUAL.map(([v,t])=>`<button class="chip" data-act="pl-q" data-v="${v}" aria-pressed="${PL.q===v}">${t}</button>`).join('')}</div></div>
      <div><small class="muted">Bajo (opcional)</small><div class="pl-grid"><button class="chip" data-act="pl-bass" data-v="" aria-pressed="${PL.bass==null}">Ninguno</button>${SHARP.map((n,i)=>`<button class="chip" data-act="pl-bass" data-v="${i}" aria-pressed="${PL.bass===i}">/${esc(nameOf(i))}</button>`).join('')}</div></div>
      <div class="actions"><button class="btn" data-act="pl-listen">${ICON.play}Escuchar</button><span class="spacer"></span>${PL.existing?'<button class="btn danger" data-act="pl-remove">Quitar</button>':''}<button class="btn pri" data-act="pl-put">${PL.existing?'Cambiar':'Poner'} acorde</button></div>
    </div></div></div>`;
}
function plApply(text){
  const ta=edTA(); const lines=ta.value.split('\n'); let line=lines[PL.li]||'';
  if(PL.existing) line=line.slice(0,PL.existing.start)+(text?'['+text+']':'')+line.slice(PL.existing.end);
  else if(text) line=line.slice(0,PL.pos)+'['+text+']'+line.slice(PL.pos);
  lines[PL.li]=line; ta.value=lines.join('\n'); closeModal(); plRender(); ta.dispatchEvent(new Event('input'));
}
document.addEventListener('click',ev=>{
  const el=ev.target.closest('[data-act]'); if(!el) return; const a=el.dataset.act, d=el.dataset;
  if(a==='pl-toggle'){ V.placer=!V.placer; el.setAttribute('aria-pressed',V.placer); el.textContent=V.placer?'Ver vista previa':'Poner acordes tocando'; if(V.placer) plRender(); else edTA().dispatchEvent(new Event('input')); }
  else if(a==='pl-pick') plOpen(Number(d.li),Number(d.pos));
  else if(a==='pl-root'){ PL.root=Number(d.v); plDraw(); }
  else if(a==='pl-q'){ PL.q=d.v; plDraw(); }
  else if(a==='pl-bass'){ PL.bass=d.v===''?null:Number(d.v); plDraw(); }
  else if(a==='pl-used'){ const c=parseChord(d.n); if(c){ PL.root=c.root; PL.q=c.suf; PL.bass=c.bass; plDraw(); } }
  else if(a==='pl-listen'){ if(window.Acordes) Acordes.load().then(()=>Acordes.play(V.inst==='piano'?'piano':V.inst,PL.root,PL.q,PL.bass,0)); }
  else if(a==='pl-put') plApply(plChordName());
  else if(a==='pl-remove') plApply('');
});
