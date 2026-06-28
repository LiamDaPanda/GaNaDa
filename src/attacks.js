// attacks.js
// Each recognized jamo maps to a spell. Harder-to-draw letters cost more
// mana ("먹" / ink) and hit harder. Tuned so the simple ㅅ fireball is your
// bread-and-butter and the ㄹ dragon's-breath is a screen-clearing ultimate.

export const ATTACKS = {
  siot: {
    jamo: 'ㅅ',
    name: '화염탄',
    nameEn: 'Fire Bolt',
    element: 'fire',
    color: '#ff7b3d',
    glow: '#ffd08a',
    manaCost: 12,
    baseDamage: 26,
    radius: 70,
    kind: 'projectile', // travels to nearest enemy then explodes
    burn: { dps: 8, duration: 2.5 },
    desc: '단일 대상에 폭발 + 화상',
  },
  giyeok: {
    jamo: 'ㄱ',
    name: '번개',
    nameEn: 'Chain Lightning',
    element: 'lightning',
    color: '#7fd4ff',
    glow: '#e6f7ff',
    manaCost: 20,
    baseDamage: 22,
    radius: 0,
    kind: 'chain', // arcs between up to `chains` enemies
    chains: 4,
    desc: '여러 적에게 연쇄 피해',
  },
  nieun: {
    jamo: 'ㄴ',
    name: '대지가르기',
    nameEn: 'Earth Slam',
    element: 'earth',
    color: '#b6e36b',
    glow: '#f0ffd0',
    manaCost: 24,
    baseDamage: 34,
    radius: 150,
    kind: 'aoe', // slams the front line, knocks back
    knockback: 60,
    desc: '전방 광역 피해 + 넉백',
  },
  ieung: {
    jamo: 'ㅇ',
    name: '수호의 빛',
    nameEn: 'Guardian Nova',
    element: 'holy',
    color: '#ffe27a',
    glow: '#fff6d6',
    manaCost: 26,
    baseDamage: 18,
    radius: 220,
    kind: 'nova', // damages everything + repairs the gate
    heal: 14,
    desc: '전체 피해 + 성문 수리',
  },
  mieum: {
    jamo: 'ㅁ',
    name: '서리감옥',
    nameEn: 'Frost Prison',
    element: 'ice',
    color: '#8fe9ff',
    glow: '#dffaff',
    manaCost: 28,
    baseDamage: 20,
    radius: 200,
    kind: 'aoe',
    freeze: { slow: 0.35, duration: 3.0 }, // multiply speed by slow
    desc: '광역 피해 + 둔화(빙결)',
  },
  digeut: {
    jamo: 'ㄷ',
    name: '독안개',
    nameEn: 'Poison Mist',
    element: 'poison',
    color: '#9ed64f',
    glow: '#eaffc0',
    manaCost: 22,
    baseDamage: 18,
    radius: 165,
    kind: 'aoe',
    burn: { dps: 12, duration: 3.5 }, // "poison" reuses the damage-over-time path
    desc: '광역 피해 + 중독(지속 피해)',
  },
  bieup: {
    jamo: 'ㅂ',
    name: '물대포',
    nameEn: 'Water Cannon',
    element: 'water',
    color: '#4fb0e8',
    glow: '#cdeeff',
    manaCost: 18,
    baseDamage: 30,
    radius: 95,
    kind: 'projectile',
    knockback: 55,
    desc: '단일 폭발 + 강한 넉백',
  },
  jieut: {
    jamo: 'ㅈ',
    name: '질풍참',
    nameEn: 'Gale Slash',
    element: 'wind',
    color: '#7fe3c0',
    glow: '#dffff4',
    manaCost: 16,
    baseDamage: 28,
    radius: 80,
    kind: 'lance',
    knockback: 40,
    desc: '전방 베기 + 넉백',
  },
  chieut: {
    jamo: 'ㅊ',
    name: '회오리',
    nameEn: 'Tornado',
    element: 'wind',
    color: '#8fe0d0',
    glow: '#e6fff8',
    manaCost: 26,
    baseDamage: 26,
    radius: 170,
    kind: 'aoe',
    knockback: 50,
    desc: '광역 회오리 + 넉백',
  },
  kieuk: {
    jamo: 'ㅋ',
    name: '암흑탄',
    nameEn: 'Dark Bolt',
    element: 'shadow',
    color: '#a06fd6',
    glow: '#e8d6ff',
    manaCost: 22,
    baseDamage: 40,
    radius: 90,
    kind: 'projectile',
    desc: '고위력 단일 폭발',
  },
  tieut: {
    jamo: 'ㅌ',
    name: '빛기둥',
    nameEn: 'Light Pillar',
    element: 'light',
    color: '#ffe9a0',
    glow: '#fffae0',
    manaCost: 26,
    baseDamage: 22,
    radius: 1,
    kind: 'rain',
    count: 5,
    desc: '하늘에서 떨어지는 빛기둥',
  },
  pieup: {
    jamo: 'ㅍ',
    name: '폭풍',
    nameEn: 'Tempest',
    element: 'wind',
    color: '#9fd8e8',
    glow: '#eaf8ff',
    manaCost: 30,
    baseDamage: 30,
    radius: 999,
    kind: 'sweep',
    knockback: 30,
    desc: '진로를 휩쓰는 폭풍',
  },
  hieut: {
    jamo: 'ㅎ',
    name: '태양폭발',
    nameEn: 'Solar Flare',
    element: 'sun',
    color: '#ffd23d',
    glow: '#fff3c4',
    manaCost: 34,
    baseDamage: 30,
    radius: 230,
    kind: 'nova',
    heal: 16,
    desc: '전체 피해 + 성문 수리',
  },
  rieul: {
    jamo: 'ㄹ',
    name: '용의 숨결',
    nameEn: "Dragon's Breath",
    element: 'arcane',
    color: '#c89bff',
    glow: '#f1e4ff',
    manaCost: 45,
    baseDamage: 60,
    radius: 999,
    kind: 'beam', // sweeps the whole field — ultimate
    burn: { dps: 16, duration: 3.0 },
    desc: '전 화면 강타 (궁극기)',
  },
};

export const ATTACK_ORDER = [
  'giyeok', 'nieun', 'digeut', 'rieul', 'mieum', 'bieup', 'siot',
  'ieung', 'jieut', 'chieut', 'kieuk', 'tieut', 'pieup', 'hieut',
];

// --- Vowels (중성). A vowel can't be cast alone — it *shapes* the consonant's
// element into a combined syllable spell (e.g. ㄱ + ㅏ = 가). Each vowel sets
// the spell's delivery: a forward lance, falling rain, a meteor, a wave, etc.
export const VOWELS = {
  a: { // ㅏ — tick points right → a forward lance
    jamo: 'ㅏ', name: '창', kind: 'lance', dmgMul: 2.0, manaCost: 10, radiusMul: 1,
    desc: '전방 관통 창',
  },
  eo: { // ㅓ — tick points left → a wide swirling burst
    jamo: 'ㅓ', name: '소용돌이', kind: 'aoe', dmgMul: 1.8, manaCost: 10, radiusMul: 1.7,
    desc: '넓은 광역 폭발',
  },
  o: { // ㅗ — tick points up → rain from the sky
    jamo: 'ㅗ', name: '비', kind: 'rain', dmgMul: 1.5, manaCost: 12, radiusMul: 1, count: 6,
    desc: '하늘에서 쏟아지는 세례',
  },
  u: { // ㅜ — tick points down → a crashing meteor
    jamo: 'ㅜ', name: '운석', kind: 'meteor', dmgMul: 2.6, manaCost: 14, radiusMul: 1.9,
    desc: '거대 운석 강타',
  },
  eu: { // ㅡ — horizontal line → a sweeping wave
    jamo: 'ㅡ', name: '파동', kind: 'sweep', dmgMul: 2.0, manaCost: 12, radiusMul: 1,
    desc: '진로를 휩쓰는 파동',
  },
  i: { // ㅣ — vertical line → a piercing spear
    jamo: 'ㅣ', name: '관통', kind: 'lance', dmgMul: 2.3, manaCost: 11, radiusMul: 1,
    desc: '강력한 관통 일격',
  },
  // Iotized vowels (two ticks) = stronger "double" versions of their base.
  ya: { // ㅑ — twin lance
    jamo: 'ㅑ', name: '쌍창', kind: 'lance', dmgMul: 2.7, manaCost: 16, radiusMul: 1,
    desc: '전방 강화 관통 (강)',
  },
  yeo: { // ㅕ — greater swirl
    jamo: 'ㅕ', name: '대소용돌이', kind: 'aoe', dmgMul: 2.4, manaCost: 16, radiusMul: 2.1,
    desc: '초대형 광역 폭발 (강)',
  },
  yo: { // ㅛ — downpour
    jamo: 'ㅛ', name: '폭우', kind: 'rain', dmgMul: 1.8, manaCost: 18, radiusMul: 1, count: 10,
    desc: '하늘에서 쏟아지는 폭우 (강)',
  },
  yu: { // ㅠ — meteor shower
    jamo: 'ㅠ', name: '운석우', kind: 'meteor', dmgMul: 3.3, manaCost: 20, radiusMul: 2.1,
    desc: '초대형 운석 강타 (강)',
  },
  // Compound vowels (복합 모음) — drawn by combining two vowels (ㅏ+ㅣ=ㅐ,
  // ㅗ+ㅏ=ㅘ …). They are the strongest delivery shapes.
  ae: { jamo: 'ㅐ', name: '겹창', kind: 'lance', dmgMul: 2.6, manaCost: 16, radiusMul: 1, desc: 'ㅏ+ㅣ · 강화 관통' },
  yae: { jamo: 'ㅒ', name: '삼중창', kind: 'lance', dmgMul: 3.1, manaCost: 20, radiusMul: 1, desc: 'ㅑ+ㅣ · 초강화 관통' },
  e: { jamo: 'ㅔ', name: '겹소용돌이', kind: 'aoe', dmgMul: 2.2, manaCost: 16, radiusMul: 1.9, desc: 'ㅓ+ㅣ · 광역 폭발' },
  ye: { jamo: 'ㅖ', name: '삼중소용돌이', kind: 'aoe', dmgMul: 2.7, manaCost: 20, radiusMul: 2.2, desc: 'ㅕ+ㅣ · 초광역 폭발' },
  wa: { jamo: 'ㅘ', name: '폭풍운석', kind: 'meteor', dmgMul: 2.9, manaCost: 20, radiusMul: 1.9, desc: 'ㅗ+ㅏ · 폭풍 운석' },
  wae: { jamo: 'ㅙ', name: '대폭풍운석', kind: 'meteor', dmgMul: 3.4, manaCost: 24, radiusMul: 2.1, desc: 'ㅘ+ㅣ · 초대형 운석' },
  oe: { jamo: 'ㅚ', name: '회전우', kind: 'rain', dmgMul: 1.9, manaCost: 18, radiusMul: 1, count: 9, desc: 'ㅗ+ㅣ · 회전 폭우' },
  wo: { jamo: 'ㅝ', name: '심연운석', kind: 'meteor', dmgMul: 3.1, manaCost: 22, radiusMul: 2.0, desc: 'ㅜ+ㅓ · 심연 운석' },
  we: { jamo: 'ㅞ', name: '대심연운석', kind: 'meteor', dmgMul: 3.5, manaCost: 26, radiusMul: 2.2, desc: 'ㅝ+ㅣ · 초대형 운석' },
  wi: { jamo: 'ㅟ', name: '나선운석', kind: 'meteor', dmgMul: 2.8, manaCost: 20, radiusMul: 1.9, desc: 'ㅜ+ㅣ · 나선 운석' },
  ui: { jamo: 'ㅢ', name: '현파동', kind: 'sweep', dmgMul: 2.4, manaCost: 18, radiusMul: 1, desc: 'ㅡ+ㅣ · 강화 파동' },
};

export const VOWEL_ORDER = [
  'a', 'ya', 'eo', 'yeo', 'o', 'yo', 'u', 'yu', 'eu', 'i',
  'ae', 'yae', 'e', 'ye', 'wa', 'wae', 'oe', 'wo', 'we', 'wi', 'ui',
];

// Doubled consonants (쌍자음) — drawn by repeating the consonant (ㄱㄱ=ㄲ).
// Each is a powered-up version of its base consonant's spell.
export const DOUBLE_OF = { giyeok: 'ggiyeok', digeut: 'ddigeut', bieup: 'bbieup', siot: 'ssiot', jieut: 'jjieut' };
export const BASE_OF = { ggiyeok: 'giyeok', ddigeut: 'digeut', bbieup: 'bieup', ssiot: 'siot', jjieut: 'jieut' };
const DOUBLE_JAMO = { ggiyeok: 'ㄲ', ddigeut: 'ㄸ', bbieup: 'ㅃ', ssiot: 'ㅆ', jjieut: 'ㅉ' };
const DOUBLE_MUL = 1.6;   // damage multiplier for a doubled consonant
const DOUBLE_MANA = 1.4;  // mana multiplier

// Compound-vowel combine table: current jung + added base vowel → compound.
// Two-step compounds (ㅙ=ㅘ+ㅣ, ㅞ=ㅝ+ㅣ) chain naturally.
export const COMBINE_VOWEL = {
  'a,i': 'ae', 'ya,i': 'yae', 'eo,i': 'e', 'yeo,i': 'ye',
  'o,a': 'wa', 'o,i': 'oe', 'wa,i': 'wae',
  'u,eo': 'wo', 'u,i': 'wi', 'wo,i': 'we',
  'eu,i': 'ui',
};

// Korean element display names (for composed spell labels).
export const ELEMENT_NAME = {
  fire: '화염', lightning: '번개', earth: '대지', poison: '독',
  water: '물', holy: '빛', ice: '서리', arcane: '용',
  wind: '바람', shadow: '암흑', light: '섬광', sun: '태양',
};

// --- Hangul composition: build the precomposed syllable character so the HUD
// can show "가" assembling in real time. Indices follow Unicode U+AC00 rules.
const CHO_INDEX = {
  giyeok: 0, ggiyeok: 1, nieun: 2, digeut: 3, ddigeut: 4, rieul: 5, mieum: 6,
  bieup: 7, bbieup: 8, siot: 9, ssiot: 10, ieung: 11, jieut: 12, jjieut: 13,
  chieut: 14, kieuk: 15, tieut: 16, pieup: 17, hieut: 18,
};
const JUNG_INDEX = {
  a: 0, ae: 1, ya: 2, yae: 3, eo: 4, e: 5, yeo: 6, ye: 7, o: 8, wa: 9, wae: 10,
  oe: 11, yo: 12, u: 13, wo: 14, we: 15, wi: 16, yu: 17, eu: 18, ui: 19, i: 20,
};
const JONG_INDEX = {
  giyeok: 1, ggiyeok: 2, nieun: 4, digeut: 7, rieul: 8, mieum: 16, bieup: 17,
  siot: 19, ssiot: 20, ieung: 21, jieut: 22, chieut: 23, kieuk: 24, tieut: 25,
  pieup: 26, hieut: 27,
};

// Display glyph for any jamo id (base, doubled, or compound).
export function jamoChar(id) {
  if (ATTACKS[id]) return ATTACKS[id].jamo;
  if (VOWELS[id]) return VOWELS[id].jamo;
  if (DOUBLE_JAMO[id]) return DOUBLE_JAMO[id];
  return '';
}

export function composeSyllable(jamos) {
  if (jamos.length === 0) return '';
  const cho = CHO_INDEX[jamos[0]];
  if (cho == null) return jamoChar(jamos[0]);
  if (jamos.length === 1) return jamoChar(jamos[0]);
  const jung = JUNG_INDEX[jamos[1]];
  if (jung == null) return jamoChar(jamos[0]);
  const jong = jamos.length >= 3 ? (JONG_INDEX[jamos[2]] ?? 0) : 0;
  return String.fromCharCode(0xac00 + (cho * 21 + jung) * 28 + jong);
}

// A few iconic syllables get a bespoke name and a power bump (easter eggs).
// Keyed by the composed character.
export const NAMED_SYLLABLES = {
  '불': { name: '지옥불', element: 'fire', bonus: 1.4 },   // ㅂㅜㄹ = "fire"
  '물': { name: '해일', element: 'water', bonus: 1.4 },    // ㅁㅜㄹ = "water"
  '산': { name: '산사태', element: 'earth', bonus: 1.35 }, // ㅅㅏㄴ = "mountain"
  '강': { name: '급류', element: 'water', bonus: 1.3 },    // ㄱㅏㅇ = "river"
  '빛': { name: '천벌', element: 'holy', bonus: 1.4 },     // ㅂㅣㅊ-ish light
  '가': { name: '낙뢰참', bonus: 1.2 },                    // your example, ㄱㅏ
};

// Resolve a consonant id (possibly doubled) to its base spell + power factors.
function resolveConsonant(id) {
  const base = BASE_OF[id] || id;
  const atk = ATTACKS[base];
  if (!atk) return null;
  const doubled = !!BASE_OF[id];
  return { atk, doubled, dmgK: doubled ? DOUBLE_MUL : 1, manaK: doubled ? DOUBLE_MANA : 1 };
}

// Build a castable spell object from a sequence of jamo ids.
// 1 jamo  → basic consonant spell (doubled = a stronger version).
// 2 jamo  → consonant element shaped by the vowel (a syllable).
// 3 jamo  → 받침 fusion: a screen-shaking ultimate.
export function buildSyllableSpell(jamos) {
  const cInfo = resolveConsonant(jamos[0]);
  if (!cInfo) return null;
  const C = cInfo.atk;

  if (jamos.length === 1) {
    if (!cInfo.doubled) return C;
    // a lone doubled consonant: a powered-up version of the base spell
    return {
      ...C, composed: true, char: jamoChar(jamos[0]), jamo: jamoChar(jamos[0]),
      jamos: jamos.slice(), name: `${jamoChar(jamos[0])} · 쌍${C.name}`,
      manaCost: Math.round(C.manaCost * cInfo.manaK), baseDamage: C.baseDamage * cInfo.dmgK,
    };
  }

  const V = VOWELS[jamos[1]];
  if (!V) return C;

  const char = composeSyllable(jamos);
  const elName = ELEMENT_NAME[C.element] || C.name;
  const isUltimate = jamos.length >= 3;
  const c2Info = isUltimate ? resolveConsonant(jamos[2]) : null;
  const C2 = c2Info ? c2Info.atk : null;

  let dmgMul = V.dmgMul;
  let manaCost = Math.round(C.manaCost * cInfo.manaK) + V.manaCost;
  let kind = V.kind;
  let radius = (C.radius || 120) * V.radiusMul;

  if (isUltimate && C2) {
    // Third jamo (받침) fuses both consonants into a field-wide ultimate.
    dmgMul = V.dmgMul + 2.0;
    manaCost = Math.round(C.manaCost * cInfo.manaK) + V.manaCost
      + Math.round(C2.manaCost * c2Info.manaK) + 8;
    kind = 'ultimate';
    radius = 999;
  }

  const spell = {
    composed: true,
    char,
    jamos: jamos.slice(),
    jamo: char,
    name: `${char} · ${elName}${V.name}`,
    element: C.element,
    color: C.color,
    glow: C.glow,
    manaCost,
    baseDamage: C.baseDamage * cInfo.dmgK * dmgMul,
    radius,
    kind,
    knockback: C.knockback,
    burn: C.burn,
    freeze: C.freeze,
    heal: C.element === 'holy' ? 18 : 0,
    count: V.count,
  };

  if (C2) {
    // carry the second consonant's signature effect into the fusion
    spell.burn = spell.burn || C2.burn;
    spell.freeze = spell.freeze || C2.freeze;
    spell.knockback = spell.knockback || C2.knockback;
  }

  const named = NAMED_SYLLABLES[char];
  if (named) {
    spell.baseDamage *= named.bonus;
    if (named.name) spell.name = `${char} · ${named.name}`;
    if (named.element) spell.element = named.element;
  }

  return spell;
}

// What category does the recognizer expect at each position of a syllable?
export function expectedCategory(position) {
  return position === 1 ? 'vowel' : 'consonant';
}
