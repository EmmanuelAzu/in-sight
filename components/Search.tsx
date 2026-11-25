"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { full, parseRef } from "@/lib/books";

type Res = { verses: { id: string; t: string }[]; words: [string, string, string, string, number][] };

export function Search({ onPick }: { onPick: (id: string | null, chapterHref?: string) => void }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Res | null>(null);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const s = q.trim();
    if (s.length < 2) { setRes(null); return; }
    const ctl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(s)}`, { signal: ctl.signal }).then((r) => r.json()).then((d: Res) => { setRes(d); setOpen(true); }).catch(() => {});
    }, 220);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q]);
  useEffect(() => {
    const f = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("click", f); return () => document.removeEventListener("click", f);
  }, []);

  const ref = parseRef(q);
  const done = () => { setQ(""); setOpen(false); setRes(null); };
  return (
    <div className="search" ref={box}>
      <input type="search" value={q} placeholder="Search, or type John 3:16" aria-label="Search the Bible" autoComplete="off"
        onChange={(e) => setQ(e.target.value)} onFocus={() => res && setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && ref) { onPick(ref.v ? `${ref.b}.${ref.c}.${ref.v}` : null, `/read/${ref.b}/${ref.c}${ref.v ? `#v${ref.v}` : ""}`); done(); }
        }} />
      {open && (res || ref) && (
        <div className="results on">
          {ref && <button onClick={() => { onPick(ref.v ? `${ref.b}.${ref.c}.${ref.v}` : null, `/read/${ref.b}/${ref.c}${ref.v ? `#v${ref.v}` : ""}`); done(); }}><b>Go to</b><span>{ref.v ? full(`${ref.b}.${ref.c}.${ref.v}`) : `${full(`${ref.b}.${ref.c}.1`).replace(/:1$/, "")}`}</span></button>}
          {res?.words.map(([s, l, tl, g, n]) => (
            <button key={s} onClick={() => { router.push(`/words?s=${s}`); done(); }}><b>Word study · {s} · {n} uses</b><span>{l} · {tl} · {g}</span></button>
          ))}
          {res?.verses.map((v) => (
            <button key={v.id} onClick={() => { onPick(v.id); done(); }}><b>{full(v.id)}</b><span>{v.t}</span></button>
          ))}
          {res && !res.verses.length && !res.words.length && !ref && <p className="empty" style={{ padding: "10px 14px", margin: 0 }}>Nothing matches.</p>}
        </div>
      )}
    </div>
  );
}
