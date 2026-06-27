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

export const ATTACK_ORDER = ['siot', 'giyeok', 'nieun', 'ieung', 'mieum', 'rieul'];
