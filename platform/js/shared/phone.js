export function phoneDigits(value) {
  return value.replace(/\D/g, '');
}

export function formatPhone(value) {
  const digits = phoneDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/** Formata o telefone e reposiciona o cursor (caret) no fim dos dígitos digitados. */
export function applyPhoneMask(input) {
  const value = input.value;
  const cursor = input.selectionStart ?? value.length;
  const digitsBeforeCursor = phoneDigits(value.slice(0, cursor)).length;

  const formatted = formatPhone(value);
  input.value = formatted;

  if (digitsBeforeCursor === 0) {
    input.setSelectionRange(0, 0);
    return;
  }

  let digitCount = 0;
  let newCursor = formatted.length;

  for (let i = 0; i < formatted.length; i += 1) {
    if (/\d/.test(formatted[i])) {
      digitCount += 1;
    }
    if (digitCount >= digitsBeforeCursor) {
      newCursor = i + 1;
      break;
    }
  }

  input.setSelectionRange(newCursor, newCursor);
}
