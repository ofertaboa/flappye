import { el } from '../../shared/dom.js';
import { appUrl } from '../../shared/paths.js';

const ICONS = {
  wallet: '<path d="M19 7H18V6a3 3 0 0 0-3-3H5a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3v-8a3 3 0 0 0-3-3zM5 5h10a1 1 0 0 1 1 1v1H5a1 1 0 0 1-1-1 1 1 0 0 1 1-1zm14 12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9h15v8z" fill="currentColor"/>',
  chevron: '<path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  profile: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2" fill="none"/>',
  referral: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M22 11h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
};

function svgIcon(name) {
  const span = el('span', { 'aria-hidden': 'true' });
  span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">${ICONS[name]}</svg>`;
  return span;
}

function formatCurrency(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getInitials(name) {
  const safe = String(name || 'Jogador').trim();
  return safe
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || 'J';
}

function menuItem(label, icon, onClick) {
  return el('button', {
    className: 'dash-header__menu-item',
    type: 'button',
    role: 'menuitem',
    onClick: (e) => {
      e.preventDefault();
      onClick?.();
    },
  }, [svgIcon(icon), label]);
}

export function DashboardHeader({ user, onProfile, onReferral, onLogout }) {
  const menu = el('div', { className: 'dash-header__menu', role: 'menu' });

  const profileBtn = el('button', {
    className: 'dash-header__profile-btn',
    type: 'button',
    'aria-expanded': 'false',
    'aria-haspopup': 'true',
    onClick: (e) => {
      e.stopPropagation();
      const open = profileBtn.classList.toggle('is-open');
      menu.classList.toggle('is-open', open);
      profileBtn.setAttribute('aria-expanded', String(open));
    },
  }, [
    el('span', { className: 'dash-header__avatar' }, [getInitials(user.name)]),
    el('span', { className: 'dash-header__name' }, [(user.name || 'Jogador').split(' ')[0]]),
    el('span', { className: 'dash-header__chevron' }, [svgIcon('chevron')]),
  ]);

  const closeMenu = () => {
    profileBtn.classList.remove('is-open');
    menu.classList.remove('is-open');
    profileBtn.setAttribute('aria-expanded', 'false');
  };

  menu.append(
    menuItem('Meu Perfil', 'profile', () => {
      closeMenu();
      onProfile?.();
    }),
    menuItem('Indique e Ganhe', 'referral', () => {
      closeMenu();
      onReferral?.();
    }),
    el('div', { className: 'dash-header__menu-divider' }),
    el('button', {
      className: 'dash-header__menu-item dash-header__menu-item--danger',
      type: 'button',
      role: 'menuitem',
      onClick: () => {
        closeMenu();
        localStorage.removeItem('flappy_token');
        localStorage.removeItem('flappy_user');
        onLogout?.();
        window.location.href = appUrl('pages/login.html');
      },
    }, [svgIcon('logout'), 'Sair']),
  );

  document.addEventListener('click', (e) => {
    if (!profileBtn.contains(e.target) && !menu.contains(e.target)) {
      closeMenu();
    }
  });

  const walletIcon = el('span', { className: 'dash-header__wallet', 'aria-hidden': 'true' });
  walletIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">${ICONS.wallet}</svg>`;

  return el('header', { className: 'dash-header' }, [
    el('div', { className: 'dash-header__shine', 'aria-hidden': 'true' }),
    el('div', { className: 'dash-header__accent', 'aria-hidden': 'true' }),
    el('div', { className: 'dash-header__inner' }, [
      el('a', {
        className: 'dash-header__logo site-header__logo',
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
      el('div', { className: 'dash-header__balance' }, [
        el('p', { className: 'dash-header__balance-label' }, ['Saldo disponível']),
        el('div', { className: 'dash-header__balance-row' }, [
          walletIcon,
          el('span', { className: 'dash-header__amount' }, [formatCurrency(user.balance)]),
        ]),
      ]),
      el('div', { className: 'dash-header__profile' }, [profileBtn, menu]),
    ]),
  ]);
}
