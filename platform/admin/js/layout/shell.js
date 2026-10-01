import { el } from '../utils.js';
import { createNavIcon } from '../../../js/shared/navIcons.js';
import { appUrl } from '../../../js/shared/paths.js';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { id: 'users', label: 'Usuários', icon: 'users' },
  { id: 'deposits', label: 'Depósitos', icon: 'deposit' },
  { id: 'withdrawals', label: 'Saques', icon: 'withdraw' },
  { id: 'gateways', label: 'Gateways', icon: 'gateway' },
  { id: 'gifts', label: 'Presentes', icon: 'gift' },
  { id: 'banners', label: 'Banners', icon: 'banner' },
  { id: 'coupons', label: 'Cupons', icon: 'coupon' },
  { id: 'influencers', label: 'Influenciadores', icon: 'star' },
  { id: 'managers', label: 'Gerentes', icon: 'manager' },
  { id: 'reports', label: 'Relatórios', icon: 'report' },
  { id: 'settings', label: 'Configurações', icon: 'settings' },
];

function navIcon(name) {
  return createNavIcon(name);
}

export function sidebarToggleIcon(collapsed) {
  return createNavIcon(collapsed ? 'panelOpen' : 'panelClose', { wrap: false });
}

export function Sidebar({ active, onNavigate, onCollapse }) {
  const nav = el('nav', { className: 'admin-sidebar__nav', 'aria-label': 'Menu principal' }, NAV.map((item) => (
    el('button', {
      className: `admin-sidebar__link${active === item.id ? ' is-active' : ''}`,
      type: 'button',
      'data-route': item.id,
      title: item.label,
      onClick: () => onNavigate(item.id),
    }, [
      navIcon(item.icon),
      el('span', { className: 'admin-sidebar__link-text' }, [item.label]),
    ])
  )));

  const collapseBtn = el('button', {
    className: 'admin-sidebar__collapse',
    type: 'button',
    title: 'Fechar menu lateral',
    'aria-label': 'Fechar menu lateral',
    onClick: () => onCollapse?.(),
  }, [createNavIcon('panelClose', { wrap: false })]);

  return el('aside', { className: 'admin-sidebar', id: 'admin-sidebar' }, [
    el('div', { className: 'admin-sidebar__brand' }, [
      el('div', { className: 'admin-sidebar__brand-main' }, [
        el('img', { src: 'assets/logo-header.png?v=2', alt: 'Flappy Pay', className: 'admin-sidebar__logo' }),
        el('span', { className: 'admin-sidebar__tag' }, ['Admin']),
      ]),
      collapseBtn,
    ]),
    nav,
    el('div', { className: 'admin-sidebar__foot' }, [
      el('a', { className: 'admin-sidebar__back', href: appUrl('index.html'), title: 'Voltar ao site' }, [
        navIcon('home'),
        el('span', {}, ['Voltar ao site']),
      ]),
    ]),
  ]);
}

export function Topbar({
  title,
  subtitle,
  actions = [],
  onMenuToggle,
  onSidebarToggle,
  sidebarCollapsed = false,
}) {
  const user = JSON.parse(sessionStorage.getItem('flappy_admin_user') || '{}');

  return el('header', { className: 'admin-topbar' }, [
    el('button', {
      className: 'admin-menu-btn',
      type: 'button',
      'aria-label': 'Abrir menu',
      onClick: () => onMenuToggle?.(),
    }, [
      el('svg', { viewBox: '0 0 24 24', width: '22', height: '22', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [
        el('path', { d: 'M4 6h16M4 12h16M4 18h16' }),
      ]),
    ]),
    el('button', {
      className: 'admin-sidebar-toggle',
      type: 'button',
      title: sidebarCollapsed ? 'Abrir menu lateral' : 'Fechar menu lateral',
      'aria-label': sidebarCollapsed ? 'Abrir menu lateral' : 'Fechar menu lateral',
      'aria-expanded': sidebarCollapsed ? 'false' : 'true',
      onClick: () => onSidebarToggle?.(),
    }, [sidebarToggleIcon(sidebarCollapsed)]),
    el('div', { className: 'admin-topbar__info' }, [
      el('h1', { className: 'admin-topbar__title' }, [title]),
      subtitle ? el('p', { className: 'admin-topbar__sub' }, [subtitle]) : null,
    ].filter(Boolean)),
    el('div', { className: 'admin-topbar__actions' }, actions),
    el('div', { className: 'admin-topbar__user' }, [
      el('span', { className: 'admin-topbar__avatar' }, [(user.username || 'A')[0].toUpperCase()]),
      el('span', { className: 'admin-topbar__name' }, [user.username || 'Admin']),
      el('button', {
        className: 'admin-btn admin-btn--ghost admin-btn--sm admin-topbar__logout',
        type: 'button',
        title: 'Sair',
        onClick: () => {
          sessionStorage.removeItem('flappy_admin_token');
          sessionStorage.removeItem('flappy_admin_user');
          window.location.href = appUrl('pages/admin-login.html');
        },
      }, [
        navIcon('logout'),
        el('span', {}, ['Sair']),
      ]),
    ]),
  ]);
}
