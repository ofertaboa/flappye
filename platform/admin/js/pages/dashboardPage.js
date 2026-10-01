import { el, fmtMoney, fmtDate } from '../utils.js';
import { DateFilter } from '../ui/dateFilter.js';
import {
  StatCard, WidgetCard, ChartCard, createChartCanvas,
  drawComparisonChart, legendItem,
} from '../ui/charts.js';
import { StatusBadge } from '../ui/table.js';
import { dashboardApi } from '../api/dashboard.js';

export function renderDashboardPage() {
  const page = el('div', { className: 'admin-page admin-page--dash' });
  const statsWrap = el('div', { className: 'admin-stats admin-stats--3' });
  const chartHost = el('div', { className: 'admin-dash-chart' });
  const midRow = el('div', { className: 'admin-dash-grid' });
  const depositCanvas = createChartCanvas('admin-chart', 220);

  async function load(range) {
    statsWrap.replaceChildren(
      StatCard({ icon: '👤', label: 'Usuários cadastrados', loading: true }),
      StatCard({ icon: '💰', label: 'Valor depositado', loading: true }),
      StatCard({ icon: '💸', label: 'Valor sacado', loading: true }),
    );
    try {
      const data = await dashboardApi.get(range);
      statsWrap.replaceChildren(
        StatCard({ icon: '👤', label: 'Usuários cadastrados', value: data.usersCount }),
        StatCard({ icon: '💰', label: 'Valor depositado', value: data.deposited }),
        StatCard({ icon: '💸', label: 'Valor sacado', value: data.withdrawn }),
      );

      chartHost.replaceChildren(ChartCard({
        title: 'Depósitos — comparativo por período',
        subtitle: 'Verde = pagos · Branco = pendentes',
        canvas: depositCanvas,
        legend: [
          legendItem('#22c55e', 'Pagos'),
          legendItem('#ffffff', 'Pendentes'),
        ],
      }));

      midRow.replaceChildren(
        WidgetCard({ title: 'Últimos depósitos', children: miniList(
          data.lastDeposits.map((d) => [
            d.user_name,
            el('span', { className: 'admin-money' }, [fmtMoney(d.amount)]),
            fmtDate(d.created_at).split(' ')[1] || fmtDate(d.created_at),
            StatusBadge(d.status),
          ]),
          ['Usuário', 'Valor', 'Horário', 'Status'],
        ) }),
        WidgetCard({ title: 'Últimos usuários', children: miniList(
          data.lastUsers.map((u) => [u.name, u.phone || '—', fmtDate(u.created_at || u.last_access).split(',')[0]]),
          ['Nome', 'Telefone', 'Cadastro'],
        ) }),
        WidgetCard({
          title: 'Configuração da plataforma',
          className: 'admin-widget--config',
          children: el('dl', { className: 'admin-kv' }, [
            kv('Modo do jogo', data.platform.difficulty),
            kv('Rollover', `${data.platform.rollover}x`),
            kv('Indicação (normal)', `${fmtMoney(data.platform.referralReward)} / dep. ${fmtMoney(data.platform.referralMinDeposit)}`),
            kv('Valor por cano', fmtMoney(data.platform.winPerPipe)),
            kv('Status', data.platform.status),
          ]),
        }),
      );

      requestAnimationFrame(() => {
        drawComparisonChart(depositCanvas, {
          labels: data.depositChart.labels,
          datasets: [data.depositChart.paid, data.depositChart.pending],
          colors: ['#22c55e', '#ffffff'],
          seriesLabels: ['Total pagos', 'Total pendentes'],
        });
      });
    } catch (err) {
      console.error(err);
      statsWrap.replaceChildren(el('p', { className: 'admin-alert admin-alert--error' }, [`Erro: ${err.message}`]));
    }
  }

  page.append(
    el('div', { className: 'admin-page__toolbar admin-page__toolbar--compact' }, [
      DateFilter({ initial: 'today', onChange: ({ range }) => load(range) }),
    ]),
    statsWrap,
    chartHost,
    midRow,
  );

  return page;
}

function miniList(rows, headers) {
  if (!rows.length) return el('p', { className: 'admin-empty admin-empty--sm' }, ['Nenhum registro.']);
  return el('div', { className: 'admin-mini-table-wrap' }, [
    el('table', { className: 'admin-mini-table' }, [
      el('thead', {}, [el('tr', {}, headers.map((h) => el('th', {}, [h])))]),
      el('tbody', {}, rows.map((r) => el('tr', {}, r.map((c) => el('td', {}, [c instanceof Node ? c : String(c)]))))),
    ]),
  ]);
}

function kv(label, value) {
  return el('div', { className: 'admin-kv__row' }, [
    el('dt', {}, [label]),
    el('dd', {}, [String(value)]),
  ]);
}
