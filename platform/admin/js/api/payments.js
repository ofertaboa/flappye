import { apiUrl } from '../../../js/shared/api.js';
import { adminFetch, parseAdminResponse, rangeQuery } from './adminClient.js';

export const paymentsApi = {
  async listWithdrawals({ range, status = 'todos' } = {}) {
    const params = rangeQuery(range);
    if (status && status !== 'todos') params.set('status', status);
    const res = await adminFetch(apiUrl(`admin/withdrawals.php?${params}`));
    const data = await parseAdminResponse(res);
    return data.withdrawals;
  },

  async approveWithdrawal(id) {
    const res = await adminFetch(apiUrl('admin/withdrawals.php'), {
      method: 'POST',
      body: JSON.stringify({ id, action: 'approve' }),
    });
    return parseAdminResponse(res);
  },

  async rejectWithdrawal(id) {
    const res = await adminFetch(apiUrl('admin/withdrawals.php'), {
      method: 'POST',
      body: JSON.stringify({ id, action: 'reject' }),
    });
    return parseAdminResponse(res);
  },
};
