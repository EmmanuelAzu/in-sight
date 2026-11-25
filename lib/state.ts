import { isId } from "./books";
import type { StudyState, Mark } from "./types";

const COLORS = ["gold", "green", "blue", "rose"];

/** Validate study state from storage, the network or another user. Never trust its shape. */
export function cleanState(d: unknown): StudyState {
  const o: StudyState = { marks: {}, paths: [] };
  if (!d || typeof d !== "object") return o;
  const x = d as Record<string, unknown>;
  if (x.marks && typeof x.marks === "object") {
    for (const [k, v] of Object.entries(x.marks as Record<string, unknown>)) {
      if (!isId(k) || !v || typeof v !== "object") continue;
      const m = v as Record<string, unknown>;
      const c = (COLORS.includes(String(m.c)) ? m.c : "") as Mark["c"];
      const n = typeof m.n === "string" ? m.n.slice(0, 4000) : "";
      if (c || n) o.marks[k] = { c, n };
    }
  }
  if (Array.isArray(x.paths)) o.paths = cleanPaths(x.paths, true);
  return o;
}

export function cleanPaths(arr: unknown[], keepShared: boolean) {
  return arr
    .filter((p): p is Record<string, unknown> => !!p && typeof p === "object" && typeof (p as Record<string, unknown>).id === "string")
    .slice(0, 50)
    .map((p) => ({
      id: String(p.id).slice(0, 40),
      title: String(p.title || "Untitled path").slice(0, 120),
      shared: keepShared ? !!p.shared : true,
      steps: (Array.isArray(p.steps) ? p.steps : [])
        .filter((s): s is Record<string, unknown> => !!s && typeof s === "object" && isId((s as Record<string, unknown>).r))
        .slice(0, 80)
        .map((s) => ({ r: String(s.r), n: String(s.n || "").slice(0, 1000) })),
    }));
}
