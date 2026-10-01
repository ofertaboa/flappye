import { el } from '../../shared/dom.js';
import { appUrl } from '../../shared/paths.js';

function HeaderIcon({ type }) {
  if (type === 'login') {
    return el('span', { className: 'header-btn__icon', 'aria-hidden': 'true' }, [
      el('svg', { viewBox: '0 0 24 24', fill: 'none', xmlns: 'http://www.w3.org/2000/svg' }, [
        el('path', {
          d: 'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3',
          stroke: 'currentColor',
          'stroke-width': '2',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
        }),
      ]),
    ]);
  }
  return el('span', { className: 'header-btn__icon', 'aria-hidden': 'true' }, [
    el('svg', { viewBox: '0 0 24 24', fill: 'none', xmlns: 'http://www.w3.org/2000/svg' }, [
      el('path', {
        d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M22 11h-6',
        stroke: 'currentColor',
        'stroke-width': '2',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      }),
    ]),
  ]);
}

export function Header() {
  return el('header', { className: 'site-header', id: 'top' }, [
    el('div', { className: 'site-header__shine', 'aria-hidden': 'true' }),
    el('div', { className: 'site-header__accent', 'aria-hidden': 'true' }),
    el('div', { className: 'container site-header__inner' }, [
      el('a', {
        className: 'site-header__logo',
        href: appUrl('index.html'),
        'aria-label': 'Flappy Pay — Início',
      }, [
        el('img', {
          className: 'site-header__logo-img',
          src: 'assets/logo-header.png?v=2',
          alt: 'Flappy Pay',
          width: '90',
          height: '38',
        }),
      ]),
      el('nav', { className: 'site-header__nav', 'aria-label': 'Conta' }, [
        el('a', { className: 'header-btn header-btn--ghost', href: appUrl('pages/login.html') }, [
          HeaderIcon({ type: 'login' }),
          el('span', { className: 'header-btn__label' }, ['Entrar']),
        ]),
        el('a', { className: 'header-btn header-btn--primary', href: appUrl('pages/register.html') }, [
          HeaderIcon({ type: 'register' }),
          el('span', { className: 'header-btn__label' }, ['Cadastrar']),
        ]),
      ]),
    ]),
  ]);
}
