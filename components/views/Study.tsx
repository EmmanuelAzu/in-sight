"use client";
import { useEffect, useState } from "react";
import { BOOK, full } from "@/lib/books";
import { TAGS, TAG_LABEL, type Tag } from "@/lib/types";
import { useApp } from "../Shell";
import { Dots } from "../ui";

const PRESETS: [string, Tag[], "all" | "any"][] = [
  ["God's direct speech in the prophets", ["god", "prophecy"], "all"],
  ["Every prayer", ["prayer"], "all"],
  ["Jesus drawing on the Old Testament", ["jesus", "ot"], "all"],
  ["Apostles reading earlier scripture", ["apostle", "ot"], "all"],
  ["The disciple's witness (John)", ["disciple"], "all"],
];
type Res = { total: number; all: number; items: { id: string; t: string; tags: Tag[] }[]; byBook: Record<string, number> };

export function Study() {
  const { select } = useApp();
  const [cats, setCats] = useState<Tag[]>(["jesus", "ot"]);
  const [mode, setMode] = useState<"all" | "any">("all");
  const [book, setBook] = useState("");
  const [page, setPage] = useState(0);
  const [res, setRes] = useState<Res | null>(null);
  const [items, setItems] = useState<Res["items"]>([]);

  useEffect(() => { setPage(0); }, [cats, mode, book]);
  useEffect(() => {
    if (!cats.length) { setRes(null); setItems([]); return; }
    let live = true;
    fetch(`/api/study?tags=${cats.join(",")}&mode=${mode}&book=${book}&page=${page}`).then((r) => r.json()).then((d: Res) => {
      if (!live) return; setRes(d); setItems((prev) => (page === 0 ? d.items : [...prev, ...d.items]));
    }).catch(() => {});
    return () => { live = false; };
  }, [cats, mode, book, page]);

  const max = Math.max(1, ...Object.values(res?.byBook || {}));
  return (
    <div>
      <h2 className="vh">Study by speaker</h2>
      <p className="sub">Read across the whole Bible through one voice or kind of text. Tags are generated from the text (red letters, divine-speech formulas, who wrote a letter, quotations); each verse says how it was tagged.</p>
      <div className="chips">
        {PRESETS.map(([l, k, m]) => (
          <button key={l} className="chip" aria-pressed={m === mode && k.length === cats.length && k.every((x) => cats.includes(x))} onClick={() => { setCats(k); setMode(m); setBook(""); }}>{l}</button>
        ))}
      </div>
      <div className="ctl"><span className="lab">Types</span>
        {TAGS.map((k) => <button key={k} className="lg" style={{ ["--c" as string]: `var(--${k})` }} aria-pressed={cats.includes(k)} onClick={() => setCats((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]))}>{TAG_LABEL[k]}</button>)}
      </div>
      <div className="ctl"><span className="lab">Match</span>
        <button className="chip" aria-pressed={mode === "all"} onClick={() => setMode("all")}>All selected</button>
        <button className="chip" aria-pressed={mode === "any"} onClick={() => setMode("any")}>Any selected</button>
      </div>
      {res && (
        <>
          <p className="count">{res.all} verses across the Bible{book ? ` · ${res.total} in ${BOOK[book]?.name}` : ""}. Tap a book to narrow.</p>
          <div className="bars">
            {Object.entries(res.byBook).map(([b, n]) => (
              <button key={b} className={"bar" + (book === b ? " on" : "")} style={{ ["--c" as string]: `var(--${BOOK[b]?.t === "OT" ? "ot" : "nt"})` }} onClick={() => setBook(book === b ? "" : b)}>
                <span>{BOOK[b]?.name}</span><div style={{ width: (n / max) * 100 + "%" }} /><span>{n}</span>
              </button>
            ))}
          </div>
        </>
      )}
      <ul className="res">
        {items.map((v) => (
          <li key={v.id}><button onClick={() => select(v.id, true)}><b>{full(v.id)} <Dots tags={v.tags} /></b><span className={"t" + (v.tags.includes("jesus") ? " j" : "")}>{v.t}</span></button></li>
        ))}
      </ul>
      {!cats.length && <p className="empty">Pick at least one type.</p>}
      {res && items.length < res.total && <button className="btn ghost" onClick={() => setPage(page + 1)}>Show 50 more</button>}
      {res && !res.total && <p className="empty">No verses match. Try “Any selected”.</p>}
    </div>
  );
}
