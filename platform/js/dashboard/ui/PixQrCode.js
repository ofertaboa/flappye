let libPromise = null;

function loadQrLib() {
  if (typeof globalThis.qrcode === 'function') {
    return Promise.resolve(globalThis.qrcode);
  }

  if (!libPromise) {
    libPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL('../vendor/qrcode-generator.js', import.meta.url).href;
      script.async = true;
      script.onload = () => {
        if (typeof globalThis.qrcode === 'function') {
          resolve(globalThis.qrcode);
          return;
        }
        reject(new Error('Biblioteca QR não carregou.'));
      };
      script.onerror = () => reject(new Error('Falha ao carregar biblioteca QR.'));
      document.head.appendChild(script);
    });
  }

  return libPromise;
}

async function createQrInstance(pixCode) {
  const text = String(pixCode || '').trim();
  if (!text) return null;

  const qrcode = await loadQrLib();
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();

  return qr;
}

/**
 * Desenha QR direto no canvas (sem carregar imagem intermediária).
 */
export async function drawPixQrOnCanvas(canvas, pixCode, size = 168) {
  if (!canvas) return false;

  try {
    const qr = await createQrInstance(pixCode);
    if (!qr) return false;

    const count = qr.getModuleCount();
    const margin = 4;
    const cell = Math.max(2, Math.floor((size - margin * 2) / count));
    const actual = cell * count + margin * 2;

    canvas.width = actual;
    canvas.height = actual;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, actual, actual);
    ctx.fillStyle = '#0a4d32';

    for (let row = 0; row < count; row += 1) {
      for (let col = 0; col < count; col += 1) {
        if (qr.isDark(row, col)) {
          ctx.fillRect(margin + col * cell, margin + row * cell, cell, cell);
        }
      }
    }

    return true;
  } catch {
    return false;
  }
}

export async function buildPixQrDataUrl(pixCode, cellSize = 5) {
  try {
    const qr = await createQrInstance(pixCode);
    if (!qr) return '';

    return qr.createDataURL(cellSize, 4);
  } catch {
    return '';
  }
}

/**
 * Exibe QR em <img> ou <canvas>.
 */
export async function applyPixQrDisplay(target, pixCode, pixQrImage = '', size = 168) {
  if (!target) return false;

  const code = String(pixCode || '').trim();
  const imageSrc = String(pixQrImage || '').trim();

  if (imageSrc) {
    const src = imageSrc.startsWith('data:') || imageSrc.startsWith('http')
      ? imageSrc
      : `data:image/png;base64,${imageSrc}`;

    if (target instanceof HTMLImageElement) {
      target.src = src;
      target.hidden = false;
      return new Promise((resolve) => {
        target.onload = () => resolve(true);
        target.onerror = () => resolve(false);
      });
    }
  }

  if (!code) return false;

  if (target instanceof HTMLImageElement) {
    const dataUrl = await buildPixQrDataUrl(code);
    if (dataUrl) {
      target.src = dataUrl;
      target.hidden = false;
      return true;
    }
  }

  if (target instanceof HTMLCanvasElement) {
    return drawPixQrOnCanvas(target, code, size);
  }

  return false;
}
