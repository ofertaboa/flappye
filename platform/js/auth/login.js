import { el, mount } from '../shared/dom.js';
import { ensureWebServer } from '../shared/paths.js';
import { AuthHeader } from './AuthHeader.js';
import { phoneDigits, applyPhoneMask } from '../shared/phone.js';
import { appUrl } from '../shared/paths.js';
import { apiFetch } from '../shared/api.js';

const FIELD_ICONS = {
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  password: '<rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" stroke-width="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
};

function validators(phone, password) {
  const errors = {};

  const digits = phoneDigits(phone);
  if (digits.length < 10) {
    errors.phone = 'Informe um telefone válido com DDD.';
  }

  if (password.length < 6) {
    errors.password = 'A senha deve ter no mínimo 6 caracteres.';
  }

  return errors;
}

function FieldIcon(type) {
  const span = el('span', { className: 'login-field__icon', 'aria-hidden': 'true' });
  span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">${FIELD_ICONS[type]}</svg>`;
  return span;
}

function createField({ id, label, type, placeholder, iconType, index, inputAttrs = {} }) {
  const input = el('input', {
    className: 'login-field__input',
    id,
    name: id,
    type,
    placeholder,
    autocomplete: inputAttrs.autocomplete || 'off',
    ...inputAttrs,
  });

  const errorEl = el('p', { className: 'login-field__error', id: `${id}-error`, role: 'alert' });
  const wrap = el('div', {
    className: 'login-field',
    style: `--i: ${index}`,
  }, [
    el('label', { className: 'login-field__label', for: id }, [label]),
    el('div', { className: 'login-field__control' }, [
      FieldIcon(iconType),
      input,
      el('span', { className: 'login-field__check', 'aria-hidden': 'true' }, [
        el('svg', { viewBox: '0 0 24 24', fill: 'none' }, [
          el('path', {
            d: 'M20 6L9 17l-5-5',
            stroke: 'currentColor',
            'stroke-width': '2.5',
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
          }),
        ]),
      ]),
    ]),
    errorEl,
  ]);

  return { wrap, input, errorEl };
}

function setFieldState(fieldWrap, state, message = '') {
  fieldWrap.classList.remove('is-valid', 'is-invalid', 'is-focused');
  const errorEl = fieldWrap.querySelector('.login-field__error');

  if (state === 'valid') {
    fieldWrap.classList.add('is-valid');
    errorEl.textContent = '';
  } else if (state === 'invalid') {
    fieldWrap.classList.add('is-invalid');
    errorEl.textContent = message;
  } else if (state === 'focus') {
    fieldWrap.classList.add('is-focused');
    errorEl.textContent = '';
  } else {
    errorEl.textContent = '';
  }
}

function validateSingle(field, value, allValues) {
  const errors = validators(
    field === 'phone' ? value : allValues.phone,
    field === 'password' ? value : allValues.password,
  );
  return errors[field] || null;
}

function LoginForm() {
  const fields = {};

  const phoneField = createField({
    id: 'phone',
    label: 'Telefone',
    type: 'tel',
    placeholder: '(00) 00000-0000',
    iconType: 'phone',
    index: 0,
    inputAttrs: { autocomplete: 'tel', inputmode: 'numeric' },
  });

  const passwordField = createField({
    id: 'password',
    label: 'Senha',
    type: 'password',
    placeholder: 'Mínimo 6 caracteres',
    iconType: 'password',
    index: 1,
    inputAttrs: { autocomplete: 'current-password', minlength: '6' },
  });

  fields.phone = phoneField;
  fields.password = passwordField;

  const formError = el('p', { className: 'login-form__alert', role: 'alert', hidden: true });

  const submitBtn = el('button', {
    className: 'btn btn--yellow login-submit',
    type: 'submit',
  }, ['ENTRAR']);

  const cardHead = el('header', { className: 'login-card__head' }, [
    el('h1', { className: 'login-card__title' }, ['Entre na sua conta']),
    el('p', { className: 'login-card__subtitle' }, [
      'Use seu telefone e senha para acessar e continuar disputando partidas.',
    ]),
  ]);

  const form = el('form', {
    className: 'login-form',
    novalidate: true,
    onSubmit: async (e) => {
      e.preventDefault();
      formError.hidden = true;
      formError.classList.remove('is-success');

      const values = {
        phone: phoneField.input.value,
        password: passwordField.input.value,
      };

      const errors = validators(values.phone, values.password);
      let hasError = false;

      ['phone', 'password'].forEach((key) => {
        if (errors[key]) {
          setFieldState(fields[key].wrap, 'invalid', errors[key]);
          hasError = true;
        } else {
          setFieldState(fields[key].wrap, 'valid');
        }
      });

      if (hasError) {
        formError.textContent = 'Revise os campos destacados e tente novamente.';
        formError.hidden = false;
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'ENTRANDO...';
      formError.hidden = true;
      formError.classList.remove('is-success');

      try {
        const digits = phoneDigits(values.phone);
        const data = await apiFetch('login.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: digits, password: values.password }),
        });

        localStorage.setItem('flappy_token', data.token);
        localStorage.setItem('flappy_user', JSON.stringify(data.user));
        window.location.href = appUrl('pages/dashboard.html');
      } catch (err) {
        formError.textContent = err.message || 'Não foi possível entrar.';
        formError.hidden = false;
        submitBtn.disabled = false;
        submitBtn.textContent = 'ENTRAR';
      }
    },
  }, [
    phoneField.wrap,
    passwordField.wrap,
    formError,
    submitBtn,
    el('p', { className: 'login-form__footer' }, [
      'Não possui uma conta? ',
      el('a', { className: 'login-form__link', href: appUrl('pages/register.html') }, ['Cadastrar']),
    ]),
  ]);

  phoneField.input.addEventListener('input', () => {
    applyPhoneMask(phoneField.input);
    onFieldInput('phone', phoneField);
  });

  function onFieldInput(key, field) {
    const values = {
      phone: phoneField.input.value,
      password: passwordField.input.value,
    };
    const err = validateSingle(key, field.input.value, values);
    if (err) {
      const hasValue = key === 'phone'
        ? phoneDigits(field.input.value).length > 0
        : field.input.value.trim().length > 0;
      if (hasValue) setFieldState(field.wrap, 'invalid', err);
      else setFieldState(field.wrap, 'neutral');
    } else if ((key === 'phone' ? phoneDigits(field.input.value).length : field.input.value.trim().length) > 0) {
      setFieldState(field.wrap, 'valid');
    } else {
      setFieldState(field.wrap, 'neutral');
    }
  }

  function bindField(key, field) {
    field.input.addEventListener('focus', () => setFieldState(field.wrap, 'focus'));
    field.input.addEventListener('blur', () => {
      field.wrap.classList.remove('is-focused');
      onFieldInput(key, field);
    });
    if (key !== 'phone') {
      field.input.addEventListener('input', () => onFieldInput(key, field));
    }
  }

  bindField('phone', phoneField);
  bindField('password', passwordField);

  return el('div', { className: 'login-card reveal' }, [cardHead, form]);
}

function LoginPage() {
  return el('main', { className: 'login-page', id: 'login-main' }, [
    el('div', { className: 'login-page__overlay', 'aria-hidden': 'true' }),
    el('div', { className: 'container login-page__content' }, [
      LoginForm(),
    ]),
  ]);
}

function initReveal() {
  requestAnimationFrame(() => {
    document.querySelectorAll('.reveal').forEach((node) => {
      node.classList.add('is-visible');
    });
  });
}

export function bootstrapLogin() {
  if (!ensureWebServer()) return;

  const app = document.getElementById('app');
  if (!app) return;

  mount(app, AuthHeader({ highlight: 'register' }), LoginPage());
  initReveal();
}

document.addEventListener('DOMContentLoaded', bootstrapLogin);
