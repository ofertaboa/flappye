import { apiUrl } from '../../js/shared/api.js';
import { appUrl } from '../../js/shared/paths.js';

export async function adminLogin(username, password) {
  const res = await fetch(apiUrl('admin/login.php'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        'O servidor retornou uma resposta inválida. Verifique se o XAMPP está rodando e a configuração do servidor.',
      );
    }
  }

  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || 'Erro ao entrar');
  }
  return data;
}

export function requireAuth() {
  const token = sessionStorage.getItem('flappy_admin_token');
  if (!token) {
    window.location.href = appUrl('pages/admin-login.html');
    return false;
  }
  return true;
}
