import { NextResponse } from "next/server";
import { searchVerses, lexIndex } from "@/lib/server-data";

/** GET /api/search?q=fruit  ->  { verses: [{id,t}], words: [[strongs, lemma, translit, gloss, count]] } */
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") || "").slice(0, 120).trim();
  if (q.length < 2) return NextResponse.json({ verses: [], words: [] });
  const ql = q.toLowerCase();
  const strong = /^[gh]\d+$/i.test(q) ? q.toUpperCase().replace(/^([GH])0*/, "$1") : null;
  const [verses, lex] = await Promise.all([searchVerses(q, 15), lexIndex()]);
  const words = lex
    .filter(([s, l, tl, g]) => (strong ? s === strong : tl.toLowerCase().replace(/[^a-z]/g, "") === ql.replace(/[^a-z]/g, "") || l === q || g.toLowerCase() === ql))
    .sort((a, b) => b[4] - a[4])
    .slice(0, 6);
  return NextResponse.json({ verses, words });
}
