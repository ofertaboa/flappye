export const DEFAULT_BET = 5;

export function formatMetaMultiplier(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '5';
  if (Number.isInteger(n)) return String(n);
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function metaGoalHintText(multiplier) {
  const x = formatMetaMultiplier(multiplier);
  return `Meta = ${x}× o valor da sua aposta`;
}
