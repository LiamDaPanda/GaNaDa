// render.js — canvas drawing for the world. All art is procedural (no images).

export function drawBackground(ctx, W, H, laneY, wave) {
  // night sky gradient, shifts hue slightly as waves progress
  const hue = 230 + (wave % 8) * 6;
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, `hsl(${hue}, 45%, 12%)`);
  sky.addColorStop(0.6, `hsl(${hue + 10}, 40%, 18%)`);
  sky.addColorStop(1, `hsl(${hue + 20}, 30%, 8%)`);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // moon
  ctx.save();
  ctx.shadowColor = 'rgba(255,245,210,0.6)';
  ctx.shadowBlur = 60;
  ctx.fillStyle = '#fbf3cf';
  ctx.beginPath();
  ctx.arc(W * 0.8, H * 0.18, 38, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // distant mountains
  ctx.fillStyle = 'rgba(20,24,46,0.8)';
  ctx.beginPath();
  ctx.moveTo(0, laneY);
  const peaks = 6;
  for (let i = 0; i <= peaks; i++) {
    const x = (W / peaks) * i;
    const y = laneY - 60 - Math.sin(i * 1.7) * 40 - (i % 2) * 30;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, laneY);
  ctx.closePath();
  ctx.fill();

  // ground
  const ground = ctx.createLinearGradient(0, laneY, 0, H);
  ground.addColorStop(0, '#2a2238');
  ground.addColorStop(1, '#150f1f');
  ctx.fillStyle = ground;
  ctx.fillRect(0, laneY, W, H - laneY);

  // lane path highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, laneY + 18);
  ctx.lineTo(W, laneY + 18);
  ctx.stroke();
}

export function drawGate(ctx, gateX, laneY, H, hpFrac) {
  ctx.save();
  const baseY = laneY + 30;
  const w = 70;
  const h = 150;
  const x = gateX - w / 2;
  const y = baseY - h;

  // pillars
  ctx.fillStyle = '#5a3b2a';
  ctx.fillRect(x, y, 12, h);
  ctx.fillRect(x + w - 12, y, 12, h);
  // wall
  ctx.fillStyle = '#6b4a32';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  for (let i = 0; i < 5; i++) ctx.fillRect(x, y + 12 + i * 28, w, 3);

  // tiled roof (hanok style)
  ctx.fillStyle = '#3a2c4a';
  ctx.beginPath();
  ctx.moveTo(x - 18, y);
  ctx.lineTo(x + w / 2, y - 40);
  ctx.lineTo(x + w + 18, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2c2138';
  ctx.fillRect(x - 18, y - 4, w + 36, 8);

  // glowing ward (color tracks gate health)
  const g = Math.max(0, Math.min(1, hpFrac));
  ctx.shadowColor = `hsl(${g * 120}, 90%, 60%)`;
  ctx.shadowBlur = 24;
  ctx.fillStyle = `hsla(${g * 120}, 90%, 65%, 0.5)`;
  ctx.beginPath();
  ctx.arc(gateX, baseY - h / 2, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('守', gateX, baseY - h / 2); // "guard"

  ctx.restore();
}

export function drawDokkaebi(ctx, e) {
  ctx.save();
  const bob = Math.sin(e.bob) * 3;
  const x = e.x;
  const y = e.y + bob;
  const r = e.radius;
  const flash = e.hitFlash > 0;
  const frozen = e.slowT > 0;

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(x, e.y + r * 0.95, r * 0.8, r * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();

  let body = e.def.color;
  if (frozen) body = '#6fb6d6';
  if (flash) body = '#ffffff';

  // body
  ctx.fillStyle = body;
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // belly
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.25, r * 0.55, r * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();

  // horns
  ctx.fillStyle = e.def.horn;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + s * r * 0.45, y - r * 0.7);
    ctx.lineTo(x + s * r * 0.75, y - r * 1.35);
    ctx.lineTo(x + s * r * 0.2, y - r * 0.95);
    ctx.closePath();
    ctx.fill();
  }
  if (e.def.boss) {
    // crown spikes for the boss
    ctx.fillStyle = '#ffd966';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * r * 0.3, y - r * 0.8);
      ctx.lineTo(x + i * r * 0.3 + 6, y - r * 1.1);
      ctx.lineTo(x + i * r * 0.3 + 12, y - r * 0.8);
      ctx.closePath();
      ctx.fill();
    }
  }

  // eyes (angry)
  ctx.fillStyle = flash ? '#000' : '#ffe14d';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(x + s * r * 0.32, y - r * 0.08, r * 0.16, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#1a1a1a';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(x + s * r * 0.32, y - r * 0.05, r * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }
  // brows
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.5, y - r * 0.32);
  ctx.lineTo(x - r * 0.12, y - r * 0.18);
  ctx.moveTo(x + r * 0.5, y - r * 0.32);
  ctx.lineTo(x + r * 0.12, y - r * 0.18);
  ctx.stroke();

  // fang mouth
  ctx.fillStyle = '#2a0d0d';
  ctx.beginPath();
  ctx.arc(x, y + r * 0.35, r * 0.22, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.12, y + r * 0.35);
  ctx.lineTo(x - r * 0.06, y + r * 0.52);
  ctx.lineTo(x, y + r * 0.35);
  ctx.closePath();
  ctx.fill();

  // frost overlay
  if (frozen) {
    ctx.strokeStyle = 'rgba(220,250,255,0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.05, 0, Math.PI * 2);
    ctx.stroke();
  }

  // hp bar
  const bw = r * 1.8;
  const bx = x - bw / 2;
  const by = y - r - (e.def.boss ? 22 : 14);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(bx - 1, by - 1, bw + 2, 6);
  const frac = Math.max(0, e.hp / e.maxHp);
  ctx.fillStyle = `hsl(${frac * 120}, 80%, 50%)`;
  ctx.fillRect(bx, by, bw * frac, 4);

  if (e.def.boss) {
    ctx.fillStyle = '#ffd966';
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(e.def.name, x, by - 6);
  }

  ctx.restore();
}
