import contextsJson from "@/content/contexts.json";
import insightsJson from "@/content/insights.json";
import threadsJson from "@/content/threads.json";
import pairsJson from "@/content/pairs.json";
import wordNotesJson from "@/content/word-notes.json";
import type { Context, Insight, Thread, Pair } from "./types";

/** Curated, human-reviewed content. Context lines cite KJV verses only (stage 1). */
export const CONTEXTS = contextsJson as unknown as Record<string, Context>;
export const INSIGHTS = insightsJson as unknown as Record<string, Insight>;
export const THREADS = threadsJson as unknown as Thread[];
export const PAIRS = pairsJson as unknown as Pair[];
export const WORD_NOTES = (wordNotesJson as unknown as { notes: Record<string, { n: string; also: string[]; translit: string }> }).notes;
export const CONTRAST = (wordNotesJson as unknown as { contrast: [string, string, string][] }).contrast;

export const KIND: Record<"s" | "i", string> = { s: "Stated in the text", i: "Interpretation from the cited verses" };
