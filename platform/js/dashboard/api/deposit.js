import { apiFetch } from '../../shared/api.js';
import { authHeaders } from '../../shared/auth.js';
import { appUrl } from '../../shared/paths.js';

export function hasAuthToken() {
  return Boolean(localStorage.getItem('flappy_token'));
}

/**
 * @param {{ amount: number, coupon?: string }} payload
 * @returns {Promise<{ ok: boolean, pix_code?: string, amount?: number, expires_in?: number, deposit_id?: number, reused?: boolean, error?: string }>}
 */
export async function createDeposit(payload) {
  if (!hasAuthToken()) {
    return {
      ok: false,
      error: 'Faça login para depositar.',
      needsLogin: true,
    };
  }

  try {
    const data = await apiFetch('deposit/create.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({ amount: payload.amount, coupon: payload.coupon }),
    });

    return {
      ok: true,
      deposit_id: data.deposit_id,
      amount: data.amount,
      pix_code: data.pix_code,
      pix_qr_image: data.pix_qr_image || '',
      expires_in: data.expires_in ?? 900,
      gateway: data.gateway,
      reused: Boolean(data.reused),
    };
  } catch (err) {
    return { ok: false, error: err.message || 'Erro ao gerar pagamento.' };
  }
}

/**
 * Consulta status e confirma no gateway se ainda estiver pendente.
 * @param {number} depositId
 */
export async function getDepositStatus(depositId) {
  try {
    const data = await apiFetch(`deposit/status.php?id=${depositId}&sync=1`, {
      headers: authHeaders(),
    });

    return {
      status: data.deposit?.status,
      balance: data.balance,
      amount: data.deposit?.amount,
    };
  } catch {
    return { status: null, balance: null, amount: null };
  }
}

export function redirectToLogin() {
  window.location.href = appUrl('pages/login.html');
}
