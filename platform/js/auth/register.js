import { el, mount } from '../shared/dom.js';
import { AuthHeader } from './AuthHeader.js';
import { phoneDigits, applyPhoneMask } from '../shared/phone.js';
import { apiFetch } from '../shared/api.js';
import { appUrl, ensureWebServer } from '../shared/paths.js';
import { createTermsModal } from './TermsModal.js';

const FIELD_ICONS = {
  name: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  password: '<rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" stroke-width="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
};

function validators(name, phone, password) {
  const errors = {};

  const trimmed = name.trim();
  if (trimmed.length < 2) {
    errors.name = 'Informe seu nome completo.';
  } else if (!/^[\p{L}\s'-]+$/u.test(trimmed)) {
    errors.name = 'Use apenas letras no nome.';
  }

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
  const span = el('span', { className: 'register-field__icon', 'aria-hidden': 'true' });
  span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">${FIELD_ICONS[type]}</svg>`;
  return span;
}

function createField({ id, label, type, placeholder, iconType, index, inputAttrs = {} }) {
  const input = el('input', {
    className: 'register-field__input',
    id,
    name: id,
    type,
    placeholder,
    autocomplete: inputAttrs.autocomplete || 'off',
    ...inputAttrs,
  });

  const errorEl = el('p', { className: 'register-field__error', id: `${id}-error`, role: 'alert' });
  const wrap = el('div', {
    className: 'register-field',
    style: `--i: ${index}`,
  }, [
    el('label', { className: 'register-field__label', for: id }, [label]),
    el('div', { className: 'register-field__control' }, [
      FieldIcon(iconType),
      input,
      el('span', { className: 'register-field__check', 'aria-hidden': 'true' }, [
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
  const errorEl = fieldWrap.querySelector('.register-field__error');

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
    field === 'name' ? value : allValues.name,
    field === 'phone' ? value : allValues.phone,
    field === 'password' ? value : allValues.password,
  );
  return errors[field] || null;
}

function persistInviteParams() {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');
  const mgr = params.get('mgr');
  if (ref) {
    try { sessionStorage.setItem('flappy_referrer_id', ref); } catch { /* ignore */ }
  }
  if (mgr) {
    try { sessionStorage.setItem('flappy_manager_id', mgr); } catch { /* ignore */ }
  }
}

function getReferrerId() {
  const params = new URLSearchParams(window.location.search);
  let ref = params.get('ref');
  if (!ref) {
    try { ref = sessionStorage.getItem('flappy_referrer_id'); } catch { /* ignore */ }
  }
  const id = parseInt(ref || '', 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function getManagerId() {
  const params = new URLSearchParams(window.location.search);
  let mgr = params.get('mgr');
  if (!mgr) {
    try { mgr = sessionStorage.getItem('flappy_manager_id'); } catch { /* ignore */ }
  }
  const id = parseInt(mgr || '', 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function RegisterForm() {
  const fields = {};
  const nameField = createField({
    id: 'name',
    label: 'Nome',
    type: 'text',
    placeholder: 'Seu nome completo',
    iconType: 'name',
    index: 0,
    inputAttrs: { autocomplete: 'name' },
  });
  const phoneField = createField({
    id: 'phone',
    label: 'Telefone',
    type: 'tel',
    placeholder: '(00) 00000-0000',
    iconType: 'phone',
    index: 1,
    inputAttrs: { autocomplete: 'tel', inputmode: 'numeric' },
  });
  const passwordField = createField({
    id: 'password',
    label: 'Senha',
    type: 'password',
    placeholder: 'Mínimo 6 caracteres',
    iconType: 'password',
    index: 2,
    inputAttrs: { autocomplete: 'new-password', minlength: '6' },
  });

  fields.name = nameField;
  fields.phone = phoneField;
  fields.password = passwordField;

  const termsModal = createTermsModal();
  const termsCheckbox = el('input', {
    type: 'checkbox',
    id: 'accept-terms',
    name: 'accept_terms',
    className: 'register-terms__checkbox',
  });
  const termsError = el('p', {
    className: 'register-terms__error',
    id: 'accept-terms-error',
    role: 'alert',
    hidden: true,
  });

  const termsField = el('div', {
    className: 'register-terms',
    style: '--i: 3',
  }, [
    el('label', { className: 'register-terms__label', for: 'accept-terms' }, [
      termsCheckbox,
      el('span', { className: 'register-terms__text' }, [
        'Li e concordo com os ',
        el('button', {
          type: 'button',
          className: 'register-terms__link',
          onClick: (e) => { e.preventDefault(); termsModal.open('terms'); },
        }, ['Termos de Uso']),
        ' e a ',
        el('button', {
          type: 'button',
          className: 'register-terms__link',
          onClick: (e) => { e.preventDefault(); termsModal.open('privacy'); },
        }, ['Política de Privacidade']),
        ' da plataforma.',
      ]),
    ]),
    termsError,
  ]);

  termsCheckbox.addEventListener('change', () => {
    if (termsCheckbox.checked) {
      termsField.classList.remove('is-invalid');
      termsError.hidden = true;
    }
  });

  const formError = el('p', { className: 'register-form__alert', role: 'alert', hidden: true });

  const submitBtn = el('button', {
    className: 'btn btn--yellow register-submit',
    type: 'submit',
  }, ['CRIAR CONTA']);

  const cardHead = el('header', { className: 'register-card__head' }, [
    el('h1', { className: 'register-card__title' }, [
      getManagerId() ? 'Cadastro de influenciador' : 'Crie sua conta',
    ]),
    el('p', { className: 'register-card__subtitle' }, [
      getManagerId()
        ? 'Você foi convidado por um gerente. Ao concluir o cadastro, sua conta será de influenciador.'
        : 'Cadastre-se em menos de 1 minuto e comece a disputar partidas valendo dinheiro real.',
    ]),
  ]);

  const form = el('form', {
    className: 'register-form',
    novalidate: true,
    onSubmit: (e) => {
      e.preventDefault();
      formError.hidden = true;

      const values = {
        name: nameField.input.value,
        phone: phoneField.input.value,
        password: passwordField.input.value,
      };

      const errors = validators(values.name, values.phone, values.password);
      let hasError = false;

      ['name', 'phone', 'password'].forEach((key) => {
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

      if (!termsCheckbox.checked) {
        termsField.classList.add('is-invalid');
        termsError.textContent = 'Você precisa aceitar os Termos de Uso e a Política de Privacidade.';
        termsError.hidden = false;
        termsCheckbox.focus();
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'CRIANDO...';
      formError.classList.remove('is-success');

      const payload = {
        name: values.name.trim(),
        phone: phoneDigits(values.phone),
        password: values.password,
        terms_accepted: true,
      };

      const managerId = getManagerId();
      const referrerId = managerId ? null : getReferrerId();
      if (referrerId) payload.referrer_id = referrerId;
      if (managerId) payload.manager_id = managerId;

      apiFetch('register.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then((data) => {
          localStorage.setItem('flappy_token', data.token);
          localStorage.setItem('flappy_user', JSON.stringify({
            id: data.user.id,
            name: data.user.name,
            balance: data.user.balance,
            free_rounds: data.user.free_rounds ?? 0,
          }));
          window.location.href = appUrl('pages/dashboard.html');
        })
        .catch((err) => {
          submitBtn.disabled = false;
          submitBtn.textContent = 'CRIAR CONTA';
          formError.textContent = err.message || 'Erro ao cadastrar. Tente novamente.';
          formError.classList.remove('is-success');
          formError.hidden = false;
        });
    },
  }, [
    nameField.wrap,
    phoneField.wrap,
    passwordField.wrap,
    termsField,
    formError,
    submitBtn,
    el('p', { className: 'register-form__footer' }, [
      'Já possui uma conta? ',
      el('a', { className: 'register-form__link', href: appUrl('pages/login.html') }, ['Entrar']),
    ]),
  ]);

  phoneField.input.addEventListener('input', () => {
    applyPhoneMask(phoneField.input);
    onFieldInput('phone', phoneField);
  });

  function onFieldInput(key, field) {
    const values = {
      name: nameField.input.value,
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

  bindField('name', nameField);
  bindField('phone', phoneField);
  bindField('password', passwordField);

  return el('div', { className: 'register-card reveal' }, [cardHead, form]);
}

function RegisterPage() {
  return el('main', { className: 'register-page', id: 'register-main' }, [
    el('div', { className: 'register-page__overlay', 'aria-hidden': 'true' }),
    el('div', { className: 'container register-page__content' }, [
      RegisterForm(),
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

export function bootstrapRegister() {
  if (!ensureWebServer()) return;

  persistInviteParams();

  const app = document.getElementById('app');
  if (!app) return;

  mount(app, AuthHeader({ highlight: 'register' }), RegisterPage());
  initReveal();
}

document.addEventListener('DOMContentLoaded', bootstrapRegister);
