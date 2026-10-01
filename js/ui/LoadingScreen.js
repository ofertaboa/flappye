export class LoadingScreen {
  constructor(root) {
    this.root = root;
    this.element = document.createElement('div');
    this.element.className = 'game-loading-screen';
    this.element.innerHTML = `
      <div class="game-loading-card">
        <p class="game-loading-title">Flappy Pay</p>
        <p class="game-loading-status">Preparando o jogo...</p>
        <div class="game-loading-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
          <div class="game-loading-fill"></div>
        </div>
        <p class="game-loading-percent">0%</p>
      </div>
    `;
    this.statusEl = this.element.querySelector('.game-loading-status');
    this.fillEl = this.element.querySelector('.game-loading-fill');
    this.percentEl = this.element.querySelector('.game-loading-percent');
    this.trackEl = this.element.querySelector('.game-loading-track');
    this.progress = 0;
  }

  mount() {
    this.root.appendChild(this.element);
  }

  setStatus(text) {
    if (this.statusEl) this.statusEl.textContent = text;
  }

  setProgress(value) {
    const pct = Math.max(0, Math.min(100, Math.round(value)));
    if (pct <= this.progress) return;
    this.progress = pct;
    if (this.fillEl) this.fillEl.style.width = `${pct}%`;
    if (this.percentEl) this.percentEl.textContent = `${pct}%`;
    if (this.trackEl) this.trackEl.setAttribute('aria-valuenow', String(pct));
  }

  async finish() {
    this.setProgress(100);
    this.setStatus('Pronto!');
    await new Promise((resolve) => window.setTimeout(resolve, 220));
    this.element.classList.add('game-loading-screen--hide');
    await new Promise((resolve) => window.setTimeout(resolve, 280));
    this.element.remove();
  }
}
