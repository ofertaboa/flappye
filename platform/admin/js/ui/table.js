import { el } from '../utils.js';

export function DataTable({ columns, rows, actions, emptyText = 'Nenhum registro encontrado.', compact = false }) {
  if (!rows.length) {
    return el('div', { className: 'admin-empty' }, [emptyText]);
  }

  const tableCls = `admin-table${compact ? ' admin-table--compact admin-table--dense' : ''}`;

  const thead = el('thead', {}, [
    el('tr', {}, [
      ...columns.map((c) => el('th', {}, [c.label])),
      actions ? el('th', { className: 'admin-table__actions-col' }, ['Ações']) : null,
    ].filter(Boolean)),
  ]);

  const tbody = el('tbody', {}, rows.map((row) => {
    const cells = columns.map((c) => {
      const val = c.render ? c.render(row) : row[c.key];
      return el('td', {}, [val ?? '—']);
    });
    if (actions) {
      cells.push(el('td', { className: 'admin-table__actions' }, [
        el('div', { className: 'admin-table__actions-inner' }, actions(row)),
      ]));
    }
    return el('tr', {}, cells);
  }));

  return el('div', { className: 'admin-table-wrap' }, [
    el('table', { className: tableCls }, [thead, tbody]),
  ]);
}

export function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return el('div');

  const btn = (p, label, disabled = false) => el('button', {
    className: `admin-page-btn${p === page ? ' is-active' : ''}`,
    type: 'button',
    disabled,
    onClick: () => onPage(p),
  }, [label]);

  const items = [];
  items.push(btn(page - 1, '‹', page <= 1));
  for (let i = 1; i <= totalPages; i += 1) {
    if (totalPages > 7 && Math.abs(i - page) > 2 && i !== 1 && i !== totalPages) {
      if (i === 2 || i === totalPages - 1) items.push(el('span', { className: 'admin-page-dots' }, ['…']));
      continue;
    }
    items.push(btn(i, String(i)));
  }
  items.push(btn(page + 1, '›', page >= totalPages));

  return el('nav', { className: 'admin-pagination', 'aria-label': 'Paginação' }, items);
}

export function SearchInput({ placeholder = 'Buscar...', onSearch }) {
  let timer;
  return el('div', { className: 'admin-search' }, [
    el('svg', { viewBox: '0 0 24 24', width: '18', height: '18', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [
      el('circle', { cx: '11', cy: '11', r: '8' }),
      el('path', { d: 'M21 21l-4.35-4.35' }),
    ]),
    el('input', {
      className: 'admin-input admin-search__input',
      type: 'search',
      placeholder,
      onInput: (e) => {
        clearTimeout(timer);
        timer = setTimeout(() => onSearch?.(e.target.value.trim()), 280);
      },
    }),
  ]);
}

export function StatusBadge(status) {
  const map = {
    ativo: 'success', active: 'success', aprovado: 'success', pago: 'success', disponivel: 'success',
    pendente: 'warning', em_andamento: 'warning', processando: 'warning',
    bloqueado: 'danger', recusado: 'danger', inativo: 'neutral', cancelado: 'danger',
    sandbox: 'info', producao: 'success',
  };
  const labels = {
    aprovado: 'Aprovado',
    pendente: 'Pendente',
    recusado: 'Recusado',
    pago: 'Pago',
    ativo: 'Ativo',
    bloqueado: 'Bloqueado',
    inativo: 'Inativo',
    cancelado: 'Cancelado',
  };
  const key = String(status).toLowerCase();
  const cls = map[key] || 'neutral';
  const text = labels[key] || String(status);
  return el('span', { className: `admin-badge admin-badge--${cls}` }, [text]);
}

export function ActionBtn({ label, icon, onClick, danger = false }) {
  return el('button', {
    className: `admin-icon-btn${danger ? ' admin-icon-btn--danger' : ''}`,
    type: 'button',
    title: label,
    'aria-label': label,
    onClick,
  }, [icon || label.slice(0, 1)]);
}
