import { el, fmtMoney, fmtDate } from '../utils.js';
import { DataTable, Pagination, StatusBadge, SearchInput } from '../ui/table.js';
import { DateFilter, getPeriodRange } from '../ui/dateFilter.js';
import { depositsApi } from '../api/deposits.js';
import { showLoading, hideLoading } from '../ui/loading.js';
import { toast } from '../ui/toast.js';

const PAGE_SIZE = 10;

export function renderDepositsPage() {
  const page = el('div', { className: 'admin-page' });
  let allItems = [];
  let pageNum = 1;
  let query = '';
  let filters = { range: getPeriodRange('30d'), status: 'todos' };

  const statsHost = el('div', { className: 'admin-deposit-stats' });
  const tableHost = el('div');
  const pagHost = el('div');
  const countLabel = el('span', { className: 'admin-muted-text' }, ['0 registros']);

  const statusSelect = el('select', { className: 'admin-select admin-input--sm' }, [
    option('todos', 'Todos'),
    option('aprovado', 'Aprovado'),
    option('pendente', 'Pendente'),
    option('recusado', 'Recusado'),
  ]);

  async function load() {
    showLoading();
    try {
      allItems = await depositsApi.list({
        range: filters.range,
        status: statusSelect.value,
      });
      pageNum = 1;
      render();
    } finally {
      hideLoading();
    }
  }

  function filterByUser(list) {
    if (!query) return list;
    const q = query.toLowerCase();
    return list.filter((d) => {
      const name = String(d.user_name || '').toLowerCase();
      const id = String(d.user_id ?? '');
      return name.includes(q) || id.includes(q);
    });
  }

  function render() {
    const items = filterByUser(allItems);
    const { gerados, pagos, taxa } = computeStats(allItems);
    countLabel.textContent = query
      ? `${items.length} de ${allItems.length} registros`
      : `${items.length} registros`;

    statsHost.replaceChildren(
      depositStat(String(gerados), 'Depósitos gerados'),
      depositStat(String(pagos), 'Depósitos pagos'),
      depositStat(`${taxa}%`, 'Taxa de conversão'),
    );

    const start = (pageNum - 1) * PAGE_SIZE;
    const slice = items.slice(start, start + PAGE_SIZE);

    tableHost.replaceChildren(DataTable({
      columns: [
        { key: 'id', label: 'ID' },
        { key: 'user_name', label: 'Usuário' },
        {
          key: 'amount',
          label: 'Valor',
          render: (r) => el('span', { className: 'admin-table-value' }, [fmtMoney(r.amount)]),
        },
        { key: 'status', label: 'Status', render: (r) => StatusBadge(r.status) },
        { key: 'created_at', label: 'Data', render: (r) => fmtDate(r.created_at) },
        {
          key: 'actions',
          label: 'Ação',
          render: (r) => {
            if (r.status !== 'pendente') {
              return el('span', { className: 'admin-muted-text' }, ['—']);
            }
            return el('button', {
              type: 'button',
              className: 'admin-btn admin-btn--primary admin-btn--sm',
              onClick: async () => {
                if (!window.confirm(`Creditar R$ ${Number(r.amount).toFixed(2)} para ${r.user_name || 'usuário'}?`)) {
                  return;
                }
                showLoading();
                try {
                  await depositsApi.approve(r.id);
                  toast('Depósito creditado no saldo.');
                  await load();
                } catch (err) {
                  toast(err.message || 'Falha ao aprovar depósito.', 'error');
                } finally {
                  hideLoading();
                }
              },
            }, ['Creditar']);
          },
        },
      ],
      rows: slice,
    }));

    pagHost.replaceChildren(Pagination({
      page: pageNum,
      totalPages: Math.ceil(items.length / PAGE_SIZE) || 1,
      onPage: (p) => { pageNum = p; render(); },
    }));
  }

  function computeStats(list) {
    const gerados = list.length;
    const pagos = list.filter((d) => d.status === 'aprovado').length;
    const taxa = gerados ? ((pagos / gerados) * 100).toFixed(1) : '0';
    return { gerados, pagos, taxa };
  }

  page.append(el('div', { className: 'admin-panel admin-panel--compact' }, [
    el('div', { className: 'admin-panel__head' }, [
      el('div', { className: 'admin-panel__head-left' }, [
        el('h2', { className: 'admin-panel__title' }, ['Depósitos']),
        countLabel,
      ]),
      el('div', { className: 'admin-panel__head-right admin-page__filters' }, [
        SearchInput({
          placeholder: 'Buscar usuário...',
          onSearch: (q) => { query = q; pageNum = 1; render(); },
        }),
        DateFilter({ initial: '30d', onChange: ({ range }) => { filters.range = range; load(); } }),
        statusSelect,
        el('button', { className: 'admin-btn admin-btn--primary admin-btn--sm', type: 'button', onClick: load }, ['Filtrar']),
      ]),
    ]),
    statsHost,
    tableHost,
    pagHost,
  ]));

  load();
  return page;
}

function depositStat(value, label) {
  return el('div', { className: 'admin-deposit-stat' }, [
    el('strong', { className: 'admin-deposit-stat__value' }, [value]),
    el('span', { className: 'admin-deposit-stat__label' }, [label]),
  ]);
}

function option(v, l) {
  return el('option', { value: v }, [l]);
}
