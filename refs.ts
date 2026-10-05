/* Voz de la Novia — Referencias: en qué párrafos del Mensaje se cita o se lee cada versículo.
   Dos formas de encontrarlo:
   1) Citas escritas: "Génesis 1:26", "San Juan 14, versículo 12", "Primera de Juan 1:7", "Hebreos 13:8".
   2) Lecturas: el párrafo contiene una buena parte del texto del versículo (comparando frases de 6 palabras). */

const norm = (s: string) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/* Nombres de los libros por índice (0 = Génesis … 65 = Apocalipsis). Los que llevan número usan "N|". */
const NAMES: string[][] = [
  ["genesis", "gen", "gn"], ["exodo", "ex"], ["levitico", "lev", "lv"], ["numeros", "num", "nm"], ["deuteronomio", "deut", "dt"],
  ["josue", "jos"], ["jueces", "jue"], ["rut", "ruth"], ["1|samuel", "1|sam", "1|sm"], ["2|samuel", "2|sam", "2|sm"],
  ["1|reyes", "1|re", "1|rey"], ["2|reyes", "2|re", "2|rey"], ["1|cronicas", "1|cr", "1|cron"], ["2|cronicas", "2|cr", "2|cron"],
  ["esdras", "esd"], ["nehemias", "neh"], ["ester", "est"], ["job"], ["salmos", "salmo", "sal"], ["proverbios", "prov", "pr"],
  ["eclesiastes", "ecl", "ec"], ["cantares", "cantar de los cantares", "cnt", "cant"], ["isaias", "is"], ["jeremias", "jer", "jr"],
  ["lamentaciones", "lam"], ["ezequiel", "ez", "ezeq"], ["daniel", "dan", "dn"], ["oseas", "os"], ["joel", "jl"], ["amos", "am"],
  ["abdias", "abd"], ["jonas", "jon"], ["miqueas", "miq"], ["nahum", "nah"], ["habacuc", "hab"], ["sofonias", "sof"], ["hageo", "hag"],
  ["zacarias", "zac"], ["malaquias", "mal"], ["san mateo", "mateo", "s. mateo", "mt"], ["san marcos", "marcos", "s. marcos", "mr", "mc"],
  ["san lucas", "lucas", "s. lucas", "lc"], ["san juan", "s. juan", "juan", "jn"], ["hechos", "los hechos", "hch"], ["romanos", "rom", "ro"],
  ["1|corintios", "1|cor", "1|co"], ["2|corintios", "2|cor", "2|co"], ["galatas", "gal", "ga"], ["efesios", "ef", "efe"],
  ["filipenses", "fil", "flp"], ["colosenses", "col"], ["1|tesalonicenses", "1|tes", "1|ts"], ["2|tesalonicenses", "2|tes", "2|ts"],
  ["1|timoteo", "1|tim", "1|ti"], ["2|timoteo", "2|tim", "2|ti"], ["tito", "tit"], ["filemon", "flm"], ["hebreos", "heb", "he"],
  ["santiago", "stgo", "stg"], ["1|pedro", "1|ped", "1|p"], ["2|pedro", "2|ped", "2|p"], ["1|juan", "1|jn"], ["2|juan", "2|jn"], ["3|juan", "3|jn"],
  ["judas", "jud"], ["apocalipsis", "apoc", "ap", "revelacion"],
];
const ORD: Record<string, string[]> = {
  "1": ["1", "i", "1ra", "1ro", "1a", "1era", "primera", "primero", "primer", "1era."],
  "2": ["2", "ii", "2da", "2do", "2a", "segunda", "segundo"],
  "3": ["3", "iii", "3ra", "3ro", "3a", "tercera", "tercero"],
};
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const ALIAS = new Map<string, number>();
/* Abreviaturas que también son palabras comunes en español: no se usan para no confundir */
const SKIP = new Set(["mal", "dan", "jos", "est", "rey", "jue", "hab", "col", "ped", "tes", "tim", "cor", "sam", "num", "gen", "ezeq", "sof", "jon", "neh", "rom"]);
const parts: string[] = [];
NAMES.forEach((list, bi) => { for (const a of list) {
  const m = a.match(/^([123])\|(.+)$/);
  if (m) { if (m[2].length < 3) continue; for (const o of ORD[m[1]]) for (const sep of [" de ", " "]) { const k = `${o}${sep}${m[2]}`; if (!ALIAS.has(k)) { ALIAS.set(k, bi); parts.push(k); } } if (/^\d$/.test(m[1])) { const k = `${m[1]}${m[2]}`; ALIAS.set(k, bi); parts.push(k); } }
  else if (a.length > 2 && !SKIP.has(a) && !ALIAS.has(a)) { ALIAS.set(a, bi); parts.push(a); }
} });
parts.sort((a, b) => b.length - a.length);
/* Libro + capítulo + versículo, con varias formas de escribirlo */
const CITE = new RegExp(`(?<![a-z0-9])(${parts.map(p => esc(p).replace(/ /g, "\\s+")).join("|")})\\.?,?\\s*(?:(?:capitulo|cap\\.?)\\s*)?(\\d{1,3})\\s*(?::|\\.|,?\\s*(?:y\\s+(?:el\\s+)?)?(?:versiculos?|vers\\.?|vs?\\.?)\\s*)\\s*(\\d{1,3})(?:\\s*(?:-|–|al|a|y)\\s*(\\d{1,3}))?`, "g");

function hash(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const WORDS = (t: string) => norm(t).replace(/[^a-z0-9ñ\s]+/g, " ").split(/\s+/).filter(Boolean);
const K = 6;

export type Ref = { id: string; n: string; i: number; how: "cita" | "lectura" };
export type RefIndex = { byVerse: Map<string, Ref[]>; built: number; sermons: number };

/* Construye el índice (cede el control cada cierto tiempo para no frenar el servidor) */
export async function buildRefs(sermons: { id: string; paras: { n: string; t: string }[] }[], bible: any): Promise<RefIndex> {
  const books = bible?.books || [];
  // Frases de 6 palabras de cada versículo → versículo (solo las que identifican pocos versículos)
  const sh = new Map<number, number>(); const vKey: string[] = []; const vNeed: number[] = [];
  const multi = new Set<number>();
  books.forEach((bk: any, b: number) => (bk[3] || []).forEach((ch: string[], c: number) => ch.forEach((tx: string, v: number) => {
    const w = WORDS(tx); if (w.length < 7) return; const id = vKey.length; vKey.push(`${b}.${c}.${v}`);
    const seen = new Set<number>(); for (let i = 0; i + K <= w.length; i++) { const h = hash(w.slice(i, i + K).join(" ")); if (seen.has(h)) continue; seen.add(h); if (sh.has(h) && sh.get(h) !== id) multi.add(h); else sh.set(h, id); }
    vNeed.push(Math.max(2, Math.ceil(seen.size * 0.45)));
  })));
  for (const h of multi) sh.delete(h);
  const byVerse = new Map<string, Ref[]>();
  const add = (key: string, r: Ref) => { let a = byVerse.get(key); if (!a) byVerse.set(key, a = []); if (a.length < 400 && !a.some(x => x.id === r.id && x.i === r.i)) a.push(r); };
  let ops = 0;
  for (const s of sermons) {
    (s.paras || []).forEach((p, i) => {
      const nt = norm(p.t);
      // 1) citas escritas
      CITE.lastIndex = 0; let m: RegExpExecArray | null;
      while ((m = CITE.exec(nt))) {
        const b = ALIAS.get(m[1].replace(/\s+/g, " ")); if (b == null || !books[b]) continue;
        const c = +m[2] - 1, v1 = +m[3] - 1, v2 = m[4] && +m[4] - 1 > v1 ? Math.min(+m[4] - 1, v1 + 30) : v1; const ch = books[b][3][c]; if (!ch) continue;
        for (let v = v1; v <= v2 && v < ch.length; v++) if (v >= 0) add(`${b}.${c}.${v}`, { id: s.id, n: p.n, i, how: "cita" });
      }
      // 2) lecturas del texto bíblico
      const w = nt.replace(/[^a-z0-9ñ\s]+/g, " ").split(/\s+/).filter(Boolean); if (w.length < K) return;
      const hits = new Map<number, number>();
      for (let j = 0; j + K <= w.length; j++) { const id = sh.get(hash(w.slice(j, j + K).join(" "))); if (id != null) hits.set(id, (hits.get(id) || 0) + 1); }
      for (const [id, n] of hits) if (n >= vNeed[id]) add(vKey[id], { id: s.id, n: p.n, i, how: "lectura" });
    });
    if (++ops % 25 === 0) await new Promise(r => setTimeout(r, 0));
  }
  return { byVerse, built: Date.now(), sermons: sermons.length };
}
