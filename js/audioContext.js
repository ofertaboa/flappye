/** Contexto Web Audio compartilhado entre BGM e efeitos — evita vários decoders no mobile. */

let ctx = null;
let master = null;

export function getGameAudioContext() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
  }
  return { ctx, master };
}

export function resumeGameAudio() {
  const { ctx: audioCtx } = getGameAudioContext();
  if (audioCtx.state === 'suspended') {
    return audioCtx.resume().catch(() => {});
  }
  return Promise.resolve();
}
