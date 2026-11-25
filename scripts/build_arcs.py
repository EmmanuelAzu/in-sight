#!/usr/bin/env python3
"""Aggregate cross-references into chapter-to-chapter arcs for the home-page diagram.

Usage: python3 -I scripts/build_arcs.py --root .
Reads public/data/books.json and data/xref.json (both produced by build_data.py).
Writes public/data/arcs.json:
  { "books": [[id, name, firstChapterIndex, chapterCount], ...],
    "verses": [verse count per chapter, in canonical order],
    "all":    [a, b, n, a, b, n, ...]   chapter pairs (a < b) and how many verse links join them,
    "strong": [a, b, n, ...]            the same, counting only quotations and close echoes }
"""
import argparse, json, os
from collections import Counter

ap = argparse.ArgumentParser(); ap.add_argument("--root", default=".")
root = ap.parse_args().root
books = json.load(open(os.path.join(root, "public/data/books.json")))
xref = json.load(open(os.path.join(root, "data/xref.json")))

index, verses, meta = {}, [], []
for b in books:
    meta.append([b["id"], b["name"], len(verses), len(b["ch"])])
    for i, n in enumerate(b["ch"]):
        index[f'{b["id"]}.{i + 1}'] = len(verses); verses.append(n)

allc, strong = Counter(), Counter()
for frm, refs in xref.items():
    a = index.get(frm.rsplit(".", 1)[0])
    for tgt, votes, s in refs:
        b = index.get(tgt.split("-")[0].rsplit(".", 1)[0])
        if a is None or b is None or a == b: continue
        k = (min(a, b), max(a, b))
        allc[k] += 1
        if s in ("q", "e"): strong[k] += 1

flat = lambda c: [x for (a, b), n in sorted(c.items()) for x in (a, b, n)]
out = {"books": meta, "verses": verses, "all": flat(allc), "strong": flat(strong)}
json.dump(out, open(os.path.join(root, "public/data/arcs.json"), "w"), separators=(",", ":"))
print(len(verses), "chapters,", len(allc), "chapter pairs,", len(strong), "strong pairs,", sum(allc.values()), "links")
