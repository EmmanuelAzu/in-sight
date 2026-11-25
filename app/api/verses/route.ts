import { NextResponse } from "next/server";
import { kjv, tags } from "@/lib/server-data";
import { isId } from "@/lib/books";

/** GET /api/verses?ids=Gal.5.22,Ps.1.3  ->  { "Gal.5.22": { t, tags } } */
export async function GET(req: Request) {
  const ids = (new URL(req.url).searchParams.get("ids") || "").split(",").map((s) => s.split("-")[0]).filter(isId).slice(0, 200);
  const [k, tg] = await Promise.all([kjv(), tags()]);
  const out: Record<string, { t: string; tags: string[] }> = {};
  for (const id of ids) if (k[id] !== undefined) out[id] = { t: k[id], tags: tg[id] || [] };
  return NextResponse.json(out, { headers: { "Cache-Control": "public, max-age=86400" } });
}
