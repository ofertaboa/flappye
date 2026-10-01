import { apiUrl } from '../../../js/shared/api.js';
import { adminFetch, parseAdminResponse, rangeQuery } from './adminClient.js';

export const depositsApi = {
  async list({ range, status = 'todos' } = {}) {
    const params = rangeQuery(range);
    if (status && status !== 'todos') params.set('status', status);
    const res = await adminFetch(apiUrl(`admin/deposits.php?${params}`));
    const data = await parseAdminResponse(res);
    return data.deposits;
  },

  async approve(depositId) {
    const res = await adminFetch(apiUrl('admin/deposits.php'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', deposit_id: depositId }),
    });
    return parseAdminResponse(res);
  },
};
