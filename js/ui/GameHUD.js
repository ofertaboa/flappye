import { ProgressBar } from './ProgressBar.js';
import { formatMoney } from '../utils.js';

export class GameHUD {
  constructor({ onEndBet }) {
    this.onEndBet = onEndBet;
    this.displayedProgress = 0;
    this._lastGoalText = '';
    this._lastBalanceText = '';
    this._lastEndButton = null;
    this.element = document.createElement('div');
    this.element.className = 'game-hud hidden';
    this.progressBar = new ProgressBar();
    this.render();
    this.hide();
  }

  render() {
    this.element.innerHTML = `
      <div class="hud-shell">
        <div class="hud-main-row">
          <div class="hud-balance-block">
            <span class="hud-label">Saldo</span>
            <strong class="hud-value-amount hud-balance" id="hud-balance">R$ 0,00</strong>
            <div class="hud-progress-mount"></div>
          </div>
          <div class="hud-goal-corner">
            <span class="hud-label hud-goal-label">Meta</span>
            <strong class="hud-value-amount hud-goal-value" id="hud-goal">R$ 0,00</strong>
          </div>
        </div>
      </div>

      <button type="button" class="btn-rescue hidden" id="btn-rescue">
        <span class="btn-rescue-shine"></span>
        <span class="btn-rescue-text">ENCERRAR APOSTA</span>
      </button>
    `;

    this.balanceEl = this.element.querySelector('#hud-balance');
    this.element.querySelector('.hud-progress-mount').appendChild(this.progressBar.element);
    this.element.querySelector('#btn-rescue').addEventListener('click', () => this.onEndBet?.());
  }

  update({ goal, balance, progress, showEndButton }) {
    const goalText = formatMoney(goal);
    const balanceText = formatMoney(balance);

    if (goalText !== this._lastGoalText) {
      this._lastGoalText = goalText;
      this.element.querySelector('#hud-goal').textContent = goalText;
    }

    if (balanceText !== this._lastBalanceText) {
      this._lastBalanceText = balanceText;
      this.balanceEl.textContent = balanceText;
    }

    this.displayedProgress = progress;
    this.progressBar.setProgress(progress);

    if (showEndButton !== this._lastEndButton) {
      this._lastEndButton = showEndButton;
      this.element.querySelector('#btn-rescue').classList.toggle('hidden', !showEndButton);
    }
  }

  animateProgress(target, dt = 0.12) {
    this.displayedProgress += (target - this.displayedProgress) * dt;
    this.progressBar.setProgress(this.displayedProgress);
  }

  show() {
    this.element.classList.remove('hidden');
  }

  hide() {
    this.element.classList.add('hidden');
    this.element.querySelector('#btn-rescue').classList.add('hidden');
  }
}
