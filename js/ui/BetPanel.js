import { GAME_CONFIG } from '../config.js';
import { parseMoneyInput } from '../utils.js';

const FREE_ROUND_BET = 5;

export class DifficultySelector {
  constructor(onChange) {
    this.onChange = onChange;
    this.selected = GAME_CONFIG.defaultDifficulty;
    this.element = document.createElement('div');
    this.element.className = 'difficulty-selector';
    this.render();
  }

  render() {
    this.element.innerHTML = `
      <p class="field-label">Dificuldade</p>
      <div class="difficulty-options" role="group" aria-label="Dificuldade"></div>
    `;

    const options = this.element.querySelector('.difficulty-options');

    Object.entries(GAME_CONFIG.difficulties).forEach(([key, cfg]) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'difficulty-btn' + (key === this.selected ? ' active' : '');
      btn.dataset.difficulty = key;
      btn.textContent = cfg.label;
      btn.addEventListener('click', () => this.select(key));
      options.appendChild(btn);
    });
  }

  select(key) {
    this.selected = key;
    this.element.querySelectorAll('.difficulty-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.difficulty === key);
    });
    this.onChange?.(key);
  }

  getValue() {
    return this.selected;
  }
}

export class BetPanel {
  constructor({ onStart, getWallet }) {
    this.onStart = onStart;
    this.getWallet = getWallet;
    this.element = document.createElement('div');
    this.element.className = 'bet-panel';
    this.difficultySelector = new DifficultySelector();
    this.render();
    this.hide();
  }

  render() {
    this.element.innerHTML = `
      <div class="bet-panel-card">
        <div class="bet-panel-header">
          <h1>Flappy Pay</h1>
          <p>Configure sua aposta e mostre sua habilidade</p>
        </div>

        <div class="bet-free-round hidden" id="bet-free-round">
          <p class="bet-free-round__text" id="bet-free-round-text"></p>
          <button type="button" class="btn-secondary btn-free-round" id="btn-free-round">
            Rodada grátis (R$ 5,00)
          </button>
        </div>

        <div class="bet-fields">
          <label class="field">
            <span class="field-label">Valor da aposta</span>
            <div class="money-input-wrap">
              <span>R$</span>
              <input type="number" id="bet-amount" min="1" step="0.5"
                value="${GAME_CONFIG.defaultBetAmount}" inputmode="decimal" />
            </div>
          </label>

          <label class="field">
            <span class="field-label">Valor ganho por obstáculo</span>
            <div class="money-input-wrap">
              <span>R$</span>
              <input type="number" id="reward-per-obstacle" min="0.1" step="0.1"
                value="${GAME_CONFIG.defaultRewardPerObstacle}" inputmode="decimal" />
            </div>
          </label>
        </div>

        <div class="difficulty-mount"></div>

        <div class="meta-preview">
          <span>Meta da partida</span>
          <strong id="meta-preview">R$ 25,00</strong>
        </div>

        <button type="button" class="btn-primary btn-start" id="btn-start-match">
          Iniciar Partida
        </button>
      </div>
    `;

    this.element.querySelector('.difficulty-mount').appendChild(this.difficultySelector.element);

    this.betInput = this.element.querySelector('#bet-amount');
    this.rewardInput = this.element.querySelector('#reward-per-obstacle');
    this.metaPreview = this.element.querySelector('#meta-preview');
    this.freeRoundBox = this.element.querySelector('#bet-free-round');
    this.freeRoundText = this.element.querySelector('#bet-free-round-text');

    const updateMeta = () => {
      const bet = parseMoneyInput(this.betInput.value) || GAME_CONFIG.defaultBetAmount;
      const meta = bet * GAME_CONFIG.metaMultiplier;
      this.metaPreview.textContent = 'R$ ' + meta.toFixed(2).replace('.', ',');
    };

    this.betInput.addEventListener('input', updateMeta);
    this.rewardInput.addEventListener('input', updateMeta);
    updateMeta();

    this.element.querySelector('#btn-start-match').addEventListener('click', () => {
      const betAmount = parseMoneyInput(this.betInput.value) || GAME_CONFIG.defaultBetAmount;
      const rewardPerObstacle = parseMoneyInput(this.rewardInput.value) || GAME_CONFIG.defaultRewardPerObstacle;
      const difficulty = this.difficultySelector.getValue();

      if (betAmount <= 0 || rewardPerObstacle <= 0) return;

      this.onStart({
        betAmount,
        rewardPerObstacle,
        difficulty,
        goal: betAmount * GAME_CONFIG.metaMultiplier,
        useFreeRound: false,
      });
    });

    this.element.querySelector('#btn-free-round').addEventListener('click', () => {
      const rewardPerObstacle = parseMoneyInput(this.rewardInput.value) || GAME_CONFIG.defaultRewardPerObstacle;
      const difficulty = this.difficultySelector.getValue();

      this.onStart({
        betAmount: FREE_ROUND_BET,
        rewardPerObstacle,
        difficulty,
        goal: FREE_ROUND_BET * GAME_CONFIG.metaMultiplier,
        useFreeRound: true,
      });
    });

    this.refreshWallet();
  }

  refreshWallet() {
    const wallet = this.getWallet?.() || {};
    const free = Number(wallet.free_rounds || 0);

    if (free > 0) {
      this.freeRoundBox.classList.remove('hidden');
      this.freeRoundText.textContent =
        `Você tem ${free} rodada${free > 1 ? 's' : ''} grátis — aposta fixa R$ ${FREE_ROUND_BET},00.`;
    } else {
      this.freeRoundBox.classList.add('hidden');
    }
  }

  show() {
    this.refreshWallet();
    this.element.classList.remove('hidden');
  }

  hide() {
    this.element.classList.add('hidden');
  }
}
