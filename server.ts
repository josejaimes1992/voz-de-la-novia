// Voz de la Novia — servidor (Bun + Postgres)
import { SQL } from "bun";
import { randomBytes } from "node:crypto";
import { mkdirSync, existsSync, unlinkSync, statSync } from "node:fs";

const db = new SQL(Bun.env.DATABASE_URL!);
await db`CREATE TABLE IF NOT EXISTS docs (
  col text NOT NULL, id text NOT NULL, data jsonb NOT NULL, updated_at bigint NOT NULL,
  PRIMARY KEY (col, id))`;
await db`CREATE TABLE IF NOT EXISTS users (
  id serial PRIMARY KEY, username text UNIQUE NOT NULL, name text NOT NULL, role text NOT NULL,
  pass_hash text NOT NULL, active boolean NOT NULL DEFAULT true, created_at bigint NOT NULL)`;
await db`CREATE TABLE IF NOT EXISTS sessions (
  token text PRIMARY KEY, user_id int NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at bigint NOT NULL)`;
await db`CREATE TABLE IF NOT EXISTS changes (
  id bigserial PRIMARY KEY, at bigint NOT NULL, user_id int, username text NOT NULL, action text NOT NULL,
  col text NOT NULL, doc_id text NOT NULL, title text, before jsonb, after jsonb, seen boolean NOT NULL DEFAULT false)`;
await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name text NOT NULL DEFAULT ''`;
await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS photo text`;
await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at bigint`;
await db`CREATE TABLE IF NOT EXISTS user_log (
  id bigserial PRIMARY KEY, at bigint NOT NULL, actor_id int, actor_name text NOT NULL, target_id int, target_name text NOT NULL,
  action text NOT NULL, detail jsonb NOT NULL DEFAULT '[]'::jsonb)`;
await db`CREATE INDEX IF NOT EXISTS changes_doc ON changes (col, doc_id, at DESC)`;

const SEED: [string, string, Record<string, unknown>][] = [["songs", "ej-santo", {"author": "Reginald Heber · trad. Juan B. Cabrera", "body": "# Estrofa 1\n[D]¡Santo! ¡[Bm]Santo! ¡[G]Santo! [D]Señor omni[A]potente,\n[D]siempre el [Bm]labio [E]mío loo[A]res te da[E]rá[A].\n[D]¡Santo! ¡[Bm]Santo! ¡[G]Santo! te a[D]doro [A]reverente,\n[G]Dios en tres [D]per[Bm]sonas, [D]ben[A]dita Trini[D]dad.\n\n# Estrofa 2\n[D]¡Santo! ¡[Bm]Santo! ¡[G]Santo! en [D]numeroso [A]coro,\n[D]santos esco[Bm]gidos te a[E]doran sin ce[A]sar,\n[D]de alegría [Bm]llenos, y [G]sus co[D]ronas de [A]oro\n[G]rinden ante el [D]tro[Bm]no y el [D]cris[A]talino [D]mar.", "category": "Himno", "ejemplo": true, "key": "D", "notes": "Ejemplo de dominio público. Edítalo o bórralo cuando quieras.", "title": "Santo, Santo, Santo", "updatedAt": 1790866763569}], ["songs", "ej-castillo", {"author": "Martín Lutero · trad. Juan B. Cabrera", "body": "# Estrofa 1\n[C]Castillo fuerte es [G]nuestro [C]Dios,\nde[F]fensa y [G]buen es[C]cudo;\ncon su po[G]der nos [C]libra[F]rá\nen [C]este [G]trance a[C]gudo.\nCon [Am]furia y con a[G]fán\na[C]cósa[F]nos Sa[C]tán;\npor [Am]armas deja [G]ver\nas[C]tucia y [F]gran po[G]der;\n[F]cual él no [C]hay en la [G]tie[C]rra.", "category": "Himno", "ejemplo": true, "key": "C", "notes": "", "title": "Castillo fuerte es nuestro Dios", "updatedAt": 1790866763569}], ["songs", "ej-cristo", {"author": "Anna B. Warner · trad. tradicional", "body": "# Intro\n[G] [C] [D] [G]\n\n# Estrofa\n[G]Cristo me ama, [C]bien lo [G]sé,\nsu pa[G]labra [D]me hace [G]ver,\nque los [G]niños [C]son de A[G]quel,\nquien es [G]nuestro a[D]migo [G]fiel.\n\n# Coro\n[G]Cristo me ama, [C]Cristo me [G]ama,\n[G]Cristo me ama, [D]la Biblia dice a[G]sí.", "category": "Infantil", "ejemplo": true, "key": "G", "notes": "Repetir el coro al final.", "title": "Cristo me ama", "updatedAt": 1790866763569}], ["programs", "ej-prog", {"date": "2026-10-01", "ejemplo": true, "items": [{"key": "G", "note": "", "songId": "ej-cristo"}, {"key": "Eb", "note": "Subir medio tono", "songId": "ej-santo"}, {"key": "C", "note": "Solo estrofa 1", "songId": "ej-castillo"}], "notes": "Programa de ejemplo.", "service": "Servicio de adoración · 10:00", "title": "Culto dominical", "updatedAt": 1790866763569}]];
const [{ n }] = await db`SELECT count(*)::int AS n FROM docs`;
if (n === 0) {
  for (const [col, id, data] of SEED) {
    await db`INSERT INTO docs (col, id, data, updated_at) VALUES (${col}, ${id}, ${JSON.stringify(data)}::jsonb, ${Date.now()}) ON CONFLICT DO NOTHING`;
  }
  console.log("Datos iniciales copiados:", SEED.length);
}

/* Usuarios iniciales: se crean solo si la tabla está vacía */
const [{ u }] = await db`SELECT count(*)::int AS u FROM users`;
if (u === 0) {
  const initial = Bun.env.INITIAL_PASSWORD ?? "";
  if (initial) {
    const hash = await Bun.password.hash(initial);
    const people: [string, string, string][] = [["jose", "JOSE", "admin"], ["jorge", "JORGE", "moderator"], ["jeremias", "JEREMIAS", "moderator"], ["michael", "MICHAEL", "moderator"]];
    for (const [username, name, role] of people) await db`INSERT INTO users (username, name, role, pass_hash, created_at) VALUES (${username}, ${name}, ${role}, ${hash}, ${Date.now()}) ON CONFLICT DO NOTHING`;
    console.log("Usuarios iniciales creados:", people.length);
  }
}

const AUDIO_DIR = Bun.env.AUDIO_DIR ?? "/data/audio";
try { mkdirSync(AUDIO_DIR, { recursive: true }); } catch (e) { console.error("No se pudo crear la carpeta de audios", e); }
const AUDIO_TYPES: Record<string, string> = { "audio/mpeg": "mp3", "audio/mp3": "mp3", "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/aac": "aac", "audio/wav": "wav", "audio/x-wav": "wav", "audio/wave": "wav", "audio/ogg": "ogg", "audio/webm": "webm", "audio/flac": "flac", "audio/x-flac": "flac", "audio/3gpp": "3gp", "audio/amr": "amr" };
const AUDIO_MIME: Record<string, string> = { mp3: "audio/mpeg", m4a: "audio/mp4", aac: "audio/aac", wav: "audio/wav", ogg: "audio/ogg", webm: "audio/webm", flac: "audio/flac", "3gp": "audio/3gpp", amr: "audio/amr" };
const AUDIO_RE = /^[a-f0-9]{24}\.(mp3|m4a|aac|wav|ogg|webm|flac|3gp|amr)$/;
const COLS = new Set(["songs", "programs"]);
const ID_RE = /^[A-Za-z0-9_.:-]{1,80}$/;
const USER_RE = /^[a-z0-9._-]{2,30}$/;
const ROLES = new Set(["admin", "moderator"]);
const attempts = new Map<string, { n: number; t: number }>();
let keyCheck: { ok: boolean; status: number; at: number } | null = null;
type User = { id: number; username: string; name: string; role: string };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}
function parseJ(v: unknown) { return typeof v === "string" ? JSON.parse(v) : v; }
async function currentUser(req: Request): Promise<User | null> {
  const h = req.headers.get("authorization") ?? "";
  if (!h.startsWith("Bearer ") || h.length < 20) return null;
  const rows = await db`SELECT u.id, u.username, u.name, u.role FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ${h.slice(7)} AND u.active = true`;
  return rows[0] ?? null;
}
async function logChange(tx: any, user: User, action: string, col: string, id: string, before: any, after: any) {
  const title = (after?.title ?? before?.title ?? null) as string | null;
  await tx`INSERT INTO changes (at, user_id, username, action, col, doc_id, title, before, after, seen)
           VALUES (${Date.now()}, ${user.id}, ${user.name}, ${action}, ${col}, ${id}, ${title},
                   ${before ? JSON.stringify(before) : null}::jsonb, ${after ? JSON.stringify(after) : null}::jsonb, ${user.role === "admin"})`;
}
async function upsert(tx: any, user: User, col: string, id: string, data: any, action?: string) {
  delete data.id;
  const prev = await tx`SELECT data FROM docs WHERE col = ${col} AND id = ${id}`;
  const before = prev[0] ? parseJ(prev[0].data) : null;
  const now = Date.now();
  data.updatedAt = now; data.updatedBy = user.name;
  if (!before) { data.createdBy = data.createdBy ?? user.name; data.createdAt = data.createdAt ?? now; }
  if (col === "songs") {
    if (before?.audio) data.audio = before.audio; else delete data.audio;
    const sig = (t: unknown) => String(t ?? "").split("\n").map(l => (l.match(/\[[^\]]*\]/g) ?? []).join("")).join("|").replace(/\|+$/, "");
    for (const [field, by] of [["body", "chordsBy"], ["bodyPro", "chordsProBy"]] as const) {
      delete data[by];
      const changed = sig(data[field]) !== sig(before?.[field]);
      if (changed && sig(data[field])) data[by] = user.name;
      else if (before?.[by]) data[by] = before[by];
      else if (!sig(data[field])) delete data[by];
    }
  }
  else { if (before.createdBy) data.createdBy = before.createdBy; if (before.createdAt) data.createdAt = before.createdAt; }
  await tx`INSERT INTO docs (col, id, data, updated_at) VALUES (${col}, ${id}, ${JSON.stringify(data)}::jsonb, ${now})
           ON CONFLICT (col, id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`;
  await logChange(tx, user, action ?? (before ? "update" : "create"), col, id, before, data);
}
/* ---- Papelera: las canciones borradas se guardan 60 días ---- */
const TRASH_DAYS = 60;
async function moveToTrash(tx: any, user: User, col: string, id: string) {
  const prev = await tx`SELECT data FROM docs WHERE col = ${col} AND id = ${id}`;
  if (!prev[0]) return false;
  const item = parseJ(prev[0].data);
  const entry = { col, id, item, title: item.title ?? "", deletedBy: user.name, deletedAt: Date.now() };
  await tx`INSERT INTO docs (col, id, data, updated_at) VALUES ('trash', ${col + ":" + id}, ${JSON.stringify(entry)}::jsonb, ${Date.now()})
           ON CONFLICT (col, id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`;
  await tx`DELETE FROM docs WHERE col = ${col} AND id = ${id}`;
  await logChange(tx, user, "trash", col, id, item, null);
  return true;
}
function removeAudioFiles(item: any) { for (const a of item?.audio ?? []) { try { if (AUDIO_RE.test(a.id)) unlinkSync(`${AUDIO_DIR}/${a.id}`); } catch {} } }
async function purgeTrash() {
  const limit = Date.now() - TRASH_DAYS * 86400_000;
  const old = await db`SELECT id, data FROM docs WHERE col = 'trash' AND (data->>'deletedAt')::bigint < ${limit}`;
  for (const r of old) { removeAudioFiles(parseJ(r.data).item); await db`DELETE FROM docs WHERE col = 'trash' AND id = ${r.id}`; }
  if (old.length) console.log("Papelera: eliminadas definitivamente", old.length);
}
purgeTrash().catch(console.error);
setInterval(() => purgeTrash().catch(console.error), 6 * 3600_000);

function publicUser(u: any) { return { id: u.id, username: u.username, name: u.name, full_name: u.full_name ?? "", photo: u.photo ?? null, role: u.role, active: u.active, created_at: Number(u.created_at) || null, updated_at: Number(u.updated_at) || null }; }
const PHOTO_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const ROLE_ES: Record<string, string> = { admin: "Administrador", moderator: "Moderador" };
function cleanFull(v: unknown) { return String(v ?? "").replace(/\s+/g, " ").trim().slice(0, 80); }
/* Aplica cambios de perfil y devuelve el detalle para el registro */
async function applyUserChanges(target: any, b: any, allowAdminFields: boolean) {
  const detail: { field: string; before?: string; after?: string }[] = [];
  const now = Date.now();
  if (typeof b.full_name === "string") { const v = cleanFull(b.full_name); if (v !== (target.full_name ?? "")) { await db`UPDATE users SET full_name = ${v} WHERE id = ${target.id}`; detail.push({ field: "Nombre completo", before: target.full_name || "", after: v }); } }
  if (b.photo === null && target.photo) { await db`UPDATE users SET photo = NULL WHERE id = ${target.id}`; detail.push({ field: "Foto", before: "con foto", after: "sin foto" }); }
  if (typeof b.photo === "string") { if (b.photo.length > 400_000 || !PHOTO_RE.test(b.photo)) throw new Error("bad_photo"); await db`UPDATE users SET photo = ${b.photo} WHERE id = ${target.id}`; detail.push({ field: "Foto", before: target.photo ? "foto anterior" : "sin foto", after: "foto nueva" }); }
  if (allowAdminFields) {
    if (typeof b.name === "string" && b.name.trim()) { const v = b.name.trim().toUpperCase().slice(0, 40); if (v !== target.name) { await db`UPDATE users SET name = ${v} WHERE id = ${target.id}`; detail.push({ field: "Nombre corto", before: target.name, after: v }); } }
    if (ROLES.has(b.role) && b.role !== target.role) { await db`UPDATE users SET role = ${b.role} WHERE id = ${target.id}`; detail.push({ field: "Rol", before: ROLE_ES[target.role], after: ROLE_ES[b.role] }); }
    if (typeof b.active === "boolean" && b.active !== target.active) { await db`UPDATE users SET active = ${b.active} WHERE id = ${target.id}`; if (!b.active) await db`DELETE FROM sessions WHERE user_id = ${target.id}`; detail.push({ field: "Estado", before: target.active ? "Activo" : "Desactivado", after: b.active ? "Activo" : "Desactivado" }); }
    if (typeof b.password === "string" && b.password) { await db`UPDATE users SET pass_hash = ${await Bun.password.hash(b.password)} WHERE id = ${target.id}`; await db`DELETE FROM sessions WHERE user_id = ${target.id}`; detail.push({ field: "Contraseña", after: "cambiada por el administrador" }); }
  }
  if (detail.length) await db`UPDATE users SET updated_at = ${now} WHERE id = ${target.id}`;
  return detail;
}
async function logUser(actor: User, target: { id: number; name: string }, action: string, detail: unknown[]) {
  await db`INSERT INTO user_log (at, actor_id, actor_name, target_id, target_name, action, detail) VALUES (${Date.now()}, ${actor.id}, ${actor.name}, ${target.id}, ${target.name}, ${action}, ${JSON.stringify(detail)}::jsonb)`;
}

const HTML = await Bun.file(new URL("./public/index.html", import.meta.url)).text();
const LOGO = Bun.file(new URL("./public/logo.jpg", import.meta.url));
const STATIC: Record<string, string> = { "/acordes.js": "text/javascript; charset=utf-8", "/chords.json": "application/json", "/chords-LICENSE.txt": "text/plain; charset=utf-8", "/vdn-logo.jpg": "image/jpeg", "/shalom-logo.jpg": "image/jpeg", "/vdn-icon.png": "image/png", "/proyeccion.js": "text/javascript; charset=utf-8", "/excel.js": "text/javascript; charset=utf-8", "/io.js": "text/javascript; charset=utf-8", "/jszip.min.js": "text/javascript; charset=utf-8", "/equipo.js": "text/javascript; charset=utf-8", "/placer.js": "text/javascript; charset=utf-8", "/himnario.js": "text/javascript; charset=utf-8", "/afinador.js": "text/javascript; charset=utf-8", "/audios.js": "text/javascript; charset=utf-8", "/seleccion.js": "text/javascript; charset=utf-8", "/cifrador.js": "text/javascript; charset=utf-8" };

/* ---- Proyección en vivo: un solo estado compartido, en memoria ---- */
type Proj = { mode: "text" | "black" | "logo"; title: string; text: string; label: string; songId: string | null; programId: string | null; idx: number; total: number; by: string; at: number };
let PROJ: Proj = { mode: "logo", title: "", text: "", label: "", songId: null, programId: null, idx: 0, total: 0, by: "", at: Date.now() };
const PROJ_HTML = Bun.file(new URL("./public/proyector.html", import.meta.url));
const str = (v: unknown, max: number) => String(v ?? "").slice(0, max);


/* ================= Transcripción de letras ================= */
const TR_VERSION = 4;
const TR_INFLIGHT = new Map<string, Promise<{ body: any; status: number }>>();
/* Frases que los modelos de voz "inventan" cuando hay música sin voz clara */
const TR_FAKE = [
  /iglesia de jesucristo de los santos/i, /santos de los [uú]ltimos d[ií]as/i, /amara\.org/i, /subt[ií]tulos? (realizados|por|hechos|de)/i,
  /gracias por (ver|mirar|escuchar|su atenci[oó]n)/i, /suscr[ií]b/i, /dale (like|me gusta)/i, /no olvides/i, /canal de youtube/i,
  /^\W*(m[uú]sica|music|aplausos|risas|instrumental|silencio)\W*$/i, /www\.|\.com\b/i, /transcri(pci[oó]n|to) (por|de)/i,
];
function trIsFake(t: string) { return TR_FAKE.some(r => r.test(t)); }
function trToks(t: string) { return String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9ñ\s]/g, " ").split(/\s+/).filter(w => w.length > 1); }
/* Prepara el audio para la voz: mono 16 kHz, quita graves y agudos que no son voz, iguala el volumen */
/* Prepara el audio para la voz y lo corta en partes de 30 s: los modelos escuchan mucho mejor el canto en partes cortas */
const TR_CHUNK = 30;
async function trPrepare(path: string): Promise<{ dir: string; files: string[] } | null> {
  const dir = `/tmp/tr-${randomBytes(6).toString("hex")}`;
  try {
    mkdirSync(dir, { recursive: true });
    const proc = Bun.spawn(["ffmpeg", "-hide_banner", "-nostdin", "-y", "-i", path, "-vn", "-ac", "1", "-ar", "16000",
      "-af", "highpass=f=80,dynaudnorm=f=250:g=11", "-f", "segment", "-segment_time", String(TR_CHUNK), "-reset_timestamps", "1", "-c:a", "flac", `${dir}/p%03d.flac`], { stdout: "ignore", stderr: "pipe" });
    const code = await proc.exited;
    const files = code === 0 ? [...new Bun.Glob("p*.flac").scanSync(dir)].sort().map(f => `${dir}/${f}`).filter(f => statSync(f).size > 2000) : [];
    if (files.length) return { dir, files };
    console.error("Preparar audio: ffmpeg terminó con", code, await new Response(proc.stderr).text().then(t => t.slice(-300)));
  } catch (e) { console.error("Preparar audio", e); }
  trClean(dir); return null;
}
function trClean(dir: string) { try { for (const f of new Bun.Glob("*").scanSync(dir)) unlinkSync(`${dir}/${f}`); require("node:fs").rmdirSync(dir); } catch {} }
async function trPool<T>(n: number, items: T[], fn: (x: T, i: number) => Promise<any>) {
  const out: any[] = new Array(items.length); let k = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (k < items.length) { const i = k++; out[i] = await fn(items[i], i); } }));
  return out;
}
async function transcribeAudio(o: { song: any; songId: string; audioId: string; entry: any; path: string; mode: string; key: string; cached: any; userName: string }): Promise<{ body: any; status: number }> {
  const { song, songId, audioId, entry, mode, key, cached } = o;
  const base = Bun.env.OPENAI_BASE_URL ?? "https://api.openai.com";
  const known = String(song.body || song.bodyPro || "").replace(/\[[^\]]*\]/g, "").replace(/^#.*$/gm, "").replace(/\s+/g, " ").trim();
  /* Pista: que es una canción cantada (sin temas de iglesia, que hacen inventar frases) */
  const context = known ? `Letra de la canción: ${known}`.slice(0, 800) : "Letra de una canción cantada en español, con estrofas y coros.";
  const fail = (r: Response, t: string) => { console.error("Transcripción falló", r.status, t.slice(0, 300)); return { body: { error: r.status === 401 ? "bad_key" : r.status === 429 ? "quota" : "service" }, status: 502 }; };
  const prep = await trPrepare(o.path);
  const parts = prep ? prep.files : [o.path];
  const offs = parts.map((_, i) => prep ? i * TR_CHUNK : 0);
  let hardFail: any = null;
  try {
    /* 1. Tiempos de cada palabra (whisper-1), parte por parte, descartando lo que no es voz */
    let timing: any = cached && cached.v === TR_VERSION && cached.words ? { words: cached.words, segments: cached.segments, duration: cached.duration, whisperText: cached.whisperText ?? "" } : null;
    if (!timing) {
      let dropped = 0;
      const res = await trPool(4, parts, async (f, i) => {
        const fd = new FormData();
        fd.append("file", Bun.file(f), prep ? `p${i}.flac` : audioId); fd.append("model", "whisper-1"); fd.append("language", "es");
        fd.append("response_format", "verbose_json"); fd.append("timestamp_granularities[]", "word"); fd.append("timestamp_granularities[]", "segment");
        fd.append("prompt", context.slice(0, 600));
        const r = await fetch(`${base}/v1/audio/transcriptions`, { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: fd });
        if (!r.ok) { const t = await r.text(); if (r.status === 401 || r.status === 429) hardFail = fail(r, t); else console.error("whisper parte", i, r.status, t.slice(0, 200)); return null; }
        return r.json();
      });
      if (hardFail) return hardFail;
      const words: any[] = [], segments: any[] = []; let prev = "";
      res.forEach((out: any, i: number) => { if (!out) return; const off = offs[i];
        const segs = (out.segments ?? []).filter((g: any) => {
          const t = String(g.text ?? "").trim(); const n = trToks(t).join(" ");
          const bad = !n || trIsFake(t) || ((g.no_speech_prob ?? 0) > 0.8 && (g.avg_logprob ?? 0) < -0.8) || (g.compression_ratio ?? 0) > 2.6;
          const rep = n && n === prev; if (n) prev = n;
          if (bad) dropped++;
          return !bad && !(rep && (g.end - g.start) < 1);
        });
        for (const g of segs) segments.push({ t: String(g.text ?? "").trim(), s: Math.round((g.start + off) * 100) / 100, e: Math.round((g.end + off) * 100) / 100 });
        for (const w of out.words ?? []) if (segs.some((g: any) => w.start >= g.start - 0.1 && w.start < g.end + 0.1)) words.push({ w: w.word, s: Math.round((w.start + off) * 100) / 100, e: Math.round((w.end + off) * 100) / 100 });
      });
      const dur = prep ? offs[offs.length - 1] + (res[res.length - 1]?.duration ?? TR_CHUNK) : (res[0]?.duration ?? 0);
      timing = { duration: dur || entry.duration || 0, words, segments, whisperText: segments.map((g: any) => g.t).join(" ") };
      console.log("Transcripción whisper:", parts.length, "partes,", segments.length, "segmentos,", words.length, "palabras, descartados", dropped);
    }
    const data: any = { v: TR_VERSION, ...timing, songId, by: o.userName, at: Date.now() };
    if (mode === "full") {
      /* 2. Texto preciso (modelo nuevo), también limpio de frases inventadas */
      let precise = "";
      for (const model of ["gpt-transcribe", "gpt-4o-transcribe"]) {
        let bad = false;
        const texts = await trPool(4, parts, async (f, i) => {
          const fd = new FormData();
          fd.append("file", Bun.file(f), prep ? `p${i}.flac` : audioId); fd.append("model", model); fd.append("prompt", context);
          if (model === "gpt-transcribe") { fd.append("languages[]", "es"); for (const k of ["Dios", "Jesús", "Señor", "Jehová", "Cristo", "Espíritu Santo", "aleluya", "Cordero", "Sion", "Rey de reyes"]) fd.append("keywords[]", k); }
          else fd.append("language", "es");
          const r = await fetch(`${base}/v1/audio/transcriptions`, { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: fd });
          if (r.ok) { const j: any = await r.json(); return String(j.text ?? ""); }
          const t = await r.text(); console.error("Modelo de transcripción", model, "parte", i, r.status, t.slice(0, 200));
          if (r.status === 401 || r.status === 429) hardFail = fail(r, t); else bad = true;
          return "";
        });
        if (hardFail) return hardFail;
        if (bad && texts.every((t: string) => !t)) continue;
        precise = texts.map((t: string) => t.trim()).filter(Boolean).join("\n"); data.preciseModel = model; break;
      }
      precise = precise.split(/(?<=[.!?¡¿\n])\s+/).filter(x => !trIsFake(x)).join(" ").trim();
      data.text = precise || timing.whisperText || "";
      if (trToks(data.text).length < 4) { data.structured = { title: "", model: "", sections: [], empty: true }; }
      else {
        /* 3. Revisión: une las dos versiones, quita lo inventado y ordena estrofas y coros */
        const timed = timing.segments.map((g: any) => `[${g.s.toFixed(1)}] ${g.t}`).join("\n").slice(0, 12000);
        const sys = `Eres un editor experto en letras de alabanzas cristianas en español. Recibes dos transcripciones automáticas e independientes de la MISMA grabación cantada:
A) TEXTO PRECISO: el más confiable para las palabras, pero sin tiempos.
B) SEGMENTOS CON TIEMPO (en segundos): sirven para el orden y los tiempos, pero tienen más errores y a veces frases inventadas.
Tu trabajo es devolver la letra tal como se canta en la grabación.
Reglas:
- La letra sale del TEXTO PRECISO. Una frase que aparece solo en B y no en A probablemente es inventada: descártala.
- Los modelos de voz a veces inventan frases cuando hay música sin voz clara, por ejemplo "La Iglesia de Jesucristo de los Santos de los Últimos Días", "Subtítulos realizados por...", "Gracias por ver", "Suscríbete". Elimina esas frases y cualquier otra que no tenga sentido como letra de la canción.
- Corrige una palabra solo cuando el error es evidente por el sentido de la frase o la rima. No inventes versos, no completes partes que no se oyen y no cambies el estilo.
- Divide en líneas como frases musicales (normalmente de 4 a 10 palabras). Mayúscula al inicio de cada línea y en los nombres de Dios; tildes correctas; sin punto final.
- Agrupa en secciones en el orden en que se cantan, incluidas las repeticiones: "Estrofa I", "Estrofa II", ..., "Pre-coro", "Coro", "Puente", "Final". La parte que se repite con la misma letra es el "Coro".
- Para cada línea pon "start": el segundo en que empieza, tomado del segmento de B que mejor coincide (null si no hay).
- Propón un título corto (normalmente la frase principal del coro).
- Si casi nada se entiende como letra cantada, devuelve "sections": [].
Responde SOLO un JSON: {"title": string, "sections": [{"label": string, "lines": [{"text": string, "start": number|null}]}]}`;
        const userMsg = `TÍTULO CONOCIDO: ${song.title && !song.titleAuto ? song.title : "(desconocido)"}\n\nA) TEXTO PRECISO:\n${data.text.slice(0, 8000)}\n\nB) SEGMENTOS CON TIEMPO:\n${timed || "(ninguno)"}`;
        const pTok = new Set([...trToks(precise), ...trToks(timing.whisperText || "")]);
        for (const model of ["gpt-5", "gpt-5-mini", "gpt-4.1", "gpt-4o-mini"]) {
          const body: any = { model, response_format: { type: "json_object" }, messages: [{ role: "system", content: sys }, { role: "user", content: userMsg }] };
          if (model.startsWith("gpt-5")) body.reasoning_effort = "low";
          const r = await fetch(`${base}/v1/chat/completions`, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
          if (!r.ok) { const t = await r.text(); console.error("Revisión", model, r.status, t.slice(0, 200)); if (r.status === 401 || r.status === 429) break; continue; }
          try {
            const j: any = await r.json(); const st = JSON.parse(j.choices?.[0]?.message?.content ?? "{}");
            if (Array.isArray(st.sections)) {
              /* Control final: cada línea tiene que estar respaldada por el texto preciso */
              const ok = (t: string) => { if (trIsFake(t)) return false; const w = trToks(t); if (!w.length) return false; if (!pTok.size) return true; return w.filter(x => pTok.has(x)).length / w.length >= 0.4; };
              data.structured = { title: String(st.title ?? "").slice(0, 100), model,
                sections: st.sections.slice(0, 40).map((x: any) => ({ label: String(x.label ?? "").slice(0, 40), lines: (Array.isArray(x.lines) ? x.lines : []).slice(0, 40).map((l: any) => ({ text: String(l.text ?? l ?? "").slice(0, 200).trim(), start: l.start != null && Number.isFinite(+l.start) ? +l.start : null })).filter((l: any) => l.text && ok(l.text)) })).filter((x: any) => x.lines.length) };
              if (trIsFake(data.structured.title)) data.structured.title = "";
              if (!data.structured.sections.length) data.structured.empty = true;
              break;
            }
          } catch (e) { console.error("Revisión: respuesta no válida", model); }
        }
      }
    }
    await db`INSERT INTO docs (col, id, data, updated_at) VALUES ('transcripts', ${audioId}, ${JSON.stringify(data)}::jsonb, ${Date.now()})
             ON CONFLICT (col, id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`;
    console.log("Transcripción", mode, songId, audioId, Math.round(data.duration), "s,", (data.text || "").length, "letras de texto,", data.structured ? data.structured.sections.reduce((n: number, x: any) => n + x.lines.length, 0) + " líneas" : "", "por", o.userName, data.structured ? "con revisión " + (data.structured.model || "-") + (data.structured.empty ? " (sin letra clara)" : "") : "sin revisión");
    return { body: data, status: 200 };
  } finally { if (prep) trClean(prep.dir); }
}

const SERVER = Bun.serve({
  maxRequestBodySize: 120 * 1024 * 1024,
  port: Number(Bun.env.PORT ?? 3000),
  async fetch(req, server) {
    const url = new URL(req.url);
    const p = url.pathname;
    try {
      if (p === "/" || p === "/index.html") return new Response(HTML, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" } });
      if (p === "/healthz") return new Response("ok");
      if (p === "/proyector") return new Response(PROJ_HTML, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" } });
      if (p === "/ws/proyector") {
        if (server.upgrade(req)) return undefined as unknown as Response;
        return new Response("Se esperaba WebSocket", { status: 400 });
      }
      if (p === "/api/proyector" && req.method === "GET") return json(PROJ);
      if (p === "/logo.jpg") return new Response(LOGO, { headers: { "content-type": "image/jpeg", "cache-control": "public, max-age=86400" } });
      if (STATIC[p]) return new Response(Bun.file(new URL("./public" + p, import.meta.url)), { headers: { "content-type": STATIC[p], "cache-control": "public, max-age=3600" } });

      const am = p.match(/^\/audio\/([^/]+)$/);
      if (am && (req.method === "GET" || req.method === "HEAD")) {
        if (!AUDIO_RE.test(am[1])) return new Response("No encontrado", { status: 404 });
        const path = `${AUDIO_DIR}/${am[1]}`; if (!existsSync(path)) return new Response("No encontrado", { status: 404 });
        const size = statSync(path).size; const type = AUDIO_MIME[am[1].split(".").pop()!] ?? "application/octet-stream";
        const range = req.headers.get("range"); const file = Bun.file(path);
        const base = { "accept-ranges": "bytes", "content-type": type, "cache-control": "public, max-age=604800, immutable" };
        const rm = range && /^bytes=(\d*)-(\d*)$/.exec(range);
        if (rm) {
          let start = rm[1] ? Number(rm[1]) : size - Number(rm[2]); let end = rm[1] && rm[2] ? Number(rm[2]) : size - 1;
          if (!rm[1] && rm[2]) end = size - 1; start = Math.max(0, start); end = Math.min(size - 1, end);
          if (start > end) return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
          return new Response(req.method === "HEAD" ? null : file.slice(start, end + 1), { status: 206, headers: { ...base, "content-range": `bytes ${start}-${end}/${size}`, "content-length": String(end - start + 1) } });
        }
        return new Response(req.method === "HEAD" ? null : file, { headers: { ...base, "content-length": String(size) } });
      }
      if (p === "/api/data" && req.method === "GET") {
        const rows = await db`SELECT col, id, data FROM docs WHERE col IN ('songs', 'programs')`;
        const out: Record<string, unknown[]> = { songs: [], programs: [] };
        for (const r of rows) if (out[r.col]) out[r.col].push({ ...parseJ(r.data), id: r.id });
        return json(out);
      }

      /* ---- Sesión ---- */
      if (p === "/api/login" && req.method === "POST") {
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? server.requestIP(req)?.address ?? "?";
        const now = Date.now(); const a = attempts.get(ip);
        if (a && now - a.t < 10 * 60_000 && a.n >= 10) return json({ error: "too_many" }, 429);
        const body = await req.json().catch(() => ({}));
        const username = String(body.username ?? "").trim().toLowerCase();
        const rows = USER_RE.test(username) ? await db`SELECT * FROM users WHERE username = ${username} AND active = true` : [];
        const ok = rows[0] && typeof body.password === "string" && await Bun.password.verify(body.password, rows[0].pass_hash);
        if (!ok) {
          attempts.set(ip, { n: a && now - a.t < 10 * 60_000 ? a.n + 1 : 1, t: a && now - a.t < 10 * 60_000 ? a.t : now });
          return json({ error: "bad_login" }, 403);
        }
        attempts.delete(ip);
        const token = randomBytes(32).toString("hex");
        await db`INSERT INTO sessions (token, user_id, created_at) VALUES (${token}, ${rows[0].id}, ${now})`;
        return json({ token, user: publicUser(rows[0]) });
      }
      const user = p.startsWith("/api/") ? await currentUser(req) : null;
      if (p === "/api/proyector" && req.method === "POST") {
        if (!user) return json({ error: "unauthorized" }, 401);
        const b = await req.json().catch(() => ({}));
        const mode = b.mode === "black" || b.mode === "logo" ? b.mode : "text";
        PROJ = { mode, title: str(b.title, 200), text: str(b.text, 4000), label: str(b.label, 60),
          songId: b.songId ? str(b.songId, 80) : null, programId: b.programId ? str(b.programId, 80) : null,
          idx: Number(b.idx) || 0, total: Number(b.total) || 0, by: user.name, at: Date.now() };
        SERVER.publish("proj", JSON.stringify(PROJ));
        return json(PROJ);
      }
      if (p === "/api/me" && req.method === "GET") {
        if (!user) return json({ user: null });
        const r = await db`SELECT * FROM users WHERE id = ${user.id}`; return json({ user: publicUser(r[0]) });
      }
      if (p === "/api/me" && req.method === "PATCH") {
        if (!user) return json({ error: "unauthorized" }, 401);
        const b = await req.json().catch(() => ({}));
        const target = (await db`SELECT * FROM users WHERE id = ${user.id}`)[0];
        let detail; try { detail = await applyUserChanges(target, { full_name: b.full_name, photo: b.photo }, false); } catch { return json({ error: "bad_photo" }, 400); }
        if (detail.length) await logUser(user, target, "profile", detail);
        return json({ user: publicUser((await db`SELECT * FROM users WHERE id = ${user.id}`)[0]) });
      }
      if (p === "/api/team" && req.method === "GET") {
        if (!user) return json({ error: "unauthorized" }, 401);
        const rows = await db`SELECT id, name, full_name, photo, role, active FROM users ORDER BY name`;
        return json({ team: rows.map((u: any) => ({ id: u.id, name: u.name, full_name: u.full_name, photo: u.photo, role: u.role, active: u.active })) });
      }
      if (p === "/api/user-log" && req.method === "GET") {
        if (!user || user.role !== "admin") return json({ error: "forbidden" }, user ? 403 : 401);
        const rows = await db`SELECT id, at, actor_id, actor_name, target_id, target_name, action, detail FROM user_log ORDER BY id DESC LIMIT 150`;
        return json({ log: rows.map((r: any) => ({ ...r, at: Number(r.at), detail: parseJ(r.detail) })) });
      }
      if (p === "/api/logout" && req.method === "POST") {
        const h = req.headers.get("authorization") ?? ""; if (h.startsWith("Bearer ")) await db`DELETE FROM sessions WHERE token = ${h.slice(7)}`;
        return json({ ok: true });
      }
      if (p === "/api/me/password" && req.method === "POST") {
        if (!user) return json({ error: "unauthorized" }, 401);
        const body = await req.json().catch(() => ({}));
        const row = (await db`SELECT pass_hash FROM users WHERE id = ${user.id}`)[0];
        if (typeof body.current !== "string" || !(await Bun.password.verify(body.current, row.pass_hash))) return json({ error: "bad_current" }, 403);
        if (typeof body.password !== "string" || body.password.length < 6) return json({ error: "too_short" }, 400);
        await db`UPDATE users SET pass_hash = ${await Bun.password.hash(body.password)}, updated_at = ${Date.now()} WHERE id = ${user.id}`;
        await logUser(user, user, "password", [{ field: "Contraseña", after: "cambiada por el mismo usuario" }]);
        return json({ ok: true });
      }

      /* ---- Usuarios (solo administrador) ---- */
      if (p === "/api/users") {
        if (!user || user.role !== "admin") return json({ error: "forbidden" }, user ? 403 : 401);
        if (req.method === "GET") return json({ users: (await db`SELECT * FROM users ORDER BY role, name`).map(publicUser) });
        if (req.method === "POST") {
          const b = await req.json().catch(() => ({}));
          const username = String(b.username ?? "").trim().toLowerCase(); const name = String(b.name ?? "").trim().slice(0, 40);
          if (!USER_RE.test(username) || !name || !ROLES.has(b.role) || typeof b.password !== "string" || b.password.length < 6) return json({ error: "bad_user" }, 400);
          const exists = await db`SELECT 1 FROM users WHERE username = ${username}`; if (exists.length) return json({ error: "exists" }, 409);
          const full = cleanFull(b.full_name); const photo = typeof b.photo === "string" && b.photo.length <= 400_000 && PHOTO_RE.test(b.photo) ? b.photo : null;
          const [nu] = await db`INSERT INTO users (username, name, full_name, photo, role, pass_hash, created_at, updated_at) VALUES (${username}, ${name.toUpperCase()}, ${full}, ${photo}, ${b.role}, ${await Bun.password.hash(b.password)}, ${Date.now()}, ${Date.now()}) RETURNING id, name`;
          await logUser(user, nu, "create", [{ field: "Usuario", after: "@" + username }, { field: "Nombre completo", after: full }, { field: "Rol", after: ROLE_ES[b.role] }, ...(photo ? [{ field: "Foto", after: "foto nueva" }] : [])]);
          return json({ ok: true });
        }
      }
      const um = p.match(/^\/api\/users\/(\d+)$/);
      if (um && req.method === "PATCH") {
        if (!user || user.role !== "admin") return json({ error: "forbidden" }, user ? 403 : 401);
        const id = Number(um[1]); const b = await req.json().catch(() => ({}));
        if (id === user.id && (b.active === false || (b.role && b.role !== "admin"))) return json({ error: "self" }, 400);
        if (typeof b.password === "string" && b.password && b.password.length < 6) return json({ error: "too_short" }, 400);
        const target = (await db`SELECT * FROM users WHERE id = ${id}`)[0]; if (!target) return json({ error: "not_found" }, 404);
        let detail; try { detail = await applyUserChanges(target, b, true); } catch { return json({ error: "bad_photo" }, 400); }
        if (detail.length) await logUser(user, { id, name: (b.name && String(b.name).trim().toUpperCase()) || target.name }, "update", detail);
        return json({ ok: true, user: publicUser((await db`SELECT * FROM users WHERE id = ${id}`)[0]) });
      }

      /* ---- Registro de cambios ---- */
      if (p === "/api/changes" && req.method === "GET") {
        if (!user || user.role !== "admin") return json({ error: "forbidden" }, user ? 403 : 401);
        const lim = Math.min(200, Number(url.searchParams.get("limit") ?? 60));
        const rows = await db`SELECT id, at, user_id, username, action, col, doc_id, title, seen FROM changes ORDER BY id DESC LIMIT ${lim}`;
        const [{ unread }] = await db`SELECT count(*)::int AS unread FROM changes WHERE seen = false`;
        return json({ changes: rows, unread });
      }
      if (p === "/api/changes/unread") {
        if (!user || user.role !== "admin") return json({ unread: 0 });
        const [{ unread }] = await db`SELECT count(*)::int AS unread FROM changes WHERE seen = false`;
        return json({ unread });
      }
      if (p === "/api/changes/seen" && req.method === "POST") {
        if (!user || user.role !== "admin") return json({ error: "forbidden" }, 403);
        const b = await req.json().catch(() => ({}));
        if (b.all) await db`UPDATE changes SET seen = true WHERE seen = false`;
        else if (Number.isFinite(b.id)) await db`UPDATE changes SET seen = true WHERE id = ${b.id}`;
        return json({ ok: true });
      }
      const cm = p.match(/^\/api\/changes\/(\d+)$/);
      if (cm && req.method === "GET") {
        if (!user) return json({ error: "unauthorized" }, 401);
        const rows = await db`SELECT * FROM changes WHERE id = ${Number(cm[1])}`;
        if (!rows[0]) return json({ error: "not_found" }, 404);
        return json({ change: { ...rows[0], before: parseJ(rows[0].before), after: parseJ(rows[0].after) } });
      }
      const hm = p.match(/^\/api\/history\/(songs|programs)\/([^/]+)$/);
      if (hm && req.method === "GET") {
        if (!user) return json({ error: "unauthorized" }, 401);
        const rows = await db`SELECT id, at, user_id, username, action, title FROM changes WHERE col = ${hm[1]} AND doc_id = ${decodeURIComponent(hm[2])} ORDER BY id DESC LIMIT 100`;
        return json({ history: rows });
      }

      /* ---- Transcripción de la letra cantada (servicio externo) ---- */
      const tm = p.match(/^\/api\/transcribe\/([A-Za-z0-9_.:-]{1,80})\/([a-f0-9]{24}\.[a-z0-9]+)$/);
      if (tm && req.method === "POST") {
        if (!user) return json({ error: "unauthorized" }, 401);
        const [, songId, audioId] = tm;
        const mode = url.searchParams.get("mode") === "sync" ? "sync" : "full";
        const force = url.searchParams.get("force") === "1";
        const cachedRow = await db`SELECT data FROM docs WHERE col = 'transcripts' AND id = ${audioId}`;
        const cached: any = cachedRow[0] ? parseJ(cachedRow[0].data) : null;
        if (!force && cached && cached.v === TR_VERSION && (mode === "sync" || cached.structured)) return json({ ...cached, cached: true });
        const key = Bun.env.OPENAI_API_KEY ?? "";
        if (!key) return json({ error: "no_key" }, 503);
        const rows = await db`SELECT data FROM docs WHERE col = 'songs' AND id = ${songId}`;
        if (!rows[0]) return json({ error: "not_found" }, 404);
        const song = parseJ(rows[0].data);
        const entry = (song.audio ?? []).find((a: any) => a.id === audioId);
        const path = `${AUDIO_DIR}/${audioId}`;
        if (!entry || !AUDIO_RE.test(audioId) || !existsSync(path)) return json({ error: "no_audio" }, 404);
        /* Si ya se está transcribiendo este audio, espera ese mismo resultado (no se cobra dos veces) */
        const flightKey = audioId + ":" + mode;
        const running = TR_INFLIGHT.get(flightKey);
        if (running) { try { const r = await running; return json(r.body, r.status); } catch { return json({ error: "service" }, 502); } }
        const job = transcribeAudio({ song, songId, audioId, entry, path, mode, key, cached: force ? null : cached, userName: user.name });
        TR_INFLIGHT.set(flightKey, job);
        try { const r = await job; return json(r.body, r.status); }
        catch (e) { console.error("Transcripción: error", e); return json({ error: "service" }, 502); }
        finally { TR_INFLIGHT.delete(flightKey); }
      }
      if (p === "/api/transcribe/status") {
        const key = Bun.env.OPENAI_API_KEY ?? "";
        if (!key) return json({ enabled: false, keyOk: false });
        if (!keyCheck || Date.now() - keyCheck.at > 10 * 60_000) {
          try { const r = await fetch(`${Bun.env.OPENAI_BASE_URL ?? "https://api.openai.com"}/v1/models/whisper-1`, { headers: { Authorization: `Bearer ${key}` } }); keyCheck = { ok: r.ok, status: r.status, at: Date.now() }; }
          catch { keyCheck = { ok: false, status: 0, at: Date.now() }; }
        }
        return json({ enabled: true, keyOk: keyCheck.ok, status: keyCheck.status });
      }

      /* ---- Audios de canciones ---- */
      const au = p.match(/^\/api\/audio\/([A-Za-z0-9_.:-]{1,80})(?:\/([a-f0-9]{24}\.[a-z0-9]+))?$/);
      if (au) {
        if (!user) return json({ error: "unauthorized" }, 401);
        const songId = au[1];
        const rows = await db`SELECT data FROM docs WHERE col = 'songs' AND id = ${songId}`;
        if (!rows[0]) return json({ error: "not_found" }, 404);
        const song = parseJ(rows[0].data);
        if (req.method === "POST" && !au[2]) {
          const type = (req.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
          const ext = AUDIO_TYPES[type]; if (!ext) return json({ error: "bad_type" }, 415);
          const len = Number(req.headers.get("content-length") ?? 0); if (len > 110_000_000) return json({ error: "too_large" }, 413);
          const buf = new Uint8Array(await req.arrayBuffer()); if (buf.length > 110_000_000) return json({ error: "too_large" }, 413); if (buf.length < 100) return json({ error: "empty" }, 400);
          /* Comprime: MP3 mono 64 kbps (se escucha bien en cualquier celular o PC y ocupa ~0,5 MB por minuto) */
          const id = randomBytes(12).toString("hex"); const tmpIn = `/tmp/up-${id}.${ext}`; const tmpOut = `/tmp/up-${id}.mp3`;
          await Bun.write(tmpIn, buf);
          let file = id + "." + ext, size = buf.length, duration = 0;
          try {
            const proc = Bun.spawn(["ffmpeg", "-hide_banner", "-nostdin", "-y", "-i", tmpIn, "-vn", "-map_metadata", "-1", "-ac", "1", "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "64k", tmpOut], { stdout: "ignore", stderr: "pipe" });
            const err = await new Response(proc.stderr).text(); const code = await proc.exited;
            const dm = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(err); if (dm) duration = Math.round(+dm[1] * 3600 + +dm[2] * 60 + +dm[3]);
            if (code === 0 && existsSync(tmpOut)) {
              const outSize = statSync(tmpOut).size;
              if (outSize > 1000 && outSize < buf.length) { file = id + ".mp3"; size = outSize; await Bun.write(`${AUDIO_DIR}/${file}`, Bun.file(tmpOut)); }
            } else if (code !== 0 && !dm) { return json({ error: "bad_audio" }, 415); }
          } catch (e) { console.error("ffmpeg", e); }
          if (file === id + "." + ext) await Bun.write(`${AUDIO_DIR}/${file}`, buf);
          try { unlinkSync(tmpIn); } catch {} try { unlinkSync(tmpOut); } catch {}
          const name = (url.searchParams.get("name") ?? "Audio").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 80) || "Audio";
          const entry = { id: file, name, size, original: buf.length, duration, type: AUDIO_MIME[file.split(".").pop()!], by: user.name, at: Date.now() };
          const after = { ...song, audio: [...(song.audio ?? []), entry], updatedAt: Date.now(), updatedBy: user.name };
          await db.begin(async (tx) => {
            await tx`UPDATE docs SET data = ${JSON.stringify(after)}::jsonb, updated_at = ${Date.now()} WHERE col = 'songs' AND id = ${songId}`;
            await logChange(tx, user, "audio", "songs", songId, song, after);
          });
          return json({ ok: true, audio: entry });
        }
        if (req.method === "DELETE" && au[2]) {
          const entry = (song.audio ?? []).find((a: any) => a.id === au[2]); if (!entry) return json({ error: "not_found" }, 404);
          if (user.role !== "admin" && entry.by !== user.name) return json({ error: "forbidden" }, 403);
          const after = { ...song, audio: (song.audio ?? []).filter((a: any) => a.id !== au[2]), updatedAt: Date.now(), updatedBy: user.name };
          await db.begin(async (tx) => {
            await tx`UPDATE docs SET data = ${JSON.stringify(after)}::jsonb, updated_at = ${Date.now()} WHERE col = 'songs' AND id = ${songId}`;
            await logChange(tx, user, "audio-delete", "songs", songId, song, after);
          });
          try { unlinkSync(`${AUDIO_DIR}/${au[2]}`); } catch {}
          await db`DELETE FROM docs WHERE col = 'transcripts' AND id = ${au[2]}`;
          return json({ ok: true });
        }
        return json({ error: "method" }, 405);
      }

      /* ---- Lectura de PDF con posiciones de palabras (para alinear acordes) ---- */
      if (p === "/api/pdf-words" && req.method === "POST") {
        if (!user) return json({ error: "unauthorized" }, 401);
        const buf = new Uint8Array(await req.arrayBuffer());
        if (buf.length > 40_000_000) return json({ error: "too_large" }, 413);
        if (buf.length < 5 || String.fromCharCode(...buf.slice(0, 5)) !== "%PDF-") return json({ error: "not_pdf" }, 400);
        const tmp = `/tmp/vdn-${randomBytes(8).toString("hex")}`;
        await Bun.write(tmp + ".pdf", buf);
        try {
          const proc = Bun.spawn(["pdftotext", "-bbox-layout", "-enc", "UTF-8", tmp + ".pdf", tmp + ".html"], { stdout: "ignore", stderr: "pipe" });
          const code = await proc.exited;
          if (code !== 0) return json({ error: "pdf_failed" }, 422);
          const x = await Bun.file(tmp + ".html").text();
          const unesc = (t: string) => t.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
          const pages = [...x.matchAll(/<page[^>]*>([\s\S]*?)<\/page>/g)].map(m =>
            [...m[1].matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([\s\S]*?)<\/word>/g)].map(w => [+w[1], +w[2], +w[3], +w[4], unesc(w[5])]));
          return json({ pages });
        } finally {
          await Bun.$`rm -f ${tmp + ".pdf"} ${tmp + ".html"}`.quiet().nothrow();
        }
      }

      /* ---- Papelera ---- */
      if (p.startsWith("/api/trash")) {
        if (!user || user.role !== "admin") return json({ error: "forbidden" }, user ? 403 : 401);
        if (p === "/api/trash" && req.method === "GET") {
          const rows = await db`SELECT id, data FROM docs WHERE col = 'trash' ORDER BY updated_at DESC`;
          return json({ days: TRASH_DAYS, items: rows.map((r: any) => { const d = parseJ(r.data); return { trashId: r.id, col: d.col, id: d.id, title: d.title, deletedBy: d.deletedBy, deletedAt: d.deletedAt, key: d.item?.key ?? "", audio: (d.item?.audio ?? []).length }; }) });
        }
        const b = await req.json().catch(() => ({}));
        const ids: string[] = Array.isArray(b.ids) ? b.ids.filter((x: unknown) => typeof x === "string").slice(0, 500) : [];
        if (p === "/api/trash" && req.method === "POST") {
          let n = 0; await db.begin(async (tx) => { for (const id of ids) if (ID_RE.test(id) && await moveToTrash(tx, user, "songs", id)) n++; });
          return json({ ok: true, count: n });
        }
        if (p === "/api/trash/restore" && req.method === "POST") {
          let n = 0; const conflicts: string[] = [];
          await db.begin(async (tx) => {
            for (const tid of ids) {
              const r = await tx`SELECT data FROM docs WHERE col = 'trash' AND id = ${tid}`; if (!r[0]) continue;
              const d = parseJ(r[0].data); const exists = await tx`SELECT 1 FROM docs WHERE col = ${d.col} AND id = ${d.id}`;
              const newId = exists.length ? d.id + "-r" + randomBytes(3).toString("hex") : d.id; if (exists.length) conflicts.push(d.title);
              await tx`INSERT INTO docs (col, id, data, updated_at) VALUES (${d.col}, ${newId}, ${JSON.stringify(d.item)}::jsonb, ${Date.now()})`;
              await tx`DELETE FROM docs WHERE col = 'trash' AND id = ${tid}`;
              await logChange(tx, user, "untrash", d.col, newId, null, d.item); n++;
            }
          });
          return json({ ok: true, count: n, conflicts });
        }
        if (p === "/api/trash/purge" && req.method === "POST") {
          let n = 0;
          for (const tid of ids) { const r = await db`SELECT data FROM docs WHERE col = 'trash' AND id = ${tid}`; if (!r[0]) continue; removeAudioFiles(parseJ(r[0].data).item); await db`DELETE FROM docs WHERE col = 'trash' AND id = ${tid}`; n++; }
          return json({ ok: true, count: n });
        }
        return json({ error: "not_found" }, 404);
      }

      /* ---- Escritura ---- */
      if (p === "/api/batch" && req.method === "POST") {
        if (!user) return json({ error: "unauthorized" }, 401);
        const text = await req.text();
        if (text.length > 5_000_000) return json({ error: "too_large" }, 413);
        const body = JSON.parse(text);
        const writes = Array.isArray(body?.writes) ? body.writes : null;
        if (!writes || writes.length === 0 || writes.length > 200) return json({ error: "bad_body" }, 400);
        if (body.restore && user.role !== "admin") return json({ error: "forbidden" }, 403);
        for (const w of writes) {
          if (!w || !COLS.has(w.col) || typeof w.id !== "string" || !ID_RE.test(w.id) || !w.data || typeof w.data !== "object" || Array.isArray(w.data)) return json({ error: "bad_write" }, 400);
        }
        await db.begin(async (tx) => { for (const w of writes) await upsert(tx, user, w.col, w.id, { ...w.data }, body.restore ? "restore" : "import"); });
        return json({ ok: true, count: writes.length });
      }
      const m = p.match(/^\/api\/(songs|programs)\/([^/]+)$/);
      if (m) {
        const col = m[1], id = decodeURIComponent(m[2]);
        if (!COLS.has(col) || !ID_RE.test(id)) return json({ error: "bad_path" }, 400);
        if (!user) return json({ error: "unauthorized" }, 401);
        if (req.method === "PUT") {
          const text = await req.text();
          if (text.length > 400_000) return json({ error: "too_large" }, 413);
          const data = JSON.parse(text);
          if (!data || typeof data !== "object" || Array.isArray(data)) return json({ error: "bad_body" }, 400);
          await db.begin(async (tx) => { await upsert(tx, user, col, id, data); });
          return new Response(null, { status: 204 });
        }
        if (req.method === "DELETE") {
          if (col === "songs" && user.role !== "admin") return json({ error: "forbidden" }, 403);
          if (col === "songs") { await db.begin(async (tx) => { await moveToTrash(tx, user, col, id); }); return new Response(null, { status: 204 }); }
          await db.begin(async (tx) => {
            const prev = await tx`SELECT data FROM docs WHERE col = ${col} AND id = ${id}`;
            await tx`DELETE FROM docs WHERE col = ${col} AND id = ${id}`;
            if (prev[0]) await logChange(tx, user, "delete", col, id, parseJ(prev[0].data), null);
          });
          return new Response(null, { status: 204 });
        }
        return json({ error: "method" }, 405);
      }
      return json({ error: "not_found" }, 404);
    } catch (e) {
      console.error(e);
      return json({ error: "server" }, 500);
    }
  },
  websocket: {
    idleTimeout: 60,
    sendPings: true,
    open(ws) { ws.subscribe("proj"); ws.send(JSON.stringify(PROJ)); },
    message(ws, msg) { if (msg === "ping") ws.send("pong"); },
    close(ws) { ws.unsubscribe("proj"); },
  },
});
console.log("Voz de la Novia escuchando en", Bun.env.PORT ?? 3000);
