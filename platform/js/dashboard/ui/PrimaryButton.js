import { el } from '../../shared/dom.js';
import { vibrate } from '../../shared/ui/haptics.js';

export function PrimaryButton({
  label,
  onClick,
  type = 'button',
  className = '',
  icon = null,
  full = true,
}) {
  let loading = false;
  let btn = null;

  const content = el('span', { className: 'dash-btn__content' }, [
    icon ? el('span', { className: 'dash-btn__icon', 'aria-hidden': 'true' }, [icon]) : null,
    el('span', { className: 'dash-btn__label' }, [label]),
    el('span', { className: 'dash-btn__spinner', 'aria-hidden': 'true' }),
  ].filter(Boolean));

  btn = el('button', {
    className: `btn btn--yellow dash-btn dash-btn--primary${full ? ' dash-btn--full' : ''} ${className}`.trim(),
    type,
    onClick: async (e) => {
      if (loading || btn.disabled) return;
      vibrate(12);
      const ripple = el('span', { className: 'dash-btn__ripple' });
      const rect = btn.getBoundingClientRect();
      ripple.style.left = `${e.clientX - rect.left}px`;
      ripple.style.top = `${e.clientY - rect.top}px`;
      btn.append(ripple);
      window.setTimeout(() => ripple.remove(), 600);
      await onClick?.({ setLoading, btn });
    },
  }, [content]);

  function setLoading(value) {
    loading = value;
    btn.disabled = value;
    btn.classList.toggle('is-loading', value);
  }

  return { el: btn, setLoading };
}

export function SecondaryButton({ label, onClick, className = '' }) {
  return el('button', {
    className: `dash-btn dash-btn--secondary ${className}`.trim(),
    type: 'button',
    onClick: () => {
      vibrate(8);
      onClick?.();
    },
  }, [label]);
}
