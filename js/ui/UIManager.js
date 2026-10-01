import { BetPanel } from './BetPanel.js';
import { GameHUD } from './GameHUD.js';
import { GoalModal } from './GoalModal.js';
import { GameOverModal } from './GameOverModal.js';
import { AudioToggle } from './AudioToggle.js';
import { DemoWinModal } from './DemoWinModal.js';

export class UIManager {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.root = document.getElementById('ui-root');
    this.isDemo = Boolean(callbacks.isDemo);

    this.betPanel = new BetPanel({
      onStart: (settings) => callbacks.onStartMatch(settings),
      getWallet: callbacks.wallet,
    });
    this.refreshBetPanelWallet = () => this.betPanel.refreshWallet();

    this.gameHUD = new GameHUD({ onEndBet: () => callbacks.onEndBet() });
    this.goalModal = new GoalModal({
      onContinue: () => callbacks.onGoalContinue(),
      onEnd: () => callbacks.onGoalEnd(),
      onBack: () => callbacks.onLeaveGame?.(),
      autoRedirect: false,
    });
    this.gameOverModal = new GameOverModal({
      onBack: () => callbacks.onGameOverLeave?.() ?? callbacks.onLeaveGame?.(),
      onRetry: () => callbacks.onDemoRetry?.(),
      autoRedirect: !this.isDemo,
      redirectMs: 10000,
      isDemo: this.isDemo,
    });
    this.demoWinModal = new DemoWinModal({
      onRegister: () => callbacks.onDemoRegister?.(),
    });
    this.audioToggle = new AudioToggle();

    this.readyOverlay = document.createElement('div');
    this.readyOverlay.className = 'ready-overlay hidden';
    this.readyOverlay.innerHTML = `
      <div class="ready-content">
        <p class="ready-title">TOQUE PARA COMEÇAR</p>
        <div class="ready-hand" aria-hidden="true">👆</div>
      </div>
    `;

    this.root.append(
      this.betPanel.element,
      this.gameHUD.element,
      this.readyOverlay,
      this.goalModal.element,
      this.gameOverModal.element,
      this.demoWinModal.element,
      this.audioToggle.element,
    );

    if (this.isDemo) {
      this.betPanel.element.classList.add('hidden');
      this.betPanel.element.setAttribute('aria-hidden', 'true');
    }
  }

  showBetMenu() {
    if (this.isDemo) return;
    this.betPanel.show();
    this.gameHUD.hide();
    this.readyOverlay.classList.add('hidden');
    this.goalModal.hide();
    this.gameOverModal.hide();
    this.demoWinModal.hide();
    this.audioToggle.hide();
  }

  showGameplayHUD(data) {
    this.betPanel.hide();
    this.gameHUD.show();
    this.gameHUD.update(data);
    this.goalModal.hide();
    this.gameOverModal.hide();
    this.demoWinModal.hide();
    this.audioToggle.show();
  }

  updateHUD(data) {
    this.gameHUD.update(data);
  }

  animateHUDProgress(target) {
    this.gameHUD.animateProgress(target);
  }

  showReadyHint() {
    this.readyOverlay.classList.remove('hidden');
  }

  hideReadyHint() {
    this.readyOverlay.classList.add('hidden');
    this.audioToggle.hide();
  }

  showGoalModal(data = {}) {
    this.goalModal.show(data);
  }

  showDemoWinModal(data) {
    this.demoWinModal.show(data);
  }

  showGameOver(data) {
    this.gameHUD.hide();
    this.readyOverlay.classList.add('hidden');
    this.audioToggle.hide();
    this.gameOverModal.show(data);
  }

  showFinish(data) {
    this.gameHUD.hide();
    this.readyOverlay.classList.add('hidden');
    this.audioToggle.hide();
    this.goalModal.showResult({ balance: data.balance, autoRedirect: false });
  }
}
