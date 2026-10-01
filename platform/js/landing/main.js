import { el, mount } from '../shared/dom.js';
import { ensureWebServer } from '../shared/paths.js';
import { Header } from './components/Header.js';
import { Hero } from './components/Hero.js';

function initScrollReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  items.forEach((node) => observer.observe(node));
}

export function bootstrapLanding() {
  if (!ensureWebServer()) return;

  const app = document.getElementById('app');
  if (!app) return;

  try {
    mount(app,
      Header(),
      el('main', { id: 'main' }, [Hero()])
    );
    initScrollReveal();
  } catch (err) {
    console.error('Landing bootstrap failed:', err);
    app.innerHTML = '<p style="padding:2rem;text-align:center;color:#fff">Erro ao carregar a página. Atualize o navegador (Ctrl+F5).</p>';
  }
}

document.addEventListener('DOMContentLoaded', bootstrapLanding);
