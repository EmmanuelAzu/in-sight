"use client";
import { useState } from "react";
import { RefChips } from "../ui";

type S = { t: string; c: string[]; v: string; why: string };
const EX = ["Who were the Galatians, and why was Paul writing to them?", "What does fruit grow from, according to scripture?", "On whom did God promise to pour out his spirit?", "What does the Bible say about the meek?"];
const VERD: Record<string, string> = { supported: "Supported", partial: "Partly inference", unsupported: "Not supported by the cited verses", uncited: "No valid citation" };

export function Ask() {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<S[] | null>(null);
  const [msg, setMsg] = useState("");
  const run = async (question = q) => {
    if (question.trim().length < 3 || busy) return;
    setBusy(true); setOut(null); setMsg("Searching the scriptures and checking each sentence…");
    try {
      const r = await fetch("/api/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ q: question }) });
      const d = await r.json();
      if (!r.ok) { setMsg(d.error || "Something went wrong."); }
      else { setOut(d.sentences); setMsg(""); }
    } catch { setMsg("Couldn't reach the server. Try again."); }
    setBusy(false);
  };
  const count = (v: string) => out?.filter((s) => s.v === v).length || 0;
  return (
    <div className="ask">
      <h2 className="vh">Ask the text</h2>
      <p className="sub">Answers are written only from King James verses found by search. Every sentence must cite a verse, and a second check marks whether each cited verse really says it.</p>
      <textarea value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask a question about the Bible…" aria-label="Question"
        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run(); }} />
      <div className="ex">{EX.map((x) => <button key={x} className="chip" onClick={() => { setQ(x); run(x); }}>{x}</button>)}</div>
      <div className="rowf"><button className="btn" disabled={busy || q.trim().length < 3} onClick={() => run()}>{busy ? "Answering…" : "Ask"}</button></div>
      {msg && <p className="status">{msg}</p>}
      {out && (
        <div className="ans">
          {out.map((s, i) => (
            <div key={i} className={"sent " + s.v}>
              <span className="tx">{s.t}</span> <RefChips ids={s.c} />
              <span className="verd">{VERD[s.v] || ""}</span>
              {s.why && <span className="why">{s.why}</span>}
            </div>
          ))}
          <p className="status">{count("supported")} supported · {count("partial")} partly inference · {count("unsupported") + count("uncited")} flagged. Tap a reference to read the verse.</p>
        </div>
      )}
    </div>
  );
}
