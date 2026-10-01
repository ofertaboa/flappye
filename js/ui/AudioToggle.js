import { setGameMuted, isGameMuted } from '../audio.js';

const ICON_ON = `
  <svg class="audio-toggle-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path fill="#ffffff" d="M10.2 8.1 6.4 11H3.8v2h2.6l3.8 2.9V8.1z"/>
    <path d="M13.4 10.3c.8.65.8 2.35 0 3" stroke="#ffffff" stroke-width="1.75" stroke-linecap="round"/>
    <path d="M15.7 8.5c1.5 1.25 1.5 5.75 0 7" stroke="#ffffff" stroke-width="1.75" stroke-linecap="round"/>
  </svg>`;

const ICON_OFF = `
  <svg class="audio-toggle-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path fill="rgba(255,255,255,0.45)" d="M10.2 8.1 6.4 11H3.8v2h2.6l3.8 2.9V8.1z"/>
    <path d="M13.4 10.3c.8.65.8 2.35 0 3" stroke="rgba(255,255,255,0.35)" stroke-width="1.75" stroke-linecap="round"/>
    <path d="M15.7 8.5c1.5 1.25 1.5 5.75 0 7" stroke="rgba(255,255,255,0.25)" stroke-width="1.75" stroke-linecap="round"/>
    <path d="M7.5 7.5 16.5 16.5" stroke="#ff6b6b" stroke-width="2" stroke-linecap="round"/>
    <path d="M16.5 7.5 7.5 16.5" stroke="#ff6b6b" stroke-width="2" stroke-linecap="round"/>
  </svg>`;

export class AudioToggle {
  constructor() {
    this.element = document.createElement('button');
    this.element.type = 'button';
    this.element.className = 'audio-toggle hidden';
    this.element.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });
    this.syncUI();
  }

  syncUI() {
    const muted = isGameMuted();
    this.element.classList.toggle('is-muted', muted);
    this.element.setAttribute('aria-label', muted ? 'Ativar áudio' : 'Desativar áudio');
    this.element.setAttribute('aria-pressed', muted ? 'true' : 'false');
    this.element.innerHTML = `
      <span class="audio-toggle-icon-wrap">${muted ? ICON_OFF : ICON_ON}</span>
      <span class="audio-toggle-hint">${muted ? 'Toque para ativar o áudio' : 'Toque para desativar o áudio'}</span>
    `;
  }

  toggle() {
    setGameMuted(!isGameMuted());
    this.syncUI();
  }

  show() {
    this.element.classList.remove('hidden');
    this.syncUI();
  }

  hide() {
    this.element.classList.add('hidden');
  }
}
