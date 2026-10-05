/* Voz de la Novia — Mensajes (sermones) del hermano William Branham
   Se importan desde archivos que sube el equipo (PDF o texto). Se guardan en la base de datos,
   no en el repositorio, y solo se entregan a usuarios con sesión. */
import { randomBytes } from "node:crypto";
import { unlinkSync } from "node:fs";

export type Sermon = { id: string; code: string; title: string; date: string; place?: string; paras: { n: string; t: string }[]; by?: string; at?: number; file?: string };

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const CODE_RE = /\b(\d{2})-(\d{4})([A-Za-z]{0,2})\b/;

/* Texto plano de un PDF */
export async function pdfText(buf: Uint8Array): Promise<string | null> {
  const tmp = `/tmp/vdn-ser-${randomBytes(8).toString("hex")}`;
  await Bun.write(tmp + ".pdf", buf);
  try {
    const proc = Bun.spawn(["pdftotext", "-enc", "UTF-8", tmp + ".pdf", tmp + ".txt"], { stdout: "ignore", stderr: "pipe" });
    if ((await proc.exited) !== 0) return null;
    return await Bun.file(tmp + ".txt").text();
  } finally { for (const e of [".pdf", ".txt"]) { try { unlinkSync(tmp + e); } catch {} } }
}

/* Convierte el texto de un sermón en párrafos numerados */
export function parseSermon(raw: string, fileName: string): Sermon | null {
  const clean0 = raw.replace(/\r/g, "").replace(/\u00ad/g, "");
  /* Quita encabezados y pies de página: solo las primeras y últimas líneas de cada página que se repiten en muchas páginas */
  const pages = clean0.split("\f").map(pg => pg.split("\n").map(l => l.replace(/\s+/g, " ").trim()));
  const keyOf = (l: string) => l.replace(/\d+/g, "#");
  const edgesOf = (pg: string[]) => { const ne = pg.filter(Boolean); return new Set([...ne.slice(0, 2), ...ne.slice(-2)]); };
  const edge = new Map<string, number>();
  for (const pg of pages) for (const k of new Set([...edgesOf(pg)].map(keyOf))) edge.set(k, (edge.get(k) ?? 0) + 1);
  const many = Math.max(3, Math.floor(pages.length * 0.3));
  const lines: string[] = [];
  for (const pg of pages) { const ed = edgesOf(pg);
    for (const l of pg) { if (l && ed.has(l) && l.length < 100 && ((pages.length >= 3 && (edge.get(keyOf(l)) ?? 0) >= many && !/^\d{1,4}\s+\S.{40,}/.test(l)) || /^\d{1,3}$/.test(l) || /^(página|pagina|page)\s*\d+/i.test(l))) continue; lines.push(l); } }
  const text = lines.join("\n");

  /* Código (p. ej. 65-1125) y título */
  const head = lines.slice(0, 60).join("\n");
  const cm = fileName.match(CODE_RE) || head.match(CODE_RE);
  const code = cm ? `${cm[1]}-${cm[2]}${(cm[3] || "").toUpperCase()}` : "";
  let title = fileName.replace(/\.[a-z0-9]+$/i, "").replace(CODE_RE, "").replace(/^(es|spa|span|sp)[-_ ]+/i, "").replace(/[_]+/g, " ").replace(/^[\s\-–·.]+|[\s\-–·.]+$/g, "").trim();
  const words = title.split(/\s+/).filter(w => /[a-záéíóúñ]{2,}/i.test(w)).length;
  if (!title || words < 2) {
    const cand = lines.slice(0, 25).find(l => l.length >= 4 && l.length <= 80 && /[a-záéíóúñ]/i.test(l) && !CODE_RE.test(l) && !/^\d/.test(l) && !/william|branham|palabra hablada|spoken word|voice of god|la voz de dios/i.test(l));
    if (cand) { const i = lines.indexOf(cand); let t = cand; const nx = lines[i + 1] || ""; if (cand === cand.toUpperCase() && nx && nx === nx.toUpperCase() && /[A-ZÁÉÍÓÚÑ]{3}/.test(nx) && !CODE_RE.test(nx) && nx.length <= 80) t += " " + nx; title = t; }
    else title = title || code || fileName;
  }
  if (title === title.toUpperCase() || /^(\S+ )+\S+$/.test(title) && title.split(" ").every(w => /^[A-ZÁÉÍÓÚÑ¿¡"“(]/.test(w))) {
    const SMALL = new Set(["de", "del", "la", "las", "el", "los", "y", "e", "en", "es", "a", "al", "un", "una", "que", "por", "para", "con", "o", "su", "sus", "lo"]);
    title = title.toLowerCase().split(" ").map((w, i) => i > 0 && SMALL.has(w) ? w : w.replace(/^([¿¡"“(]*)([a-záéíóúñ])/, (_, a, b) => a + b.toUpperCase())).join(" ");
  }

  /* Párrafos: líneas que empiezan con el número siguiente (1, 2, 3… o E-1, E-2…) */
  const paras: { n: string; t: string }[] = []; let expect = 1; let cur: { n: string; t: string } | null = null; let pre: string[] = [];
  for (const l of lines) {
    if (!l) { continue; }
    const m = l.match(/^(?:E-)?(\d{1,4})[.)]?\s+(\S.*)$/);
    if (m && +m[1] === expect) { cur = { n: m[1], t: m[2] }; paras.push(cur); expect++; continue; }
    if (cur) cur.t = cur.t.endsWith("-") && /^[a-záéíóúñ]/.test(l) ? cur.t.slice(0, -1) + l : cur.t + " " + l;
    else pre.push(l);
  }
  let out = paras;
  if (out.length < 5) {
    /* Sin numeración: por bloques separados por renglón vacío */
    const blocks = text.split(/\n\s*\n/).map(b => b.replace(/\s+/g, " ").trim()).filter(b => b.length > 40);
    out = blocks.map((t, i) => ({ n: String(i + 1), t }));
  }
  out = out.map(p => ({ n: p.n, t: p.t.replace(/\s+([,.;:!?])/g, "$1").replace(/\s{2,}/g, " ").trim() })).filter(p => p.t);
  if (out.length < 3) return null;
  const date = code ? `19${code.slice(0, 2)}-${code.slice(3, 5)}-${code.slice(5, 7)}` : "";
  const id = (code || norm(title).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || randomBytes(4).toString("hex")) + (code && /[A-Z]$/.test(code) ? "" : "");
  return { id, code, title: title.slice(0, 160), date, paras: out };
}

/* Índice en memoria para buscar rápido en todos los mensajes */
type Idx = { id: string; code: string; title: string; place: string; tn: string; paras: { n: string; t: string; nt: string }[] };
let INDEX: Idx[] | null = null;
let EPOCH = 0;
export function resetIndex() { INDEX = null; EPOCH++; }
export const sermonEpoch = () => EPOCH;
export async function sermonsAll(db: any) { return index(db); }
async function index(db: any): Promise<Idx[]> {
  if (INDEX) return INDEX;
  const rows = await db`SELECT id, data FROM docs WHERE col = 'sermons'`;
  INDEX = rows.map((r: any) => { const d = typeof r.data === "string" ? JSON.parse(r.data) : r.data;
    return { id: r.id, code: d.code || "", title: d.title || "", place: d.place || "", tn: norm(`${d.code} ${d.title} ${d.place || ""}`), paras: (d.paras || []).map((p: any) => ({ n: p.n, t: p.t, nt: norm(p.t) })) }; });
  INDEX.sort((a, b) => a.code.localeCompare(b.code) || a.title.localeCompare(b.title, "es"));
  return INDEX;
}
export async function sermonList(db: any) { return (await index(db)).map(s => ({ id: s.id, code: s.code, title: s.title, place: s.place, n: s.paras.length })); }
export async function sermonSearch(db: any, q: string) {
  const toks = norm(q).split(/[^a-z0-9ñ-]+/).filter(t => t.length > 1); if (!toks.length) return { titles: [], paras: [] };
  const all = await index(db); const phrase = toks.join(" ");
  const titles = all.filter(s => toks.every(t => s.tn.includes(t))).slice(0, 30).map(s => ({ id: s.id, code: s.code, title: s.title, place: s.place, n: s.paras.length }));
  const paras: any[] = [];
  for (const s of all) for (const p of s.paras) {
    if (!toks.every(t => p.nt.includes(t))) continue;
    const exact = p.nt.includes(phrase);
    const i = Math.max(0, p.nt.indexOf(exact ? phrase : toks[0]) - 70);
    paras.push({ id: s.id, code: s.code, title: s.title, n: p.n, exact, snip: (i > 0 ? "…" : "") + p.t.slice(i, i + 220) + (p.t.length > i + 220 ? "…" : "") });
    if (paras.length >= 400) break;
  }
  paras.sort((a, b) => (b.exact ? 1 : 0) - (a.exact ? 1 : 0));
  return { titles, paras: paras.slice(0, 80), more: paras.length > 80 };
}

/* ---------- Catálogo público de mensajes (código → título y ciudad) ---------- */
type Meta = { title: string; place: string };
let CAT: { at: number; map: Map<string, Meta> } | null = null;
const fixCase = (t: string) => String(t || "").replace(/\s+/g, " ").trim();
async function catalog(): Promise<Map<string, Meta>> {
  if (CAT && Date.now() - CAT.at < 24 * 3600_000) return CAT.map;
  const r = await fetch("https://tabernaculozoe.org/dove/controller/list_by_date.php", { method: "POST", headers: { "user-agent": "Mozilla/5.0", "content-type": "application/x-www-form-urlencoded", "x-requested-with": "XMLHttpRequest" }, body: "" });
  const d: any = await r.json(); const map = new Map<string, Meta>();
  for (const x of d?.resultado ?? []) { const code = String(x.Date || "").trim().toUpperCase(); if (!/^\d{2}-\d{4}/.test(code) || code.startsWith("00-")) continue;
    const m = { title: fixCase(x.Title), place: fixCase(x.Lugar).replace(/^-$/, "") }; if (!map.has(code)) map.set(code, m); }
  CAT = { at: Date.now(), map }; return map;
}
export async function metaFor(code: string): Promise<Meta | null> {
  if (!code) return null; const map = await catalog(); const c = code.toUpperCase();
  if (map.has(c)) return map.get(c)!;
  const base = c.slice(0, 7); const alts = [...map.keys()].filter(k => k.startsWith(base));
  if (alts.length === 1) return map.get(alts[0])!;
  const suf = c.slice(7); const swap: Record<string, string> = { A: "E", E: "A", M: "M", B: "B" };
  if (suf && alts.includes(base + (swap[suf] || ""))) return null;
  return null;
}
/* Nombre que no es un título: empieza en minúscula, es parte de una frase, o está vacío */
export function badTitle(t: string, code: string) {
  const s = String(t || "").trim(); if (!s || s === code || !/[a-záéíóúñ]{3}/i.test(s)) return true;
  if (/^[a-záéíóúñ]/.test(s)) return true; if (s.split(/\s+/).length > 12) return true;
  if (/^(muy|y|que|estaba|bueno|gracias|amén|amen|hermano|hermanos|buenas|buenos)\b/i.test(s)) return true;
  return /[,;]\s*\w+\s*$/.test(s) && s.split(/\s+/).length > 7;
}
export async function syncSermonMeta(db: any) {
  const map = await catalog(); const rows = await db`SELECT id, data FROM docs WHERE col = 'sermons'`; let places = 0, titles = 0, missing: string[] = [];
  for (const r of rows) { const d = typeof r.data === "string" ? JSON.parse(r.data) : r.data; if (!d.code) continue;
    const m = await metaFor(d.code); if (!m) { missing.push(d.code); continue; } let ch = false;
    if (m.place && d.place !== m.place) { d.place = m.place; places++; ch = true; }
    if (m.title && !d.editedBy && badTitle(d.title, d.code)) { d.titleOld = d.title; d.title = m.title; titles++; ch = true; }
    if (ch) await db`UPDATE docs SET data = ${JSON.stringify(d)}::jsonb, updated_at = ${Date.now()} WHERE col = 'sermons' AND id = ${r.id}`; }
  resetIndex(); return { catalog: map.size, sermons: rows.length, places, titles, missing: missing.slice(0, 20), missingCount: missing.length };
}
