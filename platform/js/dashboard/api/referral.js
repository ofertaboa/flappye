import { apiFetch } from '../../shared/api.js';
import { authHeaders } from '../../shared/auth.js';

/**
 * @returns {Promise<{
 *   ok: boolean,
 *   is_influencer: boolean,
 *   link: string,
 *   montante_pct: number,
 *   montante_total: number,
 *   referral_reward: number,
 *   referral_min_deposit: number,
 *   pending_montante_withdrawal: boolean,
 *   stats: { indicados: number, com_deposito: number, ganhos: number }
 * }>}
 */
export async function fetchReferral() {
  const token = localStorage.getItem('flappy_token');
  if (!token) {
    throw new Error('Faça login para continuar.');
  }

  return apiFetch('user/referral.php', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/**
 * @param {{ cpf: string, pix_key: string, pix_type: string, amount?: number }} payload
 */
export async function requestMontanteWithdraw(payload) {
  try {
    const data = await apiFetch('user/referral-withdraw.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify(payload),
    });

    return {
      ok: true,
      message: data.message,
      montante_balance: data.montante_balance,
    };
  } catch (err) {
    return { ok: false, error: err.message || 'Erro ao solicitar saque.' };
  }
}

export { PIX_KEY_TYPES } from './withdraw.js';
