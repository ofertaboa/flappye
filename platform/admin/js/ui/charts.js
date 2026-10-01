import { el, fmtMoney } from '../utils.js';

function isMoneyLabel(label) {
  const l = label.toLowerCase();
  return l.includes('valor') || l.includes('depositado') || l.includes('sacado')
    || l.includes('montante') || l.includes('comiss') || l.includes('saldo')
    || l.includes('pago') || l.includes('pendente');
}

export function StatCard({ icon, label, value, loading = false, compact = true }) {
  if (loading) {
    return el('div', { className: `admin-stat admin-stat--skeleton${compact ? ' admin-stat--compact' : ''}` }, [
      el('div', { className: 'admin-skeleton admin-skeleton--line admin-skeleton--lg' }),
      el('div', { className: 'admin-skeleton admin-skeleton--line' }),
    ]);
  }
  const isMoney = typeof value === 'number' && isMoneyLabel(label);
  return el('article', { className: `admin-stat reveal${compact ? ' admin-stat--compact' : ''}` }, [
    el('div', { className: 'admin-stat__head' }, [
      el('span', { className: 'admin-stat__icon', 'aria-hidden': 'true' }, [icon]),
      el('p', { className: 'admin-stat__label' }, [label]),
    ]),
    el('strong', {
      className: `admin-stat__value${isMoney ? ' admin-stat__value--money' : ''}`,
    }, [isMoney ? fmtMoney(value) : String(value)]),
  ]);
}

export function WidgetCard({ title, children, className = '' }) {
  return el('article', { className: `admin-widget reveal ${className}`.trim() }, [
    el('h3', { className: 'admin-widget__title' }, [title]),
    el('div', { className: 'admin-widget__body' }, [children]),
  ]);
}

export function ChartCard({ title, canvas, legend, subtitle }) {
  return el('article', { className: 'admin-chart-card reveal' }, [
    el('div', { className: 'admin-chart-card__head' }, [
      el('div', {}, [
        el('h3', { className: 'admin-chart-card__title' }, [title]),
        subtitle ? el('p', { className: 'admin-chart-card__sub' }, [subtitle]) : null,
      ].filter(Boolean)),
      legend ? el('div', { className: 'admin-chart-legend' }, legend) : null,
    ].filter(Boolean)),
    el('div', { className: 'admin-chart-card__body' }, [canvas]),
  ]);
}

export function legendItem(color, label) {
  return el('span', { className: 'admin-chart-legend__item' }, [
    el('i', { className: 'admin-chart-legend__dot', style: `background:${color}` }),
    label,
  ]);
}

export function createChartCanvas(className = 'admin-chart', height = 220) {
  return el('canvas', { className, height: String(height) });
}

function setupCanvas(canvas, h = 220) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || canvas.parentElement?.clientWidth || 600;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.height = `${h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}

/** Gráfico comparativo: barras agrupadas pagos vs pendentes por período */
export function drawComparisonChart(canvas, { labels, datasets, colors, seriesLabels = [] }) {
  const setup = setupCanvas(canvas, 220);
  if (!setup) return;
  const { ctx, w, h } = setup;
  const pad = { t: 28, r: 20, b: 36, l: 52 };
  const cw = w - pad.l - pad.r;
  const ch = h - pad.t - pad.b;
  const max = Math.max(...datasets.flat(), 1) * 1.12;
  const groups = labels.length;
  const groupW = cw / Math.max(groups, 1);
  const series = datasets.length;
  const gap = 8;

  // grid + eixo Y
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '11px Plus Jakarta Sans, sans-serif';
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (ch / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(w - pad.r, y);
    ctx.stroke();
    const val = max - (max / 4) * i;
    ctx.fillText(val >= 1000 ? `${(val / 1000).toFixed(1)}k` : String(Math.round(val)), 4, y + 4);
  }

  labels.forEach((lb, gi) => {
    const gx = pad.l + gi * groupW + gap;
    const innerW = groupW - gap * 2;
    const barW = (innerW - (series - 1) * 4) / series;

    datasets.forEach((data, si) => {
      const val = data[gi] || 0;
      const bh = Math.max((val / max) * ch, val > 0 ? 3 : 0);
      const x = gx + si * (barW + 4);
      const y = pad.t + ch - bh;
      const color = colors[si] || '#22c55e';
      const isWhite = /^#(?:fff|ffffff)$/i.test(color);

      const grad = ctx.createLinearGradient(0, y, 0, pad.t + ch);
      if (isWhite) {
        grad.addColorStop(0, 'rgba(255,255,255,0.95)');
        grad.addColorStop(1, 'rgba(255,255,255,0.45)');
      } else {
        grad.addColorStop(0, color);
        grad.addColorStop(1, color + '44');
      }

      ctx.fillStyle = grad;
      ctx.shadowColor = isWhite ? 'transparent' : color;
      ctx.shadowBlur = val > 0 && !isWhite ? 8 : 0;
      ctx.beginPath();
      const bw = Math.max(barW, 6);
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, bw, bh, [4, 4, 0, 0]);
      } else {
        ctx.rect(x, y, bw, bh);
      }
      ctx.fill();
      if (isWhite && val > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    });

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '11px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(lb, pad.l + gi * groupW + groupW / 2, h - 10);
  });
  ctx.textAlign = 'left';

  // totais no topo (comparativo rápido)
  if (seriesLabels.length) {
    ctx.font = '600 12px Outfit, sans-serif';
    seriesLabels.forEach((sl, si) => {
      const total = datasets[si]?.reduce((s, v) => s + v, 0) || 0;
      ctx.fillStyle = colors[si];
      ctx.fillText(`${sl}: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`, pad.l + si * 160, 18);
    });
  }
}

export function drawBarChart(canvas, opts) {
  drawComparisonChart(canvas, opts);
}

export function drawLineChart(canvas, { labels, datasets, colors }) {
  const setup = setupCanvas(canvas);
  if (!setup) return;
  const { ctx, w, h } = setup;
  const pad = { t: 16, r: 16, b: 32, l: 48 };
  const cw = w - pad.l - pad.r;
  const ch = h - pad.t - pad.b;
  const max = Math.max(...datasets.flat(), 1) * 1.1;

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (ch / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(w - pad.r, y);
    ctx.stroke();
  }

  datasets.forEach((data, di) => {
    const color = colors[di] || '#22c55e';
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = pad.l + (cw / Math.max(data.length - 1, 1)) * i;
      const y = pad.t + ch - (v / max) * ch;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  });

  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = '11px Plus Jakarta Sans, sans-serif';
  labels.forEach((lb, i) => {
    if (labels.length > 10 && i % 2 !== 0) return;
    const x = pad.l + (cw / Math.max(labels.length - 1, 1)) * i;
    ctx.fillText(lb, x - 6, h - 8);
  });
}
