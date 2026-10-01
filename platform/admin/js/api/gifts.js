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

export const giftsApi = {
  async list() {
    const res = await adminFetch(apiUrl('admin/gifts.php'));
    const data = await parseResponse(res);
    return data.gifts;
  },

  async getSettings() {
    const res = await adminFetch(apiUrl('admin/gifts.php?settings=1'));
    const data = await parseResponse(res);
    return data.settings;
  },

  async saveSettings(payload) {
    const res = await adminFetch(apiUrl('admin/gifts.php'), {
      method: 'POST',
      body: JSON.stringify({ action: 'settings', ...payload }),
    });
    const data = await parseResponse(res);
    return data.settings;
  },

  async save(payload) {
    const res = await adminFetch(apiUrl('admin/gifts.php'), {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const data = await parseResponse(res);
    return data.gift;
  },

  async toggle(id, status) {
    const res = await adminFetch(apiUrl('admin/gifts.php'), {
      method: 'POST',
      body: JSON.stringify({ action: 'toggle', id, status }),
    });
    const data = await parseResponse(res);
    return data.gift;
  },

  async sendToAll(id) {
    const res = await adminFetch(apiUrl('admin/gifts.php'), {
      method: 'POST',
      body: JSON.stringify({ action: 'send_all', id }),
    });
    const data = await parseResponse(res);
    return { sent: data.sent, gift: data.gift };
  },

  async remove(id) {
    const res = await adminFetch(apiUrl(`admin/gifts.php?id=${encodeURIComponent(id)}`), {
      method: 'DELETE',
    });
    await parseResponse(res);
  },
};
