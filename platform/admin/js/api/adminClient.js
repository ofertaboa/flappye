import { apiUrl } from '../../../js/shared/api.js';

export function adminFetch(url, options = {}) {
  const token = sessionStorage.getItem('flappy_admin_token');
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}

export async function parseAdminResponse(res) {
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('Resposta inválida do servidor.');
    }
  }
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || 'Operação não concluída.');
  }
  return data;
}

export function rangeQuery(range) {
  const params = new URLSearchParams();
  if (range?.startStr) params.set('from', range.startStr);
  else if (range?.start) params.set('from', range.start.toISOString());
  if (range?.endStr) params.set('to', range.endStr);
  else if (range?.end) params.set('to', range.end.toISOString());
  params.set('tz', 'America/Sao_Paulo');
  return params;
}
