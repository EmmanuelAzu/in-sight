"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Arcs = { books: [string, string, number, number][]; verses: number[]; all: number[]; strong: number[] };

/** Hue by distance: neighbouring chapters red, opposite ends of the Bible violet. */
const hue = (d: number) => Math.round(d * 285);

export function Rainbow() {
  const router = useRouter();
  const wrap = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const base = useRef<HTMLCanvasElement | null>(null);
  const [data, setData] = useState<Arcs | null>(null);
  const [mode, setMode] = useState<"all" | "strong">("all");
  const [w, setW] = useState(0);
  const [hover, setHover] = useState<number | null>(null); // book index
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
  const [drawn, setDrawn] = useState(0);
  const ptr = useRef("mouse");

  useEffect(() => { fetch("/data/arcs.json").then((r) => r.json()).then(setData).catch(() => {}); }, []);
  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.round(el.clientWidth))); ro.observe(el); return () => ro.disconnect();
  }, []);

  const N = data?.verses.length || 1189;
  const pad = 10;
  const H = Math.round(Math.max(220, w * 0.5) + 64);
  const base0 = H - 58; // baseline: arcs above, chapter bars below
  const X = (i: number) => pad + ((i + 0.5) / N) * (w - 2 * pad);

  const arcs = useMemo(() => {
    if (!data) return null;
    const src = mode === "all" ? data.all : data.strong;
    const out: { a: number; b: number; n: number }[] = [];
    for (let i = 0; i < src.length; i += 3) out.push({ a: src[i], b: src[i + 1], n: src[i + 2] });
    out.sort((p, q) => q.b - q.a - (p.b - p.a)); // long arcs first, short bright ones on top
    return out;
  }, [data, mode]);
  const bookOf = useMemo(() => {
    const m = new Int16Array(N);
    data?.books.forEach(([, , s, n], bi) => { for (let k = s; k < s + n; k++) m[k] = bi; });
    return m;
  }, [data, N]);
  const stats = useMemo(() => {
    if (!data || !arcs) return null;
    const links = new Array(data.books.length).fill(0);
    const partner = data.books.map(() => new Map<number, number>());
    for (const { a, b, n } of arcs) {
      const ba = bookOf[a], bb = bookOf[b];
      links[ba] += n; if (bb !== ba) { links[bb] += n; partner[ba].set(bb, (partner[ba].get(bb) || 0) + n); partner[bb].set(ba, (partner[bb].get(ba) || 0) + n); }
    }
    return { links, partner, total: arcs.reduce((s, x) => s + x.n, 0) };
  }, [data, arcs, bookOf]);

  const arc = (ctx: CanvasRenderingContext2D, a: number, b: number) => {
    const x1 = X(a), x2 = X(b), r = (x2 - x1) / 2;
    ctx.beginPath(); ctx.arc(x1 + r, base0, r, Math.PI, 2 * Math.PI); ctx.stroke();
  };

  // Draw the full diagram progressively into an offscreen canvas.
  useEffect(() => {
    if (!data || !arcs || !w) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const off = document.createElement("canvas");
    off.width = w * dpr; off.height = H * dpr;
    const ctx = off.getContext("2d")!; ctx.scale(dpr, dpr);
    ctx.fillStyle = "#07070d"; ctx.fillRect(0, 0, w, H);
    // chapter bars
    const maxV = Math.max(...data.verses);
    data.books.forEach(([, , s, n], bi) => {
      for (let k = s; k < s + n; k++) {
        const h = 6 + (data.verses[k] / maxV) * 26;
        ctx.fillStyle = bi % 2 ? "rgba(255,255,255,.55)" : "rgba(255,255,255,.85)";
        ctx.fillRect(X(k) - Math.max(0.35, (w - 2 * pad) / N / 2 - 0.15), base0 + 3, Math.max(0.7, (w - 2 * pad) / N - 0.3), h);
      }
    });
    ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.font = "600 11px system-ui,sans-serif"; ctx.textAlign = "left";
    ctx.fillText("Genesis", pad, H - 8); ctx.textAlign = "center";
    if (w > 520) { ctx.fillText("Psalms", X(data.books[18][2] + 75), H - 8); ctx.fillText("Matthew", X(data.books[39][2]), H - 8); }
    ctx.textAlign = "right"; ctx.fillText("Revelation", w - pad, H - 8);
    ctx.lineWidth = w < 600 ? 0.45 : 0.6;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let i = 0, raf = 0, cancelled = false;
    const step = () => {
      const end = reduce ? arcs.length : Math.min(arcs.length, i + 6000);
      for (; i < end; i++) {
        const { a, b, n } = arcs[i];
        ctx.strokeStyle = `hsla(${hue((b - a) / N)},100%,60%,${mode === "all" ? Math.min(0.5, 0.03 + n * 0.012) : Math.min(0.85, 0.18 + n * 0.06)})`;
        arc(ctx, a, b);
      }
      base.current = off; setDrawn(i / arcs.length);
      if (i < arcs.length && !cancelled) raf = requestAnimationFrame(step);
    };
    step();
    return () => { cancelled = true; cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, arcs, w, H, mode]);

  // Compose: the base image, then the hovered book's arcs on top.
  useEffect(() => {
    const c = cv.current, off = base.current; if (!c || !off || !w || !arcs || !data) return;
    const dpr = off.width / w;
    c.width = off.width; c.height = off.height;
    const ctx = c.getContext("2d")!;
    ctx.globalAlpha = hover === null ? 1 : 0.22; ctx.drawImage(off, 0, 0); ctx.globalAlpha = 1;
    if (hover === null) return;
    ctx.scale(dpr, dpr);
    const [, , s, n] = data.books[hover];
    ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.fillRect(X(s) - 2, 0, X(s + n - 1) - X(s) + 4, H);
    ctx.lineWidth = 0.9;
    for (const { a, b, n: k } of arcs) {
      if (bookOf[a] !== hover && bookOf[b] !== hover) continue;
      ctx.strokeStyle = `hsla(${hue((b - a) / N)},100%,62%,${Math.min(0.9, 0.12 + k * 0.05)})`;
      arc(ctx, a, b);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hover, drawn, w, arcs]);

  const pick = (clientX: number) => {
    const r = cv.current!.getBoundingClientRect();
    const i = Math.max(0, Math.min(N - 1, Math.floor(((clientX - r.left - pad) / (r.width - 2 * pad)) * N)));
    return i;
  };
  const hb = hover !== null && data ? data.books[hover] : null;
  const top = hover !== null && stats ? [...stats.partner[hover].entries()].sort((a, b) => b[1] - a[1]).slice(0, 4) : [];

  return (
    <figure className="rainbow" aria-label="Arc diagram of Bible cross-references">
      <div className="rb-ctl">
        <button className="chip" aria-pressed={mode === "all"} onClick={() => setMode("all")}>All cross-references</button>
        <button className="chip" aria-pressed={mode === "strong"} onClick={() => setMode("strong")}>Quotations &amp; close echoes</button>
        <span className="rb-key" aria-hidden="true"><span>near</span><i /><span>far</span></span>
      </div>
      <div className="rb-wrap" ref={wrap} style={{ height: H }}>
        <canvas ref={cv} style={{ width: w, height: H }}
          role="img" aria-label={`${stats?.total.toLocaleString() ?? ""} cross-reference links drawn as arcs between the 1,189 chapters of the Bible, from Genesis on the left to Revelation on the right.`}
          onMouseMove={(e) => { const i = pick(e.clientX); setHover(bookOf[i]); const r = wrap.current!.getBoundingClientRect(); setTip({ x: e.clientX - r.left, y: e.clientY - r.top }); }}
          onMouseLeave={() => { setHover(null); setTip(null); }}
          onPointerDown={(e) => { ptr.current = e.pointerType; }}
          onClick={(e) => {
            if (!data) return;
            const i = pick(e.clientX), bi = bookOf[i];
            if (ptr.current !== "mouse" && hover !== bi) { const r = wrap.current!.getBoundingClientRect(); setHover(bi); setTip({ x: e.clientX - r.left, y: e.clientY - r.top }); return; }
            const [id, , s] = data.books[bi]; router.push(`/read/${id}/${i - s + 1}`);
          }} />
        {!data && <p className="rb-load">Drawing the Bible…</p>}
        {hb && tip && stats && (
          <div className="rb-tip" style={{ left: Math.min(Math.max(tip.x, 110), w - 110), top: Math.max(8, tip.y - 110) }}>
            <b>{hb[1]}</b>
            <span>{stats.links[hover!].toLocaleString()} links · {hb[3]} chapter{hb[3] === 1 ? "" : "s"}</span>
            {top.length > 0 && <span>Most linked: {top.map(([bi]) => data!.books[bi][1]).join(", ")}</span>}
            <em>{ptr.current === "mouse" ? "Click to read" : "Tap again to read"}</em>
          </div>
        )}
      </div>
      <figcaption>
        Each bar along the bottom is one of the 1,189 chapters, Genesis to Revelation, its height the number of verses. Each arc joins two chapters that cross-reference each other
        {stats ? <> ({stats.total.toLocaleString()} {mode === "all" ? "links" : "quotations and close echoes"})</> : null}; colour shows how far apart they sit, red for neighbours, violet for Genesis-to-Revelation spans. Hover a book to light up its links. Data: OpenBible.info cross-references (CC BY).
      </figcaption>
    </figure>
  );
}
