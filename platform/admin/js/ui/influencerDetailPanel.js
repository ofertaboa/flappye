import { el, fmtMoney, fmtDate, fmtDateShort } from '../utils.js';
import { DataTable, StatusBadge } from '../ui/table.js';
import { openModal, confirmDialog } from '../ui/modal.js';
import { toast } from '../ui/toast.js';
import { usersApi } from '../api/users.js';

export function buildInfluencerDetailPanel(data, {
  onBack,
  onRefresh,
  onAfterEndPartnership,
  allowEdit = true,
  allowEndPartnership = true,
} = {}) {
  const inf = data.influencer || {};
  let activeTab = 'resumo';
  const tabsHost = el('div', { className: 'admin-inf-tabs__content' });
  const detail = el('div', { className: 'admin-inf-detail' });

  function renderTabs() {
    tabsHost.replaceChildren(getTabContent(activeTab, data, inf));
    detail.querySelectorAll('.admin-inf-tabs__btn').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.tab === activeTab);
    });
  }

  const headActions = [
    el('button', {
      className: 'admin-btn admin-btn--ghost admin-btn--sm',
      type: 'button',
      onClick: () => copyLink(inf.link),
    }, ['Copiar link']),
  ];

  if (allowEdit) {
    headActions.push(el('button', {
      className: 'admin-btn admin-btn--primary admin-btn--sm',
      type: 'button',
      onClick: () => editInf(inf, onRefresh),
    }, ['Editar']));
  }

  detail.append(
    el('div', { className: 'admin-detail__head admin-inf-detail__head' }, [
      el('button', {
        className: 'admin-btn admin-btn--ghost admin-btn--sm',
        type: 'button',
        onClick: onBack,
      }, ['← Voltar']),
      el('div', { className: 'admin-inf-detail__title-wrap' }, [
        el('h2', { className: 'admin-detail__title' }, [inf.name]),
        el('p', { className: 'admin-muted-text' }, [
          inf.phone || '—',
          inf.manager_name ? ` · Gerente: ${inf.manager_name}` : '',
        ]),
      ]),
      el('div', { className: 'admin-inf-detail__actions' }, headActions),
    ]),

    el('div', { className: 'admin-inf-detail__hero' }, [
      statHero('Comissão hoje', fmtMoney(inf.commission_today || 0), 'admin-inf-stat--today'),
      statHero('Total ganho', fmtMoney(inf.commission_total || 0)),
      statHero('Saldo disponível', fmtMoney(inf.montante_balance || 0), 'admin-inf-stat--balance'),
      statHero('Já pago', fmtMoney(inf.total_paid || 0)),
      statHero('Volume indicado', fmtMoney(inf.montante_value || 0)),
    ]),

    el('nav', { className: 'admin-inf-tabs' }, [
      tabBtn('resumo', 'Resumo', () => { activeTab = 'resumo'; renderTabs(); }),
      tabBtn('indicados', `Indicados (${(data.indicados || []).length})`, () => { activeTab = 'indicados'; renderTabs(); }),
      tabBtn('comissoes', `Comissões (${(data.commissions || []).length})`, () => { activeTab = 'comissoes'; renderTabs(); }),
      tabBtn('saques', `Saques (${(data.withdrawals || []).length})`, () => { activeTab = 'saques'; renderTabs(); }),
      tabBtn('historico', 'Histórico', () => { activeTab = 'historico'; renderTabs(); }),
    ]),
    tabsHost,
  );

  renderTabs();
  return detail;

  function tabBtn(id, label, onClick) {
    return el('button', {
      className: 'admin-inf-tabs__btn',
      type: 'button',
      'data-tab': id,
      onClick,
    }, [label]);
  }

  function getTabContent(tab, detailData, influencer) {
    switch (tab) {
      case 'indicados':
        return buildIndicadosTab(detailData.indicados || []);
      case 'comissoes':
        return buildCommissionsTab(detailData.commissions || []);
      case 'saques':
        return buildWithdrawalsTab(detailData.withdrawals || [], influencer);
      case 'historico':
        return buildHistoryTab(detailData.recent_activity || []);
      default:
        return buildResumoTab(influencer, detailData);
    }
  }

  function buildResumoTab(influencer, detailData) {
    const footer = allowEndPartnership
      ? el('div', { className: 'admin-detail__actions admin-inf-detail__footer-actions' }, [
        el('button', {
          className: 'admin-btn admin-btn--ghost admin-btn--sm',
          type: 'button',
          onClick: () => endPartner(influencer, onAfterEndPartnership),
        }, ['Encerrar parceria']),
      ])
      : null;

    return el('div', { className: 'admin-inf-tab-panel' }, [
      el('div', { className: 'admin-stats admin-stats--4 admin-inf-stats--inline' }, [
        statMini('Indicados', String(influencer.referrals || 0)),
        statMini('Depositantes', String(influencer.depositors || 0)),
        statMini('Conversão', `${influencer.conversion_rate || 0}%`),
        statMini('Parceria', `${influencer.montante_pct || 0}%`),
      ]),
      el('div', { className: 'admin-inf-resumo-grid' }, [
        el('div', { className: 'admin-panel admin-panel--compact' }, [
          el('h3', { className: 'admin-widget__title' }, ['Link de indicação']),
          el('code', { className: 'admin-inf-link-code' }, [influencer.link || '']),
          influencer.pending_withdrawal
            ? el('p', { className: 'admin-alert admin-alert--warn admin-alert--sm' }, ['Saque pendente de aprovação.'])
            : null,
        ].filter(Boolean)),
        el('div', { className: 'admin-panel admin-panel--compact' }, [
          el('h3', { className: 'admin-widget__title' }, ['Informações']),
          el('dl', { className: 'admin-kv admin-kv--compact' }, [
            kvRow('Cadastro', fmtDateShort(influencer.created_at)),
            kvRow('Parceria desde', fmtDateShort(influencer.partnership_start)),
            kvRow('Gerente', influencer.manager_name || 'Direto (admin)'),
            kvRow('Status', influencer.status || 'ativo'),
          ]),
        ]),
      ]),
      el('div', { className: 'admin-panel admin-panel--compact' }, [
        el('h3', { className: 'admin-widget__title' }, ['Últimas comissões']),
        (detailData.commissions || []).slice(0, 5).length
          ? miniCommTable((detailData.commissions || []).slice(0, 5))
          : el('p', { className: 'admin-empty admin-empty--sm' }, ['Nenhuma comissão registrada.']),
      ]),
      footer,
    ].filter(Boolean));
  }

  function buildIndicadosTab(indicados) {
    return el('div', { className: 'admin-inf-tab-panel' }, [
      indicados.length
        ? DataTable({
          compact: true,
          columns: [
            { key: 'name', label: 'Nome' },
            { key: 'phone', label: 'WhatsApp' },
            { key: 'created_at', label: 'Cadastro', render: (r) => fmtDateShort(r.created_at) },
            {
              key: 'deposited',
              label: 'Depositou',
              render: (r) => el('span', { className: r.has_deposit ? 'admin-money' : '' }, [
                fmtMoney(r.deposited || 0),
              ]),
            },
            {
              key: 'has_deposit',
              label: 'Status',
              render: (r) => StatusBadge(r.has_deposit ? 'ativo' : 'pendente'),
            },
          ],
          rows: indicados,
        })
        : el('p', { className: 'admin-empty' }, ['Nenhum indicado ainda.']),
    ]);
  }

  function buildCommissionsTab(commissions) {
    return el('div', { className: 'admin-inf-tab-panel' }, [
      el('p', { className: 'admin-hint admin-inf-tab-hint' }, [
        'Comissões creditadas quando o indicado tem depósito aprovado.',
      ]),
      commissions.length
        ? DataTable({
          compact: true,
          columns: [
            { key: 'created_at', label: 'Data', render: (r) => fmtDate(r.created_at) },
            { key: 'referred_name', label: 'Indicado' },
            { key: 'referred_phone', label: 'WhatsApp' },
            {
              key: 'deposit_amount',
              label: 'Depósito',
              render: (r) => fmtMoney(r.deposit_amount),
            },
            { key: 'pct', label: '%', render: (r) => `${r.pct}%` },
            {
              key: 'commission_amount',
              label: 'Comissão',
              render: (r) => el('span', { className: 'admin-money' }, [fmtMoney(r.commission_amount)]),
            },
          ],
          rows: commissions,
        })
        : el('p', { className: 'admin-empty' }, ['Nenhuma comissão paga ainda.']),
    ]);
  }

  function buildWithdrawalsTab(withdrawals, influencer) {
    const totalPaid = withdrawals
      .filter((w) => w.status === 'aprovado')
      .reduce((s, w) => s + (w.amount || 0), 0);
    const pending = withdrawals.filter((w) => w.status === 'pendente');

    return el('div', { className: 'admin-inf-tab-panel' }, [
      el('div', { className: 'admin-stats admin-stats--3 admin-inf-stats--inline' }, [
        statMini('Saldo atual', fmtMoney(influencer.montante_balance || 0)),
        statMini('Total pago', fmtMoney(totalPaid)),
        statMini('Pendentes', String(pending.length)),
      ]),
      withdrawals.length
        ? DataTable({
          compact: true,
          columns: [
            { key: 'created_at', label: 'Data', render: (r) => fmtDate(r.created_at) },
            {
              key: 'amount',
              label: 'Valor',
              render: (r) => el('span', { className: 'admin-money' }, [fmtMoney(r.amount)]),
            },
            { key: 'status', label: 'Status', render: (r) => StatusBadge(r.status) },
            { key: 'pix_key', label: 'PIX' },
            { key: 'cpf', label: 'CPF' },
          ],
          rows: withdrawals,
        })
        : el('p', { className: 'admin-empty' }, ['Nenhum saque solicitado.']),
      pending.length
        ? el('p', { className: 'admin-hint' }, [
          'Saques pendentes são aprovados na aba ',
          el('a', { href: '#withdrawals', className: 'admin-link' }, ['Saques']),
          '.',
        ])
        : null,
    ]);
  }

  function buildHistoryTab(activity) {
    return el('div', { className: 'admin-inf-tab-panel' }, [
      activity.length
        ? el('ul', { className: 'admin-inf-timeline' }, activity.map((item) =>
          el('li', {
            className: `admin-inf-timeline__item admin-inf-timeline__item--${item.type}`,
          }, [
            el('div', { className: 'admin-inf-timeline__dot' }),
            el('div', { className: 'admin-inf-timeline__body' }, [
              el('strong', {}, [item.label]),
              el('span', {}, [` · ${item.detail}`]),
              el('time', {}, [fmtDate(item.created_at)]),
            ]),
            el('span', {
              className: `admin-inf-timeline__amount${item.type === 'commission' ? ' admin-money' : ''}`,
            }, [fmtMoney(item.amount)]),
          ])))
        : el('p', { className: 'admin-empty' }, ['Nenhuma atividade registrada.']),
    ]);
  }
}

function statHero(label, value, extraClass = '') {
  return el('div', { className: `admin-inf-stat ${extraClass}`.trim() }, [
    el('span', { className: 'admin-inf-stat__label' }, [label]),
    el('strong', { className: 'admin-inf-stat__value' }, [value]),
  ]);
}

function statMini(label, value) {
  return el('div', { className: 'admin-stat-mini' }, [
    el('span', { className: 'admin-stat-mini__label' }, [label]),
    el('strong', { className: 'admin-stat-mini__value' }, [String(value)]),
  ]);
}

function kvRow(label, value) {
  return el('div', { className: 'admin-kv__row' }, [
    el('dt', {}, [label]),
    el('dd', {}, [value]),
  ]);
}

function miniCommTable(rows) {
  return el('div', { className: 'admin-mini-table-wrap' }, [
    el('table', { className: 'admin-mini-table' }, [
      el('thead', {}, [el('tr', {}, ['Data', 'Indicado', 'Depósito', 'Comissão'].map((h) => el('th', {}, [h])))]),
      el('tbody', {}, rows.map((r) => el('tr', {}, [
        el('td', {}, [fmtDate(r.created_at).split(' ')[0]]),
        el('td', {}, [r.referred_name]),
        el('td', {}, [fmtMoney(r.deposit_amount)]),
        el('td', {}, [el('span', { className: 'admin-money' }, [fmtMoney(r.commission_amount)])]),
      ]))),
    ]),
  ]);
}

function editInf(inf, cb) {
  let modalRef;
  const form = el('form', { className: 'admin-form-grid admin-form-grid--dense' }, [
    selectPct('montante_pct', 'Percentual do montante', inf.montante_pct),
    selectStatus('status', 'Status', inf.status),
  ]);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    await usersApi.update(inf.user_id || inf.id, {
      is_influencer: fd.get('status') !== 'encerrado',
      montante_pct: Number(fd.get('montante_pct')),
    });
    toast('Influenciador atualizado');
    modalRef.close();
    cb?.();
  });
  modalRef = openModal({
    title: 'Editar influenciador',
    body: form,
    footer: el('button', {
      className: 'admin-btn admin-btn--primary admin-btn--sm',
      type: 'button',
      onClick: () => form.requestSubmit(),
    }, ['Salvar']),
  });
}

async function endPartner(inf, afterEnd) {
  const ok = await confirmDialog({
    title: 'Encerrar parceria',
    message: 'O usuário deixará de ser influenciador. O saldo montante permanece na conta.',
    confirmLabel: 'Encerrar',
    danger: true,
  });
  if (!ok) return;
  await usersApi.deactivateInfluencer(inf.user_id || inf.id);
  toast('Parceria encerrada');
  afterEnd?.();
}

function copyLink(link) {
  navigator.clipboard?.writeText(link);
  toast('Link copiado', 'info');
}

function selectPct(name, label, selected) {
  const sel = el('select', { className: 'admin-select admin-input--sm', name });
  [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].forEach((p) =>
    sel.append(el('option', { value: String(p), selected: p === selected ? 'selected' : undefined }, [`${p}%`])));
  return el('label', { className: 'admin-field' }, [
    el('span', { className: 'admin-field__label' }, [label]),
    sel,
  ]);
}

function selectStatus(name, label, selected) {
  const sel = el('select', { className: 'admin-select admin-input--sm', name });
  ['ativo', 'bloqueado', 'encerrado'].forEach((s) =>
    sel.append(el('option', { value: s, selected: s === selected ? 'selected' : undefined }, [s])));
  return el('label', { className: 'admin-field' }, [
    el('span', { className: 'admin-field__label' }, [label]),
    sel,
  ]);
}
