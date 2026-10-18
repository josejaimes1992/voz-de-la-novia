/* Versión de escritorio (Windows): primer arranque, sincronización con la nube y estado.
   Solo se activa con DESKTOP=1. Funciona sin internet; cuando vuelve la conexión, sube los
   cambios hechos en esta PC y baja lo nuevo de la nube de la iglesia. */
import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync, readFileSync, mkdirSync } from "node:fs";

type Ctx = {
  db: any; dataDir: string; brandDir: string; fondosDir: string; appDir: string;
  setRvr: (gz: Uint8Array | null) => void; setCfg: (c: any) => void; setStyle: (s: any) => void; resetIndex: () => void;
  publicUser: (u: any) => any; json: (d: unknown, s?: number) => Response;
};
type State = { mode: "cloud" | "local"; cloud?: string; token?: string; cloudUser?: any; localUserId?: number; pushedId?: number;
  lastPull?: number; lastPush?: number; needLogin?: boolean; srcIds?: string[]; srcLibros?: string[] };
/* De dónde baja la Biblia y los Mensajes una iglesia que usa el programa "solo en esta PC" */
/* Aviso de versión nueva del programa (se revisa en GitHub cada 6 horas) */
const VERSION = Bun.env.VDN_VERSION || "";
let latest = "", latestAt = 0;
const vnum = (v: string) => v.split(".").map(n => parseInt(n) || 0).reduce((a, n) => a * 1000 + n, 0);
async function checkUpdate() {
  if (!VERSION || Date.now() - latestAt < 6 * 3600_000) return; latestAt = Date.now();
  try { const r = await fetch("https://api.github.com/repos/josejaimes1992/voz-de-la-novia/releases/latest", { headers: { "user-agent": "voz-de-la-novia", accept: "application/vnd.github+json" }, signal: AbortSignal.timeout(10000) });
    const d: any = await r.json(); const v = String(d.tag_name || "").replace(/^escritorio-v/, ""); if (/^\d+\.\d+\.\d+$/.test(v)) latest = v; } catch { latestAt = 0; }
}
const SOURCE = (Bun.env.VDN_SOURCE || "https://web-production-2c736.up.railway.app").replace(/\/+$/, "");

let C: Ctx; let ST: State | null = null;
let syncing = false, online: boolean | null = null, lastError = "", lastTry = 0, sermonsProgress = "";
const parseJ = (v: any) => typeof v === "string" ? JSON.parse(v) : v;

async function loadState() {
  const r = await C.db`SELECT data FROM docs WHERE col = 'desktop' AND id = 'state'`;
  ST = r[0] ? parseJ(r[0].data) : null;
}
async function saveState() {
  await C.db`INSERT INTO docs (col, id, data, updated_at) VALUES ('desktop', 'state', ${JSON.stringify(ST)}::jsonb, ${Date.now()})
             ON CONFLICT (col, id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`;
}
async function putDoc(col: string, id: string, data: any) {
  await C.db`INSERT INTO docs (col, id, data, updated_at) VALUES (${col}, ${id}, ${JSON.stringify(data)}::jsonb, ${Date.now()})
             ON CONFLICT (col, id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`;
}

export async function desktopInit(ctx: Ctx) {
  C = ctx; await loadState();
  const rv = `${C.dataDir}/rvr1960.json.gz`;
  if (existsSync(rv)) { try { C.setRvr(new Uint8Array(readFileSync(rv))); } catch {} }
  if (ST) startLoop();
}
let looping = false;
function startLoop() {
  if (looping) return; looping = true;
  setTimeout(() => syncNow(true), 1500);
  /* Con nube: cada 30 s sube cambios y cada 5 min baja todo. Solo PC: cada 6 h revisa Biblia y Mensajes nuevos */
  setInterval(() => { if (syncing || !ST) return;
    if (ST.mode === "cloud") syncNow(Date.now() - (ST.lastPull ?? 0) > 5 * 60_000);
    else if (Date.now() - (ST.lastPull ?? 0) > (online === false ? 60_000 : 6 * 3600_000)) syncNow(true); }, 30_000);
}

export function desktopHtml(h: string) {
  return h.replace("</body>", '<script src="/escritorio.js?v=5" defer></script></body>');
}

/* ---- Llamadas a la nube ---- */
async function cloud(path: string, opt: RequestInit = {}, ms = 20000) {
  const headers: any = { ...(opt.headers as any || {}) };
  if (ST?.token) headers.authorization = `Bearer ${ST.token}`;
  if (opt.body && !headers["content-type"]) headers["content-type"] = "application/json";
  const r = await fetch(ST!.cloud + path, { ...opt, headers, signal: AbortSignal.timeout(ms) });
  if (r.status === 401 && ST) { ST.needLogin = true; await saveState(); }
  return r;
}
const cleanUrl = (u: string) => { let s = String(u || "").trim().replace(/\/+$/, ""); if (s && !/^https?:\/\//i.test(s)) s = "https://" + s; return s; };

async function pendingRows() {
  const from = ST?.pushedId ?? 0;
  const rows = await C.db`SELECT id, col, doc_id FROM changes WHERE id > ${from} AND col IN ('songs', 'programs') ORDER BY id`;
  const last = rows.length ? Number(rows[rows.length - 1].id) : from;
  const seen = new Map<string, { col: string; id: string }>();
  for (const r of rows) seen.set(r.col + ":" + r.doc_id, { col: r.col, id: r.doc_id });
  return { items: [...seen.values()], last };
}

async function push() {
  const { items, last } = await pendingRows();
  if (!items.length) return 0;
  const writes: any[] = [], trash: string[] = [], dels: string[] = [];
  for (const it of items) {
    const r = await C.db`SELECT data FROM docs WHERE col = ${it.col} AND id = ${it.id}`;
    if (r[0]) { const d = parseJ(r[0].data); delete d.ownerId; delete d.owner; delete d.audio; writes.push({ col: it.col, id: it.id, data: d }); }
    else if (it.col === "songs") trash.push(it.id); else dels.push(it.id);
  }
  for (let i = 0; i < writes.length; i += 100) {
    const chunk = writes.slice(i, i + 100);
    const r = await cloud("/api/batch", { method: "POST", body: JSON.stringify({ writes: chunk }) }, 60000);
    if (r.status === 403) { for (const w of chunk) { const x = await cloud(`/api/${w.col}/${encodeURIComponent(w.id)}`, { method: "PUT", body: JSON.stringify(w.data) }); if (!x.ok && x.status !== 403) throw new Error("subida " + x.status); } }
    else if (!r.ok) throw new Error("subida " + r.status);
  }
  for (let i = 0; i < trash.length; i += 400) {
    const r = await cloud("/api/trash", { method: "POST", body: JSON.stringify({ ids: trash.slice(i, i + 400) }) });
    if (!r.ok && r.status !== 403) throw new Error("papelera " + r.status);
  }
  for (const id of dels) { const r = await cloud(`/api/programs/${encodeURIComponent(id)}`, { method: "DELETE" }); if (!r.ok && r.status !== 404 && r.status !== 403) throw new Error("borrar " + r.status); }
  ST!.pushedId = last; ST!.lastPush = Date.now(); await saveState();
  return items.length;
}

async function download(path: string, dest: string) {
  if (existsSync(dest)) return;
  try { const r = await cloud(path, {}, 30000); if (r.ok) writeFileSync(dest, new Uint8Array(await r.arrayBuffer())); } catch {}
}

async function pull(full: boolean) {
  const r = await cloud("/api/data", {}, 60000); if (!r.ok) throw new Error("datos " + r.status);
  const d = await r.json();
  const { items: pend } = await pendingRows(); const busy = new Set(pend.map(x => x.col + ":" + x.id));
  const cu = ST!.cloudUser?.id, lu = ST!.localUserId;
  await C.db.begin(async (tx: any) => {
    for (const col of ["songs", "programs"]) {
      const list: any[] = d[col] || []; const ids = new Set<string>();
      for (const it of list) {
        const id = String(it.id); ids.add(id); if (busy.has(col + ":" + id)) continue;
        const data = { ...it }; delete data.id;
        if (col === "programs") { if (data.ownerId != null && data.ownerId === cu) data.ownerId = lu; else if (data.ownerId != null) continue; }
        await tx`INSERT INTO docs (col, id, data, updated_at) VALUES (${col}, ${id}, ${JSON.stringify(data)}::jsonb, ${Date.now()})
                 ON CONFLICT (col, id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`;
      }
      const local = await tx`SELECT id FROM docs WHERE col = ${col}`;
      for (const l of local) if (!ids.has(l.id) && !busy.has(col + ":" + l.id)) await tx`DELETE FROM docs WHERE col = ${col} AND id = ${l.id}`;
    }
  });
  /* Nombre y logo de la iglesia, estilo de la pantalla */
  try { const c = await (await cloud("/api/config")).json(); if (c && c.name) {
    const lm = String(c.logo || "").match(/^\/marca\/(logo-[a-z0-9]{4,16}\.png)/); if (lm) await download("/marca/" + lm[1], `${C.brandDir}/${lm[1]}`);
    await putDoc("config", "church", c); C.setCfg(c); } } catch {}
  try { const s = await (await cloud("/api/proyector/estilo")).json(); if (s && s.font) {
    const fm = String(s.img || "").match(/^\/fondo\/([a-f0-9]{24}\.jpg)$/); if (fm) await download("/fondo/" + fm[1], `${C.fondosDir}/${fm[1]}`);
    await putDoc("settings", "proj-style", s); C.setStyle(s); } } catch {}
  ST!.lastPull = Date.now(); ST!.needLogin = false; await saveState();
  if (full) await pullExtras();
}
/* Biblia, Mensajes y Material de Interés: cada parte por separado, para que un error en una no frene a las otras */
let partErrors: string[] = [];
async function pullExtras() {
  partErrors = [];
  const step = async (name: string, f: () => Promise<any>) => { try { await f(); } catch (e: any) { const m = `${name}: ${String(e?.message || e).slice(0, 160)}`; partErrors.push(m); console.error("Sincronizar", m); } };
  await step("Biblia", pullBible);
  await step("Mensajes", pullSermons);
  await step("Material de Interés", pullLibros);
}
/* Material de Interés (PDF): se baja el archivo y las páginas se dibujan en esta PC */
let librosProgress = "";
async function pullLibros() {
  const r = await cloud("/api/libros", {}, 60000); if (!r.ok) throw new Error("lista " + r.status);
  const list: any[] = (await r.json()).libros || [];
  const dir = `${C.dataDir}/libros`; ensureDir(dir);
  const local = await C.db`SELECT id FROM docs WHERE col = 'libros'`; const have = new Set<string>(local.map((x: any) => x.id));
  const want = new Set(list.map(b => b.id)); let i = 0;
  for (const b of list) {
    i++; if (!/^[a-f0-9]{16}$/.test(b.id)) continue;
    const f = `${dir}/${b.id}/doc.pdf`;
    if (!existsSync(f)) {
      librosProgress = `${i} de ${list.length}`;
      const x = await cloud(`/libro/${b.id}.pdf?s=${encodeURIComponent(b.sig)}`, {}, 300000); if (!x.ok) continue;
      ensureDir(`${dir}/${b.id}`); writeFileSync(f, new Uint8Array(await x.arrayBuffer()));
    }
    const data = { title: b.title, author: b.author, cat: b.cat, desc: b.desc, public: b.public, pages: b.pages, size: b.size, orig: b.orig, by: b.by, at: b.at };
    await putDoc("libros", b.id, data);
  }
  const mine = new Set(ST?.mode === "local" ? (ST.srcLibros || []) : have);
  for (const id of have) if (mine.has(id) && !want.has(id)) { await C.db`DELETE FROM docs WHERE col = 'libros' AND id = ${id}`; try { require("node:fs").rmSync(`${dir}/${id}`, { recursive: true, force: true }); } catch {} }
  if (ST?.mode === "local") { ST.srcLibros = [...want]; await saveState(); }
  librosProgress = "";
}
/* Biblia RVR1960: se baja una vez y queda en la PC */
async function pullBible() {
  const rv = `${C.dataDir}/rvr1960.json.gz`; if (existsSync(rv)) return;
  const v = await (await cloud("/biblia/versiones")).json();
  if (!(v.versions || []).some((x: any) => x.id === "RVR1960")) return;
  const t = await (await cloud("/biblia/rvr1960.json", {}, 180000)).text(); JSON.parse(t);
  const gz = Bun.gzipSync(new TextEncoder().encode(t)); writeFileSync(rv, gz); C.setRvr(gz);
}

async function pullSermons() {
  const r = await cloud("/api/sermons", {}, 60000); if (!r.ok) return;
  const list: any[] = (await r.json()).sermons || [];
  const local = await C.db`SELECT id, data FROM docs WHERE col = 'sermons'`;
  const have = new Map<string, number>(); for (const l of local) { const d = parseJ(l.data); have.set(l.id, (d.paras || []).length); }
  const want = new Set(list.map(s => s.id));
  const todo = list.filter(s => have.get(s.id) !== s.n);
  let done = 0, changed = false;
  const work = async () => { while (todo.length) { const s = todo.shift()!;
    try { const x = await cloud(`/api/sermons/${encodeURIComponent(s.id)}`, {}, 60000); if (x.ok) { const d = await x.json(); delete d.id; await putDoc("sermons", s.id, d); changed = true; } } catch {}
    done++; sermonsProgress = `${done} de ${done + todo.length}`; } };
  await Promise.all(Array.from({ length: 6 }, work));
  /* Con nube: la PC queda igual que la nube. Solo PC: se respetan los mensajes que la iglesia importó por su cuenta */
  const mine = new Set(ST?.mode === "local" ? (ST.srcIds || []) : have.keys());
  for (const id of have.keys()) if (mine.has(id) && !want.has(id)) { await C.db`DELETE FROM docs WHERE col = 'sermons' AND id = ${id}`; changed = true; }
  if (ST?.mode === "local") { ST.srcIds = [...want]; await saveState(); }
  sermonsProgress = ""; if (changed) C.resetIndex();
}

export async function syncNow(full = false) {
  if (!ST || syncing) return;
  syncing = true; lastTry = Date.now();
  try {
    if (ST.mode === "local") {
      if (!ST.cloud) ST.cloud = SOURCE;
      await pullExtras();
      ST.lastPull = Date.now(); await saveState();
    } else {
      await push();
      await pull(full);
    }
    online = true; lastError = "";
  } catch (e: any) {
    const msg = String(e?.message || e);
    online = !/fetch|timed? ?out|abort|connect|network|ENOTFOUND|getaddrinfo|unable/i.test(msg) ? true : false;
    lastError = online ? msg : "sin internet";
  } finally { syncing = false; }
}

async function status() {
  checkUpdate();
  const nUsers = Number((await C.db`SELECT count(*) AS n FROM users`)[0].n);
  const pend = ST?.mode === "cloud" ? (await pendingRows()).items.length : 0;
  return { configured: nUsers > 0, mode: ST?.mode ?? null, cloud: ST?.cloud ?? null, user: ST?.cloudUser?.username ?? null,
    version: VERSION, update: latest && vnum(latest) > vnum(VERSION) ? latest : null, native: Bun.env.VDN_NATIVE === "1",
    online, syncing, pending: pend, rvr: existsSync(`${C.dataDir}/rvr1960.json.gz`), nSermons: Number((await C.db`SELECT count(*) AS n FROM docs WHERE col = 'sermons'`)[0].n), lastPull: ST?.lastPull ?? null, lastPush: ST?.lastPush ?? null, lastTry, error: [lastError, ...partErrors].filter(Boolean).join(" · "), libros: librosProgress, needLogin: !!ST?.needLogin, sermons: sermonsProgress };
}

async function newSession(uid: number) {
  const token = randomBytes(32).toString("hex");
  await C.db`INSERT INTO sessions (token, user_id, created_at) VALUES (${token}, ${uid}, ${Date.now()})`;
  return token;
}
async function localUser(req: Request) {
  const h = req.headers.get("authorization") ?? ""; if (!h.startsWith("Bearer ")) return null;
  const r = await C.db`SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ${h.slice(7)}`; return r[0] ?? null;
}

export async function desktopRoute(req: Request, p: string): Promise<Response | null> {
  const J = C.json;
  if (p === "/api/desktop/status") return J(await status());
  if (p === "/escritorio.js") return new Response(Bun.file(`${C.appDir}/public/escritorio.js`), { headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-cache" } });
  const configured = Number((await C.db`SELECT count(*) AS n FROM users`)[0].n) > 0;
  if (!configured && (p === "/" || p === "/index.html" || p === "/configurar"))
    return new Response(Bun.file(`${C.appDir}/public/escritorio.html`), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" } });
  if (p === "/api/desktop/setup" && req.method === "POST") {
    if (configured) return J({ error: "ya_configurado" }, 409);
    const b = await req.json().catch(() => ({}));
    const username = String(b.username ?? "").trim().toLowerCase(); const password = String(b.password ?? "");
    if (!/^[a-z0-9._-]{2,30}$/.test(username) || password.length < 4) return J({ error: "Usuario o contraseña no válidos (mínimo 4 caracteres)." }, 400);
    if (b.mode === "cloud") {
      const url = cleanUrl(b.url); if (!url) return J({ error: "Escribe la dirección de la nube de tu iglesia." }, 400);
      let lr: any;
      try { const r = await fetch(url + "/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username, password }), signal: AbortSignal.timeout(20000) });
        lr = await r.json().catch(() => ({})); if (!r.ok) return J({ error: r.status === 403 ? "Usuario o contraseña incorrectos en la nube." : r.status === 429 ? "Demasiados intentos; espera unos minutos." : "La nube respondió con error " + r.status }, 400);
      } catch { return J({ error: "No se pudo conectar con esa dirección. Revisa el internet y la dirección." }, 400); }
      const cu = lr.user;
      const [nu] = await C.db`INSERT INTO users (username, name, full_name, role, pass_hash, created_at, updated_at) VALUES (${username}, ${cu.name || username.toUpperCase()}, ${cu.full_name || ""}, ${cu.role === "admin" ? "admin" : "moderator"}, ${await Bun.password.hash(password)}, ${Date.now()}, ${Date.now()}) RETURNING *`;
      ST = { mode: "cloud", cloud: url, token: lr.token, cloudUser: cu, localUserId: nu.id, pushedId: 0 };
      await saveState();
      try { await pull(false); online = true; } catch (e: any) { lastError = String(e?.message || e); }
      startLoop();
      return J({ token: await newSession(nu.id), user: C.publicUser(nu) });
    }
    const church = String(b.church ?? "").trim().slice(0, 80) || "Mi iglesia";
    const name = (String(b.name ?? "").trim() || username).toUpperCase().slice(0, 40);
    const [nu] = await C.db`INSERT INTO users (username, name, full_name, role, pass_hash, created_at, updated_at) VALUES (${username}, ${name}, ${""}, ${"admin"}, ${await Bun.password.hash(password)}, ${Date.now()}, ${Date.now()}) RETURNING *`;
    ST = { mode: "local", cloud: SOURCE, srcIds: [] }; await saveState();
    const cfg = { name: church, logo: "/vdn-emblem.jpg?v=1" }; await putDoc("config", "church", cfg); C.setCfg(cfg);
    startLoop();
    return J({ token: await newSession(nu.id), user: C.publicUser(nu) });
  }
  if (p === "/api/desktop/sync" && req.method === "POST") {
    if (!(await localUser(req))) return J({ error: "unauthorized" }, 401);
    await syncNow(true); return J(await status());
  }
  /* Empezar de nuevo: vuelve a la pantalla de bienvenida (p. ej. para pasar de "solo esta PC" a la nube de la iglesia).
     Se conservan la Biblia y los Mensajes ya bajados. */
  if (p === "/api/desktop/reset" && req.method === "POST") {
    const u = await localUser(req); if (!u || u.role !== "admin") return J({ error: "Solo el administrador puede hacerlo." }, 403);
    const b = await req.json().catch(() => ({}));
    if (!(await Bun.password.verify(String(b.password ?? ""), u.pass_hash))) return J({ error: "Contraseña incorrecta." }, 400);
    await C.db.begin(async (tx: any) => {
      await tx`DELETE FROM sessions`; await tx`DELETE FROM changes`; await tx`DELETE FROM user_log`;
      await tx`DELETE FROM docs WHERE col IN ('songs', 'programs', 'trash', 'desktop', 'config', 'settings')`;
      await tx`DELETE FROM users`;
    });
    ST = null; C.setCfg({}); online = null; lastError = "";
    return J({ ok: true });
  }
  if (p === "/api/desktop/relogin" && req.method === "POST") {
    const u = await localUser(req); if (!u || !ST || ST.mode !== "cloud") return J({ error: "unauthorized" }, 401);
    const b = await req.json().catch(() => ({}));
    try { const r = await fetch(ST.cloud + "/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: ST.cloudUser?.username ?? u.username, password: String(b.password ?? "") }), signal: AbortSignal.timeout(20000) });
      const lr = await r.json().catch(() => ({})); if (!r.ok) return J({ error: "Contraseña incorrecta en la nube." }, 400);
      ST.token = lr.token; ST.cloudUser = lr.user; ST.needLogin = false; await saveState(); syncNow(true); return J({ ok: true });
    } catch { return J({ error: "Sin conexión con la nube." }, 400); }
  }
  /* Abrir un enlace en el navegador normal de Windows (WhatsApp, página de descarga…) */
  if (p === "/api/desktop/open" && req.method === "POST") {
    const b = await req.json().catch(() => ({})); const u = String(b.url ?? "");
    if (!/^https?:\/\/[^\s"]+$/i.test(u)) return J({ error: "bad_url" }, 400);
    openExternal(u); return J({ ok: true });
  }
  /* Actualizar: baja el instalador nuevo y lo abre */
  if (p === "/api/desktop/update" && req.method === "POST") {
    if (!(await localUser(req))) return J({ error: "Ingresa con tu usuario para actualizar." }, 401);
    if (!upd.busy) runUpdate();
    return J({ ok: true });
  }
  if (p === "/api/desktop/update" && req.method === "GET") return J(upd);
  /* Audios: no se guardan en la PC; si hay internet se escuchan desde la nube */
  const am = p.match(/^\/audio\/([a-f0-9]{24}\.[a-z0-9]+)$/);
  if (am && ST?.mode === "cloud" && !existsSync(`${C.dataDir}/audio/${am[1]}`)) return Response.redirect(`${ST.cloud}/audio/${am[1]}`, 302);
  return null;
}
function openExternal(u: string) {
  try {
    if (process.platform === "win32") Bun.spawn(["rundll32", "url.dll,FileProtocolHandler", u], { stdout: "ignore", stderr: "ignore", windowsHide: true } as any);
    else Bun.spawn([process.platform === "darwin" ? "open" : "xdg-open", u], { stdout: "ignore", stderr: "ignore" });
  } catch (e) { console.error("abrir enlace", e); }
}
const upd: { busy: boolean; pct: number; msg: string; error: string } = { busy: false, pct: 0, msg: "", error: "" };
async function runUpdate() {
  Object.assign(upd, { busy: true, pct: 0, msg: "Descargando la nueva versión…", error: "" });
  try {
    const native = Bun.env.VDN_NATIVE === "1";
    const name = native ? "VozDeLaNovia-Setup.exe" : "VozDeLaNovia.exe";
    const r = await fetch(`https://github.com/josejaimes1992/voz-de-la-novia/releases/latest/download/${name}`, { signal: AbortSignal.timeout(15 * 60_000) });
    if (!r.ok || !r.body) throw new Error("descarga " + r.status);
    const total = Number(r.headers.get("content-length")) || 0; const parts: Uint8Array[] = []; let got = 0;
    for await (const ch of r.body as any) { parts.push(ch); got += ch.length; if (total) upd.pct = Math.round(got * 100 / total); }
    const dir = native ? require("node:os").tmpdir() : `${Bun.env.USERPROFILE || Bun.env.HOME}/Downloads`;
    const out = `${dir.replace(/\\/g, "/")}/${native ? `VozDeLaNovia-Setup-${latest || "nueva"}.exe` : "VozDeLaNovia.exe"}`;
    ensureDir(dir); writeFileSync(out, Buffer.concat(parts));
    upd.pct = 100;
    if (native) { upd.msg = "Abriendo el instalador… acepta cerrar Voz de la Novia cuando lo pida."; openExternal(out); }
    else { upd.msg = `Listo: se guardó en Descargas (${out.split("/").pop()}). Cierra este programa y ábrelo desde ahí.`; openExternal(dir); }
  } catch (e: any) { upd.error = "No se pudo descargar: " + String(e?.message || e); upd.msg = ""; }
  finally { upd.busy = false; }
}
export function ensureDir(d: string) { try { mkdirSync(d, { recursive: true }); } catch {} }
