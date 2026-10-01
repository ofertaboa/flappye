import { el } from '../../shared/dom.js';
import { createBottomSheet, ModalHeader, ModalBody } from '../ui/BottomSheet.js';
import { fetchGifts } from '../api/gifts.js';
import { GiftCard, GiftCardSkeleton, GiftsEmptyState, GiftsDisabledState } from './GiftCard.js';

export function GiftModal({ onWalletUpdate } = {}) {
  const sheet = createBottomSheet({ titleId: 'gift-modal-title' });
  const list = el('div', { className: 'dash-gift-list' });

  sheet.header.append(ModalHeader({
    title: 'Meus Presentes',
    titleId: sheet.titleId,
  }));

  sheet.body.append(ModalBody([list]));

  async function loadGifts() {
    list.replaceChildren(
      GiftCardSkeleton(),
      GiftCardSkeleton(),
      GiftCardSkeleton(),
    );
    try {
      const res = await fetchGifts();
      if (res.needsLogin) {
        list.replaceChildren(el('div', { className: 'dash-empty' }, [
          el('p', { className: 'dash-empty__title' }, ['Faça login']),
          el('p', { className: 'dash-empty__text' }, [
            'Entre na sua conta para ver seus presentes e o progresso das metas.',
          ]),
        ]));
        return;
      }
      if (res.disabled) {
        list.replaceChildren(GiftsDisabledState());
        return;
      }
      if (!res.ok) {
        list.replaceChildren(el('p', { className: 'dash-form-error' }, [
          res.error || 'Erro ao carregar presentes. Tente novamente.',
        ]));
        return;
      }
      if (!res.gifts?.length) {
        list.replaceChildren(GiftsEmptyState());
        return;
      }
      list.replaceChildren(...res.gifts.map((gift) => GiftCard(gift, {
        onRedeem: (updated) => {
          if (typeof updated?.balance === 'number') {
            onWalletUpdate?.({
              balance: updated.balance,
              free_rounds: updated.free_rounds,
            });
          }
        },
      })));
    } catch {
      list.replaceChildren(el('p', { className: 'dash-form-error' }, [
        'Erro ao carregar presentes. Tente novamente.',
      ]));
    }
  }

  function open() {
    sheet.open();
    loadGifts();
  }

  return { el: sheet.el, open, close: sheet.close };
}
