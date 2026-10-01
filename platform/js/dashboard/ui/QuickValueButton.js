import { el } from '../../shared/dom.js';
import { vibrate } from '../../shared/ui/haptics.js';

export function QuickValueButton({ amount, selected, prefix = 'R$', onSelect }) {
  const display = prefix === 'R$'
    ? `${prefix}${Number.isInteger(amount) ? amount : amount.toLocaleString('pt-BR')}`
    : String(amount);

  return el('button', {
    className: `dash-play__quick-btn${selected ? ' is-selected' : ''}`,
    type: 'button',
    'data-value': String(amount),
    onClick: () => {
      vibrate(8);
      onSelect(amount);
    },
  }, [display]);
}

export function QuickValueGroup({ values, selected, prefix = 'R$', onSelect }) {
  const wrap = el('div', { className: 'dash-play__quick' });
  const buttons = [];

  function render(sel) {
    buttons.length = 0;
    wrap.replaceChildren(...values.map((amount) => {
      const btn = QuickValueButton({ amount, selected: sel === amount, prefix, onSelect: (v) => {
        onSelect(v);
        render(v);
      }});
      buttons.push(btn);
      return btn;
    }));
  }

  render(selected);

  return {
    el: wrap,
    setSelected: render,
  };
}
