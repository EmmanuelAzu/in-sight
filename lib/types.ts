export type Span = [number, number];
/** [target id or range, reader votes, link strength] */
export type XRef = [string, number, Strength];
export type Strength = "q" | "e" | "i" | "w" | "r";

export type Verse = {
  n: number;
  t: string;
  red?: Span[];
  it?: Span[];
  tags?: Tag[];
  tm?: Partial<Record<Tag, string>>;
  x?: XRef[];
};
export type Chapter = { b: string; c: number; title?: string; v: Verse[] };
export type BookInfo = { id: string; name: string; t: "OT" | "NT"; ch: number[] };
/** [surface, transliteration, English, Strong's] */
export type Word = [string, string, string, string];
export type LexEntry = { l: string; tl: string; g: string; d: string; n: number; nv: number; bb: Record<string, number>; occ: string[] };

export type Tag = "god" | "jesus" | "apostle" | "disciple" | "ot" | "nt" | "prophecy" | "prayer";
export const TAGS: Tag[] = ["god", "jesus", "apostle", "disciple", "ot", "nt", "prophecy", "prayer"];
export const TAG_LABEL: Record<Tag, string> = {
  god: "God speaking", jesus: "Jesus speaking", apostle: "Apostle speaking", disciple: "Disciple of Jesus speaking",
  ot: "Old Testament reference", nt: "New Testament reference", prophecy: "Prophecy", prayer: "Prayer",
};
export const TAG_HINT: Partial<Record<Tag, string>> = { ot: "draws on earlier Old Testament text", nt: "taken up in the New Testament" };
export const TAG_PRIORITY: Tag[] = ["jesus", "god", "apostle", "disciple", "prayer", "prophecy", "ot", "nt"];

export const STRENGTH: Record<Strength, { label: string; level: number; desc: string }> = {
  q: { label: "Quotation", level: 4, desc: "The later text repeats the earlier wording." },
  e: { label: "Close echo", level: 3, desc: "Same idea in closely matching words, without a full quotation." },
  i: { label: "Shared image", level: 2, desc: "The same picture (tree, vine, light) in different words. Curated." },
  w: { label: "Shared word", level: 1, desc: "Linked by a key word only." },
  r: { label: "Reader-linked", level: 0, desc: "No shared wording; linked by readers' votes on OpenBible.info." },
};

/** Curated content shapes (content/*.json) */
export type Line = [string, string[], "s" | "i"];
export type Context = { sp: string; wr: Line; au: Line; gr: Line[] };
export type Link = [string, Tag, string, Strength];
export type Insight = { ph: string; n: Line[]; r: Link[]; l: Link[]; w: string[] };
export type Thread = { id: string; t: string; d: string; s: [string, Strength | "", string][] };
export type Pair = { a: string; b: string; n: string; x?: string[] };

export type Mark = { c: "" | "gold" | "green" | "blue" | "rose"; n: string };
export type PathStep = { r: string; n: string };
export type StudyPath = { id: string; title: string; shared: boolean; steps: PathStep[] };
export type StudyState = { marks: Record<string, Mark>; paths: StudyPath[] };
