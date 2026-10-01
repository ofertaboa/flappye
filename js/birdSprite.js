/** Bitmap HD do pássaro — desenho direto da fonte em resolução nativa (sem downscale borrado). */

let cache = { key: '', canvas: null };

export function invalidateBirdSpriteCache() {
  cache = { key: '', canvas: null };
}

/**
 * Retorna null para forçar draw direto do PNG HD (1 downscale nítido no canvas).
 * Só usa cache quando a fonte é menor que o alvo (upscale raro).
 */
export function getBirdSpriteBitmap(image, width, height, dpr) {
  if (!image?.naturalWidth) return null;

  const ratio = Math.max(1, dpr || 1);
  const pxW = Math.max(1, Math.round(width * ratio));
  const pxH = Math.max(1, Math.round(height * ratio));

  if (image.naturalWidth >= pxW && image.naturalHeight >= pxH) {
    return null;
  }

  const key = `${pxW}x${pxH}:${image.src}`;
  if (cache.key === key && cache.canvas) {
    return cache.canvas;
  }

  const canvas = document.createElement('canvas');
  canvas.width = pxW;
  canvas.height = pxH;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  if (typeof ctx.imageSmoothingQuality === 'string') {
    ctx.imageSmoothingQuality = 'high';
  }
  ctx.clearRect(0, 0, pxW, pxH);
  ctx.drawImage(image, 0, 0, pxW, pxH);
  cache = { key, canvas };
  return canvas;
}

export function drawBirdImage(ctx, image, halfW, halfH, drawW, drawH) {
  ctx.imageSmoothingEnabled = true;
  if (typeof ctx.imageSmoothingQuality === 'string') {
    ctx.imageSmoothingQuality = 'high';
  }
  ctx.drawImage(
    image,
    0, 0, image.naturalWidth, image.naturalHeight,
    -halfW, -halfH, drawW, drawH,
  );
}
