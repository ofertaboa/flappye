import { apiUrl } from '../../js/shared/api.js';
import { appUrl } from '../../js/shared/paths.js';
import { applyPhoneMask, phoneDigits } from '../../js/shared/phone.js';

const form = document.getElementById('manager-register-form');
const errEl = document.getElementById('manager-register-error');
const phoneInput = document.getElementById('manager-phone');

phoneInput?.addEventListener('input', () => applyPhoneMask(phoneInput));

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  errEl.hidden = true;

  const fd = new FormData(form);
  const password = String(fd.get('password'));
  const confirm = String(fd.get('password_confirm'));

  if (password.length < 6) {
    errEl.textContent = 'A senha deve ter no mínimo 6 caracteres.';
    errEl.hidden = false;
    return;
  }

  if (password !== confirm) {
    errEl.textContent = 'As senhas não coincidem.';
    errEl.hidden = false;
    return;
  }

  const btn = form.querySelector('button[type=submit]');
  btn.disabled = true;
  btn.textContent = 'Criando...';

  try {
    const res = await fetch(apiUrl('manager/register.php'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: String(fd.get('name')).trim(),
        phone: phoneDigits(String(fd.get('phone'))),
        password,
      }),
    });

    const text = await res.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('Resposta inválida do servidor.');
    }

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error || 'Não foi possível criar a conta.');
    }

    sessionStorage.setItem('flappy_manager_token', data.token);
    sessionStorage.setItem('flappy_manager_user', JSON.stringify(data.manager));
    window.location.href = appUrl('pages/manager.html');
  } catch (err) {
    errEl.textContent = err.message || 'Erro ao cadastrar.';
    errEl.hidden = false;
    btn.disabled = false;
    btn.textContent = 'Criar conta';
  }
});
