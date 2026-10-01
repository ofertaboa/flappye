import { el } from '../../shared/dom.js';
import { formatMoney, maskCpf, cpfDigits } from '../../shared/ui/format.js';
import { createBottomSheet, ModalHeader, ModalBody } from '../ui/BottomSheet.js';
import { StatisticCard } from '../ui/StatisticCard.js';
import { PrimaryButton } from '../ui/PrimaryButton.js';
import { fetchReferral, requestMontanteWithdraw, PIX_KEY_TYPES } from '../api/referral.js';
import { showToast } from '../../shared/ui/toast.js';

const POLL_MS = 8000;

function ReferralSkeleton() {
  return el('div', { className: 'dash-referral-skeleton', 'aria-busy': 'true' }, [
    el('div', { className: 'dash-skeleton dash-skeleton--block dash-skeleton--lg' }),
    el('div', { className: 'dash-ref-stats-row' }, [
      el('div', { className: 'dash-skeleton dash-skeleton--block' }),
      el('div', { className: 'dash-skeleton dash-skeleton--block' }),
      el('div', { className: 'dash-skeleton dash-skeleton--block' }),
    ]),
    el('div', { className: 'dash-skeleton dash-skeleton--block' }),
  ]);
}

function influencerStatsRow(res) {
  return el('div', { className: 'dash-ref-stats-row' }, [
    StatisticCard({ label: 'Indicados', value: res.stats.indicados }),
    StatisticCard({ label: 'Com depósito', value: res.stats.com_deposito }),
    StatisticCard({ label: 'Comissão', value: `${res.montante_pct}%` }),
  ]);
}

function montanteHero(res, onSacar) {
  const pending = res.pending_montante_withdrawal;
  const balance = Number(res.stats.ganhos) || 0;
  const canWithdraw = balance >= 10 && !pending;

  const sacarBtn = el('button', {
    className: 'dash-ref-montante__btn',
    type: 'button',
    disabled: !canWithdraw,
    onClick: onSacar,
  }, [pending ? 'Saque em análise' : 'Sacar montante']);

  if (pending) sacarBtn.classList.add('is-pending');

  return el('div', { className: 'dash-ref-montante' }, [
    el('span', { className: 'dash-ref-montante__label' }, ['Saldo montante']),
    el('strong', { className: 'dash-ref-montante__value' }, [formatMoney(balance)]),
    sacarBtn,
    pending
      ? el('p', { className: 'dash-ref-montante__hint' }, [
          'Seu saque está aguardando aprovação no painel.',
        ])
      : null,
  ].filter(Boolean));
}

function buildWithdrawForm(res, onCancel, onSuccess) {
  let pixType = 'CPF';
  const amount = Number(res.stats.ganhos) || 0;

  const cpfInput = el('input', {
    className: 'dash-play__bet-input dash-field-input',
    type: 'text',
    inputmode: 'numeric',
    placeholder: '000.000.000-00',
    autocomplete: 'off',
  });
  cpfInput.addEventListener('input', () => {
    cpfInput.value = maskCpf(cpfInput.value);
  });

  const pixKeyInput = el('input', {
    className: 'dash-play__bet-input dash-field-input',
    type: 'text',
    placeholder: 'Digite sua chave PIX',
    autocomplete: 'off',
  });

  const typeWrap = el('div', { className: 'dash-pix-types' });
  const typeBtns = [];
  PIX_KEY_TYPES.forEach((type) => {
    const btn = el('button', {
      className: `dash-pix-type${type === pixType ? ' is-selected' : ''}`,
      type: 'button',
      onClick: () => {
        pixType = type;
        typeBtns.forEach((b) => b.classList.toggle('is-selected', b.dataset.type === type));
      },
      'data-type': type,
    }, [type]);
    typeBtns.push(btn);
    typeWrap.append(btn);
  });

  const errorEl = el('p', { className: 'dash-form-error', role: 'alert', hidden: true });

  const submitBtn = PrimaryButton({
    label: `Sacar ${formatMoney(amount)}`,
    onClick: async ({ setLoading }) => {
      errorEl.hidden = true;
      setLoading(true);
      try {
        const result = await requestMontanteWithdraw({
          cpf: cpfDigits(cpfInput.value),
          pix_key: pixKeyInput.value.trim(),
          pix_type: pixType,
          amount,
        });
        if (!result.ok) {
          errorEl.textContent = result.error || 'Erro ao solicitar saque.';
          errorEl.hidden = false;
          return;
        }
        showToast(result.message || 'Saque solicitado!');
        onSuccess?.(result.montante_balance);
      } finally {
        setLoading(false);
      }
    },
  });

  return el('div', { className: 'dash-ref-withdraw' }, [
    el('h3', { className: 'dash-ref-withdraw__title' }, ['Sacar montante']),
    el('p', { className: 'dash-ref-withdraw__lead' }, [
      'Informe CPF e chave PIX. O saque vai para análise no painel antes do pagamento.',
    ]),
    el('div', { className: 'dash-ref-withdraw__amount' }, [
      el('span', {}, ['Valor']),
      el('strong', {}, [formatMoney(amount)]),
    ]),
    el('div', { className: 'dash-field-group' }, [
      el('label', { className: 'dash-play__bet-label' }, ['CPF']),
      cpfInput,
    ]),
    el('div', { className: 'dash-field-group' }, [
      el('label', { className: 'dash-play__bet-label' }, ['Tipo de chave PIX']),
      typeWrap,
      pixKeyInput,
    ]),
    errorEl,
    el('div', { className: 'dash-ref-withdraw__actions' }, [
      el('button', {
        className: 'dash-ref-withdraw__cancel',
        type: 'button',
        onClick: onCancel,
      }, ['Voltar']),
      submitBtn.el,
    ]),
  ]);
}

function influencerNotice(res) {
  return el('div', { className: 'dash-ref-notice' }, [
    el('p', { className: 'dash-ref-notice__lead' }, [
      'Compartilhe seu link e acompanhe seus ganhos em tempo real.',
    ]),
    el('p', {}, [
      'Montante total depositado pelos indicados: ',
      el('strong', {}, [formatMoney(res.montante_total)]),
    ]),
    el('p', { className: 'dash-ref-notice__hint' }, [
      'Seus ganhos atualizam automaticamente quando um indicado deposita.',
    ]),
  ]);
}

function regularNotice(res) {
  const reward = Number(res.referral_reward) || 0;
  const minDeposit = Number(res.referral_min_deposit) || 0;

  return el('div', { className: 'dash-ref-notice' }, [
    el('p', { className: 'dash-ref-notice__lead' }, [
      'Compartilhe seu link exclusivo com amigos e comece a ganhar.',
    ]),
    el('p', {}, [
      'Quando alguém se cadastrar pelo seu link e fizer o ',
      el('strong', {}, [`primeiro depósito de ${formatMoney(minDeposit)} ou mais`]),
      ', você recebe ',
      el('strong', {}, [formatMoney(reward)]),
      ' automaticamente no seu saldo.',
    ]),
    el('p', { className: 'dash-ref-notice__hint' }, [
      'O bônus vale uma vez por amigo indicado. Não há limite de indicações.',
    ]),
  ]);
}

export function ReferralModal() {
  const sheet = createBottomSheet({ titleId: 'referral-modal-title' });
  const content = el('div', { className: 'dash-referral-content' });

  sheet.header.append(ModalHeader({
    title: 'Indique e Ganhe',
    titleId: sheet.titleId,
  }));

  sheet.body.append(ModalBody([content]));

  let linkValue = '';
  let pollTimer = null;
  let isOpen = false;
  let lastData = null;
  let showWithdraw = false;

  function renderContent(res) {
    lastData = res;
    linkValue = res.link;

    if (res.is_influencer && showWithdraw) {
      content.replaceChildren(buildWithdrawForm(
        res,
        () => { showWithdraw = false; renderContent(res); },
        (newBalance) => {
          showWithdraw = false;
          if (lastData?.stats) lastData.stats.ganhos = newBalance;
          lastData.pending_montante_withdrawal = true;
          renderContent(lastData);
        },
      ));
      return;
    }

    const linkCard = el('div', { className: 'dash-ref-card' }, [
      el('span', { className: 'dash-play__bet-label' }, ['Meu Link']),
      el('div', { className: 'dash-ref-link-row' }, [
        el('code', { className: 'dash-ref-link' }, [res.link]),
      ]),
      PrimaryButton({
        label: 'Copiar Link',
        onClick: async ({ setLoading }) => {
          setLoading(true);
          try {
            await navigator.clipboard.writeText(linkValue);
            showToast('Link copiado!');
          } catch {
            showToast('Não foi possível copiar.', { type: 'error' });
          } finally {
            setLoading(false);
          }
        },
      }).el,
    ]);

    const notice = res.is_influencer ? influencerNotice(res) : regularNotice(res);

    if (res.is_influencer) {
      content.replaceChildren(
        montanteHero(res, () => { showWithdraw = true; renderContent(res); }),
        influencerStatsRow(res),
        linkCard,
        notice,
      );
    } else {
      const stats = el('div', { className: 'dash-ref-stats-row dash-ref-stats-row--3' }, [
        StatisticCard({ label: 'Indicados', value: res.stats.indicados }),
        StatisticCard({ label: 'Com depósito', value: res.stats.com_deposito }),
        StatisticCard({ label: 'Ganhos', value: res.stats.ganhos, isMoney: true }),
      ]);
      content.replaceChildren(linkCard, stats, notice);
    }
  }

  async function loadData(showSkeleton = false) {
    if (showSkeleton) content.replaceChildren(ReferralSkeleton());
    try {
      const res = await fetchReferral();
      if (!res.ok) throw new Error('Erro');
      renderContent(res);
    } catch {
      if (showSkeleton || !content.querySelector('.dash-ref-link')) {
        content.replaceChildren(el('p', { className: 'dash-form-error' }, [
          'Não foi possível carregar os dados. Tente novamente.',
        ]));
      }
    }
  }

  function startPolling() {
    stopPolling();
    pollTimer = window.setInterval(() => {
      if (isOpen && !showWithdraw) loadData(false);
    }, POLL_MS);
  }

  function stopPolling() {
    if (pollTimer) {
      window.clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function open() {
    isOpen = true;
    showWithdraw = false;
    sheet.open();
    loadData(true);
    startPolling();
  }

  function close() {
    isOpen = false;
    showWithdraw = false;
    stopPolling();
    sheet.close();
  }

  return { el: sheet.el, open, close };
}
