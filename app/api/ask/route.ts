import { NextResponse } from "next/server";
import { searchVerses, kjv } from "@/lib/server-data";
import { isId } from "@/lib/books";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
type Block = { type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> };
type Msg = { role: "user" | "assistant"; content: string | unknown[] };

async function claude(body: Record<string, unknown>) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODEL, max_tokens: 1200, ...body }),
  });
  if (!r.ok) throw new Error(`Model request failed (${r.status})`);
  return (await r.json()) as { content: Block[]; stop_reason: string };
}

const SYSTEM = `You are the answering engine of In-sight, a Bible study app with one strict rule: answers come ONLY from King James Version verses you have retrieved with the tools.
Rules:
- First use search_verses (and get_verses for exact references or surrounding verses) to find the relevant verses.
- Use only what the retrieved verses say. Do not add dates, places, history, authorship traditions or theology that the verses do not state.
- End every sentence with one or more citations in square brackets using verse ids exactly as the tools return them, for example [Gal.5.22] or [Gal.1.1, Gal.1.2]. Put the brackets before the full stop.
- If the verses do not answer the question, reply exactly: The verses do not say.
- At most 6 sentences. Plain text only: no markdown, lists or headings.`;

const TOOLS = [
  { name: "search_verses", description: "Keyword search over the whole KJV. Returns verse ids and text.", input_schema: { type: "object", properties: { query: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 25 } }, required: ["query"] } },
  { name: "get_verses", description: "Get KJV text for verse ids like Gal.5.22, Ps.1.3, 1Cor.13.4. Book ids: Gen Exod Lev Num Deut Josh Judg Ruth 1Sam 2Sam 1Kgs 2Kgs 1Chr 2Chr Ezra Neh Esth Job Ps Prov Eccl Song Isa Jer Lam Ezek Dan Hos Joel Amos Obad Jonah Mic Nah Hab Zeph Hag Zech Mal Matt Mark Luke John Acts Rom 1Cor 2Cor Gal Eph Phil Col 1Thess 2Thess 1Tim 2Tim Titus Phlm Heb Jas 1Pet 2Pet 1John 2John 3John Jude Rev.", input_schema: { type: "object", properties: { ids: { type: "array", items: { type: "string" }, maxItems: 40 } }, required: ["ids"] } },
];

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "Ask the text is not configured on this deployment (ANTHROPIC_API_KEY is missing)." }, { status: 501 });
  let q = "";
  try { q = String(((await req.json()) as { q?: unknown }).q || "").trim().slice(0, 500); } catch { /* empty */ }
  if (q.length < 3) return NextResponse.json({ error: "Ask a question of at least a few words." }, { status: 400 });

  const k = await kjv();
  const seen = new Set<string>();
  const msgs: Msg[] = [{ role: "user", content: q }];
  let answer = "";
  try {
    for (let turn = 0; turn < 6; turn++) {
      const r = await claude({ system: SYSTEM, tools: TOOLS, messages: msgs });
      msgs.push({ role: "assistant", content: r.content });
      if (r.stop_reason !== "tool_use") { answer = r.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim(); break; }
      const results: unknown[] = [];
      for (const b of r.content.filter((b) => b.type === "tool_use")) {
        let out: { id: string; t: string }[] = [];
        if (b.name === "search_verses") out = await searchVerses(String(b.input?.query || ""), Math.min(25, Number(b.input?.limit) || 15));
        if (b.name === "get_verses") out = (Array.isArray(b.input?.ids) ? (b.input!.ids as unknown[]) : []).filter(isId).slice(0, 40).filter((id) => k[id]).map((id) => ({ id, t: k[id] }));
        out.forEach((o) => seen.add(o.id));
        results.push({ type: "tool_result", tool_use_id: b.id, content: out.length ? out.map((o) => `${o.id} | ${o.t}`).join("\n") : "No verses found." });
      }
      msgs.push({ role: "user", content: results });
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "The model request failed." }, { status: 502 });
  }
  if (!answer) return NextResponse.json({ error: "No answer was produced. Try rephrasing." }, { status: 502 });

  // Split into sentences and pull out citations. Only ids that exist in the KJV count.
  const sentences = answer.split(/(?<=[.!?])\s+(?=\S)/).map((s) => s.trim()).filter(Boolean).map((s) => {
    const cites = [...s.matchAll(/\[([^\]]+)\]/g)].flatMap((m) => m[1].split(/[,;]\s*/)).map((x) => x.trim()).filter((x) => isId(x) && k[x] !== undefined);
    return { t: s.replace(/\s*\[[^\]]*\]/g, "").trim(), c: [...new Set(cites)], v: cites.length ? "checking" : "uncited", why: "" };
  });
  if (sentences.length === 1 && /do not say/i.test(sentences[0].t)) return NextResponse.json({ sentences: [{ ...sentences[0], v: "supported", why: "Nothing retrieved answers this." }] });

  // Second pass: does each cited verse actually say it?
  const toCheck = sentences.map((s, i) => ({ s, i })).filter((x) => x.s.v === "checking");
  if (toCheck.length) {
    const prompt = `You check citations for a Bible study app. For each numbered claim, decide whether the quoted King James Version verses directly support it.
"supported": the verses state it. "partial": part is stated and part is inference. "unsupported": the verses do not state it.
Return only a JSON array: [{"i": number, "verdict": "supported" | "partial" | "unsupported", "why": "at most 15 words"}].

` + toCheck.map(({ s, i }) => `Claim ${i}: ${s.t}\n` + s.c.map((r) => `  ${r}: ${k[r]}`).join("\n")).join("\n\n");
    try {
      const r = await claude({ messages: [{ role: "user", content: prompt }] });
      const text = r.content.filter((b) => b.type === "text").map((b) => b.text).join("");
      const json = JSON.parse(text.slice(text.indexOf("["), text.lastIndexOf("]") + 1)) as { i: number; verdict: string; why?: string }[];
      for (const x of json) {
        const s = sentences[Number(x.i)];
        if (s && s.v === "checking" && ["supported", "partial", "unsupported"].includes(x.verdict)) { s.v = x.verdict; s.why = String(x.why || "").slice(0, 160); }
      }
    } catch { /* fall through */ }
    for (const s of sentences) if (s.v === "checking") { s.v = "partial"; s.why = "The check did not return a verdict for this sentence."; }
  }
  return NextResponse.json({ sentences, retrieved: seen.size });
}
