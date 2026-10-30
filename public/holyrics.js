/* Voz de la Novia — importar canciones de Holyrics.
   Holyrics guarda las canciones como objetos de Java ("serialización" de Java):
   .muf = una canción, .mufl = una lista de canciones. También vienen dentro de .zip / .hbac (copia de seguridad),
   o como .xml / .txt. Aquí se lee ese formato sin ejecutar nada: solo se recorren los datos. */
(()=>{
const TC={NULL:0x70,REFERENCE:0x71,CLASSDESC:0x72,OBJECT:0x73,STRING:0x74,ARRAY:0x75,CLASS:0x76,BLOCKDATA:0x77,ENDBLOCKDATA:0x78,RESET:0x79,BLOCKDATALONG:0x7A,EXCEPTION:0x7B,LONGSTRING:0x7C,PROXYCLASSDESC:0x7D,ENUM:0x7E};
const SC_WRITE_METHOD=0x01,SC_SERIALIZABLE=0x02,SC_EXTERNALIZABLE=0x04,SC_BLOCK_DATA=0x08;

function JavaReader(buf){
  const u=buf instanceof Uint8Array?buf:new Uint8Array(buf); const dv=new DataView(u.buffer,u.byteOffset,u.byteLength);
  let pos=0, handles=[], steps=0; const out=[];
  const need=n=>{ if(pos+n>u.length) throw new Error('el archivo está incompleto'); if(++steps>5e6) throw new Error('archivo demasiado grande'); };
  const u8=()=>{ need(1); return u[pos++]; }, i16=()=>{ need(2); const v=dv.getInt16(pos); pos+=2; return v; }, u16=()=>{ need(2); const v=dv.getUint16(pos); pos+=2; return v; };
  const i32=()=>{ need(4); const v=dv.getInt32(pos); pos+=4; return v; }, i64=()=>{ need(8); const v=dv.getBigInt64(pos); pos+=8; return v; };
  const f32=()=>{ need(4); const v=dv.getFloat32(pos); pos+=4; return v; }, f64=()=>{ need(8); const v=dv.getFloat64(pos); pos+=8; return v; };
  /* UTF-8 "modificado" de Java */
  const mutf=n=>{ need(n); let s='', i=pos; const end=pos+n;
    while(i<end){ const a=u[i++]; if(a<0x80) s+=String.fromCharCode(a);
      else if((a&0xE0)===0xC0){ const b=u[i++]; s+=String.fromCharCode(((a&0x1F)<<6)|(b&0x3F)); }
      else { const b=u[i++], c=u[i++]; s+=String.fromCharCode(((a&0x0F)<<12)|((b&0x3F)<<6)|(c&0x3F)); } }
    pos=end; return s; };
  const utf=()=>mutf(u16()), longUtf=()=>{ const n=Number(i64()); if(n<0||n>5e7) throw new Error('texto inválido'); return mutf(n); };
  const nh=v=>{ handles.push(v); return v; };
  function classDesc(){ const t=u8();
    if(t===TC.NULL) return null;
    if(t===TC.REFERENCE) return ref();
    if(t===TC.CLASSDESC){ const d={kind:'class',name:utf(),fields:[],flags:0,sup:null}; i64(); nh(d); d.flags=u8(); const n=i16();
      for(let k=0;k<n;k++){ const tc=String.fromCharCode(u8()); const f={t:tc,name:utf()}; if(tc==='L'||tc==='[') f.cls=content(); d.fields.push(f); }
      d.ann=annotations(); d.sup=classDesc(); return d; }
    if(t===TC.PROXYCLASSDESC){ const d={kind:'class',name:'$Proxy',fields:[],flags:SC_SERIALIZABLE,sup:null}; nh(d); const n=i32(); for(let k=0;k<n;k++) utf(); d.ann=annotations(); d.sup=classDesc(); return d; }
    throw new Error('estructura desconocida (0x'+t.toString(16)+')'); }
  function ref(){ const h=i32()-0x7E0000; if(h<0||h>=handles.length) throw new Error('referencia inválida'); return handles[h]; }
  function annotations(){ const L=[]; for(;;){ const t=u[pos]; if(t===TC.ENDBLOCKDATA){ pos++; return L; } L.push(content()); } }
  function prim(t){ switch(t){ case 'B': return (u8()<<24)>>24; case 'C': return String.fromCharCode(u16()); case 'D': return f64(); case 'F': return f32(); case 'I': return i32(); case 'J': return i64(); case 'S': return i16(); case 'Z': return u8()!==0; default: return content(); } }
  function chain(d){ const L=[]; while(d){ L.unshift(d); d=d.sup; } return L; }
  function object(){ const cd=classDesc(); const o={kind:'object',cls:cd?cd.name:'',fields:{},ann:[]}; nh(o); out.push(o);
    for(const c of chain(cd)){
      if(c.flags&SC_EXTERNALIZABLE){ if(c.flags&SC_BLOCK_DATA) o.ann.push(...annotations()); else throw new Error('formato antiguo no compatible'); continue; }
      if(c.flags&SC_SERIALIZABLE){ for(const f of c.fields) o.fields[f.name]=prim(f.t); if(c.flags&SC_WRITE_METHOD) o.ann.push(...annotations()); } }
    return o; }
  function array(){ const cd=classDesc(); const a={kind:'array',cls:cd&&cd.name,items:[]}; nh(a); const n=i32(); if(n<0||n>5e6) throw new Error('lista inválida');
    const et=cd&&cd.name?cd.name.charAt(1):'L';
    if(et==='B'){ need(n); a.items=u.slice(pos,pos+n); pos+=n; } else for(let k=0;k<n;k++) a.items.push(prim(et)); return a; }
  function content(){ const t=u8();
    switch(t){
      case TC.NULL: return null;
      case TC.REFERENCE: return ref();
      case TC.STRING: return nh(utf());
      case TC.LONGSTRING: return nh(longUtf());
      case TC.OBJECT: return object();
      case TC.ARRAY: return array();
      case TC.ENUM: { const cd=classDesc(); const e={kind:'enum',cls:cd&&cd.name}; nh(e); e.value=content(); return e; }
      case TC.CLASS: { const cd=classDesc(); return nh({kind:'classref',cls:cd&&cd.name}); }
      case TC.CLASSDESC: case TC.PROXYCLASSDESC: pos--; return classDesc();
      case TC.BLOCKDATA: { const n=u8(); need(n); const b=u.slice(pos,pos+n); pos+=n; return {kind:'block',b}; }
      case TC.BLOCKDATALONG: { const n=i32(); need(n); const b=u.slice(pos,pos+n); pos+=n; return {kind:'block',b}; }
      case TC.RESET: handles=[]; return content();
      case TC.EXCEPTION: throw new Error('el archivo guarda un error de Holyrics');
      default: throw new Error('dato desconocido (0x'+t.toString(16)+')'); } }
  return { read(){ if(u[0]!==0xAC||u[1]!==0xED) throw new Error('no es un archivo de Holyrics'); pos=4; const roots=[]; let err=null;
      try{ while(pos<u.length) roots.push(content()); }catch(e){ err=e; } return {roots,objects:out,err}; } };
}

const S_=v=>typeof v==='string'?v:'';
const pick=(f,names)=>{ for(const n of names){ const v=S_(f[n]).trim(); if(v) return v; } return ''; };
const looksSong=o=>o&&o.kind==='object'&&(/\.Music$|\.Song$|\.Musica$/i.test(o.cls)||(typeof o.fields.title==='string'&&typeof o.fields.lyrics==='string'));
const KEY_RE=/^[A-G][#b]?m?$/;
/* "##(Coro)" o "#Coro" de Holyrics → nombre de la estrofa */
function cleanLyrics(t){
  return String(t).replace(/\r\n?/g,'\n').split('\n').map(l=>{ const m=l.match(/^\s*##?\s*\(?\s*([^()]{1,40}?)\s*\)?\s*$/); return m&&/\p{L}/u.test(m[1])?`{comment: ${m[1]}}`:l; }).join('\n').replace(/\n{3,}/g,'\n\n').trim(); }
function toSong(o){ const f=o.fields;
  const title=pick(f,['title','titulo','name','nome']); const lyrics=pick(f,['lyrics','letra','text','paragraphs','content']);
  if(!title&&!lyrics) return null;
  let key=pick(f,['tom','key','tone','tonalidade','tonality']); if(!KEY_RE.test(key)) key='';
  const num=v=>typeof v==='number'?v:v&&v.kind==='object'&&typeof v.fields.value==='number'?v.fields.value:NaN;
  const bpm=['bpm','tempo'].map(n=>num(f[n])).find(v=>v>20&&v<300)||'';
  return {title:title||'Sin título',author:pick(f,['artist','artista','author','autor','interpreter']),key,bpm,lyrics:cleanLyrics(lyrics)}; }

function fromJava(buf){ const r=JavaReader(buf).read(); const seen=new Set(), songs=[];
  for(const o of r.objects){ if(!looksSong(o)||seen.has(o)) continue; seen.add(o); const s=toSong(o); if(s&&s.lyrics) songs.push(s); }
  return {songs,err:r.err&&!songs.length?r.err:null,partial:!!r.err&&songs.length>0}; }

function fromXml(text){ const d=new DOMParser().parseFromString(text,'application/xml'); if(d.querySelector('parsererror')) return [];
  const g=(el,names)=>{ for(const n of names){ const x=el.getElementsByTagName(n)[0]; if(x&&x.textContent.trim()) return x.textContent; } return ''; };
  const els=[...d.getElementsByTagName('song'),...d.getElementsByTagName('music'),...d.getElementsByTagName('musica')];
  return els.map(el=>{ let lyrics=g(el,['lyrics','letra','text']);
      if(!lyrics){ const vs=[...el.getElementsByTagName('verse')]; lyrics=vs.map(v=>[...v.getElementsByTagName('lines')].map(l=>l.innerHTML.replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,'')).join('\n')||v.textContent).join('\n\n'); }
      const key=g(el,['tom','key','tone']).trim();
      return {title:g(el,['title','titulo','nome']).trim()||'Sin título',author:g(el,['artist','author','autor','artista']).trim(),key:KEY_RE.test(key)?key:'',lyrics:cleanLyrics(lyrics)}; })
    .filter(s=>s.lyrics); }

/* Texto de Holyrics: "@nome: …", "@artista: …", "@tom: …" arriba y "##(Coro)" para las estrofas */
const looksText=t=>/^\s*@(nome|title|titulo|artista|artist|autor|author|tom|key)\s*:/im.test(t)||/^##\(/m.test(t);
function fromText(text,fallback){ const t=String(text).replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
  const parts=t.split(/\n(?=@(?:nome|title|titulo)\s*:)/i); const out=[];
  for(const part of parts){ const head={}; const body=[]; let inHead=true;
    for(const l of part.split('\n')){ const m=inHead&&l.match(/^\s*@([a-zA-Z_]+)\s*:\s*(.*)$/); if(m){ head[m[1].toLowerCase()]=m[2].trim(); continue; } if(l.trim()) inHead=false; if(!inHead) body.push(l); }
    const key=(head.tom||head.key||'').trim(); const ly=cleanLyrics(body.join('\n').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>'));
    if(ly) out.push({title:head.nome||head.title||head.titulo||fallback||'Sin título',author:head.artista||head.artist||head.autor||head.author||'',key:KEY_RE.test(key)?key:'',lyrics:ly}); }
  return out; }
const EXT=['muf','mufl','hbac','zip','xml'];
/* Devuelve {songs:[...], notes:[...]} con todas las canciones encontradas en los archivos */
async function readFiles(files){ const songs=[], notes=[];
  const one=async(name,bytes)=>{ const ext=(name.match(/\.([a-z0-9]+)$/i)||[])[1]?.toLowerCase()||'';
    const u=new Uint8Array(bytes);
    if(u[0]===0xAC&&u[1]===0xED){ const r=fromJava(u); if(r.err) notes.push(`${name}: ${r.err.message}`); else if(r.partial) notes.push(`${name}: el archivo estaba incompleto; se leyeron ${r.songs.length} canciones.`); songs.push(...r.songs); return; }
    if(u[0]===0x50&&u[1]===0x4B){ const JSZip=await ioZip(); const z=await JSZip.loadAsync(u); const ents=Object.values(z.files).filter(e=>!e.dir);
      let n0=songs.length; for(const e of ents){ const en=e.name.toLowerCase(); if(/\.(muf|mufl|xml|zip|txt)$/.test(en)||(/(music|musica|song|letra|lyric)/.test(en)&&!/\.(jpg|jpeg|png|gif|mp3|mp4|wav|ttf|otf|pdf|pptx?)$/.test(en))){ try{ const b=await e.async('uint8array'); if(b[0]===0xAC&&b[1]===0xED||/\.(xml|zip|muf|mufl)$/.test(en)||(/\.txt$/.test(en)&&looksText(new TextDecoder().decode(b.slice(0,4000))))) await one(e.name.split('/').pop(),b); }catch(err){ notes.push(`${e.name}: ${err.message}`); } } }
      if(songs.length===n0) notes.push(`${name}: no encontré canciones adentro. En Holyrics usa “Exportar” → canciones (.mufl).`); return; }
    if(u[0]===0x52&&u[1]===0x61&&u[2]===0x72) { notes.push(`${name}: es un archivo RAR. Ábrelo con WinRAR o 7-Zip, o mejor exporta las canciones desde Holyrics como .mufl.`); return; }
    if(u[0]===0x37&&u[1]===0x7A) { notes.push(`${name}: es un archivo 7z. Exporta las canciones desde Holyrics como .mufl (Archivo → Exportar).`); return; }
    if(ext==='xml'||u[0]===0x3C||(u[0]===0xEF&&u[3]===0x3C)){ const s=fromXml(new TextDecoder().decode(u)); if(!s.length) notes.push(`${name}: no encontré canciones en el XML.`); songs.push(...s); return; }
    const txt=new TextDecoder().decode(u); if(looksText(txt)||ext==='muf'||ext==='mufl'){ const s=fromText(txt,name.replace(/\.[^.]+$/,'')); if(s.length){ songs.push(...s); return; } }
    notes.push(`${name}: no lo reconozco como archivo de Holyrics.`); };
  for(const f of files){ try{ await one(f.name,await f.arrayBuffer()); }catch(e){ notes.push(`${f.name}: ${e.message||'no se pudo leer'}`); } }
  return {songs,notes}; }

window.Holyrics={EXT,readFiles,fromJava,fromText,looksText,JavaReader};
})();
