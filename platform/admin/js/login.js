import { adminLogin } from './auth.js';
import { appUrl } from '../../js/shared/paths.js';

const form = document.getElementById('admin-login-form');
const errEl = document.getElementById('admin-login-error');

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  errEl.hidden = true;
  const fd = new FormData(form);
  const btn = form.querySelector('button[type=submit]');
  btn.disabled = true;
  btn.textContent = 'Entrando...';

  try {
    const data = await adminLogin(fd.get('username'), fd.get('password'));
    sessionStorage.setItem('flappy_admin_token', data.token);
    sessionStorage.setItem('flappy_admin_user', JSON.stringify(data.user));
    window.location.href = appUrl('pages/admin.html');
  } catch (err) {
    errEl.textContent = err.message;
    errEl.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Entrar';
  }
});
