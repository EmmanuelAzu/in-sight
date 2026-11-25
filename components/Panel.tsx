"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { canon, chapterKey, fmt, full, parts, readHref, target, testament } from "@/lib/books";
import { getLex, getQuotes, getVerses, getWords, verseFromChapter } from "@/lib/client";
import { CONTEXTS, INSIGHTS, PAIRS, WORD_NOTES } from "@/lib/content";
import { STRENGTH, TAG_HINT, TAG_LABEL, TAGS, type Chapter, type LexEntry, type Link as Lnk, type Strength, type Tag, type Verse, type Word } from "@/lib/types";
import { useApp } from "./Shell";
import { ContextLine, Dots, StrPill, VerseText, diff, firstTag } from "./ui";

type VT = Record<string, { t: string; tags: Tag[] }>;

export function Panel() {
  const { sel, how, setHow, closePanel } = useApp();
  const [data, setData] = useState<{ ch: Chapter; verse: Verse | null; title: string } | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    let live = true; setErr("");
    verseFromChapter(sel).then((d) => { if (live) setData(d); }).catch(() => { if (live) setErr("This verse could not be loaded."); });
    return () => { live = false; };
  }, [sel]);
  if (err) return <p className="empty">{err}</p>;
  if (!data) return <p className="empty">Loading…</p>;
  const v = data.verse;
  const text = v ? v.t : data.title;
  const tags = v?.tags || [];
  const ins = INSIGHTS[sel];
  const ctx = CONTEXTS[chapterKey(sel)];
  return (
    <div>
      <div className="ph">
        <div>
          <h2 className="ref">{full(sel)}</h2>
          <button className="how" aria-pressed={how} onClick={() => setHow(!how)}>How we know this</button>
        </div>
        <button className="close" aria-label="Close" onClick={closePanel}>×</button>
      </div>
      <div className="tags">
        {tags.length ? tags.map((k) => <span key={k} className="tag" style={{ ["--c" as string]: `var(--${k})` }} title={TAG_HINT[k] || ""}>{TAG_LABEL[k]}</span>) : <span className="tag" style={{ ["--c" as string]: "var(--mute)" }}>Narrative</span>}
      </div>
      {how && tags.length > 0 && <ul className="methods">{tags.map((k) => <li key={k}><b>{TAG_LABEL[k]}:</b> {v?.tm?.[k] || "Curated."}</li>)}</ul>}
      <p className="vt"><VerseText t={text} red={v?.red} it={v?.it} phrase={ins?.ph} /></p>
      {ins?.ph && <p className="key">Key phrase: <b>{ins.ph}</b></p>}
      <p className="rowf"><Link className="lnk" href={readHref(sel)} onClick={closePanel}>Read in context →</Link></p>

      <section className="s">
        <h3>Who, to whom, and what was happening <small>scripture only</small></h3>
        {ctx ? (
          <>
            <dl className="who"><dt>Speaking</dt><dd>{ctx.sp}</dd></dl>
            <p className="lab">Writer</p><ContextLine line={ctx.wr} how={how} />
            <p className="lab">Audience</p><ContextLine line={ctx.au} how={how} />
            <p className="lab">On the ground</p>{ctx.gr.map((l, i) => <ContextLine key={i} line={l} how={how} />)}
          </>
        ) : (
          <p className="empty">A context card for {full(sel).replace(/:\d+$|\s\(title\)$/, "")} hasn't been written yet. The speaker tags above are generated from the text; turn on “How we know this” to see how.</p>
        )}
        {ins?.n.length ? <><p className="lab">This verse</p>{ins.n.map((l, i) => <ContextLine key={i} line={l} how={how} />)}</> : null}
      </section>

      <ThenNow id={sel} />
      {ins?.r.length ? <section className="s"><h3>Roots in earlier scripture <small>curated · {ins.r.length}</small></h3><Links list={ins.r} how={how} /></section> : null}
      {ins?.l.length ? <section className="s"><h3>Taken up later <small>curated · {ins.l.length}</small></h3><Links list={ins.l} how={how} /></section> : null}
      {v?.x?.length ? <CrossRefs id={sel} x={v.x} skip={new Set([...(ins?.r || []), ...(ins?.l || [])].map((l) => l[0]))} how={how} /> : null}
      <p className="rowf"><Link className="btn ghost" href={`/threads?trace=${sel}`} onClick={closePanel}>Trace this thread →</Link></p>
      {!parts(sel).title && <Words id={sel} curated={ins?.w || []} />}
      <MyStudy id={sel} />
      <p className="prov">Context lines cite King James Version text only. Speaker tags and link strengths are generated from the text and from OpenBible.info reader votes, and say how. Greek and Hebrew come from STEPBible.org (CC BY) as a separate lexical layer.</p>
    </div>
  );
}

function ThenNow({ id }: { id: string }) {
  const [auto, setAuto] = useState<{ nt: string; ot: string }[]>([]);
  const [texts, setTexts] = useState<VT>({});
  const curated = useMemo(() => PAIRS.filter((p) => p.a === id || p.b === id), [id]);
  useEffect(() => { getQuotes().then((q) => setAuto(q.filter((x) => x.nt === id || x.ot === id).slice(0, 3))).catch(() => setAuto([])); }, [id]);
  const pairs = useMemo(() => {
    const seen = new Set(curated.map((p) => p.a + ">" + p.b));
    return [...curated.map((p) => ({ a: p.a, b: p.b, n: p.n })), ...auto.filter((q) => !seen.has(q.ot + ">" + q.nt)).map((q) => ({ a: q.ot, b: q.nt, n: "" }))];
  }, [curated, auto]);
  useEffect(() => { if (pairs.length) getVerses(pairs.flatMap((p) => [p.a, p.b])).then(setTexts); }, [pairs]);
  if (!pairs.length) return null;
  return (
    <section className="s">
      <h3>Then &amp; now</h3>
      {pairs.map((p) => {
        const a = texts[p.a]?.t, b = texts[p.b]?.t;
        if (!a || !b) return <p key={p.a + p.b} className="empty">Loading…</p>;
        const [da, db] = diff(a, b);
        return (
          <div className="pair" key={p.a + p.b}>
            <div className="cols"><div><cite>Then · {fmt(p.a)}</cite>{da}</div><div><cite>Now · {fmt(p.b)}</cite>{db}</div></div>
            {p.n ? <p className="n">{p.n}</p> : <p className="strx">Detected automatically from matching wording.</p>}
          </div>
        );
      })}
      <Link className="lnk" href="/compare">All comparisons →</Link>
    </section>
  );
}

function Links({ list, how }: { list: Lnk[]; how: boolean }) {
  const { select } = useApp();
  const [texts, setTexts] = useState<VT>({});
  useEffect(() => { getVerses(list.map((l) => l[0])).then(setTexts); }, [list]);
  const groups = TAGS.map((k) => [k, list.filter((l) => l[1] === k).sort((a, b) => STRENGTH[b[3]].level - STRENGTH[a[3]].level)] as const).filter(([, l]) => l.length);
  return (
    <>
      {groups.map(([k, l]) => (
        <div className="grp" key={k} style={{ ["--c" as string]: `var(--${k})` }}>
          <p>{TAG_LABEL[k]}</p>
          {l.map(([r, , why, s]) => (
            <div className="root" key={r}>
              <header><h4>{full(r)} <StrPill s={s} /></h4><button className="lnk" onClick={() => select(r, true)}>Open →</button></header>
              <p>{why}</p>
              {how && <p className="strx">Link type: {STRENGTH[s].label}. {STRENGTH[s].desc}</p>}
              <q>{texts[r]?.t ?? "…"}</q>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

function CrossRefs({ id, x, skip, how }: { id: string; x: [string, number, Strength][]; skip: Set<string>; how: boolean }) {
  const { select } = useApp();
  const [texts, setTexts] = useState<VT>({});
  const list = x.filter(([t]) => !skip.has(target(t).id));
  useEffect(() => { getVerses(x.map(([t]) => t)).then(setTexts); }, [x]);
  if (!list.length) return null;
  const me = canon(id);
  const rows = (arr: typeof list) => arr.sort((a, b) => STRENGTH[b[2]].level - STRENGTH[a[2]].level || b[1] - a[1]).map(([t, votes, s]) => {
    const tg = target(t), tt = texts[tg.id];
    const k = firstTag(tt?.tags);
    return (
      <div className="root" key={t} style={{ ["--c" as string]: k ? `var(--${k})` : "var(--mute)" }}>
        <header><h4><span className="cdot" />{tg.label} <Dots tags={tt?.tags} /> <StrPill s={s} /></h4><button className="lnk" onClick={() => select(tg.id, true)}>Open →</button></header>
        {how && <p className="strx">{STRENGTH[s].desc} {votes} reader vote{votes === 1 ? "" : "s"} on OpenBible.info. {testament(tg.id) !== testament(id) ? `Crosses into the ${testament(tg.id) === "OT" ? "Old" : "New"} Testament.` : ""}</p>}
        <q>{tt?.t ?? "…"}</q>
      </div>
    );
  });
  const earlier = list.filter(([t]) => canon(t) < me), later = list.filter(([t]) => canon(t) > me);
  return (
    <>
      {earlier.length > 0 && <section className="s"><h3>Earlier scripture <small>cross-references · {earlier.length}</small></h3>{rows(earlier)}</section>}
      {later.length > 0 && <section className="s"><h3>Later scripture <small>cross-references · {later.length}</small></h3>{rows(later)}</section>}
    </>
  );
}

function Words({ id, curated }: { id: string; curated: string[] }) {
  const [words, setWords] = useState<Word[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [lex, setLex] = useState<LexEntry | null>(null);
  const p = parts(id);
  useEffect(() => { let live = true; setOpen(null); getWords(p.b, p.c).then((w) => { if (live) setWords(w[String(p.v)] || []); }).catch(() => live && setWords([])); return () => { live = false; }; }, [id, p.b, p.c, p.v]);
  useEffect(() => { if (open) getLex(open).then(setLex); else setLex(null); }, [open]);
  if (!words) return null;
  const he = testament(id) === "OT";
  return (
    <section className="s">
      <h3>Word study <span className="stage">Stage 2 · lexical</span></h3>
      {curated.length > 0 && <p className="strx">Curated notes on: {curated.map((s) => WORD_NOTES[s]?.translit || s).join(", ")}. Tap a word for its entry.</p>}
      <div className="wlist" dir={he ? "rtl" : "ltr"}>
        {words.map((w, i) => (
          <button key={i} className={"wchip" + (open === w[3] ? " on" : "") + (curated.includes(w[3]) ? " cur" : "")} onClick={() => setOpen(open === w[3] ? null : w[3])} dir="ltr">
            <span className={"o" + (he ? " he" : "")} lang={he ? "he" : "grc"}>{w[0]}</span>
            <small>{w[1]}</small>
            <small className="en">{w[2]}</small>
          </button>
        ))}
      </div>
      {open && (
        <div className="word">
          {lex ? (
            <>
              <div className="wh"><span className={"orig" + (he ? " he" : "")} lang={he ? "he" : "grc"}>{lex.l}</span><span className="tl">{lex.tl}</span><span className="sn">{he ? "Hebrew" : "Greek"} · Strong&apos;s {open}</span></div>
              <p className="gl">{lex.g}</p>
              {WORD_NOTES[open] && <p className="n cur">{WORD_NOTES[open].n}</p>}
              <p className="n def">{lex.d}</p>
              <p className="n">Used {lex.n} times in {lex.nv} verses. <Link className="lnk" href={`/words?s=${open}`}>Usage map →</Link></p>
            </>
          ) : <p className="empty">Loading…</p>}
        </div>
      )}
      {words.length === 0 && <p className="empty">No original-language data for this verse.</p>}
    </section>
  );
}

function MyStudy({ id }: { id: string }) {
  const { study, setStudy, me } = useApp();
  const m = study.marks[id] || { c: "", n: "" };
  const [pick, setPick] = useState("");
  const [ok, setOk] = useState("");
  useEffect(() => setOk(""), [id]);
  const setMark = (c: typeof m.c, n: string) => setStudy((s) => {
    const marks = { ...s.marks };
    if (!c && !n) delete marks[id]; else marks[id] = { c, n: n.slice(0, 4000) };
    return { ...s, marks };
  });
  const add = () => {
    const existing = pick === "__new" ? undefined : study.paths.find((x) => x.id === (pick || study.paths[study.paths.length - 1]?.id));
    const newId = "p" + Date.now().toString(36);
    const title = existing ? existing.title : "Study from " + fmt(id);
    setStudy((s) => {
      const paths = s.paths.map((p) => ({ ...p, steps: [...p.steps] }));
      let p = existing ? paths.find((x) => x.id === existing.id) : undefined;
      if (!p) { p = { id: newId, title, shared: false, steps: [] }; paths.push(p); }
      if (!p.steps.some((x) => x.r === id)) p.steps.push({ r: id, n: "" });
      return { ...s, paths };
    });
    if (!existing) setPick(newId);
    setOk(`Added to “${title}”`);
  };
  return (
    <section className="s">
      <h3>Your study <small>{me.mode === "account" ? "saved to your account" : "saved in this browser"}</small></h3>
      <div className="swatches" role="group" aria-label="Highlight colour">
        <button className="sw none" aria-pressed={!m.c} aria-label="No highlight" onClick={() => setMark("", m.n)}>∅</button>
        {(["gold", "green", "blue", "rose"] as const).map((c) => <button key={c} className="sw" style={{ ["--c" as string]: `var(--h-${c})` }} aria-pressed={m.c === c} aria-label={`${c} highlight`} onClick={() => setMark(c, m.n)} />)}
      </div>
      <textarea value={m.n} placeholder="Your note on this verse" aria-label="Your note" onChange={(e) => setMark(m.c, e.target.value)} />
      <div className="rowf">
        <select value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Study path">
          {study.paths.length === 0 && <option value="">New path</option>}
          {study.paths.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          {study.paths.length > 0 && <option value="__new">New path…</option>}
        </select>
        <button className="btn ghost" onClick={add}>Add to path</button>
        <span className="ok" aria-live="polite">{ok}</span>
      </div>
    </section>
  );
}
