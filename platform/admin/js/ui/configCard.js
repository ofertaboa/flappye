import { el } from '../utils.js';

const ICONS = {
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  wallet: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 12h2"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
};

export function svgIcon(name, size = 20) {
  const svg = el('svg', {
    viewBox: '0 0 24 24',
    width: String(size),
    height: String(size),
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  });
  svg.innerHTML = ICONS[name] || ICONS.user;
  return svg;
}

export function ConfigCard({
  icon = 'user',
  title,
  subtitle,
  hint,
  children = [],
  footer,
  actions = [],
}) {
  const card = el('div', { className: 'admin-config-card' });

  const head = el('div', { className: 'admin-config-card__head' }, [
    el('div', { className: 'admin-config-card__icon' }, [svgIcon(icon, 22)]),
    el('div', {}, [
      el('h2', { className: 'admin-config-card__title' }, [title]),
      subtitle ? el('p', { className: 'admin-config-card__subtitle' }, [subtitle]) : null,
    ].filter(Boolean)),
  ]);
  card.append(head);

  if (hint) {
    card.append(el('p', { className: 'admin-config-card__hint' }, [hint]));
  }

  const body = el('div', { className: 'admin-config-card__body' }, children);
  card.append(body);

  if (actions.length) {
    card.append(el('div', { className: 'admin-config-card__actions' }, actions));
  }

  if (footer) card.append(footer);
  return card;
}

export function ConfigSection(title, fields = []) {
  return el('div', { className: 'admin-config-section' }, [
    el('h3', { className: 'admin-config-section__title' }, [title]),
    el('div', { className: 'admin-config-section__fields' }, fields),
  ]);
}

export function ConfigField(label, input, hint) {
  return el('label', { className: 'admin-config-field' }, [
    el('span', { className: 'admin-config-field__label' }, [label]),
    input,
    hint ? el('span', { className: 'admin-config-field__hint' }, [hint]) : null,
  ].filter(Boolean));
}

export function ConfigInfoBox({ title, lines = [], warning }) {
  const box = el('div', { className: 'admin-config-info' });
  if (title) box.append(el('strong', { className: 'admin-config-info__title' }, [title]));
  lines.forEach((line) => {
    if (line instanceof Node) box.append(line);
    else box.append(el('p', { className: 'admin-config-info__line' }, [line]));
  });
  if (warning) {
    box.append(el('p', { className: 'admin-config-info__warn' }, [
      el('span', { 'aria-hidden': 'true' }, ['⚠ ']),
      warning,
    ]));
  }
  return box;
}

export function SaveButton(label = 'Salvar', onClick) {
  const btn = el('button', {
    className: 'admin-btn admin-btn--accent admin-btn--save',
    type: 'button',
  }, [svgIcon('save', 18), label]);
  if (onClick) btn.addEventListener('click', onClick);
  return btn;
}
