/* Voz de la Novia — Medios para proyectar: PowerPoint (PPT/PPTX), PDF e imágenes (JPG, PNG…).
   Todo se convierte a imágenes (una por diapositiva o página) para que la pantalla del templo
   las muestre al instante y sin depender de ningún programa. */
import { randomBytes } from "node:crypto";
import { mkdirSync, existsSync, rmSync, readdirSync, writeFileSync, renameSync, statSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { tool } from "./db.ts";

type User = { id: number; name: string; role: string } | null;
let DIR = "/data/medios";
export function initMedios(dataDir: string) { DIR = dataDir.replace(/[\\/]+$/, "") + "/medios"; try { mkdirSync(DIR, { recursive: true }); } catch {} }
export function mediosDir() { return DIR; }
const TMP = () => tmpdir().replace(/\\/g, "/");
const jsonR = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json; charset=utf-8" } });
const parse = (v: any) => typeof v === "string" ? JSON.parse(v) : v;
const ID_RE = /^[a-f0-9]{16}$/;
const isWin = process.platform === "win32";

async function run(cmd: string[], ms = 240000) {
  try {
    const p = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe", windowsHide: true } as any);
    const t = setTimeout(() => { try { p.kill(); } catch {} }, ms);
    const code = await p.exited; clearTimeout(t);
    const err = await new Response(p.stderr).text().catch(() => "");
    return { code, err };
  } catch (e: any) { return { code: -1, err: String(e?.message || e) }; }
}

/* Qué clase de archivo es (por su contenido y su extensión) */
function kindOf(buf: Uint8Array, name: string): "pdf" | "img" | "ppt" | null {
  const h = Buffer.from(buf.subarray(0, 12)); const ext = (name.split(".").pop() || "").toLowerCase();
  if (h.subarray(0, 5).toString() === "%PDF-") return "pdf";
  if ((h[0] === 0xff && h[1] === 0xd8) || (h[0] === 0x89 && h[1] === 0x50) || h.subarray(0, 4).toString() === "GIF8" || (h.subarray(0, 4).toString() === "RIFF" && h.subarray(8, 12).toString() === "WEBP")) return "img";
  if (["ppt", "pptx", "pps", "ppsx", "pptm", "odp", "key"].includes(ext)) return "ppt";
  if (h[0] === 0x50 && h[1] === 0x4b) return ["pptx", "ppsx", "pptm", "odp"].includes(ext) ? "ppt" : null;
  if (h[0] === 0xd0 && h[1] === 0xcf) return "ppt";
  return null;
}

/* Imagen → JPG (máximo 1920 px) y miniatura (400 px). Sin ffmpeg se guarda tal cual. */
async function imgPages(src: string, dir: string) {
  mkdirSync(`${dir}/t`, { recursive: true });
  const a = await run([tool("ffmpeg"), "-hide_banner", "-nostdin", "-y", "-i", src, "-frames:v", "1", "-vf", "scale=1920:1920:force_original_aspect_ratio=decrease", "-q:v", "3", `${dir}/1.jpg`]);
  if (a.code !== 0 || !existsSync(`${dir}/1.jpg`)) { copyFileSync(src, `${dir}/1.jpg`); copyFileSync(src, `${dir}/t/1.jpg`); return 1; }
  const b = await run([tool("ffmpeg"), "-hide_banner", "-nostdin", "-y", "-i", `${dir}/1.jpg`, "-vf", "scale=400:400:force_original_aspect_ratio=decrease", "-q:v", "5", `${dir}/t/1.jpg`]);
  if (b.code !== 0) copyFileSync(`${dir}/1.jpg`, `${dir}/t/1.jpg`);
  return 1;
}

/* PDF → una imagen por página */
async function pdfPages(pdf: string, dir: string) {
  mkdirSync(`${dir}/t`, { recursive: true });
  const a = await run([tool("pdftoppm"), "-scale-to", "1920", "-jpeg", "-jpegopt", "quality=88", pdf, `${dir}/p`]);
  if (a.code !== 0) throw new Error("No se pudo leer el PDF.");
  await run([tool("pdftoppm"), "-scale-to", "400", "-jpeg", "-jpegopt", "quality=70", pdf, `${dir}/t/p`]);
  const fix = (d: string) => { for (const f of readdirSync(d)) { const m = f.match(/^p-0*(\d+)\.jpg$/); if (m) renameSync(`${d}/${f}`, `${d}/${Number(m[1])}.jpg`); } };
  fix(dir); fix(`${dir}/t`);
  const n = readdirSync(dir).filter(f => /^\d+\.jpg$/.test(f)).length;
  for (let i = 1; i <= n; i++) if (!existsSync(`${dir}/t/${i}.jpg`)) copyFileSync(`${dir}/${i}.jpg`, `${dir}/t/${i}.jpg`);
  if (!n) throw new Error("El PDF no tiene páginas.");
  return n;
}

/* PowerPoint → PDF: con LibreOffice (servidor) o con el PowerPoint de la PC (Windows) */
function sofficePaths() {
  const L = ["soffice", "libreoffice"];
  if (isWin) for (const b of [Bun.env.ProgramFiles, Bun.env["ProgramFiles(x86)"]]) if (b) L.unshift(`${b}\\LibreOffice\\program\\soffice.exe`);
  return L;
}
async function officeToPdf(src: string, work: string): Promise<string> {
  const out = `${work}/doc.pdf`;
  if (isWin) {
    const ps = `$ErrorActionPreference='Stop'; $pp=New-Object -ComObject PowerPoint.Application; try { $p=$pp.Presentations.Open('${src.replace(/\//g, "\\").replace(/'/g, "''")}', $true, $false, $false); $p.SaveAs('${out.replace(/\//g, "\\").replace(/'/g, "''")}', 32); $p.Close() } finally { $pp.Quit() }`;
    const r = await run(["powershell", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", ps], 240000);
    if (r.code === 0 && existsSync(out)) return out;
  }
  for (const bin of sofficePaths()) {
    if (bin.includes("\\") && !existsSync(bin)) continue;
    const prof = `${TMP()}/lo-${randomBytes(6).toString("hex")}`;
    const r = await run([bin, "--headless", "--norestore", "--nolockcheck", `-env:UserInstallation=file:///${prof.replace(/^\//, "")}`, "--convert-to", "pdf", "--outdir", work, src], 240000);
    try { rmSync(prof, { recursive: true, force: true }); } catch {}
    const made = readdirSync(work).find(f => f.toLowerCase().endsWith(".pdf"));
    if (r.code === 0 && made) { if (`${work}/${made}` !== out) renameSync(`${work}/${made}`, out); return out; }
  }
  throw new Error(isWin ? "Para subir PowerPoint en esta PC hace falta tener instalado Microsoft PowerPoint o LibreOffice. También puedes guardarlo como PDF (Archivo → Guardar como → PDF) y subir el PDF."
    : "No se pudo convertir el PowerPoint. Prueba guardarlo como PDF y subir el PDF.");
}

async function list(db: any) { const rows = await db`SELECT id, data FROM docs WHERE col = 'medios'`; return rows.map((r: any) => ({ ...parse(r.data), id: r.id })).sort((a: any, b: any) => (b.at || 0) - (a.at || 0)); }

export async function mediosRoute(req: Request, p: string, user: User, db: any): Promise<Response | null> {
  /* Imágenes: públicas (la pantalla del proyector y OBS no tienen sesión) */
  const im = p.match(/^\/medio\/([a-f0-9]{16})\/(t\/)?(\d{1,4})\.jpg$/);
  if (im) { const f = `${DIR}/${im[1]}/${im[2] ? "t/" : ""}${Number(im[3])}.jpg`;
    return existsSync(f) ? new Response(Bun.file(f), { headers: { "content-type": "image/jpeg", "cache-control": "public, max-age=31536000, immutable" } }) : new Response("", { status: 404 }); }
  if (!p.startsWith("/api/medios")) return null;
  if (!user) return jsonR({ error: "unauthorized" }, 401);
  if (p === "/api/medios" && req.method === "GET") return jsonR({ medios: await list(db) });
  if (p === "/api/medios" && req.method === "POST") {
    const buf = new Uint8Array(await req.arrayBuffer());
    if (buf.length > 200_000_000) return jsonR({ error: "too_large", msg: "El archivo es muy grande (máximo 200 MB)." }, 413);
    const name = decodeURIComponent(req.headers.get("x-file-name") ?? "archivo");
    const kind = kindOf(buf, name); if (!kind) return jsonR({ error: "bad_type", msg: "Ese tipo de archivo no se puede proyectar. Usa PowerPoint (PPT, PPTX), PDF o imágenes (JPG, PNG)." }, 415);
    const id = randomBytes(8).toString("hex"); const dir = `${DIR}/${id}`; const work = `${TMP()}/vdn-md-${id}`;
    mkdirSync(dir, { recursive: true }); mkdirSync(work, { recursive: true });
    const ext = (name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin";
    const src = `${work}/original.${ext}`; writeFileSync(src, buf);
    try {
      let pages = 0;
      if (kind === "img") pages = await imgPages(src, dir);
      else if (kind === "pdf") pages = await pdfPages(src, dir);
      else pages = await pdfPages(await officeToPdf(src, work), dir);
      const title = name.replace(/\.[^.]+$/, "").replace(/[_]+/g, " ").trim().slice(0, 160) || "Archivo";
      const data = { title, kind, ext, pages, size: buf.length, by: user.name, at: Date.now() };
      await db`INSERT INTO docs (col, id, data, updated_at) VALUES ('medios', ${id}, ${JSON.stringify(data)}::jsonb, ${Date.now()})`;
      return jsonR({ ...data, id });
    } catch (e: any) {
      rmSync(dir, { recursive: true, force: true });
      return jsonR({ error: "convert", msg: String(e?.message || e) }, 422);
    } finally { try { rmSync(work, { recursive: true, force: true }); } catch {} }
  }
  const mm = p.match(/^\/api\/medios\/([a-f0-9]{16})$/);
  if (mm) {
    const r = await db`SELECT data FROM docs WHERE col = 'medios' AND id = ${mm[1]}`; if (!r[0]) return jsonR({ error: "not_found" }, 404);
    const d = parse(r[0].data);
    if (req.method === "PUT") { const b: any = await req.json().catch(() => ({})); d.title = String(b.title ?? d.title).trim().slice(0, 160) || d.title;
      await db`UPDATE docs SET data = ${JSON.stringify(d)}::jsonb, updated_at = ${Date.now()} WHERE col = 'medios' AND id = ${mm[1]}`; return jsonR({ ...d, id: mm[1] }); }
    if (req.method === "DELETE") { if (user.role !== "admin" && user.name !== d.by) return jsonR({ error: "forbidden" }, 403);
      await db`DELETE FROM docs WHERE col = 'medios' AND id = ${mm[1]}`; rmSync(`${DIR}/${mm[1]}`, { recursive: true, force: true }); return jsonR({ ok: true }); }
  }
  return jsonR({ error: "not_found" }, 404);
}
export function medioExists(id: string, n: number) { return ID_RE.test(id) && existsSync(`${DIR}/${id}/${n}.jpg`); }
