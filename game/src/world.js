// Neon Palms — Costa Serena itself: a seeded, deterministic city. A grid of
// avenues and streets, pastel blocks with rooftop clutter, palm sidewalks,
// parking lots, named places (cafe, garage, clinic, station, hotel), and a
// beach with open water along the east edge. Everything the other modules
// need — collision, road queries, spawn points — is answered here.
window.NP = window.NP || {};

NP.world = (function () {
  const W = 3600;
  const H = 2520;
  const AVENUES = [260, 860, 1460, 2060, 2660]; // vertical road centre lines
  const STREETS = [260, 860, 1460, 2060];       // horizontal road centre lines
  const ROAD_HALF = 60;
  const SAND_X = 2960;
  const WATER_X = 3280;

  const PLACES = {
    spawn: { x: 1560, y: 1150, label: 'Marina Plaza' },
    cafe: { x: 2820, y: 1010, label: 'Cafe Brisa' },
    garage: { x: 1100, y: 1660, label: 'Delgado Motors' },
    truck: { x: 620, y: 1620, label: "Danny's food truck" },
    hotel: { x: 2470, y: 520, label: 'Marina Hotel' },
    hideout: { x: 3080, y: 2100, label: 'the beach hideout' },
    pier: { x: 3200, y: 620, label: 'the old pier' },
    station: { x: 1460, y: 330, label: 'Costa Serena PD' },
    clinic: { x: 860, y: 950, label: 'Serena Clinic' },
  };

  let buildings = [];
  let props = [];
  let lots = [];
  let blockTints = [];

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const WALLS = ['#e9bda6', '#e7cfa5', '#dfa58e', '#cfe3ea', '#f0dcc0', '#e3a9b8', '#bcd8c2', '#f2e3c9'];
  const ROOFS = ['#b98a72', '#a98f66', '#9c7263', '#7e99a6', '#b3a184', '#a87e8c', '#87a58d', '#bfae8e'];

  function addBuilding(rng, x, y, w, h, name) {
    const i = (rng() * WALLS.length) | 0;
    const clutter = [];
    const n = 1 + ((rng() * 3) | 0);
    for (let k = 0; k < n; k++) {
      clutter.push({ dx: 8 + rng() * Math.max(4, w - 30), dy: 8 + rng() * Math.max(4, h - 30), s: 8 + rng() * 10 });
    }
    const b = { x, y, w, h, wall: WALLS[i], roof: ROOFS[i], clutter, name: name || null };
    buildings.push(b);
    return b;
  }

  function addProp(kind, x, y, r, solid) {
    props.push({ kind, x, y, r: r || 6, solid: !!solid, sway: Math.random() * 6.28 });
  }

  function fillBlock(rng, bx, by, bw, bh, kind) {
    blockTints.push({ x: bx, y: by, w: bw, h: bh, kind });
    if (kind === 'plaza' || kind === 'park') {
      for (let i = 0; i < 7; i++) addProp('palm', bx + 30 + rng() * (bw - 60), by + 30 + rng() * (bh - 60), 7, true);
      for (let i = 0; i < 5; i++) addProp('bench', bx + 26 + rng() * (bw - 52), by + 26 + rng() * (bh - 52), 8, false);
      return;
    }
    if (kind === 'parking') {
      lots.push({ x: bx + 16, y: by + 16, w: bw - 32, h: bh - 32 });
      for (let i = 0; i < 4; i++) addProp('crate', bx + 20 + rng() * (bw - 40), by + bh - 30 - rng() * 20, 12, true);
      return;
    }
    if (kind === 'garage') {
      const g = addBuilding(rng, bx + 60, by + 40, bw - 120, 150, 'Delgado Motors');
      g.garage = true;
      lots.push({ x: bx + 30, y: by + 230, w: bw - 60, h: 120 });
      addProp('crate', bx + 40, by + 60, 12, true);
      addProp('crate', bx + 66, by + 60, 12, true);
      return;
    }
    if (kind === 'hotel') {
      addBuilding(rng, bx + 70, by + 50, bw - 140, 200, 'Marina Hotel');
      lots.push({ x: bx + 40, y: by + 300, w: bw - 80, h: 130 });
      for (let i = 0; i < 4; i++) addProp('palm', bx + 30 + i * 30, by + 280, 7, true);
      return;
    }
    if (kind === 'cafe') {
      addBuilding(rng, bx + 24, by + 60, bw - 48, 120, 'Cafe Brisa');
      for (let i = 0; i < 4; i++) addProp('bench', bx + 20 + i * 42, by + 220, 8, false);
      for (let i = 0; i < 3; i++) addProp('palm', bx + 24 + i * 60, by + 30, 7, true);
      return;
    }
    if (kind === 'station') {
      addBuilding(rng, bx + 80, by + 26, bw - 160, 130, 'Costa Serena PD');
      return;
    }
    if (kind === 'clinic') {
      addBuilding(rng, bx + 40, by + 40, 190, 130, 'Serena Clinic');
      addBuilding(rng, bx + 270, by + 200, 150, 170);
      return;
    }
    // Ordinary block: one to four buildings with gaps between them.
    const cols = bw > 380 ? 2 : 1;
    const rows = bh > 380 ? 2 : 1;
    for (let cx = 0; cx < cols; cx++) {
      for (let cy = 0; cy < rows; cy++) {
        if (rng() < 0.14) continue;
        const cw = bw / cols;
        const ch = bh / rows;
        const m = 26 + rng() * 14;
        addBuilding(rng, bx + cx * cw + m, by + cy * ch + m, cw - m * 2, ch - m * 2);
      }
    }
    if (rng() < 0.6) addProp('crate', bx + 14, by + bh - 20, 12, true);
    // Palms in the gaps between buildings soften the block.
    for (let i = 0; i < 2; i++) addProp('palm', bx + 24 + rng() * (bw - 48), by + 24 + rng() * (bh - 48), 7, true);
  }

  function specialKind(bx, by) {
    if (bx === 1520 && by === 920) return 'plaza';
    if (bx === 320 && by === 320) return 'park';
    if (bx === 320 && by === 1520) return 'parking';
    if (bx === 920 && by === 1520) return 'garage';
    if (bx === 2120 && by === 320) return 'hotel';
    if (bx === 2720 && by === 920) return 'cafe';
    if (bx === 1520 && by === 0) return 'station';
    if (bx === 920 && by === 920) return 'clinic';
    return 'city';
  }

  function build(seed) {
    buildings = [];
    props = [];
    lots = [];
    blockTints = [];
    const rng = mulberry32(seed || 1);
    const colEdges = [0, 320, 920, 1520, 2120, 2720, 2960];
    const rowEdges = [0, 320, 920, 1520, 2120, 2520];
    for (let ci = 0; ci < colEdges.length - 1; ci++) {
      for (let ri = 0; ri < rowEdges.length - 1; ri++) {
        const bx = colEdges[ci];
        const by = rowEdges[ri];
        const bw = colEdges[ci + 1] - bx;
        const bh = rowEdges[ri + 1] - by;
        if (bw < 60 || bh < 60) continue;
        fillBlock(rng, bx, by, bw, bh, specialKind(bx, by));
      }
    }
    // Palms and lamps along the avenues, clear of the intersections.
    for (const ax of AVENUES) {
      for (let y = 60; y < H - 40; y += 92) {
        if (STREETS.some((sy) => Math.abs(y - sy) < 96)) continue;
        addProp('palm', ax - ROAD_HALF - 16, y + rng() * 20, 7, true);
        if ((y / 92 | 0) % 2 === 0) addProp('lamp', ax + ROAD_HALF + 13, y, 5, true);
      }
    }
    for (const sy of STREETS) {
      for (let x = 120; x < SAND_X - 60; x += 210) {
        if (AVENUES.some((ax) => Math.abs(x - ax) < 96)) continue;
        addProp('lamp', x, sy - ROAD_HALF - 13, 5, true);
      }
    }
    // The beach: palms, umbrellas and the hideout hut.
    for (let i = 0; i < 12; i++) addProp('palm', 2990 + rng() * 220, 80 + rng() * (H - 160), 7, true);
    for (let i = 0; i < 9; i++) addProp('umbrella', 3040 + rng() * 200, 120 + rng() * (H - 240), 10, false);
    addProp('hut', PLACES.hideout.x, PLACES.hideout.y - 26, 20, true);
    addProp('crate', PLACES.hideout.x - 34, PLACES.hideout.y + 8, 12, true);
    addProp('crate', PLACES.hideout.x + 36, PLACES.hideout.y + 14, 12, true);
    addProp('bench', PLACES.pier.x - 26, PLACES.pier.y - 30, 8, false);
  }

  function isRoad(x, y) {
    if (x < 0 || y < 0 || x > W || y > H) return false;
    if (x >= SAND_X) return false;
    for (const ax of AVENUES) if (Math.abs(x - ax) <= ROAD_HALF + 4) return true;
    for (const sy of STREETS) if (Math.abs(y - sy) <= ROAD_HALF + 4) return true;
    return false;
  }

  function isWater(x, y) { return x >= WATER_X; }
  function isSand(x, y) { return x >= SAND_X && x < WATER_X; }

  function buildingAt(x, y) {
    for (const b of buildings) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
    }
    return null;
  }

  // Push a circle out of every building and solid prop; returns true on a hit.
  function collideCircle(p, r) {
    let hit = false;
    for (const b of buildings) {
      const nx = Math.max(b.x, Math.min(b.x + b.w, p.x));
      const ny = Math.max(b.y, Math.min(b.y + b.h, p.y));
      const dx = p.x - nx;
      const dy = p.y - ny;
      const d2 = dx * dx + dy * dy;
      if (d2 < r * r) {
        hit = true;
        if (d2 > 0.001) {
          const d = Math.sqrt(d2);
          p.x = nx + (dx / d) * r;
          p.y = ny + (dy / d) * r;
        } else {
          const left = p.x - b.x;
          const right = b.x + b.w - p.x;
          const top = p.y - b.y;
          const bottom = b.y + b.h - p.y;
          const m = Math.min(left, right, top, bottom);
          if (m === left) p.x = b.x - r;
          else if (m === right) p.x = b.x + b.w + r;
          else if (m === top) p.y = b.y - r;
          else p.y = b.y + b.h + r;
        }
      }
    }
    for (const pr of props) {
      if (!pr.solid) continue;
      const dx = p.x - pr.x;
      const dy = p.y - pr.y;
      const rr = r + pr.r;
      const d2 = dx * dx + dy * dy;
      if (d2 < rr * rr && d2 > 0.001) {
        const d = Math.sqrt(d2);
        p.x = pr.x + (dx / d) * rr;
        p.y = pr.y + (dy / d) * rr;
        hit = true;
      }
    }
    if (p.x < r) { p.x = r; hit = true; }
    if (p.y < r) { p.y = r; hit = true; }
    if (p.y > H - r) { p.y = H - r; hit = true; }
    if (p.x > WATER_X - 6 - r && p.y >= 0) { /* waterline handled by callers */ }
    if (p.x > W - r) { p.x = W - r; hit = true; }
    return hit;
  }

  function randomRoadPoint(rng, cx, cy, minD, maxD) {
    for (let tries = 0; tries < 60; tries++) {
      const onAvenue = rng() < 0.55;
      let x;
      let y;
      if (onAvenue) {
        x = AVENUES[(rng() * AVENUES.length) | 0] + (rng() * 70 - 35);
        y = rng() * H;
      } else {
        x = rng() * SAND_X;
        y = STREETS[(rng() * STREETS.length) | 0] + (rng() * 70 - 35);
      }
      const d = Math.hypot(x - cx, y - cy);
      if (d >= minD && d <= maxD) return { x, y };
    }
    return { x: AVENUES[2], y: STREETS[1] };
  }

  return {
    W, H, AVENUES, STREETS, ROAD_HALF, SAND_X, WATER_X, PLACES,
    build, rng: mulberry32,
    isRoad, isWater, isSand, buildingAt, collideCircle, randomRoadPoint,
    get buildings() { return buildings; },
    get props() { return props; },
    get lots() { return lots; },
    get blockTints() { return blockTints; },
  };
})();
