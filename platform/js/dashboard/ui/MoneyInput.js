import { el } from '../../shared/dom.js';

export function MoneyInput({
  id = 'money-input',
  label = 'Digite o valor',
  placeholder = '0,00',
  initialValue = 0,
  onChange,
}) {
  let selected = initialValue;

  const input = el('input', {
    className: 'dash-play__bet-input',
    id,
    name: id,
    type: 'text',
    inputmode: 'numeric',
    placeholder,
    autocomplete: 'off',
    value: initialValue ? String(initialValue) : '',
  });

  function setValue(amount) {
    selected = amount;
    input.value = amount ? String(amount) : '';
    onChange?.(amount);
  }

  input.addEventListener('input', () => {
    const raw = input.value.replace(/\D/g, '');
    input.value = raw;
    selected = raw ? parseInt(raw, 10) : 0;
    onChange?.(selected);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key.length === 1 && !/\d/.test(e.key)) {
      e.preventDefault();
    }
  });

  const root = el('div', { className: 'dash-money-input' }, [
    el('label', { className: 'dash-play__bet-label', for: id }, [label]),
    el('div', { className: 'dash-play__bet-input-wrap' }, [
      el('span', { className: 'dash-play__bet-prefix', 'aria-hidden': 'true' }, ['R$']),
      input,
    ]),
  ]);

  return { root, input, setValue, getValue: () => selected };
}

export function CouponInput({ onApply }) {
  const input = el('input', {
    className: 'dash-coupon__input',
    type: 'text',
    placeholder: 'Possui um cupom?',
    autocomplete: 'off',
  });

  const message = el('p', { className: 'dash-coupon__msg', hidden: true, role: 'status' });

  const applyBtn = el('button', {
    className: 'dash-coupon__apply',
    type: 'button',
    onClick: () => {
      const code = input.value.trim();
      if (!code) {
        message.textContent = 'Informe um cupom válido.';
        message.className = 'dash-coupon__msg dash-coupon__msg--error';
        message.hidden = false;
        return;
      }
      onApply?.(code);
      message.textContent = '✅ Cupom aplicado com sucesso.';
      message.className = 'dash-coupon__msg dash-coupon__msg--success';
      message.hidden = false;
    },
  }, ['Aplicar']);

  const root = el('div', { className: 'dash-coupon' }, [
    el('div', { className: 'dash-coupon__row' }, [input, applyBtn]),
    message,
  ]);

  return { root, input, message };
}
