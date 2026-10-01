import { el } from '../utils.js';

export const BRASILIA_TZ = 'America/Sao_Paulo';

const PERIODS = [
  { id: 'today', label: 'Hoje' },
  { id: 'yesterday', label: 'Ontem' },
  { id: '7d', label: 'Últimos 7 dias' },
  { id: '15d', label: 'Últimos 15 dias' },
  { id: '30d', label: 'Últimos 30 dias' },
  { id: 'custom', label: 'Personalizado' },
];

/** Data YYYY-MM-DD no fuso de Brasília */
export function ymdInBrasilia(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BRASILIA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function shiftYmd(ymd, deltaDays) {
  const noon = new Date(`${ymd}T12:00:00-03:00`);
  noon.setUTCDate(noon.getUTCDate() + deltaDays);
  return ymdInBrasilia(noon);
}

function rangeFromYmd(startYmd, endYmd) {
  return {
    startStr: `${startYmd} 00:00:00`,
    endStr: `${endYmd} 23:59:59`,
    startYmd,
    endYmd,
    tz: BRASILIA_TZ,
  };
}

/** Intervalo do período sempre em horário de Brasília */
export function getPeriodRange(periodId, customFrom = '', customTo = '') {
  const today = ymdInBrasilia(new Date());

  switch (periodId) {
    case 'yesterday': {
      const y = shiftYmd(today, -1);
      return rangeFromYmd(y, y);
    }
    case '7d':
      return rangeFromYmd(shiftYmd(today, -6), today);
    case '15d':
      return rangeFromYmd(shiftYmd(today, -14), today);
    case '30d':
      return rangeFromYmd(shiftYmd(today, -29), today);
    case 'custom':
      if (customFrom && customTo) {
        return rangeFromYmd(customFrom, customTo);
      }
      return rangeFromYmd(today, today);
    case 'today':
    default:
      return rangeFromYmd(today, today);
  }
}

export function DateFilter({ onChange, initial = 'today', emitOnMount = true }) {
  let period = initial;
  let customFrom = '';
  let customTo = '';

  const initialLabel = PERIODS.find((p) => p.id === initial)?.label || 'Hoje';
  const labelEl = el('span', { className: 'admin-period__label' }, [initialLabel]);
  const menu = el('div', { className: 'admin-period__menu', hidden: true });
  const customWrap = el('div', { className: 'admin-period__custom', hidden: true }, [
    el('input', { className: 'admin-input admin-input--sm', type: 'date', id: 'period-from' }),
    el('span', {}, ['até']),
    el('input', { className: 'admin-input admin-input--sm', type: 'date', id: 'period-to' }),
    el('button', {
      className: 'admin-btn admin-btn--primary admin-btn--sm',
      type: 'button',
      onClick: applyCustom,
    }, ['Aplicar']),
  ]);

  PERIODS.forEach((p) => {
    menu.append(el('button', {
      className: 'admin-period__option',
      type: 'button',
      onClick: () => selectPeriod(p.id, p.label),
    }, [p.label]));
  });

  function applyCustom() {
    customFrom = customWrap.querySelector('#period-from').value;
    customTo = customWrap.querySelector('#period-to').value;
    if (!customFrom || !customTo) return;
    period = 'custom';
    labelEl.textContent = `${customFrom.split('-').reverse().join('/')} — ${customTo.split('-').reverse().join('/')}`;
    menu.hidden = true;
    customWrap.hidden = true;
    emit();
  }

  function selectPeriod(id, label) {
    period = id;
    labelEl.textContent = label;
    menu.hidden = true;
    if (id === 'custom') {
      customWrap.hidden = false;
      return;
    }
    customWrap.hidden = true;
    emit();
  }

  function emit() {
    onChange?.({
      period,
      range: getPeriodRange(period, customFrom, customTo),
    });
  }

  const btn = el('button', {
    className: 'admin-period',
    type: 'button',
    onClick: (e) => {
      e.stopPropagation();
      menu.hidden = !menu.hidden;
    },
  }, [
    el('svg', { viewBox: '0 0 24 24', width: '16', height: '16', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [
      el('rect', { x: '3', y: '4', width: '18', height: '18', rx: '2' }),
      el('path', { d: 'M16 2v4M8 2v4M3 10h18' }),
    ]),
    labelEl,
    el('svg', { viewBox: '0 0 24 24', width: '14', height: '14', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [
      el('path', { d: 'M6 9l6 6 6-6' }),
    ]),
  ]);

  document.addEventListener('click', () => { menu.hidden = true; });

  const wrap = el('div', { className: 'admin-period-wrap' }, [btn, menu, customWrap]);

  if (emitOnMount) {
    emit();
  }
  return wrap;
}
