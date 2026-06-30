// regions.js — the RPG "journey". Instead of anonymous endless waves, the run
// is a march through named regions (chapters). Each region is a few stages and
// ends with a named region boss; clearing it advances the journey and, after
// the last region, loops with a higher "회차" (new game+) for escalating runs.

export const STAGES = 5; // stages per region; the last stage is the boss

export const REGIONS = [
  {
    name: '대나무 숲', nameEn: 'Bamboo Grove',
    sub: '바람에 흔들리는 첫 관문', subEn: 'The first gate, swaying in the wind',
    boss: '그림자 도깨비', bossEn: 'Shadow Dokkaebi', accent: '#7fae6a',
  },
  {
    name: '안개 골짜기', nameEn: 'Misty Valley',
    sub: '안개 속에서 형체가 다가온다', subEn: 'Shapes loom out of the mist',
    boss: '안개 군주', bossEn: 'Mist Warden', accent: '#7fa6c0',
  },
  {
    name: '달빛 호수', nameEn: 'Moonlit Lake',
    sub: '수면 위로 도깨비불이 떠오른다', subEn: 'Goblin-fire drifts over the water',
    boss: '물귀신', bossEn: 'Water Wraith', accent: '#8fb0d6',
  },
  {
    name: '서리 봉우리', nameEn: 'Frost Peak',
    sub: '숨결이 얼어붙는 고지', subEn: 'Heights where your breath turns to frost',
    boss: '서리 대장', bossEn: 'Frost Captain', accent: '#bcd6e6',
  },
  {
    name: '폐사지', nameEn: 'Ruined Temple',
    sub: '무너진 단청 사이의 원혼', subEn: 'Spirits among the fallen rafters',
    boss: '망령왕', bossEn: 'Wraith King', accent: '#c89a6a',
  },
  {
    name: '심연', nameEn: 'The Abyss',
    sub: '끝없는 어둠 속의 대장', subEn: 'The warlord in the endless dark',
    boss: '심연의 대장', bossEn: 'Abyssal Warlord', accent: '#b06aa0',
  },
];

const ROMAN = ['', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

// Everything about the wave's place in the journey.
export function regionInfo(wave) {
  const idx = Math.floor((wave - 1) / STAGES);
  const region = REGIONS[idx % REGIONS.length];
  const loop = Math.floor(idx / REGIONS.length); // 0 = first pass
  const stage = ((wave - 1) % STAGES) + 1;
  return { region, idx, loop, stage, stages: STAGES, isBoss: stage === STAGES, isFirst: stage === 1 };
}

export function regionName(info, en = false) {
  const base = en ? info.region.nameEn : info.region.name;
  if (info.loop <= 0) return base;
  return en ? `${base} ${ROMAN[info.loop] || `+${info.loop}`}` : `${base} ${info.loop + 1}회차`;
}

export function bossName(info, en = false) {
  const base = en ? info.region.bossEn : info.region.boss;
  if (info.loop <= 0) return base;
  return en ? `${base} ${ROMAN[info.loop] || `+${info.loop}`}` : `${base} ${info.loop + 1}회차`;
}
