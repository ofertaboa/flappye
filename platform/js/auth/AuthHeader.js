import { el } from '../shared/dom.js';
import { appUrl, assetUrl } from '../shared/paths.js';

function LoginIcon() {
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

function RegisterIcon() {
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

/**
 * Header das páginas de autenticação (logo + Entrar ou Cadastrar).
 * @param {{ basePath?: string, highlight?: 'login' | 'register' }} options
 */
export function AuthHeader({ basePath = '', highlight = 'login' } = {}) {
  const home = appUrl('index.html');
  const login = appUrl('pages/login.html');
  const register = appUrl('pages/register.html');

  const isLoginPage = highlight === 'login';
  const btnClass = (active) => (active
    ? 'header-btn header-btn--primary'
    : 'header-btn header-btn--ghost');

  const navBtn = isLoginPage
    ? el('a', { className: btnClass(true), href: login }, [
      LoginIcon(),
      el('span', { className: 'header-btn__label' }, ['Entrar']),
    ])
    : el('a', { className: btnClass(true), href: register }, [
      RegisterIcon(),
      el('span', { className: 'header-btn__label' }, ['Cadastrar']),
    ]);

  return el('header', { className: 'site-header', id: 'top' }, [
    el('div', { className: 'site-header__shine', 'aria-hidden': 'true' }),
    el('div', { className: 'site-header__accent', 'aria-hidden': 'true' }),
    el('div', { className: 'container site-header__inner' }, [
      el('a', {
        className: 'site-header__logo',
        href: home,
        'aria-label': 'Flappy Pay — Início',
      }, [
        el('img', {
          className: 'site-header__logo-img',
          src: assetUrl('assets/logo-header.png'),
          alt: 'Flappy Pay',
          width: '90',
          height: '38',
        }),
      ]),
      el('nav', { className: 'site-header__nav', 'aria-label': 'Conta' }, [navBtn]),
    ]),
  ]);
}
