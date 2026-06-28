// ui.js — DOM HUD, spell guide, upgrade shop, overlays.
import { ATTACKS, ATTACK_ORDER, VOWELS, VOWEL_ORDER } from './attacks.js';
import { UPGRADES, UPGRADE_ORDER } from './upgrades.js';

export class UI {
  constructor() {
    this.el = {
      wave: document.getElementById('wave'),
      gold: document.getElementById('gold'),
      score: document.getElementById('score'),
      best: document.getElementById('best'),
      gateFill: document.getElementById('gateFill'),
      gateText: document.getElementById('gateText'),
      manaFill: document.getElementById('manaFill'),
      manaText: document.getElementById('manaText'),
      banner: document.getElementById('banner'),
      shop: document.getElementById('shop'),
      runes: document.getElementById('runes'),
      gameOver: document.getElementById('gameOver'),
      goStats: document.getElementById('goStats'),
    };
    this.bannerTimer = null;
    this.buildSpellGuide();
  }

  bind(game) {
    this.game = game;
    document.getElementById('shopToggle').addEventListener('click', () => {
      this.el.shop.classList.toggle('open');
      if (this.el.shop.classList.contains('open')) this.refreshShop();
    });
    document.getElementById('shopClose').addEventListener('click', () => {
      this.el.shop.classList.remove('open');
    });
    document.getElementById('restartBtn').addEventListener('click', () => game.restart());
    const sound = document.getElementById('soundToggle');
    sound.addEventListener('click', () => {
      import('./audio.js').then(({ Audio }) => {
        const on = !Audio.isEnabled();
        Audio.setEnabled(on);
        sound.textContent = on ? '🔊' : '🔇';
      });
    });
    this.refreshShop();
  }

  buildSpellGuide() {
    const wrap = this.el.runes;
    wrap.innerHTML = '';

    const consRow = document.createElement('div');
    consRow.className = 'rune-row';
    for (const key of ATTACK_ORDER) {
      const a = ATTACKS[key];
      const d = document.createElement('div');
      d.className = 'rune';
      d.dataset.key = key;
      d.innerHTML =
        `<div class="rune-jamo" style="color:${a.color}">${a.jamo}</div>` +
        `<div class="rune-name">${a.name}</div>` +
        `<div class="rune-cost">먹 ${a.manaCost}</div>`;
      d.title = `${a.name} — ${a.desc}`;
      consRow.appendChild(d);
    }
    wrap.appendChild(consRow);

    // vowel legend + combo hint
    const vowRow = document.createElement('div');
    vowRow.className = 'vowel-row';
    vowRow.innerHTML = '<span class="combo-hint">조합 →</span>';
    for (const key of VOWEL_ORDER) {
      const v = VOWELS[key];
      const s = document.createElement('span');
      s.className = 'vowel-chip';
      s.innerHTML = `<b>${v.jamo}</b> ${v.name}`;
      s.title = v.desc;
      vowRow.appendChild(s);
    }
    wrap.appendChild(vowRow);
  }

  flashRune(keyOrAtk) {
    const key = typeof keyOrAtk === 'string'
      ? keyOrAtk
      : Object.keys(ATTACKS).find((k) => ATTACKS[k] === keyOrAtk);
    const el = this.el.runes.querySelector(`.rune[data-key="${key}"]`);
    if (!el) return;
    el.classList.remove('flash');
    void el.offsetWidth; // reflow to restart animation
    el.classList.add('flash');
  }

  banner(title, sub = '') {
    const b = this.el.banner;
    b.innerHTML = `<div class="banner-title">${title}</div>${sub ? `<div class="banner-sub">${sub}</div>` : ''}`;
    b.classList.add('show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => b.classList.remove('show'), 1800);
  }

  updateHUD(s, best) {
    this.el.wave.textContent = s.wave;
    this.el.gold.textContent = Math.floor(s.gold);
    this.el.score.textContent = s.score;
    this.el.best.textContent = best || 1;
    const gf = Math.max(0, s.gateHp / s.gateMax);
    this.el.gateFill.style.width = `${gf * 100}%`;
    this.el.gateFill.style.background = `hsl(${gf * 120}, 80%, 50%)`;
    this.el.gateText.textContent = `${Math.ceil(s.gateHp)}/${s.gateMax}`;
    const mf = s.mana / s.manaMax;
    this.el.manaFill.style.width = `${mf * 100}%`;
    this.el.manaText.textContent = `${Math.floor(s.mana)}/${s.manaMax}`;
    // keep shop affordability live if open
    if (this.el.shop.classList.contains('open')) this.updateShopAffordability();
  }

  refreshShop() {
    if (!this.game) return;
    const g = this.game;
    const list = document.getElementById('shopList');
    list.innerHTML = '';
    for (const key of UPGRADE_ORDER) {
      const cost = g.upgradeCost(key);
      const meta = UPGRADES[key];
      const lvl = g.state.upgrades[key];
      const row = document.createElement('button');
      row.className = 'shop-item';
      row.dataset.key = key;
      row.dataset.cost = cost;
      row.innerHTML =
        `<div class="si-icon">${meta.icon}</div>` +
        `<div class="si-main"><div class="si-name">${meta.name} <span class="si-lvl">Lv.${lvl}</span></div>` +
        `<div class="si-desc">${meta.desc}</div></div>` +
        `<div class="si-cost">💰${cost}</div>`;
      row.addEventListener('click', () => {
        if (g.buyUpgrade(key)) this.refreshShop();
      });
      list.appendChild(row);
    }
    this.updateShopAffordability();
  }

  updateShopAffordability() {
    const g = this.game;
    document.querySelectorAll('.shop-item').forEach((row) => {
      const cost = Number(row.dataset.cost);
      row.classList.toggle('afford', g.state.gold >= cost);
    });
  }

  showGameOver(s, best) {
    this.el.goStats.innerHTML =
      `도달 물결 <b>${s.wave}</b> · 점수 <b>${s.score}</b> · 처치 <b>${s.kills}</b><br>` +
      `최고 기록 <b>${best || s.wave}</b>물결`;
    this.el.gameOver.classList.add('show');
  }

  hideGameOver() {
    this.el.gameOver.classList.remove('show');
  }
}
