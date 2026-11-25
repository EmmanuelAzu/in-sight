"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cleanState } from "@/lib/state";
import type { StudyState } from "@/lib/types";
import { Panel } from "./Panel";
import { Search } from "./Search";

type Me = { authEnabled: boolean; dbEnabled: boolean; user: { id: string; name: string } | null; mode: "local" | "account" };
type Ctx = {
  sel: string;
  select: (id: string, open?: boolean) => void;
  how: boolean;
  setHow: (b: boolean) => void;
  study: StudyState;
  setStudy: (fn: (s: StudyState) => StudyState) => void;
  me: Me;
  saveError: string;
  closePanel: () => void;
};
const AppCtx = createContext<Ctx | null>(null);
export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp outside Shell");
  return c;
}

const TABS = [
  ["/read", "Read"], ["/threads", "Threads"], ["/compare", "Then & now"], ["/study", "Study by speaker"],
  ["/words", "Words"], ["/ask", "Ask the text"], ["/mine", "My study"],
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname() || "/";
  const router = useRouter();
  const [sel, setSel] = useState("Gal.5.22");
  const [open, setOpen] = useState(false);
  const [how, setHowS] = useState(false);
  const [study, setStudyS] = useState<StudyState>({ marks: {}, paths: [] });
  const [me, setMe] = useState<Me>({ authEnabled: false, dbEnabled: false, user: null, mode: "local" });
  const [saveError, setSaveError] = useState("");
  const top = useRef<HTMLElement>(null);
  const meRef = useRef(me); meRef.current = me;

  // Load: browser copy first, then the account copy if signed in.
  useEffect(() => {
    try {
      const l = localStorage.getItem("insight-state"); if (l) setStudyS(cleanState(JSON.parse(l)));
      setHowS(localStorage.getItem("insight-how") === "1");
    } catch { /* storage unavailable */ }
    fetch("/api/me").then((r) => r.json()).then((d: { authEnabled: boolean; dbEnabled: boolean; user: Me["user"]; state: unknown }) => {
      const mode = d.user && d.dbEnabled ? "account" : "local";
      setMe({ authEnabled: d.authEnabled, dbEnabled: d.dbEnabled, user: d.user, mode });
      if (mode === "account" && d.state) setStudyS(cleanState(d.state));
    }).catch(() => { /* offline: stay local */ });
  }, []);

  // Save: always to this browser; to the account when signed in. Shared paths are pushed separately.
  const saveT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastShared = useRef("");
  const persist = useCallback((s: StudyState) => {
    try { localStorage.setItem("insight-state", JSON.stringify(s)); } catch { /* ignore */ }
    if (saveT.current) clearTimeout(saveT.current);
    saveT.current = setTimeout(async () => {
      if (meRef.current.mode !== "account") return;
      try {
        const r = await fetch("/api/me", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(s) });
        setSaveError(r.ok ? "" : "Couldn't save to your account; your changes are kept in this browser.");
        const shared = JSON.stringify(s.paths.filter((p) => p.shared).map(({ id, title, steps }) => ({ id, title, steps })));
        if (shared !== lastShared.current) {
          const r2 = await fetch("/api/paths", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ paths: JSON.parse(shared) }) });
          if (r2.ok) lastShared.current = shared;
        }
      } catch { setSaveError("Couldn't reach the server; your changes are kept in this browser."); }
    }, 800);
  }, []);
  const setStudy = useCallback((fn: (s: StudyState) => StudyState) => {
    setStudyS((prev) => { const next = fn(prev); persist(next); return next; });
  }, [persist]);
  const setHow = useCallback((b: boolean) => { setHowS(b); try { localStorage.setItem("insight-how", b ? "1" : "0"); } catch { /* ignore */ } }, []);
  const select = useCallback((id: string, o?: boolean) => { setSel(id); if (o) setOpen(true); }, []);
  const closePanel = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const el = top.current; if (!el) return;
    const ro = new ResizeObserver(() => document.documentElement.style.setProperty("--th", el.offsetHeight + "px"));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); }; addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, []);

  const value = useMemo(() => ({ sel, select, how, setHow, study, setStudy, me, saveError, closePanel }), [sel, select, how, setHow, study, setStudy, me, saveError, closePanel]);
  return (
    <AppCtx.Provider value={value}>
      <header className="top" ref={top}>
        <div className="row1">
          <Link href="/read/Gal/5" className="brand">In-<span>si</span>ght</Link>
          <nav className="tabs" aria-label="Views">
            {TABS.map(([href, label]) => <Link key={href} href={href === "/read" ? "/read/Gal/5" : href} aria-current={path.startsWith(href) ? "page" : undefined}>{label}</Link>)}
          </nav>
          <Search onPick={(id, chapterHref) => { if (chapterHref) router.push(chapterHref); if (id) select(id, true); }} />
        </div>
      </header>
      <div className="wrap">
        <main className="main">{children}</main>
        <aside className={"panel" + (open ? " open" : "")} aria-label="Verse insight"><Panel /></aside>
      </div>
      <div className={"scrim" + (open ? " on" : "")} onClick={() => setOpen(false)} />
    </AppCtx.Provider>
  );
}
