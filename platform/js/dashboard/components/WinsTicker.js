import { el } from '../../shared/dom.js';

const WINS = [
  { name: 'João', action: 'acabou de sacar', amount: 52 },
  { name: 'Carlos', action: 'recebeu', amount: 118 },
  { name: 'Marcos', action: 'ganhou', amount: 40 },
  { name: 'Fernanda', action: 'sacou', amount: 97 },
  { name: 'Juliana', action: 'recebeu', amount: 180 },
  { name: 'Pedro', action: 'ganhou', amount: 65 },
  { name: 'Ana', action: 'sacou', amount: 143 },
  { name: 'Lucas', action: 'recebeu', amount: 88 },
];

function formatAmount(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function createWinItem({ name, action, amount }) {
  return el('div', { className: 'dash-wins__item' }, [
    el('span', { className: 'dash-wins__avatar' }, [name[0]]),
    el('span', {}, [
      el('strong', {}, [name]),
      ` ${action} `,
      el('span', { className: 'dash-wins__amount' }, [formatAmount(amount)]),
    ]),
  ]);
}

export function WinsTicker() {
  const track = el('div', { className: 'dash-wins__track' });

  [...WINS, ...WINS].forEach((win) => track.append(createWinItem(win)));

  return el('section', { className: 'dash-wins', 'aria-label': 'Últimos ganhos' }, [
    el('h2', { className: 'dash-wins__title' }, [
      el('span', { className: 'dash-wins__live', 'aria-hidden': 'true' }),
      'Últimos Ganhos',
    ]),
    el('div', { className: 'dash-wins__viewport' }, [track]),
  ]);
}
