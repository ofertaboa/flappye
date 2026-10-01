import { pauseBGM, resumeBGM } from './bgm.js';
import { getGameAudioContext, resumeGameAudio } from './audioContext.js';

const WING_MIN_INTERVAL_MS = 110;
const POINT_MIN_INTERVAL_MS = 60;

let gameMuted = false;
let lastWingAt = 0;
let lastPointAt = 0;
let sfxGain = null;

function ensureSfxGain() {
  const { ctx, master } = getGameAudioContext();
  if (!sfxGain) {
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.85;
    sfxGain.connect(master);
  }
  return { ctx, gain: sfxGain };
}

function playTone(time, freq, duration, type = 'sine', peakGain = 0.06) {
  const { ctx, gain: bus } = ensureSfxGain();
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, time);
  g.gain.setValueAtTime(0, time);
  g.gain.linearRampToValueAtTime(peakGain, time + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  osc.connect(g);
  g.connect(bus);
  osc.start(time);
  osc.stop(time + duration + 0.02);
}

function playWingSfx() {
  const now = performance.now();
  if (now - lastWingAt < WING_MIN_INTERVAL_MS) return;
  lastWingAt = now;

  resumeGameAudio().catch(() => {});
  const { ctx } = ensureSfxGain();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(340, t);
  osc.frequency.exponentialRampToValueAtTime(190, t + 0.07);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.055, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
  osc.connect(g);
  g.connect(sfxGain);
  osc.start(t);
  osc.stop(t + 0.09);
}

function playPointSfx() {
  const now = performance.now();
  if (now - lastPointAt < POINT_MIN_INTERVAL_MS) return;
  lastPointAt = now;

  resumeGameAudio().catch(() => {});
  const { ctx } = ensureSfxGain();
  const t = ctx.currentTime;
  playTone(t, 523, 0.1, 'sine', 0.05);
  playTone(t + 0.045, 659, 0.12, 'sine', 0.045);
}

function playSwooshSfx() {
  resumeGameAudio().catch(() => {});
  const { ctx } = ensureSfxGain();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(420, t);
  osc.frequency.exponentialRampToValueAtTime(180, t + 0.18);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.07, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  osc.connect(g);
  g.connect(sfxGain);
  osc.start(t);
  osc.stop(t + 0.22);
}

function playHitSfx() {
  resumeGameAudio().catch(() => {});
  const { ctx } = ensureSfxGain();
  const t = ctx.currentTime;
  playTone(t, 110, 0.14, 'square', 0.08);
  playTone(t + 0.02, 70, 0.18, 'sine', 0.1);
}

export async function loadSounds() {
  /* Efeitos via Web Audio procedural — sem download de MP3. */
}

export function isGameMuted() {
  return gameMuted;
}

export function setGameMuted(muted) {
  gameMuted = muted;
  if (muted) {
    pauseBGM();
  } else {
    resumeBGM();
  }
}

export function playSound(name) {
  if (gameMuted) return;

  if (name === 'wing') {
    playWingSfx();
    return;
  }

  if (name === 'point') {
    playPointSfx();
    return;
  }

  if (name === 'swooshing') {
    playSwooshSfx();
    return;
  }

  if (name === 'hit') {
    playHitSfx();
    return;
  }
}
