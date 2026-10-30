/* Programa de escritorio: un solo .exe que trae la app completa adentro.
   Guarda los datos en %LOCALAPPDATA%\VozDeLaNovia y abre la app en el navegador. */
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { randomBytes } from "node:crypto";
import { ASSETS, BUILD_ID, APP_VERSION } from "./assets.gen.ts";

const PORT = Number(Bun.env.VDN_PORT || 4747);
const URL0 = `http://localhost:${PORT}/`;
const isWin = process.platform === "win32";
const base = (Bun.env.VDN_DATA || (isWin ? `${Bun.env.LOCALAPPDATA || Bun.env.APPDATA || "C:/"}/VozDeLaNovia` : `${Bun.env.HOME}/.vozdelanovia`)).replace(/\\/g, "/");

function openBrowser(url = URL0) {
  if (Bun.env.VDN_NO_OPEN) return;
  try {
    if (isWin) {
      const pf = [Bun.env["ProgramFiles(x86)"], Bun.env.ProgramFiles, Bun.env.LOCALAPPDATA].filter(Boolean) as string[];
      const cands = pf.flatMap(d => [`${d}\\Microsoft\\Edge\\Application\\msedge.exe`, `${d}\\Google\\Chrome\\Application\\chrome.exe`]);
      const exe = cands.find(c => existsSync(c));
      if (exe) Bun.spawn([exe, `--app=${url}`, "--start-maximized"], { stdout: "ignore", stderr: "ignore" });
      else Bun.spawn(["cmd", "/c", "start", "", url], { stdout: "ignore", stderr: "ignore" });
    } else Bun.spawn([process.platform === "darwin" ? "open" : "xdg-open", url], { stdout: "ignore", stderr: "ignore" });
  } catch {}
}
const wait = () => new Promise(() => setInterval(() => {}, 1 << 30));

/* ¿Ya está abierto? Entonces solo abrimos otra ventana */
try { const r = await fetch(`http://127.0.0.1:${PORT}/api/desktop/status`, { signal: AbortSignal.timeout(1500) }); if (r.ok) { openBrowser(); process.exit(0); } } catch {}

/* Copiar los archivos de la app (vienen dentro del .exe) a la carpeta de datos */
const APP = `${base}/app-${BUILD_ID}`;
if (!existsSync(`${APP}/.ok`)) {
  for (const [rel, src] of ASSETS) {
    const out = `${APP}/${rel}`; mkdirSync(out.slice(0, out.lastIndexOf("/")), { recursive: true });
    writeFileSync(out, new Uint8Array(await Bun.file(src).arrayBuffer()));
    /* Mac/Linux: los programas de bin/ (lector de PDF) necesitan permiso de ejecución */
    if (!isWin && rel.startsWith("bin/")) { try { require("node:fs").chmodSync(out, 0o755); } catch {} }
  }
  writeFileSync(`${APP}/.ok`, BUILD_ID);
}
mkdirSync(`${base}/audio`, { recursive: true });
const secretF = `${base}/secret`;
if (!existsSync(secretF)) writeFileSync(secretF, randomBytes(32).toString("hex"));

Object.assign(process.env, {
  DESKTOP: "1", APP_DIR: APP, LOCAL_DB: `${base}/voz-de-la-novia.db`, AUDIO_DIR: `${base}/audio`, PORT: String(PORT),
  TOKEN_SECRET: readFileSync(secretF, "utf8").trim(), SEED_SONGS: "0", INITIAL_PASSWORD: "",
});
if (existsSync(`${APP}/bin`)) process.env.VDN_BIN = `${APP}/bin`;
if (!process.env.VDN_VERSION) process.env.VDN_VERSION = APP_VERSION;
/* Si lo abrió el programa con ventana propia y ese programa se cierra, el servidor también se cierra */
const PARENT = Number(Bun.env.VDN_PARENT_PID || 0);
if (PARENT) setInterval(() => { try { process.kill(PARENT, 0); } catch { process.exit(0); } }, 700);

if (isWin) process.stdout.write("\x1b]0;Voz de la Novia\x07");
console.log("\n  Voz de la Novia — programa de escritorio\n  ========================================\n");
try { await import("../server.ts"); }
catch (e: any) {
  console.error("\n  No se pudo iniciar:", e?.message || e);
  if (/EADDRINUSE|address already in use|port/i.test(String(e?.message))) console.error(`  El puerto ${PORT} está ocupado por otro programa.`);
  console.error("\n  Cierra esta ventana e inténtalo de nuevo.");
  await wait();
}
const lan = Object.values(networkInterfaces()).flat().filter((n: any) => n && n.family === "IPv4" && !n.internal).map((n: any) => n.address);
console.log(`\n  ✔ Funcionando. Abre en esta PC:  ${URL0}`);
for (const ip of lan) console.log(`    Desde teléfonos o tablets en la misma red:  http://${ip}:${PORT}/`);
console.log(`    OBS (navegador):  ${URL0}obs`);
console.log(`\n  Tus datos se guardan en: ${base}`);
console.log("  Para cerrar el programa, cierra esta ventana.\n");
openBrowser();
