import { NextResponse } from "next/server";
import { currentUser } from "@/auth";
import { dbEnabled, sql, ensureSchema } from "@/lib/db";
import { cleanPaths } from "@/lib/state";

export const dynamic = "force-dynamic";

/** GET: study paths that signed-in people have shared with the group. */
export async function GET() {
  const user = await currentUser();
  if (!user || !dbEnabled) return NextResponse.json({ groups: [] });
  await ensureSchema();
  const rows = (await sql()`SELECT uid, name, paths FROM shared_paths ORDER BY updated_at DESC LIMIT 200`) as { uid: string; name: string; paths: unknown }[];
  const groups = rows
    .map((r) => ({ uid: r.uid, name: r.name || "Someone", mine: r.uid === user.id, paths: cleanPaths(Array.isArray(r.paths) ? r.paths : [], false).slice(0, 20) }))
    .filter((g) => g.paths.length);
  return NextResponse.json({ groups });
}

/** PUT: replace the paths this user shares. An empty list stops sharing. */
export async function PUT(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to share." }, { status: 401 });
  if (!dbEnabled) return NextResponse.json({ error: "No database is configured." }, { status: 501 });
  let body: unknown = null;
  try { body = await req.json(); } catch { /* empty */ }
  const paths = cleanPaths(Array.isArray((body as { paths?: unknown })?.paths) ? ((body as { paths: unknown[] }).paths) : [], false).slice(0, 20)
    .map(({ id, title, steps }) => ({ id, title, steps }));
  await ensureSchema();
  if (!paths.length) await sql()`DELETE FROM shared_paths WHERE uid = ${user.id}`;
  else await sql()`INSERT INTO shared_paths (uid, name, paths, updated_at) VALUES (${user.id}, ${user.name.slice(0, 80)}, ${JSON.stringify(paths)}::jsonb, now())
                   ON CONFLICT (uid) DO UPDATE SET name = EXCLUDED.name, paths = EXCLUDED.paths, updated_at = now()`;
  return NextResponse.json({ ok: true });
}
