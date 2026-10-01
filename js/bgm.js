/** BGM instrumental leve — só Web Audio (sem MP3, zero download). */

import { getGameAudioContext, resumeGameAudio } from './audioContext.js';



const BGM_VOLUME = 0.055;

const BPM = 92;



let bgmGain = null;

let ctx = null;

let schedulerId = 0;

let step = 0;

let nextTime = 0;

let started = false;

let paused = false;



const STEP_MS = () => (60 / BPM / 4) * 1000;



function ensureContext() {

  const shared = getGameAudioContext();

  ctx = shared.ctx;

  if (!bgmGain) {

    bgmGain = ctx.createGain();

    bgmGain.gain.value = BGM_VOLUME;

    bgmGain.connect(shared.master);

  }

  return ctx;

}



function playTone(time, freq, duration, type = 'sine', gain = 0.03) {

  const osc = ctx.createOscillator();

  const g = ctx.createGain();

  osc.type = type;

  osc.frequency.setValueAtTime(freq, time);

  g.gain.setValueAtTime(0, time);

  g.gain.linearRampToValueAtTime(gain, time + 0.012);

  g.gain.exponentialRampToValueAtTime(0.0001, time + duration);

  osc.connect(g);

  g.connect(bgmGain);

  osc.start(time);

  osc.stop(time + duration + 0.02);

}



/** Acordes bossa suave (Am7 → Dm7 → G7 → Cmaj7). */

const CHORDS = [

  [220, 262, 330, 392],

  [196, 233, 294, 349],

  [196, 247, 294, 370],

  [262, 330, 392, 494],

];



function playChord(time, chordIndex, gain = 0.018) {

  const notes = CHORDS[chordIndex % CHORDS.length];

  for (let i = 0; i < notes.length; i += 1) {

    playTone(time, notes[i], 0.55, 'triangle', gain * (i === 0 ? 1 : 0.65));

  }

}



function playBass(time, freq) {

  playTone(time, freq * 0.5, 0.35, 'sine', 0.028);

}



function playStep(index, time) {

  const i = index % 16;

  const chord = Math.floor(index / 16) % CHORDS.length;



  if (i === 0) {

    playChord(time, chord);

    playBass(time, CHORDS[chord][0]);

  }



  if (i === 8) {

    playTone(time, CHORDS[chord][1], 0.2, 'sine', 0.012);

  }



  if (i === 4 || i === 12) {

    playTone(time, 880, 0.06, 'triangle', 0.008);

  }

}



function scheduleLoop() {

  if (!started || paused || !ctx) return;



  const beat = 60 / BPM / 4;

  while (nextTime < ctx.currentTime + 0.2) {

    playStep(step, nextTime);

    step += 1;

    nextTime += beat;

  }



  schedulerId = window.setTimeout(scheduleLoop, STEP_MS());

}



export async function initBGM() {

  /* Sem arquivo — pronto imediatamente. */

}



export async function startBGM() {

  if (started && !paused) return;



  paused = false;

  ensureContext();

  try {

    await resumeGameAudio();

  } catch {

    return;

  }



  if (!started) {

    step = 0;

    nextTime = ctx.currentTime + 0.05;

    started = true;

  }



  scheduleLoop();

}



export function pauseBGM() {

  paused = true;

  if (schedulerId) {

    clearTimeout(schedulerId);

    schedulerId = 0;

  }

  if (ctx?.state === 'running') ctx.suspend().catch(() => {});

}



export function resumeBGM() {

  if (!started) return;

  paused = false;

  resumeGameAudio().catch(() => {});

  scheduleLoop();

}



export function stopBGM() {

  started = false;

  paused = false;

  if (schedulerId) {

    clearTimeout(schedulerId);

    schedulerId = 0;

  }

}



export function setBGMVolume(value) {

  const v = Math.max(0, Math.min(1, value));

  if (bgmGain) bgmGain.gain.value = v;

}

