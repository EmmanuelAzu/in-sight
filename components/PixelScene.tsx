/** An original pixel landscape for the home page: rolling grass hills, dirt and stone with
 *  coloured gem flecks, a tree, a lectern holding an open book, clouds and a sun. Drawn as merged
 *  SVG rects from a seeded generator so server and client render the same picture. */
const W = 120, H = 40;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export function PixelScene() {
  const r = rng(20261125);
  const grid: (string | null)[][] = Array.from({ length: H }, () => new Array<string | null>(W).fill(null));
  const set = (x: number, y: number, c: string) => { if (x >= 0 && x < W && y >= 0 && y < H) grid[y][x] = c; };
  const pick = (a: string[]) => a[Math.floor(r() * a.length)];

  // terrain height: gentle hills
  const ground = Array.from({ length: W }, (_, x) => Math.round(29 + 2.2 * Math.sin(x / 9) + 1.4 * Math.sin(x / 4.3 + 1) + (x > 70 && x < 92 ? -2 : 0)));
  const greens = ["#5d9b3a", "#6aa84f", "#4f8a2f", "#7cbb5a"], dirt = ["#866043", "#79553a", "#96704f", "#6b4a30"], stone = ["#8a8a8a", "#7b7b7b", "#9a9a9a", "#6f6f6f"];
  const gems = ["#e8c33c", "#3fd0d4", "#e2483d", "#5fd16a", "#9b6bff"];
  for (let x = 0; x < W; x++) {
    const g = ground[x];
    for (let y = g; y < H; y++) {
      const d = y - g;
      set(x, y, d === 0 ? pick(greens) : d < 4 ? pick(dirt) : r() < 0.035 ? pick(gems) : pick(stone));
    }
  }
  // clouds
  for (const [cx, cy, w] of [[60, 9, 10], [76, 3, 14], [104, 12, 8]]) {
    for (let x = 0; x < w; x++) { set(cx + x, cy + 1, "#ffffff"); set(cx + x, cy + 2, "#f1f6ff"); }
    for (let x = 2; x < w - 3; x++) set(cx + x, cy, "#ffffff");
  }
  // sun
  for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) set(98 + x, 2 + y, y === 0 || x === 0 ? "#fff3a6" : "#ffd84a");
  // tree
  const tx = 22, tg = ground[tx];
  for (let y = tg - 6; y < tg; y++) set(tx, y, y % 2 ? "#6b4a2b" : "#5a3d22");
  for (let y = tg - 10; y < tg - 4; y++) for (let x = tx - 3; x <= tx + 3; x++) {
    if ((y === tg - 10 || y === tg - 5) && (x === tx - 3 || x === tx + 3)) continue;
    set(x, y, pick(["#3f8a2a", "#357a22", "#4d9c35", "#2e6b1d"]));
  }
  // lectern with an open book
  const lx = 84, lg = ground[lx];
  for (let x = lx - 2; x <= lx + 2; x++) { set(x, lg - 1, "#a8844e"); set(x, lg - 4, "#c79b5c"); }
  for (let y = lg - 3; y < lg - 1; y++) set(lx, y, "#8c6a3a");
  for (let x = lx - 3; x <= lx + 3; x++) set(x, lg - 5, x === lx ? "#b3121c" : "#f6efdc");
  for (let x = lx - 3; x <= lx + 3; x++) if (x !== lx) set(x, lg - 6, x === lx - 3 || x === lx + 3 ? "#e7dcc0" : "#fbf6ea");
  set(lx, lg - 6, "#7a5a32");
  // sparkles above the book
  for (const [x, y] of [[lx - 2, lg - 9], [lx + 2, lg - 10], [lx, lg - 12], [lx - 4, lg - 12], [lx + 4, lg - 8]]) set(x, y, "#fff7b0");

  // merge horizontal runs into rects
  const rects: [number, number, number, string][] = [];
  for (let y = 0; y < H; y++) {
    let x = 0;
    while (x < W) {
      const c = grid[y][x];
      if (!c) { x++; continue; }
      let w = 1; while (x + w < W && grid[y][x + w] === c) w++;
      rects.push([x, y, w, c]); x += w;
    }
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges" aria-hidden="true">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5fa8e6" /><stop offset="1" stopColor="#a9dcff" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="url(#sky)" />
      {rects.map(([x, y, w, c], i) => <rect key={i} x={x} y={y} width={w} height={1} fill={c} />)}
    </svg>
  );
}
