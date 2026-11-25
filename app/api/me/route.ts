import { NextResponse } from "next/server";
import { authEnabled, currentUser } from "@/auth";
import { dbEnabled, sql, ensureSchema } from "@/lib/db";
import { cleanState } from "@/lib/state";

export const dynamic = "force-dynamic";

/** GET: who is signed in, and their saved study state. */
export async function GET() {
  const user = await currentUser();
  let state = null;
  if (user && dbEnabled) {
    try {
      await ensureSchema();
      const rows = (await sql()`SELECT state FROM user_state WHERE uid = ${user.id}`) as { state: unknown }[];
      state = rows[0] ? cleanState(rows[0].state) : null;
    } catch { /* report as not saved */ }
  }
  return NextResponse.json({ authEnabled, dbEnabled, user, state });
}

/** PUT: replace the signed-in user's study state. */
export async function PUT(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to save to your account." }, { status: 401 });
  if (!dbEnabled) return NextResponse.json({ error: "No database is configured." }, { status: 501 });
  let body: unknown = null;
  try { body = await req.json(); } catch { /* empty */ }
  const state = cleanState(body);
  if (JSON.stringify(state).length > 400_000) return NextResponse.json({ error: "Too much data." }, { status: 413 });
  await ensureSchema();
  await sql()`INSERT INTO user_state (uid, state, updated_at) VALUES (${user.id}, ${JSON.stringify(state)}::jsonb, now())
              ON CONFLICT (uid) DO UPDATE SET state = EXCLUDED.state, updated_at = now()`;
  return NextResponse.json({ ok: true });
}
