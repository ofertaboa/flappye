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

export const couponsApi = {
  async list() {
    const res = await adminFetch(apiUrl('admin/coupons.php'));
    const data = await parseResponse(res);
    return data.coupons;
  },

  async save(payload) {
    const res = await adminFetch(apiUrl('admin/coupons.php'), {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const data = await parseResponse(res);
    return data.coupon;
  },

  async remove(id) {
    const res = await adminFetch(apiUrl(`admin/coupons.php?id=${encodeURIComponent(id)}`), {
      method: 'DELETE',
    });
    await parseResponse(res);
  },
};
