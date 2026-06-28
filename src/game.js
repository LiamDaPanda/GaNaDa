// game.js — main loop, state, spawning, input, rendering.
import { buildRecognizer } from './recognizer.js';
import {
  ATTACKS, buildSyllableSpell, composeSyllable, jamoChar,
  DOUBLE_OF, COMBINE_VOWEL, COMBINE_JONG,
} from './attacks.js';
import { Enemy, Projectile, Particle, FloatingText } from './entities.js';
import { Audio } from './audio.js';
import { drawDokkaebi, drawGate, drawBackground } from './render.js';
import { UPGRADES } from './upgrades.js';

const SAVE_KEY = 'ganada_save_v1';

const TUTORIAL_STEPS = [
  { title: 'ㄱ + ㅏ = 가', detail: 'ㄱ(┐)을 그린 뒤 이어서 ㅏ(⊢)를 그려 \'가\'를 시전하세요.', target: '가' },
  { title: 'ㄱ ㄱ + ㅏ = 까', detail: '같은 자음을 두 번 그리면 쌍자음! ㄱㄱ으로 ㄲ을 만들어 \'까\'.', target: '까' },
  { title: 'ㄱ + ㅗ ㅏ = 과', detail: '모음을 이어 그리면 복합 모음! ㅗ 다음 ㅏ = ㅘ → \'과\'.', target: '과' },
];

export class Game {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ui = ui;
    this.recognizer = buildRecognizer();

    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.texts = [];
    this.shake = 0;

    this.stroke = [];        // current drawing points (screen space)
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

  togglePause() {
    if (this.gameOver) return;
    this.manualPause = !this.manualPause;
    this.paused = this.manualPause;
    if (this.ui) this.ui.setPaused(this.paused);
  }

  // ✕ — discard the syllable currently being drawn.
  clearCompose() {
    this.compose = { jamos: [], timer: 0, x: this.W / 2, y: this.H * 0.2 };
    this.holdMode = false;
    if (this.ui) this.ui.setHold(false);
    Audio.miss();
  }

  buzz(ms) {
    if (this.haptic) navigator.vibrate?.(ms);
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
    this.ui.banner(`${w}번째 물결!`, isBoss ? '⚠️ 도깨비 대장 출현' : '');
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
      this.texts.push(new FloatingText(this.W / 2, this.H * 0.4, '물결 클리어! +보너스', '#ffe27a', 26));
      this.save();
      setTimeout(() => { if (!this.gameOver) this.startWave(); }, 1600);
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
      this.texts.push(new FloatingText(this.W / 2, this.H * 0.5, '먹이 부족!', '#ff8080', 22));
      return false;
    }
    this.state.mana -= atk.manaCost;
    const dmg = atk.baseDamage * this.state.powerMul;
    Audio.cast(atk.element);
    this.buzz(atk.kind === 'ultimate' || atk.kind === 'beam' ? 30 : 14);

    const origin = { x: this.gateX, y: this.laneY - 30 };

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
      this.texts.push(new FloatingText(this.W / 2, this.H * 0.33, atk.name, atk.glow, 24));
    }
    this.ui.flashRune(baseKey || (atk.jamos ? atk.jamos[0] : atk));
    return true;
  }

  healGate(amount) {
    if (!amount) return;
    this.state.gateHp = Math.min(this.state.gateMax, this.state.gateHp + amount);
    this.texts.push(new FloatingText(this.gateX, this.laneY - 80, `+${amount} 🏯`, '#ffe27a', 20));
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
    // streak visual sweeping right along the band
    for (let i = 0; i < 50; i++) {
      const t = i / 50;
      this.particles.push(new Particle(this.gateX + t * (this.W - this.gateX), bandY + (Math.random() * 30 - 15),
        i % 2 ? atk.glow : atk.color, { speed: 30, life: 0.35, size: 3.5, gravity: 0 }));
    }
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
    for (let i = 0; i < 70; i++) {
      this.particles.push(new Particle(this.gateX + Math.random() * (this.W - this.gateX),
        this.laneY - 20 + (Math.random() * 70 - 35), atk.glow, { speed: 20, life: 0.45, size: 3, gravity: 0 }));
    }
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
    for (let i = 0; i < 130; i++) {
      this.particles.push(new Particle(this.gateX + Math.random() * (this.W - this.gateX),
        this.laneY - 20 + (Math.random() * 120 - 60), i % 2 ? atk.glow : atk.color,
        { speed: 60, life: 0.6, size: 4, gravity: 0 }));
    }
  }

  frontmost() {
    let best = null;
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (!best || e.x < best.x) best = e;
    }
    return best;
  }

  explode(x, y, atk, dmg) {
    this.shake = Math.min(18, this.shake + (atk.kind === 'nova' ? 12 : 7));
    this.spawnBurst(x, y, atk.color, atk.kind === 'nova' ? 60 : 30);
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
      this.spawnBolt(from, target, atk.color);
      this.damageEnemy(target, dmg * (1 - i * 0.12), atk);
      from = { x: target.x, y: target.y };
    }
    this.shake = Math.min(14, this.shake + 5);
  }

  dragonBeam(atk, dmg) {
    this.shake = Math.min(26, this.shake + 20);
    for (const e of this.enemies) {
      if (e.dead) continue;
      this.damageEnemy(e, dmg, atk);
      if (atk.burn) e.applyBurn(atk.burn.dps, atk.burn.duration);
      this.spawnBurst(e.x, e.y, atk.color, 14);
    }
    // beam visual particles across the lane
    for (let i = 0; i < 80; i++) {
      const px = this.gateX + Math.random() * (this.W - this.gateX);
      this.particles.push(new Particle(px, this.laneY - 30 + (Math.random() * 60 - 30), atk.glow, {
        speed: 20, life: 0.5, size: 3, gravity: 0,
      }));
    }
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
    // chain the combo and apply its score multiplier
    this.combo++;
    this.comboTimer = this.COMBO_WINDOW;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const mult = this.comboMult();

    this.state.gold += e.gold;
    this.state.kills++;
    this.state.score += Math.round(e.maxHp * mult);
    Audio.enemyDie();
    this.spawnBurst(e.x, e.y, e.def.color, e.def.boss ? 50 : 18);
    this.texts.push(new FloatingText(e.x, e.y - 10, `+${e.gold}💰`, '#ffd966', 16));
    if (this.combo > 1 && this.combo % 5 === 0) {
      this.texts.push(new FloatingText(this.W / 2, this.H * 0.42, `${this.combo} 콤보! x${mult.toFixed(2)}`, '#ffd23d', 24));
      this.buzz(12);
    }
    if (e.def.boss) this.shake = Math.min(28, this.shake + 16);
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

    if (j.length === 0) {
      // 초성 — must be a consonant
      if (rc.id && rc.score >= ACCEPT) return this.addJamo(rc.id, at);
      return false;
    }

    if (j.length === 1) {
      // after 초성: a vowel (중성), or the same consonant again → doubled 쌍자음
      const dbl = DOUBLE_OF[j[0]];
      if (dbl && rc.id === j[0] && rc.score >= ACCEPT && rc.score >= rv.score) {
        j[0] = dbl;
        return this.addJamo(null, at, `쌍 ${jamoChar(dbl)}!`);
      }
      if (rv.id && rv.score >= ACCEPT && rv.score >= rc.score) return this.addJamo(rv.id, at);
      if (rc.id && rc.score >= ACCEPT) { // a different consonant → new syllable
        this.commitSyllable();
        return this.addJamo(rc.id, at);
      }
      return false;
    }

    if (j.length === 2) {
      // after 초성+중성: a compound vowel, or a 종성 consonant
      const comb = rv.id && COMBINE_VOWEL[`${j[1]},${rv.id}`];
      if (comb && rv.score >= ACCEPT && rv.score >= rc.score) {
        j[1] = comb;
        return this.addJamo(null, at, `조합 ${jamoChar(comb)}!`);
      }
      if (rc.id && rc.score >= ACCEPT) return this.addJamo(rc.id, at); // 받침
      return false;
    }

    // j.length === 3 (reachable in hold mode): extend the 받침 into a 겹받침
    // (ㄹ+ㄱ→ㄺ) or a doubled final, otherwise commit and begin a new syllable.
    const dblJong = DOUBLE_OF[j[2]];
    if (dblJong && rc.id === j[2] && rc.score >= ACCEPT && rc.score >= rv.score) {
      j[2] = dblJong;
      return this.addJamo(null, at, `받침 ${jamoChar(dblJong)}!`);
    }
    const cluster = rc.id && COMBINE_JONG[`${j[2]},${rc.id}`];
    if (cluster && rc.score >= ACCEPT && rc.score >= rv.score) {
      j[2] = cluster;
      return this.addJamo(null, at, `겹받침 ${jamoChar(cluster)}!`);
    }
    if (rc.id && rc.score >= ACCEPT) {
      this.commitSyllable();
      return this.addJamo(rc.id, at);
    }
    return false;
  }

  // Push (or, when id is null, merge-in-place) a jamo into the buffer.
  addJamo(id, at, toast = null) {
    if (id !== null) this.compose.jamos.push(id);
    this.compose.timer = this.COMPOSE_WINDOW;
    this.compose.x = at.x;
    this.compose.y = at.y;
    Audio.compose(this.compose.jamos.length);
    this.buzz(toast ? 18 : 8);
    if (toast) this.texts.push(new FloatingText(this.W / 2, this.H * 0.27, toast, '#ffd23d', 20));
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
    this.ui.showTutorial(TUTORIAL_STEPS[0], 0, TUTORIAL_STEPS.length);
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
      this.texts.push(new FloatingText(this.W / 2, this.H * 0.5, '완료! 🎉', '#ffd23d', 30));
      this.endTutorial(false);
    } else {
      this.texts.push(new FloatingText(this.W / 2, this.H * 0.5, '좋아요! ✨', '#9fe3ff', 26));
      this.ui.showTutorial(TUTORIAL_STEPS[this.tutorial.step], this.tutorial.step, TUTORIAL_STEPS.length);
    }
  }

  endTutorial() {
    this.tutorial = { active: false, step: 0 };
    try { localStorage.setItem('ganada_tutorial_done', '1'); } catch (e) { /* ignore */ }
    this.ui.hideTutorial();
    this.enemies = [];
    this.holdMode = false;
    if (this.ui) this.ui.setHold(false);
    this.startWave();
  }

  // "✍️ 모아 그리기" — enter hold mode and start a fresh syllable, so the
  // player can draw several strokes (e.g. ㅎ+ㅕ+ㄹ = 혈) without the timer
  // firing. Pressing it again restarts the current syllable.
  beginHold() {
    this.holdMode = true;
    this.compose = { jamos: [], timer: 0, x: this.W / 2, y: this.H * 0.2 };
    Audio.compose(0);
    if (this.ui) this.ui.setHold(true);
  }

  // "✨ 시전" — fire whatever is composed and leave hold mode.
  castComposed() {
    const had = this.compose.jamos.length;
    this.commitSyllable();
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
    this.texts = [];
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
      if (!this.paused && !this.gameOver) this.update(dt);
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

    // auto turret (the "idle" damage)
    this.turretTimer -= dt;
    if (this.turretTimer <= 0 && this.enemies.length) {
      this.turretTimer = this.state.turretRate;
      const target = this.frontmost();
      if (target) {
        const atkLike = { color: '#9fe3ff', glow: '#ffffff', kind: 'projectile', radius: 0 };
        this.projectiles.push(new Projectile(this.gateX, this.laneY - 30, target.x, target.y,
          atkLike, this.state.turretDamage,
          (hx, hy) => {
            const e = this.nearestEnemy(hx, hy);
            this.spawnBurst(hx, hy, '#9fe3ff', 8);
            if (e && Math.hypot(e.x - hx, e.y - hy) < e.radius + 18) this.damageEnemy(e, this.state.turretDamage, atkLike);
          }));
      }
    }

    this.spawnUpdate(dt);

    for (const e of this.enemies) {
      e.update(dt, this.gateX);
      if (e.reachedGate && !e.dead) {
        this.state.gateHp -= e.damage;
        this.shake = Math.min(20, this.shake + 6);
        Audio.gateHit();
        this.buzz(this.state.gateHp <= 0 ? 120 : 25);
        this.spawnBurst(this.gateX + 10, e.y, '#ff6b4a', 14);
        e.dead = true;
        if (this.state.gateHp <= 0) {
          this.state.gateHp = 0;
          this.triggerGameOver();
        }
      }
    }

    for (const p of this.projectiles) p.update(dt);
    for (const p of this.particles) p.update(dt);
    for (const t of this.texts) t.update(dt);

    this.enemies = this.enemies.filter((e) => !e.dead);
    this.projectiles = this.projectiles.filter((p) => !p.dead);
    this.particles = this.particles.filter((p) => !p.dead);
    this.texts = this.texts.filter((t) => !t.dead);

    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 40);
    if (this.lowInkFlash > 0) this.lowInkFlash -= dt;
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
    ctx.save();
    if (this.shake > 0.5) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }
    drawBackground(ctx, this.W, this.H, this.laneY, this.state.wave);
    drawGate(ctx, this.gateX, this.laneY, this.H, this.state.gateHp / this.state.gateMax);

    // enemies sorted by depth (y)
    const sorted = [...this.enemies].sort((a, b) => a.y - b.y);
    for (const e of sorted) drawDokkaebi(ctx, e);

    // projectiles
    for (const p of this.projectiles) this.drawProjectile(ctx, p);

    // particles
    for (const p of this.particles) {
      const a = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // floating text
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px system-ui';
    for (const t of this.texts) {
      ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
      ctx.fillStyle = t.color;
      ctx.font = `bold ${t.size}px system-ui, sans-serif`;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 3;
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;

    // current drawing stroke
    if (this.stroke.length > 1) this.drawStroke(ctx);

    // syllable being composed (e.g. 가 assembling from ㄱ + ㅏ)
    if (this.compose.jamos.length > 0 || this.holdMode) this.drawCompose(ctx);

    // combo counter
    if (this.combo >= 3) this.drawCombo(ctx);

    ctx.restore();
  }

  drawCombo(ctx) {
    const mult = this.comboMult();
    const fresh = Math.max(0, this.comboTimer / this.COMBO_WINDOW);
    const pop = 1 + fresh * 0.12;
    ctx.save();
    ctx.translate(this.W - 64, this.H * 0.34);
    ctx.scale(pop, pop);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd23d';
    ctx.shadowColor = '#ff9c2d';
    ctx.shadowBlur = 12;
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText(`${this.combo}`, 0, 0);
    ctx.shadowBlur = 0;
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText('콤보', 0, -24);
    ctx.fillStyle = '#9fe3ff';
    ctx.fillText(`x${mult.toFixed(2)}`, 0, 18);
    // draining bar
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(-26, 26, 52, 4);
    ctx.fillStyle = '#ffd23d';
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
    ctx.strokeStyle = this.holdMode ? '#ffd23d' : '#9fe3ff';
    ctx.beginPath();
    ctx.arc(cx, cy, 40, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    ctx.stroke();
    // the assembling syllable
    ctx.shadowColor = this.holdMode ? '#ffd23d' : '#9fe3ff';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 44px "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif';
    ctx.fillText(char || '…', cx, cy + 2);
    ctx.shadowBlur = 0;
    ctx.font = '12px system-ui';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    const hint = this.holdMode ? '계속 그리고 ✨시전' : (this.compose.jamos.length === 1 ? '모음을 더 그려보세요' : '');
    if (hint) ctx.fillText(hint, cx, cy + 56);
    ctx.restore();
  }

  drawProjectile(ctx, p) {
    ctx.save();
    for (let i = 0; i < p.trail.length; i++) {
      const a = i / p.trail.length;
      ctx.globalAlpha = a * 0.6;
      ctx.fillStyle = p.attack.glow;
      ctx.beginPath();
      ctx.arc(p.trail[i].x, p.trail[i].y, 3 + a * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowColor = p.attack.color;
    ctx.shadowBlur = 16;
    ctx.fillStyle = p.attack.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.attack.glow;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawStroke(ctx) {
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.shadowColor = '#9fe3ff';
    ctx.shadowBlur = 18;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(this.stroke[0].x, this.stroke[0].y);
    for (const p of this.stroke) ctx.lineTo(p.x, p.y);
    ctx.stroke();
    // ink head
    const head = this.stroke[this.stroke.length - 1];
    ctx.fillStyle = '#cdefff';
    ctx.beginPath();
    ctx.arc(head.x, head.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
