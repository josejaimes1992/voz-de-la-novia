// Voz de la Novia — servidor (Bun + Postgres)
import { SQL } from "bun";
import { createHmac, timingSafeEqual } from "node:crypto";

const db = new SQL(Bun.env.DATABASE_URL!);
await db`CREATE TABLE IF NOT EXISTS docs (
  col text NOT NULL, id text NOT NULL, data jsonb NOT NULL, updated_at bigint NOT NULL,
  PRIMARY KEY (col, id))`;

const SEED: [string, string, Record<string, unknown>][] = [["songs", "ej-santo", {"author": "Reginald Heber · trad. Juan B. Cabrera", "body": "# Estrofa 1\n[D]¡Santo! ¡[Bm]Santo! ¡[G]Santo! [D]Señor omni[A]potente,\n[D]siempre el [Bm]labio [E]mío loo[A]res te da[E]rá[A].\n[D]¡Santo! ¡[Bm]Santo! ¡[G]Santo! te a[D]doro [A]reverente,\n[G]Dios en tres [D]per[Bm]sonas, [D]ben[A]dita Trini[D]dad.\n\n# Estrofa 2\n[D]¡Santo! ¡[Bm]Santo! ¡[G]Santo! en [D]numeroso [A]coro,\n[D]santos esco[Bm]gidos te a[E]doran sin ce[A]sar,\n[D]de alegría [Bm]llenos, y [G]sus co[D]ronas de [A]oro\n[G]rinden ante el [D]tro[Bm]no y el [D]cris[A]talino [D]mar.", "category": "Himno", "ejemplo": true, "key": "D", "notes": "Ejemplo de dominio público. Edítalo o bórralo cuando quieras.", "title": "Santo, Santo, Santo", "updatedAt": 1790866763569}], ["songs", "ej-castillo", {"author": "Martín Lutero · trad. Juan B. Cabrera", "body": "# Estrofa 1\n[C]Castillo fuerte es [G]nuestro [C]Dios,\nde[F]fensa y [G]buen es[C]cudo;\ncon su po[G]der nos [C]libra[F]rá\nen [C]este [G]trance a[C]gudo.\nCon [Am]furia y con a[G]fán\na[C]cósa[F]nos Sa[C]tán;\npor [Am]armas deja [G]ver\nas[C]tucia y [F]gran po[G]der;\n[F]cual él no [C]hay en la [G]tie[C]rra.", "category": "Himno", "ejemplo": true, "key": "C", "notes": "", "title": "Castillo fuerte es nuestro Dios", "updatedAt": 1790866763569}], ["songs", "ej-cristo", {"author": "Anna B. Warner · trad. tradicional", "body": "# Intro\n[G] [C] [D] [G]\n\n# Estrofa\n[G]Cristo me ama, [C]bien lo [G]sé,\nsu pa[G]labra [D]me hace [G]ver,\nque los [G]niños [C]son de A[G]quel,\nquien es [G]nuestro a[D]migo [G]fiel.\n\n# Coro\n[G]Cristo me ama, [C]Cristo me [G]ama,\n[G]Cristo me ama, [D]la Biblia dice a[G]sí.", "category": "Infantil", "ejemplo": true, "key": "G", "notes": "Repetir el coro al final.", "title": "Cristo me ama", "updatedAt": 1790866763569}], ["programs", "ej-prog", {"date": "2026-10-01", "ejemplo": true, "items": [{"key": "G", "note": "", "songId": "ej-cristo"}, {"key": "Eb", "note": "Subir medio tono", "songId": "ej-santo"}, {"key": "C", "note": "Solo estrofa 1", "songId": "ej-castillo"}], "notes": "Programa de ejemplo.", "service": "Servicio de adoración · 10:00", "title": "Culto dominical", "updatedAt": 1790866763569}]];
const [{ n }] = await db`SELECT count(*)::int AS n FROM docs`;
if (n === 0) {
  for (const [col, id, data] of SEED) {
    await db`INSERT INTO docs (col, id, data, updated_at) VALUES (${col}, ${id}, ${JSON.stringify(data)}::jsonb, ${Date.now()}) ON CONFLICT DO NOTHING`;
  }
  console.log("Datos iniciales copiados:", SEED.length);
}

const PASSWORD = Bun.env.EDITOR_PASSWORD ?? "";
const SECRET = (Bun.env.TOKEN_SECRET ?? "vdn") + "|" + PASSWORD;
const TOKEN = createHmac("sha256", SECRET).update("editor-v1").digest("hex");
const COLS = new Set(["songs", "programs"]);
const ID_RE = /^[A-Za-z0-9_.:-]{1,80}$/;
const attempts = new Map<string, { n: number; t: number }>();

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}
function safeEq(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
function isEditor(req: Request) {
  const h = req.headers.get("authorization") ?? "";
  return PASSWORD.length > 0 && h.startsWith("Bearer ") && safeEq(h.slice(7), TOKEN);
}

const HTML = await Bun.file(new URL("./public/index.html", import.meta.url)).text();
const LOGO = Bun.file(new URL("./public/logo.jpg", import.meta.url));
const STATIC: Record<string, string> = { "/acordes.js": "text/javascript; charset=utf-8", "/chords.json": "application/json", "/chords-LICENSE.txt": "text/plain; charset=utf-8", "/vdn-logo.jpg": "image/jpeg", "/vdn-icon.png": "image/png" };

Bun.serve({
  port: Number(Bun.env.PORT ?? 3000),
  async fetch(req, server) {
    const url = new URL(req.url);
    const p = url.pathname;
    try {
      if (p === "/" || p === "/index.html") {
        return new Response(HTML, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" } });
      }
      if (p === "/healthz") return new Response("ok");
      if (p === "/logo.jpg") return new Response(LOGO, { headers: { "content-type": "image/jpeg", "cache-control": "public, max-age=86400" } });
      if (STATIC[p]) return new Response(Bun.file(new URL("./public" + p, import.meta.url)), { headers: { "content-type": STATIC[p], "cache-control": "public, max-age=3600" } });
      if (p === "/api/data" && req.method === "GET") {
        const rows = await db`SELECT col, id, data FROM docs`;
        const out: Record<string, unknown[]> = { songs: [], programs: [] };
        for (const r of rows) if (out[r.col]) { const d = typeof r.data === "string" ? JSON.parse(r.data) : r.data; out[r.col].push({ ...d, id: r.id }); }
        return json(out);
      }
      if (p === "/api/check") return json({ editor: isEditor(req) });
      if (p === "/api/login" && req.method === "POST") {
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? server.requestIP(req)?.address ?? "?";
        const now = Date.now(); const a = attempts.get(ip);
        if (a && now - a.t < 10 * 60_000 && a.n >= 8) return json({ error: "too_many" }, 429);
        const body = await req.json().catch(() => ({}));
        if (PASSWORD && typeof body.password === "string" && safeEq(body.password, PASSWORD)) {
          attempts.delete(ip); return json({ token: TOKEN });
        }
        attempts.set(ip, { n: a && now - a.t < 10 * 60_000 ? a.n + 1 : 1, t: a && now - a.t < 10 * 60_000 ? a.t : now });
        return json({ error: "bad_password" }, 403);
      }
      const m = p.match(/^\/api\/(songs|programs)\/([^/]+)$/);
      if (m) {
        const col = m[1], id = decodeURIComponent(m[2]);
        if (!COLS.has(col) || !ID_RE.test(id)) return json({ error: "bad_path" }, 400);
        if (!isEditor(req)) return json({ error: "unauthorized" }, 401);
        if (req.method === "PUT") {
          const text = await req.text();
          if (text.length > 300_000) return json({ error: "too_large" }, 413);
          const data = JSON.parse(text);
          if (!data || typeof data !== "object" || Array.isArray(data)) return json({ error: "bad_body" }, 400);
          delete data.id;
          await db`INSERT INTO docs (col, id, data, updated_at) VALUES (${col}, ${id}, ${JSON.stringify(data)}::jsonb, ${Date.now()})
                   ON CONFLICT (col, id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`;
          return new Response(null, { status: 204 });
        }
        if (req.method === "DELETE") {
          await db`DELETE FROM docs WHERE col = ${col} AND id = ${id}`;
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
