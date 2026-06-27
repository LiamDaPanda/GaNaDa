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
function scaleToSquare(points) {
  const b = boundingBox(points);
  const w = b.width || 1;
  const h = b.height || 1;
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

export class Recognizer {
  constructor() {
    this.templates = [];
  }

  // raw: array of {x,y}
  addTemplate(id, rawPoints) {
    this.templates.push({ id, points: normalize(rawPoints) });
  }

  // Returns { id, score } where score is in [0,1]. Higher is better.
  recognize(rawPoints) {
    if (rawPoints.length < 4) return { id: null, score: 0 };
    const candidate = normalize(rawPoints);

    let best = Infinity;
    let bestId = null;
    for (const t of this.templates) {
      const d = pathDistance(candidate, t.points);
      if (d < best) {
        best = d;
        bestId = t.id;
      }
    }
    const score = 1 - best / HALF_DIAGONAL;
    return { id: bestId, score: Math.max(0, score) };
  }
}

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

export function buildRecognizer() {
  const r = new Recognizer();
  for (const [id, pts] of Object.entries(JAMO_STROKES)) r.addTemplate(id, pts);
  return r;
}
