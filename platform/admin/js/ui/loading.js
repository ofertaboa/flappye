import { el } from '../utils.js';

let overlay = null;

export function showLoading() {
  if (overlay) return;
  overlay = el('div', { className: 'admin-loading', id: 'admin-loading' }, [
    el('div', { className: 'admin-loading__spinner' }),
  ]);
  document.body.append(overlay);
}

export function hideLoading() {
  overlay?.remove();
  overlay = null;
}
