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

function publicUser(u: any) { return { id: u.id, username: u.username, name: u.name, role: u.role, active: u.active }; }

const HTML = await Bun.file(new URL("./public/index.html", import.meta.url)).text();
const LOGO = Bun.file(new URL("./public/logo.jpg", import.meta.url));
const STATIC: Record<string, string> = { "/acordes.js": "text/javascript; charset=utf-8", "/chords.json": "application/json", "/chords-LICENSE.txt": "text/plain; charset=utf-8", "/vdn-logo.jpg": "image/jpeg", "/vdn-icon.png": "image/png", "/io.js": "text/javascript; charset=utf-8", "/jszip.min.js": "text/javascript; charset=utf-8", "/equipo.js": "text/javascript; charset=utf-8", "/placer.js": "text/javascript; charset=utf-8", "/himnario.js": "text/javascript; charset=utf-8", "/afinador.js": "text/javascript; charset=utf-8", "/audios.js": "text/javascript; charset=utf-8", "/seleccion.js": "text/javascript; charset=utf-8" };

Bun.serve({
  maxRequestBodySize: 120 * 1024 * 1024,
  port: Number(Bun.env.PORT ?? 3000),
  async fetch(req, server) {
    const url = new URL(req.url);
    const p = url.pathname;
    try {
      if (p === "/" || p === "/index.html") return new Response(HTML, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" } });
      if (p === "/healthz") return new Response("ok");
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
      if (p === "/api/me") return json({ user: user ? { ...user } : null });
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
        await db`UPDATE users SET pass_hash = ${await Bun.password.hash(body.password)} WHERE id = ${user.id}`;
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
          await db`INSERT INTO users (username, name, role, pass_hash, created_at) VALUES (${username}, ${name}, ${b.role}, ${await Bun.password.hash(b.password)}, ${Date.now()})`;
          return json({ ok: true });
        }
      }
      const um = p.match(/^\/api\/users\/(\d+)$/);
      if (um && req.method === "PATCH") {
        if (!user || user.role !== "admin") return json({ error: "forbidden" }, user ? 403 : 401);
        const id = Number(um[1]); const b = await req.json().catch(() => ({}));
        if (id === user.id && (b.active === false || (b.role && b.role !== "admin"))) return json({ error: "self" }, 400);
        if (typeof b.name === "string" && b.name.trim()) await db`UPDATE users SET name = ${b.name.trim().slice(0, 40)} WHERE id = ${id}`;
        if (ROLES.has(b.role)) await db`UPDATE users SET role = ${b.role} WHERE id = ${id}`;
        if (typeof b.active === "boolean") { await db`UPDATE users SET active = ${b.active} WHERE id = ${id}`; if (!b.active) await db`DELETE FROM sessions WHERE user_id = ${id}`; }
        if (typeof b.password === "string") { if (b.password.length < 6) return json({ error: "too_short" }, 400); await db`UPDATE users SET pass_hash = ${await Bun.password.hash(b.password)} WHERE id = ${id}`; await db`DELETE FROM sessions WHERE user_id = ${id}`; }
        return json({ ok: true });
      }

      /* ---- Registro de cambios ---- */
      if (p === "/api/changes" && req.method === "GET") {
        if (!user || user.role !== "admin") return json({ error: "forbidden" }, user ? 403 : 401);
        const lim = Math.min(200, Number(url.searchParams.get("limit") ?? 60));
        const rows = await db`SELECT id, at, username, action, col, doc_id, title, seen FROM changes ORDER BY id DESC LIMIT ${lim}`;
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
        const rows = await db`SELECT id, at, username, action, title FROM changes WHERE col = ${hm[1]} AND doc_id = ${decodeURIComponent(hm[2])} ORDER BY id DESC LIMIT 100`;
        return json({ history: rows });
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
});
console.log("Voz de la Novia escuchando en", Bun.env.PORT ?? 3000);
