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

function normalizeSettings(raw = {}) {
  const numericKeys = [
    'win_per_pipe', 'demo_win_per_pipe', 'influencer_win_per_pipe',
    'min_bet', 'max_bet', 'rollover_default', 'rollover_gift', 'rollover_coupon',
    'rollover_free_round', 'rollover_referral', 'rollover_cashback', 'cashback_pct',
    'referral_reward', 'referral_min_deposit', 'referral_commission',
    'influencer_montante_pct_default', 'influencer_montante_initial',
    'meta_multiplier',
  ];
  const out = {
    ...raw,
    difficulty: raw.game_difficulty || raw.difficulty || 'dificil',
    maintenance: raw.maintenance === '1' || raw.maintenance === true,
  };
  numericKeys.forEach((key) => {
    if (raw[key] != null && raw[key] !== '') {
      out[key] = Number(String(raw[key]).replace(',', '.'));
    }
  });
  return out;
}

export const settingsApi = {
  async get() {
    const res = await adminFetch(apiUrl('admin/settings.php'));
    const data = await parseResponse(res);
    return normalizeSettings(data.settings);
  },

  async save(payload) {
    const body = { ...payload };
    if (body.difficulty != null) {
      body.game_difficulty = body.difficulty;
      delete body.difficulty;
    }
    if (typeof body.maintenance === 'boolean') {
      body.maintenance = body.maintenance ? '1' : '0';
    }

    const res = await adminFetch(apiUrl('admin/settings.php'), {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const data = await parseResponse(res);
    return normalizeSettings(data.settings);
  },
};
