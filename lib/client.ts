import type { BookInfo, Chapter, LexEntry, Word, Tag } from "./types";
import { parts, isId } from "./books";

/* Small promise caches for the static data under /public/data and the verse API. */
const memo = new Map<string, Promise<unknown>>();
function get<T>(url: string): Promise<T> {
  if (!memo.has(url))
    memo.set(url, fetch(url).then((r) => {
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      return r.json();
    }).catch((e) => { memo.delete(url); throw e; }));
  return memo.get(url) as Promise<T>;
}
export const getBooks = () => get<BookInfo[]>("/data/books.json");
export const getChapter = (b: string, c: number) => get<Chapter>(`/data/c/${b}.${c}.json`);
export const getWords = (b: string, c: number) => get<Record<string, Word[]>>(`/data/w/${b}.${c}.json`);
export const getQuotes = () => get<{ nt: string; ot: string; votes: number }[]>("/data/quotes.json");
export async function getLex(sid: string): Promise<LexEntry | null> {
  const m = sid.match(/^([GH])(\d+)$/);
  if (!m) return null;
  const shard = await get<Record<string, LexEntry>>(`/data/lex/${m[1]}${Math.floor(Number(m[2]) / 100)}.json`).catch(() => ({} as Record<string, LexEntry>));
  return shard[sid] || null;
}

/** Verse text + tags for any ids, batched through /api/verses. */
type VT = { t: string; tags: Tag[] };
const vcache = new Map<string, VT>();
let pending = new Map<string, ((v: VT | undefined) => void)[]>();
let timer: ReturnType<typeof setTimeout> | null = null;
function flush() {
  const batch = pending; pending = new Map(); timer = null;
  const ids = [...batch.keys()];
  for (let i = 0; i < ids.length; i += 150) {
    const slice = ids.slice(i, i + 150);
    fetch(`/api/verses?ids=${encodeURIComponent(slice.join(","))}`).then((r) => r.json()).then((o: Record<string, VT>) => {
      for (const id of slice) { if (o[id]) vcache.set(id, o[id]); batch.get(id)!.forEach((f) => f(o[id])); }
    }).catch(() => slice.forEach((id) => batch.get(id)!.forEach((f) => f(undefined))));
  }
}
export function getVerse(id: string): Promise<VT | undefined> {
  const base = id.split("-")[0];
  if (!isId(base)) return Promise.resolve(undefined);
  if (vcache.has(base)) return Promise.resolve(vcache.get(base));
  return new Promise((res) => {
    if (!pending.has(base)) pending.set(base, []);
    pending.get(base)!.push(res);
    if (!timer) timer = setTimeout(flush, 15);
  });
}
export async function getVerses(ids: string[]) {
  const out: Record<string, VT> = {};
  await Promise.all(ids.map((id) => getVerse(id).then((v) => { if (v) out[id.split("-")[0]] = v; })));
  return out;
}
/** Psalm titles live on the chapter, not as a verse. */
export async function verseFromChapter(id: string) {
  const p = parts(id);
  const ch = await getChapter(p.b, p.c);
  if (p.title) return { ch, verse: null, title: ch.title || "" };
  return { ch, verse: ch.v.find((v) => v.n === p.v) || null, title: "" };
}
