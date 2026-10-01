import { apiFetch } from '../../shared/api.js';
import { authHeaders } from '../../shared/auth.js';

export const FREE_ROUND_BET = 5;

export async function fetchUserWallet() {
  try {
    const data = await apiFetch(`user/me.php?_=${Date.now()}`, {
      headers: authHeaders(),
      cache: 'no-store',
      timeout: 9000,
      retries: 1,
    });
    const user = data.user ? {
      ...data.user,
      balance: Number(data.user.balance),
      free_rounds: Number(data.user.free_rounds ?? 0),
      rollover: data.user.rollover ?? { remaining: 0, can_withdraw: true, obligations: [] },
    } : null;
    return { ok: true, user };
  } catch (err) {
    const local = getLocalWallet();
    if (local) {
      return {
        ok: true,
        user: {
          ...local,
          balance: Number(local.balance ?? 0),
          free_rounds: Number(local.free_rounds ?? 0),
        },
        stale: true,
        error: err.message,
      };
    }
    return { ok: false, error: err.message };
  }
}

export async function fetchPlatformConfig() {
  try {
    const data = await apiFetch(`user/platform.php?_=${Date.now()}`, { headers: authHeaders() });
    return { ok: true, platform: data.platform };
  } catch {
    return { ok: false, platform: null };
  }
}

export function saveUserWallet(user, { fromServer = false } = {}) {
  try {
    const raw = localStorage.getItem('flappy_user');
    const prev = raw ? JSON.parse(raw) : {};
    const balance = fromServer && user.balance != null
      ? Number(user.balance)
      : Number(user.balance ?? prev.balance ?? 0);

    localStorage.setItem('flappy_user', JSON.stringify({
      ...prev,
      ...user,
      balance,
      free_rounds: Number(user.free_rounds ?? prev.free_rounds ?? 0),
    }));
  } catch {
    localStorage.setItem('flappy_user', JSON.stringify({
      ...user,
      balance: Number(user.balance ?? 0),
    }));
  }
}

export function getLocalWallet() {
  try {
    const raw = localStorage.getItem('flappy_user');
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return null;
}

export async function startGameSession({ bet, useFreeRound = false }) {
  const data = await apiFetch('game/start.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({
      bet: useFreeRound ? FREE_ROUND_BET : bet,
      use_free_round: useFreeRound,
    }),
    timeout: 15000,
    retries: 2,
  });

  return data;
}

export async function changePassword({ currentPassword, newPassword, confirmPassword }) {
  await apiFetch('user/password.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    }),
  });
  return { ok: true };
}

export function persistMatchSession(data) {
  sessionStorage.setItem('flappy_game_session', String(data.session_id));
  sessionStorage.setItem('flappy_bet', String(data.bet));
  sessionStorage.setItem('flappy_free_round', data.is_free_round ? '1' : '0');
  sessionStorage.setItem('flappy_match_goal', String(data.goal));
  sessionStorage.setItem('flappy_match_reward', String(data.reward_per_obstacle));
  sessionStorage.setItem('flappy_match_difficulty', data.difficulty || 'medium');
}
