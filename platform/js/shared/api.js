import { projectBase, isLocalHost } from './paths.js';
const API_ORIGIN = 'https://flappygamepay.site'; /*__API_ORIGIN__*/

/** Evita dependência de export nomeado que pode divergir entre versões cacheadas de paths.js. */
function projectRootPrefix() {
  if (!isLocalHost()) {
    return '';
  }
  const base = projectBase();
  if (!base) return '';
  return `/${base.split('/').filter(Boolean).map(encodeURIComponent).join('/')}`;
}

export function apiUrl(endpoint) {
  const raw = endpoint.replace(/^\//, '');
  const qIndex = raw.indexOf('?');
  const pathPart = qIndex >= 0 ? raw.slice(0, qIndex) : raw;
  const query = qIndex >= 0 ? raw.slice(qIndex) : '';
  const phpFile = pathPart.endsWith('.php') ? pathPart : `${pathPart}.php`;
  return `${API_ORIGIN}/api/${phpFile}${query}`;
}

function explainInvalidApiResponse(text, status, url) {
  const body = String(text || '').trim();

  if (body.includes('Configuração do banco não encontrada') || body.includes('config_missing')) {
    return 'Banco não configurado. Crie o arquivo conectabanco.php na raiz do site.';
  }

  if (status === 404) {
    return `API não encontrada (${url}). Confirme que a pasta api/ foi enviada para o public_html.`;
  }

  if (body.startsWith('<?php') || body.includes('<!DOCTYPE') || body.includes('<html')) {
    return 'Erro no servidor PHP. Abra /api/health.php no navegador para ver o diagnóstico do banco.';
  }

  if (body !== '') {
    return `Resposta inválida do servidor (${status}). Detalhe: ${body.slice(0, 160)}`;
  }

  return `Servidor sem resposta (${status}). Teste ${url.replace(/register\.php.*/, 'health.php')} no navegador.`;
}

export function assertPhpServer() {
  const localHint = 'http://localhost/Flappy%20game/pages/register.html';

  if (window.location.protocol === 'file:') {
    throw new Error(`Abra pelo XAMPP: ${localHint}`);
  }

  const port = window.location.port;
  const onApache = !port || port === '80' || port === '443';

  if (!onApache && isLocalHost()) {
    throw new Error(`O PHP só roda no XAMPP. Use: ${localHint}`);
  }
}

const DEFAULT_TIMEOUT_MS = 12000;

function timeoutErrorMessage() {
  if (isLocalHost()) {
    return 'MySQL sobrecarregado ou lento. No XAMPP: Stop no Apache, Stop no MySQL, Start MySQL, Start Apache.';
  }
  return 'O servidor demorou para responder. Sua conexão continua — tente de novo em alguns segundos.';
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function apiFetchOnce(endpoint, options = {}) {
  const url = apiUrl(endpoint);
  const timeoutMs = options.timeout ?? DEFAULT_TIMEOUT_MS;
  const { timeout: _ignored, retries: _r, ...fetchOptions } = options;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(url, { ...fetchOptions, signal: controller.signal });
  } catch (err) {
    if (err?.name === 'AbortError') {
      const timeoutErr = new Error(timeoutErrorMessage());
      timeoutErr.name = 'TimeoutError';
      timeoutErr.retryable = true;
      throw timeoutErr;
    }
    throw err;
  } finally {
    window.clearTimeout(timer);
  }

  const text = await res.text();

  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      console.error('Resposta inválida:', url, text.slice(0, 500));
      throw new Error(explainInvalidApiResponse(text, res.status, url));
    }
  }

  if (!res.ok || (data && data.ok === false)) {
    const err = new Error(data?.error || 'Não foi possível completar a operação.');
    err.status = res.status;
    err.code = data?.code;
    err.retryable = res.status >= 500 || res.status === 408 || res.status === 429;
    throw err;
  }

  return data;
}

export async function apiFetch(endpoint, options = {}) {
  assertPhpServer();

  const retries = Math.max(0, options.retries ?? 0);
  let lastErr;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await apiFetchOnce(endpoint, options);
    } catch (err) {
      lastErr = err;
      const canRetry = attempt < retries && (err?.retryable || err?.name === 'TimeoutError');
      if (!canRetry) break;
      await sleep(450 * (attempt + 1));
    }
  }

  throw lastErr;
}
