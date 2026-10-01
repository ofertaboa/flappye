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

export const usersApi = {
  async list() {
    const res = await adminFetch(apiUrl('admin/users.php'));
    const data = await parseResponse(res);
    return data.users;
  },

  async getEditData(id) {
    const res = await adminFetch(apiUrl(`admin/users.php?id=${encodeURIComponent(id)}`));
    return parseResponse(res);
  },

  async update(id, payload) {
    const body = { id, ...payload };
    if (payload.status === 'bloqueado' || payload.status === 'ativo') {
      body.status = payload.status;
    }
    if (payload.is_influencer != null) {
      body.is_influencer = !!payload.is_influencer;
    }

    const res = await adminFetch(apiUrl('admin/users.php'), {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const data = await parseResponse(res);
    return data.user;
  },

  async updatePassword(id, password) {
    return this.update(id, { password });
  },

  async setInfluencer(id, _montantePct) {
    return this.update(id, { is_influencer: true });
  },

  async deactivateInfluencer(id) {
    return this.update(id, { is_influencer: false });
  },
};
