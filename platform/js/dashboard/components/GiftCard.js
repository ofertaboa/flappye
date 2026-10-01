import { el } from '../../shared/dom.js';
import { formatMoney } from '../../shared/ui/format.js';
import { redeemGift } from '../api/gifts.js';
import { PrimaryButton } from '../ui/PrimaryButton.js';
import { showToast } from '../../shared/ui/toast.js';
import { vibrate } from '../../shared/ui/haptics.js';

const TYPE_ICONS = {
  saldo: '🎁',
  partidas_gratis: '🎮',
  cupom: '🎟',
  cashback: '💰',
  bonus: '⭐',
  item: '🏆',
  recompensa: '🎉',
  ticket: '🎫',
};

const STATUS_LABELS = {
  disponivel: 'Disponível',
  em_andamento: 'Em andamento',
  resgatado: 'Prêmio resgatado',
  expirado: 'Expirado',
};

/**
 * @param {object} gift
 * @param {{ onRedeem?: (gift: object) => void }} handlers
 */
export function GiftCard(gift, { onRedeem } = {}) {
  const progress = Number(gift.progress) || 0;
  const progressTarget = Number(gift.progress_target) || 0;
  const pct = progressTarget > 0
    ? Math.min(100, Math.round((progress / progressTarget) * 100))
    : 0;

  const icon = gift.imagem
    ? el('img', { className: 'dash-gift-card__img', src: gift.imagem, alt: '' })
    : el('span', { className: 'dash-gift-card__emoji', 'aria-hidden': 'true' }, [
      gift.icon || TYPE_ICONS[gift.tipo] || '🎁',
    ]);

  const valueEl = gift.tipo === 'produto_fisico'
    ? el('span', { className: 'dash-gift-card__value' }, [gift.reward_label || gift.titulo])
    : gift.tipo === 'saldo' || gift.tipo === 'bonus_aposta'
      ? el('span', { className: 'dash-gift-card__value' }, [`+${formatMoney(gift.valor)}`])
      : gift.tipo === 'partidas_gratis'
        ? el('span', { className: 'dash-gift-card__value' }, [`${gift.valor} partidas grátis`])
        : null;

  const progressBlock = progressTarget > 0
    ? el('div', { className: 'dash-gift-card__progress' }, [
      el('div', { className: 'dash-gift-card__progress-bar' }, [
        el('div', {
          className: 'dash-gift-card__progress-fill',
          style: `width:${pct}%`,
        }),
      ]),
      el('span', { className: 'dash-gift-card__progress-text' }, [
        `${progress}/${progressTarget} ${gift.progress_label || 'depósitos'}`,
      ]),
    ])
    : null;

  const statusEl = el('span', {
    className: `dash-gift-card__status dash-gift-card__status--${gift.status}`,
  }, [STATUS_LABELS[gift.status] || gift.status]);

  let actionBtn = null;

  if (gift.status === 'disponivel' && !gift.resgatado) {
    const label = gift.tipo === 'partidas_gratis' ? 'Ativar' : 'Resgatar';
    const btn = PrimaryButton({
      label,
      full: false,
      className: 'dash-gift-card__btn',
      onClick: async ({ setLoading }) => {
        setLoading(true);
        try {
          const res = await redeemGift(gift.id);
          if (!res.ok) {
            showToast(res.error || 'Não foi possível resgatar.', { type: 'error' });
            return;
          }
          vibrate([10, 30, 10]);
          const isFree = gift.tipo === 'partidas_gratis';
          showToast(isFree ? 'Partidas ativadas!' : `Presente resgatado!${res.balance != null ? ` Saldo: ${formatMoney(res.balance)}` : ''}`);
          card.classList.add('is-redeemed');
          statusEl.textContent = 'Prêmio resgatado';
          statusEl.className = 'dash-gift-card__status dash-gift-card__status--resgatado';
          actionBtn?.remove();
          onRedeem?.({
            ...res.gift,
            balance: res.balance,
            free_rounds: res.free_rounds,
          });
        } finally {
          setLoading(false);
        }
      },
    });
    actionBtn = btn.el;
  }

  const card = el('article', { className: 'dash-gift-card', 'data-gift-id': String(gift.id) }, [
    el('div', { className: 'dash-gift-card__head' }, [icon, el('div', { className: 'dash-gift-card__info' }, [
      el('h3', { className: 'dash-gift-card__title' }, [gift.titulo]),
      valueEl,
      gift.descricao
        ? el('p', { className: 'dash-gift-card__desc' }, [gift.descricao])
        : null,
      gift.coupon_code
        ? el('p', { className: 'dash-gift-card__coupon' }, [`Cupom: ${gift.coupon_code}`])
        : null,
      progressBlock,
    ].filter(Boolean))]),
    el('div', { className: 'dash-gift-card__foot' }, [
      statusEl,
      actionBtn,
    ].filter(Boolean)),
  ]);

  return card;
}

export function GiftCardSkeleton() {
  return el('article', { className: 'dash-gift-card dash-gift-card--skeleton', 'aria-hidden': 'true' }, [
    el('div', { className: 'dash-skeleton dash-skeleton--circle' }),
    el('div', { className: 'dash-gift-card__info' }, [
      el('div', { className: 'dash-skeleton dash-skeleton--line dash-skeleton--lg' }),
      el('div', { className: 'dash-skeleton dash-skeleton--line' }),
    ]),
  ]);
}

export function GiftsDisabledState() {
  return el('div', { className: 'dash-empty' }, [
    el('span', { className: 'dash-empty__icon', 'aria-hidden': 'true' }, ['⏸']),
    el('p', { className: 'dash-empty__title' }, ['Presentes pausados']),
    el('p', { className: 'dash-empty__text' }, [
      'A campanha de presentes está temporariamente desativada. Volte em breve!',
    ]),
  ]);
}

export function GiftsEmptyState() {
  return el('div', { className: 'dash-empty' }, [
    el('span', { className: 'dash-empty__icon', 'aria-hidden': 'true' }, ['🎁']),
    el('p', { className: 'dash-empty__title' }, ['Nenhum presente disponível']),
    el('p', { className: 'dash-empty__text' }, [
      'Fique de olho — novos presentes e campanhas aparecerão aqui.',
    ]),
  ]);
}
