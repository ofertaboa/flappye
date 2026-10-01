import { apiUrl } from '../../../js/shared/api.js';

export function managerFetch(url, options = {}) {
  const token = sessionStorage.getItem('flappy_manager_token');
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}

export async function parseManagerResponse(res) {
  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { throw new Error('Resposta inválida do servidor.'); }
  }
  if (!res.ok || !data?.ok) throw new Error(data?.error || 'Operação não concluída.');
  return data;
}

export const managerApi = {
  dashboard() {
    return managerFetch(apiUrl('manager/dashboard.php')).then(parseManagerResponse);
  },
  influencers() {
    return managerFetch(apiUrl('manager/influencers.php')).then(parseManagerResponse);
  },
  influencerDetail(id) {
    return managerFetch(apiUrl(`manager/influencers.php?id=${id}`)).then(parseManagerResponse);
  },
  createInfluencer(payload) {
    return managerFetch(apiUrl('manager/influencers.php'), {
      method: 'POST',
      body: JSON.stringify({ action: 'create', ...payload }),
    }).then(parseManagerResponse);
  },
  updatePct(userId, montante_pct) {
    return managerFetch(apiUrl('manager/influencers.php'), {
      method: 'POST',
      body: JSON.stringify({ action: 'update_pct', user_id: userId, montante_pct }),
    }).then(parseManagerResponse);
  },
  resetCampaign(userId) {
    return managerFetch(apiUrl('manager/influencers.php'), {
      method: 'POST',
      body: JSON.stringify({ action: 'reset', user_id: userId }),
    }).then(parseManagerResponse);
  },
  addPlayBalance(userId, amount) {
    return managerFetch(apiUrl('manager/influencers.php'), {
      method: 'POST',
      body: JSON.stringify({ action: 'play_balance', user_id: userId, amount }),
    }).then(parseManagerResponse);
  },
  withdraw(payload) {
    return managerFetch(apiUrl('manager/withdraw.php'), {
      method: 'POST',
      body: JSON.stringify(payload),
    }).then(parseManagerResponse);
  },
  withdrawals() {
    return managerFetch(apiUrl('manager/withdrawals.php')).then(parseManagerResponse);
  },
  coupons() {
    return managerFetch(apiUrl('manager/coupons.php')).then(parseManagerResponse);
  },
  saveCoupon(payload) {
    return managerFetch(apiUrl('manager/coupons.php'), {
      method: 'POST',
      body: JSON.stringify(payload),
    }).then(parseManagerResponse);
  },
  removeCoupon(id) {
    return managerFetch(apiUrl(`manager/coupons.php?id=${id}`), {
      method: 'DELETE',
    }).then(parseManagerResponse);
  },
};
