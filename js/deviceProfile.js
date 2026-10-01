/** Perfil de dispositivo — performance separada de qualidade visual. */

let cached = null;



function readMobileHint() {

  if (typeof document === 'undefined') return false;

  return document.documentElement.classList.contains('is-mobile-device');

}



export function detectMobile() {

  if (readMobileHint()) return true;

  if (typeof window === 'undefined') return false;



  return (

    window.matchMedia('(pointer: coarse), (max-width: 900px)').matches

    || (navigator.maxTouchPoints ?? 0) > 0

  );

}



export function detectLowEnd() {

  if (typeof navigator === 'undefined') return false;



  const mem = navigator.deviceMemory;

  const cores = navigator.hardwareConcurrency;

  const saveData = navigator.connection?.saveData === true;



  if (saveData) return true;

  if (mem != null && mem <= 2) return true;

  if (cores != null && cores <= 2 && detectMobile()) return true;



  return false;

}



export function getCanvasDprCap(mobile = false, lowEnd = false) {

  const native = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  if (lowEnd) return Math.min(native, 2);

  if (mobile) return Math.min(native, 3);

  return Math.min(native, 3);

}



export function getDeviceProfile(force = false) {

  if (cached && !force) return cached;



  const mobile = detectMobile();

  const lowEnd = detectLowEnd();



  cached = {

    mobile,

    lowEnd,

    dprCap: getCanvasDprCap(mobile, lowEnd),

    bakePipeSprites: false,

    maxPipes: mobile ? 5 : 7,

    maxPhysicsSteps: lowEnd ? 3 : mobile ? 4 : 5,

    maxSimCatchUpMs: lowEnd ? 72 : 100,

    hudProgressEvery: mobile ? 3 : 1,

    skipInterpolation: lowEnd,

    flapInputMinMs: lowEnd ? 130 : mobile ? 120 : 40,

    instantFlap: !mobile,

  };



  return cached;

}



export function markMobileRoot() {

  if (typeof document === 'undefined') return;

  if (!detectMobile()) return;

  document.documentElement.classList.add('is-mobile-device');

  document.body?.classList.add('is-mobile');

}

