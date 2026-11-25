"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { canon, full } from "@/lib/books";
import { getVerses } from "@/lib/client";
import { useApp } from "../Shell";

type Group = { uid: string; name: string; mine: boolean; paths: { id: string; title: string; steps: { r: string; n: string }[] }[] };

export function Mine() {
  const { study, setStudy, me, select, saveError } = useApp();
  const [tx, setTx] = useState<Record<string, { t: string }>>({});
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [confirm, setConfirm] = useState("");
  const marks = Object.entries(study.marks).sort((a, b) => canon(a[0]) - canon(b[0]));
  useEffect(() => { getVerses(marks.map(([id]) => id)).then(setTx); }, [study.marks]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (me.mode === "account") fetch("/api/paths").then((r) => r.json()).then((d) => setGroups(d.groups || [])).catch(() => setGroups([])); }, [me.mode]);

  const edit = (pid: string, fn: (p: (typeof study.paths)[number]) => void) => setStudy((s) => ({ ...s, paths: s.paths.map((p) => { if (p.id !== pid) return p; const c = { ...p, steps: p.steps.map((x) => ({ ...x })) }; fn(c); return c; }) }));
  const others = (groups || []).filter((g) => !g.mine);
  return (
    <div>
      <h2 className="vh">My study</h2>
      <p className="store">
        {me.mode === "account" ? <>Signed in as {me.user?.name}. Saved to your account, private to you. <a href="/api/auth/signout">Sign out</a></>
          : me.authEnabled ? <>Saved in this browser only. <a href="/api/auth/signin">Sign in with GitHub</a> to keep it across devices and share paths.</>
          : <>Saved in this browser only. Account sign-in isn&apos;t set up on this deployment.</>}
      </p>
      {saveError && <p className="status">{saveError}</p>}
      <div className="box">
        <h3>Highlights and notes</h3>
        {marks.length ? marks.map(([id, m]) => (
          <div className="hlrow" key={id}>
            <i style={{ ["--c" as string]: m.c ? `var(--h-${m.c})` : "var(--card)" }} />
            <button onClick={() => select(id, true)}><b>{full(id)}</b><p>{m.n || (tx[id]?.t ?? "")}</p></button>
          </div>
        )) : <p className="empty">Nothing yet. Open a verse and pick a colour or write a note.</p>}
      </div>
      <h3 className="lab big">Study paths</h3>
      {study.paths.map((p) => (
        <div className="box" key={p.id}>
          <input className="in" value={p.title} aria-label="Path title" onChange={(e) => edit(p.id, (x) => { x.title = e.target.value.slice(0, 120); })} />
          {p.steps.length ? p.steps.map((s, i) => (
            <div className="pstep" key={s.r}>
              <button className="lnk" style={{ textAlign: "left" }} onClick={() => select(s.r, true)}>{i + 1}. {full(s.r)}</button>
              <div className="acts">
                <button aria-label="Move up" disabled={!i} onClick={() => edit(p.id, (x) => { [x.steps[i - 1], x.steps[i]] = [x.steps[i], x.steps[i - 1]]; })}>↑</button>
                <button aria-label="Move down" disabled={i === p.steps.length - 1} onClick={() => edit(p.id, (x) => { [x.steps[i + 1], x.steps[i]] = [x.steps[i], x.steps[i + 1]]; })}>↓</button>
                <button aria-label="Remove" onClick={() => edit(p.id, (x) => { x.steps.splice(i, 1); })}>✕</button>
              </div>
              <input className="in" value={s.n} placeholder="Why this verse belongs here" aria-label="Step note" onChange={(e) => edit(p.id, (x) => { x.steps[i].n = e.target.value.slice(0, 1000); })} />
            </div>
          )) : <p className="empty">No verses yet. Use “Add to path” in the insight panel.</p>}
          <div className="rowf">
            {p.steps.length > 0 && <Link className="btn" href={`/threads?path=${p.id}`}>Walk path</Link>}
            {me.mode === "account" && <button className="btn ghost" aria-pressed={p.shared} onClick={() => edit(p.id, (x) => { x.shared = !x.shared; })}>{p.shared ? "Shared with group ✓" : "Share with group"}</button>}
            <button className="btn ghost" onClick={() => { if (confirm !== p.id) { setConfirm(p.id); return; } setConfirm(""); setStudy((s) => ({ ...s, paths: s.paths.filter((x) => x.id !== p.id) })); }}>{confirm === p.id ? "Confirm delete" : "Delete"}</button>
          </div>
        </div>
      ))}
      <div className="rowf" style={{ marginBottom: 22 }}>
        <button className="btn ghost" onClick={() => setStudy((s) => ({ ...s, paths: [...s.paths, { id: "p" + Date.now().toString(36), title: "Untitled path", shared: false, steps: [] }] }))}>New path</button>
      </div>
      <div className="box">
        <h3>Group paths</h3>
        {me.mode !== "account" ? <p className="empty">Sign in to see and share study paths with others.</p>
          : groups === null ? <p className="empty">Loading…</p>
          : others.length ? others.flatMap((g) => g.paths.map((p) => (
            <div className="hlrow" key={g.uid + p.id}>
              <i style={{ ["--c" as string]: "var(--apostle)" }} />
              <div style={{ flex: 1 }}><b>{p.title}</b><p>{g.name} · {p.steps.length} verse{p.steps.length === 1 ? "" : "s"}</p></div>
              <Link className="btn ghost" href={`/threads?g=${encodeURIComponent(g.uid + "|" + p.id)}`}>Walk</Link>
            </div>
          ))) : <p className="empty">No one else has shared a path yet.</p>}
      </div>
    </div>
  );
}
