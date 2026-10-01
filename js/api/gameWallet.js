import { apiFetch } from '../../platform/js/shared/api.js';
import { authHeaders } from '../../platform/js/shared/auth.js';

function readCachedWallet() {
  try {
    const raw = localStorage.getItem('flappy_user');
    if (!raw) return null;
    const user = JSON.parse(raw);
    return {
      ok: true,
      user: {
        ...user,
        balance: Number(user.balance ?? 0),
        free_rounds: Number(user.free_rounds ?? 0),
      },
      cached: true,
    };
  } catch {
    return null;
  }
}

export async function fetchUserWallet() {
  try {
    const data = await apiFetch(`user/me.php?_=${Date.now()}`, {
      headers: authHeaders(),
      cache: 'no-store',
      timeout: 9000,
      retries: 1,
    });
    return {
      ok: true,
      user: data.user ? {
        ...data.user,
        balance: Number(data.user.balance),
        free_rounds: Number(data.user.free_rounds ?? 0),
      } : null,
    };
  } catch (err) {
    const cached = readCachedWallet();
    if (cached) {
      return { ...cached, stale: true, error: err.message };
    }
    return { ok: false, error: err.message };
  }
}

export async function startGameSession(payload) {
  const data = await apiFetch('game/start.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
    timeout: 15000,
    retries: 2,
  });
  return { ok: true, ...data };
}

export async function settleGameSession(sessionId, winnings) {
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const data = await apiFetch('game/settle.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({ session_id: sessionId, winnings }),
        timeout: 15000,
      });
      return { ok: true, ...data };
    } catch (err) {
      lastErr = err;
      if (attempt < 2) {
        await new Promise((resolve) => window.setTimeout(resolve, 700 * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

export function readPendingMatch() {
  const sessionId = Number(sessionStorage.getItem('flappy_game_session') || 0);
  if (!sessionId) return null;

  return {
    sessionId,
    betAmount: parseFloat(sessionStorage.getItem('flappy_bet') || '5'),
    isFreeRound: sessionStorage.getItem('flappy_free_round') === '1',
    goal: parseFloat(sessionStorage.getItem('flappy_match_goal') || '25'),
    rewardPerObstacle: parseFloat(sessionStorage.getItem('flappy_match_reward') || '1'),
    difficulty: sessionStorage.getItem('flappy_match_difficulty') || 'medium',
  };
}

export function clearPendingMatch() {
  [
    'flappy_game_session',
    'flappy_bet',
    'flappy_free_round',
    'flappy_match_goal',
    'flappy_match_reward',
    'flappy_match_difficulty',
  ].forEach((k) => sessionStorage.removeItem(k));
}

export function saveWalletToStorage(user) {
  try {
    const raw = localStorage.getItem('flappy_user');
    const prev = raw ? JSON.parse(raw) : {};
    localStorage.setItem('flappy_user', JSON.stringify({
      ...prev,
      ...user,
      balance: Number(user.balance ?? prev.balance ?? 0),
      free_rounds: Number(user.free_rounds ?? prev.free_rounds ?? 0),
    }));
  } catch {
    localStorage.setItem('flappy_user', JSON.stringify(user));
  }
}
