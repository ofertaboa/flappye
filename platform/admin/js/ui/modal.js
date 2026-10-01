import { el } from '../utils.js';

let root = document.getElementById('admin-modal-root');

export function confirmDialog({ title, message, confirmLabel = 'Confirmar', danger = false }) {
  return new Promise((resolve) => {
    if (!root) root = document.getElementById('admin-modal-root');

    const overlay = el('div', { className: 'admin-modal-overlay is-open' });
    const panel = el('div', { className: 'admin-modal admin-modal--sm' }, [
      el('h3', { className: 'admin-modal__title' }, [title]),
      el('p', { className: 'admin-modal__text' }, [message]),
      el('div', { className: 'admin-modal__actions' }, [
        el('button', {
          className: 'admin-btn admin-btn--ghost',
          type: 'button',
          onClick: () => close(false),
        }, ['Cancelar']),
        el('button', {
          className: `admin-btn ${danger ? 'admin-btn--danger' : 'admin-btn--primary'}`,
          type: 'button',
          onClick: () => close(true),
        }, [confirmLabel]),
      ]),
    ]);

    function close(result) {
      overlay.classList.remove('is-open');
      setTimeout(() => overlay.remove(), 200);
      resolve(result);
    }

    overlay.append(panel);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
    root.append(overlay);
  });
}

export function openModal({ title, body, footer, wide = false }) {
  if (!root) root = document.getElementById('admin-modal-root');

  const overlay = el('div', { className: 'admin-modal-overlay is-open' });
  const panel = el('div', {
    className: `admin-modal${wide ? ' admin-modal--wide' : ''}`,
  }, [
    el('button', {
      className: 'admin-modal__close',
      type: 'button',
      'aria-label': 'Fechar',
      onClick: () => close(),
    }, ['×']),
    el('h3', { className: 'admin-modal__title' }, [title]),
    el('div', { className: 'admin-modal__body' }, [body]),
    footer ? el('div', { className: 'admin-modal__footer' }, [footer]) : null,
  ].filter(Boolean));

  function close() {
    overlay.classList.remove('is-open');
    setTimeout(() => overlay.remove(), 200);
  }

  overlay.append(panel);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  root.append(overlay);
  return { close, overlay, panel };
}
