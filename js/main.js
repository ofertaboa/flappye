import { appUrl, ensureWebServer } from '../platform/js/shared/paths.js';
import { apiUrl } from '../platform/js/shared/api.js';
import { loadSounds } from './audio.js';
import { resumeGameAudio } from './audioContext.js';
import { loadAssets } from './assets.js';
import { Game } from './game.js';
import { UIManager } from './ui/UIManager.js';
import { GAME_CONFIG, DEMO_MATCH_SETTINGS } from './config.js';
import { initBGM, stopBGM } from './bgm.js';
import {
  readPendingMatch,
  clearPendingMatch,
  settleGameSession,
  fetchUserWallet,
  saveWalletToStorage,
} from './api/gameWallet.js';
import { getDeviceProfile, markMobileRoot } from './deviceProfile.js';
import { LoadingScreen } from './ui/LoadingScreen.js';

markMobileRoot();

const isDemoMode = new URLSearchParams(window.location.search).get('mode') === 'demo';

const canvas = document.getElementById('game-canvas');
const inputLayer = document.getElementById('input-layer');
const container = document.getElementById('game-container');
const viewport = document.getElementById('game-viewport');
const gameStage = document.getElementById('game-stage');

let walletInfo = { free_rounds: 0, balance: 0 };

function goToDashboard() {
  window.location.href = appUrl('pages/dashboard.html');
}

function goToHome() {
  window.location.href = appUrl('index.html');
}

async function settleAndClear(session, winnings) {
  if (!session?.dbSessionId) return null;

  try {
    const res = await settleGameSession(session.dbSessionId, winnings);
    if (res.ok) {
      saveWalletToStorage({
        balance: res.balance,
        free_rounds: res.free_rounds,
      });
      walletInfo = { balance: res.balance, free_rounds: res.free_rounds };
    }
    return res;
  } catch (err) {
    console.warn('Não foi possível sincronizar o fim da partida:', err.message);
    return null;
  } finally {
    clearPendingMatch();
  }
}

const game = new Game(canvas, null);

function refreshCanvasResolution() {
  game.applyCanvasDpr();
}

const ui = new UIManager({
  isDemo: isDemoMode,
  wallet: () => walletInfo,
  onStartMatch: async (settings) => {
    stopBGM();

    if (settings.fromApi) {
      game.startMatch(settings);
      return;
    }

    goToDashboard();
  },
  onGoalContinue: () => game.onGoalContinue(),
  onGoalEnd: () => game.onGoalEnd(),
  onEndBet: () => game.onEndBet(),
  onLeaveGame: () => {
    stopBGM();
    if (isDemoMode) {
      restartDemoMatch();
      return;
    }
    goToDashboard();
  },
  onGameOverLeave: () => {
    stopBGM();
    goToHome();
  },
  onDemoRetry: () => {
    restartDemoMatch();
  },
  onDemoRegister: () => {
    window.location.href = appUrl('pages/register.html');
  },
});

game.ui = ui;
game.settleHandler = (session, winnings) => settleAndClear(session, winnings);

async function restartDemoMatch() {
  stopBGM();
  const demoSettings = await loadDemoMatchSettings();
  demoSettings.isDemo = true;
  game.startMatch(demoSettings);
}

async function loadDemoMatchSettings() {
  try {
    const res = await fetch(apiUrl('game/public-config.php'));
    const data = await res.json();
    if (data?.ok) {
      return {
        ...DEMO_MATCH_SETTINGS,
        difficulty: 'demo',
        rewardPerObstacle: data.demo_win_per_pipe ?? DEMO_MATCH_SETTINGS.rewardPerObstacle,
        fromApi: true,
      };
    }
  } catch {
    /* usa fallback local */
  }
  return { ...DEMO_MATCH_SETTINGS, fromApi: true };
}

async function bootstrap() {
  if (!ensureWebServer()) return;

  const loading = new LoadingScreen(document.getElementById('ui-root'));
  loading.mount();
  game.start();

  try {
    loading.setStatus('Carregando sons...');
    await loadSounds();
    loading.setProgress(15);

    loading.setStatus('Preparando áudio...');
    await initBGM();
    loading.setProgress(25);

    loading.setStatus('Carregando gráficos...');
    const ok = await loadAssets((ratio) => {
      loading.setProgress(25 + Math.round(ratio * 50));
    });

    loading.setStatus('Otimizando partida...');
    scheduleLayout();
    game.prewarmAfterLoad();
    loading.setProgress(85);

    const isDemo = isDemoMode;

    if (!isDemo) {
      loading.setStatus('Sincronizando conta...');
      const walletRes = await fetchUserWallet();
      if (walletRes.ok && walletRes.user) {
        walletInfo = walletRes.user;
        saveWalletToStorage(walletRes.user);
      } else {
        try {
          const raw = localStorage.getItem('flappy_user');
          if (raw) walletInfo = JSON.parse(raw);
        } catch {
          /* usa saldo em cache local */
        }
      }
    }
    loading.setProgress(96);

    if (ok) {
      if (isDemo) {
        loading.setStatus('Iniciando demonstração...');
        const demoSettings = await loadDemoMatchSettings();
        demoSettings.isDemo = true;
        await loading.finish();
        game.startMatch(demoSettings);
      } else {
        const pending = readPendingMatch();
        if (pending?.sessionId) {
          loading.setStatus('Entrando na partida...');
          await loading.finish();
          game.startMatch({
            betAmount: pending.betAmount,
            rewardPerObstacle: pending.rewardPerObstacle,
            difficulty: pending.difficulty,
            goal: pending.goal,
            dbSessionId: pending.sessionId,
            isFreeRound: pending.isFreeRound,
            fromApi: true,
          });
        } else {
          await loading.finish();
          goToDashboard();
        }
      }
    } else {
      await loading.finish();
    }
  } catch (err) {
    console.error('Falha ao iniciar o jogo:', err);
    await loading.finish().catch(() => {});
    const root = document.getElementById('ui-root') || document.body;
    root.innerHTML = `
      <div style="padding:1.5rem;text-align:center;color:#fff;font-family:system-ui,sans-serif">
        <p style="font-size:1.1rem;font-weight:700;margin:0 0 .75rem">Não foi possível carregar o jogo</p>
        <p style="opacity:.85;margin:0 0 1rem">${String(err?.message || err).replace(/</g, '&lt;')}</p>
        <p style="opacity:.7;font-size:.9rem">Tente Ctrl+F5 ou abra em aba anônima. Se persistir, confira se a pasta <code>js/</code> foi enviada completa.</p>
      </div>`;
  }
}

let lastPointerId = -1;
let lastPointerAt = 0;

function onFlapInput(e) {
  if (!game.acceptsInput()) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const now = performance.now();
  if (getDeviceProfile().mobile) {
    if (e.pointerId === lastPointerId && now - lastPointerAt < 50) return;
    lastPointerId = e.pointerId;
    lastPointerAt = now;
  }
  e.preventDefault();
  resumeGameAudio().catch(() => {});
  game.handleInput();
}

inputLayer.addEventListener('pointerdown', onFlapInput, { passive: false });

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();
    if (game.acceptsInput()) game.handleInput();
  }
});

function getStageSize() {
  if (!gameStage) {
    const vv = window.visualViewport;
    return {
      width: vv?.width ?? window.innerWidth,
      height: vv?.height ?? window.innerHeight,
    };
  }

  const rect = gameStage.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) {
    return { width: rect.width, height: rect.height };
  }

  const vv = window.visualViewport;
  return {
    width: vv?.width ?? window.innerWidth,
    height: vv?.height ?? window.innerHeight,
  };
}

let lastLayoutKey = '';

function applyLayout() {
  if (!container || !viewport || !gameStage) return;

  const profile = getDeviceProfile();
  const gw = GAME_CONFIG.width;
  const gh = GAME_CONFIG.height;
  const mobile = profile.mobile;
  const { width: sw, height: sh } = getStageSize();

  const scale = Math.max(sw / gw, sh / gh);
  const displayW = Math.ceil(gw * scale);
  const displayH = Math.ceil(gh * scale);

  container.style.width = `${displayW}px`;
  container.style.height = `${displayH}px`;

  const uiScale = displayW / gw;
  document.documentElement.style.fontSize = `${16 * uiScale}px`;
  gameStage.style.setProperty('--ui-scale', String(uiScale));

  document.body.classList.toggle('is-mobile', mobile);
  document.body.classList.toggle('is-desktop', !mobile);
  document.documentElement.classList.toggle('is-mobile-device', mobile);
  viewport.dataset.layout = mobile ? 'mobile' : 'desktop';

  const layoutKey = `${displayW}x${displayH}x${Math.min(window.devicePixelRatio || 1, profile.dprCap)}`;
  if (layoutKey !== lastLayoutKey) {
    lastLayoutKey = layoutKey;
    refreshCanvasResolution();
  }
}

let resizeRaf = 0;
let layoutDebounce = 0;

function scheduleLayout() {
  cancelAnimationFrame(resizeRaf);
  clearTimeout(layoutDebounce);
  resizeRaf = requestAnimationFrame(() => {
    layoutDebounce = window.setTimeout(applyLayout, getDeviceProfile().mobile ? 80 : 0);
  });
}

window.addEventListener('resize', scheduleLayout);
window.addEventListener('orientationchange', () => {
  scheduleLayout();
  setTimeout(scheduleLayout, 100);
  setTimeout(scheduleLayout, 350);
});
window.addEventListener('load', scheduleLayout);

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', scheduleLayout);
}

if (typeof ResizeObserver !== 'undefined' && gameStage) {
  new ResizeObserver(scheduleLayout).observe(gameStage);
}

scheduleLayout();
bootstrap();
