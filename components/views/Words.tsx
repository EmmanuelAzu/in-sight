"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BOOK, full } from "@/lib/books";
import { getLex, getVerses } from "@/lib/client";
import { CONTRAST, WORD_NOTES } from "@/lib/content";
import type { LexEntry } from "@/lib/types";
import { useApp } from "../Shell";
import { RefChips } from "../ui";

export function Words() {
  const sp = useSearchParams();
  const router = useRouter();
  const { select } = useApp();
  const s = (sp.get("s") || "G2590").toUpperCase();
  const [lex, setLex] = useState<LexEntry | null | undefined>(undefined);
  const [curated, setCurated] = useState<Record<string, LexEntry>>({});
  const [shown, setShown] = useState(30);
  const [tx, setTx] = useState<Record<string, { t: string }>>({});
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<[string, string, string, string, number][]>([]);

  useEffect(() => { Promise.all(Object.keys(WORD_NOTES).map(async (k) => [k, await getLex(k)] as const)).then((a) => setCurated(Object.fromEntries(a.filter(([, v]) => v) as [string, LexEntry][]))); }, []);
  useEffect(() => { setLex(undefined); setShown(30); getLex(s).then(setLex); }, [s]);
  useEffect(() => { if (lex) getVerses(lex.occ.slice(0, shown)).then(setTx); }, [lex, shown]);
  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    const t = setTimeout(() => fetch(`/api/search?q=${encodeURIComponent(q.trim())}`).then((r) => r.json()).then((d) => setHits(d.words || [])).catch(() => {}), 220);
    return () => clearTimeout(t);
  }, [q]);

  const he = s.startsWith("H");
  const note = WORD_NOTES[s];
  const con = CONTRAST.find((c) => c[0] === s || c[1] === s);
  const max = Math.max(1, ...Object.values(lex?.bb || {}));
  const card = (k: string) => {
    const e = curated[k]; if (!e) return null;
    return <button key={k} className="wbtn" aria-pressed={k === s} onClick={() => router.push(`/words?s=${k}`)}>
      <span className={"o" + (k.startsWith("H") ? " he" : "")} dir={k.startsWith("H") ? "rtl" : undefined}>{e.l}</span><small>{e.tl} · {e.g}</small></button>;
  };
  return (
    <div>
      <h2 className="vh">Words</h2>
      <p className="sub">The Greek and Hebrew behind the English, and where each word is used across the Bible. This is the lexical layer (stage 2), kept apart from the scripture-only context. Lexicon data: STEPBible.org, CC BY 4.0.</p>
      <div className="ctl">
        <input className="in" style={{ maxWidth: 360 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a word: agape, ruach, G26, love…" aria-label="Find a word" />
      </div>
      {hits.length > 0 && <div className="wgrid">{hits.map(([k, l, tl, g, n]) => <button key={k} className="wbtn" onClick={() => { router.push(`/words?s=${k}`); setQ(""); }}><span className={"o" + (k.startsWith("H") ? " he" : "")}>{l}</span><small>{tl} · {g} · {n}×</small></button>)}</div>}
      <p className="lab">Curated words · Greek</p>
      <div className="wgrid">{Object.keys(WORD_NOTES).filter((k) => k.startsWith("G")).map(card)}</div>
      <p className="lab">Curated words · Hebrew</p>
      <div className="wgrid">{Object.keys(WORD_NOTES).filter((k) => k.startsWith("H")).map(card)}</div>

      <div className="wd">
        {lex === undefined && <p className="empty">Loading…</p>}
        {lex === null && <p className="empty">No entry for {s}.</p>}
        {lex && (
          <>
            <div className="wh"><span className={"orig" + (he ? " he" : "")} lang={he ? "he" : "grc"}>{lex.l}</span><span className="tl">{lex.tl}</span><span className="sn">{he ? "Hebrew" : "Greek"} · Strong&apos;s {s}</span></div>
            <p className="gl">{lex.g}</p>
            {note && <p className="n cur"><b>In-sight note:</b> {note.n} {note.also.length > 0 && <RefChips ids={note.also} />}</p>}
            <p className="n def">{lex.d}</p>
            <h3 className="lab big">Where it is used <small>{lex.n} times in {lex.nv} verses, by book</small></h3>
            <div className="bars">
              {Object.entries(lex.bb).map(([b, n]) => (
                <div key={b} className="bar" style={{ ["--c" as string]: `var(--${BOOK[b]?.t === "OT" ? "ot" : "nt"})` }}><span>{BOOK[b]?.name}</span><div style={{ width: (n / max) * 100 + "%" }} /><span>{n}</span></div>
              ))}
            </div>
            {con && (
              <>
                <h3 className="lab big">{con[2]}</h3>
                <div className="contrast">
                  {[con[0], con[1]].map((k) => (
                    <div key={k}>
                      <span className="orig">{curated[k]?.l}</span> <span className="tl">{curated[k]?.tl}</span>
                      <p className="n">{curated[k]?.g} · {curated[k]?.n ?? 0} uses</p>
                      {k !== s && <button className="lnk" onClick={() => router.push(`/words?s=${k}`)}>Open →</button>}
                    </div>
                  ))}
                </div>
              </>
            )}
            <h3 className="lab big">Verses</h3>
            <ul className="res">
              {lex.occ.slice(0, shown).map((id) => <li key={id}><button onClick={() => select(id, true)}><b>{full(id)}</b><span className="t">{tx[id]?.t ?? "…"}</span></button></li>)}
            </ul>
            {shown < lex.occ.length && <button className="btn ghost" onClick={() => setShown(shown + 30)}>Show more</button>}
            {lex.nv > lex.occ.length && shown >= lex.occ.length && <p className="strx">Showing the first {lex.occ.length} of {lex.nv} verses.</p>}
          </>
        )}
      </div>
    </div>
  );
}
