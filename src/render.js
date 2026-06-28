// render.js — procedural canvas art (no image assets). Original artwork drawn
// with paths/gradients: a layered moonlit night, a Korean hanok gate with a
// glowing taegeuk ward, and clubbed dokkaebi goblins.

// Tiny deterministic PRNG so star/mountain positions stay put frame-to-frame.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function drawBackground(ctx, W, H, laneY, wave, time = 0) {
  const hue = 232 + (wave % 8) * 5;

  // --- sky gradient ---
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, `hsl(${hue}, 52%, 9%)`);
  sky.addColorStop(0.45, `hsl(${hue + 8}, 46%, 15%)`);
  sky.addColorStop(0.75, `hsl(${hue + 16}, 38%, 12%)`);
  sky.addColorStop(1, `hsl(${hue + 22}, 30%, 6%)`);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // --- aurora veil ---
  ctx.save();
  ctx.globalAlpha = 0.10;
  const aur = ctx.createLinearGradient(0, 0, W, H * 0.4);
  aur.addColorStop(0, '#3df0c8');
  aur.addColorStop(0.5, '#7f9dff');
  aur.addColorStop(1, '#c89bff');
  ctx.fillStyle = aur;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 12) {
    const y = H * 0.2 + Math.sin(x * 0.01 + time * 0.3) * 26 + Math.sin(x * 0.03) * 12;
    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.lineTo(W, 0); ctx.lineTo(0, 0); ctx.closePath();
  ctx.fill();
  ctx.restore();

  // --- stars (twinkling) ---
  const sr = rng(1337);
  ctx.save();
  for (let i = 0; i < 110; i++) {
    const x = sr() * W;
    const y = sr() * laneY * 0.85;
    const base = 0.3 + sr() * 0.7;
    const tw = 0.5 + 0.5 * Math.sin(time * 2 + i * 1.7);
    ctx.globalAlpha = base * (0.4 + tw * 0.6);
    ctx.fillStyle = i % 7 === 0 ? '#cfe6ff' : '#fff';
    const s = sr() * 1.6 + 0.4;
    ctx.fillRect(x, y, s, s);
  }
  ctx.restore();

  // --- moon with craters + halo ---
  const mx = W * 0.8, my = H * 0.17, mr = 40;
  ctx.save();
  const halo = ctx.createRadialGradient(mx, my, mr * 0.6, mx, my, mr * 3);
  halo.addColorStop(0, 'rgba(255,246,214,0.32)');
  halo.addColorStop(1, 'rgba(255,246,214,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(mx - mr * 3, my - mr * 3, mr * 6, mr * 6);
  const mg = ctx.createRadialGradient(mx - 12, my - 12, 6, mx, my, mr);
  mg.addColorStop(0, '#fffdf2');
  mg.addColorStop(1, '#ece3bf');
  ctx.fillStyle = mg;
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(180,170,130,0.35)';
  const cr = rng(99);
  for (let i = 0; i < 6; i++) {
    const a = cr() * Math.PI * 2, d = cr() * mr * 0.7;
    const crad = 3 + cr() * 6;
    ctx.beginPath();
    ctx.arc(mx + Math.cos(a) * d, my + Math.sin(a) * d, crad, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // --- parallax mountain layers ---
  drawRidge(ctx, W, laneY, laneY - 30, 0.018, 70, 7, '#171a33', 0.9);
  drawRidge(ctx, W, laneY, laneY - 14, 0.026, 52, 13, '#1e2240', 0.95);
  drawRidge(ctx, W, laneY, laneY + 2, 0.04, 34, 23, '#252a4d', 1);

  // --- forest silhouette near the lane ---
  ctx.fillStyle = '#10131f';
  const fr = rng(55);
  for (let x = -10; x < W + 10; x += 18) {
    const th = 16 + fr() * 22;
    ctx.beginPath();
    ctx.moveTo(x, laneY + 4);
    ctx.lineTo(x + 9, laneY + 4 - th);
    ctx.lineTo(x + 18, laneY + 4);
    ctx.closePath();
    ctx.fill();
  }

  // --- ground ---
  const ground = ctx.createLinearGradient(0, laneY, 0, H);
  ground.addColorStop(0, '#2c2440');
  ground.addColorStop(0.5, '#221a30');
  ground.addColorStop(1, '#120c1c');
  ctx.fillStyle = ground;
  ctx.fillRect(0, laneY, W, H - laneY);

  // stone path tiles along the lane
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 7; i++) {
    const ty = laneY + 14 + i * 12;
    ctx.beginPath(); ctx.moveTo(0, ty); ctx.lineTo(W, ty); ctx.stroke();
  }
  ctx.restore();

  // --- drifting fog band over the lane ---
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#9fb0e0';
  for (let i = 0; i < 3; i++) {
    const off = (time * (12 + i * 6)) % (W + 200) - 100;
    ctx.beginPath();
    ctx.ellipse((off + i * 160) % (W + 200), laneY + 6 + i * 8, 130, 16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // --- floating spirit embers ---
  ctx.save();
  for (let i = 0; i < 14; i++) {
    const ex = (i * 97 + time * (8 + (i % 3) * 4)) % W;
    const ey = laneY - 30 - ((time * 14 + i * 60) % (laneY * 0.5));
    ctx.globalAlpha = 0.16 * (0.5 + 0.5 * Math.sin(time * 2 + i));
    ctx.fillStyle = i % 2 ? '#ffd27a' : '#9fe3ff';
    ctx.beginPath();
    ctx.arc(ex, ey, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawRidge(ctx, W, laneY, baseY, freq, amp, seed, color, alpha) {
  const r = rng(seed);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, laneY);
  for (let x = 0; x <= W; x += 8) {
    const y = baseY - (Math.sin(x * freq + seed) * 0.5 + 0.5) * amp - r() * 8;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, laneY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawGate(ctx, gateX, laneY, H, hpFrac, time = 0) {
  ctx.save();
  const baseY = laneY + 34;
  const w = 78;
  const h = 158;
  const x = gateX - w / 2;
  const y = baseY - h;

  // stone foundation
  ctx.fillStyle = '#3b3550';
  ctx.fillRect(x - 12, baseY - 22, w + 24, 26);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  for (let i = 0; i < 4; i++) ctx.fillRect(x - 12 + i * ((w + 24) / 4), baseY - 22, 1, 26);

  // pillars
  const wood = ctx.createLinearGradient(x, 0, x + w, 0);
  wood.addColorStop(0, '#6b4a32');
  wood.addColorStop(0.5, '#7d5638');
  wood.addColorStop(1, '#5a3b2a');
  ctx.fillStyle = wood;
  ctx.fillRect(x, y, 14, h);
  ctx.fillRect(x + w - 14, y, 14, h);
  // central wall
  ctx.fillStyle = '#5e4230';
  ctx.fillRect(x + 14, y + 10, w - 28, h - 10);
  // plank lines
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  for (let i = 0; i < 5; i++) ctx.fillRect(x + 14, y + 20 + i * 28, w - 28, 2);

  // tiled curved roof (hanok)
  ctx.save();
  ctx.fillStyle = '#34283f';
  ctx.beginPath();
  ctx.moveTo(x - 26, y + 6);
  ctx.quadraticCurveTo(x + w / 2, y - 46, x + w + 26, y + 6);
  ctx.quadraticCurveTo(x + w / 2, y - 10, x - 26, y + 6);
  ctx.closePath();
  ctx.fill();
  // upturned eaves
  ctx.strokeStyle = '#241b2e';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x - 26, y + 6);
  ctx.quadraticCurveTo(x - 34, y - 2, x - 30, y - 10);
  ctx.moveTo(x + w + 26, y + 6);
  ctx.quadraticCurveTo(x + w + 34, y - 2, x + w + 30, y - 10);
  ctx.stroke();
  // ridge tiles
  ctx.fillStyle = '#473655';
  ctx.fillRect(x - 26, y + 2, w + 52, 6);
  ctx.restore();

  // glowing taegeuk ward (color tracks gate health)
  const g = Math.max(0, Math.min(1, hpFrac));
  const wx = gateX, wy = baseY - h / 2 + 6, wr = 22;
  const pulse = 1 + Math.sin(time * 3) * 0.05;
  ctx.save();
  ctx.translate(wx, wy);
  ctx.scale(pulse, pulse);
  ctx.shadowColor = `hsl(${g * 120}, 90%, 60%)`;
  ctx.shadowBlur = 26;
  // disc
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath(); ctx.arc(0, 0, wr, 0, Math.PI * 2); ctx.fill();
  // taegeuk halves (red/blue swirl)
  ctx.shadowBlur = 0;
  ctx.rotate(time * 0.6);
  ctx.fillStyle = '#cf3b4a';
  ctx.beginPath();
  ctx.arc(0, 0, wr, -Math.PI / 2, Math.PI / 2);
  ctx.arc(0, wr / 2, wr / 2, Math.PI / 2, -Math.PI / 2, true);
  ctx.arc(0, -wr / 2, wr / 2, Math.PI / 2, -Math.PI / 2);
  ctx.fill();
  ctx.fillStyle = '#2f5fb0';
  ctx.beginPath();
  ctx.arc(0, 0, wr, Math.PI / 2, -Math.PI / 2);
  ctx.arc(0, -wr / 2, wr / 2, -Math.PI / 2, Math.PI / 2, true);
  ctx.arc(0, wr / 2, wr / 2, -Math.PI / 2, Math.PI / 2);
  ctx.fill();
  ctx.restore();

  // hanging banner
  ctx.fillStyle = '#b23b4a';
  ctx.fillRect(gateX - 7, y - 8, 14, 30);
  ctx.fillStyle = '#ffd966';
  ctx.beginPath();
  ctx.arc(gateX, y + 4, 3, 0, Math.PI * 2);
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
  const swing = Math.sin(e.bob * 1.2) * 0.4;

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(x, e.y + r * 0.98, r * 0.82, r * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();

  let body = e.def.color;
  if (frozen) body = '#6fb6d6';
  if (flash) body = '#ffffff';

  // --- club (방망이) held in front arm ---
  ctx.save();
  ctx.translate(x - r * 0.65, y + r * 0.2);
  ctx.rotate(-0.5 + swing);
  ctx.strokeStyle = '#6b4a2e';
  ctx.lineCap = 'round';
  ctx.lineWidth = r * 0.16;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r * 0.9); ctx.stroke();
  ctx.fillStyle = '#7d572f';
  ctx.beginPath(); ctx.arc(0, -r * 0.95, r * 0.26, 0, Math.PI * 2); ctx.fill();
  // spikes on the club head
  ctx.fillStyle = '#caa86a';
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r * 0.26, -r * 0.95 + Math.sin(a) * r * 0.26, r * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // --- body with shading ---
  const bg = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.2, x, y, r);
  bg.addColorStop(0, lighten(body, 28));
  bg.addColorStop(1, body);
  ctx.fillStyle = flash ? '#fff' : bg;
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // fur loincloth
  ctx.fillStyle = '#6b4a2e';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.6, y + r * 0.55);
  for (let i = -3; i <= 3; i++) {
    ctx.lineTo(x + i * r * 0.2, y + r * 0.95);
    ctx.lineTo(x + (i + 0.5) * r * 0.2, y + r * 0.6);
  }
  ctx.lineTo(x + r * 0.6, y + r * 0.55);
  ctx.closePath();
  ctx.fill();

  // belly patch
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.22, r * 0.5, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  // horns
  ctx.fillStyle = e.def.horn;
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + s * r * 0.42, y - r * 0.72);
    ctx.quadraticCurveTo(x + s * r * 0.95, y - r * 1.25, x + s * r * 0.62, y - r * 1.45);
    ctx.quadraticCurveTo(x + s * r * 0.5, y - r * 1.0, x + s * r * 0.18, y - r * 0.95);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  }
  if (e.def.boss) {
    ctx.fillStyle = '#ffd24d';
    ctx.shadowColor = '#ffae00';
    ctx.shadowBlur = 10;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * r * 0.32, y - r * 0.85);
      ctx.lineTo(x + i * r * 0.32 + 5, y - r * 1.15);
      ctx.lineTo(x + i * r * 0.32 + 11, y - r * 0.85);
      ctx.closePath();
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  // angry brows
  ctx.strokeStyle = '#1a0e0e';
  ctx.lineWidth = Math.max(2, r * 0.08);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.52, y - r * 0.34);
  ctx.lineTo(x - r * 0.14, y - r * 0.16);
  ctx.moveTo(x + r * 0.52, y - r * 0.34);
  ctx.lineTo(x + r * 0.14, y - r * 0.16);
  ctx.stroke();

  // glowing eyes
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.shadowColor = flash ? 'transparent' : '#ffd000';
    ctx.shadowBlur = flash ? 0 : 8;
    ctx.fillStyle = flash ? '#000' : '#ffe14d';
    ctx.beginPath();
    ctx.ellipse(x + s * r * 0.33, y - r * 0.05, r * 0.17, r * 0.21, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#140d05';
    ctx.beginPath();
    ctx.arc(x + s * r * 0.33, y - r * 0.02, r * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }

  // fanged mouth
  ctx.fillStyle = '#2a0d0d';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.4, r * 0.26, r * 0.18, 0, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = '#fff';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + s * r * 0.14, y + r * 0.36);
    ctx.lineTo(x + s * r * 0.08, y + r * 0.56);
    ctx.lineTo(x + s * r * 0.02, y + r * 0.36);
    ctx.closePath();
    ctx.fill();
  }

  // frost shell
  if (frozen) {
    ctx.strokeStyle = 'rgba(220,250,255,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r * 1.06, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(200,240,255,0.15)';
    ctx.beginPath(); ctx.arc(x, y, r * 1.06, 0, Math.PI * 2); ctx.fill();
  }

  // hp bar
  const bw = r * 1.9;
  const bx = x - bw / 2;
  const by = y - r - (e.def.boss ? 24 : 15);
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(bx - 1.5, by - 1.5, bw + 3, 7);
  const frac = Math.max(0, e.hp / e.maxHp);
  ctx.fillStyle = `hsl(${frac * 120}, 80%, 50%)`;
  ctx.fillRect(bx, by, bw * frac, 4);
  if (e.def.boss) {
    ctx.fillStyle = '#ffd966';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(e.def.name, x, by - 6);
  }

  ctx.restore();
}

function lighten(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) + amt);
  const g = Math.min(255, ((n >> 8) & 255) + amt);
  const b = Math.min(255, (n & 255) + amt);
  return `rgb(${r},${g},${b})`;
}
