"use client";
import { useEffect, useState, type ReactNode } from "react";
import { fmt, full } from "@/lib/books";
import { getVerse } from "@/lib/client";
import { STRENGTH, TAG_LABEL, TAG_PRIORITY, type Span, type Strength, type Tag } from "@/lib/types";
import { KIND } from "@/lib/content";
import { useApp } from "./Shell";

export function Dots({ tags }: { tags?: Tag[] }) {
  if (!tags?.length) return null;
  return <span className="dots">{tags.map((k) => <s key={k} style={{ ["--c" as string]: `var(--${k})` }} title={TAG_LABEL[k]} />)}</span>;
}
export const firstTag = (t?: Tag[]) => TAG_PRIORITY.find((k) => t?.includes(k));

export function StrPill({ s }: { s?: Strength | "" }) {
  if (!s) return null;
  const x = STRENGTH[s];
  return (
    <span className="str" title={x.desc}>
      <i>{[1, 2, 3, 4].map((n) => <b key={n} className={n <= x.level ? "on" : ""} />)}</i>
      {x.label}
    </span>
  );
}

/** Verse text with red-letter, italic (KJV supplied words) and key-phrase spans. */
export function VerseText({ t, red, it, phrase }: { t: string; red?: Span[]; it?: Span[]; phrase?: string }) {
  const cuts = new Set<number>([0, t.length]);
  const mk: Span[] = [];
  if (phrase) { const i = t.toLowerCase().indexOf(phrase.toLowerCase()); if (i >= 0) mk.push([i, i + phrase.length]); }
  for (const s of [...(red || []), ...(it || []), ...mk]) { cuts.add(Math.max(0, Math.min(t.length, s[0]))); cuts.add(Math.max(0, Math.min(t.length, s[1]))); }
  const pts = [...cuts].sort((a, b) => a - b);
  const inAny = (spans: Span[] | undefined, a: number) => !!spans?.some(([s, e]) => a >= s && a < e);
  const out: ReactNode[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    if (a === b) continue;
    const cls = [inAny(red, a) && "j", inAny(it, a) && "kit"].filter(Boolean).join(" ");
    let node: ReactNode = t.slice(a, b);
    if (inAny(mk, a)) node = <mark>{node}</mark>;
    out.push(cls ? <span key={i} className={cls}>{node}</span> : <span key={i}>{node}</span>);
  }
  return <>{out}</>;
}

/** A citation chip that opens the verse text inline; "Open" shows it in the panel. */
export function RefChips({ ids }: { ids: string[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const [text, setText] = useState("");
  const { select } = useApp();
  if (!ids.length) return null;
  return (
    <>
      {ids.map((r) => (
        <button key={r} className="rc" aria-expanded={open === r} onClick={async () => {
          if (open === r) { setOpen(null); return; }
          setOpen(r); setText("…");
          const v = await getVerse(r); setText(v?.t || "Text not found.");
        }}>{fmt(r)}</button>
      ))}
      {open && (
        <blockquote className="qt"><cite>{full(open)} · KJV</cite>{text}<br />
          <button className="lnk" onClick={() => select(open, true)}>Open →</button>
        </blockquote>
      )}
    </>
  );
}

/** One context line: stated or interpreted, with its citations (expanded when "How we know this" is on). */
export function ContextLine({ line, how }: { line: [string, string[], "s" | "i"]; how: boolean }) {
  const [t, refs, kind] = line;
  return (
    <div className="note">
      {how && <span className={`kind ${kind}`}>{KIND[kind]}</span>}
      {t} {!how && <RefChips ids={refs} />}
      {how && (refs.length ? refs.map((r) => <Quote key={r} id={r} />) : <p className="strx">No verse is cited: the text is silent on this point.</p>)}
    </div>
  );
}
export function Quote({ id }: { id: string }) {
  const [t, setT] = useState<string | null>(null);
  useEffect(() => { let live = true; getVerse(id).then((v) => { if (live) setT(v?.t || ""); }); return () => { live = false; }; }, [id]);
  return <blockquote className="qt"><cite>{full(id)} · KJV</cite>{t ?? "…"}</blockquote>;
}

/** Word-by-word comparison of an earlier and a later text. */
export function diff(a: string, b: string) {
  const A = a.split(/\s+/), B = b.split(/\s+/), nm = (w: string) => w.toLowerCase().replace(/[^a-z]/g, "");
  const m = A.length, n = B.length;
  const L = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) L[i][j] = nm(A[i]) && nm(A[i]) === nm(B[j]) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const ka = new Array<boolean>(m).fill(false), kb = new Array<boolean>(n).fill(false);
  let i = 0, j = 0;
  while (i < m && j < n) {
    if (nm(A[i]) && nm(A[i]) === nm(B[j])) { ka[i] = kb[j] = true; i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++;
  }
  const render = (W: string[], K: boolean[], cls: string) => W.map((w, x) => (
    <span key={x}>{x ? " " : ""}{K[x] || !nm(w) ? w : <span className={cls}>{w}</span>}</span>
  ));
  return [render(A, ka, "del"), render(B, kb, "ins")] as const;
}
