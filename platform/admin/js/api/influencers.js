import { apiUrl } from '../../../js/shared/api.js';
import { adminFetch, parseAdminResponse } from './adminClient.js';

export const influencersApi = {
  async hub(range = {}) {
    const params = new URLSearchParams();
    if (range.startStr) params.set('from', range.startStr);
    if (range.endStr) params.set('to', range.endStr);
    const qs = params.toString();
    const url = apiUrl(`admin/influencers.php${qs ? `?${qs}` : ''}`);
    const res = await adminFetch(url);
    return parseAdminResponse(res);
  },

  async list(range = {}) {
    const data = await this.hub(range);
    return data.influencers;
  },

  async detail(id) {
    const res = await adminFetch(apiUrl(`admin/influencers.php?id=${id}`));
    return parseAdminResponse(res);
  },
};
