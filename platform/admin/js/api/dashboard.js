import { apiUrl } from '../../../js/shared/api.js';
import { adminFetch, parseAdminResponse, rangeQuery } from './adminClient.js';

export const dashboardApi = {
  async get(range) {
    const params = rangeQuery(range);
    const res = await adminFetch(apiUrl(`admin/dashboard.php?${params}`));
    return parseAdminResponse(res);
  },
};
