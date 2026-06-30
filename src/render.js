// render.js — procedural art with selectable styles (sumi / neon / stone).
// All shapes are drawn from paths; the active theme (themes.js) supplies the
// palette and a `style` that picks the background decorations.

import { getTheme } from './themes.js';
import { skyMotifs, cornerBranch, plumPetals } from './art.js';

function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function midpoint(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }

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
  // smooth the two edges with midpoint quadratics (no angular segments)
  for (let i = 1; i < n - 1; i++) {
    ctx.quadraticCurveTo(left[i].x, left[i].y, (left[i].x + left[i + 1].x) / 2, (left[i].y + left[i + 1].y) / 2);
  }
  ctx.lineTo(left[n - 1].x, left[n - 1].y);
  ctx.lineTo(right[n - 1].x, right[n - 1].y);
  for (let i = n - 1; i > 1; i--) {
    ctx.quadraticCurveTo(right[i - 1].x, right[i - 1].y, (right[i - 1].x + right[i - 2].x) / 2, (right[i - 1].y + right[i - 2].y) / 2);
  }
  ctx.lineTo(right[0].x, right[0].y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

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

// Dreamy floating light motes (bokeh) drifting gently upward, additive glow.
function bokeh(ctx, W, H, time, T) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 16; i++) {
    const speed = 4 + (i % 4) * 4;
    const bx = ((i * 97.3) % W) + Math.sin(time * 0.18 + i) * 40;
    const yy = H - (((time * speed) + i * 131) % (H + 80));
    const rad = 6 + (i % 5) * 5;
    const pulse = 0.5 + 0.5 * Math.sin(time * 1.1 + i * 1.3);
    const col = i % 3 === 0 ? T.ui.gold : (i % 3 === 1 ? '#cdd7ee' : T.ui.ink);
    const g = ctx.createRadialGradient(bx, yy, 0, bx, yy, rad);
    g.addColorStop(0, withAlpha(col, 0.08 + pulse * 0.10));
    g.addColorStop(1, withAlpha(col, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(bx, yy, rad, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// Subtle, stable hanji paper mottle so the whole scene reads as ink on paper.
function paperGrain(ctx, W, H, T) {
  const r = rng(20240);
  ctx.save();
  for (let i = 0; i < 26; i++) {
    ctx.globalAlpha = 0.012 + r() * 0.022;
    ctx.fillStyle = r() > 0.5 ? '#000000' : (T.style === 'neon' ? '#0a1830' : '#d8cba0');
    ctx.beginPath(); ctx.arc(r() * W, r() * H, 26 + r() * 130, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

export function drawBackground(ctx, W, H, laneY, wave, time = 0) {
  const T = getTheme();

  // sky
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  for (const [stop, col] of T.sky) sky.addColorStop(stop, col);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // dreamy colour wash near the horizon
  if (T.style !== 'neon') {
    const wash = ctx.createLinearGradient(0, laneY - 220, 0, laneY + 20);
    wash.addColorStop(0, 'rgba(86,74,128,0)');
    wash.addColorStop(1, T.style === 'stone' ? 'rgba(150,96,70,0.16)' : 'rgba(122,92,152,0.16)');
    ctx.fillStyle = wash; ctx.fillRect(0, laneY - 220, W, 240);
  }

  // stars / city lights
  const sr = rng(1337);
  ctx.save();
  ctx.fillStyle = T.star;
  for (let i = 0; i < 80; i++) {
    const x = sr() * W, y = sr() * laneY * 0.8, s = sr() * 1.5 + 0.5;
    const tw = 0.5 + 0.5 * Math.sin(time * 1.6 + i * 1.7);
    ctx.globalAlpha = (0.18 + sr() * 0.5) * (0.4 + tw * 0.6);
    if (T.glow > 1) { ctx.shadowColor = T.star; ctx.shadowBlur = 4; }
    ctx.beginPath();
    ctx.arc(x, y, s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  drawMoon(ctx, W, H, time, T);

  // calligraphic sky art: a faint enso, drifting clouds and a gliding crane
  skyMotifs(ctx, W, H, laneY, time, T);

  if (T.style === 'neon') neonMidground(ctx, W, H, laneY, time, T);
  else if (T.style === 'stone') stoneMidground(ctx, W, laneY, time, T);
  else sumiMidground(ctx, W, laneY, time, T);

  // ground
  const gpts = wavyTop(W, laneY + 4, T.style === 'neon' ? 4 : 10, 0.03, 303);
  const ground = ctx.createLinearGradient(0, laneY, 0, H);
  ground.addColorStop(0, T.ground[0]);
  ground.addColorStop(1, T.ground[1]);
  fillUnder(ctx, gpts, H, W, ground);

  if (T.style === 'neon') neonGrid(ctx, W, H, laneY, time, T);
  else {
    ctx.save();
    ctx.globalAlpha = 0.5;
    brushStroke(ctx, gpts.filter((_, i) => i % 2 === 0), 3, T.style === 'stone' ? '#241208' : '#0a0712', false);
    ctx.restore();
  }

  // drifting mist
  for (let i = 0; i < 3; i++) {
    const off = (time * (10 + i * 5) + i * 180) % (W + 260) - 130;
    ctx.save();
    ctx.globalAlpha = T.style === 'neon' ? 0.07 : 0.10;
    ctx.shadowColor = T.mist; ctx.shadowBlur = 24;
    ctx.translate(off, laneY + 8 + i * 9);
    ctx.scale(1, 0.16);
    inkBlob(ctx, 0, 0, 120, i * 17 + 4, 0.5, 9);
    ctx.fillStyle = T.mist;
    ctx.fill();
    ctx.restore();
  }

  // embers
  ctx.save();
  for (let i = 0; i < 12; i++) {
    const ex = (i * 103 + time * (7 + (i % 3) * 4)) % W;
    const ey = laneY - 26 - ((time * 13 + i * 64) % (laneY * 0.5));
    ctx.globalAlpha = 0.2 * (0.5 + 0.5 * Math.sin(time * 2 + i));
    ctx.fillStyle = i % 2 ? T.ui.gold : T.ui.ink;
    if (T.glow > 1) { ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 6; }
    ctx.beginPath(); ctx.arc(ex, ey, 1.7, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  // scanlines for neon
  if (T.style === 'neon') {
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = '#000';
    for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
    ctx.restore();
  }

  // overhanging plum branch (매화) framing the top corner
  cornerBranch(ctx, W, time, T);

  // dreamy floating light motes + drifting petals + hanji grain
  bokeh(ctx, W, H, time, T);
  if (T.style !== 'neon') plumPetals(ctx, W, H, time);
  paperGrain(ctx, W, H, T);

  // vignette
  const vig = ctx.createRadialGradient(W / 2, H * 0.5, H * 0.3, W / 2, H * 0.5, H * 0.8);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, T.style === 'stone' ? 'rgba(20,8,0,0.3)' : 'rgba(0,0,0,0.3)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

function drawMoon(ctx, W, H, time, T) {
  const mx = W * 0.79, my = H * 0.16, mr = 40;
  ctx.save();
  const halo = ctx.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 3.2);
  halo.addColorStop(0, T.moon.halo);
  halo.addColorStop(1, T.moon.halo.replace(/[\d.]+\)$/, '0)'));
  ctx.fillStyle = halo;
  ctx.fillRect(mx - mr * 3.2, my - mr * 3.2, mr * 6.4, mr * 6.4);
  // dreamy bloom + gentle light rays (non-neon)
  if (T.style !== 'neon') {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const bloom = ctx.createRadialGradient(mx, my, mr * 0.3, mx, my, mr * 4.4);
    bloom.addColorStop(0, 'rgba(247,240,214,0.16)');
    bloom.addColorStop(1, 'rgba(247,240,214,0)');
    ctx.fillStyle = bloom;
    ctx.fillRect(mx - mr * 4.4, my - mr * 4.4, mr * 8.8, mr * 8.8);
    ctx.translate(mx, my); ctx.rotate(time * 0.03);
    for (let i = 0; i < 12; i++) {
      ctx.rotate(Math.PI / 6);
      ctx.globalAlpha = 0.04 + 0.03 * Math.sin(time * 0.8 + i);
      const grd = ctx.createLinearGradient(0, 0, 0, -mr * 3.6);
      grd.addColorStop(0, 'rgba(247,240,214,0.5)');
      grd.addColorStop(1, 'rgba(247,240,214,0)');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.moveTo(-mr * 0.28, 0); ctx.lineTo(0, -mr * 3.6); ctx.lineTo(mr * 0.28, 0); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  if (T.moon.ring) { // neon concentric rings
    ctx.strokeStyle = T.moon.ring;
    ctx.shadowColor = T.moon.ring; ctx.shadowBlur = 10;
    for (let i = 1; i <= 3; i++) {
      ctx.globalAlpha = 0.5 - i * 0.1;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(mx, my, mr + i * 12 + Math.sin(time + i) * 2, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  }
  inkBlob(ctx, mx, my, mr, 7, T.style === 'sumi' ? 0.07 : 0.02, 16);
  const mg = ctx.createRadialGradient(mx - 12, my - 12, 6, mx, my, mr);
  mg.addColorStop(0, T.moon.core);
  mg.addColorStop(1, T.moon.edge);
  ctx.fillStyle = mg;
  if (T.glow > 1) { ctx.shadowColor = T.moon.core; ctx.shadowBlur = 24; }
  ctx.fill();
  ctx.shadowBlur = 0;
  if (T.style === 'sumi') {
    ctx.fillStyle = 'rgba(170,158,120,0.3)';
    const cr = rng(99);
    for (let i = 0; i < 5; i++) {
      const a = cr() * Math.PI * 2, d = cr() * mr * 0.6;
      inkBlob(ctx, mx + Math.cos(a) * d, my + Math.sin(a) * d, 3 + cr() * 6, i * 53 + 5, 0.4, 8);
      ctx.fill();
    }
  }
  ctx.restore();
}

function inkRidge(ctx, W, laneY, baseY, amp, freq, seed, wash, crest) {
  const pts = wavyTop(W, baseY, amp, freq, seed);
  const grad = ctx.createLinearGradient(0, baseY - amp, 0, laneY);
  grad.addColorStop(0, crest); grad.addColorStop(1, wash);
  fillUnder(ctx, pts, laneY, W, grad);
  ctx.save(); ctx.globalAlpha = 0.5;
  brushStroke(ctx, pts.filter((_, i) => i % 2 === 0), 2.4, crest, false);
  ctx.restore();
}

function sumiMidground(ctx, W, laneY, time, T) {
  inkRidge(ctx, W, laneY, laneY - 34, 30, 0.016, 11, withAlpha(T.ridge[0], 0.85), T.crest);
  inkRidge(ctx, W, laneY, laneY - 16, 44, 0.024, 27, withAlpha(T.ridge[1], 0.92), T.crest);
  inkRidge(ctx, W, laneY, laneY + 2, 58, 0.034, 41, T.ridge[2], T.crest);
  const br = rng(202);
  ctx.save();
  for (let i = 0; i < 9; i++) {
    const bx = br() * W, bh = 26 + br() * 30, lean = (br() - 0.5) * 14;
    const stalk = [];
    for (let s = 0; s <= 6; s++) {
      const t = s / 6;
      stalk.push({ x: bx + lean * t + Math.sin(time + i) * 1.5 * t, y: laneY + 4 - t * bh });
    }
    ctx.globalAlpha = 0.5;
    brushStroke(ctx, stalk, 3.4, '#0c0f17', true);
    for (let l = 0; l < 2; l++) {
      const ty = laneY + 4 - bh * (0.55 + l * 0.25), lx = bx + lean * (0.55 + l * 0.25), dir = l % 2 ? 1 : -1;
      brushStroke(ctx, [{ x: lx, y: ty }, { x: lx + dir * 10, y: ty - 6 }, { x: lx + dir * 20, y: ty - 8 }], 3, '#0c0f17', true);
    }
  }
  ctx.restore();
}

function stoneMidground(ctx, W, laneY, time, T) {
  // weathered ridges
  inkRidge(ctx, W, laneY, laneY - 30, 40, 0.012, 11, withAlpha(T.ridge[0], 0.9), T.crest);
  inkRidge(ctx, W, laneY, laneY - 8, 54, 0.02, 27, T.ridge[2], T.crest);
  // stone pagodas (stepped silhouettes)
  const pr = rng(404);
  ctx.fillStyle = '#241510';
  for (let k = 0; k < 3; k++) {
    const px = W * (0.2 + k * 0.32) + pr() * 30;
    const base = laneY + 2, tiers = 4 + Math.floor(pr() * 2);
    let w = 34 + pr() * 14;
    for (let t = 0; t < tiers; t++) {
      const ty = base - t * 16;
      ctx.fillRect(px - w / 2, ty - 14, w, 16);
      // eave lip
      ctx.fillRect(px - w / 2 - 3, ty - 14, w + 6, 3);
      w *= 0.78;
    }
    ctx.beginPath(); // finial
    ctx.moveTo(px, base - tiers * 16 - 8); ctx.lineTo(px - 4, base - tiers * 16); ctx.lineTo(px + 4, base - tiers * 16);
    ctx.closePath(); ctx.fill();
  }
  // flickering torches near the lane
  ctx.save();
  for (let i = 0; i < 4; i++) {
    const tx = W * (0.12 + i * 0.25);
    const fl = 0.7 + 0.3 * Math.sin(time * 9 + i * 2);
    ctx.fillStyle = '#3a2412';
    ctx.fillRect(tx - 1.5, laneY - 20, 3, 20);
    ctx.globalAlpha = fl;
    ctx.shadowColor = '#ff9a3c'; ctx.shadowBlur = 14;
    ctx.fillStyle = '#ffb24a';
    inkBlob(ctx, tx, laneY - 24, 5 + fl * 2, i * 13 + 7, 0.5, 8);
    ctx.fill();
  }
  ctx.restore();
}

function neonMidground(ctx, W, H, laneY, time, T) {
  // horizon glow band
  const glowG = ctx.createLinearGradient(0, laneY - 90, 0, laneY);
  glowG.addColorStop(0, 'rgba(255,60,172,0)');
  glowG.addColorStop(1, 'rgba(255,60,172,0.18)');
  ctx.fillStyle = glowG;
  ctx.fillRect(0, laneY - 90, W, 90);
  // city skyline with lit windows
  const cr = rng(515);
  for (let x = -10; x < W + 10;) {
    const bw = 16 + cr() * 26, bh = 30 + cr() * 70;
    const bx = x, by = laneY - bh;
    ctx.fillStyle = '#0c0a1e';
    ctx.fillRect(bx, by, bw, bh);
    // neon edge
    ctx.strokeStyle = cr() > 0.5 ? T.ui.ink : T.ui.gold;
    ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 6;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    // windows
    ctx.fillStyle = cr() > 0.5 ? T.ui.ink : '#ffe27a';
    for (let wy = by + 5; wy < laneY - 4; wy += 7) {
      for (let wx = bx + 3; wx < bx + bw - 3; wx += 6) {
        if (cr() > 0.55) { ctx.globalAlpha = 0.4 + cr() * 0.5; ctx.fillRect(wx, wy, 2.5, 3); }
      }
    }
    ctx.globalAlpha = 1;
    x += bw + 2 + cr() * 6;
  }
}

function neonGrid(ctx, W, H, laneY, time, T) {
  ctx.save();
  ctx.strokeStyle = T.ui.ink;
  ctx.shadowColor = T.ui.ink; ctx.shadowBlur = 6;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 1;
  const vanish = W / 2;
  // receding horizontal lines
  for (let i = 1; i <= 10; i++) {
    const y = laneY + (H - laneY) * (i / 10) ** 1.8;
    ctx.globalAlpha = 0.5 * (1 - i / 12);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  // fanning verticals
  ctx.globalAlpha = 0.4;
  for (let i = -6; i <= 6; i++) {
    ctx.beginPath();
    ctx.moveTo(vanish + i * 14, laneY);
    ctx.lineTo(vanish + i * (W / 9), H);
    ctx.stroke();
  }
  ctx.restore();
}

function withAlpha(hex, a) {
  if (hex[0] !== '#' || hex.length < 7) return hex;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function drawGate(ctx, gateX, laneY, H, hpFrac, time = 0, charge = 0) {
  const T = getTheme();
  const G = T.glow;
  ctx.save();
  const baseY = laneY + 34;
  const w = 80, h = 158;
  const x = gateX - w / 2, y = baseY - h;

  ctx.save();
  ctx.translate(gateX, baseY - 6); ctx.scale(1, 0.5);
  inkBlob(ctx, 0, 0, w * 0.82, 12, 0.2, 12);
  ctx.fillStyle = T.style === 'stone' ? '#3a281c' : '#2c2740';
  ctx.fill();
  ctx.restore();

  const woodG = ctx.createLinearGradient(x, 0, x + w, 0);
  if (T.style === 'stone') { woodG.addColorStop(0, '#6a4a2e'); woodG.addColorStop(0.5, '#86643e'); woodG.addColorStop(1, '#5a3c26'); }
  else if (T.style === 'neon') { woodG.addColorStop(0, '#2a1f3e'); woodG.addColorStop(0.5, '#3a2b56'); woodG.addColorStop(1, '#241a38'); }
  else { woodG.addColorStop(0, '#5a3f2c'); woodG.addColorStop(0.5, '#74543a'); woodG.addColorStop(1, '#4e3526'); }
  ctx.fillStyle = woodG;
  for (const px of [x + 9, x + w - 9]) {
    ctx.beginPath();
    ctx.moveTo(px - 8, baseY);
    ctx.quadraticCurveTo(px - 10, y + h / 2, px - 7, y + 8);
    ctx.lineTo(px + 7, y + 8);
    ctx.quadraticCurveTo(px + 10, y + h / 2, px + 8, baseY);
    ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = T.style === 'neon' ? '#241a38' : (T.style === 'stone' ? '#5a3c26' : '#553c2c');
  ctx.beginPath();
  ctx.moveTo(x + 14, y + 16);
  ctx.quadraticCurveTo(gateX, y + 12, x + w - 14, y + 16);
  ctx.lineTo(x + w - 14, baseY - 4);
  ctx.quadraticCurveTo(gateX, baseY + 2, x + 14, baseY - 4);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 2;
  for (let i = 1; i < 5; i++) {
    const yy = y + 16 + i * (h - 24) / 5;
    ctx.beginPath(); ctx.moveTo(x + 16, yy); ctx.quadraticCurveTo(gateX, yy + 3, x + w - 16, yy); ctx.stroke();
  }

  const roofY = y + 4;
  brushStroke(ctx, [
    { x: x - 30, y: roofY + 4 }, { x: x - 18, y: roofY - 6 }, { x: gateX, y: roofY - 30 },
    { x: x + w + 18, y: roofY - 6 }, { x: x + w + 30, y: roofY + 4 },
  ], 16, T.style === 'neon' ? '#1c1430' : (T.style === 'stone' ? '#2c1c10' : '#2c2236'), true);
  ctx.fillStyle = T.style === 'neon' ? '#2a1f44' : (T.style === 'stone' ? '#3a2614' : '#3b2e4a');
  ctx.beginPath();
  ctx.moveTo(x - 24, roofY + 2);
  ctx.quadraticCurveTo(gateX, roofY - 12, x + w + 24, roofY + 2);
  ctx.quadraticCurveTo(gateX, roofY + 8, x - 24, roofY + 2);
  ctx.closePath(); ctx.fill();

  // ward (taegeuk) — themed colours + health-tinted glow
  const g = Math.max(0, Math.min(1, hpFrac));
  const wx = gateX, wy = baseY - h / 2 + 4, wr = 22;
  const pulse = 1 + Math.sin(time * 3) * 0.05;
  // cast-charge: a bright energy halo gathering at the ward
  if (charge > 0.02) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const cr = wr * (1.4 + charge * 1.3);
    const hg = ctx.createRadialGradient(wx, wy, wr * 0.4, wx, wy, cr);
    hg.addColorStop(0, withAlpha('#fff7e0', 0.5 * charge));
    hg.addColorStop(0.5, withAlpha(T.fx(T.ui.gold), 0.4 * charge));
    hg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(wx, wy, cr, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.save();
  ctx.translate(wx, wy); ctx.scale(pulse * (1 + charge * 0.12), pulse * (1 + charge * 0.12));
  ctx.shadowColor = `hsl(${g * 120}, ${40 + G * 30}%, ${42 + G * 10}%)`;
  ctx.shadowBlur = 13 * G + 4 + charge * 22;
  inkBlob(ctx, 0, 0, wr, 21, 0.06, 16);
  ctx.fillStyle = T.style === 'neon' ? 'rgba(20,16,30,0.9)' : 'rgba(238,230,210,0.95)';
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.rotate(time * 0.5);
  ctx.fillStyle = T.taegeuk[0];
  ctx.beginPath();
  ctx.arc(0, 0, wr, -Math.PI / 2, Math.PI / 2);
  ctx.arc(0, wr / 2, wr / 2, Math.PI / 2, -Math.PI / 2, true);
  ctx.arc(0, -wr / 2, wr / 2, Math.PI / 2, -Math.PI / 2);
  ctx.fill();
  ctx.fillStyle = T.taegeuk[1];
  ctx.beginPath();
  ctx.arc(0, 0, wr, Math.PI / 2, -Math.PI / 2);
  ctx.arc(0, -wr / 2, wr / 2, -Math.PI / 2, Math.PI / 2, true);
  ctx.arc(0, wr / 2, wr / 2, -Math.PI / 2, Math.PI / 2);
  ctx.fill();
  ctx.restore();

  brushStroke(ctx, [{ x: gateX, y: roofY - 2 }, { x: gateX + 1, y: roofY + 14 }, { x: gateX, y: roofY + 26 }], 13, T.taegeuk[0], false);
  ctx.fillStyle = T.ui.gold;
  inkBlob(ctx, gateX, roofY + 8, 3, 31, 0.3, 7);
  ctx.fill();
  ctx.restore();
}

export function drawDokkaebi(ctx, e, time = 0) {
  const T = getTheme();
  const G = T.glow;
  ctx.save();
  const bob = Math.sin(e.bob) * 3;
  const x = e.x, y = e.y + bob, r = e.radius;
  const flash = e.hitFlash > 0;
  const frozen = e.slowT > 0;
  const seed = e.id * 131 + 7;
  const boss = e.def.boss;

  // gate lunge: surge toward the gate (left), lean and swell at the peak
  if (e.attacking) {
    const lp = Math.sin(Math.min(1, e.attackT / 0.34) * Math.PI);
    ctx.translate(x, y);
    ctx.translate(-lp * r * 0.8, lp * r * 0.08);
    ctx.rotate(-lp * 0.22);
    ctx.scale(1 + lp * 0.1, 1 + lp * 0.1);
    ctx.translate(-x, -y);
  }

  // ground shadow (under the circle)
  ctx.save();
  ctx.translate(x, e.y + r * 1.05); ctx.scale(1, 0.28);
  inkBlob(ctx, 0, 0, r * 0.82, seed + 3, 0.3, 9);
  ctx.fillStyle = 'rgba(0,0,0,0.34)'; ctx.fill();
  ctx.restore();

  let body = e.def.color;
  if (frozen) body = '#6fb6d6';
  body = T.fx(body);

  // ORV-style 도깨비: just a fluffy round head with short horns, big red
  // eyes and a fanged grin — no body.
  const furBase = flash ? '#ffffff' : mix(body, '#e7ddc6', 0.62);
  const furLt = flash ? '#ffffff' : mix(body, '#fbf5e8', 0.8);
  const furDk = flash ? '#e8e8ee' : mix(body, '#a89a7e', 0.45);

  if (boss) {
    drawBossMask(ctx, x, y, r, { flash, G, T });
  } else {
    // soft coloured ink bleed behind the head (wet sumi wash)
    if (!flash) {
      const halo = ctx.createRadialGradient(x, y, r * 0.78, x, y, r * 1.55);
      halo.addColorStop(0, withAlpha(body, 0.30));
      halo.addColorStop(1, withAlpha(body, 0));
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(x, y, r * 1.55, 0, Math.PI * 2); ctx.fill();
    }
    // --- the round head (soft egg, no hard corners) ---
    const head = [];
    for (let i = 0; i < 14; i++) {
      const a = -Math.PI / 2 + (i / 14) * Math.PI * 2;
      const wide = 1 - 0.08 * Math.sin(a);
      head.push({ x: x + Math.cos(a) * r * 0.95 * wide, y: y + Math.sin(a) * r * 1.04 });
    }
    smoothBlob(ctx, head);
    if (flash) ctx.fillStyle = '#fff';
    else {
      const bg = ctx.createLinearGradient(x, y - r, x, y + r);
      bg.addColorStop(0, furLt); bg.addColorStop(1, furDk);
      ctx.fillStyle = bg;
    }
    ctx.fill();
    // internal ink-wash mottle (clipped) — uneven, hand-painted wash
    if (!flash) {
      ctx.save();
      smoothBlob(ctx, head); ctx.clip();
      ctx.globalCompositeOperation = 'multiply';
      const mr2 = rng(seed + 17);
      for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = 0.07 + mr2() * 0.08;
        ctx.fillStyle = '#1a140e';
        inkBlob(ctx, x + (mr2() - 0.5) * r * 0.8, y + (0.12 + mr2() * 0.55) * r, r * (0.3 + mr2() * 0.3), seed + i * 9, 0.5, 8);
        ctx.fill();
      }
      ctx.restore();
    }
    // calligraphic brushed ink outline (enso-like, thick belly, dry open top)
    if (flash) { ctx.lineWidth = r * 0.05; ctx.strokeStyle = '#fff'; ctx.stroke(); }
    else {
      const rim = [];
      for (let i = 0; i <= 18; i++) {
        const a = -Math.PI * 0.5 + 0.18 + (i / 18) * (Math.PI * 2 - 0.36);
        const wide = 1 - 0.08 * Math.sin(a);
        rim.push({ x: x + Math.cos(a) * r * 0.95 * wide, y: y + Math.sin(a) * r * 1.05 });
      }
      brushStroke(ctx, rim, r * 0.1, '#1c1610', true);
    }

    // --- big slanted red eyes ---
    const eyeCol = flash ? '#3a1410' : '#e23f29';
    for (const s of [-1, 1]) {
      const ex = x + s * r * 0.33, ey = y - r * 0.06;
      ctx.save();
      ctx.translate(ex, ey); ctx.rotate(s * 0.3);
      ctx.fillStyle = '#180c08';
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.27, r * 0.18, 0, 0, Math.PI * 2); ctx.fill();
      if (!flash) { ctx.shadowColor = eyeCol; ctx.shadowBlur = 10 + G * 8; }
      const ig = ctx.createRadialGradient(-r * 0.05, -r * 0.05, r * 0.02, 0, 0, r * 0.2);
      ig.addColorStop(0, flash ? '#5a2018' : '#ffae84'); ig.addColorStop(0.5, eyeCol); ig.addColorStop(1, '#761a10');
      ctx.fillStyle = ig;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.2, r * 0.135, 0, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#160605';
      ctx.beginPath(); ctx.ellipse(r * 0.02, 0, r * 0.06, r * 0.1, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,244,236,0.85)';
      ctx.beginPath(); ctx.arc(-r * 0.06, -r * 0.05, r * 0.032, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // --- angry dark brows (a touch boss-like) ---
    for (const s of [-1, 1]) {
      brushStroke(ctx, [
        { x: x + s * r * 0.12, y: y - r * 0.28 },
        { x: x + s * r * 0.4, y: y - r * 0.36 },
        { x: x + s * r * 0.56, y: y - r * 0.24 },
      ], r * 0.08, '#1a0f0a', true);
    }

    // --- open fanged grin ---
    const my = y + r * 0.47, mw = r * 0.56;
    ctx.fillStyle = '#1b0708';
    ctx.beginPath();
    ctx.moveTo(x - mw / 2, my - r * 0.02);
    ctx.quadraticCurveTo(x, my - r * 0.1, x + mw / 2, my - r * 0.02);
    ctx.quadraticCurveTo(x + mw * 0.44, my + r * 0.32, x, my + r * 0.34);
    ctx.quadraticCurveTo(x - mw * 0.44, my + r * 0.32, x - mw / 2, my - r * 0.02);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f3ead6';
    for (const s of [-1, 1]) {
      const fxp = x + s * mw * 0.3;
      ctx.beginPath();
      ctx.moveTo(fxp - mw * 0.08, my - r * 0.02); ctx.lineTo(fxp + mw * 0.08, my - r * 0.02); ctx.lineTo(fxp, my + r * 0.13);
      ctx.closePath(); ctx.fill();
    }

    // --- sharp cone horns from the front of the forehead ---
    for (const s of [-1, 1]) {
      const bx = x + s * r * 0.3, bby = y - r * 0.66;     // base on the forehead
      const tipx = x + s * r * 0.56, tipy = y - r * 1.66; // sharp tip, up and out
      const bw2 = r * 0.24;
      ctx.beginPath();
      ctx.moveTo(bx - s * bw2 * 0.5, bby);
      ctx.lineTo(tipx, tipy);
      ctx.lineTo(bx + s * bw2 * 0.5, bby);
      ctx.closePath();
      const hg = ctx.createLinearGradient(bx, bby, tipx, tipy);
      hg.addColorStop(0, '#b58c3c'); hg.addColorStop(1, '#ecc873');
      ctx.fillStyle = flash ? '#fff' : hg; ctx.fill();
      ctx.lineWidth = Math.max(1, r * 0.022); ctx.lineJoin = 'round'; ctx.strokeStyle = '#3a2810'; ctx.stroke();
      // center ridge for a cone look
      ctx.save(); ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.moveTo(bx, bby - r * 0.02); ctx.lineTo(tipx, tipy);
      ctx.lineWidth = Math.max(1, r * 0.016); ctx.strokeStyle = '#6e5018'; ctx.stroke();
      ctx.restore();
    }
  }

  // frost shell
  if (frozen) {
    ctx.save(); ctx.globalAlpha = 0.55; ctx.strokeStyle = 'rgba(220,250,255,0.9)'; ctx.lineWidth = 2;
    inkBlob(ctx, x, y, r * 1.1, seed + 2, 0.16, 13); ctx.stroke();
    ctx.restore();
  }

  // hp bar
  const bw = r * 1.9, bx = x - bw / 2, by = y - r - (boss ? 46 : 20);
  roundedBar(ctx, bx - 1.5, by - 1.5, bw + 3, 6, 'rgba(0,0,0,0.6)');
  const frac = Math.max(0, e.hp / e.maxHp);
  roundedBar(ctx, bx, by, bw * frac, 4, `hsl(${frac * 120}, 42%, 46%)`);
  if (boss) {
    ctx.fillStyle = T.ui.gold;
    ctx.font = "bold 13px 'Gowun Batang', 'Apple SD Gothic Neo', serif";
    ctx.textAlign = 'center';
    ctx.fillText(e.bossName || e.def.name, x, by - 6);
  }
  ctx.restore();
}

// Boss 도깨비: a traditional 귀면 (goblin-face) mask in black ink — curling
// horns, flame brows, bulging red eyes and a row of big square teeth.
function drawBossMask(ctx, x, y, r, o) {
  const { flash, G, T } = o;
  const ink = flash ? '#ffffff' : '#161109';
  const tooth = flash ? '#ffffff' : '#f1ead6';
  const eyeCol = flash ? '#3a1410' : '#ff5326';

  // red aura behind the mask
  ctx.save();
  ctx.shadowColor = T.fx('#ff5a2a'); ctx.shadowBlur = 26; ctx.globalAlpha = 0.7;
  ctx.fillStyle = withAlpha('#ff5a2a', 0.16);
  ctx.beginPath(); ctx.arc(x, y, r * 1.02, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // ===== dark ink silhouette: ornaments first, then the face over them =====
  // central flame crest
  for (let i = -1; i <= 1; i++) {
    brushStroke(ctx, [
      { x: x + i * r * 0.24, y: y - r * 0.5 },
      { x: x + i * r * 0.3, y: y - r * 0.98 },
      { x: x + i * r * 0.18, y: y - r * 1.32 },
    ], r * 0.15, ink, true);
  }
  // big curling horns (top corners, hooking outward)
  for (const s of [-1, 1]) {
    brushStroke(ctx, [
      { x: x + s * r * 0.45, y: y - r * 0.48 },
      { x: x + s * r * 0.86, y: y - r * 1.0 },
      { x: x + s * r * 1.2, y: y - r * 1.26 },
      { x: x + s * r * 1.46, y: y - r * 1.04 },
      { x: x + s * r * 1.4, y: y - r * 0.74 },
    ], r * 0.2, ink, true);
  }
  // cheek flame whiskers sweeping out
  for (const s of [-1, 1]) {
    brushStroke(ctx, [
      { x: x + s * r * 0.55, y: y + r * 0.02 },
      { x: x + s * r * 1.1, y: y - r * 0.12 },
      { x: x + s * r * 1.46, y: y - r * 0.36 },
    ], r * 0.15, ink, true);
    brushStroke(ctx, [
      { x: x + s * r * 0.5, y: y + r * 0.34 },
      { x: x + s * r * 1.02, y: y + r * 0.42 },
      { x: x + s * r * 1.34, y: y + r * 0.24 },
    ], r * 0.13, ink, true);
  }
  // face mass
  ctx.fillStyle = ink;
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.05, r * 0.92, r * 0.98, 0, 0, Math.PI * 2); ctx.fill();
  // flame brows on the face
  for (const s of [-1, 1]) {
    brushStroke(ctx, [
      { x: x + s * r * 0.06, y: y - r * 0.34 },
      { x: x + s * r * 0.46, y: y - r * 0.48 },
      { x: x + s * r * 0.78, y: y - r * 0.38 },
      { x: x + s * r * 0.96, y: y - r * 0.58 },
    ], r * 0.16, ink, true);
  }

  // ===== bulging eyes =====
  for (const s of [-1, 1]) {
    const ex = x + s * r * 0.42, ey = y - r * 0.04;
    ctx.fillStyle = tooth;
    ctx.beginPath(); ctx.arc(ex, ey, r * 0.26, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    if (!flash) { ctx.shadowColor = eyeCol; ctx.shadowBlur = 14 + G * 10; }
    ctx.fillStyle = eyeCol;
    ctx.beginPath(); ctx.arc(ex, ey, r * 0.15, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#150505';
    ctx.beginPath(); ctx.arc(ex, ey, r * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,230,0.85)';
    ctx.beginPath(); ctx.arc(ex - r * 0.05, ey - r * 0.05, r * 0.03, 0, Math.PI * 2); ctx.fill();
  }
  // trilobe nose
  ctx.fillStyle = tooth;
  for (const dx of [-0.12, 0, 0.12]) {
    ctx.beginPath(); ctx.arc(x + dx * r, y + r * 0.24, r * 0.066, 0, Math.PI * 2); ctx.fill();
  }

  // ===== snarling mouth with big square teeth =====
  const my = y + r * 0.62, mw = r * 1.0, mh = r * 0.52;
  ctx.fillStyle = flash ? '#ffffff' : '#0b0905';
  ctx.beginPath();
  ctx.moveTo(x - mw / 2, my - mh * 0.45);
  ctx.quadraticCurveTo(x, my - mh * 0.64, x + mw / 2, my - mh * 0.45);
  ctx.lineTo(x + mw * 0.34, my + mh * 0.62);
  ctx.quadraticCurveTo(x, my + mh * 0.8, x - mw * 0.34, my + mh * 0.62);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = tooth;
  const tn = 5, totalW = mw * 0.72, gap = totalW / tn;
  for (let i = 0; i < tn; i++) {
    ctx.fillRect(x - totalW / 2 + i * gap + gap * 0.12, my - mh * 0.36, gap * 0.76, mh * 0.52);
  }
  for (let i = 0; i < 2; i++) {
    ctx.fillRect(x - gap * 0.82 + i * gap * 0.9, my + mh * 0.2, gap * 0.7, mh * 0.3);
  }
  // curled tusks at the mouth corners
  for (const s of [-1, 1]) {
    brushStroke(ctx, [
      { x: x + s * mw * 0.48, y: my - mh * 0.3 },
      { x: x + s * mw * 0.6, y: my + mh * 0.22 },
      { x: x + s * mw * 0.44, y: my + mh * 0.66 },
    ], r * 0.09, tooth, true);
  }
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
  ctx.closePath(); ctx.fill();
}

// Draw a smooth closed curve through points (midpoint-quadratic).
function smoothBlob(ctx, pts) {
  const n = pts.length;
  ctx.beginPath();
  const m0 = { x: (pts[n - 1].x + pts[0].x) / 2, y: (pts[n - 1].y + pts[0].y) / 2 };
  ctx.moveTo(m0.x, m0.y);
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    ctx.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2);
  }
  ctx.closePath();
}

// Blend hex `a` toward hex `b` by t (0..1) → rgb() string.
function mix(a, b, t) {
  if (!a || a[0] !== '#' || a.length < 7) return a;
  const bb = (b && b[0] === '#' && b.length >= 7) ? b : '#000000';
  const pa = parseInt(a.slice(1), 16), pb = parseInt(bb.slice(1), 16);
  const c = (sa, sb) => Math.round(sa * (1 - t) + sb * t);
  return `rgb(${c((pa >> 16) & 255, (pb >> 16) & 255)},${c((pa >> 8) & 255, (pb >> 8) & 255)},${c(pa & 255, pb & 255)})`;
}

function shift(hex, amt) {
  if (!hex || hex[0] !== '#') return hex;
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, v));
  return `rgb(${c(((n >> 16) & 255) + amt)},${c(((n >> 8) & 255) + amt)},${c((n & 255) + amt)})`;
}
