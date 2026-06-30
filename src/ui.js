// ui.js — DOM HUD, spellbook, shop, settings (themes + language), overlays.
import {
  ATTACKS, ATTACK_ORDER, VOWELS, VOWEL_ORDER,
  composeSyllable, buildSyllableSpell,
} from './attacks.js';
import { UPGRADES, UPGRADE_ORDER } from './upgrades.js';
import { t, getLang, setLang, localName } from './i18n.js';
import { Audio } from './audio.js';
import * as Prog from './progression.js';
import { paintGameOverSeal } from './art.js';

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
      tutorial: document.getElementById('tutorial'),
      tutCount: document.getElementById('tutCount'),
      tutTitle: document.getElementById('tutTitle'),
      tutDetail: document.getElementById('tutDetail'),
      banner: document.getElementById('banner'),
      shop: document.getElementById('shop'),
      spellbook: document.getElementById('spellbook'),
      settings: document.getElementById('settings'),
      bookBody: document.getElementById('bookBody'),
      holdBtn: document.getElementById('holdBtn'),
      castBtn: document.getElementById('castBtn'),
      gameOver: document.getElementById('gameOver'),
      goStats: document.getElementById('goStats'),
    };
    this.bannerTimer = null;
    this.bookTab = 'cons';
    this.shopTab = 'upgrade';
    this.buildSpellbook();
  }

  bind(game) {
    this.game = game;
    const closeDrawers = () => {
      this.el.shop.classList.remove('open');
      this.el.spellbook.classList.remove('open');
      this.el.settings.classList.remove('open');
    };
    const drawerToggle = (panel, after) => {
      const open = !panel.classList.contains('open');
      closeDrawers();
      panel.classList.toggle('open', open);
      if (open && after) after();
    };
    document.getElementById('shopToggle').addEventListener('click', () => drawerToggle(this.el.shop, () => this.refreshShop()));
    document.getElementById('shopClose').addEventListener('click', closeDrawers);
    document.querySelectorAll('.shop-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.shop-tab').forEach((x) => x.classList.remove('active'));
        tab.classList.add('active');
        this.shopTab = tab.dataset.stab;
        this.refreshShop();
      });
    });
    document.getElementById('bookToggle').addEventListener('click', () => drawerToggle(this.el.spellbook));
    document.getElementById('bookClose').addEventListener('click', closeDrawers);
    document.getElementById('settingsToggle').addEventListener('click', () => drawerToggle(this.el.settings, () => this.buildSettings()));
    document.getElementById('settingsClose').addEventListener('click', closeDrawers);

    document.querySelectorAll('.book-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.book-tab').forEach((x) => x.classList.remove('active'));
        tab.classList.add('active');
        this.bookTab = tab.dataset.tab;
        this.buildSpellbook();
      });
    });

    this.el.holdBtn.addEventListener('click', () => game.beginHold());
    this.el.castBtn.addEventListener('click', () => game.castComposed());
    document.getElementById('clearBtn').addEventListener('click', () => game.clearCompose());

    this.el.pauseToggle.addEventListener('click', () => game.togglePause());
    this.el.pauseOverlay.addEventListener('click', () => game.togglePause());
    document.getElementById('tutSkip').addEventListener('click', () => game.endTutorial(true));
    document.getElementById('restartBtn').addEventListener('click', () => game.restart());

    this.refreshShop();
    this.buildSettings();
  }

  // ---- i18n -----------------------------------------------------------------
  applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-html]').forEach((el) => {
      el.innerHTML = t(el.dataset.i18nHtml);
    });
    this.setHold(this.game ? this.game.holdMode : false);
    this.buildSpellbook();
    if (this.game) this.refreshShop();
  }

  // ---- settings (language + sound) ------------------------------------------
  buildSettings() {
    // language
    const langRow = document.getElementById('langRow');
    langRow.innerHTML = '';
    for (const [id, label] of [['ko', '한국어'], ['en', 'English']]) {
      const b = document.createElement('button');
      b.className = 'opt-btn' + (id === getLang() ? ' active' : '');
      b.textContent = label;
      b.addEventListener('click', () => {
        setLang(id);
        Audio.buy();
        this.applyI18n();
        this.buildSettings();
      });
      langRow.appendChild(b);
    }
    // sound + vibration toggles
    this.buildToggle('soundRow', Audio.isEnabled(), (on) => Audio.setEnabled(on));
    this.buildToggle('vibRow', this.game ? this.game.haptic : true, (on) => { if (this.game) this.game.haptic = on; });
  }

  buildToggle(rowId, state, onChange) {
    const row = document.getElementById(rowId);
    row.innerHTML = '';
    for (const [val, key] of [[true, 'set.on'], [false, 'set.off']]) {
      const b = document.createElement('button');
      b.className = 'opt-btn' + (state === val ? ' active' : '');
      b.textContent = t(key);
      b.addEventListener('click', () => {
        onChange(val);
        Audio.unlock();
        this.buildSettings();
      });
      row.appendChild(b);
    }
  }

  setHold(on) {
    this.el.holdBtn.classList.toggle('active', on);
    const label = this.el.holdBtn.querySelector('span');
    if (label) label.textContent = on ? t('btn.holding') : t('btn.hold');
    this.el.castBtn.classList.toggle('ready', on);
  }

  setPaused(on) {
    this.el.pauseOverlay.classList.toggle('show', on);
    const icon = document.getElementById('pauseIcon');
    if (icon) icon.setAttribute('href', on ? '#ic-play' : '#ic-pause');
  }

  showTutorial(step, idx, total) {
    this.el.tutCount.textContent = t('tut.practice', { n: idx + 1, m: total });
    this.el.tutTitle.textContent = step.title;
    this.el.tutDetail.textContent = step.detail;
    this.el.tutorial.classList.add('show');
  }

  hideTutorial() { this.el.tutorial.classList.remove('show'); }

  buildSpellbook() {
    const body = this.el.bookBody;
    body.innerHTML = '';
    if (this.bookTab === 'cons') {
      for (const key of ATTACK_ORDER) {
        const a = ATTACKS[key];
        body.appendChild(rowEl(a.jamo, a.color, localName(a), localDesc(a), `${t('bar.ink')} ${a.manaCost}`, key, !Prog.isUnlocked(key)));
      }
    } else if (this.bookTab === 'vow') {
      body.appendChild(noteEl(t('book.vowNote')));
      for (const key of VOWEL_ORDER) {
        const v = VOWELS[key];
        body.appendChild(rowEl(v.jamo, 'var(--ink)', localName(v), localDesc(v), `+${t('bar.ink')} ${v.manaCost}`, '', !Prog.compoundUnlocked(key)));
      }
    } else {
      body.appendChild(noteEl(t('book.comboNote')));
      const examples = [
        { j: ['giyeok', 'a'], draw: 'ㄱ + ㅏ' },
        { j: ['ggiyeok', 'a'], draw: 'ㄱ ㄱ + ㅏ' },
        { j: ['siot', 'a', 'nieun'], draw: 'ㅅ + ㅏ + ㄴ' },
        { j: ['bieup', 'u', 'rieul'], draw: 'ㅂ + ㅜ + ㄹ' },
        { j: ['giyeok', 'eo', 'nieun'], draw: 'ㄱ + ㅓ + ㄴ' },
        { j: ['hieut', 'yeo', 'rieul'], draw: 'ㅎ + ㅕ + ㄹ' },
        { j: ['giyeok', 'wa'], draw: 'ㄱ + ㅗ ㅏ' },
        { j: ['ieung', 'ui'], draw: 'ㅇ + ㅡ ㅣ' },
      ];
      for (const ex of examples) {
        const spell = buildSyllableSpell(ex.j);
        body.appendChild(rowEl(composeSyllable(ex.j), spell.color || 'var(--ink)', ex.draw, spell.name || '', `${t('bar.ink')} ${spell.manaCost}`));
      }
    }
  }

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
    this.el.gateFill.style.background = `hsl(${gf * 120}, 44%, 46%)`;
    this.el.gateText.textContent = `${Math.ceil(s.gateHp)}/${s.gateMax}`;
    const mf = s.mana / s.manaMax;
    this.el.manaFill.style.width = `${mf * 100}%`;
    this.el.manaText.textContent = `${Math.floor(s.mana)}/${s.manaMax}`;
    this.el.manaBar.classList.toggle('low', lowInk);
    if (this.el.shop.classList.contains('open')) this.updateShopAffordability();
  }

  refreshShop() {
    if (!this.game) return;
    const list = document.getElementById('shopList');
    const summon = document.getElementById('summonBody');
    const hint = document.getElementById('shopHint');
    const isSummon = this.shopTab === 'summon';
    list.style.display = isSummon ? 'none' : 'flex';
    summon.style.display = isSummon ? 'block' : 'none';
    hint.textContent = isSummon ? t('sum.hint') : t('shop.hint');
    if (isSummon) { this.buildSummon(); return; }
    const g = this.game;
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
        `<div class="si-icon"><svg class="ic"><use href="#${meta.icon}"/></svg></div>` +
        `<div class="si-main"><div class="si-name">${localName(meta)} <span class="si-lvl">Lv.${lvl}</span></div>` +
        `<div class="si-desc">${localDesc(meta)}</div></div>` +
        `<div class="si-cost"><svg class="ic xs"><use href="#ic-coin"/></svg>${cost}</div>`;
      row.addEventListener('click', () => { if (g.buyUpgrade(key)) this.refreshShop(); });
      list.appendChild(row);
    }
    this.updateShopAffordability();
  }

  updateShopAffordability() {
    const g = this.game;
    document.querySelectorAll('.shop-item').forEach((row) => {
      row.classList.toggle('afford', g.state.gold >= Number(row.dataset.cost));
    });
  }

  buildSummon() {
    const body = document.getElementById('summonBody');
    const g = this.game;
    const lvl = Prog.getLevel();
    const xp = Prog.getXp();
    const need = Prog.xpToNext(lvl);
    const xpPct = Math.min(100, (xp / need) * 100);
    const got = Prog.unlockedCount();
    const can = Prog.canPull();
    const cost = Prog.gachaCost();
    const afford = g.state.gold >= cost;

    body.innerHTML =
      `<div class="sum-level"><span>${t('sum.level')} <b>${lvl}</b></span><span>${xp}/${need} XP</span></div>` +
      `<div class="sum-xp"><div class="sum-xp-fill" style="width:${xpPct}%"></div></div>` +
      `<div class="sum-collect">${t('sum.collection')} <b>${got}/${Prog.TOTAL}</b></div>` +
      (can
        ? `<button id="pullBtn" class="big-btn sum-pull${afford ? '' : ' disabled'}">${t('sum.pull')} · <svg class="ic xs"><use href="#ic-coin"/></svg>${cost}</button>`
        : `<div class="sum-done">${t('sum.allUnlocked')}</div>`) +
      '<div id="sumGrid" class="sum-grid"></div>';

    // collection grid (locked jamo dimmed)
    const grid = body.querySelector('#sumGrid');
    for (const id of Prog.ALL_UNLOCKABLE) {
      const a = ATTACKS[id] || VOWELS[id];
      const cell = document.createElement('div');
      cell.className = 'sum-cell' + (Prog.isUnlocked(id) ? '' : ' locked');
      cell.textContent = a ? a.jamo : '';
      grid.appendChild(cell);
    }

    const btn = body.querySelector('#pullBtn');
    if (btn) btn.addEventListener('click', () => {
      const res = g.buyGacha();
      if (res && res.id) this.flashUnlock(res.id);
      this.buildSummon();
    });
  }

  flashUnlock() { /* visual handled on canvas; rebuild refreshes the grid */ }

  showGameOver(s, best, bestCombo = 0) {
    this.el.goStats.innerHTML = t('go.stats', {
      wave: s.wave, score: s.score, kills: s.kills, combo: bestCombo, best: best || s.wave,
    });
    paintGameOverSeal();
    this.el.gameOver.classList.add('show');
  }

  hideGameOver() { this.el.gameOver.classList.remove('show'); }
}

function localDesc(obj) {
  return getLang() === 'en' && obj.descEn ? obj.descEn : obj.desc;
}

function noteEl(html) {
  const p = document.createElement('p');
  p.className = 'book-note';
  p.innerHTML = html;
  return p;
}

function rowEl(jamo, color, name, desc, cost, key = '', locked = false) {
  const row = document.createElement('div');
  row.className = 'book-row' + (locked ? ' locked' : '');
  if (key) row.dataset.key = key;
  row.innerHTML =
    `<div class="book-jamo" style="color:${color}">${jamo}</div>` +
    `<div class="book-main"><div class="book-name">${name}</div>` +
    `<div class="book-desc">${desc || ''}</div></div>` +
    (locked ? '<div class="book-cost lock"><svg class="ic"><use href="#ic-lock"/></svg></div>' : (cost ? `<div class="book-cost">${cost}</div>` : ''));
  return row;
}
