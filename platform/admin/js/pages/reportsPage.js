import { el } from '../utils.js';
import { toast } from '../ui/toast.js';
import { api } from '../mock/api.js';
import { showLoading, hideLoading } from '../ui/loading.js';

const REPORTS = [
  { id: 'usuarios', title: 'Usuários', desc: 'Cadastros, status e saldos' },
  { id: 'depositos', title: 'Depósitos', desc: 'Transações por gateway e período' },
  { id: 'saques', title: 'Saques', desc: 'Solicitações e aprovações' },
  { id: 'lucro', title: 'Lucro', desc: 'Receita e margem da plataforma' },
  { id: 'presentes', title: 'Presentes', desc: 'Campanhas e resgates' },
  { id: 'cupons', title: 'Cupons', desc: 'Utilização e conversão' },
  { id: 'influenciadores', title: 'Influenciadores', desc: 'Indicações e comissões' },
];

const FORMATS = [
  { id: 'xlsx', label: 'Excel' },
  { id: 'csv', label: 'CSV' },
  { id: 'pdf', label: 'PDF' },
];

export function renderReportsPage() {
  const page = el('div', { className: 'admin-page' });

  const cards = el('div', { className: 'admin-report-cards' });
  REPORTS.forEach((r) => {
    const card = el('article', { className: 'admin-report-card reveal' }, [
      el('h3', { className: 'admin-report-card__title' }, [r.title]),
      el('p', { className: 'admin-report-card__desc' }, [r.desc]),
      el('div', { className: 'admin-page__filters', style: 'margin-top:0.75rem' }, FORMATS.map((f) =>
        el('button', {
          className: 'admin-btn admin-btn--ghost admin-btn--sm',
          type: 'button',
          onClick: () => exportReport(r.id, f.id, f.label),
        }, [f.label]),
      )),
    ]);
    cards.append(card);
  });

  async function exportReport(type, format, label) {
    showLoading();
    try {
      const result = await api.exportReport(type, format);
      toast(`Relatório ${label} gerado: ${result.filename} (${result.rows} registros)`, 'info');
    } finally {
      hideLoading();
    }
  }

  page.append(
    el('div', { className: 'admin-panel' }, [
      el('h2', { className: 'admin-panel__title' }, ['Relatórios']),
      el('p', { className: 'admin-topbar__sub', style: 'margin:0 0 1rem' }, ['Exportação preparada para integração com API']),
      cards,
    ]),
  );

  return page;
}
