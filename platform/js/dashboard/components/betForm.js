import { el } from '../../shared/dom.js';
import { DEFAULT_BET } from './metaHint.js';

export const QUICK_BETS = [5, 10, 20, 50, 100];
export { DEFAULT_BET };

export function parseBet(value) {
  const num = parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(num) ? num : 0;
}

function formatBetInput(value) {
  if (!value) return '';
  const num = parseBet(value);
  if (num <= 0) return '';
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/**
 * Monta o formulário de aposta (campo + atalhos + botão).
 * @returns {{ root: HTMLElement, input: HTMLInputElement, getBet: () => number }}
 */
export function buildBetForm({
  inputId = 'bet-amount',
  submitLabel = 'INICIAR PARTIDA',
  onSubmit,
  initialBet = DEFAULT_BET,
  inputClass = 'dash-play__bet-input',
  quickClass = 'dash-play__quick-btn',
  startClass = 'btn btn--yellow dash-play__start',
} = {}) {
  let selectedBet = initialBet;
  const quickBtns = [];

  const input = el('input', {
    className: inputClass,
    id: inputId,
    name: inputId,
    type: 'text',
    inputmode: 'decimal',
    placeholder: '0,00',
    value: String(initialBet),
    autocomplete: 'off',
  });

  function selectBet(amount) {
    selectedBet = amount;
    input.value = String(amount);
    quickBtns.forEach((btn) => {
      btn.classList.toggle('is-selected', parseBet(btn.getAttribute('data-value')) === amount);
    });
  }

  function getBet() {
    return parseBet(input.value);
  }

  function trySubmit() {
    const bet = getBet();
    if (bet < 1) {
      input.focus();
      input.style.borderColor = 'rgba(248, 113, 113, 0.65)';
      setTimeout(() => { input.style.borderColor = ''; }, 1500);
      return;
    }
    onSubmit(bet);
  }

  const startBtn = el('button', {
    className: startClass,
    type: 'button',
    onClick: trySubmit,
  }, [submitLabel]);

  const quickWrap = el('div', { className: 'dash-play__quick' });
  QUICK_BETS.forEach((amount) => {
    const btn = el('button', {
      className: `${quickClass}${amount === selectedBet ? ' is-selected' : ''}`,
      type: 'button',
      'data-value': String(amount),
      onClick: () => selectBet(amount),
    }, [`R$${amount}`]);
    quickBtns.push(btn);
    quickWrap.append(btn);
  });

  input.addEventListener('input', () => {
    const bet = getBet();
    quickBtns.forEach((btn) => {
      btn.classList.toggle('is-selected', parseBet(btn.getAttribute('data-value')) === bet);
    });
  });

  input.addEventListener('blur', () => {
    const bet = getBet();
    if (bet > 0) input.value = formatBetInput(bet) || String(bet);
  });

  const root = el('div', { className: 'dash-bet-form' }, [
    el('label', { className: 'dash-play__bet-label', for: inputId }, ['Valor da aposta']),
    el('div', { className: 'dash-play__bet-input-wrap' }, [
      el('span', { className: 'dash-play__bet-prefix', 'aria-hidden': 'true' }, ['R$']),
      input,
    ]),
    quickWrap,
    startBtn,
  ]);

  return { root, input, getBet, trySubmit, selectBet };
}

export function getStoredBet() {
  return DEFAULT_BET;
}

export function storeBet(amount) {
  sessionStorage.setItem('flappy_bet', String(amount));
}
