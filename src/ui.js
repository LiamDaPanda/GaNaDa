// ui.js — DOM HUD, spellbook, upgrade shop, drawing controls, overlays.
import {
  ATTACKS, ATTACK_ORDER, VOWELS, VOWEL_ORDER,
  composeSyllable, buildSyllableSpell,
} from './attacks.js';
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
      manaBar: document.querySelector('.bar.mana'),
      enemiesLeft: document.getElementById('enemiesLeft'),
      pauseOverlay: document.getElementById('pauseOverlay'),
      pauseToggle: document.getElementById('pauseToggle'),
      banner: document.getElementById('banner'),
      shop: document.getElementById('shop'),
      spellbook: document.getElementById('spellbook'),
      bookBody: document.getElementById('bookBody'),
      holdBtn: document.getElementById('holdBtn'),
      castBtn: document.getElementById('castBtn'),
      gameOver: document.getElementById('gameOver'),
      goStats: document.getElementById('goStats'),
    };
    this.bannerTimer = null;
    this.bookTab = 'cons';
    this.buildSpellbook();
  }

  bind(game) {
    this.game = game;
    document.getElementById('shopToggle').addEventListener('click', () => {
      this.el.spellbook.classList.remove('open');
      this.el.shop.classList.toggle('open');
      if (this.el.shop.classList.contains('open')) this.refreshShop();
    });
    document.getElementById('shopClose').addEventListener('click', () => {
      this.el.shop.classList.remove('open');
    });
    document.getElementById('bookToggle').addEventListener('click', () => {
      this.el.shop.classList.remove('open');
      this.el.spellbook.classList.toggle('open');
    });
    document.getElementById('bookClose').addEventListener('click', () => {
      this.el.spellbook.classList.remove('open');
    });
    document.querySelectorAll('.book-tab').forEach((t) => {
      t.addEventListener('click', () => {
        document.querySelectorAll('.book-tab').forEach((x) => x.classList.remove('active'));
        t.classList.add('active');
        this.bookTab = t.dataset.tab;
        this.buildSpellbook();
      });
    });

    // Drawing controls
    this.el.holdBtn.addEventListener('click', () => game.beginHold());
    this.el.castBtn.addEventListener('click', () => game.castComposed());
    document.getElementById('clearBtn').addEventListener('click', () => game.clearCompose());

    // Pause: button + tapping the overlay resumes
    this.el.pauseToggle.addEventListener('click', () => game.togglePause());
    this.el.pauseOverlay.addEventListener('click', () => game.togglePause());

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

  setHold(on) {
    this.el.holdBtn.classList.toggle('active', on);
    this.el.holdBtn.textContent = on ? '✍️ 그리는 중…' : '✍️ 모아 그리기';
    this.el.castBtn.classList.toggle('ready', on);
  }

  setPaused(on) {
    this.el.pauseOverlay.classList.toggle('show', on);
    this.el.pauseToggle.textContent = on ? '▶' : '⏸';
  }

  buildSpellbook() {
    const body = this.el.bookBody;
    body.innerHTML = '';
    if (this.bookTab === 'cons') {
      for (const key of ATTACK_ORDER) {
        const a = ATTACKS[key];
        body.appendChild(rowEl(a.jamo, a.color, a.name, a.desc, `먹 ${a.manaCost}`, key));
      }
    } else if (this.bookTab === 'vow') {
      const note = document.createElement('p');
      note.className = 'book-note';
      note.textContent = '모음은 단독으로 쓸 수 없어요. 자음 뒤에 이어 그리면 마법의 형태가 바뀝니다.';
      body.appendChild(note);
      for (const key of VOWEL_ORDER) {
        const v = VOWELS[key];
        body.appendChild(rowEl(v.jamo, '#9fe3ff', v.name, v.desc, `+먹 ${v.manaCost}`));
      }
    } else {
      const note = document.createElement('p');
      note.className = 'book-note';
      note.innerHTML =
        '자음+모음(+받침)을 이어 그려 글자를 완성하세요. 글자가 길수록 강력!<br>' +
        '<b>쌍자음</b>: 같은 자음을 두 번 (ㄱㄱ=<b>ㄲ</b>) → 강화 마법.<br>' +
        '<b>복합 모음</b>: 모음을 이어서 (ㅗ+ㅏ=<b>ㅘ</b>, ㅏ+ㅣ=<b>ㅐ</b>).';
      body.appendChild(note);
      // each example: combined jamo ids (what gets cast) + a "draw this" hint
      const examples = [
        { j: ['giyeok', 'a'], draw: 'ㄱ + ㅏ' },
        { j: ['ggiyeok', 'a'], draw: 'ㄱ ㄱ + ㅏ (쌍)' },
        { j: ['siot', 'a', 'nieun'], draw: 'ㅅ + ㅏ + ㄴ' },
        { j: ['bieup', 'u', 'rieul'], draw: 'ㅂ + ㅜ + ㄹ' },
        { j: ['giyeok', 'eo', 'nieun'], draw: 'ㄱ + ㅓ + ㄴ' },
        { j: ['hieut', 'yeo', 'rieul'], draw: 'ㅎ + ㅕ + ㄹ' },
        { j: ['giyeok', 'wa'], draw: 'ㄱ + ㅗ ㅏ (ㅘ)' },
        { j: ['ieung', 'ui'], draw: 'ㅇ + ㅡ ㅣ (ㅢ)' },
      ];
      for (const ex of examples) {
        const char = composeSyllable(ex.j);
        const spell = buildSyllableSpell(ex.j);
        body.appendChild(rowEl(char, spell.color || '#fff', ex.draw, spell.name || '', `먹 ${spell.manaCost}`));
      }
    }
  }

  // flashRune kept as a safe no-op hook (the old on-screen rune bar is gone);
  // a matching spellbook row pulses if the book is open.
  flashRune(keyOrAtk) {
    if (!this.el.spellbook.classList.contains('open')) return;
    const key = typeof keyOrAtk === 'string'
      ? keyOrAtk
      : Object.keys(ATTACKS).find((k) => ATTACKS[k] === keyOrAtk);
    const el = this.el.bookBody.querySelector(`.book-row[data-key="${key}"]`);
    if (!el) return;
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  }

  banner(title, sub = '') {
    const b = this.el.banner;
    b.innerHTML = `<div class="banner-title">${title}</div>${sub ? `<div class="banner-sub">${sub}</div>` : ''}`;
    b.classList.add('show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => b.classList.remove('show'), 1800);
  }

  updateHUD(s, best, enemiesLeft = 0, lowInk = false) {
    this.el.wave.textContent = s.wave;
    this.el.gold.textContent = Math.floor(s.gold);
    this.el.score.textContent = s.score;
    this.el.best.textContent = best || 1;
    this.el.enemiesLeft.textContent = enemiesLeft;
    const gf = Math.max(0, s.gateHp / s.gateMax);
    this.el.gateFill.style.width = `${gf * 100}%`;
    this.el.gateFill.style.background = `hsl(${gf * 120}, 80%, 50%)`;
    this.el.gateText.textContent = `${Math.ceil(s.gateHp)}/${s.gateMax}`;
    const mf = s.mana / s.manaMax;
    this.el.manaFill.style.width = `${mf * 100}%`;
    this.el.manaText.textContent = `${Math.floor(s.mana)}/${s.manaMax}`;
    this.el.manaBar.classList.toggle('low', lowInk);
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

function rowEl(jamo, color, name, desc, cost, key = '') {
  const row = document.createElement('div');
  row.className = 'book-row';
  if (key) row.dataset.key = key;
  row.innerHTML =
    `<div class="book-jamo" style="color:${color}">${jamo}</div>` +
    `<div class="book-main"><div class="book-name">${name}</div>` +
    `<div class="book-desc">${desc}</div></div>` +
    (cost ? `<div class="book-cost">${cost}</div>` : '');
  return row;
}
