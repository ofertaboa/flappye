import { formatMoney } from '../utils.js';

function moneyAmountOnly(value) {
  return formatMoney(value).replace(/^R\$\s*/, '');
}

export class GameOverModal {
  constructor({ onBack, onRetry, autoRedirect = true, redirectMs = 10000, isDemo = false } = {}) {
    this.onBack = onBack;
    this.onRetry = onRetry;
    this.autoRedirect = autoRedirect;
    this.redirectMs = redirectMs;
    this.isDemo = isDemo;
    this._timer = null;
    this.element = document.createElement('div');
    this.element.className = 'goal-modal-overlay gameover-overlay hidden';
    this.render();
  }

  render() {
    this.element.innerHTML = `
      <div class="goal-modal-panel gameover-panel" role="dialog" aria-labelledby="gameover-title" aria-modal="true">
        <div class="goal-modal-head">
          <div class="goal-modal-icon gameover-icon" aria-hidden="true">💥</div>
          <h2 id="gameover-title" class="goal-modal-title gameover-title">Não foi dessa vez</h2>
          <p class="goal-modal-subtitle" id="go-lead">O pássaro bateu! Tente de novo na próxima partida.</p>
        </div>

        <div class="gameover-stats" id="go-stats">
          <div class="gameover-stat">
            <span class="gameover-stat__label">Canos passados</span>
            <strong class="gameover-stat__value" id="go-score">0</strong>
          </div>
          <div class="gameover-stat">
            <span class="gameover-stat__label" id="go-progress-label">Progresso</span>
            <strong class="gameover-stat__value gameover-stat__value--money">
              <small>R$</small><span id="go-progress">0,00</span>
            </strong>
          </div>
        </div>

        <div class="goal-modal-montante gameover-montante hidden" id="go-credited-wrap">
          <span class="goal-modal-montante__label" id="go-credited-label">Creditado na carteira</span>
          <strong class="goal-modal-montante__value">
            <small class="goal-modal-montante__currency">R$</small>
            <span id="go-credited">0,00</span>
          </strong>
        </div>

        <p class="goal-modal-hint gameover-note" id="go-note" hidden>
          Meta não atingida — nada foi creditado na carteira desta partida.
        </p>
        <p class="gameover-cashback" id="go-cashback" hidden></p>

        <button type="button" class="goal-modal-btn goal-modal-btn--primary gameover-btn" data-action="back">
          Voltar ao início!
        </button>
      </div>
    `;

    this.backBtn = this.element.querySelector('[data-action="back"]');
    this.backBtn.addEventListener('click', () => this.goBack());
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
    if (this.isDemo) {
      this.onRetry?.();
      return;
    }
    this.onBack?.();
  }

  show({
    matchBalance = 0,
    goal = 0,
    score = 0,
    credited = false,
    forfeitedAfterGoal = false,
    cashbackEarned = 0,
  } = {}) {
    const leadEl = this.element.querySelector('#go-lead');
    const noteEl = this.element.querySelector('#go-note');
    const cashbackEl = this.element.querySelector('#go-cashback');
    const creditedWrap = this.element.querySelector('#go-credited-wrap');
    const progressLabel = this.element.querySelector('#go-progress-label');
    const statsEl = this.element.querySelector('#go-stats');
    const panel = this.element.querySelector('.gameover-panel');

    if (this.isDemo) {
      panel.classList.remove('is-credited');
      this.element.querySelector('.gameover-icon').textContent = '💥';
      this.element.querySelector('.gameover-title').textContent = 'Não foi dessa vez';
      leadEl.textContent = 'Tente novamente!';
      statsEl.classList.add('hidden');
      creditedWrap.classList.add('hidden');
      noteEl.hidden = true;
      cashbackEl.hidden = true;
      this.backBtn.textContent = 'Tentar novamente';
    } else {
      statsEl.classList.remove('hidden');
      this.backBtn.textContent = 'Voltar ao início!';
      this.element.querySelector('#go-score').textContent = String(score);
      this.element.querySelector('#go-progress').textContent = moneyAmountOnly(matchBalance);

      if (credited) {
        panel.classList.add('is-credited');
        this.element.querySelector('.gameover-icon').textContent = '✅';
        this.element.querySelector('.gameover-title').textContent = 'Partida encerrada';
        leadEl.textContent = 'Você já tinha batido a meta. Seus ganhos foram creditados na carteira.';
        creditedWrap.classList.remove('hidden');
        noteEl.hidden = true;
        cashbackEl.hidden = true;
        this.element.querySelector('#go-credited').textContent = moneyAmountOnly(matchBalance);
        progressLabel.textContent = goal > 0 ? `Meta R$ ${moneyAmountOnly(goal)}` : 'Meta';
      } else if (forfeitedAfterGoal) {
        panel.classList.remove('is-credited');
        this.element.querySelector('.gameover-icon').textContent = '💥';
        this.element.querySelector('.gameover-title').textContent = 'Não foi dessa vez';
        leadEl.textContent = 'Você tinha batido a meta, mas bateu antes de encerrar a aposta.';
        creditedWrap.classList.add('hidden');
        progressLabel.textContent = goal > 0 ? `Meta R$ ${moneyAmountOnly(goal)}` : 'Progresso';
        noteEl.hidden = false;
        noteEl.textContent = 'Perdeu tudo desta partida. Encerre a aposta a tempo para creditar os ganhos.';
        cashbackEl.hidden = cashbackEarned <= 0;
        if (cashbackEarned > 0) {
          cashbackEl.textContent = `Cashback: ${formatMoney(cashbackEarned)} creditado no seu saldo.`;
        }
      } else {
        panel.classList.remove('is-credited');
        this.element.querySelector('.gameover-icon').textContent = '💥';
        this.element.querySelector('.gameover-title').textContent = 'Não foi dessa vez';
        leadEl.textContent = 'O pássaro bateu! Tente de novo na próxima partida.';
        creditedWrap.classList.add('hidden');
        progressLabel.textContent = goal > 0 ? `Meta R$ ${moneyAmountOnly(goal)}` : 'Progresso';
        noteEl.hidden = cashbackEarned > 0;
        if (cashbackEarned > 0) {
          cashbackEl.hidden = false;
          cashbackEl.textContent = `Cashback: ${formatMoney(cashbackEarned)} creditado no seu saldo.`;
        } else {
          cashbackEl.hidden = true;
        }
      }
    }

    this.element.classList.remove('hidden');
    this.clearTimer();

    if (this.autoRedirect && this.redirectMs > 0) {
      this._timer = window.setTimeout(() => this.goBack(), this.redirectMs);
    }
  }

  hide() {
    this.clearTimer();
    this.element.classList.add('hidden');
  }
}
