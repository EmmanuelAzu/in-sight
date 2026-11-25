#!/usr/bin/env python3
"""Build In-sight's data files from public sources.

Usage:
  python3 -I scripts/build_data.py --kjv <eng-kjv.osis.xml> --xref <dir with cross_references_*.sql>
      --step <STEPBible-Data dir> --out <repo root>

Sources (see DATA_SOURCES.md):
  KJV text with words-of-Jesus markup: CrossWire KJV OSIS (public domain), via seven1m/open-bibles
  Cross-references: OpenBible.info (CC BY), via scrollmapper/bible_databases
  Greek/Hebrew tagging and lexicons: STEPBible.org TAGNT, TAHOT, TBESG, TBESH (CC BY 4.0)

Outputs:
  public/data/books.json            book list with chapter/verse counts
  public/data/c/<Book>.<ch>.json    verses: text, red-letter and italic spans, tags (+ method), cross-refs
  public/data/w/<Book>.<ch>.json    original-language words per verse
  public/data/lex/<G|H><n>.json     lexicon shards (100 Strong's numbers each) with occurrences
  public/data/quotes.json           auto-detected quotations between the Testaments
  data/kjv.json                     id -> text (server search and Ask)
  data/xref.json                    id -> top cross-refs (server traces)
  data/tags.json                    id -> tags (server study filters)
  data/lexindex.json                compact lexicon list (server search)
"""
import argparse, glob, html, json, os, re, sys
from collections import defaultdict, Counter

BOOKS = [
 ("Gen","Genesis","OT"),("Exod","Exodus","OT"),("Lev","Leviticus","OT"),("Num","Numbers","OT"),("Deut","Deuteronomy","OT"),
 ("Josh","Joshua","OT"),("Judg","Judges","OT"),("Ruth","Ruth","OT"),("1Sam","1 Samuel","OT"),("2Sam","2 Samuel","OT"),
 ("1Kgs","1 Kings","OT"),("2Kgs","2 Kings","OT"),("1Chr","1 Chronicles","OT"),("2Chr","2 Chronicles","OT"),("Ezra","Ezra","OT"),
 ("Neh","Nehemiah","OT"),("Esth","Esther","OT"),("Job","Job","OT"),("Ps","Psalms","OT"),("Prov","Proverbs","OT"),
 ("Eccl","Ecclesiastes","OT"),("Song","Song of Solomon","OT"),("Isa","Isaiah","OT"),("Jer","Jeremiah","OT"),("Lam","Lamentations","OT"),
 ("Ezek","Ezekiel","OT"),("Dan","Daniel","OT"),("Hos","Hosea","OT"),("Joel","Joel","OT"),("Amos","Amos","OT"),
 ("Obad","Obadiah","OT"),("Jonah","Jonah","OT"),("Mic","Micah","OT"),("Nah","Nahum","OT"),("Hab","Habakkuk","OT"),
 ("Zeph","Zephaniah","OT"),("Hag","Haggai","OT"),("Zech","Zechariah","OT"),("Mal","Malachi","OT"),
 ("Matt","Matthew","NT"),("Mark","Mark","NT"),("Luke","Luke","NT"),("John","John","NT"),("Acts","Acts","NT"),
 ("Rom","Romans","NT"),("1Cor","1 Corinthians","NT"),("2Cor","2 Corinthians","NT"),("Gal","Galatians","NT"),("Eph","Ephesians","NT"),
 ("Phil","Philippians","NT"),("Col","Colossians","NT"),("1Thess","1 Thessalonians","NT"),("2Thess","2 Thessalonians","NT"),
 ("1Tim","1 Timothy","NT"),("2Tim","2 Timothy","NT"),("Titus","Titus","NT"),("Phlm","Philemon","NT"),("Heb","Hebrews","NT"),
 ("Jas","James","NT"),("1Pet","1 Peter","NT"),("2Pet","2 Peter","NT"),("1John","1 John","NT"),("2John","2 John","NT"),
 ("3John","3 John","NT"),("Jude","Jude","NT"),("Rev","Revelation","NT")]
BID = [b[0] for b in BOOKS]
TEST = {b[0]: b[2] for b in BOOKS}
NAME2ID = {b[1]: b[0] for b in BOOKS}
STEP2ID = {"Gen":"Gen","Exo":"Exod","Lev":"Lev","Num":"Num","Deu":"Deut","Jos":"Josh","Jdg":"Judg","Rut":"Ruth","1Sa":"1Sam","2Sa":"2Sam",
 "1Ki":"1Kgs","2Ki":"2Kgs","1Ch":"1Chr","2Ch":"2Chr","Ezr":"Ezra","Neh":"Neh","Est":"Esth","Job":"Job","Psa":"Ps","Pro":"Prov",
 "Ecc":"Eccl","Sng":"Song","Isa":"Isa","Jer":"Jer","Lam":"Lam","Ezk":"Ezek","Dan":"Dan","Hos":"Hos","Jol":"Joel","Amo":"Amos",
 "Oba":"Obad","Jon":"Jonah","Mic":"Mic","Nam":"Nah","Hab":"Hab","Zep":"Zeph","Hag":"Hag","Zec":"Zech","Mal":"Mal",
 "Mat":"Matt","Mrk":"Mark","Luk":"Luke","Jhn":"John","Act":"Acts","Rom":"Rom","1Co":"1Cor","2Co":"2Cor","Gal":"Gal","Eph":"Eph",
 "Php":"Phil","Col":"Col","1Th":"1Thess","2Th":"2Thess","1Ti":"1Tim","2Ti":"2Tim","Tit":"Titus","Phm":"Phlm","Heb":"Heb",
 "Jas":"Jas","1Pe":"1Pet","2Pe":"2Pet","1Jn":"1John","2Jn":"2John","3Jn":"3John","Jud":"Jude","Rev":"Rev"}

def canon(vid):
    b, c, v = vid.split(".")
    return BID.index(b) * 1_000_000 + int(c) * 1000 + (0 if v == "title" else int(v))

# ---------------------------------------------------------------- KJV (OSIS)
TOKEN = re.compile(r"<[^>]+>|[^<]+")
def parse_kjv(path):
    """Return {vid: {"t": text, "red": [[s,e]], "it": [[s,e]]}} and {Book.ch: title}."""
    src = open(path, encoding="utf-8").read()
    verses, titles = {}, {}
    cur = None; buf = []; red = []; it = []
    in_q = False; in_tc = False; in_title = None; title_buf = []; skip = 0; cur_chapter = None
    def pos(): return sum(len(x) for x in buf)
    def close():
        nonlocal cur, buf, red, it
        if cur:
            raw = "".join(buf)
            # normalise whitespace while remapping spans
            out = []; mapping = []
            prev_space = True
            for ch in raw:
                if ch.isspace():
                    if not prev_space:
                        out.append(" "); mapping.append(len(out) - 1)
                    else:
                        mapping.append(len(out) - 1 if out else 0)
                    prev_space = True
                else:
                    out.append(ch); mapping.append(len(out) - 1); prev_space = False
            text = "".join(out).rstrip()
            def remap(spans):
                res = []
                for s, e in spans:
                    if e <= s: continue
                    ns = mapping[s] if s < len(mapping) else len(text)
                    if s < len(raw) and raw[s].isspace(): ns += 1
                    ne = (mapping[e - 1] + 1) if e - 1 < len(mapping) else len(text)
                    ns = max(0, min(ns, len(text))); ne = max(ns, min(ne, len(text)))
                    # trim surrounding spaces
                    while ns < ne and text[ns] == " ": ns += 1
                    while ne > ns and text[ne - 1] == " ": ne -= 1
                    if ne > ns:
                        if res and ns <= res[-1][1] + 1: res[-1][1] = ne
                        else: res.append([ns, ne])
                return res
            lead = len(text) - len(text.lstrip())
            text = text.lstrip()
            def shift(sp): return [[max(0, s - lead), max(0, e - lead)] for s, e in sp]
            verses[cur] = {"t": text, "red": shift(remap(red)), "it": shift(remap(it))}
        cur = None; buf = []; red = []; it = []
    for tok in TOKEN.findall(src):
        if tok.startswith("<"):
            name = re.match(r"</?\s*([a-zA-Z]+)", tok)
            name = name.group(1) if name else ""
            if name == "verse":
                m = re.search(r'osisID="([^"]+)"', tok)
                if m and "sID=" in tok:
                    close(); cur = m.group(1).split()[0]
                    if in_q: red.append([0, None])
                    if in_tc: it.append([0, None])
                elif "eID=" in tok:
                    if in_q and red and red[-1][1] is None: red[-1][1] = pos()
                    if in_tc and it and it[-1][1] is None: it[-1][1] = pos()
                    close()
            elif name == "q":
                if 'who="Jesus"' in tok and "sID=" in tok:
                    in_q = True
                    if cur: red.append([pos(), None])
                elif "eID=" in tok and in_q:
                    in_q = False
                    if cur and red and red[-1][1] is None: red[-1][1] = pos()
            elif name == "transChange":
                if tok.startswith("</"):
                    in_tc = False
                    if cur and it and it[-1][1] is None: it[-1][1] = pos()
                elif not tok.endswith("/>"):
                    in_tc = True
                    if cur: it.append([pos(), None])
            elif name == "title":
                if tok.startswith("</"):
                    if in_title:
                        titles[in_title] = re.sub(r"\s+", " ", "".join(title_buf)).strip()
                    in_title = None; title_buf = []
                elif 'type="psalm"' in tok and not tok.endswith("/>"):
                    in_title = cur_chapter
            elif name == "chapter":
                m = re.search(r'osisRef="([^"]+)"', tok)
                if m and "sID=" in tok: cur_chapter = m.group(1)
            elif name == "note":
                if tok.startswith("</"): skip = max(0, skip - 1)
                elif not tok.endswith("/>"): skip += 1
        else:
            if skip: continue
            t = html.unescape(tok)
            if in_title: title_buf.append(t)
            elif cur: buf.append(t)
    close()
    for v in verses.values():
        v["red"] = [s for s in v["red"] if s[1] is not None]
        v["it"] = [s for s in v["it"] if s[1] is not None]
    return verses, titles

# ---------------------------------------------------------------- cross-refs
ROW = re.compile(r"VALUES \('([^']+)', (\d+), (\d+), '([^']+)', (\d+), (\d+), (\d+), (-?\d+)\)")
def parse_xrefs(d):
    out = []
    for f in sorted(glob.glob(os.path.join(d, "cross_references_*.sql"))):
        for m in ROW.finditer(open(f, encoding="utf-8").read()):
            fb, fc, fv, tb, tc, ts, te, votes = m.groups()
            if fb not in NAME2ID or tb not in NAME2ID: continue
            out.append((f"{NAME2ID[fb]}.{fc}.{fv}", NAME2ID[tb], int(tc), int(ts), int(te), int(votes)))
    return out

# ---------------------------------------------------------------- link strength
STOP = set("""a an and are as at be but by for from had hath have he her him his i if in into is it its me my no nor not now o of on or our
out shall she so that the thee their them then there these they this those thou thy thine to unto up upon us was we were what when which who whom
will with ye you your yea also all any even let said saith say came come one every did do doth done made make even shalt hast art wilt been
being because hither thither therefore wherefore lest more most such than very own am how why where""".split())
WORD = re.compile(r"[a-z]+")
def content(text): return [w for w in WORD.findall(text.lower()) if w not in STOP and len(w) > 2]
def lcs(a, b):
    if not a or not b: return 0
    prev = [0] * (len(b) + 1)
    for x in a:
        cur = [0]
        for j, y in enumerate(b):
            cur.append(prev[j] + 1 if x == y else max(prev[j + 1], cur[j]))
        prev = cur
    return prev[-1]

def strength(a, b, df):
    """q quotation, e close echo, w shared rare word, r related (reader votes only)."""
    sa, sb = set(a), set(b)
    inter = sa & sb
    if len(inter) >= 3:
        l = lcs(a, b); short = min(len(a), len(b))
        if (l >= 5 and l >= 0.6 * short) or (l >= 3 and l >= 0.85 * short): return "q"
        if l >= 3 and l >= 0.35 * short: return "e"
        if len(inter) >= 4: return "e"
    if any(df.get(w, 0) <= 400 for w in inter): return "w"
    return "r"

# ---------------------------------------------------------------- speaker / kind tags (with the method shown to readers)
GOD = re.compile(r"\b(saith the LORD|said the LORD|thus saith|the LORD said|God said|saith the Lord GOD|the word of the LORD came|I am the LORD|saith the LORD of hosts|God spake)\b")
PRAYER = re.compile(r"\b(O LORD|O God|O Lord|O my God|O Father|Our Father which art|Holy Father|righteous Father|O LORD God)\b")
FULFIL = re.compile(r"(that it might be fulfilled|spoken by the prophet|as it is written in the prophets|then was fulfilled|might be fulfilled)", re.I)
PROPHET_BOOKS = {"Isa","Jer","Ezek","Dan","Hos","Joel","Amos","Obad","Jonah","Mic","Nah","Hab","Zeph","Hag","Zech","Mal","Rev"}
APOSTLE_BOOKS = {  # writer as named in the book's opening verse; the apostle claim it rests on
 "Rom":"Paul, called to be an apostle (Rom 1:1)","1Cor":"Paul, called to be an apostle (1 Cor 1:1)","2Cor":"Paul, an apostle (2 Cor 1:1)",
 "Gal":"Paul, an apostle (Gal 1:1)","Eph":"Paul, an apostle (Eph 1:1)","Col":"Paul, an apostle (Col 1:1)","1Tim":"Paul, an apostle (1 Tim 1:1)",
 "2Tim":"Paul, an apostle (2 Tim 1:1)","Titus":"Paul, a servant of God, and an apostle (Titus 1:1)",
 "Phil":"Paul, named in Phil 1:1; he calls himself an apostle in Rom 1:1","1Thess":"Paul, named in 1 Thess 1:1; an apostle per Rom 1:1",
 "2Thess":"Paul, named in 2 Thess 1:1; an apostle per Rom 1:1","Phlm":"Paul, named in Phlm 1:1; an apostle per Rom 1:1",
 "1Pet":"Peter, an apostle (1 Pet 1:1)","2Pet":"Simon Peter, a servant and an apostle (2 Pet 1:1)"}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--kjv", required=True); ap.add_argument("--xref", required=True)
    ap.add_argument("--step", required=True); ap.add_argument("--out", required=True)
    a = ap.parse_args()
    out = a.out
    for d in ["public/data/c", "public/data/w", "public/data/lex", "data"]:
        os.makedirs(os.path.join(out, d), exist_ok=True)

    print("KJV…", file=sys.stderr)
    V, titles = parse_kjv(a.kjv)
    V = {k: v for k, v in V.items() if k.split(".")[0] in TEST}  # canonical 66 books only
    titles = {k: v for k, v in titles.items() if k and k.split(".")[0] in TEST}
    ids = sorted(V, key=canon)
    print(len(ids), "verses,", len(titles), "psalm titles", file=sys.stderr)

    # document frequency of content words
    CW = {vid: content(V[vid]["t"]) for vid in ids}
    df = Counter(); [df.update(set(ws)) for ws in CW.values()]

    print("cross-refs…", file=sys.stderr)
    X = defaultdict(list)
    for frm, tb, tc, ts, te, votes in parse_xrefs(a.xref):
        if frm not in V or votes < 1: continue
        te = max(ts, te)
        tgt = f"{tb}.{tc}.{ts}" + (f"-{te}" if te != ts else "")
        span = [f"{tb}.{tc}.{n}" for n in range(ts, min(te, ts + 4) + 1)]
        if span[0] not in V: continue
        X[frm].append([tgt, votes, span])
    XR = {}
    for frm, lst in X.items():
        lst.sort(key=lambda r: -r[1])
        top = []
        for tgt, votes, span in lst[:12]:
            words = [w for s in span if s in V for w in CW[s]]
            top.append([tgt, votes, strength(CW[frm], words, df)])
        XR[frm] = top
    print(len(XR), "verses with cross-refs", file=sys.stderr)

    # tags
    TAGS = {}; METHOD = {}
    def tag(vid, k, why):
        TAGS.setdefault(vid, []);
        if k not in TAGS[vid]: TAGS[vid].append(k); METHOD.setdefault(vid, {})[k] = why
    for vid in ids:
        b = vid.split(".")[0]; t = V[vid]["t"]; test = TEST[b]
        if V[vid]["red"]: tag(vid, "jesus", "Marked as words of Jesus in the KJV source text.")
        m = GOD.search(t)
        if m and test == "OT": tag(vid, "god", f"Contains a divine-speech formula: “{m.group(1)}”.")
        if b in APOSTLE_BOOKS: tag(vid, "apostle", "Letter written by " + APOSTLE_BOOKS[b] + ".")
        if b == "John" and not V[vid]["red"]: tag(vid, "disciple", "Narration of John's Gospel, written by the disciple whom Jesus loved (John 21:20, 24).")
        if b in PROPHET_BOOKS: tag(vid, "prophecy", "In a book of prophecy.")
        m = FULFIL.search(t)
        if m and test == "NT": tag(vid, "prophecy", f"Points to fulfilled prophecy: “{m.group(1)}”.")
        m = PRAYER.search(t)
        if m: tag(vid, "prayer", f"Addresses God directly: “{m.group(1)}”.")
        for tgt, votes, s in XR.get(vid, []):
            tb = tgt.split(".")[0]
            if TEST[tb] != test and (s in "qe" or votes >= 40):
                k = "ot" if test == "NT" else "nt"
                kind = {"q": "quotes", "e": "closely echoes"}.get(s, "is strongly linked by readers to")
                tag(vid, k, f"{kind.capitalize()} {tgt.replace('.', ' ', 1).replace('.', ':')} ({votes} reader votes, OpenBible.info).")
                break
    cnt = Counter(k for t in TAGS.values() for k in t); print("tags:", dict(cnt), file=sys.stderr)

    # quotations between Testaments (then & now)
    quotes = []
    for frm in ids:
        if TEST[frm.split(".")[0]] != "NT": continue
        for tgt, votes, s in XR.get(frm, []):
            if s == "q" and TEST[tgt.split(".")[0]] == "OT":
                quotes.append({"nt": frm, "ot": tgt.split("-")[0], "votes": votes})
    print(len(quotes), "NT->OT quotations", file=sys.stderr)

    # ---------------------------------------------------------------- original-language words
    print("Greek/Hebrew…", file=sys.stderr)
    WORDS = defaultdict(list); OCC = defaultdict(list)
    step = a.step
    ref_re = re.compile(r"^([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)(?:\([^)]*\))?#(\d+)=([A-Za-z]+)")
    for f in sorted(glob.glob(os.path.join(step, "Translators Amalgamated OT+NT", "TAGNT*.txt"))):
        for line in open(f, encoding="utf-8"):
            m = ref_re.match(line)
            if not m: continue
            bk, c, v, _, typ = m.groups()
            if "K" not in typ: continue  # keep words present in the Textus Receptus (the KJV's Greek text)
            cols = line.rstrip("\n").split("\t")
            if len(cols) < 5: continue
            gm = re.match(r"(.*?)\s*\(([^)]*)\)", cols[1])
            gk, tl = (gm.group(1), gm.group(2)) if gm else (cols[1], "")
            sm = re.match(r"G(\d+)", cols[3])
            if not sm or bk not in STEP2ID: continue
            sid = "G" + str(int(sm.group(1)))
            vid = f"{STEP2ID[bk]}.{c}.{v}"
            WORDS[vid].append([gk, tl, cols[2].strip(), sid])
            OCC[sid].append(vid)
    for f in sorted(glob.glob(os.path.join(step, "Translators Amalgamated OT+NT", "TAHOT*.txt"))):
        for line in open(f, encoding="utf-8"):
            m = ref_re.match(line)
            if not m: continue
            bk, c, v, _, typ = m.groups()
            cols = line.rstrip("\n").split("\t")
            if len(cols) < 5 or bk not in STEP2ID: continue
            sm = re.findall(r"\{H(\d+)[A-Za-z]?\}", cols[4]) or re.findall(r"H(\d+)", cols[4].split("/")[-1])
            if not sm: continue
            sid = "H" + str(int(sm[0]))
            if sid in ("H9000",) : continue
            vid = f"{STEP2ID[bk]}.{c}.{v}"
            WORDS[vid].append([cols[1].replace("/", "").replace("\\", ""), cols[2].replace("/", "").replace(".", "").replace("\\", "").strip("-"), cols[3].replace("/", "").strip(), sid])
            OCC[sid].append(vid)
    print(len(WORDS), "verses with words;", len(OCC), "lemmas", file=sys.stderr)

    LEX = {}
    def strip_html(s):
        s = re.sub(r"<br\s*/?>|<BR\s*/?>", "; ", s, flags=re.I)
        s = re.sub(r"<[^>]+>", "", s); s = html.unescape(s)
        return re.sub(r"\s+", " ", s).strip(" ;")
    for name in ("TBESG", "TBESH"):
        for f in glob.glob(os.path.join(step, "Lexicons", name + "*.txt")):
            for line in open(f, encoding="utf-8"):
                cols = line.rstrip("\n").split("\t")
                if len(cols) < 8 or not re.match(r"^[GH]\d+", cols[0]): continue
                m = re.match(r"([GH])(\d+)", cols[0]); sid = m.group(1) + str(int(m.group(2)))
                if sid in LEX: continue
                d = strip_html(cols[7])
                LEX[sid] = {"l": cols[3], "tl": cols[4], "g": cols[6], "d": d[:700] + ("…" if len(d) > 700 else "")}
    shards = defaultdict(dict)
    for sid, occ in OCC.items():
        e = LEX.get(sid, {"l": "", "tl": "", "g": "", "d": ""})
        uniq = sorted(set(occ), key=canon)
        bb = Counter(o.split(".")[0] for o in occ)
        shards[sid[0] + str(int(sid[1:]) // 100)][sid] = {**e, "n": len(occ), "nv": len(uniq), "bb": dict(sorted(bb.items(), key=lambda kv: BID.index(kv[0]))), "occ": uniq[:400]}
    for k, v in shards.items():
        json.dump(v, open(os.path.join(out, "public/data/lex", k + ".json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    json.dump([[sid, LEX.get(sid, {}).get("l", ""), LEX.get(sid, {}).get("tl", ""), LEX.get(sid, {}).get("g", ""), len(OCC[sid])] for sid in sorted(OCC, key=lambda s: (s[0], int(s[1:])))],
              open(os.path.join(out, "data/lexindex.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

    # ---------------------------------------------------------------- write chapters
    books = []
    bych = defaultdict(list)
    for vid in ids:
        b, c, v = vid.split("."); bych[(b, int(c))].append(vid)
    for b, name, test in BOOKS:
        chs = sorted(c for (bb, c) in bych if bb == b)
        books.append({"id": b, "name": name, "t": test, "ch": [len(bych[(b, c)]) for c in chs]})
        for c in chs:
            vs = []
            for vid in bych[(b, c)]:
                o = {"n": int(vid.split(".")[2]), "t": V[vid]["t"]}
                if V[vid]["red"]: o["red"] = V[vid]["red"]
                if V[vid]["it"]: o["it"] = V[vid]["it"]
                if vid in TAGS: o["tags"] = TAGS[vid]; o["tm"] = METHOD[vid]
                if vid in XR: o["x"] = XR[vid][:10]
                vs.append(o)
            doc = {"b": b, "c": c, "v": vs}
            if f"{b}.{c}" in titles: doc["title"] = titles[f"{b}.{c}"]
            json.dump(doc, open(os.path.join(out, f"public/data/c/{b}.{c}.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
            wd = {str(int(vid.split(".")[2])): WORDS[vid] for vid in bych[(b, c)] if vid in WORDS}
            json.dump(wd, open(os.path.join(out, f"public/data/w/{b}.{c}.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    json.dump(books, open(os.path.join(out, "public/data/books.json"), "w"), separators=(",", ":"))
    json.dump(quotes, open(os.path.join(out, "public/data/quotes.json"), "w"), separators=(",", ":"))
    kjv = {vid: V[vid]["t"] for vid in ids}
    for k, t in titles.items(): kjv[k + ".title"] = t
    json.dump(kjv, open(os.path.join(out, "data/kjv.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    json.dump({k: [[t, n, s] for t, n, s in v[:10]] for k, v in XR.items()}, open(os.path.join(out, "data/xref.json"), "w"), separators=(",", ":"))
    json.dump(TAGS, open(os.path.join(out, "data/tags.json"), "w"), separators=(",", ":"))
    red = {vid: 1 for vid in ids if V[vid]["red"]}
    json.dump(red, open(os.path.join(out, "data/red.json"), "w"), separators=(",", ":"))
    print("done", file=sys.stderr)

if __name__ == "__main__":
    main()
