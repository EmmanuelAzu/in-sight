"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ORDER, fmt, full } from "@/lib/books";
import { getVerses } from "@/lib/client";
import { THREADS } from "@/lib/content";
import type { Strength, Tag } from "@/lib/types";
import { useApp } from "../Shell";
import { Dots, StrPill, firstTag } from "../ui";

type Step = { r: string; s: Strength | ""; n: string; via?: string | null; t?: string; tags?: Tag[] };
type Group = { uid: string; name: string; mine: boolean; paths: { id: string; title: string; steps: { r: string; n: string }[] }[] };

export function Threads() {
  const sp = useSearchParams();
  const router = useRouter();
  const { select, sel, study, me } = useApp();
  const trace = sp.get("trace"), pid = sp.get("path"), gid = sp.get("g");
  const cur = sp.get("t") || (!trace && !pid && !gid ? "fruit" : "");
  const [steps, setSteps] = useState<Step[]>([]);
  const [meta, setMeta] = useState({ title: "", d: "", trace: false });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let live = true;
    const fill = async (st: Step[], title: string, d: string, tr = false) => {
      const tx = await getVerses(st.map((s) => s.r));
      if (live) { setSteps(st.map((s) => ({ ...s, t: s.t ?? tx[s.r]?.t, tags: s.tags ?? tx[s.r]?.tags }))); setMeta({ title, d, trace: tr }); setLoading(false); }
    };
    setLoading(true);
    if (trace) {
      fetch(`/api/trace?id=${encodeURIComponent(trace)}`).then((r) => r.json()).then((d: { steps?: (Step & { v: number })[] }) => {
        fill((d.steps || []).map((s) => ({ ...s, n: s.via ? `Linked to ${fmt(s.via)}${s.v ? ` · ${s.v} reader votes` : ""}` : "Starting verse." })), "Traced from " + full(trace), "Every verse linked to it within two steps, strongest links first, laid out in canonical order.", true);
      }).catch(() => { if (live) { setSteps([]); setMeta({ title: "Trace failed", d: "Try again.", trace: true }); setLoading(false); } });
    } else if (pid) {
      const p = study.paths.find((x) => x.id === pid);
      fill(p ? p.steps.map((s) => ({ r: s.r, s: "", n: s.n })) : [], p?.title || "Path not found", "Your study path, in the order you set.");
    } else if (gid) {
      fetch("/api/paths").then((r) => r.json()).then((d: { groups: Group[] }) => {
        const [u, id] = gid.split("|"); const g = d.groups.find((x) => x.uid === u); const p = g?.paths.find((x) => x.id === id);
        fill(p ? p.steps.map((s) => ({ r: s.r, s: "", n: s.n })) : [], p?.title || "Path not found", p ? `Shared by ${g!.name}.` : "It may no longer be shared.");
      }).catch(() => fill([], "Path not found", ""));
    } else {
      const t = THREADS.find((x) => x.id === cur) || THREADS[0];
      fill(t.s.map(([r, s, n]) => ({ r, s, n })), t.t, t.d);
    }
    return () => { live = false; };
  }, [trace, pid, gid, cur, study.paths]);

  return (
    <div>
      <h2 className="vh">{meta.title || "Threads"}</h2>
      <p className="sub">{meta.d} Threads run in canonical order, which is not always the order of writing.</p>
      <div className="chips">
        {THREADS.map((t) => <button key={t.id} className="chip" aria-pressed={cur === t.id} onClick={() => router.push(`/threads?t=${t.id}`)}>{t.t}</button>)}
        <button className="chip" aria-pressed={!!trace} onClick={() => router.push(`/threads?trace=${sel}`)}>Trace from {fmt(trace || sel)}</button>
        {study.paths.filter((p) => p.steps.length).map((p) => <button key={p.id} className="chip" aria-pressed={pid === p.id} onClick={() => router.push(`/threads?path=${p.id}`)}>My path: {p.title}</button>)}
      </div>
      {loading && <p className="empty">Loading…</p>}
      {!loading && steps.length > 0 && <CanonStrip steps={steps} onOpen={(r) => select(r, true)} />}
      {!loading && (steps.length ? (
        <ol className="tl-list">
          {steps.map((st, i) => (
            <li className="step" key={st.r + i} style={{ ["--c" as string]: `var(--${firstTag(st.tags) || "ink"})` }}>
              <span className="num">{i + 1}</span>
              {meta.trace ? (st.s ? <p className="via">{st.n} <StrPill s={st.s} /></p> : null) : (i > 0 && st.s ? <p className="via">Link from step {i}: <StrPill s={st.s} /></p> : null)}
              <div className="card">
                <h4>{full(st.r)} <Dots tags={st.tags} /></h4>
                <blockquote className={st.tags?.includes("jesus") ? "j" : ""}>{st.t ?? "…"}</blockquote>
                {!meta.trace && st.n && <p>{st.n}</p>}
                <button className="lnk" onClick={() => select(st.r, true)}>Open →</button>
              </div>
            </li>
          ))}
        </ol>
      ) : <p className="empty">{me.mode === "local" && gid ? "Sign in to see paths others have shared." : "No verses here yet. Add verses from the insight panel."}</p>)}
    </div>
  );
}

function CanonStrip({ steps, onOpen }: { steps: Step[]; onOpen: (r: string) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(700);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth || 700)); ro.observe(el); return () => ro.disconnect();
  }, []);
  const gap = (28 / Math.max(240, w)) * 100;
  const placed: { x: number; row: number; i: number; st: Step }[] = [];
  steps.forEach((st, i) => {
    const x = ((ORDER.indexOf(st.r.split(".")[0]) + 0.5) / 66) * 100;
    let row = 0;
    while (placed.some((q) => q.row === row && Math.abs(q.x - x) < gap)) row++;
    placed.push({ x, row, i, st });
  });
  const maxR = Math.max(0, ...placed.map((p) => p.row)), bt = maxR * 28 + 44;
  return (
    <div className="canon" ref={box} aria-hidden="true" style={{ ["--bt" as string]: bt + "px" }}>
      <div className="band ot" /><div className="band nt" />
      <span className="blab" style={{ left: 0 }}>Genesis</span>
      <span className="blab" style={{ left: "59.09%", transform: "translateX(-50%)" }}>Matthew</span>
      <span className="blab" style={{ right: 0 }}>Revelation</span>
      {placed.map((p) => (
        <button key={p.i} className="dot" tabIndex={-1} title={full(p.st.r)} onClick={() => onOpen(p.st.r)}
          style={{ left: p.x + "%", top: (maxR - p.row) * 28 + 6, ["--stem" as string]: p.row * 28 + 16 + "px", ["--c" as string]: `var(--${firstTag(p.st.tags) || "ink"})` }}>{p.i + 1}</button>
      ))}
    </div>
  );
}
