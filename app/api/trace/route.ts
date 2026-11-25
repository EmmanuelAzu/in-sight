import { NextResponse } from "next/server";
import { xref, xrefReverse, kjv, tags } from "@/lib/server-data";
import { isId, canon } from "@/lib/books";
import { STRENGTH, type Strength } from "@/lib/types";

/** GET /api/trace?id=Gal.5.22 — verses linked within two steps, strongest links first, in canonical order. */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!isId(id)) return NextResponse.json({ error: "Unknown verse" }, { status: 400 });
  const [x, rev, k, tg] = await Promise.all([xref(), xrefReverse(), kjv(), tags()]);
  const score = (s: Strength, v: number) => STRENGTH[s].level * 1000 + v;
  const neighbours = (a: string) => {
    const all = [...(x[a] || []), ...(rev[a] || [])].map(([t, v, s]) => ({ to: t.split("-")[0], v, s }));
    const seen = new Set<string>();
    return all
      .filter((n) => n.to !== a && !seen.has(n.to) && seen.add(n.to))
      .sort((p, q) => score(q.s, q.v) - score(p.s, p.v));
  };
  const nodes = new Map<string, { r: string; s: Strength | ""; v: number; via: string | null; d: number }>();
  nodes.set(id, { r: id, s: "", v: 0, via: null, d: 0 });
  for (const n of neighbours(id).slice(0, 6)) if (!nodes.has(n.to)) nodes.set(n.to, { r: n.to, s: n.s, v: n.v, via: id, d: 1 });
  for (const first of [...nodes.values()].filter((n) => n.d === 1))
    for (const n of neighbours(first.r).filter((m) => m.s !== "r").slice(0, 2))
      if (!nodes.has(n.to) && nodes.size < 16) nodes.set(n.to, { r: n.to, s: n.s, v: n.v, via: first.r, d: 2 });
  const steps = [...nodes.values()].sort((a, b) => canon(a.r) - canon(b.r)).map((n) => ({ ...n, t: k[n.r] || "", tags: tg[n.r] || [] }));
  return NextResponse.json({ steps });
}
