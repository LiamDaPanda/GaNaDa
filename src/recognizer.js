// recognizer.js
// A compact, orientation-preserving unistroke recognizer based on the
// "$1 Unistroke Recognizer" (Wobbrock, Wilson & Li, 2007), with rotation
// normalization intentionally DISABLED so that a drawn "ㄱ" is never confused
// with a "ㄴ". Korean letters are orientation-sensitive, so we keep the
// resample → scale → translate → compare pipeline and skip rotateToZero.

const NUM_POINTS = 64;
const SQUARE_SIZE = 250;
const HALF_DIAGONAL = 0.5 * Math.sqrt(SQUARE_SIZE * SQUARE_SIZE + SQUARE_SIZE * SQUARE_SIZE);

function distance(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function pathLength(points) {
  let d = 0;
  for (let i = 1; i < points.length; i++) d += distance(points[i - 1], points[i]);
  return d;
}

function resample(points, n) {
  const interval = pathLength(points) / (n - 1);
  let accumulated = 0;
  const newPoints = [{ x: points[0].x, y: points[0].y }];
  const pts = points.map((p) => ({ x: p.x, y: p.y }));

  for (let i = 1; i < pts.length; i++) {
    const d = distance(pts[i - 1], pts[i]);
    if (accumulated + d >= interval && d > 0) {
      const t = (interval - accumulated) / d;
      const nx = pts[i - 1].x + t * (pts[i].x - pts[i - 1].x);
      const ny = pts[i - 1].y + t * (pts[i].y - pts[i - 1].y);
      const q = { x: nx, y: ny };
      newPoints.push(q);
      pts.splice(i, 0, q);
      accumulated = 0;
    } else {
      accumulated += d;
    }
  }
  // Floating point rounding can leave us one short.
  while (newPoints.length < n) {
    newPoints.push({ x: points[points.length - 1].x, y: points[points.length - 1].y });
  }
  return newPoints;
}

function boundingBox(points) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

// Non-uniform scale to a reference square. Non-uniform scaling means a tall
// stroke and a wide stroke of the same shape both normalize the same way.
// Exception: near-1D strokes (lines like ㅡ / ㅣ) are scaled UNIFORMLY so we
// don't blow their thin axis — and the hand jitter on it — up to full size.
function scaleToSquare(points) {
  const b = boundingBox(points);
  const w = b.width || 1;
  const h = b.height || 1;
  const ratio = Math.min(w, h) / Math.max(w, h);
  if (ratio < 0.22) {
    const s = SQUARE_SIZE / Math.max(w, h);
    return points.map((p) => ({ x: (p.x - b.minX) * s, y: (p.y - b.minY) * s }));
  }
  return points.map((p) => ({
    x: (p.x - b.minX) * (SQUARE_SIZE / w),
    y: (p.y - b.minY) * (SQUARE_SIZE / h),
  }));
}

function centroid(points) {
  let x = 0, y = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
  }
  return { x: x / points.length, y: y / points.length };
}

function translateToOrigin(points) {
  const c = centroid(points);
  return points.map((p) => ({ x: p.x - c.x, y: p.y - c.y }));
}

function normalize(points) {
  let pts = resample(points, NUM_POINTS);
  pts = scaleToSquare(pts);
  pts = translateToOrigin(pts);
  return pts;
}

function pathDistance(a, b) {
  let d = 0;
  for (let i = 0; i < a.length; i++) d += distance(a[i], b[i]);
  return d / a.length;
}

function reversed(points) {
  return points.slice().reverse();
}

// Moving-average smoothing so hand jitter doesn't read as fake corners.
function smooth(points, w = 2) {
  const n = points.length;
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    let x = 0, y = 0, c = 0;
    for (let j = -w; j <= w; j++) {
      const idx = i + j;
      if (idx >= 0 && idx < n) { x += points[idx].x; y += points[idx].y; c++; }
    }
    out[i] = { x: x / c, y: y / c };
  }
  return out;
}

// Count sharp corners in a normalized stroke. A square has ~4, a circle ~0,
// ⊏ and ∪ have ~2, a line 0. Used to separate closed shapes (ㅇ vs ㅁ) and
// keep the very flexible circle matcher from swallowing polygonal/open strokes.
// Smoothed + wide window so it is stable under noisy finger input.
function cornerCount(points) {
  const pts = smooth(points, 3);
  const n = pts.length;
  const k = Math.max(3, Math.round(n / 14));
  const THRESH = (60 * Math.PI) / 180;
  const flags = new Array(n).fill(false);
  for (let i = k; i < n - k; i++) {
    const a = pts[i - k], b = pts[i], c = pts[i + k];
    const v1x = b.x - a.x, v1y = b.y - a.y;
    const v2x = c.x - b.x, v2y = c.y - b.y;
    const m1 = Math.hypot(v1x, v1y) || 1;
    const m2 = Math.hypot(v2x, v2y) || 1;
    let cos = (v1x * v2x + v1y * v2y) / (m1 * m2);
    cos = Math.max(-1, Math.min(1, cos));
    if (Math.acos(cos) > THRESH) flags[i] = true;
  }
  // collapse adjacent flagged points into a single corner
  let corners = 0;
  for (let i = 0; i < n; ) {
    if (flags[i]) { corners++; while (i < n && flags[i]) i++; } else i++;
  }
  return corners;
}

// How far apart the endpoints are, relative to stroke size (0 = closed loop).
function openness(points) {
  const d = distance(points[0], points[points.length - 1]);
  let r = 0;
  const c = points.reduce((a, p) => ({ x: a.x + p.x, y: a.y + p.y }), { x: 0, y: 0 });
  c.x /= points.length; c.y /= points.length;
  for (const p of points) r += distance(p, c);
  r = (r / points.length) || 1;
  return d / r; // ~0 closed, ~2+ for an open line
}

// Average point distance with the candidate cyclically shifted by `offset`.
function shiftedDistance(cand, tmpl, offset) {
  const n = cand.length;
  let d = 0;
  for (let i = 0; i < n; i++) d += distance(cand[(i + offset) % n], tmpl[i]);
  return d / n;
}

// Start-point-invariant match for CLOSED shapes (ㅇ, ㅁ): a circle started at
// the bottom or drawn counter-clockwise should still match. We try every
// cyclic start offset and both stroke directions, taking the best alignment.
function cyclicDistance(cand, tmpl) {
  const n = cand.length;
  let best = Infinity;
  for (const seq of [cand, reversed(cand)]) {
    for (let off = 0; off < n; off += 2) {
      const d = shiftedDistance(seq, tmpl, off);
      if (d < best) best = d;
    }
  }
  return best;
}

// Direction-invariant match for OPEN shapes: drawing ㅅ left-to-right or
// right-to-left is the same letter, so compare both orderings.
function openDistance(cand, tmpl) {
  return Math.min(pathDistance(cand, tmpl), pathDistance(reversed(cand), tmpl));
}

export class Recognizer {
  constructor() {
    this.templates = [];
  }

  // raw: array of {x,y}. opts: { category, closed, round }.
  addTemplate(id, rawPoints, category = 'consonant', opts = {}) {
    const points = normalize(rawPoints);
    this.templates.push({
      id, category, closed: !!opts.closed, round: !!opts.round, points,
    });
  }

  // Returns { id, score } where score is in [0,1]. Higher is better.
  // When `category` is given, only templates of that category are considered —
  // a syllable's vowel slot is matched against vowels only, so ㅏ is never
  // confused with the consonant ㄴ.
  recognize(rawPoints, category = null) {
    if (rawPoints.length < 4) return { id: null, score: 0 };
    const candidate = normalize(rawPoints);
    const candCorners = cornerCount(candidate);
    const candOpen = openness(candidate);

    let best = Infinity;
    let bestId = null;
    for (const t of this.templates) {
      if (category && t.category !== category) continue;
      let d = t.closed ? cyclicDistance(candidate, t.points) : openDistance(candidate, t.points);
      // The circle matcher (ㅇ) is extremely flexible — start/direction
      // invariant — so it tends to swallow squares (ㅁ), ⊏ (ㄷ) and ∪ (ㅂ).
      // Guard it asymmetrically: a round stroke has no corners and (near-)
      // touching endpoints, so penalize the circle by how cornered / open the
      // candidate is. This avoids the midpoint ambiguity of a symmetric match.
      if (t.round) {
        d += candCorners * CORNER_W;
        d += Math.max(0, candOpen - OPEN_TOL) * OPEN_W;
      }
      if (d < best) {
        best = d;
        bestId = t.id;
      }
    }
    const score = 1 - best / HALF_DIAGONAL;
    return { id: bestId, score: Math.max(0, score) };
  }
}

const CORNER_W = 8;   // penalty per corner the candidate has, vs the circle
const OPEN_TOL = 1.2;  // openness a circle tolerates (lets ~270° arcs pass)
const OPEN_W = 8;      // penalty per unit of excess openness, vs the circle

// --- Stroke templates for Korean jamo (consonants), drawn as single strokes.
// Coordinates are arbitrary; y grows downward to match canvas space.
export const JAMO_STROKES = {
  // ㄱ  giyeok — horizontal then down (┐)
  giyeok: [
    { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 },
  ],
  // ㄴ  nieun — down then right (L)
  nieun: [
    { x: 0, y: 0 }, { x: 0, y: 100 }, { x: 100, y: 100 },
  ],
  // ㅅ  siot — a peak (∧)
  siot: [
    { x: 0, y: 100 }, { x: 50, y: 0 }, { x: 100, y: 100 },
  ],
  // ㅇ  ieung — a circle
  ieung: circlePoints(50, 50, 50, 24),
  // ㅁ  mieum — a square box
  mieum: [
    { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 },
    { x: 0, y: 100 }, { x: 0, y: 0 },
  ],
  // ㄹ  rieul — a stacked zigzag (the trickiest = the ultimate)
  rieul: [
    { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 },
    { x: 0, y: 50 }, { x: 0, y: 100 }, { x: 100, y: 100 },
  ],
  // ㄷ  digeut — ⊏ : top line, down the left, bottom line
  digeut: [
    { x: 100, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 100 }, { x: 100, y: 100 },
  ],
  // ㅂ  bieup — ∪ : down the left, across, up the right
  bieup: [
    { x: 10, y: 0 }, { x: 10, y: 100 }, { x: 90, y: 100 }, { x: 90, y: 0 },
  ],
};

// Vowel strokes (중성). Drawn as line+tick shapes (⊢ ⊣ ⊥ ⊤) plus the two bars.
// Matched only within the vowel slot, so they never collide with consonants.
export const VOWEL_STROKES = {
  // ㅏ — ⊢ : vertical bar, then a tick to the RIGHT from the middle
  a: [
    { x: 40, y: 0 }, { x: 40, y: 100 }, { x: 40, y: 50 }, { x: 95, y: 50 },
  ],
  // ㅓ — ⊣ : vertical bar, then a tick to the LEFT from the middle
  eo: [
    { x: 60, y: 0 }, { x: 60, y: 100 }, { x: 60, y: 50 }, { x: 5, y: 50 },
  ],
  // ㅗ — ⊥ : horizontal bar, then a tick UP from the middle
  o: [
    { x: 0, y: 60 }, { x: 100, y: 60 }, { x: 50, y: 60 }, { x: 50, y: 5 },
  ],
  // ㅜ — ⊤ : horizontal bar, then a tick DOWN from the middle
  u: [
    { x: 0, y: 40 }, { x: 100, y: 40 }, { x: 50, y: 40 }, { x: 50, y: 95 },
  ],
  // ㅡ — a horizontal line
  eu: [
    { x: 5, y: 50 }, { x: 95, y: 50 },
  ],
  // ㅣ — a vertical line
  i: [
    { x: 50, y: 5 }, { x: 50, y: 95 },
  ],
};

function circlePoints(cx, cy, r, n) {
  const pts = [];
  // Start at top, sweep clockwise (matches how most people draw ㅇ).
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return pts;
}

// Closed (loop) shapes get start-point-invariant matching; the circle is also
// flagged `round` so the corner/openness guard applies to it.
const CLOSED = new Set(['ieung', 'mieum']);
const ROUND = new Set(['ieung']);

export function buildRecognizer() {
  const r = new Recognizer();
  for (const [id, pts] of Object.entries(JAMO_STROKES)) {
    r.addTemplate(id, pts, 'consonant', { closed: CLOSED.has(id), round: ROUND.has(id) });
  }
  for (const [id, pts] of Object.entries(VOWEL_STROKES)) r.addTemplate(id, pts, 'vowel');
  return r;
}
