// themes.js — selectable art styles. Each theme is a palette + render flags
// the canvas (render.js / game.js) and the CSS variables read from.

function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(r, g, b) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${((1 << 24) + (c(r) << 16) + (c(g) << 8) + c(b)).toString(16).slice(1)}`;
}
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  const d = max - min;
  if (d) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h * 360, s, l];
}
function hslToRgb(h, s, l) {
  h /= 360;
  const hue = (p, q, t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r, g, b;
  if (s === 0) { r = g = b = l; } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue(p, q, h + 1 / 3); g = hue(p, q, h); b = hue(p, q, h - 1 / 3);
  }
  return [r * 255, g * 255, b * 255];
}
// Adjust a hex colour by deltas: saturation (0..1), lightness (0..1), hue (deg).
export function adjust(hex, ds = 0, dl = 0, dh = 0) {
  if (!hex || hex[0] !== '#' || hex.length < 7) return hex;
  let [h, s, l] = rgbToHsl(...hexToRgb(hex));
  h = (h + dh + 360) % 360;
  s = Math.max(0, Math.min(1, s + ds));
  l = Math.max(0, Math.min(1, l + dl));
  return rgbToHex(...hslToRgb(h, s, l));
}

export const THEMES = {
  calligraphy: {
    id: 'calligraphy', name: '먹빛', nameEn: 'Calligraphy', style: 'sumi',
    sky: [[0, '#0d1124'], [0.5, '#161a30'], [0.78, '#1b1d2c'], [1, '#100b1a']],
    star: '#efe6cf',
    moon: { core: '#fbf5e3', edge: '#e3d7b4', halo: 'rgba(239,230,207,0.26)', ring: null },
    ridge: ['#1b1f38', '#232845', '#2b3056'],
    crest: 'rgba(12,12,24,0.55)',
    ground: ['rgba(40,32,54,0.96)', '#0d0a16'],
    mist: '#cdd7ee',
    taegeuk: ['#9c3b34', '#345877'],
    glow: 0.4, additive: false,
    stroke: {
      bleed: 'rgba(225,216,193,0.18)', bleedShadow: 'rgba(232,224,200,0.5)', bleedBlur: 6,
      body: 'rgba(238,231,210,0.92)', core: 'rgba(150,140,118,0.5)', head: '#efe7d2',
    },
    fx: (c) => c,
    ui: { ink: '#9aa7b8', gold: '#c79a3e', panel: 'rgba(20,17,28,0.93)', line: 'rgba(220,210,188,0.14)', text: '#f3eefc' },
  },

  cyberpunk: {
    id: 'cyberpunk', name: '네온', nameEn: 'Cyberpunk', style: 'neon',
    sky: [[0, '#08030f'], [0.45, '#190a30'], [0.72, '#33103f'], [1, '#05020c']],
    star: '#7df9ff',
    moon: { core: '#ff4fb0', edge: '#7a1f6a', halo: 'rgba(255,60,160,0.30)', ring: '#19d3ff' },
    ridge: ['#160a2c', '#21103e', '#2c1550'],
    crest: '#ff3cac',
    ground: ['#0c0820', '#05030d'],
    mist: '#2bd6ff',
    taegeuk: ['#ff3cac', '#19d3ff'],
    glow: 1.25, additive: true,
    stroke: {
      bleed: 'rgba(25,211,255,0.5)', bleedShadow: '#19d3ff', bleedBlur: 22,
      body: 'rgba(190,255,255,0.95)', core: 'rgba(255,60,172,0.7)', head: '#d8ffff',
    },
    fx: (c) => adjust(c, 0.45, 0.16),
    ui: { ink: '#19d3ff', gold: '#ff3cac', panel: 'rgba(10,6,22,0.92)', line: 'rgba(120,255,255,0.20)', text: '#eafcff' },
  },

  ancient: {
    id: 'ancient', name: '고대', nameEn: 'Ancient', style: 'stone',
    sky: [[0, '#241430'], [0.4, '#5e2f2a'], [0.66, '#9c5a32'], [0.86, '#c98a4a'], [1, '#6e4026']],
    star: '#ffe6b8',
    moon: { core: '#ffd98a', edge: '#dd8a3e', halo: 'rgba(255,180,90,0.30)', ring: null },
    ridge: ['#3a261e', '#4c3324', '#5e4030'],
    crest: 'rgba(30,18,10,0.5)',
    ground: ['#6a4a32', '#2c1c12'],
    mist: '#e6c79a',
    taegeuk: ['#a85a32', '#caa14a'],
    glow: 0.5, additive: false,
    stroke: {
      bleed: 'rgba(40,22,10,0.4)', bleedShadow: 'rgba(30,16,6,0.85)', bleedBlur: 7,
      body: 'rgba(247,228,186,0.93)', core: 'rgba(120,70,34,0.7)', head: '#f3e2b6',
    },
    fx: (c) => adjust(c, -0.04, 0.04, 10),
    ui: { ink: '#d6a45a', gold: '#caa14a', panel: 'rgba(28,18,14,0.93)', line: 'rgba(220,180,120,0.18)', text: '#f5ead6' },
  },
};

export const THEME_ORDER = ['calligraphy', 'cyberpunk', 'ancient'];

let current = 'calligraphy';
try {
  const saved = localStorage.getItem('ganada_theme');
  if (saved && THEMES[saved]) current = saved;
} catch (e) { /* ignore */ }

export function getTheme() { return THEMES[current]; }
export function getThemeId() { return current; }

export function setTheme(id) {
  if (!THEMES[id]) return;
  current = id;
  try { localStorage.setItem('ganada_theme', id); } catch (e) { /* ignore */ }
  applyThemeCSS();
}

// Push the theme's UI colours into CSS custom properties.
export function applyThemeCSS() {
  const t = THEMES[current];
  const r = document.documentElement.style;
  r.setProperty('--ink', t.ui.ink);
  r.setProperty('--gold', t.ui.gold);
  r.setProperty('--panel', t.ui.panel);
  r.setProperty('--panel-line', t.ui.line);
  r.setProperty('--text', t.ui.text);
  document.body && (document.body.dataset.theme = current);
}
