(function () {
  'use strict';

  var SITE_BASE = '/flappye'; /*__SITE_BASE__*/

  var activeVersion = '0';
  var BUILD_STORE_KEY = 'flappy_build_version';

  function isLegacyDeploySegment(segment) {
    return String(segment || '').toLowerCase().replace(/%20/g, ' ') === 'flappy game';
  }

  /** Converte pathname file:// (ex.: /C:/Users/.../htdocs/Flappy game/…) em caminho web. */
  function toWebPathname(path) {
    var p = decodeURIComponent(String(path || '').replace(/\\/g, '/'));
    if (!/^\/[a-zA-Z]:\//.test(p)) {
      return p;
    }

    var lower = p.toLowerCase();
    var htdocs = '/htdocs/';
    var hi = lower.indexOf(htdocs);
    if (hi >= 0) {
      var tail = p.slice(hi + htdocs.length).replace(/^\/+/, '');
      return '/' + tail;
    }

    var fg = lower.indexOf('/flappy game');
    if (fg >= 0) {
      return p.slice(fg);
    }

    return '/';
  }

  /** Produção na raiz do domínio — ignora subpasta legada do XAMPP. */
  function migrateLegacyDeployPath() {
    if (isLocalDev()) return false;

    var path = toWebPathname(location.pathname);
    var segments = path.replace(/\/+$/, '').split('/').filter(Boolean);
    if (!segments.length || !isLegacyDeploySegment(segments[0])) {
      return false;
    }

    var tail = segments.slice(1).join('/');
    var target = location.origin + (tail ? '/' + tail : '/');
    var qs = location.search || '';
    var hash = location.hash || '';
    location.replace(target + qs + hash);
    return true;
  }

  function getSiteOriginRoot() {
    if (!isLocalDev()) {
      return location.origin + SITE_BASE;
    }

    var base = detectProjectBase();
    var enc = base
      ? base.split('/').filter(Boolean).map(function (segment) {
        return encodeURIComponent(segment);
      }).join('/')
      : '';
    return location.origin + (enc ? '/' + enc : '');
  }

  function clearObsoleteClientData() {
    var obsoleteLocal = [
      'flappy_last_path',
      'flappy_cached_base',
      'flappy_project_root',
      'flappy_site_root',
      'flappy_base_path',
    ];
    obsoleteLocal.forEach(function (key) {
      try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
    });
    try { sessionStorage.removeItem('flappy_cached_base'); } catch (e) { /* ignore */ }

    try {
      for (var i = localStorage.length - 1; i >= 0; i -= 1) {
        var key = localStorage.key(i);
        if (!key) continue;
        var val = localStorage.getItem(key) || '';
        if (/flappy(?:%20| )game/i.test(val)) {
          localStorage.removeItem(key);
        }
      }
    } catch (e) { /* ignore */ }
  }

  /**
   * Após deploy: limpa caches legados e recarrega UMA vez com ?v= na URL da página.
   * Preserva tokens de login (flappy_token, flappy_admin_token, etc.).
   */
  function runDeployMigration(version) {
    if (isLocalDev() || !version || version === 'auto' || version === '0') {
      return false;
    }

    var stored = null;
    try { stored = localStorage.getItem(BUILD_STORE_KEY); } catch (e) { /* ignore */ }

    var versionChanged = stored !== version;
    var reloadFlag = 'flappy_reload_' + version;
    var alreadyReloaded = false;
    try { alreadyReloaded = sessionStorage.getItem(reloadFlag) === '1'; } catch (e) { /* ignore */ }

    if (versionChanged) {
      purgeLegacyCaches();
      clearObsoleteClientData();
    }

    try { localStorage.setItem(BUILD_STORE_KEY, version); } catch (e) { /* ignore */ }

    var params = new URLSearchParams(location.search);
    var needsVersionInUrl = params.get('v') !== version;

    if (versionChanged && !alreadyReloaded && needsVersionInUrl) {
      try { sessionStorage.setItem(reloadFlag, '1'); } catch (e) { /* ignore */ }
      params.set('v', version);
      var next = location.origin + location.pathname + '?' + params.toString() + location.hash;
      if (next !== location.href.split('#')[0] && (location.search || '').indexOf('v=' + version) < 0) {
        location.replace(next);
        return true;
      }
    }

    return false;
  }

  function readBuildFromMeta() {
    var meta = document.querySelector('meta[name="flappy-build"]');
    return meta ? String(meta.getAttribute('content') || '').trim() : '';
  }

  function isLocalDev() {
    return false;
  }

  function isExternalUrl(url) {
    return /^https?:\/\//i.test(url);
  }

  function shouldVersion(url) {
    if (!url) return false;
    if (!isExternalUrl(url)) return true;
    return url.indexOf('fonts.googleapis') < 0 && url.indexOf('fonts.gstatic') < 0;
  }

  function appendVersion(url, version) {
    if (!url || !version || !shouldVersion(url)) return url;
    var cleaned = url
      .replace(/([?&])v=[^&#]*/g, '$1')
      .replace(/([?&])_fv=[^&#]*/g, '$1')
      .replace(/([?&])_ts=[^&#]*/g, '$1')
      .replace(/[?&]$/, '');
    return cleaned + (cleaned.indexOf('?') >= 0 ? '&' : '?') + 'v=' + encodeURIComponent(version);
  }

  function isBootScript(el) {
    return el && el.tagName === 'SCRIPT' && (el.getAttribute('src') || '').indexOf('boot-redirect') >= 0;
  }

  function stampElement(el, version) {
    if (!el || isBootScript(el)) return;

    if (el.tagName === 'SCRIPT') {
      var src = el.getAttribute('src');
      if (src) el.setAttribute('src', appendVersion(src, version));
      return;
    }

    if (el.tagName === 'LINK') {
      var rel = (el.getAttribute('rel') || '').toLowerCase();
      if (rel === 'stylesheet' || rel === 'modulepreload') {
        var href = el.getAttribute('href');
        if (href) el.setAttribute('href', appendVersion(href, version));
      }
      return;
    }

    if (el.tagName === 'IMG') {
      var imgSrc = el.getAttribute('src');
      if (imgSrc && shouldVersion(imgSrc)) {
        el.setAttribute('src', appendVersion(imgSrc, version));
      }
    }
  }

  function stampTree(version) {
    document.querySelectorAll('script[src], link[rel="stylesheet"][href], link[rel="modulepreload"][href], img[src]').forEach(function (el) {
      stampElement(el, version);
    });
  }

  var attributeHookInstalled = false;

  function installAttributeHook() {
    if (attributeHookInstalled) return;
    attributeHookInstalled = true;

    var origSet = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (name, value) {
      var attr = String(name).toLowerCase();
      if ((attr === 'src' || attr === 'href') && typeof value === 'string' && shouldVersion(value)) {
        if (!(this.tagName === 'SCRIPT' && isBootScript(this))) {
          value = appendVersion(value, activeVersion);
        }
      }
      return origSet.call(this, name, value);
    };
  }

  function watchDom(version) {
    if (typeof MutationObserver === 'undefined') return;

    new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (!node || node.nodeType !== 1) return;
          stampElement(node, version);
          if (node.querySelectorAll) {
            node.querySelectorAll('script[src], link[rel="stylesheet"][href], link[rel="modulepreload"][href], img[src]').forEach(function (el) {
              stampElement(el, version);
            });
          }
        });
      });
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  function buildSharedModuleUrls(originRoot, version) {
    var shared = originRoot + '/platform/js/shared/';
    return {
      paths: appendVersion(shared + 'paths.js', version),
      api: appendVersion(shared + 'api.js', version),
      version: appendVersion(shared + 'version.js', version),
    };
  }

  /** Import map — imports ES aninhados (./paths.js) recebem a mesma ?v= do entry script. */
  function injectSharedImportMap(version) {
    if (!version || typeof document === 'undefined') return;

    var existing = document.querySelector('script[data-flappy-importmap="1"]');
    if (existing) existing.remove();

    var base = detectProjectBase();
    var enc = base
      ? base.split('/').filter(Boolean).map(function (segment) {
        return encodeURIComponent(segment);
      }).join('/')
      : '';
    var originRoot = getSiteOriginRoot();
    var mods = buildSharedModuleUrls(originRoot, version);
    var scopes = {};

    function addScope(scopePath, mapping) {
      scopes[originRoot + scopePath] = mapping;
    }

    addScope('/platform/js/shared/', {
      './paths.js': mods.paths,
      './version.js': mods.version,
      './api.js': mods.api,
    });
    addScope('/js/', {
      '../platform/js/shared/paths.js': mods.paths,
      '../platform/js/shared/api.js': mods.api,
    });
    addScope('/js/api/', {
      '../../platform/js/shared/api.js': mods.api,
    });
    addScope('/platform/js/auth/', {
      '../shared/paths.js': mods.paths,
      '../shared/api.js': mods.api,
    });
    addScope('/platform/js/landing/', {
      '../shared/paths.js': mods.paths,
    });
    addScope('/platform/js/landing/components/', {
      '../../shared/paths.js': mods.paths,
    });
    addScope('/platform/js/dashboard/', {
      '../shared/paths.js': mods.paths,
    });
    addScope('/platform/js/dashboard/components/', {
      '../../shared/paths.js': mods.paths,
      '../../shared/api.js': mods.api,
    });
    addScope('/platform/js/dashboard/api/', {
      '../../shared/api.js': mods.api,
      '../../shared/paths.js': mods.paths,
    });
    addScope('/platform/admin/js/', {
      '../../js/shared/paths.js': mods.paths,
      '../../js/shared/api.js': mods.api,
    });
    addScope('/platform/admin/js/api/', {
      '../../../js/shared/api.js': mods.api,
    });
    addScope('/platform/admin/js/pages/', {
      '../../../js/shared/paths.js': mods.paths,
    });
    addScope('/platform/admin/js/layout/', {
      '../../../js/shared/paths.js': mods.paths,
    });
    addScope('/platform/manager/js/', {
      '../../js/shared/paths.js': mods.paths,
      '../../js/shared/api.js': mods.api,
    });
    addScope('/platform/manager/js/api/', {
      '../../../js/shared/api.js': mods.api,
    });

    var el = document.createElement('script');
    el.type = 'importmap';
    el.setAttribute('data-flappy-importmap', '1');
    el.textContent = JSON.stringify({ scopes: scopes });
    document.head.appendChild(el);
  }

  function applyVersion(version) {
    if (!version) return;
    activeVersion = version;
    window.__FLAPPY_BUILD = version;
    document.documentElement.setAttribute('data-flappy-build', version);
    var meta = document.querySelector('meta[name="flappy-build"]');
    if (meta) meta.setAttribute('content', version);
    injectSharedImportMap(version);
    installAttributeHook();
    stampTree(version);
    watchDom(version);
  }

  function purgeLegacyCaches() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function (regs) {
        regs.forEach(function (reg) { reg.unregister(); });
      }).catch(function () {});
    }

    if (typeof caches !== 'undefined' && caches.keys) {
      caches.keys().then(function (keys) {
        keys.forEach(function (key) { caches.delete(key); });
      }).catch(function () {});
    }
  }

  purgeLegacyCaches();

  if (migrateLegacyDeployPath()) {
    return;
  }

  function detectProjectBase() {
    if (!isLocalDev()) {
      return SITE_BASE;
    }

    var path = toWebPathname(location.pathname);

    if (path.toLowerCase().indexOf('/pages/') >= 0) {
      return path.split(/\/pages\//i)[0];
    }

    var cleanRoutes = {
      login: 1, register: 1, dashboard: 1, admin: 1, 'admin-login': 1,
      manager: 1, 'manager-login': 1, 'manager-register': 1, game: 1,
    };

    var segments = path.replace(/\/+$/, '').split('/').filter(Boolean);
    var last = (segments[segments.length - 1] || '').toLowerCase();

    if (cleanRoutes[last]) {
      return segments.length > 1 ? '/' + segments.slice(0, -1).join('/') : '';
    }

    if (segments.length === 1) {
      var only = segments[0].toLowerCase();
      if (only === 'index.html' || only.indexOf('.html') === only.length - 5) {
        return '';
      }
      return '/' + segments[0];
    }

    if (!segments.length) return '';

    var trimmed = path.replace(/\/[^/]*$/, '');
    if (!trimmed || trimmed === '/') return '';
    return trimmed;
  }

  function buildCheckUrls() {
    if (!isLocalDev()) {
      return {
        auto: SITE_BASE + '/platform/js/shared/build.txt',
        file: SITE_BASE + '/platform/js/shared/build.txt',
      };
    }

    var base = detectProjectBase().replace(/\/$/, '');
    var prefix = base ? base + '/' : '/';
    return {
      auto: prefix + 'api/build-version.php',
      file: prefix + 'platform/js/shared/build.txt',
    };
  }

  function parseBuildText(text) {
    if (!text) return null;
    var version = String(text).trim().split(/\s+/)[0];
    return version && version !== 'auto' ? version : null;
  }

  /** Busca versão no servidor ANTES de carregar CSS/JS (automático após deploy). */
  function fetchServerBuildSync() {
    var urls = buildCheckUrls();
    var order = [urls.auto, urls.file];

    for (var i = 0; i < order.length; i++) {
      try {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', order[i] + '?nc=' + Date.now(), false);
        xhr.setRequestHeader('Cache-Control', 'no-cache');
        xhr.send(null);
        if (xhr.status >= 200 && xhr.status < 300) {
          var version = parseBuildText(xhr.responseText);
          if (version) return version;
        }
      } catch (e) {
        /* tenta próxima URL */
      }
    }

    return null;
  }

  function resolveInitialVersion() {
    if (isLocalDev()) {
      return readBuildFromMeta() || 'dev';
    }

    var serverVersion = fetchServerBuildSync();
    if (serverVersion) return serverVersion;

    return readBuildFromMeta() || '0';
  }

  function ensureBaseHref() {
    var basePath = SITE_BASE;
    var segments = basePath.split('/').filter(Boolean).map(encodeURIComponent);
    var href = location.origin + (segments.length ? '/' + segments.join('/') : '') + '/';
    var base = document.querySelector('base');

    if (base) {
      base.href = href;
      return;
    }

    base = document.createElement('base');
    base.href = href;
    document.head.insertBefore(base, document.head.firstChild);
  }

  ensureBaseHref();

  if (location.protocol === 'file:') {
    var path = toWebPathname(location.pathname);
    var marker = '/flappy game/';
    var idx = path.toLowerCase().indexOf(marker);
    var relative = 'index.html';

    if (idx >= 0) {
      relative = path.slice(idx + marker.length) || 'index.html';
    } else {
      var file = path.split('/').pop();
      if (file && file.toLowerCase() !== 'flappy game') {
        relative = file;
      }
    }

    var root = detectProjectBase();
    var encoded = root ? root.split('/').filter(Boolean).map(encodeURIComponent).join('/') : '';
    var prefix = encoded ? '/' + encoded : '';
    location.replace('http://localhost' + prefix + '/' + relative + location.search + location.hash);
    return;
  }

  var CLEAN_ROUTES = {
    login: 1,
    register: 1,
    dashboard: 1,
    admin: 1,
    'admin-login': 1,
    manager: 1,
    'manager-login': 1,
    'manager-register': 1,
    game: 1,
  };

  var path = toWebPathname(location.pathname);
  var searchParams = new URLSearchParams(location.search);
  var refParam = searchParams.get('ref');
  var mgrParam = searchParams.get('mgr');

  if (refParam) {
    try { sessionStorage.setItem('flappy_referrer_id', refParam); } catch (e) {}
  }
  if (mgrParam) {
    try { sessionStorage.setItem('flappy_manager_id', mgrParam); } catch (e) {}
  }

  if (refParam || mgrParam) {
    var pathSegments = path.replace(/\/+$/, '').split('/').filter(Boolean);
    if (!isLocalDev() && pathSegments.length && isLegacyDeploySegment(pathSegments[0])) {
      pathSegments = pathSegments.slice(1);
    }
    var lastSeg = (pathSegments[pathSegments.length - 1] || '').toLowerCase();
    var onRegister = lastSeg === 'register' || lastSeg === 'register.html';
    var onAppRoute = CLEAN_ROUTES[lastSeg] === 1;
    var onHome = !lastSeg || lastSeg === 'index.html';

    if (!onRegister && (onHome || !onAppRoute)) {
      var registerBase = isLocalDev() ? detectProjectBase().replace(/\/$/, '') : '';
      var registerPath = isLocalDev()
        ? (registerBase + '/pages/register.html')
        : (SITE_BASE + '/register');
      location.replace(location.origin + registerPath + location.search + location.hash);
      return;
    }
  }

  if (isLocalDev()) {
    var segments = path.replace(/\/+$/, '').split('/').filter(Boolean);
    var lastRoute = (segments[segments.length - 1] || '').toLowerCase();
    var localHtmlMap = {
      login: 'pages/login.html',
      register: 'pages/register.html',
      dashboard: 'pages/dashboard.html',
      admin: 'pages/admin.html',
      'admin-login': 'pages/admin-login.html',
      manager: 'pages/manager.html',
      'manager-login': 'pages/manager-login.html',
      'manager-register': 'pages/manager-register.html',
      game: 'game.html',
    };

    if (
      localHtmlMap[lastRoute]
      && !/\/pages\//i.test(path)
      && lastRoute.indexOf('.html') < 0
    ) {
      var localBase = detectProjectBase().replace(/\/$/, '');
      var localEncoded = localBase
        ? localBase.split('/').filter(Boolean).map(encodeURIComponent).join('/')
        : '';
      var localTarget = (localEncoded ? '/' + localEncoded : '') + '/' + localHtmlMap[lastRoute];
      location.replace(location.origin + localTarget + location.search + location.hash);
      return;
    }
  }

  var initialVersion = resolveInitialVersion();
  if (runDeployMigration(initialVersion)) {
    return;
  }
  applyVersion(initialVersion);
})();
