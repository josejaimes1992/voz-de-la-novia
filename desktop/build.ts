/* Genera el .exe de Windows:  bun desktop/build.ts [--exe ruta/a/bun.exe] [--target bun-windows-x64]
   Mete dentro todos los archivos de public/ y data/ (menos la RVR1960 cifrada). */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, relative } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url)).replace(/\\/g, "/").replace(/\/?$/, "/");
const args = process.argv.slice(2);
const opt = (k: string, d?: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const target = opt("--target", "bun-windows-x64")!;
const files = [...new Bun.Glob("public/**/*").scanSync({ cwd: root, dot: false }), ...new Bun.Glob("data/*").scanSync({ cwd: root })]
  .filter(f => !/rvr1960\.enc$/.test(f)).sort();
/* --bin carpeta: programas extra para Windows (pdftotext de Poppler, GPL) que se copian a bin/ */
const binDir = opt("--bin");
const extra: [string, string][] = binDir ? [...new Bun.Glob("*").scanSync({ cwd: binDir })].sort().map(f => ["bin/" + f, resolve(binDir, f)] as [string, string]) : [];
const rel = (abs: string) => { const r = relative(root + "desktop", abs).replace(/\\/g, "/"); return r.startsWith(".") ? r : "./" + r; };
const h = createHash("sha1"); for (const f of files) { h.update(f); h.update(readFileSync(root + f)); } for (const [r, f] of extra) { h.update(r); h.update(readFileSync(f)); }
const id = h.digest("hex").slice(0, 10);
let src = "/* Generado por desktop/build.ts — no editar */\n";
files.forEach((f, i) => { src += `import a${i} from "../${f}" with { type: "file" };\n`; });
extra.forEach(([, f], i) => { src += `import b${i} from ${JSON.stringify(rel(f))} with { type: "file" };\n`; });
src += `export const BUILD_ID = "${id}";\nexport const ASSETS: [string, string][] = [\n${files.map((f, i) => `  [${JSON.stringify(f)}, a${i}],`).join("\n")}\n${extra.map(([r], i) => `  [${JSON.stringify(r)}, b${i}],`).join("\n")}\n];\n`;
writeFileSync(root + "desktop/assets.gen.ts", src);
console.log(`${files.length} archivos · versión ${id}`);
if (args.includes("--gen-only")) process.exit(0);
const out = opt("--out", target.includes("windows") ? "dist/VozDeLaNovia.exe" : "dist/voz-de-la-novia")!;
const cmd = ["bun", "build", "--compile", `--target=${target}`, root + "desktop/main.ts", "--outfile", root + out];
const exe = opt("--exe"); if (exe) cmd.push(`--compile-executable-path=${exe}`);
if (target.includes("windows") && process.platform === "win32") {
  cmd.push("--windows-title=Voz de la Novia", "--windows-publisher=Tabernáculo Shalom Adonai", "--windows-description=Voz de la Novia — alabanzas, Biblia y Mensaje en pantalla", `--windows-version=${readFileSync(root + "desktop/VERSION", "utf8").trim()}.0`);
  const ico = opt("--icon"); if (ico) cmd.push(`--windows-icon=${ico}`);
}
const p = Bun.spawnSync(cmd, { stdout: "inherit", stderr: "inherit" });
process.exit(p.exitCode ?? 0);
