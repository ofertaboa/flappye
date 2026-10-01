import { assetUrl } from '../platform/js/shared/paths.js';

export const assets = {
  bird: null,
  ground: null,
  stadiumBg: null,
};

const ASSET_LIST = [
  ['bird', 'assets/bird.png'],
  ['ground', 'assets/ground-full.png'],
  ['stadiumBg', 'assets/stadium-bg.png'],
];

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Falha ao carregar: ' + src));
    img.src = src;
  });
}

function imageFromCanvas(c) {
  return new Promise((resolve) => {
    const img = new Image();
    const done = () => resolve(img);
    img.onload = done;
    img.onerror = done;
    img.src = c.toDataURL('image/png');
    if (img.complete) done();
  });
}

export async function loadAssets(onProgress) {
  let loaded = 0;
  const report = () => {
    loaded += 1;
    onProgress?.(loaded / ASSET_LIST.length);
  };

  await Promise.all(ASSET_LIST.map(async ([key, path]) => {
    try {
      assets[key] = await loadImageElement(assetUrl(path));
    } catch {
      assets[key] = null;
    }
    report();
  }));

  if (!assets.bird) {
    const fallback = document.createElement('canvas');
    fallback.width = 94;
    fallback.height = 94;
    const fctx = fallback.getContext('2d');
    fctx.fillStyle = '#FFCC00';
    fctx.beginPath();
    fctx.ellipse(47, 47, 38, 32, 0, 0, Math.PI * 2);
    fctx.fill();
    assets.bird = await imageFromCanvas(fallback);
  }

  return assets.bird != null;
}
