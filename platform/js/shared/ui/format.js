export function formatMoney(value) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function parseMoneyInput(value) {
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
}

export function formatMoneyInput(value) {
  const num = typeof value === 'number' ? value : parseMoneyInput(value);
  if (!num) return '';
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function maskCpf(value) {
  const d = String(value).replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function cpfDigits(value) {
  return String(value).replace(/\D/g, '').slice(0, 11);
}
