import { formatMoney } from '../utils.js';

function moneyAmountOnly(value) {
  return formatMoney(value).replace(/^R\$\s*/, '');
}

export class DemoWinModal {
  constructor({ onRegister }) {
    this.onRegister = onRegister;
    this.element = document.createElement('div');
    this.element.className = 'goal-modal-overlay demo-result-overlay hidden';
    this.render();
  }

  render() {
    this.element.innerHTML = `
      <div class="goal-modal-panel demo-result-panel" role="dialog" aria-labelledby="demo-win-title" aria-modal="true">
        <div class="goal-modal-head">
          <div class="goal-modal-icon demo-result-icon" aria-hidden="true">🏆</div>
          <h2 id="demo-win-title" class="goal-modal-title">Meta batida!</h2>
          <p class="goal-modal-subtitle demo-result-subtitle">
            No modo real, você sacaria:
          </p>
        </div>

        <div class="goal-modal-montante demo-result-montante">
          <strong class="goal-modal-montante__value demo-result-amount">
            <small class="goal-modal-montante__currency">R$</small>
            <span id="demo-win-amount">0,00</span>
          </strong>
        </div>

        <p class="goal-modal-hint demo-result-hint">
          Crie sua conta e jogue valendo dinheiro de verdade — saque via PIX.
        </p>

        <div class="goal-modal-actions demo-result-actions">
          <button type="button" class="goal-modal-btn goal-modal-btn--primary goal-modal-btn--full" data-action="register">
            Criar conta agora
          </button>
        </div>
      </div>
    `;

    this.amountEl = this.element.querySelector('#demo-win-amount');

    this.element.querySelector('[data-action="register"]').addEventListener('click', () => {
      this.hide();
      this.onRegister?.();
    });
  }

  show({ balance }) {
    this.amountEl.textContent = moneyAmountOnly(balance);
    this.element.classList.remove('hidden');
  }

  hide() {
    this.element.classList.add('hidden');
  }
}
