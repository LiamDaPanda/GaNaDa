// upgrades.js — shared idle-economy upgrade definitions.
// `icon` is an SVG sprite symbol id (see index.html), not an emoji.
export const UPGRADES = {
  power: {
    name: '공격력', nameEn: 'Spell Power', icon: 'ic-sword',
    base: 30, growth: 1.55, desc: '모든 마법 피해 +12%', descEn: 'All spell damage +12%',
    apply: (s) => { s.powerMul += 0.12; },
  },
  turret: {
    name: '자동포 기(氣)', nameEn: 'Auto Qi', icon: 'ic-swirl',
    base: 35, growth: 1.5, desc: '자동 공격 피해 +5, 속도 +8%', descEn: 'Auto-attack +5 dmg, +8% rate',
    apply: (s) => { s.turretDamage += 5; s.turretRate *= 0.92; },
  },
  manaRegen: {
    name: '먹 회복', nameEn: 'Ink Regen', icon: 'ic-droplet',
    base: 25, growth: 1.5, desc: '먹 회복 속도 +1.2/초', descEn: 'Ink regen +1.2/sec',
    apply: (s) => { s.manaRegen += 1.2; },
  },
  manaMax: {
    name: '먹 최대량', nameEn: 'Max Ink', icon: 'ic-jar',
    base: 40, growth: 1.6, desc: '최대 먹 +15', descEn: 'Max ink +15',
    apply: (s) => { s.manaMax += 15; },
  },
  gate: {
    name: '성문 보강', nameEn: 'Gate', icon: 'ic-gate',
    base: 30, growth: 1.5, desc: '최대 성문 내구도 +40 (전체 회복)', descEn: 'Max gate HP +40 (full heal)',
    apply: (s) => { s.gateMax += 40; s.gateHp = s.gateMax; },
  },
};

export const UPGRADE_ORDER = ['power', 'turret', 'manaRegen', 'manaMax', 'gate'];
