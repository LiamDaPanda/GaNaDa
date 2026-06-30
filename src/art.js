// art.js — custom calligraphic ink art. Hand-built brush primitives in the
// sumi-e tradition, given a modern, graphic edge: an enso (一筆 one-stroke
// ring), a carved seal stamp (낙관), plum blossoms (매화), auspicious clouds
// (구름), and gliding cranes (학). Self-contained brush helpers so there is no
// import cycle with render.js — every shape is drawn from paths, no images.

import { getTheme } from './themes.js';

function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// A variable-width ink ribbon: `widths` is a number or a per-point half-width
// array. Optional round caps give brush ends their wet, blunt landing.
export function inkRibbon(ctx, pts, widths, color, round = true) {
  const n = pts.length;
  if (n < 2) return;
  const w = (i) => (Array.isArray(widths) ? widths[i] : widths);
  const left = [], right = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(n - 1, i + 1)];
    let dx = next.x - prev.x, dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
    const hw = w(i);
    left.push({ x: p.x - dy * hw, y: p.y + dx * hw });
    right.push({ x: p.x + dy * hw, y: p.y - dx * hw });
  }
  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y);
  for (let i = 1; i < n; i++) ctx.lineTo(left[i].x, left[i].y);
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  if (round) {
    ctx.beginPath();
    ctx.arc(pts[0].x, pts[0].y, w(0), 0, Math.PI * 2);
    ctx.arc(pts[n - 1].x, pts[n - 1].y, w(n - 1), 0, Math.PI * 2);
    ctx.fill();
  }
}

// Enso 円相 — a single confident brush sweep that almost closes. Heavy in the
// belly, dry and thin where the brush enters and lifts, with a small gap.
export function enso(ctx, cx, cy, r, opts = {}) {
  const { color = '#1c1822', seed = 7, gap = 0.55, weight = 0.07, glow = 0, alpha = 1, start = -Math.PI * 0.62 } = opts;
  const rnd = rng(seed);
  const sweep = Math.PI * 2 - gap;
  const steps = 54;
  const pts = [], widths = [];
  const baseW = r * weight;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = start + sweep * t;
    const rr = r * (1 + (rnd() - 0.5) * 0.03 + Math.sin(t * 7) * 0.01);
    pts.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr });
    // belly-heavy pressure curve, dry thin tails at entry and lift
    const press = 0.45 + 0.8 * Math.sin(Math.PI * Math.min(1, t * 1.05)) ** 0.85;
    widths.push(baseW * press * (0.94 + rnd() * 0.12));
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  if (glow > 0) { ctx.shadowColor = color; ctx.shadowBlur = glow; }
  inkRibbon(ctx, pts, widths, color);
  ctx.shadowBlur = 0;
  // dry-brush flecks trailing off the lift-point
  const last = pts[pts.length - 1];
  ctx.globalAlpha = alpha * 0.5;
  for (let i = 0; i < 5; i++) {
    const a = start + sweep + 0.05 * i;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, baseW * (0.4 - i * 0.06), 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
  }
  // wet bleed where the stroke begins
  ctx.globalAlpha = alpha * 0.85;
  ctx.beginPath(); ctx.arc(pts[0].x, pts[0].y, baseW * 0.8, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
  void last;
  ctx.restore();
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Carve 가 (the first of 가나다) in blunt seal-script strokes. Drawn with
// destination-out so the character is *cut* out of the red block, revealing
// whatever sits behind — the authentic 백문 (white-on-red) seal look.
function carveGa(ctx, x, y, s) {
  const ix = x + s * 0.2, iy = y + s * 0.2, iw = s * 0.6, ih = s * 0.6;
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
  ctx.strokeStyle = '#000';
  const lw = iw * 0.15;
  ctx.lineWidth = lw;
  // ㄱ — top bar + right downstroke
  ctx.beginPath();
  ctx.moveTo(ix, iy + lw * 0.5);
  ctx.lineTo(ix + iw * 0.52, iy + lw * 0.5);
  ctx.lineTo(ix + iw * 0.52, iy + ih);
  ctx.stroke();
  // ㅏ — full vertical + mid tick
  ctx.beginPath();
  ctx.moveTo(ix + iw * 0.78, iy);
  ctx.lineTo(ix + iw * 0.78, iy + ih);
  ctx.moveTo(ix + iw * 0.78, iy + ih * 0.5);
  ctx.lineTo(ix + iw, iy + ih * 0.5);
  ctx.stroke();
}

// Seal stamp 낙관 — an uneven red ink block with a carved character and a
// crisp inner frame. A graphic, modern accent rooted in calligraphy.
export function sealStamp(ctx, cx, cy, size, opts = {}) {
  const { seed = 3, red = '#b23a2e' } = opts;
  const rnd = rng(seed);
  const s = size, x = cx - s / 2, y = cy - s / 2;
  ctx.save();
  // block
  roundRectPath(ctx, x, y, s, s, s * 0.16);
  ctx.fillStyle = red; ctx.fill();
  // uneven ink coverage, clipped to the block
  ctx.save();
  ctx.clip();
  for (let i = 0; i < 46; i++) {
    ctx.globalAlpha = 0.05 + rnd() * 0.13;
    ctx.fillStyle = rnd() > 0.5 ? '#000' : '#ffd9c8';
    ctx.beginPath();
    ctx.arc(x + rnd() * s, y + rnd() * s, rnd() * s * 0.11 + 1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // crisp inner frame
  ctx.globalAlpha = 1;
  ctx.strokeStyle = red;
  ctx.lineWidth = Math.max(1.5, s * 0.045);
  roundRectPath(ctx, x + s * 0.1, y + s * 0.1, s * 0.8, s * 0.8, s * 0.1);
  ctx.stroke();
  // carve the glyph
  ctx.globalCompositeOperation = 'destination-out';
  carveGa(ctx, x, y, s);
  ctx.restore();
}

// A single plum blossom (매화) — five soft petals, an ink ring and stamens.
export function plumBlossom(ctx, cx, cy, r, seed = 1, petal = '#f4dde6') {
  const rnd = rng(seed);
  const a0 = rnd() * Math.PI * 2;
  for (let i = 0; i < 5; i++) {
    const a = a0 + (i / 5) * Math.PI * 2;
    const px = cx + Math.cos(a) * r * 0.62;
    const py = cy + Math.sin(a) * r * 0.62;
    ctx.beginPath();
    ctx.ellipse(px, py, r * 0.5, r * 0.42, a, 0, Math.PI * 2);
    ctx.fillStyle = petal; ctx.fill();
    ctx.lineWidth = Math.max(0.6, r * 0.05);
    ctx.strokeStyle = 'rgba(60,30,40,0.35)'; ctx.stroke();
  }
  // center + stamens
  ctx.fillStyle = '#c98a2e';
  for (let i = 0; i < 6; i++) {
    const a = a0 + (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * r * 0.22, cy + Math.sin(a) * r * 0.22, r * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.14, 0, Math.PI * 2);
  ctx.fillStyle = '#8a4a1e'; ctx.fill();
}

// An ink plum branch: a tapered, forking dark stroke dotted with blossoms.
export function plumBranch(ctx, x, y, scale, seed = 5, ink = '#15110f', petal = '#f4dde6') {
  const rnd = rng(seed);
  // main bough
  const main = [{ x, y }];
  let px = x, py = y, ang = rnd() * 0.6 - 0.3;
  for (let i = 0; i < 5; i++) {
    ang += (rnd() - 0.5) * 0.7;
    px += Math.cos(ang) * scale * 26;
    py += Math.sin(ang) * scale * 26 - scale * 4;
    main.push({ x: px, y: py });
  }
  const w0 = scale * 7;
  inkRibbon(ctx, main, main.map((_, i) => w0 * (1 - i / (main.length + 1))), ink);
  // a couple of twigs
  const blossomAt = [];
  for (let t = 1; t < main.length; t++) {
    const node = main[t];
    if (rnd() > 0.5) {
      const da = (rnd() - 0.5) * 1.6;
      const tw = [node];
      let tx = node.x, ty = node.y, ta = ang + da;
      for (let j = 0; j < 3; j++) {
        tx += Math.cos(ta) * scale * 16;
        ty += Math.sin(ta) * scale * 16 - scale * 6;
        tw.push({ x: tx, y: ty });
      }
      inkRibbon(ctx, tw, tw.map((_, i) => scale * 3.5 * (1 - i / 4)), ink);
      blossomAt.push({ x: tx, y: ty }, { x: tw[1].x, y: tw[1].y });
    }
    blossomAt.push({ x: node.x, y: node.y });
  }
  // blossoms + a few buds
  for (let i = 0; i < blossomAt.length; i++) {
    const b = blossomAt[i];
    if (rnd() > 0.35) plumBlossom(ctx, b.x, b.y, scale * (5 + rnd() * 3), seed + i * 7, petal);
    else { ctx.beginPath(); ctx.arc(b.x, b.y, scale * 2, 0, Math.PI * 2); ctx.fillStyle = petal; ctx.fill(); }
  }
}

// Auspicious cloud (구름) — a coiled head trailing a soft ribbon. Drifts.
export function cloud(ctx, x, y, scale, color, alpha = 0.5) {
  ctx.save();
  ctx.globalAlpha = alpha;
  // trailing ribbon
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    pts.push({ x: x + t * scale * 70, y: y - Math.sin(t * Math.PI) * scale * 6 });
  }
  inkRibbon(ctx, pts, pts.map((_, i) => scale * (5 - i * 0.45)), color);
  // coiled head (spiral of shrinking arcs)
  for (let i = 0; i < 3; i++) {
    const r = scale * (11 - i * 3);
    ctx.beginPath();
    ctx.arc(x - scale * 2 - i * scale * 2, y - i * scale, r, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
  }
  // punch a hole for the inner curl
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath(); ctx.arc(x - scale * 4, y - scale, scale * 3.4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// Gliding crane (학) — long neck, trailing legs, flapping wings. `flap` in
// roughly [-1,1] drives the wing beat; crown is a single red dot.
export function crane(ctx, x, y, scale, flap = 0, color = '#1a1620') {
  ctx.save();
  ctx.translate(x, y);
  const s = scale;
  // body
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 9, s * 4, -0.1, 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill();
  // neck + head reaching forward
  inkRibbon(ctx, [{ x: s * 6, y: -s }, { x: s * 14, y: -s * 5 }, { x: s * 20, y: -s * 7 }], s * 1.4, color);
  ctx.beginPath(); ctx.arc(s * 20, -s * 7, s * 1.8, 0, Math.PI * 2); ctx.fill();
  // beak
  inkRibbon(ctx, [{ x: s * 21, y: -s * 7 }, { x: s * 26, y: -s * 7.5 }], s * 0.6, color);
  // red crown
  ctx.beginPath(); ctx.arc(s * 19, -s * 8.5, s * 1.1, 0, Math.PI * 2);
  ctx.fillStyle = '#c23a2e'; ctx.fill();
  // trailing legs
  inkRibbon(ctx, [{ x: -s * 7, y: s }, { x: -s * 16, y: s * 4 }, { x: -s * 22, y: s * 5 }], s * 0.7, color);
  // wings — far wing lower, near wing rides the flap
  const up = flap * s * 7;
  ctx.fillStyle = color;
  inkRibbon(ctx, [{ x: 0, y: -s }, { x: -s * 7, y: -s * 4 - up * 0.5 }, { x: -s * 15, y: -s * 2 - up }], s * 2.4, color);
  inkRibbon(ctx, [{ x: s, y: -s }, { x: -s * 6, y: -s * 5 - up }, { x: -s * 13, y: -s * 4 - up * 1.6 }], s * 2.8, color);
  // black wingtip feathers
  inkRibbon(ctx, [{ x: -s * 13, y: -s * 4 - up * 1.6 }, { x: -s * 17, y: -s * 3 - up * 1.6 }], s * 0.8, '#0a0810');
  ctx.restore();
}

// Scattered ink flecks + a couple of thrown streaks — sumi splatter.
export function inkSplat(ctx, x, y, spread, seed = 1, color = '#15110f', alpha = 0.9) {
  const rnd = rng(seed);
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < 22; i++) {
    const a = rnd() * Math.PI * 2;
    const d = rnd() ** 1.6 * spread;
    ctx.globalAlpha = alpha * (0.3 + rnd() * 0.7);
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, rnd() * spread * 0.05 + 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // a few flung streaks
  for (let i = 0; i < 3; i++) {
    const a = rnd() * Math.PI * 2, d = spread * (0.3 + rnd() * 0.6);
    const sx = x + Math.cos(a) * d * 0.4, sy = y + Math.sin(a) * d * 0.4;
    ctx.globalAlpha = alpha * 0.6;
    inkRibbon(ctx, [{ x: sx, y: sy }, { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d }], [spread * 0.04, 0.5], color);
  }
  ctx.restore();
}

// A composed title emblem: a big enso holding a plum sprig and a seal stamp,
// finished with a fling of ink. Drawn once into the title-card canvas.
export function drawCrest(ctx, W, H, T) {
  ctx.clearRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2;
  const R = Math.min(W, H) * 0.4;
  const neon = T.style === 'neon';
  const inkCol = neon ? T.ui.ink : '#e7dcc0';
  const petal = neon ? '#7df9ff' : '#f3d9e2';
  // a light fling of ink, behind the ring
  inkSplat(ctx, cx + R * 0.1, cy - R * 0.7, R * 0.45, 31, inkCol, neon ? 0.6 : 0.4);
  // the enso ring
  ctx.save();
  if (neon) { ctx.shadowColor = T.ui.ink; ctx.shadowBlur = 14; }
  enso(ctx, cx, cy, R, { color: inkCol, seed: 11, gap: 0.5, weight: 0.07, alpha: neon ? 0.95 : 0.9 });
  ctx.restore();
  // a slender plum twig riding the top of the ring, dotted with blossoms
  const twig = [];
  for (let i = 0; i <= 6; i++) {
    const a = Math.PI * 1.12 + (i / 6) * Math.PI * 0.66;
    twig.push({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R });
  }
  inkRibbon(ctx, twig, twig.map((_, i) => R * 0.028 * (1 - i / 9)), neon ? '#0a141e' : '#2a201a');
  plumBlossom(ctx, twig[0].x, twig[0].y, R * 0.17, 1, petal);
  plumBlossom(ctx, twig[3].x, twig[3].y, R * 0.13, 5, petal);
  plumBlossom(ctx, twig[6].x, twig[6].y, R * 0.1, 9, petal);
  // seal stamp resting at lower-right
  sealStamp(ctx, cx + R * 0.66, cy + R * 0.52, R * 0.42, { seed: 5, red: neon ? '#ff3c8f' : '#b23a2e' });
}

// Sky decorations layered into the live background, by theme. Cheap enough to
// run every frame; everything drifts with `time`.
export function skyMotifs(ctx, W, H, laneY, time, T) {
  const neon = T.style === 'neon';
  const stone = T.style === 'stone';
  // a large, faint enso behind the scene — modern calligraphy as scenery
  ctx.save();
  ctx.globalAlpha = neon ? 0.16 : 0.1;
  enso(ctx, W * 0.5, laneY * 0.52, Math.min(W, laneY) * 0.42, {
    color: neon ? T.ui.ink : T.crest || '#d9cdb0', seed: 4, gap: 0.6, weight: 0.05,
    glow: neon ? 12 : 0, alpha: 1, start: time * 0.02,
  });
  ctx.restore();

  // drifting auspicious clouds
  const cloudCol = neon ? T.ui.ink : (stone ? '#c69a6a' : '#cdd7ee');
  for (let i = 0; i < 2; i++) {
    const span = W + 220;
    const cxp = ((time * (8 + i * 6) + i * 360) % span) - 110;
    cloud(ctx, cxp, laneY * (0.24 + i * 0.16), 0.9 + i * 0.3, cloudCol, neon ? 0.22 : 0.16);
  }

  // a gliding crane (calligraphy / ancient only — neon keeps its synthetic sky)
  if (!neon) {
    const span = W + 160;
    const t = (time * 16 + 40) % span;
    const cxp = span - t - 80;
    const cyp = laneY * 0.34 + Math.sin(time * 0.6) * 10;
    const flap = Math.sin(time * 3.2);
    crane(ctx, cxp, cyp, 1.5, flap, stone ? '#2a1c12' : '#1a1620');
  }
}

// Paint the hand-inked title emblem into the #crest canvas (theme-aware).
export function paintCrest() {
  const c = document.getElementById('crest');
  if (!c) return;
  drawCrest(c.getContext('2d'), c.width, c.height, getTheme());
}

// A small broken-seal emblem for the game-over card.
export function paintGameOverSeal() {
  const c = document.getElementById('goSeal');
  if (!c) return;
  const ctx = c.getContext('2d');
  const T = getTheme();
  ctx.clearRect(0, 0, c.width, c.height);
  const cx = c.width / 2, cy = c.height / 2;
  enso(ctx, cx, cy, 48, { color: '#7a3a32', seed: 9, gap: 1.7, weight: 0.13, alpha: 0.8 });
  sealStamp(ctx, cx, cy, 54, { seed: 13, red: T.style === 'neon' ? '#ff3c8f' : '#9c3b34' });
  inkSplat(ctx, cx, cy, 62, 17, '#7a3a32', 0.6);
}

// An overhanging plum branch in a top corner — sumi/ancient foreground accent.
export function cornerBranch(ctx, W, time, T) {
  if (T.style === 'neon') return;
  const sway = Math.sin(time * 0.7) * 4;
  ctx.save();
  ctx.translate(W - 6 + sway, -6);
  ctx.rotate(2.5);
  plumBranch(ctx, 0, 0, 1.05, 71, T.style === 'stone' ? '#241510' : '#120d0a',
    T.style === 'stone' ? '#e9c98a' : '#f1d6df');
  ctx.restore();
}
