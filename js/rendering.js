import { GAME_CONFIG } from './config.js';

import { assets } from './assets.js';

import { getDeviceProfile } from './deviceProfile.js';

import { invalidateBirdSpriteCache } from './birdSprite.js';



let skyGradient = null;

let skyGradientHeight = 0;

let backgroundCache = null;

let backgroundCacheKey = '';



const PIPE_FILL = '#1a8c32';

const PIPE_DARK = '#0f5c22';

const PIPE_LIGHT = '#3ecf58';

const PIPE_CAP_FILL = '#22a63f';

const PIPE_CAP_DARK = '#0d6620';



export function setRenderQuality() {

  skyGradient = null;

  backgroundCache = null;

  backgroundCacheKey = '';

  invalidateBirdSpriteCache();

}



export function getGroundY(runtime) {

  return runtime.height - runtime.groundHeight;

}



function getSkyGradient(ctx, runtime) {

  const bottom = getGroundY(runtime);

  if (!skyGradient || skyGradientHeight !== bottom) {

    skyGradient = ctx.createLinearGradient(0, 0, 0, bottom);

    skyGradient.addColorStop(0, '#3d9be0');

    skyGradient.addColorStop(0.55, '#6ec4f5');

    skyGradient.addColorStop(1, '#98d8fa');

    skyGradientHeight = bottom;

  }

  return skyGradient;

}



export function drawSky(ctx, runtime) {

  const bottom = getGroundY(runtime);

  ctx.fillStyle = getSkyGradient(ctx, runtime);

  ctx.fillRect(0, 0, runtime.width, bottom);

}



export function drawStadiumBackground(ctx, runtime) {

  if (!assets.stadiumBg) return;



  const groundY = getGroundY(runtime);

  const img = assets.stadiumBg;

  const drawW = runtime.width;

  const drawH = drawW * (img.naturalHeight / img.naturalWidth);

  const drawY = groundY - drawH;



  ctx.save();

  ctx.globalAlpha = runtime.stadiumBgOpacity;

  ctx.imageSmoothingEnabled = false;

  ctx.drawImage(img, 0, drawY, drawW, drawH);

  ctx.restore();

}



function ensureBackgroundCache(runtime) {

  const key = `${runtime.width}x${runtime.height}-${runtime.stadiumBgOpacity}-${Boolean(assets.stadiumBg)}`;

  if (backgroundCache && backgroundCacheKey === key) {

    return backgroundCache;

  }



  const canvas = document.createElement('canvas');

  canvas.width = runtime.width;

  canvas.height = runtime.height;

  const ctx = canvas.getContext('2d');

  drawSky(ctx, runtime);

  drawStadiumBackground(ctx, runtime);



  backgroundCache = canvas;

  backgroundCacheKey = key;

  return backgroundCache;

}



export function drawCachedBackground(ctx, runtime) {

  ctx.drawImage(ensureBackgroundCache(runtime), 0, 0);

}



export function drawScrollingGround(ctx, runtime, scrollX) {

  const groundY = getGroundY(runtime);

  const gh = runtime.groundHeight;



  if (assets.ground) {

    const tileW = assets.ground.naturalWidth;

    const start = -Math.floor(((scrollX % tileW) + tileW) % tileW);

    for (let x = start; x < runtime.width; x += tileW) {

      ctx.drawImage(assets.ground, x | 0, groundY, tileW, gh);

    }

    return;

  }



  const w = runtime.width;
  const px = 8;
  const grassH = 18;
  const soilY = groundY + grassH;
  const soilH = gh - grassH;

  ctx.fillStyle = '#5fbf3a';
  ctx.fillRect(0, groundY, w, grassH);
  ctx.fillStyle = '#7fd94f';
  ctx.fillRect(0, groundY, w, 5);

  const period = px * 2;
  const teethOff = -((((scrollX | 0) % period) + period) % period);
  ctx.fillStyle = '#3f9e2a';
  for (let x = teethOff; x < w + period; x += period) {
    ctx.fillRect(x | 0, soilY - 5, px, 5);
  }

  ctx.fillStyle = '#c9a06a';
  ctx.fillRect(0, soilY, w, soilH);
  ctx.fillStyle = '#a97e4e';
  ctx.fillRect(0, soilY, w, 3);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, soilY + 3, w, soilH - 3);
  ctx.clip();
  ctx.fillStyle = 'rgba(150, 110, 66, 0.5)';
  const blockH = Math.round(px * 1.4);
  const brickOff = -(((((scrollX * 0.6) | 0) % period) + period) % period);
  let row = 0;
  for (let y = soilY + 6; y < groundY + gh; y += blockH + 2, row += 1) {
    const shift = row % 2 ? px : 0;
    for (let x = brickOff + shift; x < w + period; x += period) {
      ctx.fillRect(x | 0, y | 0, px, blockH);
    }
  }
  ctx.restore();
}



function drawPipeBody(ctx, x, y, width, height) {

  if (height <= 0) return;

  const ix = x | 0;

  const iy = y | 0;

  const iw = width | 0;

  const ih = height | 0;



  ctx.fillStyle = PIPE_FILL;

  ctx.fillRect(ix + 2, iy, iw - 4, ih);

  ctx.fillStyle = PIPE_LIGHT;

  ctx.fillRect(ix + 4, iy, 3, ih);

  ctx.fillStyle = PIPE_DARK;

  ctx.fillRect(ix + iw - 6, iy, 3, ih);

  ctx.strokeStyle = PIPE_CAP_DARK;

  ctx.lineWidth = 1;

  ctx.strokeRect(ix + 2, iy, iw - 4, ih);

}



function drawPipeCap(ctx, x, y, width, capH, lipDown) {

  const ix = x | 0;

  const iy = y | 0;

  const iw = width | 0;

  const ch = capH | 0;



  ctx.fillStyle = PIPE_CAP_FILL;

  if (lipDown) {

    ctx.fillRect(ix, iy, iw, ch);

    ctx.fillStyle = PIPE_LIGHT;

    ctx.fillRect(ix + 3, iy + 2, iw - 6, 3);

  } else {

    ctx.fillRect(ix, iy + ch - 3, iw, 3);

    ctx.fillRect(ix, iy, iw, ch - 3);

    ctx.fillStyle = PIPE_LIGHT;

    ctx.fillRect(ix + 3, iy + 2, iw - 6, 3);

  }



  ctx.strokeStyle = PIPE_CAP_DARK;

  ctx.lineWidth = 2;

  ctx.strokeRect(ix, iy, iw, ch);

}



/** Canos leves — retângulos sólidos, sem bake nem gradientes por coluna. */

export function drawPipeColumn(ctx, runtime, x, y, height, isTop) {

  if (height <= 0) return;



  const capH = runtime.pipeLipH;

  const ix = x | 0;



  if (isTop) {

    drawPipeBody(ctx, ix, y, runtime.pipeWidth, height - capH);

    drawPipeCap(ctx, ix, y + height - capH, runtime.pipeWidth, capH, false);

  } else {

    drawPipeCap(ctx, ix, y, runtime.pipeWidth, capH, true);

    drawPipeBody(ctx, ix, y + capH, runtime.pipeWidth, height - capH);

  }

}



export function prewarmPipeSprites() {

  /* noop — canos desenhados direto no canvas principal */

}



export function createRuntimeConfig(difficultyKey) {

  const device = getDeviceProfile();

  const easy = GAME_CONFIG.difficulties.easy;

  const base = GAME_CONFIG.difficulties[difficultyKey] ?? easy;

  const isDemo = difficultyKey === 'demo';

  const startsFromEasy = difficultyKey === 'hard' || difficultyKey === 'medium';

  const profile = startsFromEasy ? easy : base;

  const globalMul = GAME_CONFIG.globalSpeedMultiplier ?? 1;

  const demoMul = isDemo ? (GAME_CONFIG.demoSpeedMultiplier ?? 1) : 1;

  const speedMul = globalMul * demoMul;



  return {

    width: GAME_CONFIG.width,

    height: GAME_CONFIG.height,

    groundHeight: GAME_CONFIG.groundHeight,

    stadiumBgOpacity: GAME_CONFIG.stadiumBgOpacity,

    bakePipeSprites: false,

    renderDpr: 1,

    pipeWidth: isDemo ? 50 : GAME_CONFIG.pipeWidth,

    pipeLipH: GAME_CONFIG.pipeLipH,

    pipeBodyH: GAME_CONFIG.pipeBodyH,

    flapDuration: GAME_CONFIG.flapDuration,

    flapAnimMs: GAME_CONFIG.flapAnimMs,

    difficultyKey,

    jumpForce: profile.jumpForce ?? GAME_CONFIG.jumpForce,

    pipeSpeed: profile.pipeSpeed * speedMul,

    gravity: profile.gravity * Math.sqrt(speedMul),

    pipeGap: profile.pipeGap,

    pipeSpawnInterval: Math.max(55, Math.round(profile.pipeSpawnInterval / speedMul)),

    maxFallSpeed: profile.maxFallSpeed ?? null,

    maxRiseSpeed: profile.maxRiseSpeed ?? null,

    rotationSmooth: profile.rotationSmooth ?? 1,

    softJump: profile.softJump ?? false,

    softJumpBoost: profile.softJumpBoost ?? 2.0,

    maxPipes: device.maxPipes,

  };

}

