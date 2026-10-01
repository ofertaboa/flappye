import { getAssetVersion } from './version.js';
const SITE_BASE = '/flappye'; /*__SITE_BASE__*/

/** Caminhos lógicos (com .html) → segmento limpo na URL (produção) */
const PAGE_ROUTES = {
  'index.html': '',
  'pages/login.html': 'login',
  'pages/register.html': 'register',
  'pages/dashboard.html': 'dashboard',
  'pages/admin.html': 'admin',
  'pages/admin-login.html': 'admin-login',
  'pages/manager.html': 'manager',
  'pages/manager-login.html': 'manager-login',
  'pages/manager-register.html': 'manager-register',
  'game.html': 'game',
};

const CLEAN_ROUTE_SEGMENTS = new Set(
  Object.values(PAGE_ROUTES).filter((segment) => segment !== ''),
);

const CLEAN_TO_HTML = Object.fromEntries(
  Object.entries(PAGE_ROUTES)
    .filter(([, segment]) => segment !== '')
    .map(([htmlPath, segment]) => [segment, htmlPath]),
);

/** Subpasta usada só no XAMPP local — nunca é base válida em produção na raiz do domínio. */
function isLegacyDeploySegment(segment) {
  return String(segment || '').toLowerCase().replace(/%20/g, ' ') === 'flappy game';
}

/** Converte pathname file:// (ex.: /C:/Users/.../htdocs/Flappy game/…) em caminho web (/Flappy game/…). */
function toWebPathname(path) {
  let p = decodeURIComponent(String(path || '').replace(/\\/g, '/'));
  if (!/^\/[a-zA-Z]:\//.test(p)) {
    return p;
  }

  const lower = p.toLowerCase();
  const htdocs = '/htdocs/';
  const hi = lower.indexOf(htdocs);
  if (hi >= 0) {
    const tail = p.slice(hi + htdocs.length).replace(/^\/+/, '');
    return `/${tail}`;
  }

  const fg = lower.indexOf('/flappy game');
  if (fg >= 0) {
    return p.slice(fg);
  }

  return '/';
}

export function isLocalHost() {
  return false;
}

/** Produção = raiz do domínio (flappybrcopa.site/register). XAMPP = subpasta /Flappy game/. */
export function isProductionSite() {
  return !isLocalHost();
}

export function projectBase() {
  if (isProductionSite()) {
    return SITE_BASE;
  }

  const path = toWebPathname(window.location.pathname);

  if (path.toLowerCase().includes('/pages/')) {
    return path.split(/\/pages\//i)[0];
  }

  const segments = path.replace(/\/+$/, '').split('/').filter(Boolean);
  const last = segments[segments.length - 1]?.toLowerCase() ?? '';

  if (CLEAN_ROUTE_SEGMENTS.has(last)) {
    return segments.length > 1 ? `/${segments.slice(0, -1).join('/')}` : '';
  }

  if (segments.length === 1) {
    const only = segments[0].toLowerCase();
    if (only === 'index.html' || only.endsWith('.html')) {
      return '';
    }
    return `/${segments[0]}`;
  }

  if (segments.length === 0) {
    return '';
  }

  const trimmed = path.replace(/\/[^/]*$/, '');
  if (!trimmed || trimmed === '/') {
    return '';
  }

  return trimmed;
}

/** Prefixo URL-encoded da pasta do projeto (vazio na raiz do domínio). */
export function getProjectRoot() {
  const base = projectBase();
  if (!base) {
    return '';
  }

  return `/${base.split('/').filter(Boolean).map(encodeURIComponent).join('/')}`;
}

function resolveHtmlPath(pathPart) {
  if (!pathPart || pathPart === 'index.html') {
    return 'index.html';
  }

  if (Object.prototype.hasOwnProperty.call(PAGE_ROUTES, pathPart)) {
    return pathPart;
  }

  if (pathPart.endsWith('.html')) {
    return pathPart.startsWith('pages/') ? pathPart : `pages/${pathPart}`;
  }

  const clean = pathPart.replace(/^pages\//, '');
  const htmlName = clean.endsWith('.html') ? clean : `${clean}.html`;
  return `pages/${htmlName}`;
}

function joinUrl(origin, root, relativePath, queryString) {
  const encoded = relativePath
    .split('/')
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/');
  const base = `${origin}${root}/${encoded}`;
  return queryString ? `${base}?${queryString}` : base;
}

/** URLs do app — local usa pages/*.html; produção usa rotas limpas (/login, /admin-login …). */
export function appUrl(relativePath = '') {
  const raw = relativePath.replace(/^\//, '');
  const qIndex = raw.indexOf('?');
  const pathPart = qIndex >= 0 ? raw.slice(0, qIndex) : raw;
  const query = qIndex >= 0 ? raw.slice(qIndex + 1) : '';

  const root = getProjectRoot();
  const origin = window.location.origin;
  const params = new URLSearchParams(query);
  if (!isLocalHost()) {
    params.set('v', getAssetVersion());
  }
  const qs = params.toString();

  if (isLocalHost()) {
    const htmlPath = resolveHtmlPath(pathPart);
    return joinUrl(origin, root, htmlPath, qs || '');
  }

  const route = Object.prototype.hasOwnProperty.call(PAGE_ROUTES, pathPart)
    ? PAGE_ROUTES[pathPart]
    : pathPart.replace(/\.html$/, '').replace(/^pages\//, '');

  if (!route) {
    const home = root ? `${origin}${root}/` : `${origin}/`;
    return qs ? `${home.replace(/\/$/, '')}?${qs}` : home;
  }

  const cleanPath = root ? `${root}/${route}` : `/${route}`;
  return qs ? `${origin}${cleanPath}?${qs}` : `${origin}${cleanPath}`;
}

/** Caminho HTML equivalente à rota limpa atual (útil no boot). */
export function cleanRouteToHtml(pathname) {
  const path = decodeURIComponent(pathname).replace(/\/+$/, '');
  const segments = path.split('/').filter(Boolean);
  const last = segments[segments.length - 1]?.toLowerCase() ?? '';
  return CLEAN_TO_HTML[last] || null;
}

/** Assets estáticos — URL absoluta com segmentos encoded. */
export function assetUrl(relativePath = '') {
  const rel = String(relativePath).replace(/^\//, '');
  const suffix = rel.split('/').filter(Boolean).map(encodeURIComponent).join('/');
  const root = getProjectRoot();
  const path = suffix ? `${root}/${suffix}` : `${root}/`;
  const base = `${window.location.origin}${path}`;
  const version = getAssetVersion();
  return `${base}${base.includes('?') ? '&' : '?'}v=${encodeURIComponent(version)}`;
}

export function staticAssetPath(relativePath = '') {
  return assetUrl(relativePath);
}

export function ensureWebServer() {
  if (window.location.protocol === 'file:') {
    const path = toWebPathname(window.location.pathname);
    const marker = '/flappy game/';
    const lower = path.toLowerCase();
    const idx = lower.indexOf(marker);
    let relative = 'index.html';

    if (idx >= 0) {
      relative = path.slice(idx + marker.length) || 'index.html';
    } else {
      const file = path.split('/').pop();
      if (file && file.toLowerCase() !== 'flappy game') {
        relative = file;
      }
    }

    const url = new URL(`${getProjectRoot()}/${relative}`.replace(/\/+/g, '/'), 'http://localhost');
    url.search = window.location.search;
    url.hash = window.location.hash;
    window.location.replace(url.href);
    return false;
  }

  const port = window.location.port;
  const onApache = !port || port === '80' || port === '443';

  if (
    !onApache
    && isLocalHost()
  ) {
    const url = new URL(
      window.location.pathname + window.location.search + window.location.hash,
      'http://localhost',
    );
    window.location.replace(url.href);
    return false;
  }

  return true;
}
