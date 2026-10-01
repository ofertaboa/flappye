import { apiUrl } from '../../js/shared/api.js';
import { appUrl } from '../../js/shared/paths.js';

document.getElementById('manager-login-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('manager-login-error');
  errEl.hidden = true;
  const fd = new FormData(e.target);

  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true;
  btn.textContent = 'Entrando...';

  try {
    const res = await fetch(apiUrl('manager/login.php'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: String(fd.get('phone')).replace(/\D/g, ''),
        password: fd.get('password'),
      }),
    });
    const text = await res.text();
    const data = JSON.parse(text);
    if (!res.ok || !data.ok) throw new Error(data.error || 'Login falhou');

    sessionStorage.setItem('flappy_manager_token', data.token);
    sessionStorage.setItem('flappy_manager_user', JSON.stringify(data.manager));
    window.location.href = appUrl('pages/manager.html');
  } catch (err) {
    errEl.textContent = err.message || 'Erro ao entrar.';
    errEl.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Entrar';
  }
});
