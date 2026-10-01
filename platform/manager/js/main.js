import { managerApi } from './api/client.js';
import { createNavIcon } from '../../js/shared/navIcons.js';
import { appUrl } from '../../js/shared/paths.js';

const MGR_NAV = [
  { id: 'dashboard', label: 'Início', icon: 'grid' },
  { id: 'influencers', label: 'Influenciadores', icon: 'star' },
  { id: 'coupons', label: 'Cupons', icon: 'coupon' },
  { id: 'withdrawals', label: 'Saques', icon: 'withdraw' },
];

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (k === 'className') node.className = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (typeof v === 'boolean') { if (v) node.setAttribute(k, ''); }
    else if (v != null) node.setAttribute(k, v);
  });
  children.forEach((c) => node.append(typeof c === 'string' ? document.createTextNode(c) : c));
  return node;
}

function fmtMoney(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDateShort(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR');
}

function managerMaxPct() {
  return Number(dashData?.commission_pct || JSON.parse(sessionStorage.getItem('flappy_manager_user') || '{}').commission_pct || 70);
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function statusBadge(status) {
  const map = {
    aprovado: 'success', pendente: 'warning', recusado: 'danger', processando: 'warning',
    ativo: 'success', inativo: 'neutral',
  };
  const labels = {
    aprovado: 'Aprovado', pendente: 'Pendente', recusado: 'Recusado', processando: 'Processando',
    ativo: 'Ativo', inativo: 'Inativo',
  };
  const key = String(status).toLowerCase();
  return el('span', { className: `admin-badge admin-badge--${map[key] || 'neutral'}` }, [
    labels[key] || status,
  ]);
}

function toast(msg, type = 'success') {
  const stack = document.getElementById('manager-toast-stack');
  const t = el('div', { className: `admin-toast admin-toast--${type} is-visible` }, [msg]);
  stack?.append(t);
  setTimeout(() => t.remove(), 3500);
}

function requireAuth() {
  if (!sessionStorage.getItem('flappy_manager_token')) {
    window.location.href = appUrl('pages/manager-login.html');
    return false;
  }
  return true;
}

let tab = 'dashboard';
let dashData = null;
let pollTimer = null;
let sidebarOpen = false;

function setSidebarOpen(open) {
  sidebarOpen = open;
  document.body.classList.toggle('admin-sidebar-open', open);
}

function buildManagerSidebar(activeTab, pendingTotal, onNavigate) {
  const nav = el('nav', { className: 'admin-sidebar__nav', 'aria-label': 'Menu do gerente' }, MGR_NAV.map((item) => {
    const btn = el('button', {
      className: `admin-sidebar__link${activeTab === item.id ? ' is-active' : ''}`,
      type: 'button',
      'data-tab': item.id,
      title: item.label,
      onClick: () => {
        setSidebarOpen(false);
        onNavigate(item.id);
      },
    }, [
      createNavIcon(item.icon),
      el('span', { className: 'admin-sidebar__link-text' }, [item.label]),
    ]);
    if (item.id === 'withdrawals' && pendingTotal > 0) {
      btn.append(el('span', { className: 'mgr-sidebar__badge' }, [String(pendingTotal)]));
    }
    return btn;
  }));

  return el('aside', { className: 'admin-sidebar mgr-sidebar', id: 'manager-sidebar' }, [
    el('div', { className: 'admin-sidebar__brand' }, [
      el('div', { className: 'admin-sidebar__brand-main' }, [
        el('img', { src: 'assets/logo-header.png?v=2', alt: 'Flappy Pay', className: 'admin-sidebar__logo' }),
        el('span', { className: 'admin-sidebar__tag mgr-sidebar__tag' }, ['Gerente']),
      ]),
    ]),
    nav,
    el('div', { className: 'admin-sidebar__foot' }, [
      el('a', { className: 'admin-sidebar__back', href: appUrl('index.html'), title: 'Voltar ao site' }, [
        createNavIcon('home'),
        el('span', {}, ['Voltar ao site']),
      ]),
    ]),
  ]);
}

async function loadDashboard() {
  dashData = await managerApi.dashboard();
  if (dashData?.manager) {
    sessionStorage.setItem('flappy_manager_user', JSON.stringify(dashData.manager));
  }
}

function withdrawalsData() {
  return dashData?.withdrawals || { own: [], influencers: [], summary: {} };
}

function pendingBadgeCount() {
  const s = withdrawalsData().summary || {};
  return (s.own_pending_count || 0) + (s.influencers_pending_count || 0);
}

async function render() {
  clearInterval(pollTimer);
  const root = document.getElementById('manager-root');
  if (!root) return;

  const user = JSON.parse(sessionStorage.getItem('flappy_manager_user') || '{}');
  const stats = dashData?.stats || {};
  const pendingTotal = pendingBadgeCount();

  async function goTab(id) {
    tab = id;
    await render();
  }

  root.replaceChildren(
    el('div', { className: 'admin-shell mgr-app' }, [
      el('div', {
        className: 'admin-sidebar-backdrop',
        onClick: () => setSidebarOpen(false),
      }),
      buildManagerSidebar(tab, pendingTotal, goTab),
      el('div', { className: 'admin-main' }, [
        el('header', { className: 'admin-topbar' }, [
          el('button', {
            className: 'admin-menu-btn',
            type: 'button',
            'aria-label': 'Abrir menu',
            onClick: () => setSidebarOpen(!sidebarOpen),
          }, [
            el('svg', { viewBox: '0 0 24 24', width: '22', height: '22', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [
              el('path', { d: 'M4 6h16M4 12h16M4 18h16' }),
            ]),
          ]),
          el('div', { className: 'admin-topbar__info' }, [
            el('h1', { className: 'admin-topbar__title' }, ['Painel de Controle']),
            el('p', { className: 'admin-topbar__sub' }, [user.name || 'Gerente']),
          ]),
          el('button', {
            className: 'admin-btn admin-btn--ghost admin-btn--sm admin-topbar__logout',
            type: 'button',
            title: 'Sair',
            onClick: () => {
              sessionStorage.clear();
              window.location.href = appUrl('pages/manager-login.html');
            },
          }, [
            createNavIcon('logout'),
            el('span', {}, ['Sair']),
          ]),
        ]),
        el('main', { className: 'admin-content', id: 'mgr-content' }),
      ]),
    ]),
  );

  const content = document.getElementById('mgr-content');
  if (tab === 'dashboard') content.append(buildDashboard(user, stats));
  else if (tab === 'withdrawals') content.append(buildWithdrawalsControl(user));
  else if (tab === 'coupons') content.append(await buildCoupons());
  else content.append(await buildInfluencers());

  if (tab === 'withdrawals' || tab === 'dashboard') {
    pollTimer = setInterval(async () => {
      try {
        await loadDashboard();
        if (tab === 'withdrawals') {
          document.getElementById('mgr-content')?.replaceChildren(buildWithdrawalsControl(user));
          updateNavBadge(pendingBadgeCount());
        } else if (tab === 'dashboard') {
          document.getElementById('mgr-content')?.replaceChildren(buildDashboard(user, dashData?.stats || {}));
          updateNavBadge(pendingBadgeCount());
        }
      } catch { /* silencioso */ }
    }, 15000);
  }
}

function updateNavBadge(count) {
  document.querySelectorAll('.mgr-sidebar__badge').forEach((b) => b.remove());
  const btn = document.querySelector('.admin-sidebar__link[data-tab="withdrawals"]');
  if (btn && count > 0) {
    btn.append(el('span', { className: 'mgr-sidebar__badge' }, [String(count)]));
  }
}

function mgrStat(label, value, extra = '') {
  return el('div', { className: `mgr-stat ${extra}`.trim() }, [
    el('span', { className: 'mgr-stat__label' }, [label]),
    el('strong', {
      className: `mgr-stat__value${String(value).includes('R$') ? ' mgr-stat__value--money' : ''}`,
    }, [String(value)]),
  ]);
}

function buildDashboard(user, stats) {
  const d = dashData || {};
  const w = withdrawalsData();
  const s = w.summary || {};
  const recentInf = (w.influencers || []).slice(0, 6);
  const hasPending = (s.influencers_pending_count || 0) + (s.own_pending_count || 0) > 0;

  const page = el('div', { className: 'admin-page mgr-page' });

  page.append(
    el('header', { className: 'mgr-hero' }, [
      el('div', { className: 'mgr-hero__text' }, [
        el('h2', { className: 'mgr-hero__title' }, [`Olá, ${user.name || 'Gerente'}`]),
        el('p', { className: 'mgr-hero__sub' }, [
          'Acompanhe sua rede, comissões e saques dos influenciadores.',
        ]),
      ]),
      el('div', { className: 'mgr-hero__saldo' }, [
        el('span', { className: 'mgr-hero__saldo-label' }, ['Seu saldo']),
        el('strong', { className: 'mgr-hero__saldo-value' }, [fmtMoney(d.montante_balance)]),
      ]),
    ]),

    hasPending
      ? el('div', { className: 'mgr-alert' }, [
          `⏳ ${s.influencers_pending_count || 0} saque(s) de influenciadores e ${s.own_pending_count || 0} seu(s) aguardando aprovação da plataforma.`,
          ' ',
          el('button', {
            className: 'admin-btn admin-btn--ghost admin-btn--sm',
            type: 'button',
            style: 'margin-left:0.5rem;vertical-align:middle',
            onClick: async () => { tab = 'withdrawals'; await render(); },
          }, ['Ver saques']),
        ])
      : null,

    el('div', { className: 'mgr-stats' }, [
      mgrStat('Influenciadores', String(stats.influencers || 0)),
      mgrStat('Indicados', String(stats.referrals || 0)),
      mgrStat('Saques pendentes', String((s.influencers_pending_count || 0) + (s.own_pending_count || 0)), 'mgr-stat--highlight'),
      mgrStat('Sua parceria', `${d.commission_pct || 0}%`),
    ]),

    el('div', { className: 'mgr-sacar-card' }, [
      el('div', { className: 'mgr-sacar-card__text' }, [
        el('h3', {}, ['Sacar sua comissão']),
        el('p', {}, [
          d.pending_withdrawal
            ? 'Você já tem um saque em análise.'
            : `Disponível: ${fmtMoney(d.montante_balance)} · mínimo R$ 10,00`,
        ]),
      ]),
      el('button', {
        className: 'admin-btn admin-btn--primary',
        type: 'button',
        disabled: (d.montante_balance || 0) < 10 || d.pending_withdrawal,
        onClick: () => openWithdraw(d),
      }, [d.pending_withdrawal ? 'Saque em análise' : 'Solicitar saque']),
    ]),

    el('div', { className: 'mgr-grid-2' }, [
      el('div', { className: 'admin-panel admin-panel--compact' }, [
        el('div', { className: 'admin-panel__head' }, [
          el('h2', { className: 'admin-panel__title' }, ['Saques dos influenciadores']),
          el('button', {
            className: 'admin-btn admin-btn--ghost admin-btn--sm',
            type: 'button',
            onClick: async () => { tab = 'withdrawals'; await render(); },
          }, ['Ver todos']),
        ]),
        recentInf.length
          ? el('ul', { className: 'mgr-feed' }, recentInf.map((item) => feedItem(item)))
          : el('p', { className: 'admin-empty admin-empty--sm' }, ['Nenhum saque ainda.']),
      ]),
      el('div', { className: 'admin-panel admin-panel--compact' }, [
        el('h2', { className: 'admin-panel__title' }, ['Link de cadastro']),
        el('code', { style: 'display:block;word-break:break-all;margin:0.5rem 0;font-size:0.8rem' }, [d.link || '']),
        el('button', {
          className: 'admin-btn admin-btn--ghost admin-btn--sm',
          type: 'button',
          onClick: () => { navigator.clipboard?.writeText(d.link); toast('Link copiado'); },
        }, ['Copiar link']),
        el('p', { className: 'mgr-hint' }, [
          'Novos influenciadores entram na sua rede por este link.',
        ]),
      ]),
    ]),
  );

  return page;
}

function feedItem(item) {
  const isPending = item.status === 'pendente';
  return el('li', { className: 'mgr-feed__item' }, [
    el('span', { className: `mgr-feed__dot${isPending ? '' : ' mgr-feed__dot--ok'}` }),
    el('div', {}, [
      el('span', { className: 'mgr-feed__name' }, [item.influencer_name]),
      el('span', { className: 'mgr-feed__meta' }, [
        `${fmtMoney(item.amount)} · ${fmtDate(item.created_at)}`,
      ]),
    ]),
    statusBadge(item.status),
  ]);
}

function buildWithdrawalsControl(user) {
  const d = dashData || {};
  const w = withdrawalsData();
  const s = w.summary || {};
  let subTab = 'influencers';
  let statusFilter = 'todos';

  const page = el('div', { className: 'admin-page mgr-page' });
  const tableHost = el('div', { className: 'mgr-table-panel' });

  function filterRows(rows) {
    if (statusFilter === 'todos') return rows;
    return rows.filter((r) => r.status === statusFilter);
  }

  function renderTable() {
    const data = withdrawalsData();
    const rows = subTab === 'own'
      ? filterRows(data.own || [])
      : filterRows(data.influencers || []);

    if (!rows.length) {
      tableHost.replaceChildren(el('p', { className: 'admin-empty' }, [
        statusFilter === 'todos'
          ? 'Nenhum saque registrado.'
          : `Nenhum saque ${statusFilter}.`,
      ]));
      return;
    }

    const isOwn = subTab === 'own';
    const head = isOwn
      ? ['Data', 'Valor', 'Status', 'CPF', 'PIX']
      : ['Influenciador', 'WhatsApp', 'Valor', 'Status', 'Data', 'PIX'];

    tableHost.replaceChildren(
      el('div', { className: 'admin-mini-table-wrap' }, [
        el('table', { className: 'admin-mini-table' }, [
          el('thead', {}, [el('tr', {}, head.map((h) => el('th', {}, [h])))]),
          el('tbody', {}, rows.map((row) => {
            if (isOwn) {
              return el('tr', {}, [
                el('td', {}, [fmtDate(row.created_at)]),
                el('td', {}, [el('span', { className: 'admin-money' }, [fmtMoney(row.amount)])]),
                el('td', {}, [statusBadge(row.status)]),
                el('td', {}, [row.cpf || '—']),
                el('td', {}, [row.pix_key || '—']),
              ]);
            }
            return el('tr', {}, [
              el('td', {}, [el('strong', {}, [row.influencer_name])]),
              el('td', {}, [row.influencer_phone || '—']),
              el('td', {}, [el('span', { className: 'admin-money' }, [fmtMoney(row.amount)])]),
              el('td', {}, [statusBadge(row.status)]),
              el('td', {}, [fmtDate(row.created_at)]),
              el('td', {}, [row.pix_key || '—']),
            ]);
          })),
        ]),
      ]),
    );
  }

  function setSubTab(id) {
    subTab = id;
    page.querySelectorAll('.mgr-tabs__btn').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.sub === id);
    });
    renderTable();
  }

  page.append(
    el('header', { className: 'mgr-hero' }, [
      el('div', { className: 'mgr-hero__text' }, [
        el('h2', { className: 'mgr-hero__title' }, ['Central de Saques']),
        el('p', { className: 'mgr-hero__sub' }, [
          'Acompanhe seus saques e os dos influenciadores da sua rede. A aprovação é feita pela plataforma.',
        ]),
      ]),
      el('div', { className: 'mgr-hero__saldo' }, [
        el('span', { className: 'mgr-hero__saldo-label' }, ['Seu saldo']),
        el('strong', { className: 'mgr-hero__saldo-value' }, [fmtMoney(d.montante_balance)]),
      ]),
    ]),

    el('div', { className: 'mgr-stats' }, [
      mgrStat('Meu saque pendente', fmtMoney(s.own_pending_amount || 0), 'mgr-stat--highlight'),
      mgrStat('Influenciadores pendentes', String(s.influencers_pending_count || 0), 'mgr-stat--highlight'),
      mgrStat('Meus aprovados', fmtMoney(s.own_approved_amount || 0), 'mgr-stat--success'),
      mgrStat('Influenciadores pagos', fmtMoney(s.influencers_approved_amount || 0), 'mgr-stat--success'),
    ]),

    el('div', { className: 'mgr-sacar-card' }, [
      el('div', { className: 'mgr-sacar-card__text' }, [
        el('h3', {}, ['Solicitar meu saque']),
        el('p', {}, [
          d.pending_withdrawal
            ? 'Aguardando aprovação da plataforma.'
            : `Valor disponível: ${fmtMoney(d.montante_balance)}`,
        ]),
      ]),
      el('button', {
        className: 'admin-btn admin-btn--primary',
        type: 'button',
        disabled: (d.montante_balance || 0) < 10 || d.pending_withdrawal,
        onClick: () => openWithdraw(d, async () => {
          await loadDashboard();
          render();
        }),
      }, [d.pending_withdrawal ? 'Em análise' : 'Sacar agora']),
    ]),

    el('div', { className: 'admin-panel admin-panel--compact' }, [
      el('div', { className: 'admin-panel__head' }, [
        el('h2', { className: 'admin-panel__title' }, ['Histórico de saques']),
      ]),

      el('div', { className: 'mgr-tabs' }, [
        el('button', {
          className: 'mgr-tabs__btn is-active',
          type: 'button',
          'data-sub': 'influencers',
          onClick: () => setSubTab('influencers'),
        }, [`Influenciadores (${(withdrawalsData().influencers || []).length})`]),
        el('button', {
          className: 'mgr-tabs__btn',
          type: 'button',
          'data-sub': 'own',
          onClick: () => setSubTab('own'),
        }, [`Meus saques (${(withdrawalsData().own || []).length})`]),
      ]),

      el('div', { className: 'mgr-filter-row' }, [
        el('label', { className: 'admin-muted-text', style: 'font-size:0.82rem' }, ['Filtrar:']),
        el('select', {
          className: 'admin-select admin-input--sm',
          onChange: (e) => { statusFilter = e.target.value; renderTable(); },
        }, [
          el('option', { value: 'todos' }, ['Todos']),
          el('option', { value: 'pendente' }, ['Pendentes']),
          el('option', { value: 'aprovado' }, ['Aprovados']),
          el('option', { value: 'recusado' }, ['Recusados']),
        ]),
        el('button', {
          className: 'admin-btn admin-btn--ghost admin-btn--sm',
          type: 'button',
          onClick: async () => {
            await loadDashboard();
            render();
            toast('Lista atualizada', 'info');
          },
        }, ['Atualizar']),
      ]),

      tableHost,
      el('p', { className: 'mgr-hint' }, [
        'Quando um influenciador pede saque do montante, aparece aqui como pendente. ',
        'Após a plataforma aprovar, o status muda para aprovado automaticamente.',
      ]),
    ]),
  );

  renderTable();
  return page;
}

const COUPON_TYPES = [
  ['bonus_fixo', 'Bônus fixo no depósito'],
  ['partidas_gratis', 'Partidas grátis'],
];

function couponTypeLabel(type) {
  if (type === 'bonus_percentual') return 'Bônus % (legado)';
  if (type === 'cashback') return 'Cashback (legado)';
  return COUPON_TYPES.find(([k]) => k === type)?.[1] || type;
}

function couponValueLabel(row) {
  if (row.type === 'partidas_gratis') return `${row.value} partida(s)`;
  return fmtMoney(row.value);
}

function valueFieldLabel(type) {
  if (type === 'partidas_gratis') return 'Quantidade de partidas';
  return 'Valor do bônus (R$)';
}

async function buildCoupons() {
  let editingId = null;
  const page = el('div', { className: 'admin-page mgr-page' });
  const formHost = el('div');
  const listHost = el('div');

  async function renderCoupons() {
    const { coupons } = await managerApi.coupons();
    const editing = editingId ? coupons.find((c) => c.id === editingId) : null;

    formHost.replaceChildren(buildCouponForm(editing, renderCoupons));
    listHost.replaceChildren(
      el('div', { className: 'admin-panel admin-panel--compact' }, [
        el('div', { className: 'admin-panel__head' }, [
          el('h2', { className: 'admin-panel__title' }, ['Meus cupons']),
          el('span', { className: 'admin-muted-text' }, [`${coupons.length} cadastrado(s)`]),
        ]),
        coupons.length
          ? el('div', { className: 'admin-mini-table-wrap' }, [
              el('table', { className: 'admin-mini-table' }, [
                el('thead', {}, [el('tr', {}, [
                  'Código', 'Tipo', 'Valor', 'Dep. mín.', 'Usos', 'Expira', 'Status', '',
                ].map((h) => el('th', {}, [h])))]),
                el('tbody', {}, coupons.map((row) => el('tr', {}, [
                  el('td', {}, [el('strong', {}, [row.name])]),
                  el('td', {}, [couponTypeLabel(row.type)]),
                  el('td', {}, [couponValueLabel(row)]),
                  el('td', {}, [fmtMoney(row.min_deposit)]),
                  el('td', {}, [`${row.used_qty} / ${row.max_qty || '∞'}`]),
                  el('td', {}, [row.expires || '—']),
                  el('td', {}, [statusBadge(row.status)]),
                  el('td', {}, [
                    el('button', {
                      className: 'admin-btn admin-btn--ghost admin-btn--sm',
                      type: 'button',
                      onClick: () => { editingId = row.id; renderCoupons(); },
                    }, ['Editar']),
                    ' ',
                    el('button', {
                      className: 'admin-btn admin-btn--ghost admin-btn--sm',
                      type: 'button',
                      style: 'color:var(--admin-danger,#e55)',
                      onClick: () => removeCoupon(row, renderCoupons),
                    }, ['Excluir']),
                  ]),
                ]))),
              ]),
            ])
          : el('p', { className: 'admin-empty' }, ['Nenhum cupom criado ainda.']),
      ]),
    );
  }

  function buildCouponForm(data, onSaved) {
    const allowedTypes = COUPON_TYPES.map(([k]) => k);
    let selectedType = allowedTypes.includes(data?.type) ? data.type : 'bonus_fixo';
    const valueLabel = el('span', { className: 'admin-field__label' }, [valueFieldLabel(selectedType)]);

    const form = el('form', { className: 'admin-panel admin-panel--compact', style: 'margin-bottom:0.75rem' }, [
      el('h3', { className: 'admin-panel__title' }, [data ? `Editar: ${data.name}` : 'Novo cupom']),
      el('p', { className: 'mgr-hint' }, [
        'Bônus em valor fixo (R$): quem usar o cupom no depósito recebe exatamente o valor definido. Também é possível criar cupons de partidas grátis.',
      ]),
      el('div', { className: 'admin-form-grid admin-form-grid--dense' }, [
        couponField('name', 'Código', data?.name || '', 'PROMO20'),
        couponTypeSelect(selectedType, (type) => {
          selectedType = type;
          valueLabel.textContent = valueFieldLabel(type);
        }),
        couponField('value', null, data?.value ?? '', 'Ex.: 20', 'number', valueLabel),
        couponField('min_deposit', 'Depósito mínimo (R$)', data?.min_deposit ?? '', '0', 'number'),
        couponField('max_deposit', 'Depósito máximo (R$)', data?.max_deposit ?? '0', '0 = sem limite', 'number'),
        couponField('max_qty', 'Máx. usos', data?.max_qty ?? '0', '0 = ilimitado', 'number'),
        couponField('expires', 'Expiração', data?.expires || '', '', 'date'),
        couponStatusSelect(data?.status || 'ativo'),
      ]),
      el('div', { style: 'display:flex;gap:0.5rem;margin-top:0.75rem' }, [
        el('button', { className: 'admin-btn admin-btn--primary admin-btn--sm', type: 'submit' }, [
          data ? 'Salvar alterações' : 'Criar cupom',
        ]),
        data ? el('button', {
          className: 'admin-btn admin-btn--ghost admin-btn--sm',
          type: 'button',
          onClick: () => { editingId = null; onSaved(); },
        }, ['Cancelar']) : null,
      ].filter(Boolean)),
    ]);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      try {
        await managerApi.saveCoupon({
          id: data?.id || null,
          name: fd.get('name'),
          type: fd.get('type'),
          value: Number(fd.get('value')),
          min_deposit: Number(fd.get('min_deposit')),
          max_deposit: Number(fd.get('max_deposit')),
          max_qty: Number(fd.get('max_qty')),
          expires: fd.get('expires'),
          status: fd.get('status'),
        });
        toast(data ? 'Cupom atualizado' : 'Cupom criado');
        editingId = null;
        onSaved();
      } catch (err) {
        toast(err.message, 'error');
      }
    });

    return form;
  }

  page.append(
    el('header', { className: 'mgr-hero' }, [
      el('div', { className: 'mgr-hero__text' }, [
        el('h2', { className: 'mgr-hero__title' }, ['Cupons']),
        el('p', { className: 'mgr-hero__sub' }, [
          'Crie cupons para seus influenciadores e jogadores usarem no depósito.',
        ]),
      ]),
    ]),
    formHost,
    listHost,
  );

  try {
    await renderCoupons();
  } catch (err) {
    page.append(el('div', { className: 'admin-alert admin-alert--error' }, [err.message]));
  }

  return page;
}

function couponField(name, label, value, placeholder = '', type = 'text', labelEl = null) {
  return el('label', { className: 'admin-field' }, [
    labelEl || el('span', { className: 'admin-field__label' }, [label]),
    el('input', {
      className: 'admin-input admin-input--sm',
      name,
      value: String(value ?? ''),
      type,
      placeholder,
      required: name === 'name' || name === 'value',
    }),
  ]);
}

function couponTypeSelect(selected, onChange) {
  const sel = el('select', { className: 'admin-select admin-input--sm', name: 'type' });
  COUPON_TYPES.forEach(([value, label]) => {
    sel.append(el('option', { value, selected: value === selected ? 'selected' : undefined }, [label]));
  });
  sel.addEventListener('change', () => onChange(sel.value));
  return el('label', { className: 'admin-field' }, [
    el('span', { className: 'admin-field__label' }, ['Tipo']),
    sel,
  ]);
}

function couponStatusSelect(selected) {
  const sel = el('select', { className: 'admin-select admin-input--sm', name: 'status' });
  ['ativo', 'inativo'].forEach((value) => {
    sel.append(el('option', { value, selected: value === selected ? 'selected' : undefined }, [value]));
  });
  return el('label', { className: 'admin-field' }, [
    el('span', { className: 'admin-field__label' }, ['Status']),
    sel,
  ]);
}

async function removeCoupon(row, cb) {
  if (!confirm(`Excluir o cupom ${row.name}?`)) return;
  try {
    await managerApi.removeCoupon(row.id);
    toast('Cupom excluído', 'info');
    cb();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function buildInfluencers() {
  const { influencers } = await managerApi.influencers();
  const wrap = el('div', { className: 'admin-page mgr-page' });

  wrap.append(
    el('header', { className: 'mgr-hero' }, [
      el('div', { className: 'mgr-hero__text' }, [
        el('h2', { className: 'mgr-hero__title' }, ['Sua base de influenciadores']),
        el('p', { className: 'mgr-hero__sub' }, [`${influencers.length} influenciador(es) na rede`]),
      ]),
    ]),

    el('div', { className: 'admin-panel admin-panel--compact' }, [
      el('div', { className: 'admin-panel__head' }, [
        el('h2', { className: 'admin-panel__title' }, ['Influenciadores']),
        el('button', {
          className: 'admin-btn admin-btn--primary admin-btn--sm',
          type: 'button',
          onClick: () => openCreateInf(() => render()),
        }, ['+ Criar influenciador']),
      ]),
      influencers.length
        ? el('div', { className: 'admin-mini-table-wrap' }, [
            el('table', { className: 'admin-mini-table' }, [
              el('thead', {}, [el('tr', {}, [
                'Nome', 'WhatsApp', '%', 'Indicados', 'Saldo jogo', 'Montante', 'Gera p/ você', 'Saque', '',
              ].map((h) => el('th', {}, [h])))]),
              el('tbody', {}, influencers.map((inf) => el('tr', {}, [
                el('td', {}, [inf.name]),
                el('td', {}, [inf.phone]),
                el('td', {}, [`${inf.montante_pct}%`]),
                el('td', {}, [String(inf.referrals)]),
                el('td', {}, [fmtMoney(inf.balance || 0)]),
                el('td', {}, [el('span', { className: 'admin-money' }, [fmtMoney(inf.montante_balance)])]),
                el('td', {}, [el('span', { className: 'admin-money' }, [fmtMoney(inf.manager_earned || 0)])]),
                el('td', {}, [inf.pending_withdrawal ? statusBadge('pendente') : el('span', { className: 'admin-muted-text' }, ['—'])]),
                el('td', {}, [
                  el('button', {
                    className: 'admin-btn admin-btn--primary admin-btn--sm',
                    type: 'button',
                    onClick: () => openInfluencerManage(inf.id, () => render()),
                  }, ['Gerenciar']),
                ]),
              ]))),
            ]),
          ])
        : el('p', { className: 'admin-empty' }, ['Nenhum influenciador. Use o link ou crie manualmente.']),
    ]),
  );

  return wrap;
}

function openWithdraw(d, onDone) {
  const overlay = el('div', { className: 'admin-modal-overlay' });
  const cpf = el('input', { className: 'admin-input', placeholder: 'CPF (11 dígitos)' });
  const pix = el('input', { className: 'admin-input', placeholder: 'Chave PIX' });
  const card = el('div', { className: 'admin-modal' }, [
    el('h3', {}, ['Solicitar saque']),
    el('p', {}, [`Valor: ${fmtMoney(d.montante_balance)}`]),
    el('p', { className: 'admin-hint' }, ['A plataforma analisa e aprova o pagamento.']),
    el('label', { className: 'admin-field' }, [el('span', { className: 'admin-field__label' }, ['CPF']), cpf]),
    el('label', { className: 'admin-field' }, [el('span', { className: 'admin-field__label' }, ['Chave PIX']), pix]),
    el('div', { style: 'display:flex;gap:0.5rem;margin-top:1rem' }, [
      el('button', { className: 'admin-btn admin-btn--ghost', type: 'button', onClick: () => overlay.remove() }, ['Cancelar']),
      el('button', {
        className: 'admin-btn admin-btn--primary',
        type: 'button',
        onClick: async () => {
          try {
            await managerApi.withdraw({
              cpf: cpf.value.replace(/\D/g, ''),
              pix_key: pix.value.trim(),
              pix_type: 'CPF',
              amount: d.montante_balance,
            });
            toast('Saque solicitado! Acompanhe na aba Saques.');
            overlay.remove();
            await loadDashboard();
            if (onDone) await onDone();
            else await render();
          } catch (err) {
            toast(err.message, 'error');
          }
        },
      }, ['Confirmar']),
    ]),
  ]);
  overlay.append(card);
  overlay.classList.add('is-open');
  document.body.append(overlay);
}

function openCreateInf(cb) {
  const overlay = el('div', { className: 'admin-modal-overlay' });
  const form = el('form', { className: 'admin-form-grid admin-form-grid--dense' });
  const maxPct = managerMaxPct();
  const pctField = el('input', {
    className: 'admin-input admin-input--sm',
    name: 'montante_pct',
    type: 'number',
    min: '0',
    max: String(maxPct),
    value: '50',
    required: true,
  });
  const pctHint = el('p', { className: 'mgr-hint' }, [`Máximo permitido: ${maxPct}% (sua parceria)`]);
  const pctWarn = el('p', { className: 'mgr-inf-warn', hidden: true });

  ['name', 'phone', 'password'].forEach((f) => {
    form.append(el('label', { className: 'admin-field' }, [
      el('span', { className: 'admin-field__label' }, [
        f === 'name' ? 'Nome' : f === 'phone' ? 'WhatsApp' : 'Senha',
      ]),
      el('input', {
        className: 'admin-input admin-input--sm',
        name: f,
        type: f === 'password' ? 'password' : 'text',
        required: true,
      }),
    ]));
  });
  form.append(el('label', { className: 'admin-field' }, [
    el('span', { className: 'admin-field__label' }, ['% do influenciador']),
    pctField,
    pctHint,
    pctWarn,
  ]));
  pctField.addEventListener('input', () => {
    const v = Number(pctField.value);
    if (v > maxPct) {
      pctWarn.hidden = false;
      pctWarn.textContent = `⚠️ Sua parceria permite no máximo ${maxPct}%.`;
    } else {
      pctWarn.hidden = true;
    }
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const pct = Number(fd.get('montante_pct'));
    if (pct > maxPct) {
      pctWarn.hidden = false;
      pctWarn.textContent = `⚠️ Sua parceria permite no máximo ${maxPct}%.`;
      return;
    }
    try {
      await managerApi.createInfluencer({
        name: fd.get('name'),
        phone: String(fd.get('phone')).replace(/\D/g, ''),
        password: fd.get('password'),
        montante_pct: pct,
      });
      toast('Influenciador criado');
      overlay.remove();
      cb();
    } catch (err) {
      toast(err.message, 'error');
    }
  });
  const card = el('div', { className: 'admin-modal' }, [
    el('h3', {}, ['Novo influenciador']),
    form,
    el('button', { className: 'admin-btn admin-btn--primary', type: 'button', onClick: () => form.requestSubmit() }, ['Criar']),
  ]);
  overlay.append(card);
  overlay.classList.add('is-open');
  document.body.append(overlay);
}

function openInfluencerManage(userId, onClose) {
  const overlay = el('div', { className: 'admin-modal-overlay mgr-inf-overlay' });
  const panel = el('div', { className: 'mgr-inf-panel' });
  overlay.append(panel);
  overlay.classList.add('is-open');
  document.body.append(overlay);

  panel.innerHTML = '<p class="admin-hint" style="padding:2rem">Carregando…</p>';

  async function loadPanel() {
    try {
      const { influencer: inf } = await managerApi.influencerDetail(userId);
      let subTab = 'resumo';
      const content = el('div', { className: 'mgr-inf-panel__body' });

      function renderContent() {
        content.replaceChildren(getInfTab(subTab, inf, content, loadPanel, onClose, overlay));
        panel.querySelectorAll('.mgr-inf-tabs__btn').forEach((b) => {
          b.classList.toggle('is-active', b.dataset.tab === subTab);
        });
      }

      panel.replaceChildren(
        el('header', { className: 'mgr-inf-panel__head' }, [
          el('div', {}, [
            el('h2', { className: 'mgr-inf-panel__title' }, [inf.name]),
            el('p', { className: 'mgr-inf-panel__sub' }, [inf.phone || '—']),
          ]),
          el('button', {
            className: 'admin-btn admin-btn--ghost admin-btn--sm',
            type: 'button',
            onClick: () => { overlay.remove(); onClose?.(); },
          }, ['✕ Fechar']),
        ]),
        el('div', { className: 'mgr-inf-stats mgr-inf-stats--hero' }, [
          infStat('Saldo p/ jogar', fmtMoney(inf.balance || 0), 'mgr-inf-stat--play'),
          infStat('Montante (saque)', fmtMoney(inf.montante_balance), 'mgr-inf-stat--balance'),
          infStat('Você ganhou', fmtMoney(inf.manager_earned_campaign), 'mgr-inf-stat--earn'),
          infStat('Indicados', String(inf.referrals)),
        ]),
        el('nav', { className: 'mgr-inf-tabs' }, [
          infTabBtn('resumo', 'Resumo', () => { subTab = 'resumo'; renderContent(); }),
          infTabBtn('indicados', `Indicados (${(inf.indicados || []).length})`, () => { subTab = 'indicados'; renderContent(); }),
          infTabBtn('historico', `Histórico (${(inf.history || []).length})`, () => { subTab = 'historico'; renderContent(); }),
        ]),
        content,
      );
      renderContent();
    } catch (err) {
      panel.innerHTML = `<div class="admin-alert admin-alert--error">${err.message}</div>`;
    }
  }

  loadPanel();
}

function infStat(label, value, extra = '') {
  return el('div', { className: `mgr-inf-stat ${extra}`.trim() }, [
    el('span', { className: 'mgr-inf-stat__label' }, [label]),
    el('strong', { className: 'mgr-inf-stat__value' }, [value]),
  ]);
}

function infTabBtn(id, label, onClick) {
  return el('button', {
    className: 'mgr-inf-tabs__btn',
    type: 'button',
    'data-tab': id,
    onClick,
  }, [label]);
}

function getInfTab(tab, inf, contentHost, reload, onClose, overlay) {
  const maxPct = inf.manager_max_pct || managerMaxPct();
  const wrap = el('div', { className: 'mgr-inf-tab' });

  if (tab === 'indicados') {
    const list = inf.indicados || [];
    wrap.append(
      list.length
        ? el('div', { className: 'admin-mini-table-wrap' }, [
            el('table', { className: 'admin-mini-table' }, [
              el('thead', {}, [el('tr', {}, ['Nome', 'WhatsApp', 'Cadastro', 'Depositou'].map((h) => el('th', {}, [h])))]),
              el('tbody', {}, list.map((r) => el('tr', {}, [
                el('td', {}, [r.name]),
                el('td', {}, [r.phone || '—']),
                el('td', {}, [fmtDateShort(r.created_at)]),
                el('td', {}, [el('span', { className: r.has_deposit ? 'admin-money' : '' }, [fmtMoney(r.deposited || 0)])]),
              ]))),
            ]),
          ])
        : el('p', { className: 'admin-empty admin-empty--sm' }, ['Nenhum indicado nesta campanha.']),
    );
    return wrap;
  }

  if (tab === 'historico') {
    const hist = inf.history || [];
    wrap.append(
      hist.length
        ? el('ul', { className: 'mgr-inf-history' }, hist.map((h) => el('li', { className: 'mgr-inf-history__item' }, [
            el('div', { className: 'mgr-inf-history__dates' }, [
              el('strong', {}, [fmtDateShort(h.started_at)]),
              ' → ',
              fmtDateShort(h.ended_at),
            ]),
            el('div', { className: 'mgr-inf-history__stats' }, [
              `${h.referrals} indicados · ${h.depositors} depositantes · ${h.montante_pct}%`,
            ]),
            el('div', { className: 'mgr-inf-history__money' }, [
              el('span', {}, [`Montante: ${fmtMoney(h.montante_total)}`]),
              el('span', { className: 'admin-money' }, [` · Você: ${fmtMoney(h.manager_earned)}`]),
            ]),
          ])))
        : el('p', { className: 'admin-empty admin-empty--sm' }, ['Nenhuma campanha encerrada ainda.']),
      el('p', { className: 'mgr-hint' }, [
        'Ao resetar a parceria, os dados da campanha atual são salvos aqui.',
      ]),
    );
    return wrap;
  }

  // resumo
  const pctInput = el('input', {
    className: 'admin-input',
    type: 'number',
    min: '0',
    max: String(maxPct),
    value: String(inf.montante_pct || 0),
  });
  const pctWarn = el('p', { className: 'mgr-inf-warn', hidden: true });
  const playInput = el('input', {
    className: 'admin-input',
    type: 'number',
    min: '0',
    step: '0.01',
    placeholder: 'Ex: 50.00',
  });

  pctInput.addEventListener('input', () => {
    if (Number(pctInput.value) > maxPct) {
      pctWarn.hidden = false;
      pctWarn.textContent = `⚠️ Sua parceria permite no máximo ${maxPct}%. Reduza o percentual.`;
    } else {
      pctWarn.hidden = true;
    }
  });

  wrap.append(
    inf.pending_withdrawal
      ? el('div', { className: 'mgr-alert' }, ['⏳ Este influenciador tem saque pendente de aprovação.'])
      : null,

    el('div', { className: 'mgr-inf-resumo-grid' }, [
      el('div', { className: 'mgr-inf-card' }, [
        el('h4', { className: 'mgr-inf-card__title' }, ['Campanha atual']),
        el('dl', { className: 'mgr-inf-kv' }, [
          kv('Início', fmtDateShort(inf.partnership_started_at)),
          kv('Conversão', `${inf.conversion_rate || 0}%`),
          kv('Depositantes', String(inf.depositors)),
          kv('Total ganho (você)', fmtMoney(inf.manager_earned_campaign)),
          kv('Total histórico (você)', fmtMoney(inf.manager_earned_total)),
        ]),
      ]),
      el('div', { className: 'mgr-inf-card' }, [
        el('h4', { className: 'mgr-inf-card__title' }, ['Link de indicação']),
        el('code', { className: 'mgr-inf-link' }, [inf.link || '']),
        el('button', {
          className: 'admin-btn admin-btn--ghost admin-btn--sm',
          type: 'button',
          style: 'margin-top:0.5rem',
          onClick: () => { navigator.clipboard?.writeText(inf.link); toast('Link copiado'); },
        }, ['Copiar']),
      ]),
    ]),

    el('div', { className: 'mgr-inf-card' }, [
      el('h4', { className: 'mgr-inf-card__title' }, ['Percentual do influenciador']),
      el('p', { className: 'mgr-hint' }, [`Seu limite: ${maxPct}% (definido pela plataforma)`]),
      el('label', { className: 'admin-field' }, [
        el('span', { className: 'admin-field__label' }, ['% do montante']),
        pctInput,
        pctWarn,
      ]),
      el('button', {
        className: 'admin-btn admin-btn--primary admin-btn--sm',
        type: 'button',
        style: 'margin-top:0.5rem',
        onClick: async () => {
          const pct = Number(pctInput.value);
          if (pct > maxPct) {
            pctWarn.hidden = false;
            pctWarn.textContent = `⚠️ Sua parceria permite no máximo ${maxPct}%.`;
            return;
          }
          try {
            await managerApi.updatePct(inf.id, pct);
            toast('Percentual atualizado');
            reload();
          } catch (err) {
            toast(err.message, 'error');
          }
        },
      }, ['Salvar %']),
    ]),

    el('div', { className: 'mgr-inf-card mgr-inf-card--play' }, [
      el('h4', { className: 'mgr-inf-card__title' }, ['Saldo para jogar']),
      el('p', { className: 'mgr-hint' }, [
        'Credita na conta normal do influenciador para usar no jogo. Esse saldo não pode ser sacado — apenas o montante.',
      ]),
      el('div', { className: 'mgr-inf-play-row' }, [
        playInput,
        el('button', {
          className: 'admin-btn admin-btn--primary admin-btn--sm',
          type: 'button',
          onClick: async () => {
            const amount = Number(playInput.value);
            if (!amount || amount <= 0) {
              toast('Informe um valor positivo', 'error');
              return;
            }
            try {
              await managerApi.addPlayBalance(inf.id, amount);
              toast(`+${fmtMoney(amount)} creditado para jogar`);
              playInput.value = '';
              reload();
            } catch (err) {
              toast(err.message, 'error');
            }
          },
        }, ['Adicionar saldo']),
      ]),
      el('p', { className: 'mgr-inf-balances' }, [
        el('span', {}, ['Conta (jogo): ']),
        el('strong', { className: 'admin-money' }, [fmtMoney(inf.balance || 0)]),
        el('span', { className: 'mgr-inf-balances__sep' }, [' · ']),
        el('span', {}, ['Montante (saque): ']),
        el('strong', { className: 'admin-money' }, [fmtMoney(inf.montante_balance)]),
      ]),
    ]),

    el('div', { className: 'mgr-inf-actions' }, [
      el('button', {
        className: 'admin-btn admin-btn--ghost admin-btn--sm',
        type: 'button',
        onClick: async () => {
          if (!confirm('Resetar parceria? Os dados da campanha atual serão salvos no histórico e os contadores zerados.')) return;
          try {
            await managerApi.resetCampaign(inf.id);
            toast('Parceria resetada — histórico salvo');
            reload();
          } catch (err) {
            toast(err.message, 'error');
          }
        },
      }, ['Resetar parceria']),
    ]),
  );

  return wrap;
}

function kv(label, value) {
  return el('div', { className: 'mgr-inf-kv__row' }, [
    el('dt', {}, [label]),
    el('dd', {}, [value]),
  ]);
}

async function boot() {
  const root = document.getElementById('manager-root');
  if (!requireAuth()) return;
  root.innerHTML = '<p class="admin-hint" style="padding:1.5rem">Carregando painel…</p>';
  try {
    await loadDashboard();
    await render();
  } catch (err) {
    root.innerHTML = `<div class="admin-alert admin-alert--error" style="margin:1.5rem">${err.message}</div>`;
  }
}

boot();
