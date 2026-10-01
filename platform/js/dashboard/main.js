import { el } from '../shared/dom.js';
import { appUrl, ensureWebServer } from '../shared/paths.js';
import { formatMoney } from '../shared/ui/format.js';
import { showToast } from '../shared/ui/toast.js';
import { DashboardHeader } from './components/DashboardHeader.js';
import { BannerCarousel } from './components/BannerCarousel.js';
import { PlayCard, storeBet } from './components/PlayCard.js';
import { WinsTicker } from './components/WinsTicker.js';
import { DashboardFooter } from './components/DashboardFooter.js';
import { DepositModal } from './components/DepositModal.js';
import { PixPaymentModal } from './components/PixPaymentModal.js';
import { WithdrawModal } from './components/WithdrawModal.js';
import { GameValueModal } from './components/GameValueModal.js';
import { ReferralModal } from './components/ReferralModal.js';
import { ProfileModal } from './components/ProfileModal.js';
import { GiftModal } from './components/GiftModal.js';
import {
  fetchUserWallet,
  fetchPlatformConfig,
  saveUserWallet,
  startGameSession,
  persistMatchSession,
  getLocalWallet,
} from './api/user.js';
import { redirectToLogin } from './api/deposit.js';

const DEMO_USER = {
  name: 'João Silva',
  balance: 150.0,
  free_rounds: 0,
  id: 0,
};

const EMPTY_WALLET = {
  name: 'Jogador',
  balance: 0,
  free_rounds: 0,
  id: 0,
};

let walletState = { ...EMPTY_WALLET };

function saveUser(user, fromServer = false) {
  saveUserWallet(user, { fromServer });
  walletState = {
    ...walletState,
    ...user,
    balance: fromServer && user.balance != null
      ? Number(user.balance)
      : Number(user.balance ?? walletState.balance ?? 0),
    free_rounds: Number(user.free_rounds ?? walletState.free_rounds ?? 0),
  };
}

function updateBalanceDisplay(balance) {
  const amountEl = document.querySelector('.dash-header__amount');
  if (amountEl) amountEl.textContent = formatMoney(balance);
}

function loadUser() {
  const hasToken = Boolean(localStorage.getItem('flappy_token'));
  try {
    const raw = localStorage.getItem('flappy_user');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...(hasToken ? EMPTY_WALLET : DEMO_USER),
        ...parsed,
        name: parsed.name || (hasToken ? 'Jogador' : DEMO_USER.name),
        balance: Number(parsed.balance ?? 0),
        free_rounds: Number(parsed.free_rounds ?? 0),
        id: Number(parsed.id ?? 0),
      };
    }
  } catch {
    /* usa fallback */
  }
  return hasToken ? { ...EMPTY_WALLET } : { ...DEMO_USER };
}

async function syncWalletFromServer() {
  if (!localStorage.getItem('flappy_token')) return loadUser();

  const res = await fetchUserWallet();
  if (res.ok && res.user) {
    saveUser(res.user, true);
    updateBalanceDisplay(res.user.balance);
    return res.user;
  }

  console.warn('Não foi possível sincronizar saldo:', res.error);
  return null;
}

async function launchGame({ bet, useFreeRound = false }) {
  if (!localStorage.getItem('flappy_token')) {
    showToast('Faça login para jogar.', { type: 'error' });
    redirectToLogin();
    throw new Error('Login necessário');
  }

  try {
    const data = await startGameSession({ bet, useFreeRound });
    saveUser({
      ...walletState,
      balance: data.balance,
      free_rounds: data.free_rounds,
    });
    updateBalanceDisplay(data.balance);
    persistMatchSession(data);
    storeBet(data.bet);
    window.location.href = appUrl('game.html');
  } catch (err) {
    showToast(
      err.message?.includes('demorou')
        ? 'Servidor lento. Tente novamente em alguns segundos.'
        : (err.message || 'Não foi possível iniciar a partida.'),
      { type: 'error' },
    );
    throw err;
  }
}

function DashboardPage() {
  const user = loadUser();
  walletState = { ...user };

  let playCardRef = null;
  let gameModalRef = null;

  const pixModal = PixPaymentModal({
    onPaid: ({ balance }) => {
      const next = { ...walletState, balance };
      saveUser(next);
      updateBalanceDisplay(balance);
    },
  });
  const depositModal = DepositModal({
    onOpenPix: (data) => pixModal.open(data),
  });
  const withdrawModal = WithdrawModal({
    getWallet: () => walletState,
    getRollover: () => walletState.rollover,
    onSuccess: ({ balance }) => {
      const next = { ...walletState, balance };
      saveUser(next);
      updateBalanceDisplay(balance);
    },
  });
  const gameModal = GameValueModal({
    onStart: launchGame,
    getWallet: () => walletState,
  });
  gameModalRef = gameModal;

  const referralModal = ReferralModal();
  const profileModal = ProfileModal({ getUser: () => walletState });
  const giftModal = GiftModal({
    onWalletUpdate: ({ balance, free_rounds }) => {
      saveUser({ ...walletState, balance, free_rounds });
      updateBalanceDisplay(balance);
      playCardRef?.refreshFreeRound();
      gameModalRef?.refreshFreeBanner();
    },
  });

  const playCard = PlayCard({
    onStart: launchGame,
    getWallet: () => walletState,
  });
  playCardRef = playCard;

  syncWalletFromServer().then((u) => {
    if (!u) return;
    walletState = { ...walletState, ...u };
    updateBalanceDisplay(walletState.balance);
    playCardRef?.refreshFreeRound();
    gameModalRef?.refreshFreeBanner();
  });

  let walletSyncInFlight = false;
  let walletSyncQueued = false;
  let walletSyncPausedUntil = 0;

  async function refreshWalletFromServer() {
    if (!localStorage.getItem('flappy_token')) return;
    if (Date.now() < walletSyncPausedUntil) return;
    if (walletSyncInFlight) {
      walletSyncQueued = true;
      return;
    }

    walletSyncInFlight = true;
    try {
      const u = await syncWalletFromServer();
      if (u) {
        walletState = { ...walletState, ...u };
        updateBalanceDisplay(walletState.balance);
        playCardRef?.refreshFreeRound();
        gameModalRef?.refreshFreeBanner();
      } else {
        walletSyncPausedUntil = Date.now() + 60000;
      }
    } finally {
      walletSyncInFlight = false;
      if (walletSyncQueued) {
        walletSyncQueued = false;
        refreshWalletFromServer();
      }
    }
  }

  function scheduleWalletRefresh() {
    if (document.visibilityState === 'hidden') return;
    refreshWalletFromServer();
  }

  fetchPlatformConfig().then((res) => {
    if (res.ok && res.platform?.maintenance) {
      showToast('Plataforma em manutenção. Tente novamente em breve.', { type: 'error' });
    }
    if (res.ok && res.platform?.meta_multiplier != null) {
      playCardRef?.setMetaMultiplier?.(res.platform.meta_multiplier);
      gameModalRef?.setMetaMultiplier?.(res.platform.meta_multiplier);
    }
  });

  document.addEventListener('visibilitychange', scheduleWalletRefresh);
  window.addEventListener('focus', scheduleWalletRefresh);
  window.addEventListener('pageshow', scheduleWalletRefresh);
  setInterval(scheduleWalletRefresh, 60000);

  return el('div', { className: 'dashboard-shell' }, [
    DashboardHeader({
      user: walletState,
      onProfile: () => profileModal.open(),
      onReferral: () => referralModal.open(),
    }),
    el('main', { className: 'dash-main', id: 'dash-main' }, [
      BannerCarousel({
        onAction: {
          deposit: () => depositModal.open(),
          gifts: () => giftModal.open(),
          play: () => gameModal.open(),
          referral: () => referralModal.open(),
        },
      }),
      playCard.el,
      WinsTicker(),
    ]),
    DashboardFooter({
      onDeposit: () => depositModal.open(),
      onWithdraw: () => withdrawModal.open(),
      onOpenBet: () => gameModal.open(),
      onReferral: () => referralModal.open(),
      onGifts: () => giftModal.open(),
    }),
    depositModal.el,
    pixModal.el,
    withdrawModal.el,
    gameModal.el,
    referralModal.el,
    profileModal.el,
    giftModal.el,
  ]);
}

export function bootstrapDashboard() {
  if (!ensureWebServer()) return;

  const app = document.getElementById('app');
  if (!app) return;

  try {
    app.replaceChildren(DashboardPage());
  } catch (err) {
    console.error(err);
    app.replaceChildren(el('div', {
      className: 'dash-form-error',
      style: 'margin:2rem;padding:1rem;text-align:center',
    }, [
      'Não foi possível carregar a dashboard. ',
      el('a', { href: appUrl('pages/login.html') }, ['Faça login novamente']),
    ]));
  }
}

document.addEventListener('DOMContentLoaded', bootstrapDashboard);
