import { el } from '../../shared/dom.js';
import { formatMoney } from '../../shared/ui/format.js';

export function StatisticCard({ label, value, isMoney = false }) {
  return el('div', { className: 'dash-stat-card' }, [
    el('span', { className: 'dash-stat-card__label' }, [label]),
    el('strong', { className: 'dash-stat-card__value' }, [
      isMoney ? formatMoney(value) : String(value),
    ]),
  ]);
}

export function StatisticGrid(items) {
  return el('div', { className: 'dash-stat-grid' }, items.map((item) => StatisticCard(item)));
}
