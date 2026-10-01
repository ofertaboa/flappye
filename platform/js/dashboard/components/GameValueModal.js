import { el } from '../../shared/dom.js';
import { createBottomSheet, ModalHeader, ModalBody, ModalFooter } from '../ui/BottomSheet.js';
import { MoneyInput } from '../ui/MoneyInput.js';
import { QuickValueGroup } from '../ui/QuickValueButton.js';
import { PrimaryButton } from '../ui/PrimaryButton.js';
import { storeBet, DEFAULT_BET } from './betForm.js';
import { metaGoalHintText } from './metaHint.js';
import { FREE_ROUND_BET } from '../api/user.js';

const QUICK_VALUES = [5, 10, 20, 50];

export function GameValueModal({ onStart, getWallet, metaMultiplier = 5 }) {
  const sheet = createBottomSheet({ titleId: 'game-modal-title' });
  const freeBannerHost = el('div', { className: 'dash-free-rounds-banner', hidden: true });
  const metaHint = el('p', { className: 'dash-play__meta-hint' }, [metaGoalHintText(metaMultiplier)]);
  let freeRounds = 0;

  const moneyInput = MoneyInput({
    id: 'game-bet-amount',
    label: 'Digite outro valor',
    initialValue: DEFAULT_BET,
    onChange: (v) => quickGroup.setSelected(v),
  });

  const quickGroup = QuickValueGroup({
    values: QUICK_VALUES,
    selected: DEFAULT_BET,
    onSelect: (v) => moneyInput.setValue(v),
  });

  const errorEl = el('p', { className: 'dash-form-error', role: 'alert', hidden: true });

  const freeBtn = PrimaryButton({
    label: '🎮 Rodada grátis (R$5)',
    full: true,
    className: 'dash-free-round-btn',
    onClick: async ({ setLoading }) => {
      errorEl.hidden = true;
      setLoading(true);
      try {
        await onStart({ bet: FREE_ROUND_BET, useFreeRound: true });
        sheet.close();
      } catch (err) {
        errorEl.textContent = err.message || 'Não foi possível iniciar.';
        errorEl.hidden = false;
      } finally {
        setLoading(false);
      }
    },
  });

  const playBtn = PrimaryButton({
    label: '🎮 Jogar com saldo',
    onClick: async ({ setLoading }) => {
      errorEl.hidden = true;
      const bet = moneyInput.getValue();
      if (!bet || bet < 1) {
        errorEl.textContent = 'Escolha um valor válido para a partida.';
        errorEl.hidden = false;
        return;
      }
      setLoading(true);
      try {
        storeBet(bet);
        await onStart({ bet, useFreeRound: false });
        sheet.close();
      } catch (err) {
        errorEl.textContent = err.message || 'Não foi possível iniciar.';
        errorEl.hidden = false;
      } finally {
        setLoading(false);
      }
    },
  });

  sheet.header.append(ModalHeader({
    title: 'Escolha o valor da partida',
    titleId: sheet.titleId,
  }));

  sheet.body.append(ModalBody([
    metaHint,
    freeBannerHost,
    quickGroup.el,
    el('p', { className: 'dash-sheet__or' }, ['Ou']),
    moneyInput.root,
    errorEl,
  ]));

  sheet.footer.append(ModalFooter([
    freeBtn.el,
    playBtn.el,
  ]));

  function refreshFreeBanner() {
    const wallet = getWallet?.() || {};
    freeRounds = Number(wallet.free_rounds || 0);
    freeBtn.el.hidden = freeRounds < 1;

    if (freeRounds > 0) {
      freeBannerHost.hidden = false;
      freeBannerHost.replaceChildren(
        el('p', { className: 'dash-free-rounds-banner__text' }, [
          `Você tem ${freeRounds} rodada${freeRounds > 1 ? 's' : ''} grátis — aposta fixa de R$ ${FREE_ROUND_BET},00.`,
        ]),
      );
    } else {
      freeBannerHost.hidden = true;
      freeBannerHost.replaceChildren();
    }
  }

  function setMetaMultiplier(value) {
    metaHint.textContent = metaGoalHintText(value);
  }

  function open() {
    refreshFreeBanner();
    moneyInput.setValue(DEFAULT_BET);
    quickGroup.setSelected(DEFAULT_BET);
    sheet.open();
  }

  return { el: sheet.el, open, close: sheet.close, refreshFreeBanner, setMetaMultiplier };
}
