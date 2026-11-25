"use client";
import { useEffect, useMemo, useState } from "react";
import { BOOK, full, fmt } from "@/lib/books";
import { getQuotes, getVerses } from "@/lib/client";
import { PAIRS } from "@/lib/content";
import { useApp } from "../Shell";
import { RefChips, diff } from "../ui";

type P = { a: string; b: string; n: string; x?: string[]; votes?: number };

export function Compare() {
  const [auto, setAuto] = useState<P[]>([]);
  const [book, setBook] = useState("");
  const [shown, setShown] = useState(20);
  useEffect(() => { getQuotes().then((q) => setAuto(q.map((x) => ({ a: x.ot, b: x.nt, n: "", votes: x.votes })))).catch(() => {}); }, []);
  const curatedKeys = useMemo(() => new Set(PAIRS.map((p) => p.a + ">" + p.b)), []);
  const autos = auto.filter((p) => !curatedKeys.has(p.a + ">" + p.b) && (!book || p.b.startsWith(book + ".")));
  const books = [...new Set(auto.map((p) => p.b.split(".")[0]))];
  return (
    <div>
      <h2 className="vh">Then &amp; now</h2>
      <p className="sub">When a later writer quotes an earlier text, what they keep and what they change is often where the insight is. Words are compared one by one.</p>
      <div className="dkey"><span className="del">Only in the earlier text</span><span className="ins">Only in the later text</span></div>
      <h3 className="lab big">Curated comparisons</h3>
      {PAIRS.map((p) => <PairCard key={p.a + p.b} p={p} />)}
      <h3 className="lab big">Detected quotations <small>{autos.length} New Testament verses that repeat Old Testament wording</small></h3>
      <div className="ctl">
        <label htmlFor="cb">Book</label>
        <select id="cb" value={book} onChange={(e) => { setBook(e.target.value); setShown(20); }}>
          <option value="">All books</option>
          {books.map((b) => <option key={b} value={b}>{BOOK[b]?.name}</option>)}
        </select>
      </div>
      {autos.slice(0, shown).map((p) => <PairCard key={p.a + p.b} p={p} />)}
      {shown < autos.length && <button className="btn ghost" onClick={() => setShown(shown + 20)}>Show more</button>}
    </div>
  );
}

function PairCard({ p }: { p: P }) {
  const { select } = useApp();
  const [tx, setTx] = useState<Record<string, { t: string }>>({});
  useEffect(() => { getVerses([p.a, p.b]).then(setTx); }, [p.a, p.b]);
  const a = tx[p.a]?.t, b = tx[p.b]?.t;
  const [da, db] = a && b ? diff(a, b) : [null, null];
  return (
    <div className="pair">
      <h3>{full(p.a)} → {full(p.b)}</h3>
      <div className="cols">
        <div><cite>Then · {fmt(p.a)}</cite>{da ?? "…"}</div>
        <div><cite>Now · {fmt(p.b)}</cite>{db ?? "…"}</div>
      </div>
      {p.n ? <p className="n">{p.n}</p> : <p className="strx">Detected automatically: the wording matches closely{p.votes ? `, and ${p.votes} readers linked these verses on OpenBible.info` : ""}.</p>}
      {p.x && <p className="n">Next verses: <RefChips ids={p.x} /></p>}
      <div className="rowf"><button className="lnk" onClick={() => select(p.a, true)}>Open {fmt(p.a)}</button><button className="lnk" onClick={() => select(p.b, true)}>Open {fmt(p.b)}</button></div>
    </div>
  );
}
