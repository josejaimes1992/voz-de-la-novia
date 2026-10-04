/* Voz de la Novia — Biblioteca: libros y material de estudio en PDF.
   Los PDF se guardan en el volumen (/data/libros), se comprimen al subirlos y se muestran
   página por página como imágenes livianas (sirve en cualquier teléfono, sin visor pesado). */
import { randomBytes, createHmac } from "node:crypto";
import { mkdirSync, existsSync, unlinkSync, statSync, rmSync, renameSync } from "node:fs";

type User = { id: number; username: string; name: string; role: string } | null;
const SECRET = Bun.env.TOKEN_SECRET || randomBytes(32).toString("hex");
const CATS = ["Libro", "Estudio", "Himnario", "Revista", "Otro"];
let DIR = "/data/libros";
export function initLibros(audioDir: string) { DIR = audioDir.replace(/\/audio\/?$/, "") + "/libros"; try { mkdirSync(DIR, { recursive: true }); } catch {} }

const jsonR = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const sig = (id: string) => createHmac("sha256", SECRET).update("libro:" + id).digest("hex").slice(0, 20);
const parse = (v: any) => typeof v === "string" ? JSON.parse(v) : v;
const run = async (cmd: string[]) => { const p = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe" }); const out = await new Response(p.stdout).text(); const code = await p.exited; return { code, out }; };

async function pageCount(f: string) { const r = await run(["pdfinfo", f]); const m = r.out.match(/Pages:\s+(\d+)/); return m ? +m[1] : 0; }
/* Comprime el PDF (si hay Ghostscript y el resultado es realmente más chico) */
async function compress(f: string) {
  if (!Bun.which("gs")) return;
  const out = f + ".gs.pdf";
  const r = await run(["gs", "-sDEVICE=pdfwrite", "-dCompatibilityLevel=1.5", "-dPDFSETTINGS=/ebook", "-dNOPAUSE", "-dQUIET", "-dBATCH", "-dDetectDuplicateImages=true", `-sOutputFile=${out}`, f]);
  try { if (r.code === 0 && existsSync(out) && statSync(out).size > 1000 && statSync(out).size < statSync(f).size * 0.9 && (await pageCount(out)) === (await pageCount(f))) renameSync(out, f); else unlinkSync(out); } catch {}
}
async function render(id: string, n: number, w: number) {
  const dir = `${DIR}/${id}/cache`; const out = `${dir}/${w}-${n}.jpg`;
  if (existsSync(out)) return out;
  mkdirSync(dir, { recursive: true });
  const r = await run(["pdftoppm", "-f", String(n), "-l", String(n), "-scale-to", String(w), "-jpeg", "-jpegopt", "quality=78,progressive=y", "-singlefile", `${DIR}/${id}/doc.pdf`, `${dir}/${w}-${n}`]);
  return r.code === 0 && existsSync(out) ? out : null;
}
async function list(db: any) { const rows = await db`SELECT id, data FROM docs WHERE col = 'libros'`; return rows.map((r: any) => ({ ...parse(r.data), id: r.id })); }
function canSee(b: any, user: User) { return !!user || !!b.public; }
function pub(b: any) { return { id: b.id, title: b.title, author: b.author || "", cat: b.cat || "Libro", pages: b.pages, size: b.size, orig: b.orig, public: !!b.public, by: b.by, at: b.at, desc: b.desc || "", sig: sig(b.id) }; }

export async function librosRoute(req: Request, url: URL, p: string, user: User, db: any): Promise<Response | null> {
  /* Páginas como imagen y PDF original (enlaces firmados: sirven en <img> sin sesión) */
  const pm = p.match(/^\/libro\/([a-f0-9]{16})\/(\d{1,5})\.jpg$/);
  const dm = p.match(/^\/libro\/([a-f0-9]{16})\.pdf$/);
  if (pm || dm) {
    const id = (pm || dm)![1]; if (url.searchParams.get("s") !== sig(id)) return new Response("", { status: 403 });
    if (dm) { const f = `${DIR}/${id}/doc.pdf`; if (!existsSync(f)) return new Response("", { status: 404 });
      const r = await db`SELECT data FROM docs WHERE col = 'libros' AND id = ${id}`; const name = r[0] ? String(parse(r[0].data).title || "libro").replace(/[^\w\sáéíóúñÁÉÍÓÚÑ.-]/g, "").slice(0, 80) : "libro";
      return new Response(Bun.file(f), { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(name)}.pdf`, "cache-control": "private, max-age=86400" } }); }
    const n = +pm![2]; const wq = +(url.searchParams.get("w") || 1000); const w = [400, 800, 1200, 1600].find(x => x >= wq) || 1600;
    const out = await render(id, n, w); if (!out) return new Response("", { status: 404 });
    return new Response(Bun.file(out), { headers: { "content-type": "image/jpeg", "cache-control": "public, max-age=2592000, immutable" } });
  }
  if (!p.startsWith("/api/libros")) return null;
  if (p === "/api/libros" && req.method === "GET") {
    const all = (await list(db)).filter((b: any) => canSee(b, user)).sort((a: any, b: any) => (b.at || 0) - (a.at || 0));
    return jsonR({ libros: all.map(pub), cats: CATS });
  }
  if (!user) return jsonR({ error: "unauthorized" }, 401);
  if (p === "/api/libros" && req.method === "POST") {
    const buf = new Uint8Array(await req.arrayBuffer());
    if (buf.length > 150_000_000) return jsonR({ error: "too_large" }, 413);
    if (buf.length < 5 || String.fromCharCode(...buf.slice(0, 5)) !== "%PDF-") return jsonR({ error: "not_pdf" }, 400);
    const id = randomBytes(8).toString("hex"); const dir = `${DIR}/${id}`; mkdirSync(dir, { recursive: true });
    const f = `${dir}/doc.pdf`; await Bun.write(f, buf);
    const pages = await pageCount(f); if (!pages) { rmSync(dir, { recursive: true, force: true }); return jsonR({ error: "bad_pdf" }, 422); }
    await compress(f);
    const name = decodeURIComponent(req.headers.get("x-file-name") ?? "Libro").replace(/\.pdf$/i, "").replace(/[_]+/g, " ").trim().slice(0, 160) || "Libro";
    const data = { title: name, author: "", cat: "Libro", desc: "", public: false, pages, size: statSync(f).size, orig: buf.length, by: user.name, at: Date.now() };
    await db`INSERT INTO docs (col, id, data, updated_at) VALUES ('libros', ${id}, ${JSON.stringify(data)}::jsonb, ${Date.now()})`;
    render(id, 1, 400).catch(() => {}); /* portada */
    return jsonR(pub({ ...data, id }));
  }
  const im = p.match(/^\/api\/libros\/([a-f0-9]{16})$/);
  if (im) {
    const r = await db`SELECT data FROM docs WHERE col = 'libros' AND id = ${im[1]}`; if (!r[0]) return jsonR({ error: "not_found" }, 404);
    const old = parse(r[0].data);
    if (req.method === "PUT") {
      const b = await req.json().catch(() => ({}));
      const data = { ...old, title: String(b.title ?? old.title).trim().slice(0, 160) || old.title, author: String(b.author ?? old.author ?? "").trim().slice(0, 120),
        cat: CATS.includes(b.cat) ? b.cat : old.cat, desc: String(b.desc ?? old.desc ?? "").slice(0, 600), public: typeof b.public === "boolean" ? b.public : !!old.public };
      await db`UPDATE docs SET data = ${JSON.stringify(data)}::jsonb, updated_at = ${Date.now()} WHERE col = 'libros' AND id = ${im[1]}`;
      return jsonR(pub({ ...data, id: im[1] }));
    }
    if (req.method === "DELETE") {
      if (user.role !== "admin" && user.name !== old.by) return jsonR({ error: "forbidden" }, 403);
      await db`DELETE FROM docs WHERE col = 'libros' AND id = ${im[1]}`; rmSync(`${DIR}/${im[1]}`, { recursive: true, force: true });
      return jsonR({ ok: true });
    }
  }
  return jsonR({ error: "not_found" }, 404);
}
