import { el, fmtMoney } from '../utils.js';
import { DataTable, StatusBadge, SearchInput } from '../ui/table.js';
import { openModal } from '../ui/modal.js';
import { toast } from '../ui/toast.js';
import { buildInfluencerDetailPanel } from '../ui/influencerDetailPanel.js';
import { managersApi } from '../api/managers.js';
import { influencersApi } from '../api/influencers.js';

export function renderManagersPage() {
  const page = el('div', { className: 'admin-page admin-page--managers' });
  const host = el('div');
  let selectedId = null;
  let selectedInfluencerId = null;
  let defaultCommissionPct = 70;
  let allManagers = [];
  let searchQuery = '';

  async function refresh() {
    try {
      if (selectedInfluencerId) {
        const data = await influencersApi.detail(selectedInfluencerId);
        host.replaceChildren(buildInfluencerDetailPanel(data, {
          onBack: backToManager,
          onRefresh: refresh,
          allowEdit: false,
          allowEndPartnership: false,
        }));
        return;
      }

      if (selectedId) {
        const data = await managersApi.get(selectedId);
        defaultCommissionPct = data.defaultCommissionPct;
        host.replaceChildren(buildDetail(data.manager, data.influencers || []));
        return;
      }

      const data = await managersApi.list();
      defaultCommissionPct = data.defaultCommissionPct;
      host.replaceChildren(buildList(data.managers));
    } catch (err) {
      host.replaceChildren(el('div', { className: 'admin-alert admin-alert--error' }, [err.message]));
    }
  }

  function backToManager() {
    selectedInfluencerId = null;
    refresh();
  }

  function buildDefaultPctPanel(onSaved) {
    const input = el('input', {
      className: 'admin-input admin-input--sm',
      type: 'number',
      min: '1',
      max: '99',
      step: '0.01',
      value: String(defaultCommissionPct),
    });
    const platformHint = el('span', { className: 'admin-muted-text' }, [
      `Plataforma fica com ${100 - defaultCommissionPct}%`,
    ]);

    input.addEventListener('input', () => {
      const v = Number(input.value);
      if (v >= 1 && v <= 99) {
        platformHint.textContent = `Plataforma fica com ${(100 - v).toFixed(v % 1 ? 2 : 0)}%`;
      }
    });

    return el('div', { className: 'admin-panel admin-panel--compact mgr-default-pct' }, [
      el('div', { className: 'admin-panel__head' }, [
        el('div', {}, [
          el('h2', { className: 'admin-panel__title' }, ['Parceria padrão dos gerentes']),
          el('p', { className: 'admin-muted-text admin-hint' }, [
            'Usada em novos cadastros pelo admin, registro público de gerente e como valor inicial ao criar gerente.',
          ]),
        ]),
      ]),
      el('div', { className: 'mgr-default-pct__row' }, [
        el('label', { className: 'admin-field mgr-default-pct__field' }, [
          el('span', { className: 'admin-field__label' }, ['% do gerente']),
          input,
        ]),
        el('div', { className: 'mgr-default-pct__meta' }, [
          platformHint,
          el('button', {
            className: 'admin-btn admin-btn--primary admin-btn--sm',
            type: 'button',
            onClick: async () => {
              const pct = Number(input.value);
              if (!pct || pct < 1 || pct > 99) {
                toast('Informe um percentual entre 1 e 99', 'error');
                return;
              }
              try {
                defaultCommissionPct = await managersApi.saveDefaultCommission(pct);
                input.value = String(defaultCommissionPct);
                platformHint.textContent = `Plataforma fica com ${100 - defaultCommissionPct}%`;
                toast('Parceria padrão atualizada');
                onSaved?.();
              } catch (err) {
                toast(err.message, 'error');
              }
            },
          }, ['Salvar padrão']),
        ]),
      ]),
    ]);
  }

  function filterManagers(list) {
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((m) =>
      (m.name || '').toLowerCase().includes(q)
      || (m.phone || '').includes(q));
  }

  function textAction(label, onClick, primary = false) {
    return el('button', {
      className: `admin-btn admin-btn--sm admin-mgr-table-btn${primary ? ' admin-btn--primary' : ' admin-btn--ghost'}`,
      type: 'button',
      onClick,
    }, [label]);
  }

  function buildList(list) {
    allManagers = list;
    const totalPlatform = list.reduce((s, m) => s + (m.platform_revenue || 0), 0);
    const totalInfluencers = list.reduce((s, m) => s + (m.influencers_count || 0), 0);
    const activeCount = list.filter((m) => m.status === 'ativo').length;
    const tableHost = el('div', { className: 'admin-mgr-table-host' });
    const countEl = el('span', { className: 'admin-muted-text admin-mgr-count' }, [
      `${filterManagers(allManagers).length} de ${allManagers.length}`,
    ]);

    function renderTable() {
      const filtered = filterManagers(allManagers);
      countEl.textContent = `${filtered.length} de ${allManagers.length}`;
      if (!filtered.length) {
        tableHost.replaceChildren(el('p', { className: 'admin-empty admin-empty--sm' }, [
          searchQuery ? 'Nenhum gerente encontrado para esta busca.' : 'Nenhum gerente cadastrado.',
        ]));
        return;
      }

      tableHost.replaceChildren(DataTable({
        columns: [
          { key: 'name', label: 'Nome' },
          { key: 'phone', label: 'WhatsApp' },
          { key: 'commission_pct', label: '% Parceria', render: (r) => `${r.commission_pct}%` },
          { key: 'influencers_count', label: 'Influenciadores' },
          {
            key: 'platform_revenue',
            label: 'Gera p/ plataforma',
            render: (r) => el('span', { className: 'admin-money' }, [fmtMoney(r.platform_revenue)]),
          },
          {
            key: 'montante_balance',
            label: 'Saldo',
            render: (r) => el('span', { className: 'admin-money' }, [fmtMoney(r.montante_balance)]),
          },
          { key: 'status', label: 'Status', render: (r) => StatusBadge(r.status) },
        ],
        rows: filtered,
        actions: (row) => [
          textAction('Gerenciar', () => { selectedId = row.id; refresh(); }, true),
          textAction('Copiar link', () => copyLink(row.link)),
        ],
      }));
    }

    renderTable();

    return el('div', { className: 'admin-mgr-hub' }, [
      el('header', { className: 'admin-mgr-hero' }, [
        el('div', { className: 'admin-mgr-hero__text' }, [
          el('h2', { className: 'admin-mgr-hero__title' }, ['Rede de gerentes']),
          el('p', { className: 'admin-mgr-hero__sub' }, [
            'Parceiros, comissões e influenciadores vinculados à plataforma.',
          ]),
        ]),
        el('div', { className: 'admin-mgr-hero__badge' }, [
          el('strong', {}, [String(list.length)]),
          el('span', {}, [' cadastrados']),
        ]),
      ]),

      el('div', { className: 'admin-mgr-stats' }, [
        mgrStatCard('Gerentes ativos', String(activeCount), `${list.length} no total`, 'active'),
        mgrStatCard('Receita plataforma', fmtMoney(totalPlatform), 'Comissão da rede', 'revenue'),
        mgrStatCard('Influenciadores na rede', String(totalInfluencers), 'Vinculados aos gerentes', 'network'),
      ]),

      buildDefaultPctPanel(refresh),

      el('div', { className: 'admin-panel admin-panel--compact admin-mgr-table-panel' }, [
        el('div', { className: 'admin-panel__head admin-mgr-table-panel__head' }, [
          el('div', { className: 'admin-panel__head-left' }, [
            el('h2', { className: 'admin-panel__title' }, ['Gerentes']),
            countEl,
          ]),
          el('div', { className: 'admin-panel__head-right admin-mgr-toolbar' }, [
            SearchInput({
              placeholder: 'Buscar gerente…',
              onSearch: (q) => {
                searchQuery = q;
                renderTable();
              },
            }),
            el('button', {
              className: 'admin-btn admin-btn--primary admin-btn--sm',
              type: 'button',
              onClick: () => openCreate(refresh),
            }, ['Novo gerente']),
          ]),
        ]),
        tableHost,
      ]),
    ]);
  }

  function mgrStatCard(label, value, hint, tone) {
    return el('article', { className: `admin-mgr-stat admin-mgr-stat--${tone} reveal` }, [
      el('span', { className: 'admin-mgr-stat__label' }, [label]),
      el('strong', { className: 'admin-mgr-stat__value' }, [value]),
      el('span', { className: 'admin-mgr-stat__hint' }, [hint]),
    ]);
  }

  function buildDetail(manager, influencers) {
    const pctInput = el('input', {
      className: 'admin-input admin-input--sm',
      type: 'number',
      min: '1',
      max: '99',
      step: '0.01',
      value: String(manager.commission_pct),
    });
    const platformHint = el('p', { className: 'admin-muted-text admin-hint' }, [
      `Plataforma recebe ${100 - manager.commission_pct}% das comissões deste gerente.`,
    ]);

    pctInput.addEventListener('input', () => {
      const v = Number(pctInput.value);
      if (v >= 1 && v <= 99) {
        platformHint.textContent = `Plataforma recebe ${(100 - v).toFixed(v % 1 ? 2 : 0)}% das comissões deste gerente.`;
      }
    });

    return el('div', { className: 'admin-detail' }, [
      el('div', { className: 'admin-detail__head' }, [
        el('button', {
          className: 'admin-btn admin-btn--ghost admin-btn--sm',
          type: 'button',
          onClick: () => { selectedId = null; refresh(); },
        }, ['← Voltar']),
        el('h2', { className: 'admin-detail__title' }, [manager.name]),
        el('span', { className: 'admin-muted-text' }, [manager.phone]),
      ]),
      el('div', { className: 'admin-stats admin-stats--5 admin-stats--inline' }, [
        statMini('Parceria', `${manager.commission_pct}%`),
        statMini('Plataforma', `${100 - manager.commission_pct}%`),
        statMini('Influenciadores', String(manager.influencers_count)),
        statMini('Indicados', String(manager.referrals)),
        statMini('Saldo gerente', fmtMoney(manager.montante_balance)),
        statMini('Gera p/ você', fmtMoney(manager.platform_revenue)),
      ]),
      el('div', { className: 'admin-panel admin-panel--compact', style: 'margin:0.75rem 0' }, [
        el('h3', { className: 'admin-widget__title' }, ['Percentual da parceria']),
        el('p', { className: 'admin-muted-text admin-hint' }, [
          `Padrão atual da plataforma: ${defaultCommissionPct}%. Este gerente pode ter um valor individual.`,
        ]),
        el('div', { className: 'mgr-default-pct__row' }, [
          el('label', { className: 'admin-field mgr-default-pct__field' }, [
            el('span', { className: 'admin-field__label' }, ['% do gerente']),
            pctInput,
          ]),
          el('button', {
            className: 'admin-btn admin-btn--primary admin-btn--sm',
            type: 'button',
            onClick: async () => {
              const pct = Number(pctInput.value);
              if (!pct || pct < 1 || pct > 99) {
                toast('Informe um percentual entre 1 e 99', 'error');
                return;
              }
              try {
                await managersApi.update(manager.id, { commission_pct: pct });
                toast('Parceria do gerente atualizada');
                refresh();
              } catch (err) {
                toast(err.message, 'error');
              }
            },
          }, ['Salvar %']),
        ]),
        platformHint,
        el('p', { className: 'admin-hint' }, [
          'Influenciadores deste gerente não podem ter % maior que o limite dele.',
        ]),
      ]),
      el('div', { className: 'admin-panel admin-panel--compact', style: 'margin:0.75rem 0' }, [
        el('p', { className: 'admin-muted-text' }, ['Link de cadastro de influenciadores:']),
        el('code', { className: 'admin-clip', style: 'display:block;margin:0.5rem 0' }, [manager.link]),
        el('button', {
          className: 'admin-btn admin-btn--ghost admin-btn--sm',
          type: 'button',
          onClick: () => copyLink(manager.link),
        }, ['Copiar link']),
      ]),
      el('div', { className: 'admin-panel admin-panel--compact' }, [
        el('h3', { className: 'admin-widget__title' }, [`Influenciadores do gerente (${influencers.length})`]),
        el('p', { className: 'admin-muted-text admin-hint' }, [
          'Clique em Ver histórico para comissões, indicados, saques e atividade do influenciador.',
        ]),
        influencers.length
          ? DataTable({
            compact: true,
            columns: [
              { key: 'name', label: 'Nome' },
              { key: 'phone', label: 'WhatsApp' },
              { key: 'montante_pct', label: '% Inf.', render: (r) => `${r.montante_pct}%` },
              { key: 'referrals', label: 'Indicados' },
              { key: 'depositors', label: 'Depositantes' },
              { key: 'montante_total', label: 'Montante', render: (r) => fmtMoney(r.montante_total) },
              { key: 'montante_balance', label: 'Saldo inf.', render: (r) => fmtMoney(r.montante_balance) },
              { key: 'status', label: 'Status', render: (r) => StatusBadge(r.status) },
            ],
            rows: influencers,
            actions: (row) => [
              textAction('Ver histórico', () => {
                selectedInfluencerId = row.id;
                refresh();
              }, true),
            ],
          })
          : el('p', { className: 'admin-empty admin-empty--sm' }, ['Nenhum influenciador ainda.']),
      ]),
    ]);
  }

  function statMini(label, value) {
    return el('div', { className: 'admin-stat-mini' }, [
      el('span', { className: 'admin-stat-mini__label' }, [label]),
      el('strong', { className: 'admin-stat-mini__value' }, [String(value)]),
    ]);
  }

  function openCreate(cb) {
    let modalRef;
    const form = el('form', { className: 'admin-form-grid admin-form-grid--dense' }, [
      field('name', 'Nome'),
      field('phone', 'WhatsApp'),
      field('password', 'Senha', 'password'),
      field('commission_pct', 'Percentual da parceria (%)', 'number', String(defaultCommissionPct)),
    ]);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      try {
        await managersApi.create({
          name: fd.get('name'),
          phone: fd.get('phone'),
          password: fd.get('password'),
          commission_pct: Number(fd.get('commission_pct')),
        });
        toast('Gerente criado');
        modalRef.close();
        cb();
      } catch (err) {
        toast(err.message, 'error');
      }
    });
    modalRef = openModal({
      title: 'Novo gerente',
      body: form,
      footer: el('button', {
        className: 'admin-btn admin-btn--primary admin-btn--sm',
        type: 'button',
        onClick: () => form.requestSubmit(),
      }, ['Criar']),
    });
  }

  function field(name, label, type = 'text', value = '') {
    return el('label', { className: 'admin-field' }, [
      el('span', { className: 'admin-field__label' }, [label]),
      el('input', { className: 'admin-input admin-input--sm', name, type, value, required: true }),
    ]);
  }

  function copyLink(link) {
    navigator.clipboard?.writeText(link);
    toast('Link copiado');
  }

  page.append(host);
  refresh();
  return page;
}
