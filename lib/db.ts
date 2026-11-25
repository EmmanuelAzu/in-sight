import "server-only";
import { neon } from "@neondatabase/serverless";

const URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
export const dbEnabled = !!URL;

let ready: Promise<void> | null = null;
export function sql() {
  return neon(URL);
}
/** Create tables on first use (see db/schema.sql). */
export function ensureSchema() {
  if (!ready) {
    const s = sql();
    ready = (async () => {
      await s`CREATE TABLE IF NOT EXISTS user_state (uid text PRIMARY KEY, state jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`;
      await s`CREATE TABLE IF NOT EXISTS shared_paths (uid text PRIMARY KEY, name text NOT NULL DEFAULT '', paths jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`;
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}
