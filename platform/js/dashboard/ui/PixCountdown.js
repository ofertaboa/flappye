import { el } from '../../shared/dom.js';
import { applyPixQrDisplay } from './PixQrCode.js';

export function PixQrBox({ size = 168 } = {}) {
  const wrap = el('div', { className: 'dash-pix__qr-wrap' }, [
    el('div', { className: 'dash-pix__qr-loading', 'aria-hidden': 'true' }, ['Gerando QR Code…']),
    el('img', {
      className: 'dash-pix__qr dash-pix__qr-img',
      alt: 'QR Code PIX',
      width: String(size),
      height: String(size),
      hidden: true,
    }),
    el('canvas', {
      className: 'dash-pix__qr dash-pix__qr-canvas',
      width: String(size),
      height: String(size),
      'aria-label': 'QR Code PIX',
      hidden: true,
    }),
  ]);

  const loading = wrap.querySelector('.dash-pix__qr-loading');
  const img = wrap.querySelector('.dash-pix__qr-img');
  const canvas = wrap.querySelector('.dash-pix__qr-canvas');

  async function render(pixCode, pixQrImage = '') {
    loading.hidden = false;
    img.hidden = true;
    canvas.hidden = true;
    img.removeAttribute('src');

    let ok = false;

    if (pixQrImage) {
      ok = await applyPixQrDisplay(img, pixCode, pixQrImage, size);
    }

    if (!ok) {
      ok = await applyPixQrDisplay(img, pixCode, '', size);
    }

    if (!ok) {
      ok = await applyPixQrDisplay(canvas, pixCode, '', size);
      if (ok) {
        canvas.hidden = false;
        img.hidden = true;
      }
    } else {
      img.hidden = false;
      canvas.hidden = true;
    }

    loading.hidden = true;
    return ok;
  }

  return { wrap, render };
}

export function PixCountdown({ minutes = 15, compact = false, onExpire }) {
  let remaining = minutes * 60 - 1;
  let timer = null;

  const display = el('span', { className: 'dash-pix__timer-value' }, ['14:59']);

  function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function tick() {
    remaining -= 1;
    display.textContent = formatTime(Math.max(0, remaining));
    if (remaining <= 0) {
      stop();
      onExpire?.();
    }
  }

  function start() {
    stop();
    remaining = minutes * 60 - 1;
    display.textContent = formatTime(remaining);
    timer = window.setInterval(tick, 1000);
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  const root = el('div', { className: `dash-pix__timer${compact ? ' dash-pix__timer--compact' : ''}` }, [
    el('span', { className: 'dash-pix__timer-icon', 'aria-hidden': 'true' }, ['⏱']),
    display,
    el('p', { className: 'dash-pix__timer-hint' }, ['O pagamento expira em 15 minutos.']),
  ]);

  return { root, start, stop };
}

export function PixStatusWaiting() {
  return el('div', { className: 'dash-pix__status' }, [
    el('span', { className: 'dash-pix__status-dot', 'aria-hidden': 'true' }),
    el('span', { className: 'dash-pix__status-text' }, ['Aguardando pagamento...']),
  ]);
}
