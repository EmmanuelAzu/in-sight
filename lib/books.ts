export type Testament = "OT" | "NT";
export type Book = { id: string; name: string; t: Testament };

export const BOOKS: Book[] = [
  ["Gen", "Genesis"], ["Exod", "Exodus"], ["Lev", "Leviticus"], ["Num", "Numbers"], ["Deut", "Deuteronomy"],
  ["Josh", "Joshua"], ["Judg", "Judges"], ["Ruth", "Ruth"], ["1Sam", "1 Samuel"], ["2Sam", "2 Samuel"],
  ["1Kgs", "1 Kings"], ["2Kgs", "2 Kings"], ["1Chr", "1 Chronicles"], ["2Chr", "2 Chronicles"], ["Ezra", "Ezra"],
  ["Neh", "Nehemiah"], ["Esth", "Esther"], ["Job", "Job"], ["Ps", "Psalms"], ["Prov", "Proverbs"],
  ["Eccl", "Ecclesiastes"], ["Song", "Song of Solomon"], ["Isa", "Isaiah"], ["Jer", "Jeremiah"], ["Lam", "Lamentations"],
  ["Ezek", "Ezekiel"], ["Dan", "Daniel"], ["Hos", "Hosea"], ["Joel", "Joel"], ["Amos", "Amos"],
  ["Obad", "Obadiah"], ["Jonah", "Jonah"], ["Mic", "Micah"], ["Nah", "Nahum"], ["Hab", "Habakkuk"],
  ["Zeph", "Zephaniah"], ["Hag", "Haggai"], ["Zech", "Zechariah"], ["Mal", "Malachi"],
  ["Matt", "Matthew"], ["Mark", "Mark"], ["Luke", "Luke"], ["John", "John"], ["Acts", "Acts"],
  ["Rom", "Romans"], ["1Cor", "1 Corinthians"], ["2Cor", "2 Corinthians"], ["Gal", "Galatians"], ["Eph", "Ephesians"],
  ["Phil", "Philippians"], ["Col", "Colossians"], ["1Thess", "1 Thessalonians"], ["2Thess", "2 Thessalonians"],
  ["1Tim", "1 Timothy"], ["2Tim", "2 Timothy"], ["Titus", "Titus"], ["Phlm", "Philemon"], ["Heb", "Hebrews"],
  ["Jas", "James"], ["1Pet", "1 Peter"], ["2Pet", "2 Peter"], ["1John", "1 John"], ["2John", "2 John"],
  ["3John", "3 John"], ["Jude", "Jude"], ["Rev", "Revelation"],
].map(([id, name], i): Book => ({ id, name, t: i < 39 ? "OT" : "NT" }));

export const ORDER = BOOKS.map((b) => b.id);
export const BOOK: Record<string, Book> = Object.fromEntries(BOOKS.map((b) => [b.id, b]));
export const ID_RE = /^[1-3]?[A-Za-z]+\.\d+\.(\d+|title)$/;

export function isId(id: unknown): id is string {
  return typeof id === "string" && ID_RE.test(id) && !!BOOK[id.split(".")[0]];
}
export function parts(id: string) {
  const [b, c, v] = id.split(".");
  return { b, c: Number(c), v: v === "title" ? 0 : Number(v), title: v === "title" };
}
const abbr = (b: string) => b.replace(/^(\d)/, "$1 ");
/** "Gal 5:22" */
export function fmt(id: string) {
  const [b, c, v] = id.split(".");
  return `${abbr(b)} ${c}${v === "title" ? " (title)" : ":" + v}`;
}
/** "Galatians 5:22" */
export function full(id: string) {
  const [b, c, v] = id.split(".");
  const name = BOOK[b]?.name ?? b;
  const single = b === "Ps" ? "Psalm" : name;
  return `${single} ${c}${v === "title" ? " (title)" : ":" + v}`;
}
/** Cross-ref targets may be ranges: "Prov.8.22-24" */
export function target(t: string) {
  const [start, end] = t.split("-");
  return { id: start, end: end ? Number(end) : null, label: end ? `${fmt(start)}–${end}` : fmt(start) };
}
export function canon(id: string) {
  const p = parts(id.split("-")[0]);
  return ORDER.indexOf(p.b) * 1_000_000 + p.c * 1000 + p.v;
}
export function testament(id: string): Testament {
  return BOOK[id.split(".")[0]]?.t ?? "OT";
}
export function chapterKey(id: string) {
  const p = parts(id);
  return `${p.b}.${p.c}`;
}
export function readHref(id: string) {
  const p = parts(id);
  return `/read/${p.b}/${p.c}${p.v ? `#v${p.v}` : ""}`;
}

/** Parse "john 3:16", "1 cor 13", "ps 23" into an id or chapter. */
export function parseRef(q: string): { b: string; c: number; v?: number } | null {
  const m = q.trim().match(/^([1-3]?\s*[a-z]+(?:\s+of\s+[a-z]+)?)\.?\s+(\d+)(?:\s*[:.]\s*(\d+))?$/i);
  if (!m) return null;
  const key = m[1].toLowerCase().replace(/\s+/g, "");
  const book = BOOKS.find((b) => {
    const id = b.id.toLowerCase(), name = b.name.toLowerCase().replace(/\s+/g, "");
    return id === key || name === key || name.startsWith(key) && key.length >= 3 || (key === "psalm" && b.id === "Ps");
  });
  if (!book) return null;
  return { b: book.id, c: Number(m[2]), v: m[3] ? Number(m[3]) : undefined };
}
