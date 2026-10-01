import { el } from '../shared/dom.js';
import { LEGAL_UPDATED, TERMS_OF_USE, PRIVACY_POLICY } from './legalContent.js';

function renderDocument(doc) {
  const parts = [
    el('p', { className: 'legal-modal__updated' }, [`Última atualização: ${LEGAL_UPDATED}`]),
  ];

  doc.intro.forEach((text) => {
    parts.push(el('p', { className: 'legal-modal__p' }, [text]));
  });

  doc.sections.forEach((section) => {
    parts.push(el('h3', { className: 'legal-modal__section-title' }, [section.title]));
    section.paragraphs.forEach((text) => {
      parts.push(el('p', { className: 'legal-modal__p' }, [text]));
    });
  });

  return parts;
}

export function createTermsModal() {
  const backdrop = el('div', {
    className: 'legal-modal-backdrop',
    hidden: true,
    onClick: (e) => {
      if (e.target === backdrop) close();
    },
  });

  const titleEl = el('h2', { className: 'legal-modal__title', id: 'legal-modal-title' });
  const bodyEl = el('div', { className: 'legal-modal__body' });

  const panel = el('div', {
    className: 'legal-modal',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'legal-modal-title',
  }, [
    el('div', { className: 'legal-modal__head' }, [
      titleEl,
      el('button', {
        className: 'legal-modal__close',
        type: 'button',
        'aria-label': 'Fechar',
        onClick: () => close(),
      }, ['×']),
    ]),
    bodyEl,
    el('div', { className: 'legal-modal__foot' }, [
      el('button', {
        className: 'btn btn--yellow legal-modal__ok',
        type: 'button',
        onClick: () => close(),
      }, ['Fechar']),
    ]),
  ]);

  backdrop.append(panel);
  document.body.append(backdrop);

  function open(type) {
    const doc = type === 'privacy' ? PRIVACY_POLICY : TERMS_OF_USE;
    titleEl.textContent = doc.title.toUpperCase();
    bodyEl.replaceChildren(...renderDocument(doc));
    backdrop.hidden = false;
    document.body.classList.add('legal-modal-open');
    panel.querySelector('.legal-modal__close')?.focus();
  }

  function close() {
    backdrop.hidden = true;
    document.body.classList.remove('legal-modal-open');
  }

  return { open, close, el: backdrop };
}
