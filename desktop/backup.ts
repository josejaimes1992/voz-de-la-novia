/* Copia de seguridad del programa de Windows: todo lo que la iglesia hizo en esta PC
   (alabanzas, programas, usuarios, medios, logo, fondos, audios) en un solo archivo .zip.
   Sirve para cambiar de computadora o recuperar todo si la PC se daña. La Biblia y los Mensajes
   que vienen de la nube no se guardan (se vuelven a bajar solos). */
import { existsSync, readdirSync, statSync, mkdirSync, openSync, writeSync, closeSync, readFileSync, writeFileSync, renameSync, rmSync } from "node:fs";

/* ---------- ZIP sencillo (sin comprimir: las imágenes y audios ya vienen comprimidos) ---------- */
type Entry = { name: string; crc: number; size: number; off: number; time: number; date: number };
function dosTime(d = new Date()) { return { time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() }; }
export class ZipWriter {
  fd: number; off = 0; list: Entry[] = [];
  constructor(path: string) { this.fd = openSync(path, "w"); }
  private w(b: Uint8Array) { writeSync(this.fd, b); this.off += b.length; }
  add(name: string, data: Uint8Array, when?: Date) {
    if (this.off + data.length > 0xFFFF0000) throw new Error("La copia pasa de 4 GB.");
    const nb = new TextEncoder().encode(name); const crc = Bun.hash.crc32(data) >>> 0; const { time, date } = dosTime(when);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, time, true); h.setUint16(12, date, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true);
    h.setUint16(26, nb.length, true); h.setUint16(28, 0, true);
    this.list.push({ name, crc, size: data.length, off: this.off, time, date });
    this.w(new Uint8Array(h.buffer)); this.w(nb); this.w(data);
  }
  close() {
    const start = this.off;
    for (const e of this.list) { const nb = new TextEncoder().encode(e.name); const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
      c.setUint16(12, e.time, true); c.setUint16(14, e.date, true); c.setUint32(16, e.crc, true); c.setUint32(20, e.size, true); c.setUint32(24, e.size, true);
      c.setUint16(28, nb.length, true); c.setUint32(42, e.off, true); this.w(new Uint8Array(c.buffer)); this.w(nb); }
    const end = new DataView(new ArrayBuffer(22)); end.setUint32(0, 0x06054b50, true); end.setUint16(8, this.list.length, true); end.setUint16(10, this.list.length, true);
    end.setUint32(12, this.off - start, true); end.setUint32(16, start, true); this.w(new Uint8Array(end.buffer)); closeSync(this.fd);
  }
}
/* Lee un .zip (sin comprimir o con "deflate", por si alguien lo volvió a comprimir) */
export function readZip(buf: Uint8Array): Map<string, () => Uint8Array> {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength); let e = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 70000); i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error("El archivo no es una copia válida (no es un .zip).");
  const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const out = new Map<string, () => Uint8Array>(); const td = new TextDecoder();
  for (let k = 0; k < n; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error("El .zip está dañado.");
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
    const name = td.decode(buf.subarray(p + 46, p + 46 + nl)); p += 46 + nl + xl + cl;
    const ds = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true);
    out.set(name, () => { const raw = buf.subarray(ds, ds + csize); if (method === 0) return raw; if (method === 8) return Bun.inflateSync(raw); throw new Error("compresión no compatible"); });
  }
  return out;
}

/* ---------- Qué entra en la copia ---------- */
type Dirs = { data: string; brand: string; fondos: string };
const parseJ = (v: any) => typeof v === "string" ? JSON.parse(v) : v;
function walk(dir: string, base = ""): string[] { if (!existsSync(dir)) return []; const out: string[] = [];
  for (const f of readdirSync(dir)) { const full = `${dir}/${f}`; const rel = base ? `${base}/${f}` : f; try { if (statSync(full).isDirectory()) out.push(...walk(full, rel)); else out.push(rel); } catch {} } return out; }

export function backupFolder() {
  const home = (Bun.env.USERPROFILE || Bun.env.HOME || ".").replace(/\\/g, "/");
  const docs = existsSync(`${home}/Documents`) ? `${home}/Documents` : existsSync(`${home}/Documentos`) ? `${home}/Documentos` : home;
  const d = `${docs}/Voz de la Novia/Copias de seguridad`; try { mkdirSync(d, { recursive: true }); } catch {} return d;
}
/* Marca de "cambió algo": la fecha del último cambio en alabanzas, programas, usuarios, etc. */
export async function lastChange(db: any) {
  const a = await db`SELECT max(updated_at) AS m FROM docs WHERE col NOT IN ('sermons', 'libros', 'desktop', 'chat', 'sung')`;
  const b = await db`SELECT max(coalesce(updated_at, created_at)) AS m FROM users`; return Math.max(Number(a[0]?.m) || 0, Number(b[0]?.m) || 0);
}

export async function makeBackup(db: any, D: Dirs, state: any, out: string, meta: any) {
  const local = state?.mode !== "cloud";
  const fromSrc = new Set<string>([...(state?.srcIds || [])]); const srcLibros = new Set<string>([...(state?.srcLibros || [])]);
  const rows = await db`SELECT col, id, data, updated_at FROM docs`;
  /* Mensajes y Material que vienen de la nube no se copian: se vuelven a bajar solos */
  const keepDoc = (r: any) => r.col === "sermons" ? (local && !fromSrc.has(r.id)) : r.col === "libros" ? (local && !srcLibros.has(r.id)) : !["chat"].includes(r.col);
  const docs = rows.filter(keepDoc).map((r: any) => ({ col: r.col, id: r.id, data: parseJ(r.data), updated_at: Number(r.updated_at) }));
  const users = (await db`SELECT * FROM users`).map((u: any) => ({ ...u }));
  const tmp = out + ".part"; const z = new ZipWriter(tmp);
  try {
    const counts: Record<string, number> = {}; for (const d of docs) counts[d.col] = (counts[d.col] || 0) + 1;
    z.add("copia.json", new TextEncoder().encode(JSON.stringify({ app: "voz-de-la-novia-copia", v: 1, at: Date.now(), ...meta, counts, docs, users })));
    const addDir = (label: string, dir: string, filter?: (rel: string) => boolean) => { for (const rel of walk(dir)) { if (filter && !filter(rel)) continue; if (/\.part$|\.tmp$/i.test(rel)) continue; try { z.add(`${label}/${rel}`, new Uint8Array(readFileSync(`${dir}/${rel}`))); } catch {} } };
    addDir("marca", D.brand); addDir("fondos", D.fondos);
    if (local) {
      addDir("medios", `${D.data}/medios`); addDir("audio", `${D.data}/audio`);
      addDir("libros", `${D.data}/libros`, rel => !srcLibros.has(rel.split("/")[0]));
    }
    z.close(); renameSync(tmp, out);
  } catch (e) { try { z.close(); } catch {} try { rmSync(tmp, { force: true }); } catch {} throw e; }
  return { path: out, size: statSync(out).size, docs: docs.length };
}

/* Restaurar: reemplaza alabanzas, programas, usuarios y archivos por los de la copia.
   La Biblia y los Mensajes ya bajados en esta PC se conservan. */
export async function restoreBackup(db: any, D: Dirs, buf: Uint8Array) {
  const z = readZip(buf); const j = z.get("copia.json"); if (!j) throw new Error("Ese archivo no es una copia de Voz de la Novia.");
  const B = JSON.parse(new TextDecoder().decode(j())); if (B.app !== "voz-de-la-novia-copia" || !Array.isArray(B.docs) || !Array.isArray(B.users) || !B.users.length) throw new Error("Ese archivo no es una copia de Voz de la Novia.");
  await db.begin(async (tx: any) => {
    await tx`DELETE FROM docs WHERE col NOT IN ('sermons', 'libros')`;
    for (const d of B.docs) await tx`INSERT INTO docs (col, id, data, updated_at) VALUES (${d.col}, ${d.id}, ${JSON.stringify(d.data)}::jsonb, ${d.updated_at || Date.now()}) ON CONFLICT (col, id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`;
    await tx`DELETE FROM sessions`; await tx`DELETE FROM users`;
    for (const u of B.users) await tx`INSERT INTO users (id, username, name, full_name, role, pass_hash, active, created_at, updated_at, photo) VALUES (${u.id}, ${u.username}, ${u.name}, ${u.full_name || ""}, ${u.role}, ${u.pass_hash}, ${u.active !== false && u.active !== 0}, ${u.created_at || Date.now()}, ${u.updated_at || null}, ${u.photo || null})`;
  });
  let files = 0;
  for (const [name, get] of z) {
    const m = name.match(/^(marca|fondos|medios|audio|libros)\/(.+)$/); if (!m || m[2].split("/").some(s => s === ".." || s === "")) continue;
    const base = m[1] === "marca" ? D.brand : m[1] === "fondos" ? D.fondos : `${D.data}/${m[1]}`; const dest = `${base}/${m[2]}`;
    try { mkdirSync(dest.slice(0, dest.lastIndexOf("/")), { recursive: true }); writeFileSync(dest, get()); files++; } catch {}
  }
  return { docs: B.docs.length, users: B.users.length, files, church: B.church || "", at: B.at };
}
