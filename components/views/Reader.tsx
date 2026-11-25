"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BOOK } from "@/lib/books";
import { getBooks, getChapter } from "@/lib/client";
import { INSIGHTS } from "@/lib/content";
import { TAGS, TAG_HINT, TAG_LABEL, type BookInfo, type Chapter, type Tag } from "@/lib/types";
import { useApp } from "../Shell";
import { Dots, VerseText } from "../ui";

export function Reader({ b, c }: { b: string; c: number }) {
  const { sel, select, study } = useApp();
  const router = useRouter();
  const [books, setBooks] = useState<BookInfo[]>([]);
  const [ch, setCh] = useState<Chapter | null>(null);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState<Set<Tag>>(new Set());

  useEffect(() => { getBooks().then(setBooks).catch(() => {}); }, []);
  useEffect(() => {
    let live = true; setCh(null); setErr("");
    getChapter(b, c).then((d) => {
      if (!live) return;
      setCh(d);
      const hv = Number((location.hash.match(/^#v(\d+)$/) || [])[1]);
      const pick = hv && d.v.find((x) => x.n === hv) ? hv : (d.v.find((x) => INSIGHTS[`${b}.${c}.${x.n}`]) || d.v[0]).n;
      if (!sel.startsWith(`${b}.${c}.`) || hv) select(`${b}.${c}.${pick}`, !!hv);
      if (hv) setTimeout(() => document.getElementById("v" + hv)?.scrollIntoView({ block: "center" }), 50);
    }).catch(() => live && setErr("This chapter could not be loaded."));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b, c]);

  const info = books.find((x) => x.id === b);
  const nch = info?.ch.length || 0;
  const bi = books.findIndex((x) => x.id === b);
  const prev = c > 1 ? `/read/${b}/${c - 1}` : bi > 0 ? `/read/${books[bi - 1].id}/${books[bi - 1].ch.length}` : null;
  const next = c < nch ? `/read/${b}/${c + 1}` : bi >= 0 && bi < books.length - 1 ? `/read/${books[bi + 1].id}/1` : null;
  const counts = Object.fromEntries(TAGS.map((k) => [k, ch?.v.filter((v) => v.tags?.includes(k)).length || 0]));

  return (
    <div>
      <div className="nav">
        <select aria-label="Book" value={b} onChange={(e) => router.push(`/read/${e.target.value}/1`)}>
          {books.length ? books.map((x) => <option key={x.id} value={x.id}>{x.name}</option>) : <option value={b}>{BOOK[b]?.name || b}</option>}
        </select>
        <select aria-label="Chapter" value={c} onChange={(e) => router.push(`/read/${b}/${e.target.value}`)}>
          {Array.from({ length: nch || c }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
        </select>
        {prev ? <Link className="btn ghost" href={prev} aria-label="Previous chapter">←</Link> : null}
        {next ? <Link className="btn ghost" href={next} aria-label="Next chapter">→</Link> : null}
      </div>
      <div className="legend">
        {TAGS.map((k) => (
          <button key={k} className="lg" style={{ ["--c" as string]: `var(--${k})` }} aria-pressed={filter.has(k)} disabled={!counts[k]} title={TAG_HINT[k] || TAG_LABEL[k]}
            onClick={() => setFilter((f) => { const n = new Set(f); if (n.has(k)) n.delete(k); else n.add(k); return n; })}>
            {TAG_LABEL[k]} <em>{counts[k]}</em>
          </button>
        ))}
      </div>
      <h1>{BOOK[b]?.name === "Psalms" ? "Psalm" : BOOK[b]?.name} {c}</h1>
      {err && <p className="empty">{err}</p>}
      {!ch && !err && <p className="empty">Loading…</p>}
      {ch?.title && <p className={"ptitle" + (sel === `${b}.${c}.title` ? " sel" : "")} onClick={() => select(`${b}.${c}.title`, true)}>{ch.title}</p>}
      <div className="verses">
        {ch?.v.map((v) => {
          const id = `${b}.${c}.${v.n}`, ins = INSIGHTS[id], m = study.marks[id];
          const dim = filter.size > 0 && ![...filter].some((k) => v.tags?.includes(k));
          return (
            <p key={v.n} id={"v" + v.n} className={["v", id === sel && "sel", dim && "dim", m?.c && "hl-" + m.c].filter(Boolean).join(" ")}
              tabIndex={0} role="button" aria-label={`Verse ${v.n}`}
              onClick={() => select(id, true)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(id, true); } }}>
              <sup>{v.n}</sup><VerseText t={v.t} red={v.red} it={v.it} phrase={ins?.ph} />
              <Dots tags={v.tags} />
              {ins && <span className="has">insight</span>}
              {m?.n && <span className="pen">✎ note</span>}
            </p>
          );
        })}
      </div>
      {ch && <p className="foot">King James Version (public domain). Red letters and italics (words the translators supplied) follow the KJV source text. Coloured dots are generated tags; open a verse and turn on “How we know this” to see why each was given.</p>}
    </div>
  );
}
