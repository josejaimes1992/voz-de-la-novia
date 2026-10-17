/* Base de datos: Postgres en la nube (DATABASE_URL) o SQLite local (LOCAL_DB) para la versión de escritorio.
   El adaptador SQLite imita la interfaz de Bun.SQL que usa el servidor: db`...${x}...` y db.begin(fn). */
import { SQL } from "bun";

const JSON_COLS = new Set(["data", "before", "after", "detail"]);
const BOOL_COLS = new Set(["active", "seen"]);

function tr(q: string) {
  return q
    .replace(/\bbigserial PRIMARY KEY|\bserial PRIMARY KEY/gi, "INTEGER PRIMARY KEY AUTOINCREMENT")
    .replace(/'(\[\]|\{\})'::jsonb/g, "'$1'")
    .replace(/\(data->>'(\w+)'\)::bigint/g, "CAST(json_extract(data,'$.$1') AS INTEGER)")
    .replace(/::(jsonb|int|bigint|text|integer)\b/gi, "")
    .replace(/\bjsonb\b/gi, "TEXT")
    .replace(/\bboolean\b/gi, "INTEGER")
    .replace(/DEFAULT true\b/gi, "DEFAULT 1").replace(/DEFAULT false\b/gi, "DEFAULT 0")
    .replace(/= true\b/gi, "= 1").replace(/= false\b/gi, "= 0")
    .replace(/ADD COLUMN IF NOT EXISTS/gi, "ADD COLUMN");
}

export function makeDb(): any {
  if (!Bun.env.LOCAL_DB) return new SQL(Bun.env.DATABASE_URL!);
  const { Database } = require("bun:sqlite");
  const sq = new Database(Bun.env.LOCAL_DB, { create: true });
  sq.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");
  const cache = new Map<TemplateStringsArray, string>();
  const conv = (v: any) => v === undefined ? null : typeof v === "boolean" ? (v ? 1 : 0) : (v && typeof v === "object" && !(v instanceof Uint8Array)) ? JSON.stringify(v) : v;
  const fix = (r: any) => {
    for (const k in r) {
      if (JSON_COLS.has(k) && typeof r[k] === "string") { try { r[k] = JSON.parse(r[k]); } catch {} }
      else if (BOOL_COLS.has(k) && r[k] != null) r[k] = !!r[k];
    }
    return r;
  };
  const run = (strings: TemplateStringsArray, vals: any[]) => {
    let q = cache.get(strings);
    if (!q) { q = tr(strings.join("?")); cache.set(strings, q); }
    try {
      const st = sq.query(q);
      const rows = st.all(...vals.map(conv));
      return rows.map(fix);
    } catch (e: any) {
      if (/duplicate column name/i.test(String(e?.message))) return [];
      throw e;
    }
  };
  const tag: any = (strings: TemplateStringsArray, ...vals: any[]) => Promise.resolve().then(() => run(strings, vals));
  let chain: Promise<any> = Promise.resolve();
  tag.begin = (fn: (tx: any) => Promise<any>) => {
    // Serializa las transacciones: SQLite solo admite una a la vez por conexión
    const p = chain.then(async () => {
      sq.exec("BEGIN IMMEDIATE");
      try { const r = await fn(tag); sq.exec("COMMIT"); return r; }
      catch (e) { try { sq.exec("ROLLBACK"); } catch {} throw e; }
    });
    chain = p.catch(() => {});
    return p;
  };
  tag.sqlite = sq;
  return tag;
}

/* Rutas a archivos de la app: junto al .exe en escritorio (APP_DIR) o junto al código en la nube */
export function appPath(rel: string): string | URL {
  const base = Bun.env.APP_DIR;
  if (base) return base.replace(/[\\/]+$/, "") + "/" + rel.replace(/^\.?\//, "");
  return new URL(rel.startsWith(".") ? rel : "./" + rel, import.meta.url);
}

/* Programas externos (pdftotext, pdfinfo, pdftoppm): en Windows vienen dentro del programa (VDN_BIN) */
export function tool(name: string): string {
  const dir = Bun.env.VDN_BIN; if (!dir) return name;
  const f = `${dir}/${name}${process.platform === "win32" ? ".exe" : ""}`;
  return require("node:fs").existsSync(f) ? f : name;
}
