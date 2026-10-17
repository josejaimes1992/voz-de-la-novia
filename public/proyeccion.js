/* Voz de la Novia — control de proyección en vivo (solo equipo) */
"use strict";
const PJ={min:false,q:'',open:false,programId:null,songIds:[],si:0,remote:null,ws:null,retry:0,online:false,timer:null,sending:false};

(function(){ const st=document.createElement('style'); st.textContent=`
.pj{position:fixed;inset:0;z-index:45;background:var(--bg);display:flex;flex-direction:column;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
.pj-top{display:flex;gap:8px;align-items:center;padding:8px 16px;border-bottom:1px solid var(--line);background:var(--surface);flex-wrap:wrap}
.pj-top .ttl{flex:1;min-width:0;font-family:var(--f-display);font-weight:700;font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pj-top a.btn{text-decoration:none;color:inherit}
.pj-st{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--muted);font-weight:600}
.pj-st::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--danger)}
.pj-st.on::before{background:var(--ok)}
.pj-songs{display:flex;gap:6px;overflow-x:auto;padding:10px 16px 0;scrollbar-width:none}
.pj-songs .chip{font-family:var(--f-ui);font-weight:600;white-space:nowrap}
.pj-songs .chip[aria-pressed="true"]{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
.pj-body{flex:1;overflow:auto;padding:12px 16px 20px}
.pj-now{display:grid;grid-template-columns:minmax(0,220px) minmax(0,1fr);gap:14px;align-items:center;margin-bottom:14px}
.pj-scr{aspect-ratio:16/9;background:#000;border-radius:8px;border:1px solid var(--line);display:grid;place-items:center;padding:8px;overflow:hidden;color:#fff;text-align:center;font-weight:700;font-size:11px;line-height:1.25;white-space:pre-line}
.pj-scr img{height:70%;width:auto}
.pj-now small{color:var(--muted);font-size:13px;display:block}
.pj-now b{font-size:15px}
.pj-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px}
.pj-sl{display:grid;gap:6px;text-align:left;border:1px solid var(--line);background:var(--surface);border-radius:10px;padding:10px 12px;min-height:96px;align-content:start}
.pj-sl:hover{border-color:var(--accent)}
.pj-sl .h{display:flex;justify-content:space-between;gap:8px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--accent);font-weight:700}
.pj-sl .h span:last-child{color:var(--muted);font-family:var(--f-mono)}
.pj-sl p{margin:0;white-space:pre-line;font-size:15px;line-height:1.35}
.pj-sl[aria-current="true"]{border:2px solid var(--accent);background:var(--accent-soft);padding:9px 11px}
.pj-bot{display:grid;grid-template-columns:1fr 1fr 1.4fr 1.4fr;gap:8px;padding:8px 16px;border-top:1px solid var(--line);background:var(--surface)}
.pj-bot .btn{justify-content:center;padding:12px 8px;font-size:15px}
.pj-bot .btn[aria-pressed="true"]{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
.pj-empty{color:var(--muted);padding:20px 0}
.pj-vch{display:inline-flex;gap:3px;margin-right:6px;vertical-align:middle}.pj-vch span{font:600 10px var(--f-mono,monospace);border:1px solid var(--line);border-radius:5px;padding:0 4px;color:var(--muted);cursor:pointer;background:var(--bg)}.pj-vch span:hover{border-color:var(--accent);color:var(--accent)}
.obs-ch{display:grid;gap:2px}.obs-ch .ch{display:block;white-space:pre-line;border-radius:6px;padding:1px 6px;margin:0 -6px}.obs-ch .ch+.ch{border-top:1px dashed color-mix(in srgb,currentColor 30%,transparent)}[aria-current="true"] .obs-ch .ch.on{background:color-mix(in srgb,var(--accent) 30%,transparent);outline:2px solid var(--accent)}
/* ---- Consola en el celular: letra grande primero, luego el programa y al final el buscador ---- */
.pjm-now{display:flex;align-items:center;gap:8px;padding:6px 16px;font-size:13px;font-weight:600;border-bottom:1px solid var(--line);background:var(--surface);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pjm-now small{color:var(--muted);font-weight:500;margin-right:4px}
.pjm-now i{flex:none;width:8px;height:8px;border-radius:50%;background:var(--muted)}.pjm-now i.on{background:#e05a4f}
.pjm-body{display:block;padding:10px 12px 14px;-webkit-overflow-scrolling:touch}
.pjm-body .pj-sl{display:block;width:100%;height:auto;min-height:0;margin:0 0 8px;padding:12px 14px;overflow:visible;-webkit-appearance:none;appearance:none;font:inherit;color:inherit}
.pjm-body .pj-sl .h{margin-bottom:6px}
.pjm-body .pj-sl p{display:block;overflow-wrap:anywhere}
.pjm-body .pj-sl p{font-size:clamp(19px,5vw,26px);line-height:1.38;font-weight:500}
.pjm-body .pj-sl[aria-current="true"]{background:#2b5f93;border-color:#3d8fd6;color:#fff}.pjm-body .pj-sl[aria-current="true"] .h span{color:#d6ecff}
.pjm-prog{display:flex;gap:6px;overflow-x:auto;padding:8px 12px;border-top:1px solid var(--line);background:var(--surface);scrollbar-width:none;flex:none}
.pjm-it{flex:none;width:150px;text-align:left;border:1px solid var(--line);background:var(--bg);color:inherit;border-radius:10px;padding:6px 9px;font:inherit;cursor:pointer;display:grid;gap:1px}
.pjm-it .n{font:700 11px var(--f-mono);color:var(--muted)}.pjm-it .n i{color:#e05a4f;font-style:normal}
.pjm-it b{font-size:13.5px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pjm-it small{font-size:11.5px;color:var(--muted)}
.pjm-it[aria-pressed="true"]{border:2px solid var(--accent);padding:5px 8px}
.pjm-find{position:relative;padding:8px 12px;border-top:1px solid var(--line);background:var(--surface);flex:none}
.pjm-find input{width:100%;font:inherit;font-size:16px;padding:10px 12px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:inherit}
.pjm-res{position:absolute;left:8px;right:8px;bottom:100%;max-height:58vh;overflow:auto;background:var(--surface);border:1px solid var(--line);border-radius:14px 14px 0 0;box-shadow:0 -12px 30px rgba(0,0,0,.35);padding:4px 8px;display:none;z-index:5}
.pjm-res:not(:empty){display:block}
@media (max-width:640px){.pj-top{padding:6px 10px;gap:6px}.pj-top .btn{padding:6px 9px;font-size:13px}.pj-top .ttl{font-size:16px}
  .pj-bot{grid-template-columns:.8fr .8fr 1.2fr 1.4fr;gap:6px;padding:6px 10px}.pj-bot .btn{padding:10px 4px;font-size:14px}}

.pjw-grid.side.bbmode{grid-template-columns:minmax(0,1fr) minmax(290px,26%) minmax(220px,18%)}
.pjw-grid{position:relative}.pjw-grid.bbmode>.pjw-lib{position:absolute;z-index:3;left:14px;top:8px;width:auto;background:transparent;border:0;min-height:0}
.pjw-grid.bbmode>.pjw-lib .pjw-tabs{border:1px solid var(--line);border-radius:10px;box-shadow:0 4px 14px rgba(0,0,0,.15)}
.pjw-bb{overflow:auto;padding:58px 14px 14px}
.pjw-bb .bb-live,.pjw-bb [data-act="open-proj"],.pjw-bb [data-act="proj-style"]{display:none!important}
.pjw-bb .bb-vlist{max-height:calc(100vh - 290px)}
.pjw-bb .bb-bar{position:sticky;bottom:0}

.pjw-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:6px;border-bottom:1px solid var(--line);background:var(--surface)}
.pjw-tabs button{border:1px solid var(--line);background:var(--bg);color:var(--muted);border-radius:8px;padding:7px 4px;font:700 12.5px var(--f-ui);cursor:pointer}
.pjw-tabs button[aria-pressed="true"]{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
.pjw-h select{padding:3px 6px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:inherit;font:600 12px var(--f-ui)}

.pj-it{position:relative}
.pj-it.pick{outline:2px solid #3d8fd6;outline-offset:-2px;background:color-mix(in srgb,#3d8fd6 16%,transparent)}
.pj-it .rm{position:absolute;right:4px;top:4px;width:20px;height:20px;border-radius:50%;display:none;place-items:center;font-size:14px;line-height:1;color:var(--muted);background:var(--sunk)}
.pj-it:hover .rm{display:grid}.pj-it .rm:hover{background:#e05a4f;color:#fff}
.pj-it.drop-before{box-shadow:0 -3px 0 #3d8fd6}
.pj-drop{margin:6px 2px;padding:12px 8px;border:2px dashed var(--line);border-radius:10px;text-align:center;color:var(--muted);font-size:12.5px}
.pj-drop.drop-on{border-color:#3d8fd6;background:color-mix(in srgb,#3d8fd6 12%,transparent);color:var(--ink)}
.pj-side-tip{margin:4px 6px 10px;font-size:11.5px;color:var(--muted);line-height:1.4}.pj-side-tip kbd{border:1px solid var(--line);border-radius:4px;padding:0 4px;font-size:10.5px}
.pj-side-h .btn.sm{padding:5px 10px;font-size:12px}
.pjw-row .add{flex:none;width:22px;height:22px;border-radius:6px;display:grid;place-items:center;font-size:14px;font-weight:700;color:var(--muted);border:1px solid var(--line);opacity:.55}
.pjw-row:hover .add{opacity:1}.pjw-row .add:hover{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
.pjw-row[draggable="true"]{cursor:grab}

/* ---- Vista de computadora tipo Holyrics ---- */
.pjw .pj-top .ttl small{font-family:var(--f-ui);font-weight:600;font-size:13px}
.pjw-grid{flex:1;min-height:0;display:grid;grid-template-columns:minmax(230px,22%) minmax(0,1fr) minmax(300px,28%);background:var(--line);gap:1px}
.pjw-grid.side{grid-template-columns:minmax(220px,19%) minmax(0,1fr) minmax(290px,26%) minmax(220px,18%)}
.pjw-grid>section,.pjw-grid>aside{background:var(--bg);display:flex;flex-direction:column;min-height:0;min-width:0}
.pjw-grid>aside.pj-side{border:0;max-height:none}
.pjw-h{display:flex;align-items:center;gap:8px;padding:8px 12px;font:700 12px var(--f-ui);text-transform:uppercase;letter-spacing:.06em;color:var(--muted);border-bottom:1px solid var(--line);background:var(--surface);min-height:40px}
.pjw-h .sp{flex:1}.pjw-h .pv{color:#5aa9e6;white-space:nowrap}.pjw-h .btn.sm{padding:4px 10px;font-size:12px;text-transform:none;letter-spacing:0}
.pjw-q{padding:8px;border-bottom:1px solid var(--line)}
.pjw-q input{width:100%;font:inherit;font-size:15px;padding:8px 10px;border-radius:8px;border:1px solid var(--line);background:var(--surface);color:inherit}
.pjw-scroll{flex:1;overflow:auto;min-height:0}
.pjw-row{display:flex;align-items:center;gap:8px;width:100%;text-align:left;border:0;border-bottom:1px solid color-mix(in srgb,var(--line) 60%,transparent);background:none;color:inherit;font:inherit;padding:6px 10px;cursor:pointer}
.pjw-row:hover{background:var(--sunk)}
.pjw-row.sel{background:color-mix(in srgb,#2f7fc1 30%,var(--bg));box-shadow:inset 3px 0 0 #3d8fd6}
.pjw-row .t{flex:1;min-width:0;font-size:13.5px;font-weight:600;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pjw-row .t small{display:block;font-weight:500;text-transform:none;color:var(--muted);font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pjw-row .sg{font-size:11px;font-weight:800;color:#8a6a00}
.pjw-row .lv{color:#e05a4f;font-style:normal;font-size:11px}
.pjw-row .key.sm{min-width:26px;height:22px;font-size:10px;border-radius:6px}
.pjw-v{display:block;width:100%;text-align:left;border:0;border-bottom:1px solid var(--line);background:var(--surface);color:inherit;font:inherit;padding:8px 14px 10px;cursor:pointer}
.pjw-v:hover{background:var(--sunk)}
.pjw-v .h{display:flex;justify-content:space-between;font:700 10.5px var(--f-ui);text-transform:uppercase;letter-spacing:.06em;color:var(--accent);margin-bottom:2px}
.pjw-v .h b{color:var(--muted);font-family:var(--f-mono)}
.pjw-v p{margin:0;white-space:pre-line;font-size:16px;line-height:1.4}
.pjw-v[aria-current="true"]{background:#2b5f93;color:#fff}.pjw-v[aria-current="true"] .h,.pjw-v[aria-current="true"] .h b{color:#d6ecff}
.pjw-live{padding-bottom:10px}
.pjw-scr{position:relative;margin:12px;aspect-ratio:16/9;border-radius:8px;overflow:hidden;display:grid;place-items:center;padding:6% 7%;text-align:center;border:2px solid #e05a4f}
.pjw-scr i{position:absolute;inset:0;background:#000}
.pjw-scr span{position:relative;white-space:pre-line;font:700 clamp(11px,1.05vw,17px)/1.3 var(--f-ui);text-shadow:0 1px 3px rgba(0,0,0,.6);display:-webkit-box;-webkit-line-clamp:9;-webkit-box-orient:vertical;overflow:hidden}
.pjw-now{margin:0 12px 8px}.pjw-now b{display:block;font-size:14px}.pjw-now small{color:var(--muted);font-size:12px}
.pjw-btns{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:0 12px}
.pjw-btns .btn{justify-content:center;padding:10px 6px}
.pjw-btns .btn small{opacity:.6;font-size:11px;margin-left:4px}
.pjw-btns .btn[aria-pressed="true"]{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
.pjw-tip{margin:10px 12px 0;font-size:12px;color:var(--muted);line-height:1.45}

.pj-wrap{flex:1;min-height:0;display:flex;flex-direction:column}
.pj-wrap.has-side{display:grid;grid-template-columns:300px minmax(0,1fr)}
.pj-col{display:flex;flex-direction:column;min-height:0;min-width:0}
.pj-side{border-right:1px solid var(--line);background:var(--surface);overflow:auto;padding:8px;display:flex;flex-direction:column;gap:4px}
.pj-side-h{padding:6px 8px 10px;border-bottom:1px solid var(--line);margin-bottom:4px}
.pj-side-h b{display:block;font-family:var(--f-display);font-size:16px}
.pj-side-h small{display:block;color:var(--muted);font-size:12.5px;margin-top:2px;white-space:pre-line}
.pj-it{display:flex;align-items:center;gap:10px;text-align:left;border:1px solid transparent;background:none;color:inherit;border-radius:10px;padding:8px 10px;cursor:pointer;font:inherit}
.pj-it:hover{background:var(--sunk)}
.pj-it[aria-pressed="true"]{background:var(--accent-soft);border-color:var(--accent)}
.pj-it .n{flex:none;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:var(--sunk);font:700 12px var(--f-mono);color:var(--muted)}
.pj-it[aria-pressed="true"] .n{background:var(--accent);color:var(--accent-ink)}
.pj-it .t{flex:1;min-width:0}
.pj-it .t b{display:block;font-size:14.5px;line-height:1.25}
.pj-it .t em{display:block;font-size:12.5px;color:var(--accent);font-style:normal;margin-top:2px;line-height:1.3}
.pj-it .t em.x{color:var(--muted)}
.pj-it .lv{color:#e05a4f;font-style:normal;font-size:12px}
@media (max-width:760px){.pj-wrap.has-side{display:flex;flex-direction:column}.pj-side{border-right:0;border-bottom:1px solid var(--line);max-height:34vh;flex:none}}


.pj-find{position:relative;padding:10px 16px 0}
.pj-find input{width:100%;font:inherit;font-size:16px;padding:10px 12px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:inherit}
.pj-res{display:grid;gap:4px;margin-top:6px}
.pj-r{display:flex;gap:8px;align-items:center;border:1px solid var(--line);background:var(--surface);border-radius:10px;padding:6px 6px 6px 12px}
.pj-r .t{flex:1;min-width:0;text-align:left;background:none;border:0;color:inherit;font:inherit;padding:6px 0;cursor:pointer}
.pj-r .t b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:15px}
.pj-r .t small{color:var(--muted);font-size:12px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pj-r .btn{padding:8px 10px;font-size:13px;white-space:nowrap}
.pj-mini{position:fixed;left:8px;right:8px;bottom:calc(8px + env(safe-area-inset-bottom,0px));z-index:44;display:flex;gap:6px;align-items:center;background:var(--ink);color:var(--bg);border-radius:14px;padding:6px 6px 6px 12px;box-shadow:0 8px 28px rgba(0,0,0,.35);max-width:760px;margin:0 auto}
.pj-mini .lv{flex:1;min-width:0;font-size:13px;line-height:1.25;cursor:pointer;background:none;border:0;color:inherit;text-align:left;padding:4px 0;font-family:inherit}
.pj-mini .lv b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:14px}
.pj-mini .lv i{font-style:normal;color:#e05a4f;font-weight:700;margin-right:4px}
.pj-mini button.mb{min-width:44px;height:40px;border-radius:10px;border:0;background:rgba(127,127,127,.25);color:inherit;font:600 15px/1 inherit;font-family:inherit;cursor:pointer;padding:0 10px}
.pj-mini button.mb.pri{background:var(--accent);color:var(--accent-ink)}
body.pj-has-mini{padding-bottom:70px}
body.pj-has-mini .toast{bottom:calc(86px + env(safe-area-inset-bottom,0px))}
.pj-top .ttl{min-width:140px}
.row{touch-action:manipulation}
@media (max-width:560px){.pj-now{grid-template-columns:120px minmax(0,1fr)}}
`; document.head.appendChild(st); })();

/* Divide la letra en diapositivas: por sección y párrafo, máx. 4 líneas */
function pjSlides(song){
  const body=(song&&song.body&&song.body.trim())?song.body:(song&&song.bodyPro)||'';
  const out=[]; let label='', block=[];
  const flush=()=>{ if(!block.length) return; const n=Math.ceil(block.length/4), size=Math.ceil(block.length/n);
    for(let i=0;i<block.length;i+=size) out.push({label,text:block.slice(i,i+size).join('\n')}); block=[]; };
  for(const L of parseSong(body)){
    if(L.type==='sec'){ flush(); label=L.text; continue; }
    if(L.type==='gap'){ flush(); continue; }
    if(L.chordOnly) continue; const ly=L.lyric.replace(/\s+/g,' ').trim(); if(ly) block.push(ly);
  }
  flush(); return out;
}
function pjSong(){ return S.songs.get(PJ.songIds[PJ.si]); }
/* Agrega una canción a la lista en vivo (después de la actual) y, si se pide, la proyecta ya */
function pjAdd(id,show){
  if(!S.songs.has(id)) return; let i=PJ.songIds.indexOf(id);
  if(i<0){ i=Math.min(PJ.si+1,PJ.songIds.length); PJ.songIds.splice(i,0,id); pjPersist(); }
  PJ.si=i; if(show){ if(pjSlides(pjSong()).length) pjShow(0); else toast('Esa canción no tiene letra para proyectar.'); }
}
/* Versiones: en la consola sale una fila por canción y sus versiones como botoncitos de tono */
function pjIsVer(s){ return !!(s&&s.versionOf&&S.songs.has(s.versionOf)); }
function pjVMap(){ const m=new Map(); for(const x of S.songs.values()) if(pjIsVer(x)){ let a=m.get(x.versionOf); if(!a) m.set(x.versionOf,a=[]); a.push(x); } return m; }
function pjVChips(s,vm){ const v=(vm||pjVMap()).get(s.id); if(!v||!v.length) return ''; return `<span class="pj-vch">${v.map(x=>{ const k=songKey(x); return `<span role="button" data-act="pj-peek" data-id="${esc(x.id)}" title="Versión: ${esc(x.title)}">${k?esc(keyText(k)):'v'}</span>`; }).join('')}</span>`; }
function pjFind(q,n){
  const toks=searchTokens(q); if(!toks.length) return [];
  const best=new Map(); for(const s of S.songs.values()){ const m=matchSong(s,toks,'all'); if(!m) continue; const main=pjIsVer(s)?S.songs.get(s.versionOf):s; const o=best.get(main.id); if(!o||m.score>o.m.score) best.set(main.id,{s:main,m}); }
  const out=[...best.values()];
  out.sort((a,b)=>b.m.score-a.m.score||COLL.compare(a.s.title,b.s.title)); return out.slice(0,n||8);
}
/* Acordes que usa una alabanza (para sugerir las que conectan con la que se está cantando) */
const PJ_CH=new WeakMap();
function pjChords(s){ let x=PJ_CH.get(s); if(x) return x; x=new Set(); const re=/\[([^\]]+)\]/g; let m; const b=(s.body||'')+'\n'+(s.bodyPro||''); while((m=re.exec(b))){ const c=parseChord(m[1]); if(c) x.add(c.root+':'+(/^m(?!aj)/.test(c.suf)?'m':'')); } PJ_CH.set(s,x); return x; }
function pjKeyScore(a,b){ if(!a||!b) return 0; const d=((b.idx-a.idx)%12+12)%12; if(a.minor===b.minor&&d===0) return 3; if(a.minor!==b.minor&&((!a.minor&&d===9)||(a.minor&&d===3))) return 2.2; if(a.minor===b.minor&&(d===7||d===5)) return 1.4; return 0; }
function pjSuggest(){
  const cur=pjSong(); if(!cur) return []; const k=songKey(cur), mine=pjChords(cur); const inList=new Set(PJ.songIds);
  const out=[]; for(const s of S.songs.values()){ if(inList.has(s.id)) continue; const ks=pjKeyScore(k,songKey(s)); const ch=pjChords(s); let j=0; if(mine.size&&ch.size){ let n=0; for(const c of ch) if(mine.has(c)) n++; j=n/new Set([...mine,...ch]).size; }
    const sc=ks+j*3; if(sc>=1.2) out.push({s,sc,ks,j}); }
  out.sort((a,b)=>(isSung(a.s.id)?1:0)-(isSung(b.s.id)?1:0)||b.sc-a.sc||COLL.compare(a.s.title,b.s.title)); return out.slice(0,10);
}
function pjKeyQuery(q){ const t=q.trim(); if(!/^([A-Ga-g]|do|re|mi|fa|sol|la|si)(#|b|♯|♭)?\s*(m|menor)?$/i.test(t)) return null; return parseKey(t.replace(/\s*menor$/i,'m')); }
function pjSugHtml(){
  const cur=pjSong(); const L=pjSuggest(); if(!cur) return ''; const k=songKey(cur);
  if(!L.length) return `<p class="muted" style="margin:6px 2px;font-size:13px">Escribe el nombre, una frase o un tono (ej. G, Sol, Em) para buscar.</p>`;
  return `<p class="pj-sug-h">Para seguir desde «${esc(cur.title)}»${k?` · ${esc(keyText(k))}`:''}: alabanzas con los mismos acordes o tonos cercanos</p>`+L.map(({s,ks,j})=>`<div class="pj-r${isSung(s.id)?' sung':''}"><button class="t" data-act="pj-pick" data-id="${esc(s.id)}" title="Tocar: ver sus diapositivas · Doble clic: proyectar"><b>${esc(s.title)}${isSung(s.id)?' <span class="pill sung-pill">✓ Cantada</span>':''}</b><small>${esc(keyText(songKey(s))||'Sin tono')} · ${ks>=3?'mismo tono':ks>=2?'tono relativo':ks>0?'tono vecino':'acordes parecidos'}${j?` · ${Math.round(j*100)}% acordes iguales`:''}</small></button><button class="btn pri" data-act="pj-go" data-id="${esc(s.id)}">${ICON.screen}Proyectar</button></div>`).join('');
}
function pjResHtml(sug){
  if(!PJ.q.trim()) return sug?pjSugHtml():'';
  const kq=pjKeyQuery(PJ.q); if(kq){ const L=[...S.songs.values()].filter(s=>{ const k=songKey(s); return k&&k.idx===kq.idx&&k.minor===kq.minor; }).sort((a,b)=>(isSung(a.id)?1:0)-(isSung(b.id)?1:0)||COLL.compare(a.title,b.title)).slice(0,20);
    return `<p class="pj-sug-h">Alabanzas en ${esc(keyText(kq))} (${L.length})</p>`+L.map(s=>`<div class="pj-r${isSung(s.id)?' sung':''}"><button class="t" data-act="pj-pick" data-id="${esc(s.id)}"><b>${esc(s.title)}${isSung(s.id)?' <span class="pill sung-pill">✓ Cantada</span>':''}</b><small>${esc(keyText(songKey(s)))}</small></button><button class="btn pri" data-act="pj-go" data-id="${esc(s.id)}">${ICON.screen}Proyectar</button></div>`).join(''); }
  const r=pjFind(PJ.q); if(!r.length) return '<p class="muted" style="margin:6px 2px;font-size:13px">Sin resultados.</p>';
  return r.map(({s,m})=>`<div class="pj-r${isSung(s.id)?' sung':''}"><button class="t" data-act="pj-pick" data-id="${esc(s.id)}" title="Tocar: ver sus diapositivas · Doble clic: proyectar"><b>${esc(s.title)}${isSung(s.id)?' <span class="pill sung-pill">✓ Cantada</span>':''}</b><small>${m.line?esc(m.line):esc(keyText(songKey(s)))}</small></button><button class="btn pri" data-act="pj-go" data-id="${esc(s.id)}">▶ Proyectar</button></div>`).join('');
}

function openProj(opt){
  if(!S.canWrite) return;
  if(opt.live){ /* Culto en vivo: abre la consola directo (con el programa de hoy si existe) */
    const today=new Date(Date.now()-5*3600_000).toISOString().slice(0,10); const tp=[...S.programs.values()].find(p=>p.date===today&&!p._shared);
    PJ.programId=tp?tp.id:null; PJ.songIds=tp?(tp.items||[]).map(it=>it.songId).filter(id=>S.songs.has(id)):[]; PJ.tab=PJ.tab||'songs';
    PJ.si=0; PJ.open=true; PJ.min=false; PJ.q=''; PJ.peek=null; const r=PJ.remote; if(r&&r.songId){ const i=PJ.songIds.indexOf(r.songId); if(i>=0) PJ.si=i; }
    if(typeof bbLoad==='function') bbLoad(); if(typeof msLoadList==='function') msLoadList();
    pjConnect(); pjRender(true); if(typeof keepAwake==='function') keepAwake(true); return; }
  if(PJ.open&&opt.songId){ pjAdd(opt.songId,!!opt.show); if(!opt.stayMin) PJ.min=false; pjRender(true); return; }
  if(opt.programId){ const p=S.programs.get(opt.programId); PJ.programId=opt.programId; PJ.songIds=(p?.items||[]).map(it=>it.songId).filter(id=>S.songs.has(id)); }
  else { PJ.programId=null; PJ.songIds=[opt.songId]; }
  if(!PJ.songIds.length) return;
  PJ.si=0; PJ.open=true; PJ.min=false; PJ.q='';
  const r=PJ.remote; if(r&&r.songId){ const i=PJ.songIds.indexOf(r.songId); if(i>=0) PJ.si=i; }
  pjConnect(); pjRender(true); if(typeof keepAwake==='function') keepAwake(true);
}
function closeProj(){ PJ.open=false; PJ.min=false; document.body.classList.remove('pj-has-mini'); $('#proj-root').innerHTML=''; if(typeof render==='function'&&V.view==='song') render(); if(PJ.ws){ PJ.ws.onclose=null; try{ PJ.ws.close(); }catch{} PJ.ws=null; } clearTimeout(PJ.timer); if(!V.live&&typeof keepAwake==='function') keepAwake(false); }

function pjConnect(){
  if(PJ.ws&&PJ.ws.readyState<2) return;
  const url=(location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws/proyector';
  let ws; try{ ws=new WebSocket(url); }catch{ return pjLater(); }
  PJ.ws=ws;
  ws.onopen=()=>{ PJ.retry=0; PJ.online=true; pjRender(); };
  ws.onmessage=ev=>{ if(ev.data==='pong') return; try{ const d=JSON.parse(ev.data); if(d._ver) return; if(d._sung){ setSung(d._sung); return; } if(d._style){ PJ.style=d._style; if(PJ.open&&!PJ.min) pjRender(); return; } PJ.remote=d; pjRender(); }catch{} };
  ws.onclose=()=>{ PJ.online=false; if(PJ.open){ pjRender(); pjLater(); } };
  ws.onerror=()=>{ try{ ws.close(); }catch{} };
}
function pjLater(){ if(!PJ.open) return; PJ.retry=Math.min(PJ.retry+1,5); clearTimeout(PJ.timer); PJ.timer=setTimeout(pjConnect,500*2**PJ.retry); }
setInterval(()=>{ if(PJ.ws&&PJ.ws.readyState===1) PJ.ws.send('ping'); },25000);

async function pjSend(st){
  const prev=PJ.remote; PJ.remote={...st,by:S.user?.name||'',at:Date.now()}; pjRender();
  try{ const r=await api('/api/proyector',{method:'POST',body:JSON.stringify(st)}); PJ.remote=r; pjRender(); }
  catch(e){ PJ.remote=prev; pjRender(); if(e.message==='auth'){ closeProj(); lostAuth(); } else toast('No se pudo cambiar la pantalla. Revisa el internet.'); }
}
function pjShow(i,sub){
  const s=pjSong(); if(!s) return; const sl=pjSlides(s); if(!sl[i]) return;
  const st=obsStepOn(); const n=st?obsChunks(sl[i].text).length:1; const k=sub==null?0:sub<0?n-1:Math.min(sub,n-1);
  pjSend({mode:'text',title:s.title,text:sl[i].text,label:sl[i].label,songId:s.id,programId:PJ.programId,idx:i,total:sl.length,sub:k,subs:st?n:0});
}
function pjStep(d){
  const r=PJ.remote, s=pjSong(); if(!s) return; const n=pjSlides(s).length;
  const here=r&&r.mode==='text'&&r.songId===s.id;
  if(!here){ return pjShow(d>0?0:Math.max(0,n-1),d>0?0:-1); }
  if(obsStepOn()){ const cur=pjSlides(s)[r.idx]; const cn=cur?obsChunks(cur.text).length:1; const k=(r.sub||0)+d; if(k>=0&&k<cn) return pjSend({...r,sub:k,subs:cn}); }
  const i=r.idx+d;
  if(i>=0&&i<n) return pjShow(i,d>0?0:-1);
  const j=PJ.si+(d>0?1:-1);
  if(j>=0&&j<PJ.songIds.length){ PJ.si=j; const m=pjSlides(pjSong()).length; pjRender(true); return pjShow(d>0?0:Math.max(0,m-1),d>0?0:-1); }
}
async function pjNav(d){ const r=PJ.remote||{};
  if(r.mode==='text'&&(r.bible||r.sermon)){ try{ PJ.remote=await api('/api/proyector/nav',{method:'POST',body:JSON.stringify({d,kind:r.bible?'item':'scroll'})}); if(r.bible&&PJ.remote.bible&&typeof BB!=='undefined'){ BB.b=PJ.remote.bible.b; BB.c=PJ.remote.bible.c; BB.v=PJ.remote.bible.v; } if(r.sermon&&PJ.remote.sermon&&typeof MS!=='undefined'){ MS.p=PJ.remote.sermon.p; MS.part=PJ.remote.sermon.part||0; } pjRender(); }catch{ toast('No se pudo cambiar.'); } return; }
  pjStep(d); }
function pjMode(m){ const r=PJ.remote||{}; if(r.mode===m) m='text'; if(m==='text'&&!r.text){ return pjShow(0); } pjSend({...r,mode:m}); }

function pjSide(r){
  const p=PJ.programId&&S.programs.get(PJ.programId); const its=(p&&p.items||[]).filter(it=>S.songs.has(it.songId)); const used=new Set();
  const rows=PJ.songIds.map((id,i)=>{ let k=its.findIndex((x,j)=>!used.has(j)&&x.songId===id); const it=k>=0?(used.add(k),its[k]):null; const so=S.songs.get(id); const key=it&&it.key?parseKey(it.key):songKey(so);
    const live=r&&r.mode==='text'&&r.songId===id;
    return `<button class="pj-it${isSung(id)?' sung':''}${PJ.sel&&PJ.sel.has(i)?' pick':''}" data-act="pj-song" data-i="${i}" aria-pressed="${i===PJ.si}" draggable="true" data-drag="it"><span class="n">${i+1}</span><span class="t"><b>${esc(so?so.title:'')}</b>${isSung(id)?'<span class="sg">✓ Cantada</span>':''}${it&&it.note?`<em>${esc(it.note)}</em>`:''}${!it&&p?'<em class="x">Agregada ahora</em>':''}</span>${key?`<span class="key sm"${typeof kc==='function'?kc(key):''}>${esc(keyText(key))}</span>`:''}${live?'<i class="lv" title="En pantalla">●</i>':''}${S.canWrite&&!(p&&p._shared)?`<span class="rm" data-act="pj-rm" data-i="${i}" role="button" title="Quitar del programa" aria-label="Quitar">×</span>`:''}</button>`; }).join('');
  const can=S.canWrite&&!(p&&p._shared);
  return `<aside class="pj-side" id="pj-side"><div class="pj-side-h"><b>${esc(p?p.title||'Programa':'Lista de hoy')}</b>${p&&p.notes?`<small>${esc(p.notes)}</small>`:''}${!p&&can&&PJ.songIds.length?`<button class="btn pri sm" data-act="pj-saveprog" style="margin-top:6px">Guardar como programa</button>`:''}</div>${rows}
    ${can?`<div class="pj-drop" data-drop="end">⤵ Arrastra aquí alabanzas de la izquierda (o usa ＋)</div><p class="pj-side-tip">Clic: abrir · Shift/Ctrl + clic: elegir varias · <kbd>Delete</kbd>: quitar · arrastra para ordenar</p>`:''}</aside>`;
}
/* ---- Armar el programa: agregar, quitar y ordenar (se guarda en el programa) ---- */
function pjPersist(){
  const p=PJ.programId&&S.programs.get(PJ.programId); if(!p||p._shared||!S.canWrite) return;
  const pool=(p.items||[]).slice(); const items=PJ.songIds.map(id=>{ const k=pool.findIndex(x=>x.songId===id); return k>=0?pool.splice(k,1)[0]:{songId:id,key:'',note:''}; });
  const np=JSON.parse(JSON.stringify(p)); np.items=items; clearTimeout(PJ.saveT); PJ.saveT=setTimeout(()=>writeDoc('programs',np),300); S.programs.set(np.id,np);
}
function pjInsert(id,at){ if(!S.songs.has(id)) return; const cur=PJ.songIds[PJ.si]; at=Math.max(0,Math.min(at,PJ.songIds.length)); PJ.songIds.splice(at,0,id);
  PJ.si=cur!=null?PJ.songIds.indexOf(cur,0):0; if(PJ.si<0) PJ.si=0; PJ.sel=new Set([at]); PJ.anchor=at; pjPersist(); pjRender(); }
function pjMove(from,to){ if(from===to||from+1===to) return; const cur=PJ.songIds[PJ.si]; const [id]=PJ.songIds.splice(from,1); if(to>from) to--; PJ.songIds.splice(to,0,id);
  PJ.si=Math.max(0,PJ.songIds.indexOf(cur)); PJ.sel=new Set([to]); PJ.anchor=to; pjPersist(); pjRender(); }
function pjRemove(idx){ idx=[...new Set(idx)].filter(i=>i>=0&&i<PJ.songIds.length).sort((a,b)=>b-a); if(!idx.length) return;
  const cur=PJ.songIds[PJ.si]; const names=idx.map(i=>S.songs.get(PJ.songIds[i])?.title||''); for(const i of idx) PJ.songIds.splice(i,1);
  const ni=PJ.songIds.indexOf(cur); PJ.si=ni>=0?ni:Math.max(0,Math.min(PJ.si,PJ.songIds.length-1)); PJ.sel=new Set(); PJ.anchor=null; pjPersist(); pjRender(true);
  toast(idx.length===1?`Quitada: ${names[0]}`:`Quitadas ${idx.length} alabanzas del programa`); }
async function pjSaveAsProgram(){ const d=new Date(); const np={id:newId('p'),title:'Culto '+d.toLocaleDateString('es',{weekday:'long',day:'numeric',month:'long'}),date:d.toISOString().slice(0,10),service:'',notes:'',items:PJ.songIds.map(id=>({songId:id,key:'',note:''}))};
  if(await writeDoc('programs',np)){ PJ.programId=np.id; S.programs.set(np.id,np); pjRender(); toast('Programa guardado. Lo encuentras en Programas.'); } }
/* Arrastrar y soltar */
document.addEventListener('dragstart',e=>{ const el=e.target.closest&&e.target.closest('[data-drag]'); if(!el||!PJ.open) return;
  if(el.dataset.drag==='song') e.dataTransfer.setData('text/vdn-song',el.dataset.id); else e.dataTransfer.setData('text/vdn-idx',el.dataset.i); e.dataTransfer.effectAllowed='copyMove'; PJ.dragging=el.dataset.drag; });
document.addEventListener('dragend',()=>{ PJ.dragging=null; document.querySelectorAll('.drop-before,.drop-on').forEach(x=>x.classList.remove('drop-before','drop-on')); });
document.addEventListener('dragover',e=>{ if(!PJ.dragging) return; const side=e.target.closest&&e.target.closest('#pj-side'); if(!side) return; e.preventDefault();
  document.querySelectorAll('.drop-before,.drop-on').forEach(x=>x.classList.remove('drop-before','drop-on'));
  const it=e.target.closest('.pj-it'); if(it){ const r=it.getBoundingClientRect(); const after=e.clientY>r.top+r.height/2; const nx=after?it.nextElementSibling:it; if(nx&&nx.classList.contains('pj-it')) nx.classList.add('drop-before'); else side.querySelector('.pj-drop')?.classList.add('drop-on'); } else side.querySelector('.pj-drop')?.classList.add('drop-on'); });
document.addEventListener('drop',e=>{ if(!PJ.dragging) return; const side=e.target.closest&&e.target.closest('#pj-side'); if(!side) return; e.preventDefault();
  const mark=side.querySelector('.drop-before'); const at=mark?+mark.dataset.i:PJ.songIds.length;
  const id=e.dataTransfer.getData('text/vdn-song'), from=e.dataTransfer.getData('text/vdn-idx'); PJ.dragging=null;
  if(id) pjInsert(id,at); else if(from!=='') pjMove(+from,at); });
/* ======== Vista de computadora tipo Holyrics: Biblioteca | Estrofas | En directo | Programa ======== */
function pjWide(){ return innerWidth>=1100; }
function pjCenter(){ return PJ.peek&&S.songs.get(PJ.peek)||pjSong(); }
function pjRow(s,extra){ const sg=isSung(s.id), live=PJ.remote&&PJ.remote.mode==='text'&&PJ.remote.songId===s.id; const k=songKey(s);
  return `<button class="pjw-row${sg?' sung':''}${pjCenter()&&pjCenter().id===s.id?' sel':''}" data-act="pj-peek" data-id="${esc(s.id)}" title="Clic: ver estrofas · Doble clic: proyectar · Arrastra al programa" draggable="true" data-drag="song"><span class="add" data-act="pj-addlist" data-id="${esc(s.id)}" role="button" title="Agregar al programa" aria-label="Agregar al programa">＋</span><span class="t">${esc(s.title)}${(()=>{ const vc=pjVChips(s,PJ._vm); return vc||extra?`<small>${vc}${extra||''}</small>`:''; })()}</span>${sg?'<span class="sg">✓</span>':''}${live?'<i class="lv">●</i>':''}${k?`<span class="key sm"${typeof kc==='function'?kc(k):''}>${esc(keyText(k))}</span>`:''}</button>`; }
function pjLibHtml(){
  const q=PJ.q.trim(); PJ._vm=pjVMap();
  if(q){ const kq=pjKeyQuery(q); if(kq){ const L=[...S.songs.values()].filter(s=>{ const k=songKey(s); return k&&k.idx===kq.idx&&k.minor===kq.minor; }).sort((a,b)=>(isSung(a.id)?1:0)-(isSung(b.id)?1:0)||COLL.compare(a.title,b.title));
      return `<p class="pj-sug-h">En ${esc(keyText(kq))} (${L.length})</p>`+L.slice(0,300).map(s=>pjRow(s)).join(''); }
    const r=pjFind(q,80); return r.length?r.map(({s,m})=>pjRow(s,m.line?esc(m.line):'')).join(''):'<p class="pj-sug-h">Sin resultados.</p>'; }
  const sug=pjSuggest(); const cur=pjSong();
  let h=sug.length?`<p class="pj-sug-h">🎵 Conectan con «${esc(cur?cur.title:'')}» (acordes y tono)</p>`+sug.map(({s,ks,j})=>pjRow(s,`${ks>=3?'mismo tono':ks>=2?'tono relativo':ks>0?'tono vecino':'acordes parecidos'}${j?` · ${Math.round(j*100)}% acordes`:''}`)).join(''):'';
  const all=[...S.songs.values()].filter(x=>!pjIsVer(x)).sort((a,b)=>COLL.compare(a.title,b.title));
  return h+`<p class="pj-sug-h">Todas las alabanzas (${all.length})</p>`+all.slice(0,PJ.libN||250).map(s=>pjRow(s)).join('')+(all.length>(PJ.libN||250)?`<button class="btn ghost" data-act="pj-libmore" style="width:100%;margin:6px 0">Ver más…</button>`:'');
}
function pjRenderWide(r,qf,qpos,scrollTop){
  const root=$('#proj-root'); const s=pjCenter(); const sl=s?pjSlides(s):[]; const peek=!!(PJ.peek&&s&&s.id===PJ.peek&&!PJ.songIds.includes(PJ.peek));
  const onSong=r.mode==='text'&&s&&r.songId===s.id; const st=PJ.style||{}; const k=s?songKey(s):null;
  const lib=$('#pj-res'), keepLib=lib?lib.scrollTop:0, body=$('#pj-body'), keepBody=body&&!scrollTop?body.scrollTop:0;
  const scrBg=st.img?`url('${st.img}') center/cover,${st.bg||'#000'}`:(st.bg||'#000');
  const scr=r.mode==='black'?'':r.mode==='logo'?'<img src="/vdn-logo.jpg?v=3" alt="" style="height:78%">':`<span style="font-size:calc(clamp(11px,1.05vw,17px) * ${st.size||1});color:${st.color||'#fff'};text-transform:${(r.bible||r.sermon)?(st.upperRead?'uppercase':'none'):(st.upper?'uppercase':'none')}">${esc(r.text||'')}</span>`;
  root.innerHTML=`<div class="pj pjw" role="dialog" aria-label="Proyección">
    <div class="pj-top"><button class="btn ghost" data-act="pj-close" aria-label="Cerrar proyección">${ICON.x}</button>
      <span class="ttl">${esc(s?s.title:'')}${k?` <small class="muted">· ${esc(keyText(k))}</small>`:''}</span>
      <span class="pj-st ${PJ.online?'on':''}">${PJ.online?'Conectado':'Reconectando…'}</span>
      <button class="btn" data-act="pj-min" title="Esconder el control para usar el resto de la app">${ICON.search}Seguir en la app</button>
      <button class="btn" data-act="proj-style">🎨 Fondo</button><button class="btn" data-act="obs-open" aria-pressed="${obsStepOn()}" title="${obsStepOn()?'Transmisión: avanza de 2 en 2 líneas':'Letra para OBS'}">📡 OBS${obsStepOn()?' · 2 en 2':''}</button><button class="btn" data-act="open-proj">${ICON.screen}Abrir pantalla</button></div>
    <div class="pjw-grid side${PJ.tab==='bible'?' bbmode':''}">
      <section class="pjw-lib"><div class="pjw-tabs" role="tablist">${[['songs','Alabanzas'],['bible','Biblia'],['msg','Mensaje']].map(([k,l])=>`<button data-act="pj-tab" data-t="${k}" aria-pressed="${(PJ.tab||'songs')===k}">${l}</button>`).join('')}</div>
        ${PJ.tab==='bible'?'':(PJ.tab||'songs')==='songs'?`<div class="pjw-q"><input id="pj-q" type="search" placeholder="Buscar nombre, frase o tono (G, Sol, Em)…" value="${esc(PJ.q)}" autocomplete="off" aria-label="Buscar alabanza"></div><div class="pjw-scroll" id="pj-res">${pjLibHtml()}</div>`:PJ.tab==='bible'?pjBibleLib():pjMsgLib()}</section>
      ${PJ.tab==='bible'?`<section class="pjw-bb" id="pjw-bb">${typeof viewBible==='function'?viewBible():''}</section>`:PJ.tab==='msg'?pjMsgCenter(r):`<section class="pjw-sl"><div class="pjw-h">${peek?'<span class="pv">Vista previa</span> ':''}${esc(s?s.title:'Elige una alabanza')}<span class="sp"></span>${peek?`<button class="btn pri sm" data-act="pj-peekadd">＋ Agregar a la lista</button>`:''}</div>
        <div class="pjw-scroll" id="pj-body">${sl.length?sl.map((x,i)=>`<button class="pjw-v" data-act="${peek?'pj-peekshow':'pj-show'}" data-i="${i}" aria-current="${onSong&&r.idx===i}"><span class="h">${esc(x.label||'')} <b>${i+1}</b></span>${pjSlP(x,onSong&&r.idx===i,r)}</button>`).join(''):`<p class="pj-empty" style="padding:16px">${s?'Esta alabanza no tiene letra para proyectar.':'Busca una alabanza a la izquierda.'}</p>`}</div></section>`}
      <section class="pjw-live"><div class="pjw-h">En directo <span class="sp"></span><span class="pj-st ${PJ.online?'on':''}"></span></div>
        <div class="pjw-scr" style="background:${scrBg}">${st.img?`<i style="opacity:${st.dim??.35}"></i>`:''}${scr}</div>
        <p class="pjw-now"><b>${r.mode==='black'?'■ Pantalla en negro':r.mode==='logo'?'Logo':esc((r.title||'')+(r.total?` · ${r.idx+1} de ${r.total}`:''))}</b>${r.by?`<small>Último cambio: ${esc(r.by)}</small>`:''}</p>
        <div class="pjw-btns"><button class="btn" data-act="pj-nav" data-d="-1">◀ Anterior</button><button class="btn pri" data-act="pj-nav" data-d="1">Siguiente ▶</button>
          <button class="btn" data-act="pj-mode" data-m="black" aria-pressed="${r.mode==='black'}">Negro <small>(B / F9)</small></button><button class="btn" data-act="pj-mode" data-m="logo" aria-pressed="${r.mode==='logo'}">Logo <small>(L)</small></button></div>
        <p class="pjw-tip">Clic en una alabanza: ver sus estrofas · Doble clic: proyectar · Clic en una estrofa: en vivo · ← → cambian de estrofa</p></section>
      ${pjSide(r)}
    </div></div>`;
  pjBindTabs(); if(PJ.tab==='bible'&&window.bibleAfterRender) bibleAfterRender(); const qi=$('#pj-q'); if(qi){ qi.addEventListener('input',e=>{ PJ.q=e.target.value; clearTimeout(PJ.qt); PJ.qt=setTimeout(()=>{ const box=$('#pj-res'); if(box){ box.innerHTML=pjLibHtml(); box.scrollTop=0; } },80); });
  qi.addEventListener('keydown',e=>{ if(e.key==='Enter'){ const f=document.querySelector('#pj-res .pjw-row'); if(f){ e.preventDefault(); pjAdd(f.dataset.id,true); PJ.peek=null; PJ.q=''; pjRender(true); } } else if(e.key==='Escape'){ PJ.q=''; qi.value=''; const box=$('#pj-res'); if(box) box.innerHTML=pjLibHtml(); } });
  if(qf){ qi.focus(); try{ qi.setSelectionRange(qpos,qpos); }catch{} } }
  const L2=$('#pj-res'); if(L2) L2.scrollTop=PJ.q===PJ.lastQ?keepLib:0; PJ.lastQ=PJ.q;
  const nb=$('#pj-body'); if(nb){ nb.scrollTop=keepBody; const c=nb.querySelector('[aria-current="true"]'); if(c&&!scrollTop){ const a=c.getBoundingClientRect(), b=nb.getBoundingClientRect(); if(a.top<b.top||a.bottom>b.bottom) c.scrollIntoView({block:'nearest',behavior:'smooth'}); } }
}
/* ---- Pestañas Biblia y Mensaje dentro de la consola ---- */
function pjBibleLib(){
  if(typeof BB==='undefined') return ''; if(!BB.data){ bbLoad(); clearTimeout(PJ.bbt); PJ.bbt=setTimeout(()=>{ if(PJ.open&&PJ.tab==='bible') pjRender(); },700); return '<p class="pj-sug-h">Abriendo la Biblia…</p>'; }
  const books=bbBooks(); const q=(PJ.bq||'').trim(); const pr=q?bbParse(q):null;
  return `<div class="pjw-q"><input id="pjb-q" type="search" placeholder="Cita: jn 3 16 · gen 1 · sal 23" value="${esc(PJ.bq||'')}" autocomplete="off" aria-label="Cita bíblica"></div>
    ${pr?`<button class="pjw-row sel" data-act="pjb-go" data-b="${pr.b}" data-c="${pr.c}" data-v="${pr.v==null?'':pr.v}"><span class="t">${esc(bbRef(pr.b,pr.c,pr.v))}<small>Enter para ${pr.v!=null?'proyectar':'abrir'}</small></span></button>`:''}
    <div class="pjw-scroll" id="pjb-books">${books.map((bk,i)=>`<button class="pjw-row${i===BB.b?' sel':''}" data-act="pjb-book" data-b="${i}"><span class="t">${esc(bk[1])}</span><small style="color:var(--muted);font-size:11px">${bk[3].length}</small></button>`).join('')}</div>`;
}
function pjBibleCenter(r){
  if(typeof BB==='undefined'||!BB.data) return '<section class="pjw-sl"><div class="pjw-h">Biblia</div></section>';
  const bk=bbBooks()[BB.b], ch=bk[3][BB.c]||[]; const on=r&&r.mode==='text'&&r.bible&&r.bible.b===BB.b&&r.bible.c===BB.c?r.bible.v:-1;
  return `<section class="pjw-sl"><div class="pjw-h">${esc(bk[1])} ${BB.c+1}<span class="sp"></span><button class="btn sm" data-act="pjb-ch" data-d="-1" ${BB.c<=0?'disabled':''}>◀ Cap.</button><select id="pjb-chsel" aria-label="Capítulo">${bk[3].map((_,i)=>`<option value="${i}" ${i===BB.c?'selected':''}>${i+1}</option>`).join('')}</select><button class="btn sm" data-act="pjb-ch" data-d="1" ${BB.c>=bk[3].length-1?'disabled':''}>Cap. ▶</button></div>
    <div class="pjw-scroll" id="pj-body">${ch.map((t,i)=>`<button class="pjw-v" data-act="pjb-v" data-v="${i}" aria-current="${on===i}"><span class="h">${esc(bk[1])} ${BB.c+1}:${i+1}</span><p>${esc(t)}</p></button>`).join('')}</div></section>`;
}
function pjMsgLib(){
  if(typeof MS==='undefined') return ''; if(!MS.list){ msLoadList().then(()=>{ if(PJ.open&&PJ.tab==='msg') pjRender(); }); return '<p class="pj-sug-h">Cargando mensajes…</p>'; }
  const q=msNorm(PJ.mq||'').trim(); const L=q?MS.list.filter(x=>msNorm(`${x.code} ${x.title} ${x.place||''}`).includes(q)):MS.list;
  return `<div class="pjw-q"><input id="pjm-q" type="search" placeholder="Buscar mensaje por título o código" value="${esc(PJ.mq||'')}" autocomplete="off" aria-label="Buscar mensaje"></div>
    <div class="pjw-scroll" id="pjm-list">${L.slice(0,400).map(x=>`<button class="pjw-row${MS.curId===x.id?' sel':''}" data-act="pjm-open" data-id="${esc(x.id)}"><span class="t" style="text-transform:none">${esc(x.title)}<small>${esc(x.code||'')}${x.place?' · '+esc(x.place):''}</small></span></button>`).join('')||'<p class="pj-sug-h">Sin resultados.</p>'}</div>`;
}
function pjMsgCenter(r){
  const s=typeof MS!=='undefined'&&MS.cur; if(!s) return `<section class="pjw-sl"><div class="pjw-h">Mensaje</div><p class="pj-empty" style="padding:16px">${MS&&MS.curId?'Abriendo…':'Elige un mensaje a la izquierda.'}</p></section>`;
  const on=r&&r.mode==='text'&&r.sermon&&r.sermon.id===s.id?r.sermon.p:-1;
  return `<section class="pjw-sl"><div class="pjw-h"><span style="text-transform:none;letter-spacing:0;font-size:13px;color:var(--ink)">${esc(s.title)}</span><span class="sp"></span><span>${esc(s.code||'')}</span></div>
    <div class="pjw-scroll" id="pj-body">${s.paras.map((p,i)=>`<button class="pjw-v" data-act="pjm-p" data-i="${i}" aria-current="${on===i}"><span class="h">Párrafo ${esc(p.n)}</span><p>${esc(p.t)}</p></button>`).join('')}</div></section>`;
}
function pjBindTabs(){
  const bq=$('#pjb-q'); if(bq){ bq.addEventListener('input',e=>{ PJ.bq=e.target.value; clearTimeout(PJ.bqt); PJ.bqt=setTimeout(()=>{ pjRender(); const n=$('#pjb-q'); if(n){ n.focus(); const l=n.value.length; try{ n.setSelectionRange(l,l); }catch{} } },250); });
    bq.addEventListener('keydown',e=>{ if(e.key!=='Enter') return; e.preventDefault(); const pr=bbParse(PJ.bq||''); if(!pr) return; BB.b=pr.b; BB.c=pr.c; PJ.bq=''; if(pr.v!=null){ BB.v=pr.v; BB.live=true; bbProject().then(()=>pjRender()); } pjRender(); }); }
  const cs=$('#pjb-chsel'); if(cs) cs.addEventListener('change',e=>{ BB.c=+e.target.value; BB.v=null; pjRender(true); });
  const mq=$('#pjm-q'); if(mq) mq.addEventListener('input',e=>{ PJ.mq=e.target.value; clearTimeout(PJ.mqt); PJ.mqt=setTimeout(()=>{ const box=$('#pjm-list'); if(box){ const tmp=document.createElement('div'); tmp.innerHTML=pjMsgLib(); const nl=tmp.querySelector('#pjm-list'); if(nl) box.innerHTML=nl.innerHTML; } },120); });
}
(function(){ const _r=window.render; if(typeof _r!=='function') return;
  window.render=function(){ _r.apply(this,arguments); if(PJ.open&&!PJ.min&&PJ.tab==='bible'&&pjWide()){ const box=document.getElementById('pjw-bb'); if(box&&typeof viewBible==='function'){ const L=box.querySelector('#bb-vlist'); const st=L?L.scrollTop:0; box.innerHTML=viewBible(); if(window.bibleAfterRender) bibleAfterRender(); const L2=box.querySelector('#bb-vlist'); if(L2&&!L2.querySelector('[aria-current="true"]')) L2.scrollTop=st; } } }; })();
let pjWas=null; addEventListener('resize',()=>{ const w=pjWide(); if(PJ.open&&!PJ.min&&w!==pjWas){ pjWas=w; pjRender(true); } });
function pjRender(scrollTop){
  const root=$('#proj-root'); if(!PJ.open){ root.innerHTML=''; document.body.classList.remove('pj-has-mini'); return; }
  const s=pjSong(); const sl=s?pjSlides(s):[]; const r=PJ.remote||{mode:'logo'};
  document.body.classList.toggle('pj-has-mini',PJ.min);
  if(PJ.min){
    const what=r.mode==='black'?'Pantalla en negro':r.mode==='logo'?'Logo':`${r.title||''}${r.total?` · ${r.idx+1}/${r.total}`:''}`;
    root.innerHTML=`<div class="pj-mini" role="region" aria-label="Proyección en vivo">
      <button class="lv" data-act="pj-max" title="Abrir el control"><b><i>●</i>${esc(what)}</b><span style="opacity:.75">${PJ.online?'En vivo · toca para abrir el control':'Reconectando…'}</span></button>
      <button class="mb" data-act="pj-step" data-d="-1" aria-label="Anterior">◀</button><button class="mb pri" data-act="pj-step" data-d="1" aria-label="Siguiente">▶</button>
      <button class="mb" data-act="pj-mode" data-m="black" aria-pressed="${r.mode==='black'}" title="Negro">■</button></div>`;
    return;
  }
  const qf=document.activeElement&&document.activeElement.id==='pj-q'; const qpos=qf?document.activeElement.selectionStart:0;
  if(pjWide()){ pjRenderWide(r,qf,qpos,scrollTop); return; }
  const body=$('#pj-body'); const keep=body&&!scrollTop?body.scrollTop:0;
  const onSong=r.mode==='text'&&s&&r.songId===s.id;
  const scr=r.mode==='black'?'':r.mode==='logo'?'<img src="/vdn-logo.jpg?v=2" alt="">':esc(r.text||'');
  root.innerHTML=`<div class="pj" role="dialog" aria-label="Proyección">
    <div class="pj-top"><button class="btn ghost" data-act="pj-close" aria-label="Cerrar proyección">${ICON.x}</button>
      <span class="ttl">${esc(s?s.title:'')}</span>
      <span class="pj-st ${PJ.online?'on':''}">${PJ.online?'Conectado':'Reconectando…'}</span>
      <button class="btn" data-act="pj-min" title="Esconder el control para buscar en el cancionero">${ICON.search}Seguir buscando</button>
      <button class="btn" data-act="proj-style">🎨 Fondo</button><button class="btn" data-act="obs-open" aria-pressed="${obsStepOn()}" title="${obsStepOn()?'Transmisión: avanza de 2 en 2 líneas':'Letra para OBS'}">📡 OBS${obsStepOn()?' · 2 en 2':''}</button><button class="btn" data-act="open-proj">${ICON.screen}Abrir pantalla</button></div>
    <div class="pjm-now"><i class="${r.mode==='text'?'on':''}"></i><span><small>En pantalla</small> ${r.mode==='black'?'■ Negro':r.mode==='logo'?'Logo':esc((r.title||'')+(r.total?` · ${r.idx+1}/${r.total}`:''))}${r.mode==='text'&&r.subs>1&&obsStepOn()?` <small style="color:var(--accent);font-weight:700">📡 parte ${(r.sub||0)+1}/${r.subs}</small>`:''}</span></div>
    <div class="pj-body pjm-body" id="pj-body">${sl.length?sl.map((x,i)=>`<button class="pj-sl" data-act="pj-show" data-i="${i}" aria-current="${onSong&&r.idx===i}"><span class="h"><span>${esc(x.label||'')}</span><span>${i+1}</span></span>${pjSlP(x,onSong&&r.idx===i,r)}</button>`).join(''):`<p class="pj-empty" style="padding:16px">${s?'Esta alabanza no tiene letra para proyectar.':'Busca una alabanza abajo para empezar.'}</p>`}</div>
    ${PJ.songIds.length?`<div class="pjm-prog" id="pjm-prog">${PJ.songIds.map((id,i)=>{ const so=S.songs.get(id); const k=so?songKey(so):null; const live=r.mode==='text'&&r.songId===id; return `<button class="pjm-it${isSung(id)?' sung':''}" data-act="pj-song" data-i="${i}" aria-pressed="${i===PJ.si}"><span class="n">${i+1}${live?' <i>●</i>':''}</span><b>${esc(so?so.title:'')}</b>${k?`<small>${esc(keyText(k))}${isSung(id)?' · ✓':''}</small>`:(isSung(id)?'<small>✓ Cantada</small>':'')}</button>`; }).join('')}</div>`:''}
    <div class="pjm-find"><div class="pjm-res" id="pj-res">${pjResHtml(PJ.sug)}</div><input id="pj-q" type="search" placeholder="🎵 Buscar la siguiente (mismo acorde primero)…" value="${esc(PJ.q)}" autocomplete="off" aria-label="Buscar alabanza"></div>
    <div class="pj-bot">
      <button class="btn" data-act="pj-mode" data-m="black" aria-pressed="${r.mode==='black'}">Negro</button>
      <button class="btn" data-act="pj-mode" data-m="logo" aria-pressed="${r.mode==='logo'}">Logo</button>
      <button class="btn" data-act="pj-step" data-d="-1">${ICON.back}Anterior</button>
      <button class="btn pri" data-act="pj-step" data-d="1">Siguiente <span style="transform:rotate(180deg);display:inline-flex">${ICON.back}</span></button>
    </div></div>`;
  const qi=$('#pj-q'); if(qi){ qi.addEventListener('input',e=>{ PJ.q=e.target.value; clearTimeout(PJ.qt); PJ.qt=setTimeout(()=>{ const box=$('#pj-res'); if(box) box.innerHTML=pjResHtml(true); },80); });
    qi.addEventListener('focus',()=>{ PJ.sug=true; const box=$('#pj-res'); if(box) box.innerHTML=pjResHtml(true); });
    qi.addEventListener('blur',()=>{ setTimeout(()=>{ if(document.activeElement&&document.activeElement.id==='pj-q') return; PJ.sug=false; if(!PJ.q.trim()){ const box=$('#pj-res'); if(box) box.innerHTML=''; } },250); }); if(qf){ qi.focus(); try{ qi.setSelectionRange(qpos,qpos); }catch{} } }
  const ps=$('#pjm-prog'); if(ps){ const c=ps.querySelector('[aria-pressed="true"]'); if(c) ps.scrollLeft=c.offsetLeft-ps.clientWidth/2+c.clientWidth/2; }
  const nb=$('#pj-body'); if(nb){ nb.scrollTop=keep; if(!scrollTop){ const c=nb.querySelector('[aria-current="true"]'); if(c){ const a=c.getBoundingClientRect(), b=nb.getBoundingClientRect(); if(a.top<b.top||a.bottom>b.bottom) c.scrollIntoView({block:'nearest',behavior:'smooth'}); } } }
}

document.addEventListener('click',ev=>{
  const el=ev.target.closest('[data-act]'); if(!el) return; const a=el.dataset.act, ds=el.dataset;
  switch(a){
    case 'proj-song': if(PJ.open){ openProj({songId:V.songId,show:true,stayMin:true}); PJ.min=true; pjRender(); toast('En pantalla: '+(S.songs.get(V.songId)?.title||'')); } else openProj({songId:V.songId}); break;
    case 'pj-min': PJ.min=true; pjRender(); break;
    case 'pj-max': PJ.min=false; pjRender(true); break;
    case 'pj-pick': { const now=Date.now(); const dbl=PJ.lastPick&&PJ.lastPick.id===ds.id&&now-PJ.lastPick.t<450; PJ.lastPick={id:ds.id,t:now}; pjAdd(ds.id,dbl); PJ.q=dbl?'':PJ.q; pjRender(true); break; }
    case 'pj-go': pjAdd(ds.id,true); PJ.q=''; pjRender(true); break;
    case 'proj-prog': openProj({programId:V.programId}); break;
    case 'pj-close': closeProj(); break;
    case 'pj-show': { const sb=ev.target.closest('[data-sub]'); pjShow(+ds.i,sb?+sb.dataset.sub:0); break; }
    case 'pj-step': pjStep(+ds.d); break;
    case 'pj-mode': pjMode(ds.m); break;
    case 'pj-song': { const i=+ds.i; if(!PJ.sel) PJ.sel=new Set();
      if(ev.shiftKey&&PJ.anchor!=null){ PJ.sel=new Set(); const a0=Math.min(PJ.anchor,i), a1=Math.max(PJ.anchor,i); for(let k=a0;k<=a1;k++) PJ.sel.add(k); pjRender(); break; }
      if(ev.ctrlKey||ev.metaKey){ PJ.sel.has(i)?PJ.sel.delete(i):PJ.sel.add(i); PJ.anchor=i; pjRender(); break; }
      PJ.sel=new Set([i]); PJ.anchor=i; PJ.si=i; PJ.peek=null; pjRender(true); break; }
    case 'pj-rm': ev.stopPropagation(); pjRemove([+ds.i]); break;
    case 'pj-addlist': ev.stopPropagation(); pjInsert(ds.id,PJ.songIds.length); toast('Agregada: '+(S.songs.get(ds.id)?.title||'')); break;
    case 'pj-saveprog': pjSaveAsProgram(); break;
    case 'pj-peek': { const now=Date.now(); const dbl=PJ.lastPeek&&PJ.lastPeek.id===ds.id&&now-PJ.lastPeek.t<450; PJ.lastPeek={id:ds.id,t:now};
      if(dbl){ PJ.peek=null; pjAdd(ds.id,true); pjRender(true); } else { const i=PJ.songIds.indexOf(ds.id); if(i>=0){ PJ.si=i; PJ.peek=null; } else PJ.peek=ds.id; pjRender(true); } break; }
    case 'pj-nav': pjNav(+ds.d); break;
    case 'culto-vivo': openProj({live:true}); break;
    case 'pj-tab': if(ds.t==='bible'&&typeof BB!=='undefined'&&!BB.data){ bbLoad(); const w=setInterval(()=>{ if(BB.data||BB.err){ clearInterval(w); if(PJ.open&&PJ.tab==='bible') pjRender(true); } },300); setTimeout(()=>clearInterval(w),20000); }
      PJ.tab=ds.t; if(ds.t==='bible'&&V.view==='bible'){ V.tab='songs'; V.view='list'; } pjRender(true); break;
    case 'pjb-book': BB.b=+ds.b; BB.c=0; BB.v=null; pjRender(true); break;
    case 'pjb-ch': { const bk=bbBooks()[BB.b]; BB.c=Math.max(0,Math.min(bk[3].length-1,BB.c+(+ds.d))); BB.v=null; pjRender(true); break; }
    case 'pjb-go': BB.b=+ds.b; BB.c=+ds.c; PJ.bq=''; if(ds.v!==''){ BB.v=+ds.v; BB.live=true; bbProject().then(()=>pjRender()); } pjRender(true); break;
    case 'pjb-v': BB.v=+ds.v; BB.live=true; bbProject().then(()=>pjRender()); break;
    case 'pjm-open': (async()=>{ await msOpen(ds.id,0); pjRender(true); })(); break;
    case 'pjm-p': MS.p=+ds.i; MS.part=0; MS.auto=0; msProject().then(()=>pjRender()); break;
    case 'pj-peekadd': if(PJ.peek){ pjAdd(PJ.peek,false); PJ.peek=null; pjRender(true); } break;
    case 'pj-peekshow': if(PJ.peek){ const id=PJ.peek; PJ.peek=null; pjAdd(id,false); pjShow(+ds.i); pjRender(true); } break;
    case 'pj-libmore': PJ.libN=(PJ.libN||250)+500; { const box=$('#pj-res'); if(box){ const t=box.scrollTop; box.innerHTML=pjLibHtml(); box.scrollTop=t; } } break;
  }
});
document.addEventListener('keydown',e=>{
  if(!PJ.open||e.target.closest('input,textarea,select')) return;
  const k=e.key;
  if((k==='Delete'||k==='Backspace')&&!PJ.min&&PJ.sel&&PJ.sel.size){ e.preventDefault(); pjRemove([...PJ.sel]); return; }
  if(!PJ.min&&PJ.tab==='bible'&&pjWide()&&typeof bbStep==='function'&&!e.ctrlKey&&!e.metaKey&&!e.altKey){
    if(k==='ArrowDown'){ e.preventDefault(); bbStep(1,true); return; } if(k==='ArrowUp'){ e.preventDefault(); bbStep(-1,true); return; }
    if(k==='ArrowRight'||k==='PageDown'){ e.preventDefault(); BB.live=true; bbStep(1); return; } if(k==='ArrowLeft'||k==='PageUp'){ e.preventDefault(); BB.live=true; bbStep(-1); return; }
    if(k==='Enter'&&BB.v!=null){ e.preventDefault(); BB.live=true; bbProject(); return; }
    if(k.length===1&&/[\p{L}\p{N}]/u.test(k)){ e.preventDefault(); qkOpen(k); return; } }
  if(PJ.min){ if(k==='PageDown'){ e.preventDefault(); pjStep(1); } else if(k==='PageUp'){ e.preventDefault(); pjStep(-1); } return; }
  if(k==='F2'&&PJ.tab!=='bible'&&PJ.tab!=='msg'){ e.preventDefault(); pjEditOpen(e.shiftKey?'all':'one'); return; }
  if(k==='ArrowRight'||k==='ArrowDown'||k==='PageDown'||k===' '){ e.preventDefault(); pjNav(1); }
  else if(k==='ArrowLeft'||k==='ArrowUp'||k==='PageUp'){ e.preventDefault(); pjNav(-1); }
  else if(k==='b'||k==='B'||k==='.') pjMode('black');
  else if(k==='l'||k==='L') pjMode('logo');
  else if(k==='Escape') closeProj();
  else if(/^[1-9]$/.test(k)) pjShow(+k-1);
});

/* Doble toque / doble clic en una canción de la lista mientras se proyecta: la proyecta al instante */
document.addEventListener('click',ev=>{
  if(PJ.swallow&&Date.now()<PJ.swallow){ ev.preventDefault(); ev.stopPropagation(); PJ.swallow=0; return; }
  if(!PJ.open||!PJ.min) return; const el=ev.target.closest('[data-act="open-song"]');
  if(el) PJ.lastRow={id:el.dataset.id,t:Date.now()};
},true);
document.addEventListener('pointerdown',ev=>{
  const last=PJ.lastRow; if(!PJ.open||!PJ.min||!last) return;
  if(Date.now()-last.t<450&&V.view==='song'&&V.songId===last.id&&!ev.target.closest('.pj-mini')){
    ev.preventDefault(); PJ.lastRow=null; PJ.swallow=Date.now()+700; pjAdd(last.id,true); pjRender(); toast('En pantalla: '+(S.songs.get(last.id)?.title||'')); }
},true);

/* Abre la pantalla del proyector; si ya se eligió el monitor externo, la abre directamente allí */
async function openProyector(){
  let feat='';
  try{ if('getScreenDetails' in window){ const st=await navigator.permissions.query({name:'window-management'}).catch(()=>null);
    if(st&&st.state==='granted'){ const sd=await window.getScreenDetails(); let saved=null; try{ saved=localStorage.getItem('vdn-screen'); }catch{}
      const key=x=>`${x.label||''}|${x.left},${x.top}|${x.width}x${x.height}`; let s=sd.screens.find(x=>key(x)===saved)||sd.screens.find(x=>!x.isPrimary&&x!==sd.currentScreen);
      if(s) feat=`popup,left=${s.availLeft},top=${s.availTop},width=${s.availWidth},height=${s.availHeight}`; } } }catch{}
  /* Si la pantalla ya está abierta, NO se vuelve a cargar (eso la sacaba de pantalla completa) */
  const w=window.open('','vdn-proyector',feat); if(!w){ toast('El navegador bloqueó la ventana. Permite ventanas emergentes para esta página.'); return; }
  let already=false; try{ already=/\/proyector/.test(w.location.pathname); }catch{}
  if(already){ toast('La pantalla del proyector ya está abierta.'); return; }
  try{ w.location.href='/proyector'; }catch{}
  /* la app se queda en esta pantalla (la 1): se devuelve el foco aquí */
  setTimeout(()=>{ try{ window.focus(); }catch{} },300);
  if(feat) toast('Pantalla del proyector abierta en la pantalla 2. Haz un clic sobre ella (o F11) para que quede a pantalla completa.');
}
document.addEventListener('click',ev=>{ const el=ev.target.closest('[data-act="open-proj"]'); if(el){ ev.preventDefault(); openProyector(); } });

/* ---------- Fondo y letra de la pantalla ---------- */
const PJ_BG=[['Negro','#000000'],['Azul noche','linear-gradient(160deg,#0b1d3a 0%,#02060f 100%)'],['Azul real','linear-gradient(135deg,#1e3c72 0%,#2a5298 100%)'],['Morado','linear-gradient(135deg,#2b1055 0%,#7597de 140%)'],['Vino','linear-gradient(160deg,#3a0a12 0%,#120206 100%)'],['Dorado','radial-gradient(circle at 50% 30%,#5a4416 0%,#1a1206 70%)'],['Verde','linear-gradient(160deg,#0f2e1f 0%,#030b07 100%)'],['Amanecer','linear-gradient(180deg,#2c1a4a 0%,#c0574a 120%)'],['Gris','linear-gradient(160deg,#2b2f36 0%,#0d0f12 100%)'],['Celeste','linear-gradient(135deg,#0f4c75 0%,#3282b8 100%)']];
const PJ_FONTS=['Figtree','Montserrat','Poppins','Oswald','Merriweather','Lora'];
const PJ_COLORS=['#ffffff','#fff6d8','#e9c45a','#9fd3ff','#000000'];
let PJS=null, PJF=[];
async function styleOpen(){
  try{ PJS=await (await fetch('/api/proyector/estilo')).json(); }catch{ PJS={bg:'#000000',img:'',dim:.35,color:'#ffffff',ref:'#e9c45a',font:'Figtree',upper:false,size:1,margin:4,shadow:true}; }
  try{ PJF=(await api('/api/fondos')).fondos||[]; }catch{ PJF=[]; }
  styleDraw();
}
function stylePrev(){ const x=PJS; return `<div style="aspect-ratio:16/9;border-radius:10px;overflow:hidden;position:relative;border:1px solid var(--line);background:${x.img?`url('${x.img}') center/cover,`:''}${x.bg}"><div style="position:absolute;inset:0;background:#000;opacity:${x.img?x.dim:0}"></div><div style="position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:0 ${x.margin}%;font-family:'${x.font}',sans-serif;font-weight:700;color:${x.color};font-size:${Math.round(22*x.size)}px;line-height:1.2;${x.upper?'text-transform:uppercase;':''}${x.shadow?'text-shadow:0 2px 8px rgba(0,0,0,.7);':''}"><span>Cuán grande es Él<br>Santo, santo es el Señor</span></div><div style="position:absolute;left:0;right:0;bottom:6%;text-align:center;font-family:'${x.font}',sans-serif;font-weight:700;font-size:12px;color:${x.ref}">Juan 3:16 · RVR1960</div></div>`; }
function styleDraw(){
  const x=PJS; if(!document.getElementById('pjs-font-css')){ const l=document.createElement('link'); l.id='pjs-font-css'; l.rel='stylesheet'; l.href='https://fonts.googleapis.com/css2?family=Figtree:wght@700&family=Montserrat:wght@700&family=Poppins:wght@700&family=Merriweather:wght@700&family=Oswald:wght@600&family=Lora:wght@700&display=swap'; document.head.appendChild(l); }
  const sw=(bg,on,act,extra='')=>`<button type="button" data-act="${act}" ${extra} aria-pressed="${on}" style="width:56px;height:36px;border-radius:8px;border:${on?'3px solid var(--accent)':'1px solid var(--line)'};background:${bg};background-size:cover;background-position:center;cursor:pointer"></button>`;
  $('#modal-root').innerHTML=`<div class="scrim" data-act="close-modal"><div class="modal" role="dialog" aria-label="Fondo y letra" data-stop style="width:min(640px,100%)">
    <header><h3>🎨 Fondo y letra de la pantalla</h3><button type="button" class="btn ghost" data-act="close-modal" aria-label="Cerrar">${ICON.x}</button></header>
    <div class="body" style="display:grid;gap:14px">
      <div id="pjs-prev">${stylePrev()}</div>
      <div><b style="font-size:14px">Fondo de color</b><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${PJ_BG.map(([n,v],i)=>`<span title="${n}">${sw(v,!x.img&&x.bg===v,'pjs-bg',`data-i="${i}"`)}</span>`).join('')}</div></div>
      <div><b style="font-size:14px">Fondo con imagen</b><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;align-items:center">${PJF.map(f=>sw(`url('${f.url}')`,x.img===f.url,'pjs-img',`data-u="${f.url}"`)).join('')}
        <label class="btn" style="cursor:pointer">＋ Subir imagen<input type="file" id="pjs-up" accept="image/*" hidden></label>${x.img?`<button type="button" class="btn ghost" data-act="pjs-noimg">Quitar imagen</button><button type="button" class="btn ghost danger" data-act="pjs-delimg" data-u="${x.img}">Borrar esta imagen</button>`:''}</div>
        ${x.img?`<label class="f" style="margin-top:8px">Oscurecer la imagen (para que se lea mejor): ${Math.round(x.dim*100)}%<input type="range" min="0" max="0.85" step="0.05" value="${x.dim}" id="pjs-dim"></label>`:''}</div>
      <div class="grid2">
        <label class="f">Tipo de letra<select id="pjs-font">${PJ_FONTS.map(f=>`<option ${f===x.font?'selected':''} style="font-family:'${f}'">${f}</option>`).join('')}</select></label>
        <label class="f">Tamaño · Alabanzas: ${Math.round(x.size*100)}%<input type="range" min="0.6" max="1.8" step="0.05" value="${x.size}" id="pjs-size"></label>
      </div>
      <div class="grid2">
        <label class="f">Tamaño · Biblia: ${Math.round((x.sizeBible||1)*100)}%<input type="range" min="0.5" max="2.2" step="0.05" value="${x.sizeBible||1}" id="pjs-sizeb"></label>
        <label class="f">Tamaño · Mensaje: ${Math.round((x.sizeMsg||1)*100)}%<input type="range" min="0.5" max="2.2" step="0.05" value="${x.sizeMsg||1}" id="pjs-sizem"></label>
      </div>
      <div><b style="font-size:14px">Color de la letra</b><div style="display:flex;gap:6px;margin-top:6px;align-items:center">${PJ_COLORS.map(c=>sw(c,x.color===c,'pjs-color',`data-c="${c}"`)).join('')}<span class="muted" style="font-size:13px;margin-left:8px">Cita:</span>${['#e9c45a','#ffffff','#9fd3ff'].map(c=>sw(c,x.ref===c,'pjs-ref',`data-c="${c}"`)).join('')}</div></div>
      <div class="grid2">
        <label class="f">Margen a los lados: ${x.margin}% <small class="muted">(súbelo si la TV corta los bordes)</small><input type="range" min="0" max="12" step="1" value="${x.margin}" id="pjs-margin"></label>
        <div style="display:grid;gap:6px;align-content:end"><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="pjs-upper" ${x.upper?'checked':''}> Alabanzas en MAYÚSCULAS</label><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="pjs-upr" ${x.upperRead?'checked':''}> Biblia y Mensaje en MAYÚSCULAS</label><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="pjs-shadow" ${x.shadow?'checked':''}> Sombra en la letra</label></div>
      </div>
      <p class="muted" style="margin:0;font-size:12.5px">Los cambios se ven al instante en la pantalla del proyector.</p>
    </div></div></div>`;
  const on=(id,ev,fn)=>{ const el=$(id); if(el) el.addEventListener(ev,fn); };
  on('#pjs-font','change',e=>styleSet({font:e.target.value}));
  on('#pjs-size','input',e=>styleSet({size:+e.target.value},true));
  on('#pjs-sizeb','input',e=>styleSet({sizeBible:+e.target.value},true));
  on('#pjs-sizem','input',e=>styleSet({sizeMsg:+e.target.value},true));
  on('#pjs-margin','input',e=>styleSet({margin:+e.target.value},true));
  on('#pjs-dim','input',e=>styleSet({dim:+e.target.value},true));
  on('#pjs-upper','change',e=>styleSet({upper:e.target.checked}));
  on('#pjs-upr','change',e=>styleSet({upperRead:e.target.checked}));
  on('#pjs-shadow','change',e=>styleSet({shadow:e.target.checked}));
  on('#pjs-up','change',async e=>{ const f=e.target.files[0]; if(!f) return; toast('Subiendo imagen…');
    try{ const r=await fetch('/api/fondos',{method:'POST',headers:{Authorization:'Bearer '+S.token,'Content-Type':'application/octet-stream'},body:f}); const d=await r.json(); if(!r.ok) throw 0; PJF.unshift({url:d.url}); styleSet({img:d.url}); }catch{ toast('No se pudo subir esa imagen.'); } });
}
let PJS_T=null;
function styleSet(ch,soft){ Object.assign(PJS,ch); if(typeof BB!=='undefined') BB.style={...PJS}; if(soft){ const pv=$('#pjs-prev'); if(pv) pv.innerHTML=stylePrev(); const lab=document.activeElement&&document.activeElement.closest('label'); if(lab&&lab.firstChild&&lab.firstChild.nodeType===3){ const k=document.activeElement.id; const v=PJS[({'pjs-sizeb':'sizeBible','pjs-sizem':'sizeMsg'})[k]||k.replace('pjs-','')]; lab.firstChild.nodeValue=lab.firstChild.nodeValue.replace(/\d+%/, (k==='pjs-margin'?v:Math.round(v*100))+'%'); } } else styleDraw();
  clearTimeout(PJS_T); PJS_T=setTimeout(async()=>{ try{ PJS=await api('/api/proyector/estilo',{method:'POST',body:JSON.stringify(PJS)}); }catch(e){ if(e.message==='auth') lostAuth(); else toast('No se pudo guardar el estilo.'); } },soft?250:0); }
document.addEventListener('click',ev=>{ const el=ev.target.closest('[data-act]'); if(!el) return; const a=el.dataset.act, d=el.dataset;
  if(a==='proj-style') styleOpen();
  else if(a==='pjs-bg') styleSet({bg:PJ_BG[+d.i][1],img:''});
  else if(a==='pjs-img') styleSet({img:d.u});
  else if(a==='pjs-noimg') styleSet({img:''});
  else if(a==='pjs-delimg'){ (async()=>{ try{ await api('/api/fondos/'+d.u.split('/').pop(),{method:'DELETE'}); PJF=PJF.filter(f=>f.url!==d.u); styleSet({img:''}); }catch{ toast('No se pudo borrar.'); } })(); }
  else if(a==='pjs-color') styleSet({color:d.c});
  else if(a==='pjs-ref') styleSet({ref:d.c});
});

/* F9: poner la pantalla en negro (y volver a mostrar lo que había) desde cualquier parte */
document.addEventListener('keydown',async e=>{ if(e.key!=='F9') return; e.preventDefault(); if(!S.token){ toast('Ingresa con tu usuario para controlar la pantalla.'); return; }
  try{ const r=await api('/api/proyector/negro',{method:'POST'}); PJ.remote=r; if(typeof BB!=='undefined') BB.remote=r; if(typeof MS!=='undefined') MS.remote=r; toast(r.mode==='black'?'■ Pantalla en negro (F9 para volver)':'Pantalla restaurada'); if(PJ.open) pjRender(); if(V.view==='bible'||V.view==='mensaje') render(); }
  catch(err){ if(err.message==='auth') lostAuth(); else toast('No se pudo cambiar la pantalla.'); } });

/* Mantiene la Biblia y el Mensaje sincronizados con lo que está en pantalla (por ejemplo, si se navega desde la ventana del proyector) */
const LW={ws:null,t:null};
function lwConnect(){
  if(!S.token||(LW.ws&&LW.ws.readyState<2)) return;
  let ws; try{ ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws/proyector'); }catch{ return; }
  LW.ws=ws;
  ws.onmessage=ev=>{ if(ev.data==='pong') return; let d; try{ d=JSON.parse(ev.data); }catch{ return; } if(d._ver) return; if(d._sung){ setSung(d._sung); return; } if(d._style){ PJ.style=d._style; if(typeof BB!=='undefined') BB.style=d._style; if(typeof MS!=='undefined') MS.style=d._style; return; }
    let changed=false;
    if(typeof BB!=='undefined'){ BB.remote=d; if(d.mode==='text'&&d.bible&&BB.live&&BB.data&&(BB.b!==d.bible.b||BB.c!==d.bible.c||BB.v!==d.bible.v)){ BB.b=d.bible.b; BB.c=d.bible.c; BB.v=d.bible.v; } changed=V.view==='bible'; }
    if(typeof MS!=='undefined'){ MS.remote=d; if(d.mode==='text'&&d.sermon&&MS.cur&&MS.cur.id===d.sermon.id&&MS.live){ MS.p=d.sermon.p; MS.part=d.sermon.part||0; } changed=changed||V.view==='mensaje'; }
    const ae=document.activeElement; if(changed&&!(ae&&ae.closest&&ae.closest('input,textarea,select'))&&!document.getElementById('qk')){ render(); if(V.view==='mensaje'&&typeof msScroll==='function') setTimeout(msScroll,20); } };
  ws.onclose=()=>{ LW.ws=null; clearTimeout(LW.t); LW.t=setTimeout(lwConnect,3000); };
  ws.onerror=()=>{ try{ ws.close(); }catch{} };
}
setInterval(()=>{ if(LW.ws&&LW.ws.readyState===1) LW.ws.send('ping'); else if(S.token&&(V.view==='bible'||V.view==='mensaje')) lwConnect(); },20000);
document.addEventListener('click',()=>{ if(S.token&&!LW.ws&&(V.view==='bible'||V.view==='mensaje')) setTimeout(lwConnect,300); });

/* Aviso: la app (no el proyector) quedó abierta en la pantalla externa */
(async function(){ try{
  if(!('getScreenDetails' in window)||!navigator.permissions) return; const st=await navigator.permissions.query({name:'window-management'}).catch(()=>null); if(!st||st.state!=='granted') return;
  const sd=await window.getScreenDetails(); let off=false;
  const chk=()=>{ const on=!off&&sd.screens.length>1&&sd.currentScreen&&!sd.currentScreen.isPrimary; let b=document.getElementById('scr-warn');
    if(on&&!b){ b=document.createElement('div'); b.id='scr-warn'; b.className='scr-warn'; b.innerHTML=`<b>La app está abierta en la pantalla ${sd.screens.indexOf(sd.currentScreen)+1} (${esc(sd.currentScreen.label||'externa')}).</b> Esa pantalla es para el proyector. Pásala a tu pantalla con <kbd>Windows</kbd> + <kbd>Shift</kbd> + <kbd>←</kbd> (o <kbd>→</kbd>), o arrastrándola. <button type="button" aria-label="Cerrar">×</button>`;
      b.querySelector('button').onclick=()=>{ off=true; b.remove(); }; document.body.appendChild(b); }
    if(!on&&b) b.remove(); };
  chk(); sd.addEventListener('currentscreenchange',chk); sd.addEventListener('screenschange',chk);
  const st2=document.createElement('style'); st2.textContent=`.scr-warn{position:fixed;left:50%;top:calc(10px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:90;width:min(720px,94vw);background:#3a2a06;color:#fff3cf;border:2px solid #e9c45a;border-radius:14px;padding:12px 44px 12px 16px;font:500 14.5px/1.45 var(--f-ui);box-shadow:0 12px 40px rgba(0,0,0,.5)}
.scr-warn b{color:#ffd76a}.scr-warn kbd{background:#000;border:1px solid #777;border-radius:5px;padding:0 6px;font:600 12.5px var(--f-mono)}
.scr-warn button{position:absolute;right:8px;top:8px;width:28px;height:28px;border-radius:50%;border:0;background:rgba(255,255,255,.12);color:#fff;font-size:18px;cursor:pointer}`; document.head.appendChild(st2);
}catch{} })();

/* ---- Alabanzas ya cantadas hoy: fondo amarillo para que el director vea cómo va el servicio ---- */
S.sung=new Set();
function isSung(id){ return !!(S.sung&&S.sung.has(id)); }
function setSung(d){ const before=[...S.sung].join(); S.sung=new Set((d&&d.ids)||[]); if([...S.sung].join()===before) return; if(PJ.open) pjRender(); if(['list','program','programs'].includes(V.view)&&!(document.activeElement&&/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName))) render(); }
async function sungLoad(){ try{ setSung(await (await fetch('/api/proyector/sung')).json()); }catch{} }
sungLoad(); setInterval(()=>{ if(!document.hidden&&S.user&&(!PJ.ws||PJ.ws.readyState!==1)) sungLoad(); },60000);
document.addEventListener('click',async ev=>{ const el=ev.target.closest('[data-act="sung-reset"],[data-act="sung-toggle"]'); if(!el) return; ev.preventDefault(); ev.stopPropagation();
  try{ if(el.dataset.act==='sung-reset'){ setSung(await api('/api/proyector/sung',{method:'DELETE'})); toast('Listo: se borró la marca de cantadas.'); } else setSung(await api('/api/proyector/sung',{method:'POST',body:JSON.stringify({id:el.dataset.id,off:isSung(el.dataset.id)})})); }catch{ toast('No se pudo cambiar.'); } },true);
(function(){ const st=document.createElement('style'); st.textContent=`
.sung{background:color-mix(in srgb,#f3cf4a 24%,var(--surface))!important;box-shadow:inset 4px 0 0 #e2b72c}
.pj-it.sung[aria-pressed="true"]{background:color-mix(in srgb,#f3cf4a 38%,var(--surface))!important}
.pj-it .sg,.item .sg{display:inline-block;font-size:11px;font-weight:700;color:#8a6a00;background:#f7dc6f;border-radius:999px;padding:1px 7px;margin-top:3px}
:root:not([data-theme="light"]):not([data-theme="sepia"]) .pj-it .sg,:root:not([data-theme="light"]):not([data-theme="sepia"]) .item .sg{color:#2a2000}
.sung-pill{background:#f7dc6f!important;color:#3a2c00!important;font-size:10.5px;vertical-align:middle}
.pj-sug-h{margin:8px 2px 4px;font-size:12.5px;color:var(--muted);font-weight:600}
.sung-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:12px 0 4px;padding:8px 12px;border-radius:10px;background:color-mix(in srgb,#f3cf4a 16%,var(--surface));border:1px solid color-mix(in srgb,#e2b72c 50%,transparent);font-size:13.5px}
`; document.head.appendChild(st); })();

/* ===== OBS: letra abajo en 2 líneas para la transmisión + exportar PNG ===== */
const OBS_FONTS=['Barlow Semi Condensed','Oswald','Montserrat','Figtree'];
const OBS_BGP={aurora:['Aurora','#030607',[['#1f6f73',72,42,62],['#0c3640',18,82,58],['#2c8f89',88,12,38]]],bruma:['Bruma','#050a0b',[['#3a6b68',55,50,72],['#0b2226',12,18,52],['#14403f',92,88,50]]],oceano:['Océano','#02060c',[['#0f3f6b',62,36,66],['#0a5a72',22,82,52],['#071d2c',92,92,50]]],esmeralda:['Esmeralda','#020806',[['#105c46',66,55,62],['#0a3a2c',18,20,52],['#1d7d60',90,14,36]]],indigo:['Índigo','#04040c',[['#2c2b72',60,40,62],['#14123a',18,86,56],['#3b3084',90,14,36]]],vino:['Vino','#090305',[['#5c1528',66,45,62],['#2a0811',18,82,56],['#7c2336',90,14,36]]],oro:['Oro viejo','#080603',[['#5e4416',66,45,56],['#2a1c08',18,82,56],['#7c5c1e',88,18,32]]],carbon:['Carbón','#050505',[['#2b2e34',60,40,66],['#15171a',18,86,56],['#3b3f46',88,14,36]]]};
const OBS_BGS=Object.fromEntries([...Object.entries(OBS_BGP).map(([k,[n,b,L]])=>[k,[n,L.map(([c,x,y,z])=>`radial-gradient(circle at ${x}% ${y}%,${c} 0%,transparent ${z*0.75}%)`).join(',')+','+b]]),['templo',['Igual que la pantalla del templo','repeating-linear-gradient(45deg,#333 0 6px,#555 6px 12px)']]]);
function obsOpt(){ let o={}; try{ o=JSON.parse(localStorage.getItem('vdn-obs')||'{}')||{}; }catch{} return {t:1,pos:'abajo',may:true,franja:false,biblia:true,mensaje:false,fuente:'Barlow Semi Condensed',pasos:true,used:false,ml:3,mt:1,bsc:false,bscn:'Biblia',res:1920,...o}; }
function obsSave(o){ try{ localStorage.setItem('vdn-obs',JSON.stringify(o)); }catch{} }
function obsUrl(o){ const q=new URLSearchParams(); if(o.t!==1) q.set('t',String(o.t)); if(o.pos==='arriba') q.set('pos','arriba'); if(!o.may) q.set('may','0'); if(o.franja) q.set('franja','1'); if(!o.biblia) q.set('biblia','0'); if(o.mensaje) q.set('mensaje','1'); if(o.fuente!=='Barlow Semi Condensed') q.set('fuente',o.fuente); if(o.bsc&&o.bscn){ q.set('escena',o.bscn); if(o.bscm) q.set('escmsg','1'); } if(o.mensaje){ if(o.ml!==3) q.set('ml',String(o.ml)); if(o.mt!==1) q.set('mt',String(o.mt)); } const s=q.toString(); return location.origin+'/obs'+(s?'?'+s:''); }
function obsTwo(text){
  const L=String(text||'').split('\n').map(s=>s.trim().replace(/^\/\/|\/\/$/g,'').trim()).filter(Boolean);
  if(!L.length) return [];
  if(L.length===1){ const w=L[0].split(/\s+/); if(L[0].length<34||w.length<4) return L; let best=1,bd=1e9; for(let k=1;k<w.length;k++){ const d=Math.abs(w.slice(0,k).join(' ').length-w.slice(k).join(' ').length); if(d<bd){bd=d;best=k;} } return [w.slice(0,best).join(' '),w.slice(best).join(' ')]; }
  if(L.length===2) return L;
  let best=1,bm=1e9; for(let k=1;k<L.length;k++){ const a=L.slice(0,k).join(' ').length,b=L.slice(k).join(' ').length,m=Math.max(a,b); if(m<bm){bm=m;best=k;} }
  return [L.slice(0,best).join(' '),L.slice(best).join(' ')];
}
/* Divide la estrofa en partes de 2 líneas para la transmisión (una línea muy larga va sola, partida en 2) */
function obsChunks(text){
  const L=String(text||'').split('\n').map(s=>s.trim().replace(/^\/\/|\/\/$/g,'').trim()).filter(Boolean); const out=[]; let c=[];
  for(const l of L){ if(l.length>44){ if(c.length){ out.push(c); c=[]; } out.push(obsTwo(l)); continue; } c.push(l); if(c.length===2){ out.push(c); c=[]; } }
  if(c.length) out.push(c); return out.length?out:[[]];
}
function obsStepOn(){ const o=obsOpt(); return !!(o.used&&o.pasos); }
function pjSlP(x,cur,r){ if(!obsStepOn()) return `<p>${esc(x.text)}</p>`; const ch=obsChunks(x.text); if(ch.length<2) return `<p>${esc(x.text)}</p>`;
  return `<p class="obs-ch">${ch.map((c,k)=>`<span class="ch${cur&&(r.sub||0)===k?' on':''}" data-sub="${k}">${esc(c.join('\n'))}</span>`).join('')}</p>`; }
function obsFontsCss(){ if(document.getElementById('obs-font-css')) return; const l=document.createElement('link'); l.id='obs-font-css'; l.rel='stylesheet'; l.href='https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@700&family=Oswald:wght@600&family=Montserrat:wght@700&family=Figtree:wght@700&display=swap'; document.head.appendChild(l); }
/* Dibuja una diapositiva en un lienzo transparente 1920×1080, igual que la pantalla de OBS */
function obsDraw(cv,lines,o,checker){
  const W=cv.width,H=cv.height,c=cv.getContext('2d'); c.clearRect(0,0,W,H);
  if(checker){ c.fillStyle='#3a3f47'; c.fillRect(0,0,W,H); c.fillStyle='#2c3036'; const q=W/32; for(let y=0;y<H;y+=q) for(let x=(y/q)%2?q:0;x<W;x+=2*q) c.fillRect(x,y,q,q); }
  if(!lines.length) return;
  const txt=lines.map(l=>o.may?l.toLocaleUpperCase('es'):l); const fam=`"${o.fuente}", "Arial Narrow", Arial, sans-serif`;
  let fs=Math.round(Math.min(W*.052,H*.095)*o.t); const maxW=W*.92;
  c.font=`700 ${fs}px ${fam}`; const widest=Math.max(...txt.map(t=>c.measureText(t).width)); if(widest>maxW) fs=Math.floor(fs*maxW/widest*.98);
  c.font=`700 ${fs}px ${fam}`; c.textAlign='center'; c.textBaseline='alphabetic';
  const lh=fs*1.12, n=txt.length, blockH=lh*n, pad=fs*.35;
  const yTop=o.pos==='arriba'?H*.06:H-H*.06-blockH;
  if(o.franja){ const g=c.createLinearGradient(0,0,W,0); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(.12,'rgba(0,0,0,.62)'); g.addColorStop(.88,'rgba(0,0,0,.62)'); g.addColorStop(1,'rgba(0,0,0,0)'); c.fillStyle=g; c.fillRect(0,yTop-pad,W,blockH+pad*2); }
  txt.forEach((t,i)=>{ const y=yTop+lh*i+fs*.9;
    c.save(); c.shadowColor='rgba(0,0,0,.85)'; c.shadowBlur=fs*.14; c.shadowOffsetY=fs*.05; c.lineJoin='round'; c.lineWidth=Math.max(2,fs*.06); c.strokeStyle='rgba(0,0,0,.55)'; c.strokeText(t,W/2,y); c.restore();
    c.fillStyle='#ffffff'; c.fillText(t,W/2,y); });
}
function obsPrevLines(){ const s=typeof pjSong==='function'?pjSong():null; const sl=s?pjSlides(s):[]; const r=PJ&&PJ.remote; const i=r&&r.songId===(s&&s.id)?r.idx:0; const t=(sl[i]||sl[0]||{text:'Y yo soy feliz en alabarle\nY lo hago con el alma'}).text; if(obsOpt().pasos){ const ch=obsChunks(t); return ch[Math.min((r&&r.sub)||0,ch.length-1)]; } return obsTwo(t); }
function obsOpen(){
  if(!PJS){ fetch('/api/proyector/estilo').then(r=>r.json()).then(j=>{ if(!PJS){ PJS=j; if(document.getElementById('obs-cv')) obsOpen(); } }).catch(()=>{}); }
  obsFontsCss(); if(!obsOpt().used){ obsSave({...obsOpt(),used:true}); if(typeof pjRender==='function') try{ pjRender(); }catch{} } const o=obsOpt(); const s=typeof pjSong==='function'?pjSong():null;
  $('#modal-root').innerHTML=`<div class="scrim" data-act="close-modal"><div class="modal" role="dialog" aria-label="Letra para OBS" data-stop style="width:min(680px,100%)">
    <header><h3>📡 Letra para la transmisión (OBS)</h3><button type="button" class="btn ghost" data-act="close-modal" aria-label="Cerrar">${ICON.x}</button></header>
    <div class="body" style="display:grid;gap:14px">
      <canvas id="obs-cv" width="1920" height="1080" style="width:100%;aspect-ratio:16/9;border-radius:10px;border:1px solid var(--line)"></canvas>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px 16px;font-size:14px">
        <label style="display:grid;gap:4px">Tamaño de letra <input type="range" id="obs-t" min="0.6" max="1.6" step="0.05" value="${o.t}"></label>
        <label style="display:grid;gap:4px">Tipo de letra <select id="obs-f" class="input">${OBS_FONTS.map(f=>`<option ${f===o.fuente?'selected':''}>${f}</option>`).join('')}</select></label>
        <label style="display:grid;gap:4px">Posición <select id="obs-pos" class="input"><option value="abajo" ${o.pos!=='arriba'?'selected':''}>Abajo</option><option value="arriba" ${o.pos==='arriba'?'selected':''}>Arriba</option></select></label>
        <div style="display:grid;gap:6px;align-content:end">
          <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="obs-may" ${o.may?'checked':''}> MAYÚSCULAS</label>
          <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="obs-fr" ${o.franja?'checked':''}> Franja oscura detrás</label></div>
        <div style="display:grid;gap:6px;align-content:end">
          <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="obs-bb" ${o.biblia?'checked':''}> Mostrar también la Biblia</label>
          <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="obs-ms" ${o.mensaje?'checked':''}> Mostrar también el Mensaje</label></div>
        ${o.mensaje?`<label style="display:grid;gap:4px">Mensaje · tamaño de letra <input type="range" id="obs-mt" min="0.6" max="1.8" step="0.05" value="${o.mt}"></label>
        <label style="display:grid;gap:4px">Mensaje · líneas a la vista: <b id="obs-mlv">${o.ml}</b><input type="range" id="obs-ml" min="2" max="6" step="1" value="${o.ml}"></label>`:''}
      </div>
      <label style="display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border:1px solid var(--accent);border-radius:10px;background:var(--accent-soft)"><input type="checkbox" id="obs-pasos" ${o.pasos?'checked':''} style="margin-top:3px"><span><b>Transmisión de 2 en 2 líneas</b><br><small style="color:var(--muted)">Una estrofa de 4 líneas sale en 2 partes. Con <b>Siguiente</b> pasas primero las partes en la transmisión; la pantalla del templo sigue mostrando la estrofa completa. También puedes tocar cada parte en la estrofa.</small></span></label>
      <div style="display:grid;gap:6px"><b style="font-size:14px">1) Dirección para OBS</b>
        <div style="display:flex;gap:8px"><input id="obs-url" class="input" readonly value="${esc(obsUrl(o))}" style="flex:1;min-width:0;font-family:var(--f-mono);font-size:12px"><button class="btn pri" data-act="obs-copy">Copiar</button></div>
        <ol style="margin:4px 0 0;padding-left:20px;font-size:13px;color:var(--muted);line-height:1.55">
          <li>En OBS, en <b>Fuentes</b> pulsa <b>+</b> → <b>Navegador</b> (Browser).</li>
          <li>Pega la dirección. Ancho <b>1920</b>, alto <b>1080</b>. Acepta.</li>
          <li>Ponla <b>encima</b> de la cámara. El fondo ya es transparente.</li>
          <li>Listo: cada vez que proyectes una estrofa desde aquí, en la transmisión sale en 2 líneas. Con <b>Negro</b> o <b>Logo</b> la letra desaparece.</li>
        </ol></div>
      <div style="display:grid;gap:8px;border:1px solid var(--line);border-radius:10px;padding:10px 12px"><b style="font-size:14px">📖 Biblia a media pantalla (opcional)</b>
        <span style="font-size:13px;color:var(--muted)">Cuando proyectes una cita, OBS cambia solo a una escena con la cámara a la izquierda y el versículo grande a la derecha. Al quitarla, vuelve a la escena de antes.</span>
        <div><b style="font-size:13px">Fondo (se cambia al instante en OBS)</b><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${Object.entries(OBS_BGS).map(([k,[n,g]])=>`<button type="button" data-act="obs-bg" data-k="${k}" title="${n}" aria-pressed="${(({azul:'oceano',noche:'bruma',celeste:'aurora',purpura:'indigo',dorado:'oro',atardecer:'vino',grafito:'carbon'})[PJS&&PJS.obsBg]||(PJS&&PJS.obsBg)||'aurora')===k}" style="width:62px;height:38px;border-radius:8px;cursor:pointer;border:${(({azul:'oceano',noche:'bruma',celeste:'aurora',purpura:'indigo',dorado:'oro',atardecer:'vino',grafito:'carbon'})[PJS&&PJS.obsBg]||(PJS&&PJS.obsBg)||'aurora')===k?'3px solid var(--accent)':'1px solid var(--line)'};background:${g}"></button>`).join('')}</div></div>
        <label style="display:flex;gap:8px;align-items:center">Tamaño de tu lienzo en OBS <select id="obs-res" class="input" style="width:auto;padding:3px 8px">${[[1920,'1920 × 1080 (Full HD)'],[2560,'2560 × 1440 (2K)'],[3840,'3840 × 2160 (4K)']].map(([w,n])=>`<option value="${w}" ${o.res===w?'selected':''}>${n}</option>`).join('')}</select></label>
        <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="obs-bsc" ${o.bsc?'checked':''}> Cambiar sola a la escena <input id="obs-bscn" class="input" value="${esc(o.bscn)}" style="width:120px;padding:3px 8px"> cuando proyecte una cita</label>
        ${o.bsc?`<label style="display:flex;gap:8px;align-items:center;margin-left:26px"><input type="checkbox" id="obs-bscm" ${o.bscm?'checked':''}> También con el <b>Mensaje</b> (el párrafo baja suave a la derecha, junto con la rueda del mouse)</label>`:''}
        ${o.bsc?`<ol style="margin:0;padding-left:20px;font-size:13px;color:var(--muted);line-height:1.6">
          <li>Con la casilla marcada, <b>vuelve a copiar la dirección del punto 1</b> y pégala en tu fuente de Navegador de siempre. Clic derecho en esa fuente → <b>Propiedades</b> → <b>Permisos de la página: "Acceso avanzado a OBS"</b>.</li>
          <li>En OBS crea una escena nueva llamada <b>${esc(o.bscn)}</b>.</li>
          <li>Ahí agrega tu <b>cámara</b> (+ → Dispositivo de captura de video → "Agregar existente"). Clic derecho en la cámara → Transformar → <b>Editar transformación</b>: Posición <b>${Math.round(80*o.res/1920)} , ${Math.round(291*o.res/1920)}</b> · Tipo de caja delimitadora <b>"Escalar a los límites exteriores"</b> · marca <b>"Recortar a la caja delimitadora"</b> · Tamaño de caja <b>${Math.round(883*o.res/1920)} × ${Math.round(497*o.res/1920)}</b>. <i>(Así la cámara llena el recuadro sin franjas negras aunque no sea 16:9.)</i></li>
          <li>Encima de la cámara agrega un <b>Navegador</b> con esta dirección. <b style="color:var(--danger)">Importante:</b> en sus Propiedades escribe Ancho <b>${o.res}</b> y Alto <b>${Math.round(o.res*9/16)}</b> (OBS trae 800×600 por defecto). <b>No la estires con el mouse</b> porque se deforma; después usa clic derecho → Transformar → <b>Ajustar a la pantalla</b> (Ctrl+F):
            <div style="display:flex;gap:8px;margin-top:4px"><input id="obs-burl" class="input" readonly value="${esc(location.origin+'/obs?vista=biblia'+(o.may?'':'&may=0')+(o.fuente!=='Barlow Semi Condensed'?'&fuente='+encodeURIComponent(o.fuente):'')+(o.t!==1?'&t='+o.t:'')+(o.mt&&o.mt!==1?'&mt='+o.mt:''))}" style="flex:1;min-width:0;font-family:var(--f-mono);font-size:12px"><button class="btn" data-act="obs-bcopy">Copiar</button></div></li>
          <li>Listo. El fondo lo eliges arriba y cambia al instante, sin volver a copiar nada. Todo se adapta solo a Full HD, 2K o 4K.</li></ol>`:''}
      </div>
      <div style="display:grid;gap:6px"><b style="font-size:14px">2) Imágenes PNG (opcional)</b>
        <span style="font-size:13px;color:var(--muted)">Una imagen transparente por estrofa, con este mismo estilo. Sirve para editar videos o para OBS sin internet.</span>
        <div>${s?`<button class="btn" data-act="obs-png" data-id="${esc(s.id)}">🖼 Descargar PNG de «${esc(s.title)}»</button>`:'<span style="font-size:13px">Abre una alabanza para descargar sus PNG.</span>'}</div></div>
    </div></div></div>`;
  const redraw=()=>{ const cv=$('#obs-cv'); if(cv) obsDraw(cv,obsPrevLines(),obsOpt(),true); };
  const on=(id,ev,fn)=>{ const el=$(id); if(el) el.addEventListener(ev,fn); };
  const set=ch=>{ const n={...obsOpt(),...ch}; obsSave(n); const u=$('#obs-url'); if(u) u.value=obsUrl(n); redraw(); };
  on('#obs-t','input',e=>set({t:+e.target.value})); on('#obs-f','change',e=>set({fuente:e.target.value})); on('#obs-pos','change',e=>set({pos:e.target.value}));
  on('#obs-may','change',e=>set({may:e.target.checked})); on('#obs-res','change',e=>{ set({res:+e.target.value}); obsOpen(); }); on('#obs-bscm','change',e=>{ set({bscm:e.target.checked}); }); on('#obs-bsc','change',e=>{ set({bsc:e.target.checked}); obsOpen(); }); on('#obs-bscn','change',e=>{ set({bscn:e.target.value.trim()||'Biblia'}); obsOpen(); }); on('#obs-pasos','change',e=>{ set({pasos:e.target.checked}); try{ pjRender(); }catch{} }); on('#obs-fr','change',e=>set({franja:e.target.checked})); on('#obs-bb','change',e=>set({biblia:e.target.checked})); on('#obs-ms','change',e=>{ set({mensaje:e.target.checked}); obsOpen(); }); on('#obs-mt','input',e=>set({mt:+e.target.value})); on('#obs-ml','input',e=>{ set({ml:+e.target.value}); const v=$('#obs-mlv'); if(v) v.textContent=e.target.value; });
  redraw(); document.fonts&&document.fonts.load('700 40px "Barlow Semi Condensed"').then(redraw).catch(()=>{}); document.fonts&&document.fonts.ready.then(redraw);
}
async function obsPng(id){
  try{
    obsFontsCss(); const o=obsOpt(); toast('Preparando imágenes…');
    let song=S.songs&&S.songs.get?S.songs.get(id):null; let texts=[];
    try{ const d=await (await fetch('/api/proyector/slides?song='+encodeURIComponent(id))).json(); texts=d.texts||[]; }catch{}
    if(!texts.length&&song) texts=pjSlides(song).map(x=>x.text);
    if(!texts.length) return toast('Esta alabanza no tiene letra.');
    try{ await document.fonts.load(`700 60px "${o.fuente}"`); }catch{}
    if(!window.JSZip){ await new Promise((ok,ko)=>{ const sc=document.createElement('script'); sc.src='/jszip.min.js'; sc.onload=ok; sc.onerror=ko; document.head.appendChild(sc); }); }
    const zip=new JSZip(); const cv=document.createElement('canvas'); cv.width=1920; cv.height=1080;
    let nI=0; for(let i=0;i<texts.length;i++){ const parts=o.pasos?obsChunks(texts[i]):[obsTwo(texts[i])]; for(let k=0;k<parts.length;k++){ obsDraw(cv,parts[k],o,false); const b=await new Promise(r=>cv.toBlob(r,'image/png')); nI++; zip.file(String(i+1).padStart(2,'0')+(parts.length>1?String.fromCharCode(97+k):'')+'.png',b); } }
    const name=((song&&song.title)||'alabanza').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^\w\- ]+/g,'').trim().replace(/\s+/g,'-').slice(0,60)||'alabanza';
    const blob=await zip.generateAsync({type:'blob'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name+'-OBS.zip'; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },2000);
    toast(`Listo: ${nI} imágenes PNG.`);
  }catch(e){ console.error(e); toast('No se pudieron crear las imágenes.'); }
}
document.addEventListener('click',ev=>{ const el=ev.target.closest('[data-act]'); if(!el) return; const a=el.dataset.act;
  if(a==='obs-open'){ ev.preventDefault(); obsOpen(); }
  else if(a==='obs-bg'){ (async()=>{ try{ if(!PJS||!PJS.font) PJS=await (await fetch('/api/proyector/estilo')).json(); }catch{} styleSet({obsBg:el.dataset.k},true); obsOpen(); })(); }
  else if(a==='obs-bcopy'){ const u=$('#obs-burl'); if(!u) return; u.select(); (navigator.clipboard?navigator.clipboard.writeText(u.value):Promise.reject()).then(()=>toast('Dirección copiada. Pégala en el Navegador de la escena Biblia.')).catch(()=>{ try{ document.execCommand('copy'); toast('Dirección copiada.'); }catch{} }); }
  else if(a==='obs-copy'){ const u=$('#obs-url'); if(!u) return; u.select(); (navigator.clipboard?navigator.clipboard.writeText(u.value):Promise.reject()).then(()=>toast('Dirección copiada. Pégala en OBS.')).catch(()=>{ try{ document.execCommand('copy'); toast('Dirección copiada.'); }catch{} }); }
  else if(a==='obs-png'){ ev.preventDefault(); obsPng(el.dataset.id); }
});


/* ===== Editar desde la consola: clic derecho en una estrofa (o F2 / Mayús+F2) ===== */
function pjShownSong(){ return pjWide()&&typeof pjCenter==='function'?pjCenter():pjSong(); }
function pjBodyField(song){ return (song&&song.body&&song.body.trim())?'body':'bodyPro'; }
/* Las mismas estrofas que pjSlides, pero recordando de qué líneas de la letra salió cada una */
function pjSlideLines(song){
  const body=song[pjBodyField(song)]||''; const P=parseSong(body); const out=[]; let block=[];
  const flush=()=>{ if(!block.length) return; const n=Math.ceil(block.length/4), size=Math.ceil(block.length/n);
    for(let i=0;i<block.length;i+=size){ const part=block.slice(i,i+size); out.push({from:part[0],to:part[part.length-1]}); } block=[]; };
  P.forEach((L,i)=>{ if(L.type==='sec'||L.type==='gap'){ flush(); return; } if(L.chordOnly) return; if(L.lyric.replace(/\s+/g,' ').trim()) block.push(i); });
  flush(); return out;
}
function pjEditIdx(){ const s=pjShownSong(); const r=PJ.remote||{}; return s&&r.songId===s.id?r.idx||0:0; }
function pjEditOpen(mode,i){
  if(!S.canWrite){ toast('Ingresa con tu usuario para editar.'); return; }
  const s=pjShownSong(); if(!s){ toast('Abre una alabanza primero.'); return; }
  const f=pjBodyField(s), L=String(s[f]||'').split('\n'); const idx=i!=null?i:pjEditIdx(); const map=pjSlideLines(s);
  let from=0,to=L.length-1, title='Editar toda la canción';
  if(mode==='one'){ const m=map[idx]; if(!m){ mode='all'; } else { from=m.from; to=m.to; title=`Editar estrofa ${idx+1}`; } }
  PJ.edit={id:s.id,f,from,to,mode,idx};
  const txt=L.slice(from,to+1).join('\n');
  $('#modal-root').innerHTML=`<div class="scrim" data-act="close-modal"><form class="modal" id="pje-form" role="dialog" aria-label="${esc(title)}" data-stop style="width:min(${mode==='all'?760:620}px,100%)">
    <header><h3>✏ ${esc(title)} · ${esc(s.title)}</h3><button type="button" class="btn ghost" data-act="close-modal" aria-label="Cerrar">${ICON.x}</button></header>
    <div class="body" style="display:grid;gap:10px">
      ${mode==='all'?`<label class="f">Título<input id="pje-title" class="input" value="${esc(s.title||'')}"></label>`:''}
      <textarea id="pje-txt" spellcheck="true" style="width:100%;min-height:${mode==='all'?'52vh':'190px'};font:15px/1.5 var(--f-mono,monospace);padding:10px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:inherit;resize:vertical">${esc(txt)}</textarea>
      <small style="color:var(--muted)">Los acordes van entre corchetes, por ejemplo <code>[G]Dale la gloria</code>. ${mode==='all'?'Deja una línea en blanco entre estrofas; <code># Coro</code> pone un título de sección.':'Una línea en blanco la divide en dos estrofas.'} · <b>Ctrl+Enter</b> guarda.</small>
      <div class="actions" style="justify-content:space-between"><span>${mode==='one'?`<button type="button" class="btn ghost" data-act="pje-all">Editar toda la canción</button>`:''}</span><span style="display:flex;gap:8px"><button type="button" class="btn" data-act="close-modal">Cancelar</button><button class="btn pri" type="submit">Guardar</button></span></div>
    </div></form></div>`;
  const ta=$('#pje-txt'); if(ta){ ta.focus(); ta.setSelectionRange(ta.value.length,ta.value.length); ta.addEventListener('keydown',e=>{ if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){ e.preventDefault(); $('#pje-form').requestSubmit(); } }); }
  $('#pje-form').addEventListener('submit',async e=>{ e.preventDefault(); await pjEditSave(); });
}
async function pjEditSave(){
  const E=PJ.edit; if(!E) return; const s=S.songs.get(E.id); if(!s) return;
  const L=String(s[E.f]||'').split('\n'); const nv=$('#pje-txt').value.replace(/\r/g,'').replace(/\s+$/,'');
  const body=E.mode==='all'?nv:[...L.slice(0,E.from),...nv.split('\n'),...L.slice(E.to+1)].join('\n');
  const d=JSON.parse(JSON.stringify(s)); d[E.f]=body; if(E.mode==='all'){ const t=$('#pje-title'); if(t&&t.value.trim()) d.title=t.value.trim(); }
  const ok=await writeDoc('songs',d); if(!ok) return;
  closeModal(); PJ.edit=null; PJ.ctxI=null; toast('Guardado.');
  const r=PJ.remote||{}; if(r.mode==='text'&&r.songId===s.id&&pjSong()&&pjSong().id===s.id){ const n=pjSlides(S.songs.get(s.id)).length; pjShow(Math.min(r.idx||0,Math.max(0,n-1)),r.sub||0); }
  pjRender();
}
/* Menú del clic derecho */
function pjCtxClose(){ const m=document.getElementById('pj-ctx'); if(m) m.remove(); }
document.addEventListener('contextmenu',e=>{
  if(!PJ.open) return; const sl=e.target.closest('#pj-body [data-i]'); if(!sl) return;
  e.preventDefault(); pjCtxClose(); PJ.ctxI=+sl.dataset.i;
  const m=document.createElement('div'); m.id='pj-ctx'; m.setAttribute('role','menu');
  m.innerHTML=`<button data-act="pjx-show">📺 Proyectar esta estrofa</button><button data-act="pjx-one">✏ Editar esta estrofa <kbd>F2</kbd></button><button data-act="pjx-all">✏ Editar toda la canción <kbd>Mayús+F2</kbd></button>`;
  m.style.cssText=`position:fixed;z-index:9999;left:${Math.min(e.clientX,innerWidth-250)}px;top:${Math.min(e.clientY,innerHeight-140)}px;display:grid;min-width:230px;padding:5px;border-radius:10px;border:1px solid var(--line);background:var(--surface);box-shadow:0 12px 32px rgba(0,0,0,.35)`;
  document.body.appendChild(m);
});
document.addEventListener('click',e=>{ const b=e.target.closest('#pj-ctx [data-act]'); if(!b){ if(!e.target.closest('#pj-ctx')) pjCtxClose(); return; }
  const a=b.dataset.act, i=PJ.ctxI; pjCtxClose();
  if(a==='pjx-show'){ const s=pjShownSong(); if(s&&pjSong()&&s.id===pjSong().id) pjShow(i); else { const el=document.querySelector(`#pj-body [data-i="${i}"]`); if(el) el.click(); } }
  else if(a==='pjx-one') pjEditOpen('one',i); else if(a==='pjx-all') pjEditOpen('all',i);
},true);
document.addEventListener('keydown',e=>{ if(e.key==='Escape') pjCtxClose(); });
document.addEventListener('click',e=>{ if(e.target.closest('[data-act="pje-all"]')){ e.preventDefault(); const E=PJ.edit; pjEditOpen('all',E?E.idx:0); } });
(()=>{ const st=document.createElement('style'); st.textContent=`#pj-ctx button{display:flex;justify-content:space-between;gap:14px;align-items:center;text-align:left;border:0;background:transparent;color:inherit;font:inherit;font-size:14px;padding:8px 10px;border-radius:7px;cursor:pointer}#pj-ctx button:hover{background:var(--accent-soft);color:var(--accent)}#pj-ctx kbd{font:11px var(--f-mono,monospace);color:var(--muted);border:1px solid var(--line);border-radius:4px;padding:0 4px}`; document.head.appendChild(st); })();
