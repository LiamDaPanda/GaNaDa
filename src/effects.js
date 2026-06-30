// effects.js — animated spell visuals (shockwaves, lightning, beams, meteors,
// frost shards). Each effect owns its lifetime and draw routine and is tinted
// by the active theme (neon glows in cyberpunk, restrained ink elsewhere).
import { getTheme } from './themes.js';

const easeOut = (k) => 1 - (1 - k) * (1 - k);

class Effect {
  constructor(life) { this.life = life; this.maxLife = life; this.dead = false; }
  update(dt) { this.life -= dt; if (this.life <= 0) this.dead = true; }
  get k() { return Math.min(1, 1 - this.life / this.maxLife); } // 0→1 progress
}

// Expanding ring (explosions, nova, shockwaves).
export class Ring extends Effect {
  constructor(x, y, r0, r1, life, color, width = 5) {
    super(life); this.x = x; this.y = y; this.r0 = r0; this.r1 = r1; this.color = color; this.width = width;
  }
  draw(ctx) {
    const T = getTheme(); const k = this.k;
    const r = this.r0 + (this.r1 - this.r0) * easeOut(k);
    ctx.save();
    ctx.globalAlpha = (1 - k) * 0.85;
    ctx.strokeStyle = T.fx(this.color);
    ctx.lineWidth = this.width * (1 - k * 0.55);
    if (T.glow > 0.6) { ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 14 * T.glow; }
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// Soft radial flash (impact core).
export class Flash extends Effect {
  constructor(x, y, r, life, color) { super(life); this.x = x; this.y = y; this.r = r; this.color = color; }
  draw(ctx) {
    const T = getTheme(); const k = this.k;
    const r = this.r * (0.5 + 0.8 * easeOut(k));
    const col = T.fx(this.color);
    const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r);
    g.addColorStop(0, hexA(col, (1 - k) * 0.8));
    g.addColorStop(0.5, hexA(col, (1 - k) * 0.3));
    g.addColorStop(1, hexA(col, 0));
    ctx.save();
    if (T.glow > 1) ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(this.x, this.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// Jagged lightning arc that flickers then fades.
export class Bolt extends Effect {
  constructor(ax, ay, bx, by, color) {
    super(0.22); this.ax = ax; this.ay = ay; this.bx = bx; this.by = by; this.color = color;
    this.segs = 7; this.seed = Math.random() * 1000;
  }
  draw(ctx) {
    const T = getTheme();
    const a = 1 - this.k;
    const jitter = (1 - this.k) * 18 + 4;
    const pts = [];
    for (let i = 0; i <= this.segs; i++) {
      const tt = i / this.segs;
      const x = this.ax + (this.bx - this.ax) * tt;
      const y = this.ay + (this.by - this.ay) * tt;
      const off = i === 0 || i === this.segs ? 0 : (Math.sin(this.seed + i * 9.7 + performance.now() * 0.05) * jitter);
      pts.push({ x: x + off, y: y + Math.cos(this.seed + i * 7.1) * off });
    }
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = T.fx(this.color);
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 12 * Math.max(0.6, T.glow);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (const p of pts) ctx.lineTo(p.x, p.y);
    ctx.stroke();
    // bright core
    ctx.shadowBlur = 0; ctx.globalAlpha = a * 0.9;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
  }
}

// Sweeping horizontal beam (dragon's breath / wave).
export class Beam extends Effect {
  constructor(x0, x1, y, thick, color, life = 0.5) {
    super(life); this.x0 = x0; this.x1 = x1; this.y = y; this.thick = thick; this.color = color;
  }
  draw(ctx) {
    const T = getTheme(); const k = this.k;
    const grow = Math.sin(Math.PI * Math.min(1, k * 1.3)); // swell then thin
    const h = this.thick * (0.3 + grow);
    const col = T.fx(this.color);
    ctx.save();
    if (T.glow > 1) ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, this.y - h, 0, this.y + h);
    g.addColorStop(0, hexA(col, 0));
    g.addColorStop(0.5, hexA(col, (1 - k) * 0.85));
    g.addColorStop(1, hexA(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(this.x0, this.y - h, this.x1 - this.x0, h * 2);
    // bright core line
    ctx.globalAlpha = (1 - k) * 0.9;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.shadowColor = col; ctx.shadowBlur = 16 * Math.max(0.7, T.glow);
    ctx.beginPath(); ctx.moveTo(this.x0, this.y); ctx.lineTo(this.x1, this.y); ctx.stroke();
    ctx.restore();
  }
}

// Radiating shards (frost / impact spikes).
export class Shards extends Effect {
  constructor(x, y, n, len, color) {
    super(0.5); this.x = x; this.y = y; this.color = color;
    this.shards = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      this.shards.push({ a, len: len * (0.6 + Math.random() * 0.6) });
    }
  }
  draw(ctx) {
    const T = getTheme(); const k = this.k;
    const col = T.fx(this.color);
    ctx.save();
    ctx.globalAlpha = (1 - k);
    ctx.strokeStyle = col; ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    if (T.glow > 0.8) { ctx.shadowColor = col; ctx.shadowBlur = 8 * T.glow; }
    for (const s of this.shards) {
      const r = s.len * easeOut(k);
      ctx.beginPath();
      ctx.moveTo(this.x + Math.cos(s.a) * r * 0.3, this.y + Math.sin(s.a) * r * 0.3);
      ctx.lineTo(this.x + Math.cos(s.a) * r, this.y + Math.sin(s.a) * r);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// A bright tapered streak (lance / slash).
export class Streak extends Effect {
  constructor(x0, y0, x1, y1, thick, color) {
    super(0.28); this.x0 = x0; this.y0 = y0; this.x1 = x1; this.y1 = y1; this.thick = thick; this.color = color;
  }
  draw(ctx) {
    const T = getTheme(); const a = 1 - this.k;
    const col = T.fx(this.color);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineWidth = this.thick * a;
    ctx.shadowColor = col; ctx.shadowBlur = 14 * Math.max(0.6, T.glow);
    ctx.beginPath(); ctx.moveTo(this.x0, this.y0); ctx.lineTo(this.x1, this.y1); ctx.stroke();
    ctx.globalAlpha = a * 0.9; ctx.shadowBlur = 0; ctx.strokeStyle = '#fff'; ctx.lineWidth = this.thick * a * 0.4;
    ctx.stroke();
    ctx.restore();
  }
}

// 도깨비불 — a small drifting ghost-flame wisp (ambient menace).
export class Wisp extends Effect {
  constructor(x, y, color) { super(0.8); this.x = x; this.y = y; this.color = color; this.vy = -20 - Math.random() * 20; this.vx = (Math.random() - 0.5) * 20; }
  update(dt) { super.update(dt); this.x += this.vx * dt; this.y += this.vy * dt; }
  draw(ctx) {
    const T = getTheme(); const a = 1 - this.k;
    ctx.save();
    ctx.globalAlpha = a * 0.7;
    ctx.fillStyle = T.fx(this.color);
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, 3 * a + 1, 5 * a + 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Dark rising smoke puffs (fire).
export class Smoke extends Effect {
  constructor(x, y, r) {
    super(0.7); this.x = x; this.y = y; this.r = r;
    this.puffs = [];
    for (let i = 0; i < 4; i++) this.puffs.push({ dx: (Math.random() - 0.5) * r * 0.8, dy: -Math.random() * r * 0.3, r: r * (0.35 + Math.random() * 0.4) });
  }
  draw(ctx) {
    const k = this.k;
    ctx.save();
    ctx.globalAlpha = (1 - k) * 0.38;
    ctx.fillStyle = '#3a3340';
    for (const p of this.puffs) {
      ctx.beginPath();
      ctx.arc(this.x + p.dx, this.y + p.dy - k * this.r * 0.6, p.r * (0.6 + k), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// Radiating ground cracks (earth).
export class Crack extends Effect {
  constructor(x, y, len, color) {
    super(0.7); this.x = x; this.y = y; this.color = color;
    this.lines = [];
    const n = 5;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      const segs = []; let px = 0, py = 0;
      for (let j = 0; j < 3; j++) {
        px += Math.cos(a) * len / 3 + (Math.random() - 0.5) * len * 0.2;
        py += Math.sin(a) * len / 3 * 0.35 + (Math.random() - 0.5) * len * 0.08;
        segs.push({ x: px, y: py });
      }
      this.lines.push(segs);
    }
  }
  draw(ctx) {
    const T = getTheme(); const k = this.k;
    ctx.save();
    ctx.globalAlpha = (1 - k);
    ctx.strokeStyle = T.fx(this.color); ctx.lineWidth = 2.5 * (1 - k); ctx.lineCap = 'round';
    const grow = easeOut(Math.min(1, k * 2));
    for (const segs of this.lines) {
      ctx.beginPath(); ctx.moveTo(this.x, this.y);
      for (const s of segs) ctx.lineTo(this.x + s.x * grow, this.y + s.y * grow);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// Blooming ice crystals (frost).
export class Crystal extends Effect {
  constructor(x, y, r, color) {
    super(0.6); this.x = x; this.y = y; this.r = r; this.color = color;
    this.spikes = [];
    for (let i = 0; i < 6; i++) this.spikes.push({ a: (i / 6) * Math.PI * 2 + Math.random() * 0.3, len: r * (0.5 + Math.random() * 0.6) });
  }
  draw(ctx) {
    const T = getTheme(); const k = this.k; const col = T.fx(this.color);
    ctx.save();
    ctx.globalAlpha = (1 - k);
    ctx.strokeStyle = col; ctx.fillStyle = hexA(col, 0.22); ctx.lineWidth = 2;
    if (T.glow > 0.8) { ctx.shadowColor = col; ctx.shadowBlur = 8; }
    const grow = easeOut(Math.min(1, k * 1.6));
    for (const sp of this.spikes) {
      const L = sp.len * grow;
      const ex = this.x + Math.cos(sp.a) * L, ey = this.y + Math.sin(sp.a) * L;
      const mx = this.x + Math.cos(sp.a) * L * 0.5, my = this.y + Math.sin(sp.a) * L * 0.5;
      const wx = Math.cos(sp.a + Math.PI / 2) * L * 0.16, wy = Math.sin(sp.a + Math.PI / 2) * L * 0.16;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y); ctx.lineTo(mx + wx, my + wy); ctx.lineTo(ex, ey); ctx.lineTo(mx - wx, my - wy);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }
}

// Rising poison cloud.
export class Gas extends Effect {
  constructor(x, y, r, color) {
    super(1.0); this.x = x; this.y = y; this.r = r; this.color = color;
    this.blobs = [];
    for (let i = 0; i < 6; i++) this.blobs.push({ dx: (Math.random() - 0.5) * r, dy: (Math.random() - 0.5) * r * 0.6, r: r * (0.3 + Math.random() * 0.4), vy: -10 - Math.random() * 16 });
  }
  draw(ctx) {
    const T = getTheme(); const k = this.k;
    ctx.save();
    ctx.globalAlpha = (1 - k) * 0.32;
    ctx.fillStyle = T.fx(this.color);
    for (const b of this.blobs) {
      ctx.beginPath();
      ctx.arc(this.x + b.dx, this.y + b.dy + b.vy * k * 4, b.r * (0.7 + k * 0.8), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// Radiant rays (holy / sun / light).
export class Rays extends Effect {
  constructor(x, y, r, color) { super(0.55); this.x = x; this.y = y; this.r = r; this.color = color; this.rot = Math.random() * Math.PI; }
  draw(ctx) {
    const T = getTheme(); const k = this.k; const col = T.fx(this.color);
    ctx.save();
    ctx.translate(this.x, this.y); ctx.rotate(this.rot + k * 0.5);
    ctx.globalAlpha = (1 - k) * 0.6; ctx.fillStyle = col;
    if (T.glow > 0.6) { ctx.shadowColor = col; ctx.shadowBlur = 12; }
    const n = 12; const len = this.r * (0.6 + easeOut(k) * 0.8);
    for (let i = 0; i < n; i++) {
      ctx.rotate((Math.PI * 2) / n);
      ctx.beginPath();
      ctx.moveTo(0, -2.4); ctx.lineTo(len, -0.6); ctx.lineTo(len, 0.6); ctx.lineTo(0, 2.4);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
}

function hexA(hex, a) {
  if (hex[0] !== '#' || hex.length < 7) return hex;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// ===========================================================================
// Calligraphic ink effects — luminous "white ink on dark paper" brushwork.
// Spells read as hand-painted sumi-e bursts; the spell's element colour is
// kept only as a soft glow so the look stays black-and-white-ish.
// ===========================================================================

const INK_LIGHT = '#efe7d2'; // warm rice-paper ink
const INK_DEEP = '#0e0b07';

// Local organic-blob + tapered-ribbon helpers (kept self-contained).
function eRng(seed) { let s = (seed >>> 0) || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function eBlob(ctx, cx, cy, r, seed, wob = 0.22, lobes = 11) {
  const rnd = eRng(seed); const pts = [];
  for (let i = 0; i < lobes; i++) {
    const a = (i / lobes) * Math.PI * 2;
    const rr = r * (1 - wob / 2 + rnd() * wob);
    pts.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr });
  }
  ctx.beginPath();
  const m0 = { x: (pts[lobes - 1].x + pts[0].x) / 2, y: (pts[lobes - 1].y + pts[0].y) / 2 };
  ctx.moveTo(m0.x, m0.y);
  for (let i = 0; i < lobes; i++) {
    const p = pts[i], q = pts[(i + 1) % lobes];
    ctx.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2);
  }
  ctx.closePath();
}
function eRibbon(ctx, pts, widths, color) {
  const n = pts.length; if (n < 2) return;
  const w = (i) => (Array.isArray(widths) ? widths[i] : widths);
  const left = [], right = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i], prev = pts[Math.max(0, i - 1)], next = pts[Math.min(n - 1, i + 1)];
    let dx = next.x - prev.x, dy = next.y - prev.y; const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
    const hw = w(i);
    left.push({ x: p.x - dy * hw, y: p.y + dx * hw });
    right.push({ x: p.x + dy * hw, y: p.y - dx * hw });
  }
  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y);
  for (let i = 1; i < n; i++) ctx.lineTo(left[i].x, left[i].y);
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
  ctx.closePath();
  ctx.fillStyle = color; ctx.fill();
  ctx.beginPath();
  ctx.arc(pts[0].x, pts[0].y, w(0), 0, Math.PI * 2);
  ctx.arc(pts[n - 1].x, pts[n - 1].y, w(n - 1), 0, Math.PI * 2);
  ctx.fill();
}

// Diffusing ink bloom — a wet wash that spreads and soaks away (impact core).
export class InkWash extends Effect {
  constructor(x, y, r, color) { super(0.5); this.x = x; this.y = y; this.r = r; this.color = color; }
  draw(ctx) {
    const T = getTheme(); const k = this.k;
    const r = this.r * (0.4 + easeOut(k));
    const col = T.fx(this.color);
    const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r);
    g.addColorStop(0, hexA('#fffaf0', (1 - k) * 0.6));
    g.addColorStop(0.4, hexA(col, (1 - k) * 0.34));
    g.addColorStop(1, hexA(col, 0));
    ctx.save();
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(this.x, this.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// Thrown ink — a wet central splash flinging a corona of droplets.
export class InkSplat extends Effect {
  constructor(x, y, r, color) {
    super(0.6); this.x = x; this.y = y; this.r = r; this.color = color;
    this.seed = (Math.random() * 1000) | 0;
    this.drops = [];
    const n = 9 + (r > 80 ? 6 : 0);
    for (let i = 0; i < n; i++) {
      this.drops.push({ a: Math.random() * Math.PI * 2, d: r * (0.5 + Math.random() * 0.95), s: r * (0.03 + Math.random() * 0.07), seed: i * 13 + 3 });
    }
  }
  draw(ctx) {
    const T = getTheme(); const k = this.k; const a = 1 - k;
    const col = T.fx(this.color);
    ctx.save();
    if (T.glow > 0.6) { ctx.shadowColor = col; ctx.shadowBlur = 10 * T.glow; }
    // central wet blob
    const br = this.r * (0.3 + 0.45 * easeOut(k));
    ctx.globalAlpha = a * 0.95; ctx.fillStyle = INK_LIGHT;
    eBlob(ctx, this.x, this.y, br, this.seed, 0.32, 11); ctx.fill();
    // coloured heart
    ctx.shadowBlur = 0;
    ctx.globalAlpha = a * 0.55; ctx.fillStyle = col;
    eBlob(ctx, this.x, this.y, br * 0.58, this.seed + 5, 0.32, 10); ctx.fill();
    // flung droplets
    ctx.globalAlpha = a * 0.85; ctx.fillStyle = INK_LIGHT;
    for (const d of this.drops) {
      const dd = d.d * easeOut(Math.min(1, k * 1.25));
      eBlob(ctx, this.x + Math.cos(d.a) * dd, this.y + Math.sin(d.a) * dd, d.s * (1.1 - k * 0.5), d.seed, 0.4, 7); ctx.fill();
    }
    ctx.restore();
  }
}

// Enso burst — a single brush sweep that draws on, then soaks away.
export class Enso extends Effect {
  constructor(x, y, r, color, life = 0.7) {
    super(life); this.x = x; this.y = y; this.r = r; this.color = color;
    this.seed = Math.random() * 1000; this.start = Math.random() * Math.PI * 2;
  }
  draw(ctx) {
    const T = getTheme(); const k = this.k;
    const drawP = Math.min(1, k / 0.55);
    const fade = k < 0.55 ? 1 : 1 - (k - 0.55) / 0.45;
    const sweep = Math.PI * 1.9 * easeOut(drawP);
    const steps = 40; const pts = [], ws = [];
    const baseW = this.r * 0.1;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps; const ang = this.start + sweep * t;
      const rr = this.r * (1 + Math.sin(t * 7 + this.seed) * 0.02);
      pts.push({ x: this.x + Math.cos(ang) * rr, y: this.y + Math.sin(ang) * rr });
      ws.push(baseW * (0.35 + 0.85 * Math.sin(Math.PI * Math.min(1, t * 1.05)) ** 0.85));
    }
    ctx.save();
    ctx.globalAlpha = fade * 0.9;
    if (T.glow > 0.5) { ctx.shadowColor = T.fx(this.color); ctx.shadowBlur = 12 * Math.max(0.6, T.glow); }
    eRibbon(ctx, pts, ws, INK_LIGHT);
    ctx.restore();
  }
}

// Calligraphic brush slash — a tapered cut that reveals fast then soaks away.
export class BrushSlash extends Effect {
  constructor(x0, y0, x1, y1, thick, color) {
    super(0.4); this.x0 = x0; this.y0 = y0; this.x1 = x1; this.y1 = y1; this.thick = thick; this.color = color;
    this.seed = Math.random() * 1000;
  }
  draw(ctx) {
    const T = getTheme(); const k = this.k;
    const reveal = Math.min(1, k / 0.32); const fade = k < 0.32 ? 1 : 1 - (k - 0.32) / 0.68;
    const dx = this.x1 - this.x0, dy = this.y1 - this.y0; const L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L;
    const n = 12; const pts = [], ws = [];
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * reveal;
      const wob = Math.sin(t * 9 + this.seed) * this.thick * 0.14;
      pts.push({ x: this.x0 + dx * t + nx * wob, y: this.y0 + dy * t + ny * wob });
      ws.push(this.thick * 0.5 * Math.sin(Math.PI * Math.min(1, t)) ** 0.6 + 1.2);
    }
    ctx.save();
    ctx.globalAlpha = fade;
    if (T.glow > 0.5) { ctx.shadowColor = T.fx(this.color); ctx.shadowBlur = 14 * Math.max(0.6, T.glow); }
    eRibbon(ctx, pts, ws, INK_LIGHT);
    ctx.restore();
  }
}

// The cast syllable stamped in brush ink — calligraphy tied to the spell.
export class InkGlyph extends Effect {
  constructor(x, y, text, color, size = 72) { super(0.95); this.x = x; this.y = y; this.text = text; this.color = color; this.size = size; }
  draw(ctx) {
    const T = getTheme(); const k = this.k;
    const inA = Math.min(1, k / 0.16);
    const out = k < 0.5 ? 1 : 1 - (k - 0.5) / 0.5;
    const scale = 0.78 + easeOut(Math.min(1, k)) * 0.5;
    ctx.save();
    ctx.translate(this.x, this.y); ctx.scale(scale, scale);
    ctx.globalAlpha = inA * out;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `${this.size}px 'Nanum Brush Script', cursive`;
    ctx.shadowColor = T.fx(this.color); ctx.shadowBlur = 22; // coloured ink bleed
    ctx.fillStyle = INK_DEEP; ctx.fillText(this.text, 2, 2);
    ctx.shadowBlur = 0;
    ctx.fillStyle = INK_LIGHT; ctx.fillText(this.text, 0, 0);
    ctx.restore();
  }
}
