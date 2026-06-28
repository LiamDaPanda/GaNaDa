// entities.js — game objects: dokkaebi enemies, projectiles, particles, text.

let _id = 0;
const nextId = () => ++_id;

// 도깨비 (dokkaebi) — Korean goblins. Different "types" reskin color/stats.
export const DOKKAEBI_TYPES = {
  blue: { name: '청도깨비', color: '#46566f', horn: '#d6d0bc', hp: 30, speed: 26, gold: 5, damage: 6 },
  red: { name: '적도깨비', color: '#9c4a40', horn: '#e0ccbc', hp: 55, speed: 22, gold: 9, damage: 10 },
  green: { name: '독도깨비', color: '#586f49', horn: '#d2dcc0', hp: 42, speed: 34, gold: 8, damage: 8 },
  boss: { name: '도깨비 대장', color: '#5c4870', horn: '#ddd0c4', hp: 520, speed: 14, gold: 90, damage: 26, boss: true },
};

export class Enemy {
  constructor(type, x, y, scale = 1, hpMul = 1) {
    const t = DOKKAEBI_TYPES[type];
    this.id = nextId();
    this.type = type;
    this.def = t;
    this.x = x;
    this.y = y;
    this.maxHp = t.hp * hpMul;
    this.hp = this.maxHp;
    this.baseSpeed = t.speed;
    this.gold = Math.round(t.gold * hpMul);
    this.damage = t.damage;
    this.radius = (t.boss ? 46 : 22) * scale;
    this.scale = scale;
    this.dead = false;
    this.reachedGate = false;
    // status effects
    this.burn = null; // {dps, t}
    this.slowT = 0;
    this.slowFactor = 1;
    this.hitFlash = 0;
    this.bob = Math.random() * Math.PI * 2;
    this.kx = 0; // knockback velocity
  }

  get speed() {
    return this.baseSpeed * (this.slowT > 0 ? this.slowFactor : 1);
  }

  hurt(amount) {
    this.hp -= amount;
    this.hitFlash = 0.15;
    if (this.hp <= 0) this.dead = true;
  }

  applyBurn(dps, duration) {
    this.burn = { dps, t: duration };
  }

  applySlow(factor, duration) {
    this.slowFactor = factor;
    this.slowT = Math.max(this.slowT, duration);
  }

  update(dt, gateX) {
    this.bob += dt * 6;
    if (this.burn) {
      this.hurt(this.burn.dps * dt);
      this.burn.t -= dt;
      if (this.burn.t <= 0) this.burn = null;
    }
    if (this.slowT > 0) this.slowT -= dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;

    // knockback decays
    if (Math.abs(this.kx) > 1) {
      this.x += this.kx * dt;
      this.kx *= 0.86;
    }
    // march toward the gate (which sits on the left)
    this.x -= this.speed * dt;
    if (this.x <= gateX + this.radius) {
      this.reachedGate = true;
    }
  }
}

export class Projectile {
  constructor(x, y, tx, ty, attack, damage, onHit) {
    this.id = nextId();
    this.x = x;
    this.y = y;
    this.attack = attack;
    this.damage = damage;
    this.onHit = onHit;
    this.dead = false;
    const dx = tx - x;
    const dy = ty - y;
    const d = Math.hypot(dx, dy) || 1;
    const speed = 620;
    this.vx = (dx / d) * speed;
    this.vy = (dy / d) * speed;
    this.tx = tx;
    this.ty = ty;
    this.life = 1.5;
    this.trail = [];
  }

  update(dt) {
    this.life -= dt;
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 8) this.trail.shift();
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (Math.hypot(this.tx - this.x, this.ty - this.y) < 16 || this.life <= 0) {
      this.dead = true;
      this.onHit(this.x, this.y);
    }
  }
}

export class Particle {
  constructor(x, y, color, opts = {}) {
    this.x = x;
    this.y = y;
    const a = opts.angle ?? Math.random() * Math.PI * 2;
    const sp = opts.speed ?? 40 + Math.random() * 160;
    this.vx = Math.cos(a) * sp;
    this.vy = Math.sin(a) * sp;
    this.color = color;
    this.life = opts.life ?? 0.4 + Math.random() * 0.5;
    this.maxLife = this.life;
    this.size = opts.size ?? 2 + Math.random() * 4;
    this.gravity = opts.gravity ?? 60;
    this.dead = false;
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) {
      this.dead = true;
      return;
    }
    this.vy += this.gravity * dt;
    this.vx *= 0.98;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }
}

export class FloatingText {
  constructor(x, y, text, color, size = 18) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.size = size;
    this.life = 0.9;
    this.maxLife = 0.9;
    this.dead = false;
  }

  update(dt) {
    this.life -= dt;
    this.y -= 40 * dt;
    if (this.life <= 0) this.dead = true;
  }
}
