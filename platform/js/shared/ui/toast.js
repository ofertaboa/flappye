import { el } from '../dom.js';

let container = null;

function getContainer() {
  if (!container) {
    container = el('div', {
      className: 'dash-toast-stack',
      'aria-live': 'polite',
      'aria-atomic': 'true',
    });
    document.body.append(container);
  }
  return container;
}

export function showToast(message, { type = 'success', duration = 2800 } = {}) {
  const stack = getContainer();
  const toast = el('div', { className: `dash-toast dash-toast--${type}`, role: 'status' }, [message]);
  stack.append(toast);

  requestAnimationFrame(() => toast.classList.add('is-visible'));

  window.setTimeout(() => {
    toast.classList.remove('is-visible');
    window.setTimeout(() => toast.remove(), 320);
  }, duration);

  return toast;
}
