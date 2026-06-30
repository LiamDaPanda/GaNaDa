// game.js — main loop, state, spawning, input, rendering.
import { buildRecognizer } from './recognizer.js';
import {
  ATTACKS, buildSyllableSpell, composeSyllable, jamoChar,
  DOUBLE_OF, COMBINE_VOWEL, COMBINE_JONG,
} from './attacks.js';
import { Enemy, Projectile, Particle, FloatingText } from './entities.js';
import { Audio } from './audio.js';
import { drawDokkaebi, drawGate, drawBackground, brushStroke, inkBlob } from './render.js';
import { UPGRADES } from './upgrades.js';
import { getTheme } from './themes.js';
import { t } from './i18n.js';
import { Ring, Flash, Bolt, Beam, Shards, Streak, Wisp, Smoke, Crack, Crystal, Gas, Rays } from './effects.js';
import { InkWash, InkSplat, Enso, BrushSlash, InkGlyph, Sparkle } from './effects.js';
import * as Prog from './progression.js';

const SAVE_KEY = 'ganada_save_v1';

// Calligraphic type for on-canvas text (matches the CSS font variables).
const F_BODY = "'Gowun Batang', 'Apple SD Gothic Neo', 'Malgun Gothic', serif";
const F_BRUSH = "'Nanum Brush Script', cursive";

const TUTORIAL_STEPS = [
  { key: 'tut.1', target: '가' },
  { key: 'tut.2', target: '까' },
  { key: 'tut.3', target: '개' },
];
function tutStep(i) {
  const s = TUTORIAL_STEPS[i];
  return { title: t(`${s.key}.title`), detail: t(`${s.key}.detail`), target: s.target };
}

export class Game {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ui = ui;
    this.recognizer = buildRecognizer();

    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.effects = [];
    this.texts = [];
    this.shake = 0;
    this.screenFlash = { a: 0, color: '#ffffff' };
    this.wispTimer = 0;
    this.gateGlow = 0; // cast-charge brightening at the gate

    this.stroke = [];        // current drawing points (screen space)
    this.heldStrokes = [];   // strokes drawn so far this hold-mode syllable (kept on screen)
    this.drawing = false;
    this.lastRecognition = null;

    // syllable composition buffer: jamos collected until the window lapses
    this.compose = { jamos: [], timer: 0, x: 0, y: 0 };
    this.COMPOSE_WINDOW = 0.55; // seconds to add the next jamo before it casts
    this.holdMode = false;      // when on, the syllable waits for the 시전 button

    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = 0;
    this.H = 0;
    this.gateX = 0;
    this.lastTime = 0;
    this.paused = false;
    this.manualPause = false;  // paused via the button (vs. auto-pause)
    this.started = false;      // gameplay frozen until the title is dismissed
    this.gameOver = false;
    this.haptic = true;        // navigator.vibrate feedback
    this.lowInkFlash = 0;

    // combo: chain kills before the window lapses for a score multiplier
    this.combo = 0;
    this.comboTimer = 0;
    this.bestCombo = 0;
    this.COMBO_WINDOW = 2.6;

    this.tutorial = { active: false, step: 0 };

    this.state = this.freshState();
    this.load();

    this.spawnTimer = 0;
    this.turretTimer = 0;
    this.waveActive = false;
    this.spawnQueue = [];

    this.bindInput();
    window.addEventListener('resize', () => this.resize());
    // QoL: auto-pause when the tab/app is backgrounded so the gate survives.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.paused = true;
      else if (!this.manualPause && !this.gameOver) this.paused = false;
    });
    this.resize();
    this.startWave();
  }

  // Called once the title screen is dismissed — unfreezes gameplay.
  begin() {
    this.started = true;
    this.lastTime = performance.now();
  }

  togglePause() {
    if (this.gameOver) return;
    this.manualPause = !this.manualPause;
    this.paused = this.manualPause;
    if (this.ui) this.ui.setPaused(this.paused);
  }

  // ✕ — discard the syllable currently being drawn.
  clearCompose() {
    this.compose = { jamos: [], timer: 0, x: this.W / 2, y: this.H * 0.2 };
    this.heldStrokes = [];
    this.holdMode = false;
    if (this.ui) this.ui.setHold(false);
    Audio.miss();
  }

  buzz(ms) {
    if (this.haptic) navigator.vibrate?.(ms);
  }

  flashScreen(color, a) {
    if (a > this.screenFlash.a) { this.screenFlash.a = a; this.screenFlash.color = color; }
  }

  enemiesRemaining() {
    const queued = this.waveActive ? (this.spawnQueue.length - this.spawnIndex) : 0;
    return this.enemies.length + Math.max(0, queued);
  }

  freshState() {
    return {
      wave: 1,
      gold: 0,
      score: 0,
      kills: 0,
      gateHp: 100,
      gateMax: 100,
      mana: 60,
      manaMax: 60,
      manaRegen: 6,
      powerMul: 1,
      turretDamage: 8,
      turretRate: 1.1, // seconds between auto shots
      upgrades: { power: 0, manaRegen: 0, manaMax: 0, turret: 0, gate: 0 },
    };
  }

  // ---- persistence ---------------------------------------------------------
  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        gold: this.state.gold,
        score: this.state.score,
        bestWave: Math.max(this.state.wave, this.bestWave || 1),
        upgrades: this.state.upgrades,
      }));
    } catch (e) { /* private mode */ }
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      this.bestWave = data.bestWave || 1;
      this.state.gold = data.gold || 0;
      // Re-apply purchased upgrades from scratch.
      for (const [key, count] of Object.entries(data.upgrades || {})) {
        for (let i = 0; i < count; i++) {
          UPGRADES[key].apply(this.state);
          this.state.upgrades[key]++;
        }
      }
      this.state.mana = this.state.manaMax;
      this.state.gateHp = this.state.gateMax;
    } catch (e) { /* ignore */ }
  }

  upgradeCost(key) {
    const u = UPGRADES[key];
    return Math.round(u.base * Math.pow(u.growth, this.state.upgrades[key]));
  }

  buyUpgrade(key) {
    const cost = this.upgradeCost(key);
    if (this.state.gold < cost) { Audio.miss(); return false; }
    this.state.gold -= cost;
    this.state.upgrades[key]++;
    UPGRADES[key].apply(this.state);
    Audio.buy();
    this.save();
    this.ui.refreshShop();
    return true;
  }

  // ---- layout --------------------------------------------------------------
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.W = rect.width;
    this.H = rect.height;
    this.canvas.width = Math.floor(this.W * this.dpr);
    this.canvas.height = Math.floor(this.H * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.gateX = this.W * 0.12;
    this.laneY = this.H * 0.62; // ground line enemies walk along
  }

  // ---- waves & spawning ----------------------------------------------------
  startWave() {
    this.waveActive = true;
    const w = this.state.wave;
    const isBoss = w % 5 === 0;
    this.spawnQueue = [];
    const count = isBoss ? 6 + Math.floor(w / 5) : 5 + Math.floor(w * 1.3);
    const hpMul = 1 + (w - 1) * 0.18;
    for (let i = 0; i < count; i++) {
      let type = 'blue';
      const r = Math.random();
      if (w >= 3 && r < 0.35) type = 'green';
      if (w >= 2 && r > 0.7) type = 'red';
      this.spawnQueue.push({ type, hpMul, delay: 0.5 + i * Math.max(0.35, 1.1 - w * 0.03) });
    }
    if (isBoss) {
      this.spawnQueue.push({ type: 'boss', hpMul: 1 + (w / 5 - 1) * 0.6, delay: this.spawnQueue.length * 0.8 + 1 });
    }
    this.spawnElapsed = 0;
    this.spawnIndex = 0;
    Audio.wave();
    this.ui.banner(t('banner.wave', { w }), isBoss ? `<svg class="ic"><use href="#ic-warn"/></svg> ${t('banner.boss')}` : '');
  }

  spawnUpdate(dt) {
    if (!this.waveActive) return;
    this.spawnElapsed += dt;
    while (this.spawnIndex < this.spawnQueue.length &&
      this.spawnElapsed >= this.spawnQueue[this.spawnIndex].delay) {
      const s = this.spawnQueue[this.spawnIndex];
      const scale = s.type === 'boss' ? 1 : 0.85 + Math.random() * 0.4;
      const y = this.laneY - 10 + (Math.random() * 40 - 20);
      this.enemies.push(new Enemy(s.type, this.W + 40, y, scale, s.hpMul));
      this.spawnIndex++;
    }
    if (this.spawnIndex >= this.spawnQueue.length && this.enemies.length === 0) {
      // wave cleared
      this.waveActive = false;
      this.state.wave++;
      this.bestWave = Math.max(this.bestWave || 1, this.state.wave);
      this.state.gold += 10 + this.state.wave * 2;
      this.texts.push(new FloatingText(this.W / 2, this.H * 0.4, t('toast.waveClear'), '#c9a44e', 26));
      this.gainXp(25 + this.state.wave * 12);
      this.save();
      setTimeout(() => { if (!this.gameOver && !this.tutorial.active) this.startWave(); }, 1600);
    }
  }

  // ---- combat --------------------------------------------------------------
  nearestEnemy(x, y) {
    let best = null;
    let bd = Infinity;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  castAttack(key) {
    return this.castSpell(ATTACKS[key], key);
  }

  // Cast any attack object (a basic consonant spell OR a composed syllable).
  castSpell(atk, baseKey = null) {
    if (!atk) return false;
    if (this.state.mana < atk.manaCost) {
      Audio.miss();
      this.lowInkFlash = 0.6;
      this.buzz([10, 40, 10]);
      this.texts.push(new FloatingText(this.W / 2, this.H * 0.5, t('toast.noInk'), '#bf6a5a', 22));
      return false;
    }
    this.state.mana -= atk.manaCost;
    const dmg = atk.baseDamage * this.state.powerMul;
    Audio.cast(atk.element);
    this.buzz(atk.kind === 'ultimate' || atk.kind === 'beam' ? 30 : 14);

    const origin = { x: this.gateX, y: this.laneY - 30 };

    // cast wind-up: the gate's ward charges and pulses energy out
    this.gateGlow = 1;
    this.effects.push(new Flash(origin.x, origin.y, 30, 0.28, atk.glow));
    this.effects.push(new Ring(origin.x, origin.y, 3, 30, 0.32, atk.glow, 3));
    for (let i = 0; i < 8; i++) {
      this.particles.push(new Particle(origin.x + (Math.random() * 30 - 15), origin.y + (Math.random() * 30 - 15),
        atk.glow, { angle: Math.random() * Math.PI * 2, speed: 30 + Math.random() * 50, life: 0.3, size: 2, gravity: 0 }));
    }

    switch (atk.kind) {
      case 'projectile': {
        const target = this.nearestEnemy(this.W, this.laneY) || { x: this.W, y: this.laneY };
        this.projectiles.push(new Projectile(origin.x, origin.y, target.x, target.y, atk, dmg,
          (hx, hy) => this.explode(hx, hy, atk, dmg)));
        break;
      }
      case 'chain': this.chainLightning(atk, dmg); break;
      case 'aoe': {
        const front = this.frontmost();
        this.explode(front ? front.x : this.W * 0.6, front ? front.y : this.laneY, atk, dmg);
        break;
      }
      case 'nova':
        this.explode(this.gateX, this.laneY, atk, dmg);
        this.healGate(atk.heal);
        break;
      case 'beam': this.dragonBeam(atk, dmg); break;
      case 'lance': this.lanceAttack(atk, dmg); break;
      case 'rain': this.rainAttack(atk, dmg); break;
      case 'meteor': this.meteorAttack(atk, dmg); break;
      case 'sweep': this.sweepAttack(atk, dmg); break;
      case 'ultimate': this.ultimateAttack(atk, dmg); break;
      default: this.explode(this.W * 0.6, this.laneY, atk, dmg);
    }

    if (atk.heal && atk.kind !== 'nova') this.healGate(atk.heal);
    if (atk.composed) {
      // stamp the syllable you drew as a big brush-ink glyph
      this.effects.push(new InkGlyph(this.W / 2, this.H * 0.32, atk.name, atk.glow, atk.kind === 'ultimate' ? 108 : 84));
    }
    this.ui.flashRune(baseKey || (atk.jamos ? atk.jamos[0] : atk));
    return true;
  }

  healGate(amount) {
    if (!amount) return;
    this.state.gateHp = Math.min(this.state.gateMax, this.state.gateHp + amount);
    this.texts.push(new FloatingText(this.gateX, this.laneY - 80, t('toast.gateHeal', { n: amount }), '#c9a44e', 20));
  }

  // ㅏ/ㅣ — a forward lance that pierces everything in a horizontal band.
  lanceAttack(atk, dmg) {
    const bandY = this.laneY - 20;
    const band = 78;
    this.shake = Math.min(16, this.shake + 6);
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (e.x > this.gateX && Math.abs(e.y - bandY) < band + e.radius) {
        this.damageEnemy(e, dmg, atk);
        if (atk.knockback) e.kx = atk.knockback;
        if (atk.freeze) e.applySlow(atk.freeze.slow, atk.freeze.duration);
        if (atk.burn) e.applyBurn(atk.burn.dps, atk.burn.duration);
        this.spawnBurst(e.x, e.y, atk.color, 10);
      }
    }
    // a bright lance streak sweeping right along the band
    this.effects.push(new Streak(this.gateX, bandY, this.W, bandY - 6, 14, atk.color));
    this.effects.push(new Streak(this.gateX, bandY, this.W, bandY - 6, 5, atk.glow));
  }

  // ㅗ — rain: bolts fall from the sky onto several enemies.
  rainAttack(atk, dmg) {
    const live = this.enemies.filter((e) => !e.dead);
    const count = atk.count || 6;
    this.shake = Math.min(14, this.shake + 4);
    for (let i = 0; i < count; i++) {
      const target = live.length ? live[Math.floor(Math.random() * live.length)]
        : { x: this.gateX + Math.random() * (this.W - this.gateX), y: this.laneY };
      const tx = target.x + (Math.random() * 40 - 20);
      const ty = target.y;
      const drop = new Projectile(tx, -40 - Math.random() * 120, tx, ty, atk, dmg,
        (hx, hy) => this.explode(hx, hy, { ...atk, kind: 'projectile', radius: 60 }, dmg));
      this.projectiles.push(drop);
    }
  }

  // ㅜ — meteor: one heavy impact on the front cluster.
  meteorAttack(atk, dmg) {
    const front = this.frontmost();
    const tx = front ? front.x : this.W * 0.6;
    const ty = front ? front.y : this.laneY;
    const meteor = new Projectile(tx + 160, -160, tx, ty, atk, dmg, (hx, hy) => {
      this.explode(hx, hy, atk, dmg);
      this.shake = Math.min(28, this.shake + 18);
      this.spawnBurst(hx, hy, atk.color, 60);
      const R = Math.max(70, atk.radius);
      this.effects.push(new Ring(hx, hy, 10, R * 1.6, 0.7, atk.color, 7));
      this.effects.push(new Shards(hx, hy, 12, R * 0.9, atk.glow));
      this.flashScreen(atk.glow, 0.16);
    });
    this.projectiles.push(meteor);
  }

  // ㅡ — wave: an element-colored sweep across the whole lane.
  sweepAttack(atk, dmg) {
    this.shake = Math.min(18, this.shake + 8);
    for (const e of this.enemies) {
      if (e.dead) continue;
      this.damageEnemy(e, dmg, atk);
      if (atk.freeze) e.applySlow(atk.freeze.slow, atk.freeze.duration);
      if (atk.burn) e.applyBurn(atk.burn.dps, atk.burn.duration);
      if (atk.knockback) e.kx = atk.knockback;
      this.spawnBurst(e.x, e.y, atk.color, 12);
    }
    const by = this.laneY - 20;
    // a single sweeping calligraphic cut across the lane
    this.effects.push(new BrushSlash(this.gateX, by + 10, this.W, by - 14, 30, atk.color));
    this.effects.push(new Beam(this.gateX, this.W, by, 14, atk.glow, 0.4));
  }

  // 받침 fusion — a screen-wide ultimate carrying both consonants' effects.
  ultimateAttack(atk, dmg) {
    this.shake = Math.min(30, this.shake + 24);
    for (const e of this.enemies) {
      if (e.dead) continue;
      this.damageEnemy(e, dmg, atk);
      if (atk.freeze) e.applySlow(atk.freeze.slow, atk.freeze.duration);
      if (atk.burn) e.applyBurn(atk.burn.dps, atk.burn.duration);
      if (atk.knockback) e.kx = atk.knockback * 1.5;
      this.spawnBurst(e.x, e.y, atk.color, 22);
    }
    for (let i = 0; i < 90; i++) {
      this.particles.push(new Particle(this.gateX + Math.random() * (this.W - this.gateX),
        this.laneY - 20 + (Math.random() * 120 - 60), i % 2 ? atk.glow : atk.color,
        { speed: 70, life: 0.6, size: 4, gravity: 0 }));
    }
    // overlapping shockwaves + a giant brushed enso sweeping the field
    const cy = this.laneY - 20;
    for (let i = 0; i < 3; i++) {
      this.effects.push(new Ring(this.gateX, cy, 10, this.W * (0.7 + i * 0.25), 0.7 + i * 0.15, i % 2 ? atk.glow : atk.color, 6 - i));
    }
    this.effects.push(new Enso(this.W * 0.54, this.laneY - 40, this.W * 0.42, atk.glow, 0.85));
    this.effects.push(new InkWash(this.gateX, cy, 160, atk.glow));
    this.flashScreen(atk.color, 0.26);
  }

  frontmost() {
    let best = null;
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (!best || e.x < best.x) best = e;
    }
    return best;
  }

  // Element-specific impact flavour layered on top of the generic blast.
  elementBurst(x, y, atk, R) {
    const el = atk.element;
    if (el === 'fire') {
      this.effects.push(new Smoke(x, y - 6, R * 0.7));
      for (let i = 0; i < 14; i++) {
        this.particles.push(new Particle(x + (Math.random() * 30 - 15), y, i % 2 ? atk.glow : atk.color,
          { angle: -Math.PI / 2 + (Math.random() - 0.5) * 1.2, speed: 50 + Math.random() * 90, life: 0.6, size: 2 + Math.random() * 3, gravity: -40 }));
      }
    } else if (el === 'ice') {
      this.effects.push(new Crystal(x, y, R * 0.9, atk.glow));
    } else if (el === 'earth') {
      this.effects.push(new Crack(x, this.laneY + 6, R, atk.color));
      for (let i = 0; i < 12; i++) {
        this.particles.push(new Particle(x, y, atk.color,
          { angle: -Math.PI / 2 + (Math.random() - 0.5) * 1.4, speed: 80 + Math.random() * 110, life: 0.7, size: 2 + Math.random() * 4, gravity: 320 }));
      }
    } else if (el === 'poison') {
      this.effects.push(new Gas(x, y, R * 0.9, atk.glow));
    } else if (el === 'water') {
      this.effects.push(new Ring(x, this.laneY + 6, 6, R * 0.9, 0.4, atk.color, 3));
      for (let i = 0; i < 12; i++) {
        this.particles.push(new Particle(x, y, atk.glow,
          { angle: -Math.PI / 2 + (Math.random() - 0.5) * 1.0, speed: 70 + Math.random() * 70, life: 0.5, size: 2 + Math.random() * 2, gravity: 300 }));
      }
    } else if (el === 'holy' || el === 'sun' || el === 'light') {
      this.effects.push(new Rays(x, y, R, atk.glow));
    } else if (el === 'shadow') {
      this.effects.push(new Smoke(x, y, R * 0.8));
      this.effects.push(new Ring(x, y, R * 0.9, 6, 0.4, atk.color, 3)); // imploding
    } else if (el === 'wind') {
      this.effects.push(new Ring(x, y, 6, R, 0.4, atk.glow, 2));
      this.effects.push(new Ring(x, y, 6, R * 0.7, 0.3, atk.glow, 2));
    }
  }

  explode(x, y, atk, dmg) {
    this.shake = Math.min(18, this.shake + (atk.kind === 'nova' ? 12 : 7));
    this.spawnBurst(x, y, atk.color, atk.kind === 'nova' ? 60 : 30);
    // animated impact: flash core + expanding shockwave ring + element flavour
    const R = Math.max(40, atk.radius || 70);
    // calligraphic ink hit — a luminous wash, a fling of droplets and a twinkle
    this.effects.push(new InkWash(x, y, R * 1.15, atk.glow));
    this.effects.push(new InkSplat(x, y, R * (atk.kind === 'nova' ? 1.1 : 0.85), atk.color));
    this.effects.push(new Sparkle(x, y, R * 0.7, atk.glow, 0.5));
    this.effects.push(new Ring(x, y, 8, R * (atk.kind === 'nova' ? 1.4 : 1.1), atk.kind === 'nova' ? 0.6 : 0.45, atk.color, 6));
    this.elementBurst(x, y, atk, R);
    if (atk.kind === 'nova') {
      this.effects.push(new Enso(x, y, R * 1.25, atk.glow, 0.8));
      this.flashScreen(atk.glow, 0.16);
    }
    if (atk.element === 'lightning') {
      for (let i = 0; i < 3; i++) {
        this.effects.push(new Bolt(x, y - R, x + (Math.random() * 2 - 1) * R * 0.6, y, atk.color));
      }
    }
    const radius = atk.radius;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d <= radius + e.radius) {
        const falloff = atk.kind === 'projectile' ? Math.max(0.35, 1 - d / (radius * 1.5)) : 1;
        this.damageEnemy(e, dmg * falloff, atk);
        if (atk.knockback) e.kx = atk.knockback;
        if (atk.freeze) e.applySlow(atk.freeze.slow, atk.freeze.duration);
        if (atk.burn) e.applyBurn(atk.burn.dps, atk.burn.duration);
      }
    }
  }

  chainLightning(atk, dmg) {
    let from = { x: this.gateX, y: this.laneY - 30 };
    const hit = new Set();
    for (let i = 0; i < atk.chains; i++) {
      let target = null;
      let bd = Infinity;
      for (const e of this.enemies) {
        if (e.dead || hit.has(e.id)) continue;
        const d = Math.hypot(e.x - from.x, e.y - from.y);
        if (d < bd) { bd = d; target = e; }
      }
      if (!target) break;
      hit.add(target.id);
      this.effects.push(new Bolt(from.x, from.y, target.x, target.y, atk.color));
      this.effects.push(new Flash(target.x, target.y, 26, 0.25, atk.glow));
      this.damageEnemy(target, dmg * (1 - i * 0.12), atk);
      from = { x: target.x, y: target.y };
    }
    this.shake = Math.min(14, this.shake + 5);
  }

  dragonBeam(atk, dmg) {
    this.shake = Math.min(26, this.shake + 20);
    const by = this.laneY - 26;
    for (const e of this.enemies) {
      if (e.dead) continue;
      this.damageEnemy(e, dmg, atk);
      if (atk.burn) e.applyBurn(atk.burn.dps, atk.burn.duration);
      this.spawnBurst(e.x, e.y, atk.color, 14);
    }
    // a charging, sweeping beam across the whole lane
    this.effects.push(new Beam(this.gateX, this.W, by, 34, atk.color, 0.55));
    this.effects.push(new Beam(this.gateX, this.W, by, 14, atk.glow, 0.55));
    this.effects.push(new Flash(this.gateX, by, 60, 0.4, atk.glow));
    this.flashScreen(atk.color, 0.22);
  }

  damageEnemy(e, dmg, atk) {
    e.hurt(dmg);
    Audio.hit();
    this.texts.push(new FloatingText(e.x, e.y - e.radius - 6, `${Math.round(dmg)}`, atk ? atk.glow : '#fff', 16));
    if (e.dead) this.onKill(e);
  }

  comboMult() {
    return Math.min(4, 1 + Math.floor(this.combo / 4) * 0.25);
  }

  onKill(e) {
    // tutorial dummies give visual feedback only — no rewards/combo
    if (this.tutorial.active) {
      Audio.enemyDie();
      this.spawnBurst(e.x, e.y, e.def.color, 18);
      return;
    }
    // chain the combo and apply its score multiplier
    this.combo++;
    this.comboTimer = this.COMBO_WINDOW;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const mult = this.comboMult();

    this.state.gold += e.gold;
    this.state.kills++;
    this.state.score += Math.round(e.maxHp * mult);
    Audio.enemyDie();
    // satisfying death pop: ink bloom + twinkle + burst
    this.spawnBurst(e.x, e.y, e.def.color, e.def.boss ? 60 : 24);
    this.effects.push(new InkWash(e.x, e.y, e.radius * (e.def.boss ? 2.2 : 1.5), e.def.color));
    this.effects.push(new Sparkle(e.x, e.y, e.radius * (e.def.boss ? 1.5 : 1.0), '#ffe9b0', e.def.boss ? 0.7 : 0.5));
    this.effects.push(new Ring(e.x, e.y, 4, e.radius * (e.def.boss ? 2.4 : 1.6), 0.5, e.def.color, 4));
    this.texts.push(new FloatingText(e.x, e.y - 10, `+${e.gold}₩`, '#c79a3e', 16));
    if (this.combo > 1 && this.combo % 5 === 0) {
      this.texts.push(new FloatingText(this.W / 2, this.H * 0.42, t('toast.combo', { n: this.combo, m: mult.toFixed(2) }), '#c79a3e', 24));
      this.buzz(12);
    }
    if (e.def.boss) this.shake = Math.min(28, this.shake + 16);
    // meta XP toward leveling up + unlocking letters
    this.gainXp(Math.round(e.maxHp * 0.5) + (e.def.boss ? 60 : 4));
  }

  gainXp(amount) {
    const res = Prog.addXp(amount);
    if (res.gold) this.state.gold += res.gold;
    for (const lv of res.levels) {
      this.texts.push(new FloatingText(this.W / 2, this.H * 0.36, t('toast.levelUp', { n: lv }), '#c79a3e', 26));
      Audio.buy();
    }
    for (const id of res.unlocked) {
      const j = jamoChar(id);
      this.texts.push(new FloatingText(this.W / 2, this.H * 0.46, t('toast.newLetter', { j }), '#e6cf94', 22));
      this.effects.push(new Ring(this.W / 2, this.H * 0.46, 6, 80, 0.7, '#e6cf94', 3));
      this.buzz(20);
    }
    if ((res.levels.length || res.unlocked.length) && this.ui) {
      this.ui.refreshShop();
      this.ui.buildSpellbook();
    }
  }

  // ---- particles -----------------------------------------------------------
  spawnBurst(x, y, color, n) {
    for (let i = 0; i < n; i++) this.particles.push(new Particle(x, y, color));
  }

  spawnBolt(from, to, color) {
    const steps = 6;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = from.x + (to.x - from.x) * t + (Math.random() * 20 - 10);
      const y = from.y + (to.y - from.y) * t + (Math.random() * 20 - 10);
      this.particles.push(new Particle(x, y, color, { speed: 30, life: 0.25, size: 3, gravity: 0 }));
    }
  }

  // ---- input ---------------------------------------------------------------
  bindInput() {
    const c = this.canvas;
    const pos = (ev) => {
      const r = c.getBoundingClientRect();
      const p = ev.touches ? ev.touches[0] : ev;
      return { x: p.clientX - r.left, y: p.clientY - r.top };
    };
    const start = (ev) => {
      if (this.gameOver || this.paused) return;
      ev.preventDefault();
      Audio.unlock();
      this.drawing = true;
      this.stroke = [pos(ev)];
    };
    const move = (ev) => {
      if (!this.drawing) return;
      ev.preventDefault();
      const p = pos(ev);
      const last = this.stroke[this.stroke.length - 1];
      if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 3) this.stroke.push(p);
    };
    const end = (ev) => {
      if (!this.drawing) return;
      ev.preventDefault();
      this.drawing = false;
      this.finishStroke();
    };
    c.addEventListener('mousedown', start);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    c.addEventListener('touchstart', start, { passive: false });
    c.addEventListener('touchmove', move, { passive: false });
    c.addEventListener('touchend', end, { passive: false });
  }

  finishStroke() {
    if (this.stroke.length < 4) { this.stroke = []; return; }
    const last = this.stroke[this.stroke.length - 1];
    if (!this.addStroke(this.stroke, last)) this.missStroke(last);
    // in hold mode, keep each accepted stroke on screen while composing
    else if (this.holdMode) this.heldStrokes.push(this.stroke);
    this.stroke = [];
  }

  // Feed one drawn stroke into the syllable being composed, handling doubled
  // consonants (ㄱㄱ→ㄲ) and compound vowels (ㅗ+ㅏ→ㅘ) the way Hangul does.
  // Returns true if the stroke was consumed.
  addStroke(stroke, at) {
    const ACCEPT = 0.68;
    const j = this.compose.jamos;
    const rc = this.recognizer.recognize(stroke, 'consonant');
    const rv = this.recognizer.recognize(stroke, 'vowel');
    const consOk = rc.id && rc.score >= ACCEPT;
    const vowOk = rv.id && rv.score >= ACCEPT;

    if (j.length === 0) {
      if (consOk) return this.addUnlocked(rc.id, at);
      return false;
    }

    if (j.length === 1) {
      // after 초성: a vowel (중성), or the same consonant again → doubled 쌍자음
      const dbl = DOUBLE_OF[j[0]];
      if (dbl && rc.id === j[0] && consOk && rc.score >= rv.score) {
        j[0] = dbl;
        return this.addJamo(null, at, t('toast.double', { j: jamoChar(dbl) }));
      }
      if (vowOk && rv.score >= rc.score) return this.addUnlocked(rv.id, at);
      if (consOk) { // a different consonant → start a new syllable
        if (!this.usable(rc.id)) return this.lockedMsg(at, rc.id);
        this.commitSyllable();
        return this.addJamo(rc.id, at);
      }
      return false;
    }

    if (j.length === 2) {
      // after 초성+중성: a compound vowel, or a 종성 consonant
      const comb = rv.id && COMBINE_VOWEL[`${j[1]},${rv.id}`];
      if (comb && vowOk && rv.score >= rc.score) {
        if (!this.usable(rv.id)) return this.lockedMsg(at, rv.id);
        j[1] = comb;
        return this.addJamo(null, at, t('toast.combine', { j: jamoChar(comb) }));
      }
      if (consOk) return this.addUnlocked(rc.id, at); // 받침
      return false;
    }

    // j.length === 3 (hold mode): extend the 받침 into a 겹받침 / doubled final,
    // else commit and begin a new syllable.
    const dblJong = DOUBLE_OF[j[2]];
    if (dblJong && rc.id === j[2] && consOk && rc.score >= rv.score) {
      j[2] = dblJong;
      return this.addJamo(null, at, t('toast.final', { j: jamoChar(dblJong) }));
    }
    const cluster = rc.id && COMBINE_JONG[`${j[2]},${rc.id}`];
    if (cluster && consOk && rc.score >= rv.score) {
      if (!this.usable(rc.id)) return this.lockedMsg(at, rc.id);
      j[2] = cluster;
      return this.addJamo(null, at, t('toast.cluster', { j: jamoChar(cluster) }));
    }
    if (consOk) {
      if (!this.usable(rc.id)) return this.lockedMsg(at, rc.id);
      this.commitSyllable();
      return this.addJamo(rc.id, at);
    }
    return false;
  }

  // The tutorial is a sandbox — every letter is usable there.
  usable(id) {
    return this.tutorial.active || Prog.isUnlocked(id);
  }

  // Add a recognized jamo only if it's unlocked; otherwise show a lock prompt.
  addUnlocked(id, at, toast = null) {
    if (!this.usable(id)) return this.lockedMsg(at, id);
    return this.addJamo(id, at, toast);
  }

  lockedMsg(at, id) {
    Audio.miss();
    this.buzz([8, 30, 8]);
    this.texts.push(new FloatingText(at.x, at.y, `${jamoChar(id)} · ${t('toast.locked')}`, '#bf6a5a', 20));
    return true; // consumed — no '?' miss marker
  }

  // Gacha: spend gold to summon a random locked letter. Returns the result.
  buyGacha() {
    if (!Prog.canPull()) return { dup: true };
    const cost = Prog.gachaCost();
    if (this.state.gold < cost) { Audio.miss(); return { poor: true, cost }; }
    this.state.gold -= cost;
    const res = Prog.gachaPull();
    this.save();
    Audio.buy();
    if (res.id) {
      this.texts.push(new FloatingText(this.W / 2, this.H * 0.4, `${jamoChar(res.id)}  ${t('sum.got')}`, '#e6cf94', 30));
      this.effects.push(new Ring(this.W / 2, this.H * 0.4, 6, 90, 0.8, '#e6cf94', 3));
      if (this.ui) this.ui.buildSpellbook();
    }
    return res;
  }

  composeWindow() {
    return this.tutorial.active ? 1.4 : this.COMPOSE_WINDOW; // calmer pace while learning
  }

  // Push (or, when id is null, merge-in-place) a jamo into the buffer.
  addJamo(id, at, toast = null) {
    if (id !== null) this.compose.jamos.push(id);
    this.compose.timer = this.composeWindow();
    this.compose.x = at.x;
    this.compose.y = at.y;
    Audio.compose(this.compose.jamos.length);
    this.buzz(toast ? 18 : 8);
    if (toast) this.texts.push(new FloatingText(this.W / 2, this.H * 0.27, toast, '#c79a3e', 20));
    // In quick mode a full 3-jamo block fires at once; in hold mode it waits
    // so a 4th stroke can extend the 받침 into a 겹받침.
    if (!this.holdMode && this.compose.jamos.length >= 3) this.commitSyllable();
    return true;
  }

  commitSyllable() {
    const jamos = this.compose.jamos;
    if (jamos.length === 0) return;
    const char = composeSyllable(jamos);
    const spell = buildSyllableSpell(jamos);
    this.compose = { jamos: [], timer: 0, x: this.compose.x, y: this.compose.y };
    if (spell) this.castSpell(spell, jamos[0]);
    if (this.tutorial && this.tutorial.active) this.tutorialCheck(char);
  }

  // ---- first-run tutorial: walks through 가 → 까 → 과 ----------------------
  startTutorial() {
    this.tutorial = { active: true, step: 0 };
    this.waveActive = false;
    this.spawnQueue = [];
    this.enemies = [];
    this.combo = 0;
    this.state.mana = this.state.manaMax;
    this.spawnTutorialDummies();
    this.ui.showTutorial(tutStep(0), 0, TUTORIAL_STEPS.length);
  }

  spawnTutorialDummies() {
    for (let i = 0; i < 3; i++) {
      const e = new Enemy('blue', this.W * 0.58 + i * 64, this.laneY - 6 + (i % 2 ? 18 : -18), 1, 1);
      e.baseSpeed = 0; // stationary practice targets
      this.enemies.push(e);
    }
  }

  tutorialCheck(char) {
    const step = TUTORIAL_STEPS[this.tutorial.step];
    if (char !== step.target) return;
    this.tutorial.step++;
    this.buzz(20);
    if (this.tutorial.step >= TUTORIAL_STEPS.length) {
      this.texts.push(new FloatingText(this.W / 2, this.H * 0.5, t('toast.done'), '#c79a3e', 30));
      this.endTutorial(false);
    } else {
      this.texts.push(new FloatingText(this.W / 2, this.H * 0.5, t('toast.nice'), '#9aa7b8', 26));
      this.ui.showTutorial(tutStep(this.tutorial.step), this.tutorial.step, TUTORIAL_STEPS.length);
    }
  }

  endTutorial() {
    this.tutorial = { active: false, step: 0 };
    try { localStorage.setItem('ganada_tutorial_done', '1'); } catch (e) { /* ignore */ }
    this.ui.hideTutorial();
    this.enemies = [];
    this.projectiles = [];
    this.effects = [];
    this.holdMode = false;
    this.combo = 0;
    this.comboTimer = 0;
    if (this.ui) this.ui.setHold(false);
    this.startWave();
  }

  // "✍️ 모아 그리기" — enter hold mode and start a fresh syllable, so the
  // player can draw several strokes (e.g. ㅎ+ㅕ+ㄹ = 혈) without the timer
  // firing. Pressing it again restarts the current syllable.
  beginHold() {
    this.holdMode = true;
    this.compose = { jamos: [], timer: 0, x: this.W / 2, y: this.H * 0.2 };
    this.heldStrokes = [];
    Audio.compose(0);
    if (this.ui) this.ui.setHold(true);
  }

  // "✨ 시전" — fire whatever is composed and leave hold mode.
  castComposed() {
    const had = this.compose.jamos.length;
    this.commitSyllable();
    this.heldStrokes = [];
    this.holdMode = false;
    if (this.ui) this.ui.setHold(false);
    if (!had) Audio.miss();
  }

  missStroke(at) {
    Audio.miss();
    this.texts.push(new FloatingText(at.x, at.y, '?', '#aaa', 28));
  }

  restart() {
    const keepGold = this.state.gold;
    const keepUp = this.state.upgrades;
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.effects = [];
    this.texts = [];
    this.screenFlash.a = 0;
    this.gameOver = false;
    this.state = this.freshState();
    this.state.gold = keepGold;
    // re-apply upgrades
    for (const [key, count] of Object.entries(keepUp)) {
      for (let i = 0; i < count; i++) { UPGRADES[key].apply(this.state); this.state.upgrades[key]++; }
    }
    this.state.mana = this.state.manaMax;
    this.state.gateHp = this.state.gateMax;
    this.compose = { jamos: [], timer: 0, x: 0, y: 0 };
    this.heldStrokes = [];
    this.holdMode = false;
    this.combo = 0;
    this.comboTimer = 0;
    if (this.ui) this.ui.setHold(false);
    this.ui.hideGameOver();
    this.startWave();
  }

  // ---- main loop -----------------------------------------------------------
  start() {
    const loop = (t) => {
      const dt = Math.min(0.05, (t - this.lastTime) / 1000 || 0);
      this.lastTime = t;
      if (this.started && !this.paused && !this.gameOver) this.update(dt);
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame((t) => { this.lastTime = t; loop(t); });
  }

  update(dt) {
    // tutorial: keep ink topped up and practice targets present
    if (this.tutorial && this.tutorial.active) {
      this.state.mana = this.state.manaMax;
      if (this.enemies.length < 2) this.spawnTutorialDummies();
    }

    // resources
    this.state.mana = Math.min(this.state.manaMax, this.state.mana + this.state.manaRegen * dt);

    // composition window: cast the syllable once the player stops adding jamo.
    // In hold mode the timer is frozen — the player fires with the 시전 button.
    if (!this.holdMode && this.compose.jamos.length > 0) {
      this.compose.timer -= dt;
      if (this.compose.timer <= 0) this.commitSyllable();
    }

    // auto turret (the "idle" damage) — paused during the tutorial so the
    // player's own casts are what clear the practice targets.
    this.turretTimer -= dt;
    if (this.turretTimer <= 0 && this.enemies.length && !this.tutorial.active) {
      this.turretTimer = this.state.turretRate;
      const target = this.frontmost();
      if (target) {
        const atkLike = { color: '#9aa7b8', glow: '#e8e0c8', kind: 'projectile', radius: 0 };
        this.projectiles.push(new Projectile(this.gateX, this.laneY - 30, target.x, target.y,
          atkLike, this.state.turretDamage,
          (hx, hy) => {
            const e = this.nearestEnemy(hx, hy);
            this.spawnBurst(hx, hy, '#9aa7b8', 8);
            if (e && Math.hypot(e.x - hx, e.y - hy) < e.radius + 18) this.damageEnemy(e, this.state.turretDamage, atkLike);
          }));
      }
    }

    this.spawnUpdate(dt);

    for (const e of this.enemies) {
      e.update(dt, this.gateX);
      if (e.reachedGate && !e.dead) {
        // lunge forward, land the hit mid-lunge, then vanish
        e.attacking = true;
        e.attackT += dt;
        if (e.attackT >= 0.16 && !e.hitApplied) {
          e.hitApplied = true;
          this.state.gateHp -= e.damage;
          this.shake = Math.min(20, this.shake + 6);
          Audio.gateHit();
          this.buzz(this.state.gateHp <= 0 ? 120 : 25);
          this.spawnBurst(this.gateX + 14, e.y, '#a85436', 16);
          this.effects.push(new Ring(this.gateX + 14, e.y, 4, 34, 0.35, '#d9764a', 3));
          this.effects.push(new Flash(this.gateX + 14, e.y, 24, 0.25, '#ffb38a'));
          if (this.state.gateHp <= 0) {
            this.state.gateHp = 0;
            this.triggerGameOver();
          }
        }
        if (e.attackT >= 0.34) e.dead = true;
      }
    }

    for (const p of this.projectiles) p.update(dt);
    for (const p of this.particles) p.update(dt);
    for (const fx of this.effects) fx.update(dt);
    for (const t of this.texts) t.update(dt);

    // ambient 도깨비불 wisps drifting up from the enemies (eldritch vibe)
    this.wispTimer -= dt;
    if (this.wispTimer <= 0 && this.enemies.length) {
      this.wispTimer = 0.25;
      const e = this.enemies[Math.floor(Math.random() * this.enemies.length)];
      if (e && !e.dead) {
        const col = e.def.boss ? '#7fd0ff' : (e.type === 'red' ? '#ff8a5a' : '#8fd0ff');
        this.effects.push(new Wisp(e.x + (Math.random() * 20 - 10), e.y - e.radius * 0.5, col));
      }
    }

    this.enemies = this.enemies.filter((e) => !e.dead);
    this.projectiles = this.projectiles.filter((p) => !p.dead);
    this.particles = this.particles.filter((p) => !p.dead);
    this.effects = this.effects.filter((fx) => !fx.dead);
    this.texts = this.texts.filter((t) => !t.dead);

    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 40);
    if (this.lowInkFlash > 0) this.lowInkFlash -= dt;
    if (this.screenFlash.a > 0) this.screenFlash.a = Math.max(0, this.screenFlash.a - dt * 0.9);
    if (this.gateGlow > 0) this.gateGlow = Math.max(0, this.gateGlow - dt * 2.4);
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    this.ui.updateHUD(this.state, this.bestWave, this.enemiesRemaining(), this.lowInkFlash > 0);
  }

  triggerGameOver() {
    this.gameOver = true;
    this.shake = 26;
    this.save();
    this.ui.showGameOver(this.state, this.bestWave, this.bestCombo);
  }

  // ---- rendering -----------------------------------------------------------
  render() {
    const ctx = this.ctx;
    const time = (this.lastTime || 0) / 1000;
    ctx.save();
    if (this.shake > 0.5) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }
    drawBackground(ctx, this.W, this.H, this.laneY, this.state.wave, time);
    drawGate(ctx, this.gateX, this.laneY, this.H, this.state.gateHp / this.state.gateMax, time, this.gateGlow);

    // enemies sorted by depth (y)
    const sorted = [...this.enemies].sort((a, b) => a.y - b.y);
    for (const e of sorted) drawDokkaebi(ctx, e, time);

    // projectiles
    for (const p of this.projectiles) this.drawProjectile(ctx, p);

    // animated spell effects (shockwaves, bolts, beams, shards, wisps)
    for (const fx of this.effects) fx.draw(ctx);

    // particles — themed colour; additive bloom only in glow-heavy themes
    const theme = getTheme();
    if (theme.additive) ctx.globalCompositeOperation = 'lighter';
    for (const p of this.particles) {
      const a = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = a * (theme.additive ? 0.9 : 0.8);
      ctx.fillStyle = theme.fx(p.color);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    // floating text
    ctx.textAlign = 'center';
    ctx.font = `bold 16px ${F_BODY}`;
    for (const t of this.texts) {
      ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
      ctx.fillStyle = t.color;
      ctx.font = `bold ${t.size}px ${F_BODY}`;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 3;
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;

    // strokes kept on screen while composing in hold mode
    if (this.heldStrokes.length) this.drawHeld(ctx);
    // current drawing stroke
    if (this.stroke.length > 1) this.drawStroke(ctx);

    // syllable being composed (e.g. 가 assembling from ㄱ + ㅏ)
    if (this.compose.jamos.length > 0 || this.holdMode) this.drawCompose(ctx);

    // combo counter
    if (this.combo >= 3) this.drawCombo(ctx);

    ctx.restore();

    // full-screen impact flash (above the shake transform)
    if (this.screenFlash.a > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = this.screenFlash.a;
      ctx.fillStyle = getTheme().fx(this.screenFlash.color);
      ctx.fillRect(0, 0, this.W, this.H);
      ctx.restore();
    }
  }

  drawCombo(ctx) {
    const mult = this.comboMult();
    const fresh = Math.max(0, this.comboTimer / this.COMBO_WINDOW);
    const pop = 1 + fresh * 0.12;
    ctx.save();
    ctx.translate(this.W - 64, this.H * 0.34);
    ctx.scale(pop, pop);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#c79a3e';
    ctx.shadowColor = '#9c6b32';
    ctx.shadowBlur = 12;
    ctx.font = `bold 34px ${F_BRUSH}`;
    ctx.fillText(`${this.combo}`, 0, 2);
    ctx.shadowBlur = 0;
    ctx.font = `bold 13px ${F_BODY}`;
    ctx.fillStyle = '#fff';
    ctx.fillText(t('hud.combo'), 0, -24);
    ctx.fillStyle = '#9aa7b8';
    ctx.fillText(`x${mult.toFixed(2)}`, 0, 18);
    // draining bar
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(-26, 26, 52, 4);
    ctx.fillStyle = '#c79a3e';
    ctx.fillRect(-26, 26, 52 * fresh, 4);
    ctx.restore();
  }

  drawCompose(ctx) {
    const char = composeSyllable(this.compose.jamos);
    const cx = this.W / 2;
    const cy = this.H * 0.2;
    const frac = this.holdMode ? 1 : Math.max(0, this.compose.timer / this.COMPOSE_WINDOW);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // ring (full + amber in hold mode, countdown in quick mode)
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, 40, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = this.holdMode ? '#c79a3e' : '#9aa7b8';
    ctx.beginPath();
    ctx.arc(cx, cy, 40, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    ctx.stroke();
    // the assembling syllable
    ctx.shadowColor = this.holdMode ? '#c79a3e' : '#9aa7b8';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#fff';
    ctx.font = `bold 46px ${F_BODY}`;
    ctx.fillText(char || '…', cx, cy + 2);
    ctx.shadowBlur = 0;
    ctx.font = `12px ${F_BODY}`;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    const hint = this.holdMode ? t('compose.keepGoing') : (this.compose.jamos.length === 1 ? t('compose.addVowel') : '');
    if (hint) ctx.fillText(hint, cx, cy + 56);
    ctx.restore();
  }

  drawProjectile(ctx, p) {
    const theme = getTheme();
    const color = theme.fx(p.attack.color);
    const glow = theme.fx(p.attack.glow);
    ctx.save();
    // inky trail blobs
    for (let i = 0; i < p.trail.length; i++) {
      const a = i / p.trail.length;
      ctx.globalAlpha = a * 0.55;
      ctx.fillStyle = glow;
      inkBlob(ctx, p.trail[i].x, p.trail[i].y, 2.5 + a * 4, i * 13 + 3, 0.5, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowColor = color;
    ctx.shadowBlur = 7 * theme.glow;
    ctx.fillStyle = color;
    inkBlob(ctx, p.x, p.y, 8, (p.id || 1) * 7, 0.35, 9);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = glow;
    inkBlob(ctx, p.x, p.y, 3.5, (p.id || 1) * 11 + 2, 0.4, 7);
    ctx.fill();
    ctx.restore();
  }

  // The player's drawn ink — styled by the active theme (bone-white sumi,
  // neon cyan glow, or warm bronze, etc.).
  // The strokes already drawn this hold-mode syllable, kept softly on screen.
  drawHeld(ctx) {
    const s = getTheme().stroke;
    ctx.save();
    ctx.globalAlpha = 0.5;
    for (const st of this.heldStrokes) {
      if (st.length < 2) continue;
      brushStroke(ctx, st, 11, s.bleed, true);
      brushStroke(ctx, st, 8, s.body, true);
      brushStroke(ctx, st, 4, s.core, true);
    }
    ctx.restore();
  }

  drawStroke(ctx) {
    const s = getTheme().stroke;
    ctx.save();
    ctx.shadowColor = s.bleedShadow;
    ctx.shadowBlur = s.bleedBlur;
    brushStroke(ctx, this.stroke, 15, s.bleed, true);
    ctx.shadowBlur = 0;
    brushStroke(ctx, this.stroke, 11, s.body, true);
    brushStroke(ctx, this.stroke, 5, s.core, true);
    const head = this.stroke[this.stroke.length - 1];
    ctx.fillStyle = s.head;
    inkBlob(ctx, head.x, head.y, 5.5, this.stroke.length * 3 + 1, 0.3, 8);
    ctx.fill();
    ctx.restore();
  }
}
