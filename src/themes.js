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

// Map any colour onto an ink → plum → rice-paper duotone (by luminance) so the
// art and spell effects read as warm, pink-tinted sumi-e.
export function tintPlum(hex) {
  if (!hex || hex[0] !== '#' || hex.length < 7) return hex;
  const [r, g, b] = hexToRgb(hex);
  const l = Math.min(1, (0.299 * r + 0.587 * g + 0.114 * b) / 255);
  const dark = [40, 28, 34], mid = [162, 96, 126], paper = [247, 214, 226];
  const lerp = (a, c, t) => a + (c - a) * t;
  let R, G, B;
  if (l < 0.5) { const t = l / 0.5; R = lerp(dark[0], mid[0], t); G = lerp(dark[1], mid[1], t); B = lerp(dark[2], mid[2], t); }
  else { const t = (l - 0.5) / 0.5; R = lerp(mid[0], paper[0], t); G = lerp(mid[1], paper[1], t); B = lerp(mid[2], paper[2], t); }
  return rgbToHex(R, G, B);
}

export const THEMES = {
  calligraphy: {
    id: 'calligraphy', name: '먹빛', nameEn: 'Calligraphy', style: 'sumi',
    // warm tea-stained rice-paper night
    sky: [[0, '#241c14'], [0.5, '#2b2318'], [0.78, '#262013'], [1, '#19130c']],
    star: '#e6d8ba',
    moon: { core: '#f1e6cb', edge: '#cab88a', halo: 'rgba(228,208,168,0.22)', ring: null },
    ridge: ['#2a2316', '#332a1b', '#3d3120'],
    crest: 'rgba(18,12,7,0.5)',
    ground: ['rgba(46,36,22,0.96)', '#120d06'],
    mist: '#dcc9a6',
    taegeuk: ['#b0566f', '#7a5340'],
    glow: 0.6, additive: false,
    stroke: {
      bleed: 'rgba(225,216,193,0.18)', bleedShadow: 'rgba(232,224,200,0.5)', bleedBlur: 6,
      body: 'rgba(238,231,210,0.92)', core: 'rgba(150,140,118,0.5)', head: '#efe7d2',
    },
    // plum duotone: spell effects and creatures read pink-tinted on warm paper
    fx: (c) => tintPlum(c),
    ui: { ink: '#c08aa0', gold: '#cf7e9e', panel: 'rgba(26,18,16,0.93)', line: 'rgba(222,196,180,0.16)', text: '#f4e9e2' },
  },

};

export const THEME_ORDER = ['calligraphy'];

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
