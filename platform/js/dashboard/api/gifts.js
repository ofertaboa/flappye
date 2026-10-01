import { apiFetch } from '../../shared/api.js';
import { authHeaders } from '../../shared/auth.js';

/**
 * @returns {Promise<{ ok: boolean, gifts: object[], disabled?: boolean }>}
 */
export async function fetchGifts() {
  const token = localStorage.getItem('flappy_token');
  if (!token) {
    return { ok: false, gifts: [], needsLogin: true };
  }

  try {
    const data = await apiFetch('gifts/list.php', {
      headers: authHeaders(),
    });

    return {
      ok: true,
      gifts: data.gifts || [],
      disabled: Boolean(data.disabled),
    };
  } catch (err) {
    return { ok: false, gifts: [], error: err.message };
  }
}

/**
 * @param {number} giftId — id do user_gifts
 * @returns {Promise<{ ok: boolean, gift?: object, error?: string }>}
 */
export async function redeemGift(giftId) {
  try {
    const data = await apiFetch('gifts/redeem.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({ id: giftId }),
    });

    return { ok: true, gift: data.gift, balance: data.balance, free_rounds: data.free_rounds };
  } catch (err) {
    return { ok: false, error: err.message || 'Não foi possível resgatar.' };
  }
}

export const GIFT_TYPES = [
  'saldo', 'partidas_gratis', 'bonus_aposta', 'produto_fisico', 'cupom', 'cashback',
];
