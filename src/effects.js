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
