import { el } from '../../shared/dom.js';
import { buildBetForm, DEFAULT_BET } from './betForm.js';
import { metaGoalHintText } from './metaHint.js';
import { PrimaryButton } from '../ui/PrimaryButton.js';
import { FREE_ROUND_BET } from '../api/user.js';

export function PlayCard({ onStart, getWallet, metaMultiplier = 5 }) {
  const freeHost = el('div', { className: 'dash-play__free', hidden: true });
  const metaHint = el('p', {
    className: 'dash-play__meta-hint',
  }, [metaGoalHintText(metaMultiplier)]);

  const betForm = buildBetForm({
    inputId: 'bet-amount',
    onSubmit: (bet) => onStart({ bet, useFreeRound: false }),
    initialBet: DEFAULT_BET,
  });
  betForm.selectBet(DEFAULT_BET);

  const freeBtn = PrimaryButton({
    label: `🎮 Usar rodada grátis (R$${FREE_ROUND_BET})`,
    full: true,
    className: 'dash-play__free-btn',
    onClick: async ({ setLoading }) => {
      setLoading(true);
      try {
        await onStart({ bet: FREE_ROUND_BET, useFreeRound: true });
      } finally {
        setLoading(false);
      }
    },
  });

  freeHost.append(freeBtn.el);

  function refreshFreeRound() {
    const wallet = getWallet?.() || {};
    const count = Number(wallet.free_rounds || 0);
    freeHost.hidden = count < 1;
    if (count > 0) {
      freeBtn.el.querySelector('.dash-btn__label').textContent =
        `🎮 Usar rodada grátis — R$${FREE_ROUND_BET} (${count} restante${count > 1 ? 's' : ''})`;
    }
  }

  function setMetaMultiplier(value) {
    metaHint.textContent = metaGoalHintText(value);
  }

  const section = el('section', { className: 'dash-play', 'aria-labelledby': 'dash-play-title' }, [
    el('h2', { className: 'dash-play__title', id: 'dash-play-title' }, ['Comece a jogar agora']),
    metaHint,
    freeHost,
    betForm.root,
  ]);

  refreshFreeRound();

  return { el: section, refreshFreeRound, setMetaMultiplier };
}

export { getStoredBet, storeBet } from './betForm.js';
