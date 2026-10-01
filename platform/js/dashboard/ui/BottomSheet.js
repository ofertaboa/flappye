import { el } from '../../shared/dom.js';
import { vibrate } from '../../shared/ui/haptics.js';

let zIndexBase = 500;
const openSheets = [];

function lockBody() {
  document.body.classList.add('dash-modal-open');
}

function unlockBody() {
  if (openSheets.length === 0) {
    document.body.classList.remove('dash-modal-open');
  }
}

/**
 * @param {{
 *   id?: string,
 *   titleId?: string,
 *   onClose?: () => void,
 *   swipeToClose?: boolean,
 * }} options
 */
export function createBottomSheet({
  id,
  titleId = 'dash-sheet-title',
  onClose,
  swipeToClose = true,
} = {}) {
  const overlay = el('div', {
    className: 'dash-modal dash-sheet',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': titleId,
    hidden: true,
    ...(id ? { id } : {}),
  });

  const panel = el('div', { className: 'dash-modal__panel dash-sheet__panel' });
  const handle = el('div', { className: 'dash-sheet__handle', 'aria-hidden': 'true' });

  const closeBtn = el('button', {
    className: 'dash-modal__close',
    type: 'button',
    'aria-label': 'Fechar',
    onClick: () => close(),
  }, ['×']);

  const headerSlot = el('div', { className: 'dash-sheet__header' });
  const bodySlot = el('div', { className: 'dash-sheet__body' });
  const footerSlot = el('div', { className: 'dash-sheet__footer' });

  panel.append(handle, closeBtn, headerSlot, bodySlot, footerSlot);
  overlay.append(panel);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  let startY = 0;
  let currentY = 0;
  let dragging = false;

  if (swipeToClose) {
    const onStart = (y) => {
      dragging = true;
      startY = y;
      currentY = 0;
      panel.style.transition = 'none';
    };

    const onMove = (y) => {
      if (!dragging) return;
      currentY = Math.max(0, y - startY);
      panel.style.transform = `translateY(${currentY}px)`;
    };

    const onEnd = () => {
      if (!dragging) return;
      dragging = false;
      panel.style.transition = '';
      if (currentY > 100) {
        close();
      } else {
        panel.style.transform = '';
      }
    };

    handle.addEventListener('touchstart', (e) => onStart(e.touches[0].clientY), { passive: true });
    handle.addEventListener('touchmove', (e) => onMove(e.touches[0].clientY), { passive: true });
    handle.addEventListener('touchend', onEnd);

    panel.addEventListener('touchstart', (e) => {
      if (e.target.closest('.dash-sheet__body') && bodySlot.scrollTop === 0) {
        onStart(e.touches[0].clientY);
      }
    }, { passive: true });
    panel.addEventListener('touchmove', (e) => onMove(e.touches[0].clientY), { passive: true });
    panel.addEventListener('touchend', onEnd);
  }

  function open() {
    zIndexBase += 10;
    overlay.style.zIndex = String(zIndexBase);
    overlay.hidden = false;
    openSheets.push(overlay);
    lockBody();
    vibrate(8);
    requestAnimationFrame(() => overlay.classList.add('is-open'));
  }

  function close() {
    overlay.classList.remove('is-open');
    const idx = openSheets.indexOf(overlay);
    if (idx >= 0) openSheets.splice(idx, 1);
    unlockBody();
    panel.style.transform = '';
    window.setTimeout(() => {
      overlay.hidden = true;
      onClose?.();
    }, 280);
  }

  const onKey = (e) => {
    if (e.key === 'Escape' && !overlay.hidden && openSheets[openSheets.length - 1] === overlay) {
      close();
    }
  };
  document.addEventListener('keydown', onKey);

  return {
    el: overlay,
    open,
    close,
    header: headerSlot,
    body: bodySlot,
    footer: footerSlot,
    titleId,
  };
}

export function ModalHeader({ icon, iconClass = 'dash-sheet__icon', title, subtitle, titleId, extra }) {
  const iconEl = icon
    ? el('span', { className: iconClass, 'aria-hidden': 'true' }, [icon])
    : null;

  return el('header', { className: 'dash-sheet__head' }, [
    iconEl,
    el('h2', { className: 'dash-modal__title dash-sheet__title', id: titleId }, [title]),
    extra || null,
    subtitle ? el('p', { className: 'dash-sheet__subtitle' }, [subtitle]) : null,
  ].filter(Boolean));
}

export function ModalBody(children = []) {
  return el('div', { className: 'dash-sheet__content' }, children.flat());
}

export function ModalFooter(children = []) {
  return el('div', { className: 'dash-sheet__actions' }, children.flat());
}
