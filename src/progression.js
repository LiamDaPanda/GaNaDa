// progression.js — meta progression that persists across runs. You start with
// a few letters and unlock the rest by leveling up (a guided path) or by
// spending gold on the 소환 (Summon) gacha. Doubled/compound/cluster jamo are
// formed from base letters, so gating the 14 consonants + 10 base vowels gates
// everything derived from them.

const CONS = ['giyeok', 'nieun', 'digeut', 'rieul', 'mieum', 'bieup', 'siot', 'ieung', 'jieut', 'chieut', 'kieuk', 'tieut', 'pieup', 'hieut'];
const VOW = ['a', 'eo', 'o', 'u', 'eu', 'i', 'ya', 'yeo', 'yo', 'yu'];
export const ALL_UNLOCKABLE = [...CONS, ...VOW]; // 24
export const TOTAL = ALL_UNLOCKABLE.length;

export const STARTERS = ['siot', 'giyeok', 'nieun', 'a', 'i'];
// The order letters are handed out by level-ups (and the pool gacha draws from).
export const UNLOCK_ORDER = [
  'o', 'digeut', 'eo', 'u', 'mieum', 'eu', 'bieup', 'ya', 'ieung', 'yo',
  'jieut', 'yeo', 'rieul', 'yu', 'kieuk', 'tieut', 'chieut', 'pieup', 'hieut',
];
// Compound vowels need their base components unlocked.
export const COMPOUND_PARTS = {
  ae: ['a', 'i'], yae: ['ya', 'i'], e: ['eo', 'i'], ye: ['yeo', 'i'],
  wa: ['o', 'a'], wae: ['o', 'a', 'i'], oe: ['o', 'i'], wo: ['u', 'eo'],
  we: ['u', 'eo', 'i'], wi: ['u', 'i'], ui: ['eu', 'i'],
};

const KEY = 'ganada_prog_v1';
const state = { level: 1, xp: 0, unlocked: STARTERS.slice(), pulls: 0 };
load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    state.level = d.level || 1;
    state.xp = d.xp || 0;
    state.unlocked = Array.from(new Set([...STARTERS, ...(d.unlocked || [])]));
    state.pulls = d.pulls || 0;
  } catch (e) { /* ignore */ }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}

export function isUnlocked(id) { return state.unlocked.includes(id); }
export function getLevel() { return state.level; }
export function getXp() { return state.xp; }
export function xpToNext(level = state.level) { return Math.round(80 * Math.pow(1.22, level - 1)); }
export function unlockedCount() { return new Set(state.unlocked).size; }

// A compound vowel counts as available only if all its base parts are unlocked.
export function compoundUnlocked(id) {
  const p = COMPOUND_PARTS[id];
  if (!p) return isUnlocked(id);
  return p.every(isUnlocked);
}

function doUnlock(id) {
  if (id && !state.unlocked.includes(id)) { state.unlocked.push(id); return true; }
  return false;
}
function nextLockedInOrder() { return UNLOCK_ORDER.find((id) => !state.unlocked.includes(id)) || null; }
function lockedPool() { return UNLOCK_ORDER.filter((id) => !state.unlocked.includes(id)); }

// Add XP; returns { levels:[newLevel...], unlocked:[id...], gold }.
export function addXp(amount) {
  const res = { levels: [], unlocked: [], gold: 0 };
  state.xp += amount;
  let guard = 0;
  while (state.xp >= xpToNext(state.level) && guard++ < 50) {
    state.xp -= xpToNext(state.level);
    state.level++;
    res.levels.push(state.level);
    res.gold += 18 + state.level * 4;
    const u = nextLockedInOrder();
    if (u) { doUnlock(u); res.unlocked.push(u); }
  }
  save();
  return res;
}

// Directly unlock the next letter in the guided order (region-clear reward).
export function grantUnlock() {
  const id = nextLockedInOrder();
  if (id) { doUnlock(id); save(); return id; }
  return null;
}

export function gachaCost() { return Math.round(60 * Math.pow(1.25, state.pulls)); }
export function canPull() { return lockedPool().length > 0; }

// Spend nothing here (caller checks gold) — unlock a random still-locked letter.
export function gachaPull() {
  const pool = lockedPool();
  if (pool.length === 0) return { dup: true };
  const id = pool[Math.floor(Math.random() * pool.length)];
  doUnlock(id);
  state.pulls++;
  save();
  return { id };
}
