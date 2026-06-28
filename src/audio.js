// audio.js — tiny WebAudio synth so there are no asset files to ship.
// All sounds are generated procedurally. Muted until the first user gesture.

let ctx = null;
let masterGain = null;
let enabled = true;

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.25;
    masterGain.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, type = 'sine', vol = 0.4, slideTo = null) {
  if (!enabled) return;
  const c = ensure();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
  g.gain.setValueAtTime(vol, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  osc.connect(g);
  g.connect(masterGain);
  osc.start();
  osc.stop(c.currentTime + dur);
}

function noiseBurst(dur, vol = 0.3, filterFreq = 1200) {
  if (!enabled) return;
  const c = ensure();
  if (!c) return;
  const buffer = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(filter);
  filter.connect(g);
  g.connect(masterGain);
  src.start();
}

export const Audio = {
  unlock() {
    ensure();
  },
  setEnabled(v) {
    enabled = v;
    if (masterGain) masterGain.gain.value = v ? 0.25 : 0;
  },
  isEnabled() {
    return enabled;
  },
  cast(element) {
    const map = {
      fire: () => tone(220, 0.35, 'sawtooth', 0.35, 90),
      lightning: () => { tone(900, 0.12, 'square', 0.25, 300); noiseBurst(0.18, 0.2, 4000); },
      earth: () => { tone(80, 0.4, 'sine', 0.5, 40); noiseBurst(0.3, 0.3, 500); },
      holy: () => { tone(660, 0.5, 'sine', 0.3, 990); tone(880, 0.5, 'sine', 0.2, 1320); },
      ice: () => tone(1200, 0.4, 'triangle', 0.25, 400),
      arcane: () => { tone(330, 0.6, 'sawtooth', 0.35, 1100); noiseBurst(0.5, 0.25, 3000); },
    };
    (map[element] || map.fire)();
  },
  hit() {
    noiseBurst(0.08, 0.15, 2000);
  },
  enemyDie() {
    tone(160, 0.18, 'square', 0.2, 60);
  },
  gateHit() {
    tone(120, 0.25, 'sawtooth', 0.4, 50);
    noiseBurst(0.2, 0.25, 700);
  },
  buy() {
    tone(523, 0.08, 'square', 0.3);
    tone(784, 0.12, 'square', 0.3);
  },
  miss() {
    tone(200, 0.15, 'sine', 0.2, 140);
  },
  compose(n) {
    // rising tick as a syllable builds (초성 → 중성 → 종성)
    tone(440 + n * 160, 0.07, 'triangle', 0.22);
  },
  wave() {
    tone(440, 0.15, 'triangle', 0.3);
    tone(587, 0.2, 'triangle', 0.3);
  },
};
