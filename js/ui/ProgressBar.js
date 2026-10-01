export class ProgressBar {
  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'progress-bar';
    this.element.innerHTML = `
      <div class="progress-track">
        <div class="progress-fill">
          <div class="progress-shine"></div>
        </div>
        <div class="progress-glow"></div>
      </div>
      <span class="progress-percent">0%</span>
    `;
    this.fill = this.element.querySelector('.progress-fill');
    this.glow = this.element.querySelector('.progress-glow');
    this.percent = this.element.querySelector('.progress-percent');
    this._lastPct = -1;
  }

  setProgress(ratio) {
    const clamped = Math.max(0, Math.min(1, ratio));
    const pct = Math.round(clamped * 100);
    const widthPct = Math.round(clamped * 200) / 2;
    const width = `${widthPct}%`;

    if (this.fill.style.width !== width) {
      this.fill.style.width = width;
      this.glow.style.width = width;
    }

    if (pct !== this._lastPct) {
      this._lastPct = pct;
      this.percent.textContent = `${pct}%`;
      this.element.classList.toggle('progress-complete', pct >= 100);
    }
  }
}
