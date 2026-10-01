import { formatMoney } from '../utils.js';

function moneyAmountOnly(value) {
  return formatMoney(value).replace(/^R\$\s*/, '');
}

export class GoalModal {
  constructor({ onContinue, onEnd, onBack, autoRedirect = false, redirectMs = 2000 } = {}) {
    this.onContinue = onContinue;
    this.onEnd = onEnd;
    this.onBack = onBack;
    this.autoRedirect = autoRedirect;
    this.redirectMs = redirectMs;
    this._timer = null;
    this.element = document.createElement('div');
    this.element.className = 'goal-modal-overlay hidden';
    this.render();
    this.hide();
  }

  render() {
    this.element.innerHTML = `
      <div class="goal-modal-panel" role="dialog" aria-labelledby="goal-modal-title" aria-modal="true">
        <div class="goal-modal-head">
          <div class="goal-modal-icon" aria-hidden="true">🏆</div>
          <h2 id="goal-modal-title" class="goal-modal-title">Meta atingida!</h2>
          <p class="goal-modal-subtitle" id="goal-modal-subtitle">Parabéns! Você completou sua meta de ganhos.</p>
        </div>

        <div class="goal-modal-montante">
          <span class="goal-modal-montante__label" id="goal-modal-label">Você ganhou</span>
          <strong class="goal-modal-montante__value">
            <small class="goal-modal-montante__currency">R$</small>
            <span id="goal-modal-amount">0,00</span>
          </strong>
        </div>

        <p class="goal-modal-hint" id="goal-modal-hint">
          O saldo será creditado na sua carteira para saque!
        </p>

        <div class="goal-modal-actions" id="goal-modal-prompt-actions">
          <button type="button" class="goal-modal-btn goal-modal-btn--secondary" data-action="continue">
            Continuar
          </button>
          <button type="button" class="goal-modal-btn goal-modal-btn--primary" data-action="end">
            Encerrar
          </button>
        </div>

        <div class="goal-modal-result hidden" id="goal-modal-result-actions">
          <p class="goal-modal-countdown" id="goal-modal-countdown" hidden></p>
          <button type="button" class="goal-modal-btn goal-modal-btn--primary goal-modal-btn--full" data-action="back">
            Voltar ao início!
          </button>
        </div>
      </div>
    `;

    this.amountEl = this.element.querySelector('#goal-modal-amount');
    this.subtitleEl = this.element.querySelector('#goal-modal-subtitle');
    this.promptActions = this.element.querySelector('#goal-modal-prompt-actions');
    this.resultActions = this.element.querySelector('#goal-modal-result-actions');
    this.countdownEl = this.element.querySelector('#goal-modal-countdown');

    this.element.querySelector('[data-action="continue"]').addEventListener('click', () => {
      this.hide();
      this.onContinue?.();
    });

    this.element.querySelector('[data-action="end"]').addEventListener('click', () => {
      this.hide();
      this.onEnd?.();
    });

    this.element.querySelector('[data-action="back"]').addEventListener('click', () => {
      this.goBack();
    });
  }

  clearTimer() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  goBack() {
    this.clearTimer();
    this.hide();
    this.onBack?.();
  }

  setAmount(balance) {
    this.amountEl.textContent = moneyAmountOnly(balance);
  }

  /** Meta batida — continuar ou encerrar. */
  show({ balance = 0 } = {}) {
    this.clearTimer();
    this.setAmount(balance);
    this.subtitleEl.textContent = 'Parabéns! Você completou sua meta de ganhos.';
    this.promptActions.classList.remove('hidden');
    this.resultActions.classList.add('hidden');
    this.countdownEl.hidden = true;
    this.element.classList.remove('hidden');
  }

  /** Aposta encerrada — mesmo visual, valor final alcançado. */
  showResult({ balance = 0, autoRedirect, redirectMs } = {}) {
    this.clearTimer();
    this.setAmount(balance);
    this.subtitleEl.textContent = 'Você encerrou a aposta com este saldo.';
    this.promptActions.classList.add('hidden');
    this.resultActions.classList.remove('hidden');

    const useRedirect = autoRedirect ?? this.autoRedirect;
    const ms = redirectMs ?? this.redirectMs;

    this.element.classList.remove('hidden');

    if (useRedirect && ms > 0) {
      const seconds = Math.ceil(ms / 1000);
      this.countdownEl.hidden = false;
      this.countdownEl.textContent = `Redirecionando em ${seconds}s...`;
      this._timer = window.setTimeout(() => this.goBack(), ms);
    } else {
      this.countdownEl.hidden = true;
    }
  }

  hide() {
    this.clearTimer();
    this.element.classList.add('hidden');
  }
}
