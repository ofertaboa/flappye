import { apiUrl } from '../../../js/shared/api.js';

function adminFetch(url, options = {}) {
  const token = sessionStorage.getItem('flappy_admin_token');
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}

async function parseResponse(res) {
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('Resposta inválida do servidor.');
    }
  }
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || 'Operação não concluída.');
  }
  return data;
}

export const gatewaysApi = {
  async list() {
    const res = await adminFetch(apiUrl('admin/gateways.php'));
    const data = await parseResponse(res);
    return data.gateways;
  },

  async save(payload) {
    const res = await adminFetch(apiUrl('admin/gateways.php'), {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const data = await parseResponse(res);
    return data.gateway;
  },

  async remove(slug) {
    const res = await adminFetch(apiUrl(`admin/gateways.php?slug=${encodeURIComponent(slug)}`), {
      method: 'DELETE',
    });
    await parseResponse(res);
  },
};
