import { requireAuth } from './auth.js';
import { Sidebar, Topbar, sidebarToggleIcon } from './layout/shell.js';
import { el, mount } from './utils.js';
import { renderDashboardPage } from './pages/dashboardPage.js';
import { renderUsersPage } from './pages/usersPage.js';
import { renderDepositsPage } from './pages/depositsPage.js';
import { renderWithdrawalsPage } from './pages/withdrawalsPage.js';
import { renderGatewaysPage } from './pages/gatewaysPage.js';
import { renderGiftsPage } from './pages/giftsPage.js';
import { renderBannersPage } from './pages/bannersPage.js';
import { renderCouponsPage } from './pages/couponsPage.js';
import { renderInfluencersPage } from './pages/influencersPage.js';
import { renderManagersPage } from './pages/managersPage.js';
import { renderReportsPage } from './pages/reportsPage.js';
import { renderSettingsPage } from './pages/settingsPage.js';

const TITLES = {
  dashboard: { title: 'Dashboard', sub: 'Visão geral da plataforma' },
  users: { title: 'Usuários', sub: 'Gerenciar contas e histórico' },
  deposits: { title: 'Depósitos', sub: 'Transações de entrada' },
  withdrawals: { title: 'Saques', sub: 'Usuários · Gerentes · Influenciadores' },
  gateways: { title: 'Gateways', sub: 'Meios de pagamento' },
  gifts: { title: 'Presentes', sub: 'Campanhas e recompensas' },
  banners: { title: 'Banners', sub: 'Carrossel promocional do dashboard' },
  coupons: { title: 'Cupons', sub: 'Códigos promocionais' },
  influencers: { title: 'Influenciadores', sub: 'Base, ranking e comissões' },
  managers: { title: 'Gerentes', sub: 'Parceiros e rede de influenciadores' },
  reports: { title: 'Relatórios', sub: 'Exportação de dados' },
  settings: { title: 'Configurações', sub: 'Parâmetros do jogo e painel' },
};

const RENDERERS = {
  dashboard: renderDashboardPage,
  users: renderUsersPage,
  deposits: renderDepositsPage,
  withdrawals: renderWithdrawalsPage,
  gateways: renderGatewaysPage,
  gifts: renderGiftsPage,
  banners: renderBannersPage,
  coupons: renderCouponsPage,
  influencers: renderInfluencersPage,
  managers: renderManagersPage,
  reports: renderReportsPage,
  settings: renderSettingsPage,
};

function boot() {
  if (!requireAuth()) return;

  const root = document.getElementById('admin-root');
  if (!root) return;

  const contentHost = el('main', { className: 'admin-content', id: 'admin-content' });
  let activeRoute = 'dashboard';
  let sidebarOpen = false;
  let sidebarCollapsed = localStorage.getItem('flappy_admin_sidebar_collapsed') === '1';

  function applySidebarCollapsed() {
    document.body.classList.toggle('admin-sidebar-collapsed', sidebarCollapsed);
  }

  function setSidebarCollapsed(collapsed) {
    sidebarCollapsed = collapsed;
    localStorage.setItem('flappy_admin_sidebar_collapsed', collapsed ? '1' : '0');
    applySidebarCollapsed();
    const toggle = root.querySelector('.admin-sidebar-toggle');
    if (toggle) {
      toggle.replaceChildren(sidebarToggleIcon(collapsed));
      toggle.title = collapsed ? 'Abrir menu lateral' : 'Fechar menu lateral';
      toggle.setAttribute('aria-label', toggle.title);
      toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    }
  }

  function toggleSidebarCollapsed() {
    setSidebarCollapsed(!sidebarCollapsed);
  }

  function setSidebarOpen(open) {
    sidebarOpen = open;
    document.body.classList.toggle('admin-sidebar-open', open);
  }

  applySidebarCollapsed();

  function navigate(route) {
    const id = RENDERERS[route] ? route : 'dashboard';
    activeRoute = id;
    window.location.hash = id;
    setSidebarOpen(false);
    renderPage();
  }

  function renderShell() {
    const shell = el('div', { className: 'admin-shell' }, [
      el('div', {
        className: 'admin-sidebar-backdrop',
        onClick: () => setSidebarOpen(false),
      }),
      Sidebar({
        active: activeRoute,
        onNavigate: navigate,
        onCollapse: () => {
          if (window.matchMedia('(max-width: 900px)').matches) {
            setSidebarOpen(false);
          } else {
            setSidebarCollapsed(true);
          }
        },
      }),
      el('div', { className: 'admin-main' }, [
        Topbar({
          title: TITLES[activeRoute].title,
          subtitle: TITLES[activeRoute].sub,
          sidebarCollapsed,
          onMenuToggle: () => setSidebarOpen(!sidebarOpen),
          onSidebarToggle: toggleSidebarCollapsed,
        }),
        contentHost,
      ]),
    ]);
    mount(root, shell);
  }

  function renderPage() {
    const topbarTitle = root.querySelector('.admin-topbar__title');
    const topbarSub = root.querySelector('.admin-topbar__sub');
    if (topbarTitle) topbarTitle.textContent = TITLES[activeRoute].title;
    if (topbarSub) topbarSub.textContent = TITLES[activeRoute].sub;

    root.querySelectorAll('.admin-sidebar__link').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.route === activeRoute);
    });

    try {
      contentHost.replaceChildren(RENDERERS[activeRoute]());
    } catch (err) {
      console.error(err);
      contentHost.replaceChildren(el('div', { className: 'admin-panel admin-alert admin-alert--error' }, [
        `Erro ao carregar página: ${err.message}`,
      ]));
    }
  }

  renderShell();

  const initial = window.location.hash.replace('#', '') || 'dashboard';
  activeRoute = RENDERERS[initial] ? initial : 'dashboard';
  renderPage();

  window.addEventListener('hashchange', () => {
    const route = window.location.hash.replace('#', '') || 'dashboard';
    if (route !== activeRoute && RENDERERS[route]) {
      activeRoute = route;
      renderPage();
    }
  });
}

try {
  boot();
} catch (err) {
  console.error(err);
  const root = document.getElementById('admin-root');
  if (root) {
    root.innerHTML = `<div class="admin-panel admin-alert admin-alert--error" style="margin:2rem">Falha ao iniciar o painel: ${err.message}</div>`;
  }
}
