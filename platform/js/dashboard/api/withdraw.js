import { apiFetch } from '../../shared/api.js';
import { authHeaders } from '../../shared/auth.js';

/**
 * @param {{ amount: number, cpf: string, pix_key: string, pix_type: string }} payload
 * @returns {Promise<{ ok: boolean, message?: string, balance?: number, error?: string }>}
 */
export async function requestWithdraw(payload) {
  try {
    const data = await apiFetch('withdraw/request.php', {
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
      balance: data.balance,
    };
  } catch (err) {
    return { ok: false, error: err.message || 'Erro ao solicitar saque.' };
  }
}

/**
 * Saque "de vitrine" (contas influenciadoras): registra como aprovado no servidor
 * e debita o saldo da carteira (o valor "some", como um saque real), devolvendo
 * o histórico salvo no banco e o novo saldo.
 * @param {{ amount: number, pix_key: string, pix_type: string }} payload
 * @returns {Promise<{ ok: boolean, balance?: number, withdrawals?: Array, error?: string }>}
 */
export async function createFakeWithdraw(payload) {
  try {
    const data = await apiFetch('user/fake-withdraw.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify(payload),
    });
    return { ok: true, balance: data.balance, withdrawals: data.withdrawals || [] };
  } catch (err) {
    return { ok: false, error: err.message || 'Erro ao solicitar saque.' };
  }
}

/**
 * Lista o histórico de saques "de vitrine" do usuário logado.
 * @returns {Promise<{ ok: boolean, balance?: number, withdrawals?: Array, error?: string }>}
 */
export async function fetchFakeWithdrawals() {
  try {
    const data = await apiFetch('user/fake-withdraw.php', {
      headers: { ...authHeaders() },
    });
    return { ok: true, balance: data.balance, withdrawals: data.withdrawals || [] };
  } catch (err) {
    return { ok: false, error: err.message || 'Erro ao carregar histórico.' };
  }
}

export const PIX_KEY_TYPES = ['CPF', 'Celular', 'Email', 'Aleatória'];
