import { el, fmtMoney, fmtDate } from '../utils.js';
import { DataTable, ActionBtn, StatusBadge, SearchInput } from '../ui/table.js';
import { StatCard, WidgetCard } from '../ui/charts.js';
import { DateFilter, getPeriodRange } from '../ui/dateFilter.js';
import { toast } from '../ui/toast.js';
import { buildInfluencerDetailPanel } from '../ui/influencerDetailPanel.js';
import { influencersApi } from '../api/influencers.js';

export function renderInfluencersPage() {
  const page = el('div', { className: 'admin-page admin-page--influencers' });
  const toolbarHost = el('div', { className: 'admin-page__toolbar admin-page__toolbar--compact' });
  const host = el('div', { className: 'admin-inf-hub' });

  let currentRange = getPeriodRange('today');
  let hubData = null;
  let searchQuery = '';
  let detailId = null;

  toolbarHost.append(DateFilter({
    initial: 'today',
    emitOnMount: false,
    onChange: ({ range }) => {
      currentRange = range;
      refresh();
    },
  }));

  async function refresh() {
    host.classList.add('is-loading');
    try {
      if (detailId) {
        toolbarHost.hidden = true;
        const data = await influencersApi.detail(detailId);
        host.replaceChildren(buildInfluencerDetailPanel(data, {
          onBack: backToHub,
          onRefresh: refresh,
          onAfterEndPartnership: backToHub,
        }));
      } else {
        toolbarHost.hidden = false;
        hubData = await influencersApi.hub(currentRange);
        host.replaceChildren(buildHub(hubData));
      }
    } catch (err) {
      host.replaceChildren(el('div', { className: 'admin-alert admin-alert--error' }, [err.message]));
    } finally {
      host.classList.remove('is-loading');
    }
  }

  function buildHub(data) {
    const wrap = el('div', { className: 'admin-inf-hub__inner' });
    const ov = data.overview || {};
    const list = filterList(data.influencers || []);

    wrap.append(
      el('header', { className: 'admin-inf-hero' }, [
        el('div', { className: 'admin-inf-hero__text' }, [
          el('h2', { className: 'admin-inf-hero__title' }, ['Central de Influenciadores']),
          el('p', { className: 'admin-inf-hero__sub' }, [
            'Todos os influenciadores da plataforma — diretos pelo admin ou vinculados a gerentes.',
          ]),
        ]),
        el('div', { className: 'admin-inf-hero__badge' }, [
          el('strong', {}, [String(ov.total_influencers || 0)]),
          el('span', {}, [' ativos']),
        ]),
      ]),

      el('div', { className: 'admin-stats admin-stats--5 admin-inf-stats' }, [
        StatCard({ icon: '⚡', label: 'Comissões hoje', value: ov.commissions_today ?? 0 }),
        StatCard({ icon: '💜', label: 'Comissões no período', value: ov.commissions_period ?? 0 }),
        StatCard({ icon: '💰', label: 'Saldo total (montante)', value: ov.total_balance ?? 0 }),
        StatCard({ icon: '⏳', label: 'Saques pendentes', value: ov.pending_withdrawals_amount ?? 0 }),
        StatCard({ icon: '✅', label: 'Pagos no período', value: ov.paid_withdrawals_period ?? 0 }),
      ]),

      el('div', { className: 'admin-inf-mid-grid' }, [
        buildRanking(data.ranking || []),
        buildRecentFeed(data.recent_commissions || []),
      ]),

      el('div', { className: 'admin-panel admin-panel--compact admin-inf-table-panel' }, [
        el('div', { className: 'admin-panel__head admin-inf-table-panel__head' }, [
          el('div', {}, [
            el('h2', { className: 'admin-panel__title' }, ['Base de influenciadores']),
            el('p', { className: 'admin-muted-text' }, [
              `${list.length} de ${(data.influencers || []).length} · ${ov.new_referrals_period || 0} novos indicados no período`,
            ]),
          ]),
          SearchInput({
            placeholder: 'Buscar por nome ou telefone…',
            onSearch: (q) => {
              searchQuery = q;
              host.querySelector('.admin-inf-table-host')?.replaceChildren(
                buildTable(filterList(data.influencers || [])),
              );
            },
          }),
        ]),
        el('div', { className: 'admin-inf-table-host' }, [buildTable(list)]),
      ]),
    );

    return wrap;
  }

  function filterList(list) {
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((r) =>
      (r.name || '').toLowerCase().includes(q)
      || (r.phone || '').includes(q));
  }

  function buildRanking(ranking) {
    const medals = ['🥇', '🥈', '🥉'];
    const body = ranking.length
      ? el('ol', { className: 'admin-inf-ranking' }, ranking.map((r, i) =>
        el('li', {
          className: `admin-inf-ranking__item${i < 3 ? ' admin-inf-ranking__item--top' : ''}`,
        }, [
          el('span', { className: 'admin-inf-ranking__pos' }, [medals[i] || `#${r.rank}`]),
          el('div', { className: 'admin-inf-ranking__info' }, [
            el('strong', { className: 'admin-inf-ranking__name' }, [r.name]),
            el('span', { className: 'admin-inf-ranking__meta' }, [
              `${r.referrals} indicados · ${r.depositors} depositantes`,
            ]),
          ]),
          el('div', { className: 'admin-inf-ranking__nums' }, [
            el('strong', { className: 'admin-money' }, [fmtMoney(r.commission_total)]),
            el('span', { className: 'admin-inf-ranking__today' }, [
              r.commission_today > 0 ? `+${fmtMoney(r.commission_today)} hoje` : '— hoje',
            ]),
          ]),
          el('button', {
            className: 'admin-btn admin-btn--ghost admin-btn--sm',
            type: 'button',
            onClick: () => openDetailById(r.id),
          }, ['Ver']),
        ])))
      : el('p', { className: 'admin-empty admin-empty--sm' }, ['Nenhum influenciador ainda.']);

    return WidgetCard({ title: '🏆 Top influenciadores', className: 'admin-widget--ranking', children: body });
  }

  function buildRecentFeed(items) {
    const body = items.length
      ? el('ul', { className: 'admin-inf-feed' }, items.map((item) =>
        el('li', { className: 'admin-inf-feed__item' }, [
          el('div', { className: 'admin-inf-feed__dot', 'aria-hidden': 'true' }),
          el('div', { className: 'admin-inf-feed__body' }, [
            el('strong', {}, [item.influencer_name]),
            el('span', { className: 'admin-inf-feed__detail' }, [
              ` recebeu comissão de ${item.referred_name}`,
            ]),
            el('time', { className: 'admin-inf-feed__time' }, [fmtDate(item.created_at)]),
          ]),
          el('span', { className: 'admin-inf-feed__amount admin-money' }, [
            fmtMoney(item.commission_amount),
          ]),
        ])))
      : el('p', { className: 'admin-empty admin-empty--sm' }, ['Nenhuma comissão no período.']);

    return WidgetCard({ title: '💸 Comissões recentes', className: 'admin-widget--feed', children: body });
  }

  function buildTable(list) {
    if (!list.length) {
      return el('div', { className: 'admin-empty' }, ['Nenhum influenciador encontrado.']);
    }

    return DataTable({
      compact: true,
      columns: [
        { key: 'name', label: 'Nome' },
        { key: 'phone', label: 'WhatsApp' },
        { key: 'manager_name', label: 'Gerente', render: (r) => r.manager_name || 'Direto' },
        {
          key: 'commission_today',
          label: 'Hoje',
          render: (r) => el('span', { className: r.commission_today > 0 ? 'admin-money' : '' }, [
            fmtMoney(r.commission_today || 0),
          ]),
        },
        {
          key: 'commission_total',
          label: 'Total ganho',
          render: (r) => el('span', { className: 'admin-money' }, [fmtMoney(r.commission_total || 0)]),
        },
        {
          key: 'montante_balance',
          label: 'Saldo',
          render: (r) => el('span', { className: 'admin-money' }, [fmtMoney(r.montante_balance || 0)]),
        },
        { key: 'referrals', label: 'Indicados' },
        { key: 'depositors', label: 'Depositantes' },
        {
          key: 'conversion_rate',
          label: 'Conversão',
          render: (r) => `${r.conversion_rate || 0}%`,
        },
        {
          key: 'montante_pct',
          label: '%',
          render: (r) => `${r.montante_pct}%`,
        },
        {
          key: 'status',
          label: 'Status',
          render: (r) => StatusBadge(r.pending_withdrawal ? 'pendente' : r.status),
        },
      ],
      rows: list,
      actions: (row) => [
        ActionBtn({ label: 'Gerenciar', icon: '→', onClick: () => openDetailById(row.id) }),
        ActionBtn({ label: 'Copiar', icon: '⎘', onClick: () => copyLink(row.link) }),
      ],
    });
  }

  function openDetailById(id) {
    detailId = id;
    refresh();
  }

  function backToHub() {
    detailId = null;
    refresh();
  }

  function copyLink(link) {
    navigator.clipboard?.writeText(link);
    toast('Link copiado', 'info');
  }

  page.append(toolbarHost, host);
  refresh();
  return page;
}
