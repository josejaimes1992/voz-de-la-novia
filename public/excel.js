/* Voz de la Novia — Excel de datos de canciones (tono, tipo de alabanza, compositor). Solo equipo. */
"use strict";
const XL_TIPOS=['Adoración','Júbilo','Alabanza','Himno','Ofrenda','Santa Cena','Bautismo','Infantil','Navidad','Semana Santa'];
const XL_COLS=['Título','Tono','Tipo de alabanza','Compositor','ID (no cambiar)'];
const XL={changes:[],errors:[],notFound:0};

function xlEsc(s){ return String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,''); }
function xlCol(i){ let s=''; i++; while(i>0){ const m=(i-1)%26; s=String.fromCharCode(65+m)+s; i=Math.floor((i-1)/26); } return s; }
function xlKeyOut(k){ return k?keyLabel(k.idx,k.minor,true):''; }
function xlKeyList(){ const out=[]; for(let i=0;i<12;i++) out.push(keyLabel(i,false,true)); for(let i=0;i<12;i++) out.push(keyLabel(i,true,true)); return out; }

async function xlExport(){
  if(!S.canWrite) return; await ioZip();
  const songs=[...S.songs.values()].sort((a,b)=>a.title.localeCompare(b.title,'es'));
  const cell=(r,c,v,st)=>`<c r="${xlCol(c)}${r}" t="inlineStr"${st?` s="${st}"`:''}><is><t xml:space="preserve">${xlEsc(v)}</t></is></c>`;
  let rows=`<row r="1">${XL_COLS.map((h,c)=>cell(1,c,h,1)).join('')}</row>`;
  songs.forEach((s,i)=>{ const r=i+2; rows+=`<row r="${r}">${[s.title,xlKeyOut(songKey(s)),s.category||'',s.author||''].map((v,c)=>cell(r,c,v)).join('')}${cell(r,4,s.id,2)}</row>`; });
  const last=songs.length+1;
  const sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<cols><col min="1" max="1" width="52" customWidth="1"/><col min="2" max="2" width="10" customWidth="1"/><col min="3" max="3" width="20" customWidth="1"/><col min="4" max="4" width="34" customWidth="1"/><col min="5" max="5" width="22" customWidth="1"/></cols>
<sheetData>${rows}</sheetData>
<autoFilter ref="A1:E${last}"/>
<dataValidations count="2">
<dataValidation type="list" errorStyle="warning" allowBlank="1" showErrorMessage="1" errorTitle="Tono" error="Usa un tono como Do, Re, Mim, Sol, Fa#m…" sqref="B2:B${last+500}"><formula1>"${xlKeyList().join(',')}"</formula1></dataValidation>
<dataValidation type="list" errorStyle="warning" allowBlank="1" showErrorMessage="1" errorTitle="Tipo de alabanza" error="Ese tipo no está en la lista; se guardará igual." sqref="C2:C${last+500}"><formula1>"${XL_TIPOS.join(',')}"</formula1></dataValidation>
</dataValidations>
</worksheet>`;
  const z=new JSZip();
  z.file('[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`);
  z.file('_rels/.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  z.file('xl/workbook.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Canciones" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">Canciones!$A$1:$E$${last}</definedName></definedNames></workbook>`);
  z.file('xl/_rels/workbook.xml.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  z.file('xl/styles.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><sz val="9"/><color rgb="FF999999"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1A1914"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>`);
  z.file('xl/worksheets/sheet1.xml',sheet);
  const blob=await z.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',compression:'DEFLATE'});
  const d=new Date(); const name=`voz-de-la-novia-canciones-${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}.xlsx`;
  const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),60000);
  toast(`Excel descargado con ${songs.length} canciones.`);
}

/* Lee la primera hoja de un .xlsx y devuelve filas como arreglos de texto */
async function xlRead(file){
  const z=await JSZip.loadAsync(file); const P=new DOMParser();
  const xml=async p=>{ const f=z.file(p); return f?P.parseFromString(await f.async('string'),'application/xml'):null; };
  const tx=(el)=>[...el.getElementsByTagName('t')].map(t=>t.textContent).join('');
  let sheetPath='xl/worksheets/sheet1.xml';
  const wb=await xml('xl/workbook.xml'), rels=await xml('xl/_rels/workbook.xml.rels');
  if(wb&&rels){ const sh=wb.getElementsByTagName('sheet')[0]; const rid=sh&&(sh.getAttribute('r:id')||sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id'));
    const rel=[...rels.getElementsByTagName('Relationship')].find(r=>r.getAttribute('Id')===rid);
    if(rel){ const t=rel.getAttribute('Target'); sheetPath=t.startsWith('/')?t.slice(1):'xl/'+t.replace(/^\.\//,''); } }
  const ssx=await xml('xl/sharedStrings.xml'); const ss=ssx?[...ssx.getElementsByTagName('si')].map(tx):[];
  const sh=await xml(sheetPath); if(!sh) throw new Error('nosheet');
  const rows=[];
  for(const r of sh.getElementsByTagName('row')){
    const row=[];
    for(const c of r.getElementsByTagName('c')){
      const ref=c.getAttribute('r')||''; const L=(ref.match(/^[A-Z]+/)||[''])[0];
      let ci=0; for(const ch of L) ci=ci*26+(ch.charCodeAt(0)-64); ci--; if(ci<0) ci=row.length;
      const t=c.getAttribute('t'); const v=c.getElementsByTagName('v')[0];
      let val='';
      if(t==='s') val=ss[Number(v&&v.textContent)]??''; else if(t==='inlineStr'){ const is=c.getElementsByTagName('is')[0]; val=is?tx(is):''; } else val=v?v.textContent:'';
      row[ci]=String(val).trim();
    }
    rows.push(row);
  }
  return rows;
}

async function xlImport(file){
  let rows; try{ await ioZip(); rows=await xlRead(file); }catch{ toast('No se pudo leer el archivo. Debe ser el Excel (.xlsx) descargado desde aquí.'); return; }
  const head=(rows[0]||[]).map(h=>norm(h||''));
  const idx=name=>head.findIndex(h=>h.startsWith(norm(name)));
  const cT=idx('Título'), cK=idx('Tono'), cC=idx('Tipo'), cA=idx('Compositor'), cI=idx('ID');
  if(cT<0||cI<0){ toast('El Excel no tiene las columnas Título e ID. Descarga el Excel de nuevo y edítalo.'); return; }
  const byTitle=new Map(); for(const s of S.songs.values()){ const k=norm(s.title); byTitle.set(k,byTitle.has(k)?null:s); }
  XL.changes=[]; XL.errors=[]; XL.notFound=0;
  rows.slice(1).forEach((r,i)=>{
    const line=i+2; const id=(r[cI]||'').trim(); const title=(r[cT]||'').trim();
    if(!id&&!title) return;
    const s=S.songs.get(id)||(title?byTitle.get(norm(title)):null);
    if(!s){ XL.notFound++; return; }
    const ch={};
    if(title&&title!==s.title) ch.title=title;
    if(cK>=0&&r[cK]){ const k=parseKey(r[cK]); if(!k) XL.errors.push(`Fila ${line} (${s.title}): el tono “${r[cK]}” no se entiende; no se cambió.`); else { const canon=keyCanon(k.idx,k.minor); const cur=songKey(s); if(!cur||keyCanon(cur.idx,cur.minor)!==canon) ch.key=canon; } }
    if(cC>=0&&r[cC]){ const v=XL_TIPOS.find(t=>norm(t)===norm(r[cC]))||r[cC].trim(); if(v!==(s.category||'')) ch.category=v; }
    if(cA>=0&&r[cA]&&r[cA]!==(s.author||'')) ch.author=r[cA];
    if(Object.keys(ch).length) XL.changes.push({song:s,ch});
  });
  xlPreview();
}

function xlPreview(){
  const n=XL.changes.length;
  const lab={title:'Título',key:'Tono',category:'Tipo',author:'Compositor'};
  const show=(f,v)=>f==='key'?xlKeyOut(parseKey(v)):v;
  $('#modal-root').innerHTML=`<div class="scrim" data-act="close-modal"><div class="modal" role="dialog" aria-label="Revisar cambios del Excel" data-stop style="width:min(720px,100%)">
    <header><h3>Cambios del Excel</h3><button class="btn ghost" data-act="close-modal" aria-label="Cerrar">${ICON.x}</button></header>
    <div class="body" style="display:grid;gap:12px">
      <p style="margin:0">${n?`<b>${n} ${n===1?'canción cambia':'canciones cambian'}.</b> Revisa y pulsa “Guardar cambios”.`:'<b>No hay cambios.</b> El Excel tiene los mismos datos que la app.'}${XL.notFound?` <span style="color:var(--muted)">${XL.notFound} ${XL.notFound===1?'fila no coincide':'filas no coinciden'} con ninguna canción y se ignoran.</span>`:''}</p>
      ${XL.errors.length?`<div class="banner" style="display:grid;gap:4px">${XL.errors.slice(0,30).map(e=>`<span>${esc(e)}</span>`).join('')}${XL.errors.length>30?`<span>…y ${XL.errors.length-30} más.</span>`:''}</div>`:''}
      ${n?`<div style="max-height:52vh;overflow:auto;border:1px solid var(--line);border-radius:8px">${XL.changes.map(({song,ch})=>`<div style="padding:8px 12px;border-bottom:1px solid var(--line)"><b>${esc(song.title)}</b>${Object.entries(ch).map(([f,v])=>`<div style="font-size:13px"><span style="color:var(--muted)">${lab[f]}:</span> <s style="color:var(--muted)">${esc(show(f,song[f]||'')||'vacío')}</s> → <b style="color:var(--accent)">${esc(show(f,v))}</b></div>`).join('')}</div>`).join('')}</div>
      <div class="actions"><button class="btn pri" data-act="xl-apply">Guardar cambios</button><span id="xl-prog" style="font-size:13px;color:var(--muted)"></span></div>`:''}
      <p style="margin:0;font-size:13px;color:var(--muted)">Las celdas vacías no borran nada: la canción conserva lo que ya tenía.</p>
    </div></div></div>`;
}

async function xlApply(){
  const btn=$('[data-act="xl-apply"]'); if(btn) btn.disabled=true;
  const writes=XL.changes.map(({song,ch})=>{ const d={...song,...ch}; delete d.id; return {col:'songs',id:song.id,data:d}; });
  let done=0;
  for(let i=0;i<writes.length;i+=50){
    try{ await api('/api/batch',{method:'POST',body:JSON.stringify({writes:writes.slice(i,i+50)})}); done+=Math.min(50,writes.length-i); const p=$('#xl-prog'); if(p) p.textContent=`Guardadas ${done} de ${writes.length}…`; }
    catch(e){ if(e.code===401){ closeModal(); lostAuth(); return; } toast(`Se guardaron ${done}; el resto falló. Sube el Excel otra vez.`); if(btn) btn.disabled=false; lastSig=''; await loadData(); return; }
  }
  closeModal(); lastSig=''; await loadData(); toast(`${done} ${done===1?'canción actualizada':'canciones actualizadas'} desde Excel.`);
}

function openExcel(){
  if(!S.canWrite) return;
  $('#modal-root').innerHTML=`<div class="scrim" data-act="close-modal"><div class="modal" role="dialog" aria-label="Excel" data-stop style="width:min(520px,100%)">
    <header><h3>Excel de canciones</h3><button class="btn ghost" data-act="close-modal" aria-label="Cerrar">${ICON.x}</button></header>
    <div class="body" style="display:grid;gap:10px">
      <p style="margin:0;color:var(--muted)">Descarga la lista, completa en Excel el tono, el tipo de alabanza y el compositor (también puedes corregir títulos), y súbela de nuevo.</p>
      <button class="exp" data-act="xl-export"><b>1. Descargar Excel</b><span>Todas las canciones (${S.songs.size}) con Título, Tono, Tipo de alabanza y Compositor. No cambies la columna ID.</span></button>
      <label class="exp" style="cursor:pointer"><b>2. Subir Excel corregido</b><span>Antes de guardar verás la lista de cambios para revisarla.</span><input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" data-xl-up hidden></label>
    </div></div></div>`;
}

document.addEventListener('click',ev=>{
  const el=ev.target.closest('[data-act]'); if(!el) return;
  switch(el.dataset.act){
    case 'open-excel': openExcel(); break;
    case 'xl-export': xlExport(); break;
    case 'xl-apply': xlApply(); break;
  }
});
document.addEventListener('change',ev=>{ const f=ev.target.closest&&ev.target.closest('[data-xl-up]'); if(f&&f.files&&f.files[0]){ const file=f.files[0]; f.value=''; xlImport(file); } });
