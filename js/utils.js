export function formatMoney(value) {
  return 'R$ ' + value.toFixed(2).replace('.', ',');
}

export function parseMoneyInput(value) {
  const n = parseFloat(String(value).replace(',', '.').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function formatDuration(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}
