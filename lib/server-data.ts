import "server-only";
import { promises as fs } from "fs";
import path from "path";
import type { XRef, Tag } from "./types";

/** Prebuilt Bible data in ./data, loaded once per server instance. */
const DIR = path.join(process.cwd(), "data");
const cache = new Map<string, Promise<unknown>>();
function load<T>(name: string): Promise<T> {
  if (!cache.has(name)) cache.set(name, fs.readFile(path.join(DIR, name), "utf8").then((s) => JSON.parse(s)));
  return cache.get(name) as Promise<T>;
}
export const kjv = () => load<Record<string, string>>("kjv.json");
export const xref = () => load<Record<string, XRef[]>>("xref.json");
export const tags = () => load<Record<string, Tag[]>>("tags.json");
export const red = () => load<Record<string, 1>>("red.json");
/** [strongs, lemma, translit, gloss, occurrences] */
export const lexIndex = () => load<[string, string, string, string, number][]>("lexindex.json");

/** Reverse cross-reference index: who points at this verse. */
let revP: Promise<Record<string, XRef[]>> | null = null;
export function xrefReverse() {
  if (!revP)
    revP = xref().then((x) => {
      const r: Record<string, XRef[]> = {};
      for (const [from, list] of Object.entries(x))
        for (const [to, votes, s] of list) (r[to.split("-")[0]] ||= []).push([from, votes, s]);
      return r;
    });
  return revP;
}

/* ---------- keyword search over the KJV (used by the search box and by Ask) ---------- */
const STOP = new Set(
  "a an and are as at be but by for from had hath have he her him his i if in into is it its me my no nor not now o of on or our out shall she so that the thee their them then there these they this those thou thy thine to unto up upon us was we were what when which who whom will with ye you your yea also all any even let said saith say came come one every did do doth done made make shalt hast art wilt been".split(" ")
);
const tok = (s: string) => (s.toLowerCase().match(/[a-z]+/g) || []).filter((w) => w.length > 1 && !STOP.has(w));
type Index = { ids: string[]; toks: string[][]; idf: Map<string, number> };
let idxP: Promise<Index> | null = null;
function index() {
  if (!idxP)
    idxP = kjv().then((k) => {
      const ids = Object.keys(k).filter((id) => !id.endsWith(".title"));
      const toks = ids.map((id) => tok(k[id]));
      const df = new Map<string, number>();
      for (const t of toks) for (const w of new Set(t)) df.set(w, (df.get(w) || 0) + 1);
      const idf = new Map<string, number>();
      for (const [w, n] of df) idf.set(w, Math.log(ids.length / n));
      return { ids, toks, idf };
    });
  return idxP;
}
/** Words match whole words or as prefixes of 4+ letters (love → loved, loveth). */
export async function searchVerses(q: string, limit = 20) {
  const { ids, toks, idf } = await index();
  const k = await kjv();
  const qt = [...new Set(tok(q))];
  if (!qt.length) return [];
  const phrase = q.toLowerCase().replace(/[^a-z\s]/g, "").trim();
  const scored: [number, number][] = [];
  for (let i = 0; i < ids.length; i++) {
    const t = toks[i];
    let s = 0, hit = 0;
    for (const w of qt) {
      const m = t.find((x) => x === w || (w.length >= 4 && x.startsWith(w)));
      if (m) { s += idf.get(m) || 1; hit++; }
    }
    if (!hit) continue;
    s *= hit / qt.length;
    if (phrase.length > 6 && k[ids[i]].toLowerCase().includes(phrase)) s += 8;
    scored.push([s, i]);
  }
  scored.sort((a, b) => b[0] - a[0]);
  return scored.slice(0, limit).map(([, i]) => ({ id: ids[i], t: k[ids[i]] }));
}
