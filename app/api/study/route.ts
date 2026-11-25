import { NextResponse } from "next/server";
import { tags, kjv } from "@/lib/server-data";
import { canon, BOOK } from "@/lib/books";
import { TAGS, type Tag } from "@/lib/types";

/** GET /api/study?tags=jesus,ot&mode=all&book=Matt&page=0 */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const want = (sp.get("tags") || "").split(",").filter((t): t is Tag => (TAGS as string[]).includes(t));
  const mode = sp.get("mode") === "any" ? "any" : "all";
  const book = sp.get("book") || "";
  const page = Math.max(0, Math.min(1000, Number(sp.get("page")) || 0));
  if (!want.length) return NextResponse.json({ total: 0, items: [], byBook: {} });
  const [tg, k] = await Promise.all([tags(), kjv()]);
  const hits = Object.keys(tg)
    .filter((id) => (mode === "all" ? want.every((t) => tg[id].includes(t)) : want.some((t) => tg[id].includes(t))))
    .sort((a, b) => canon(a) - canon(b));
  const byBook: Record<string, number> = {};
  for (const id of hits) byBook[id.split(".")[0]] = (byBook[id.split(".")[0]] || 0) + 1;
  const filtered = book && BOOK[book] ? hits.filter((id) => id.startsWith(book + ".")) : hits;
  const items = filtered.slice(page * 50, page * 50 + 50).map((id) => ({ id, t: k[id], tags: tg[id] }));
  return NextResponse.json({ total: filtered.length, all: hits.length, items, byBook });
}
