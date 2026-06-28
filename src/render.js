// render.js — procedural sumi-e (수묵화) style art. Everything is drawn with
// organic, hand-inked brush paths: wobbly silhouettes, tapered calligraphic
// strokes, and soft ink washes. No straight/sharp geometry, no image assets.

const INK = '#16131f';

function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// A smooth, organic closed blob (the core ink shape). Lobe radii are jittered
// by a seeded RNG so the silhouette is hand-drawn, never a perfect circle.
export function inkBlob(ctx, cx, cy, r, seed = 1, wobble = 0.16, lobes = 11) {
  const rnd = rng(seed);
  const pts = [];
  for (let i = 0; i < lobes; i++) {
    const a = (i / lobes) * Math.PI * 2;
    const rr = r * (1 - wobble / 2 + rnd() * wobble);
    pts.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr });
  }
  ctx.beginPath();
  const m0 = midpoint(pts[lobes - 1], pts[0]);
  ctx.moveTo(m0.x, m0.y);
  for (let i = 0; i < lobes; i++) {
    const p = pts[i];
    const m = midpoint(p, pts[(i + 1) % lobes]);
    ctx.quadraticCurveTo(p.x, p.y, m.x, m.y);
  }
  ctx.closePath();
}

function midpoint(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }

// A tapered calligraphic brush ribbon through `pts` (width swells in the middle
// and thins to a point at each end — like a real brush stroke).
export function brushStroke(ctx, pts, maxW, color, taper = true) {
  if (pts.length < 2) return;
  const n = pts.length;
  const left = [], right = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(n - 1, i + 1)];
    let dx = next.x - prev.x, dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
    const t = i / (n - 1);
    const prof = taper ? Math.sin(Math.PI * t) ** 0.7 : 1;
    const w = (0.18 + 0.82 * prof) * maxW / 2;
    left.push({ x: p.x - dy * w, y: p.y + dx * w });
    right.push({ x: p.x + dy * w, y: p.y - dx * w });
  }
  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y);
  for (let i = 1; i < n; i++) ctx.lineTo(left[i].x, left[i].y);
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

// A wavy ridge edge (for ink-wash mountains / ground).
function wavyTop(W, baseY, amp, freq, seed) {
  const r = rng(seed);
  const pts = [];
  for (let x = -20; x <= W + 20; x += 16) {
    const y = baseY - (Math.sin(x * freq + seed) * 0.5 + 0.5) * amp - r() * amp * 0.25;
    pts.push({ x, y });
  }
  return pts;
}

function fillUnder(ctx, pts, laneY, W, fill) {
  ctx.beginPath();
  ctx.moveTo(-20, laneY);
  ctx.lineTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    const m = midpoint(pts[i - 1], pts[i]);
    ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, m.x, m.y);
  }
  ctx.lineTo(W + 20, laneY);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

export function drawBackground(ctx, W, H, laneY, wave, time = 0) {
  const hue = 230 + (wave % 8) * 5;

  // --- paper-ink sky wash ---
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, `hsl(${hue}, 38%, 8%)`);
  sky.addColorStop(0.5, `hsl(${hue + 8}, 30%, 13%)`);
  sky.addColorStop(0.78, `hsl(${hue + 14}, 24%, 17%)`); // ink reserve near horizon
  sky.addColorStop(1, `hsl(${hue + 18}, 28%, 10%)`);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // --- ink-splatter stars (cheap dots) ---
  const sr = rng(1337);
  ctx.save();
  ctx.fillStyle = '#efe6cf';
  for (let i = 0; i < 80; i++) {
    const x = sr() * W;
    const y = sr() * laneY * 0.8;
    const s = sr() * 1.5 + 0.5;
    const tw = 0.5 + 0.5 * Math.sin(time * 1.6 + i * 1.7);
    ctx.globalAlpha = (0.18 + sr() * 0.5) * (0.4 + tw * 0.6);
    ctx.beginPath();
    ctx.arc(x, y, s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // --- brushed moon with wash halo ---
  const mx = W * 0.79, my = H * 0.16, mr = 40;
  ctx.save();
  const halo = ctx.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 3.2);
  halo.addColorStop(0, 'rgba(239,230,207,0.28)');
  halo.addColorStop(1, 'rgba(239,230,207,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(mx - mr * 3.2, my - mr * 3.2, mr * 6.4, mr * 6.4);
  // moon disc (organic)
  inkBlob(ctx, mx, my, mr, 7, 0.07, 16);
  const mg = ctx.createRadialGradient(mx - 12, my - 12, 6, mx, my, mr);
  mg.addColorStop(0, '#fbf5e3');
  mg.addColorStop(1, '#e3d7b4');
  ctx.fillStyle = mg;
  ctx.fill();
  // ink rim (brushy, partial)
  ctx.strokeStyle = 'rgba(120,110,80,0.35)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // wash craters
  ctx.fillStyle = 'rgba(170,158,120,0.3)';
  const cr = rng(99);
  for (let i = 0; i < 5; i++) {
    const a = cr() * Math.PI * 2, d = cr() * mr * 0.6;
    inkBlob(ctx, mx + Math.cos(a) * d, my + Math.sin(a) * d, 3 + cr() * 6, i * 53 + 5, 0.4, 8);
    ctx.fill();
  }
  ctx.restore();

  // --- sumi-e mountain ridges (ink wash + brushy crest) ---
  inkRidge(ctx, W, laneY, laneY - 34, 30, 0.016, 11, `hsla(${hue}, 30%, 14%, 0.85)`, 'rgba(10,10,20,0.5)');
  inkRidge(ctx, W, laneY, laneY - 16, 44, 0.024, 27, `hsla(${hue + 6}, 28%, 18%, 0.92)`, 'rgba(12,12,24,0.55)');
  inkRidge(ctx, W, laneY, laneY + 2, 58, 0.034, 41, `hsla(${hue + 10}, 26%, 22%, 1)`, 'rgba(14,14,26,0.6)');

  // --- calligraphic bamboo / reeds near the lane ---
  const br = rng(202);
  ctx.save();
  for (let i = 0; i < 9; i++) {
    const bx = br() * W;
    const bh = 26 + br() * 30;
    const lean = (br() - 0.5) * 14;
    const stalk = [];
    for (let s = 0; s <= 6; s++) {
      const t = s / 6;
      stalk.push({ x: bx + lean * t + Math.sin(time + i) * 1.5 * t, y: laneY + 4 - t * bh });
    }
    ctx.globalAlpha = 0.5;
    brushStroke(ctx, stalk, 3.4, '#0c0f17', true);
    // leaf flicks
    for (let l = 0; l < 2; l++) {
      const ty = laneY + 4 - bh * (0.55 + l * 0.25);
      const lx = bx + lean * (0.55 + l * 0.25);
      const dir = l % 2 ? 1 : -1;
      brushStroke(ctx, [{ x: lx, y: ty }, { x: lx + dir * 10, y: ty - 6 }, { x: lx + dir * 20, y: ty - 8 }], 3, '#0c0f17', true);
    }
  }
  ctx.restore();

  // --- ground ink wash with a brushy (wavy) top edge ---
  const gpts = wavyTop(W, laneY + 4, 10, 0.03, 303);
  const ground = ctx.createLinearGradient(0, laneY, 0, H);
  ground.addColorStop(0, 'rgba(40,32,54,0.96)');
  ground.addColorStop(1, '#0d0a16');
  fillUnder(ctx, gpts, H, W, ground);
  // a darker brushed shoreline along the lane
  ctx.save();
  ctx.globalAlpha = 0.5;
  brushStroke(ctx, gpts.filter((_, i) => i % 2 === 0), 3, '#0a0712', false);
  ctx.restore();

  // --- drifting ink mist ---
  for (let i = 0; i < 3; i++) {
    const off = (time * (10 + i * 5) + i * 180) % (W + 260) - 130;
    ctx.save();
    ctx.globalAlpha = 0.10;
    ctx.shadowColor = '#cdd7ee';
    ctx.shadowBlur = 24;
    ctx.translate(off, laneY + 8 + i * 9);
    ctx.scale(1, 0.16);
    inkBlob(ctx, 0, 0, 120, i * 17 + 4, 0.5, 9);
    ctx.fillStyle = '#cdd7ee';
    ctx.fill();
    ctx.restore();
  }

  // --- floating embers (soft dots) ---
  ctx.save();
  for (let i = 0; i < 12; i++) {
    const ex = (i * 103 + time * (7 + (i % 3) * 4)) % W;
    const ey = laneY - 26 - ((time * 13 + i * 64) % (laneY * 0.5));
    ctx.globalAlpha = 0.18 * (0.5 + 0.5 * Math.sin(time * 2 + i));
    ctx.fillStyle = i % 2 ? '#e9c887' : '#9fc7e3';
    ctx.beginPath();
    ctx.arc(ex, ey, 1.7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // --- soft paper vignette ---
  const vig = ctx.createRadialGradient(W / 2, H * 0.5, H * 0.3, W / 2, H * 0.5, H * 0.8);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

function inkRidge(ctx, W, laneY, baseY, amp, freq, seed, wash, crest) {
  const pts = wavyTop(W, baseY, amp, freq, seed);
  const grad = ctx.createLinearGradient(0, baseY - amp, 0, laneY);
  grad.addColorStop(0, crest);
  grad.addColorStop(1, wash);
  fillUnder(ctx, pts, laneY, W, grad);
  // brushy crest line (dry brush, thin)
  ctx.save();
  ctx.globalAlpha = 0.5;
  brushStroke(ctx, pts.filter((_, i) => i % 2 === 0), 2.4, crest, false);
  ctx.restore();
}

export function drawGate(ctx, gateX, laneY, H, hpFrac, time = 0) {
  ctx.save();
  const baseY = laneY + 34;
  const w = 80;
  const h = 158;
  const x = gateX - w / 2;
  const y = baseY - h;

  // stone base (flattened ink-wash blob)
  ctx.save();
  ctx.translate(gateX, baseY - 6);
  ctx.scale(1, 0.5);
  inkBlob(ctx, 0, 0, w * 0.82, 12, 0.2, 12);
  ctx.fillStyle = '#2c2740';
  ctx.fill();
  ctx.restore();

  // pillars — gently curved brush columns
  const woodG = ctx.createLinearGradient(x, 0, x + w, 0);
  woodG.addColorStop(0, '#5a3f2c');
  woodG.addColorStop(0.5, '#74543a');
  woodG.addColorStop(1, '#4e3526');
  ctx.fillStyle = woodG;
  for (const px of [x + 9, x + w - 9]) {
    ctx.beginPath();
    ctx.moveTo(px - 8, baseY);
    ctx.quadraticCurveTo(px - 10, y + h / 2, px - 7, y + 8);
    ctx.lineTo(px + 7, y + 8);
    ctx.quadraticCurveTo(px + 10, y + h / 2, px + 8, baseY);
    ctx.closePath();
    ctx.fill();
  }

  // central wall — ink-wash plank panel with wavy edges
  ctx.fillStyle = '#553c2c';
  ctx.beginPath();
  ctx.moveTo(x + 14, y + 16);
  ctx.quadraticCurveTo(gateX, y + 12, x + w - 14, y + 16);
  ctx.lineTo(x + w - 14, baseY - 4);
  ctx.quadraticCurveTo(gateX, baseY + 2, x + 14, baseY - 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  ctx.lineWidth = 2;
  for (let i = 1; i < 5; i++) {
    const yy = y + 16 + i * (h - 24) / 5;
    ctx.beginPath();
    ctx.moveTo(x + 16, yy);
    ctx.quadraticCurveTo(gateX, yy + 3, x + w - 16, yy);
    ctx.stroke();
  }

  // sweeping calligraphic roof (one big brush stroke + upturned eaves)
  const roofY = y + 4;
  brushStroke(ctx, [
    { x: x - 30, y: roofY + 4 }, { x: x - 18, y: roofY - 6 },
    { x: gateX, y: roofY - 30 },
    { x: x + w + 18, y: roofY - 6 }, { x: x + w + 30, y: roofY + 4 },
  ], 16, '#2c2236', true);
  // ridge tile wash
  ctx.fillStyle = '#3b2e4a';
  ctx.beginPath();
  ctx.moveTo(x - 24, roofY + 2);
  ctx.quadraticCurveTo(gateX, roofY - 12, x + w + 24, roofY + 2);
  ctx.quadraticCurveTo(gateX, roofY + 8, x - 24, roofY + 2);
  ctx.closePath();
  ctx.fill();

  // glowing taegeuk ward (organic, brushed)
  const g = Math.max(0, Math.min(1, hpFrac));
  const wx = gateX, wy = baseY - h / 2 + 4, wr = 22;
  const pulse = 1 + Math.sin(time * 3) * 0.05;
  ctx.save();
  ctx.translate(wx, wy);
  ctx.scale(pulse, pulse);
  ctx.shadowColor = `hsl(${g * 120}, 45%, 42%)`;
  ctx.shadowBlur = 13;
  inkBlob(ctx, 0, 0, wr, 21, 0.06, 16);
  ctx.fillStyle = 'rgba(238,230,210,0.95)';
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.rotate(time * 0.5);
  ctx.fillStyle = '#9c3b34'; // 단청 muted cinnabar
  ctx.beginPath();
  ctx.arc(0, 0, wr, -Math.PI / 2, Math.PI / 2);
  ctx.arc(0, wr / 2, wr / 2, Math.PI / 2, -Math.PI / 2, true);
  ctx.arc(0, -wr / 2, wr / 2, Math.PI / 2, -Math.PI / 2);
  ctx.fill();
  ctx.fillStyle = '#345877'; // 단청 muted indigo
  ctx.beginPath();
  ctx.arc(0, 0, wr, Math.PI / 2, -Math.PI / 2);
  ctx.arc(0, -wr / 2, wr / 2, -Math.PI / 2, Math.PI / 2, true);
  ctx.arc(0, wr / 2, wr / 2, -Math.PI / 2, Math.PI / 2);
  ctx.fill();
  ctx.restore();

  // banner — a hanging brush stroke
  brushStroke(ctx, [{ x: gateX, y: roofY - 2 }, { x: gateX + 1, y: roofY + 14 }, { x: gateX, y: roofY + 26 }], 13, '#a8323f', false);
  ctx.fillStyle = '#e9c887';
  inkBlob(ctx, gateX, roofY + 8, 3, 31, 0.3, 7);
  ctx.fill();

  ctx.restore();
}

export function drawDokkaebi(ctx, e, time = 0) {
  ctx.save();
  const bob = Math.sin(e.bob) * 3;
  const x = e.x;
  const y = e.y + bob;
  const r = e.radius;
  const flash = e.hitFlash > 0;
  const frozen = e.slowT > 0;
  const seed = e.id * 131 + 7;
  const swing = Math.sin(e.bob * 1.2) * 0.4;

  // ink shadow
  ctx.save();
  ctx.translate(x, e.y + r * 0.98);
  ctx.scale(1, 0.28);
  inkBlob(ctx, 0, 0, r * 0.8, seed + 3, 0.3, 9);
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.fill();
  ctx.restore();

  let body = e.def.color;
  if (frozen) body = '#6fb6d6';

  // club (calligraphic brush) behind body
  ctx.save();
  ctx.translate(x - r * 0.62, y + r * 0.2);
  ctx.rotate(-0.5 + swing);
  brushStroke(ctx, [{ x: 0, y: 0 }, { x: -1, y: -r * 0.5 }, { x: 0, y: -r * 0.9 }], r * 0.18, '#5b3f28', false);
  ctx.fillStyle = '#6e4d31';
  inkBlob(ctx, 0, -r * 0.98, r * 0.28, seed + 11, 0.22, 9);
  ctx.fill();
  ctx.restore();

  // --- body: organic ink silhouette with wash shading ---
  inkBlob(ctx, x, y, r, seed, 0.14, 13);
  if (flash) {
    ctx.fillStyle = '#fff';
  } else {
    const bg = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.2, x, y, r * 1.05);
    bg.addColorStop(0, lighten(body, 30));
    bg.addColorStop(0.7, body);
    bg.addColorStop(1, darken(body, 28));
    ctx.fillStyle = bg;
  }
  ctx.fill();
  // brushed ink outline (slightly irregular via the blob path)
  ctx.lineWidth = Math.max(1.5, r * 0.07);
  ctx.strokeStyle = 'rgba(15,10,20,0.55)';
  ctx.stroke();

  // fur loincloth (brush flicks)
  ctx.fillStyle = '#5b3f28';
  for (let i = -3; i <= 3; i++) {
    brushStroke(ctx, [
      { x: x + i * r * 0.18, y: y + r * 0.5 },
      { x: x + i * r * 0.18 + 1, y: y + r * 0.78 },
      { x: x + i * r * 0.18, y: y + r * 0.98 },
    ], r * 0.16, '#5b3f28', true);
  }

  // belly wash
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#fff';
  inkBlob(ctx, x, y + r * 0.22, r * 0.46, seed + 5, 0.3, 9);
  ctx.fill();
  ctx.restore();

  // horns — tapered calligraphic strokes
  for (const s of [-1, 1]) {
    brushStroke(ctx, [
      { x: x + s * r * 0.42, y: y - r * 0.68 },
      { x: x + s * r * 0.78, y: y - r * 1.08 },
      { x: x + s * r * 0.6, y: y - r * 1.42 },
    ], r * 0.26, e.def.horn, true);
  }
  if (e.def.boss) {
    ctx.save();
    ctx.shadowColor = 'rgba(160,120,50,0.5)';
    ctx.shadowBlur = 5;
    for (let i = -2; i <= 2; i++) {
      brushStroke(ctx, [
        { x: x + i * r * 0.3, y: y - r * 0.82 },
        { x: x + i * r * 0.3 + 4, y: y - r * 1.12 },
      ], r * 0.14, '#c79a3e', true);
    }
    ctx.restore();
  }

  // angry brows (brush)
  for (const s of [-1, 1]) {
    brushStroke(ctx, [
      { x: x + s * r * 0.52, y: y - r * 0.34 },
      { x: x + s * r * 0.14, y: y - r * 0.15 },
    ], r * 0.1, '#140c10', true);
  }

  // eyes — muted amber ink (low glow)
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.shadowColor = flash ? 'transparent' : 'rgba(180,140,70,0.6)';
    ctx.shadowBlur = flash ? 0 : 3;
    ctx.fillStyle = flash ? '#000' : '#cfa455';
    inkBlob(ctx, x + s * r * 0.32, y - r * 0.04, r * 0.18, seed + (s > 0 ? 21 : 33), 0.3, 9);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#181009';
    inkBlob(ctx, x + s * r * 0.34, y - r * 0.01, r * 0.07, seed + 41, 0.3, 7);
    ctx.fill();
  }

  // fanged mouth (brush arc + tusks)
  brushStroke(ctx, [
    { x: x - r * 0.26, y: y + r * 0.38 },
    { x: x, y: y + r * 0.5 },
    { x: x + r * 0.26, y: y + r * 0.38 },
  ], r * 0.14, '#2a0d0d', true);
  ctx.fillStyle = '#f3ecd9';
  for (const s of [-1, 1]) {
    brushStroke(ctx, [
      { x: x + s * r * 0.12, y: y + r * 0.4 },
      { x: x + s * r * 0.08, y: y + r * 0.56 },
    ], r * 0.07, '#f3ecd9', true);
  }

  // frost wash
  if (frozen) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = 'rgba(220,250,255,0.9)';
    ctx.lineWidth = 2;
    inkBlob(ctx, x, y, r * 1.08, seed + 2, 0.16, 13);
    ctx.stroke();
    ctx.restore();
  }

  // hp bar (rounded, brushy)
  const bw = r * 1.9;
  const bx = x - bw / 2;
  const by = y - r - (e.def.boss ? 24 : 15);
  roundedBar(ctx, bx - 1.5, by - 1.5, bw + 3, 6, 'rgba(0,0,0,0.6)');
  const frac = Math.max(0, e.hp / e.maxHp);
  roundedBar(ctx, bx, by, bw * frac, 4, `hsl(${frac * 120}, 42%, 46%)`);
  if (e.def.boss) {
    ctx.fillStyle = '#e9c887';
    ctx.font = 'bold 12px "Apple SD Gothic Neo", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(e.def.name, x, by - 6);
  }

  ctx.restore();
}

function roundedBar(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  const r = h / 2;
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

function lighten(hex, amt) { return shift(hex, amt); }
function darken(hex, amt) { return shift(hex, -amt); }
function shift(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp(((n >> 16) & 255) + amt);
  const g = clamp(((n >> 8) & 255) + amt);
  const b = clamp((n & 255) + amt);
  return `rgb(${r},${g},${b})`;
}
function clamp(v) { return Math.max(0, Math.min(255, v)); }
