import { el, fmtMoney, fmtDate } from '../utils.js';
import { DataTable, Pagination, StatusBadge } from '../ui/table.js';
import { DateFilter, getPeriodRange } from '../ui/dateFilter.js';
import { openModal } from '../ui/modal.js';
import { confirmDialog } from '../ui/modal.js';
import { toast } from '../ui/toast.js';
import { paymentsApi } from '../api/payments.js';
import { showLoading, hideLoading } from '../ui/loading.js';

const PAGE_SIZE = 10;

const TYPE_LABELS = {
  saldo: 'Saldo',
  influenciador: 'Influenciador',
  gerente: 'Gerente',
};

const TYPE_BADGE = {
  saldo: '',
  influenciador: 'admin-badge--warning',
  gerente: 'admin-badge--info',
};

export function renderWithdrawalsPage() {
  const page = el('div', { className: 'admin-page admin-page--withdrawals' });
  let items = [];
  let pageNum = 1;
  let filters = { range: getPeriodRange('30d'), status: 'todos', type: 'todos' };

  const statsHost = el('div', { className: 'admin-deposit-stats admin-deposit-stats--withdrawals' });
  const tableHost = el('div');
  const pagHost = el('div');
  const countLabel = el('span', { className: 'admin-muted-text' }, ['0 registros']);
  let allInPeriod = [];

  const statusSelect = el('select', { className: 'admin-select admin-input--sm' }, [
    option('todos', 'Todos status'),
    option('aprovado', 'Aprovado'),
    option('pendente', 'Pendente'),
    option('recusado', 'Recusado'),
  ]);

  const typeSelect = el('select', { className: 'admin-select admin-input--sm' }, [
    option('todos', 'Todos tipos'),
    option('saldo', 'Saldo (usuário)'),
    option('gerente', 'Gerente'),
    option('influenciador', 'Influenciador'),
  ]);

  async function load() {
    showLoading();
    try {
      allInPeriod = await paymentsApi.listWithdrawals({
        range: filters.range,
        status: 'todos',
      });
      applyFilters();
      pageNum = 1;
      render();
    } finally {
      hideLoading();
    }
  }

  function applyFilters() {
    const status = statusSelect.value;
    const type = typeSelect.value;
    filters.status = status;
    filters.type = type;

    items = allInPeriod.filter((w) => {
      if (status !== 'todos' && w.status !== status) return false;
      if (type !== 'todos' && w.type !== type) return false;
      return true;
    });
  }

  function sumAmount(list) {
    return list.reduce((s, w) => s + (Number(w.amount) || 0), 0);
  }

  function computeStats(list) {
    const aprovados = list.filter((w) => w.status === 'aprovado');
    const recusados = list.filter((w) => w.status === 'recusado');
    const pendentes = list.filter((w) => w.status === 'pendente');
    return {
      solicitados: { count: list.length, total: sumAmount(list) },
      aprovados: { count: aprovados.length, total: sumAmount(aprovados) },
      recusados: { count: recusados.length, total: sumAmount(recusados) },
      pendentes: { count: pendentes.length, total: sumAmount(pendentes) },
    };
  }

  function render() {
    const stats = computeStats(items);
    countLabel.textContent = `${items.length} registros`;

    statsHost.replaceChildren(
      withdrawStat(stats.pendentes.count, stats.pendentes.total, 'Pendentes de aprovação'),
      withdrawStat(stats.aprovados.count, stats.aprovados.total, 'Aprovados · valor liberado'),
      withdrawStat(stats.recusados.count, stats.recusados.total, 'Recusados'),
    );

    const start = (pageNum - 1) * PAGE_SIZE;
    const slice = items.slice(start, start + PAGE_SIZE);

    tableHost.replaceChildren(DataTable({
      compact: true,
      columns: [
        { key: 'id', label: 'ID' },
        {
          key: 'type',
          label: 'Tipo',
          render: (r) => el('span', {
            className: `admin-badge ${TYPE_BADGE[r.type] || 'admin-badge--neutral'}`.trim(),
          }, [TYPE_LABELS[r.type] || r.type]),
        },
        {
          key: 'subject_name',
          label: 'Nome',
          render: (r) => r.subject_name || r.user_name || '—',
        },
        {
          key: 'manager_name',
          label: 'Gerente',
          render: (r) => {
            if (r.type === 'gerente') return el('span', { className: 'admin-muted-text' }, ['—']);
            if (r.type === 'influenciador') {
              return r.manager_name
                ? el('strong', {}, [r.manager_name])
                : el('span', { className: 'admin-muted-text' }, ['Sem gerente']);
            }
            return el('span', { className: 'admin-muted-text' }, ['—']);
          },
        },
        {
          key: 'amount',
          label: 'Valor',
          render: (r) => el('span', { className: 'admin-table-value' }, [fmtMoney(r.amount)]),
        },
        { key: 'status', label: 'Status', render: (r) => StatusBadge(r.status) },
        { key: 'created_at', label: 'Data', render: (r) => fmtDate(r.created_at) },
      ],
      rows: slice,
      actions: (row) => [
        actionChip('Visualizar', 'view', () => view(row)),
        row.status === 'pendente' ? actionChip('Aprovar', 'approve', () => approve(row)) : null,
        row.status === 'pendente' ? actionChip('Recusar', 'reject', () => reject(row)) : null,
      ].filter(Boolean),
    }));

    pagHost.replaceChildren(Pagination({
      page: pageNum,
      totalPages: Math.ceil(items.length / PAGE_SIZE) || 1,
      onPage: (p) => { pageNum = p; render(); },
    }));
  }

  function view(row) {
    const title = row.type === 'gerente'
      ? `Saque Gerente #${row.id}`
      : row.type === 'influenciador'
        ? `Saque Influenciador #${row.id}`
        : `Saque #${row.id}`;

    const rows = [
      kv('Tipo', TYPE_LABELS[row.type] || row.type),
      kv('Nome', row.subject_name || row.user_name),
    ];

    if (row.type === 'influenciador') {
      rows.push(kv('Gerente', row.manager_name || 'Sem gerente vinculado'));
    }
    if (row.type === 'gerente') {
      rows.push(kv('Perfil', 'Gerente de influenciadores'));
    }

    rows.push(
      kv('Telefone', row.phone || '—'),
      kv('CPF', row.cpf || '—'),
      kv('Tipo PIX', row.pix_type || 'CPF'),
      kv('Chave PIX', row.pix_key || '—'),
      kv('Valor', fmtMoney(row.amount)),
      kv('Status', row.status),
      kv('Data', fmtDate(row.created_at)),
    );

    openModal({
      title,
      body: el('dl', { className: 'admin-kv' }, rows),
    });
  }

  async function approve(row) {
    const who = row.type === 'gerente'
      ? `gerente ${row.subject_name || row.user_name}`
      : row.type === 'influenciador'
        ? `influenciador ${row.subject_name || row.user_name}${row.manager_name ? ` (gerente: ${row.manager_name})` : ''}`
        : row.subject_name || row.user_name;

    const ok = await confirmDialog({
      title: row.type === 'influenciador' ? 'Aprovar saque de montante' : row.type === 'gerente' ? 'Aprovar saque de gerente' : 'Aprovar saque',
      message: `Enviar ${fmtMoney(row.amount)} para ${who}?\n\nCPF: ${row.cpf || '—'}\nPIX (${row.pix_type || 'CPF'}): ${row.pix_key || '—'}`,
    });
    if (!ok) return;
    try {
      await paymentsApi.approveWithdrawal(row.id);
      toast('Saque aprovado — enviado via gateway PIX');
      load();
    } catch (err) {
      toast(err.message || 'Erro ao aprovar saque', 'error');
    }
  }

  async function reject(row) {
    const ok = await confirmDialog({
      title: 'Recusar saque',
      message: `Recusar saque de ${fmtMoney(row.amount)} de ${row.subject_name || row.user_name}? O saldo será devolvido.`,
      danger: true,
      confirmLabel: 'Recusar',
    });
    if (!ok) return;
    try {
      await paymentsApi.rejectWithdrawal(row.id);
      toast('Saque recusado — saldo devolvido', 'info');
      load();
    } catch (err) {
      toast(err.message || 'Erro ao recusar saque', 'error');
    }
  }

  statusSelect.addEventListener('change', () => { applyFilters(); pageNum = 1; render(); });
  typeSelect.addEventListener('change', () => { applyFilters(); pageNum = 1; render(); });

  page.append(el('div', { className: 'admin-panel admin-panel--compact admin-panel--withdrawals' }, [
    el('div', { className: 'admin-panel__head' }, [
      el('div', { className: 'admin-panel__head-left' }, [
        el('h2', { className: 'admin-panel__title' }, ['Saques']),
        el('p', { className: 'admin-muted-text admin-panel__sub' }, [
          'Usuários · Gerentes · Influenciadores (montante)',
        ]),
        countLabel,
      ]),
      el('div', { className: 'admin-panel__head-right admin-page__filters' }, [
        DateFilter({ initial: '30d', onChange: ({ range }) => { filters.range = range; load(); } }),
        typeSelect,
        statusSelect,
        el('button', {
          className: 'admin-btn admin-btn--primary admin-btn--sm',
          type: 'button',
          onClick: load,
        }, ['Atualizar']),
      ]),
    ]),
    statsHost,
    tableHost,
    pagHost,
  ]));

  load();
  return page;
}

function actionChip(label, tone, onClick) {
  return el('button', {
    className: `admin-action-chip admin-action-chip--${tone}`,
    type: 'button',
    onClick,
  }, [label]);
}

function withdrawStat(count, total, label) {
  return el('div', { className: 'admin-deposit-stat' }, [
    el('strong', { className: 'admin-deposit-stat__value' }, [String(count)]),
    el('span', { className: 'admin-deposit-stat__money' }, [fmtMoney(total)]),
    el('span', { className: 'admin-deposit-stat__label' }, [label]),
  ]);
}

function kv(label, value) {
  return el('div', { className: 'admin-kv__row' }, [
    el('dt', {}, [label]),
    el('dd', {}, [String(value)]),
  ]);
}

function option(v, l) {
  return el('option', { value: v }, [l]);
}
