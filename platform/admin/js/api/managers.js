import { apiUrl } from '../../../js/shared/api.js';
import { adminFetch, parseAdminResponse } from './adminClient.js';

export const managersApi = {
  async list() {
    const res = await adminFetch(apiUrl('admin/managers.php'));
    const data = await parseAdminResponse(res);
    return {
      managers: data.managers || [],
      defaultCommissionPct: Number(data.default_commission_pct ?? 70),
    };
  },

  async get(id) {
    const res = await adminFetch(apiUrl(`admin/managers.php?id=${id}`));
    const data = await parseAdminResponse(res);
    return {
      manager: data.manager,
      influencers: data.influencers || [],
      defaultCommissionPct: Number(data.default_commission_pct ?? 70),
    };
  },

  async saveDefaultCommission(commissionPct) {
    const res = await adminFetch(apiUrl('admin/managers.php'), {
      method: 'POST',
      body: JSON.stringify({ action: 'save_default', commission_pct: commissionPct }),
    });
    const data = await parseAdminResponse(res);
    return Number(data.default_commission_pct ?? commissionPct);
  },

  async create(payload) {
    const res = await adminFetch(apiUrl('admin/managers.php'), {
      method: 'POST',
      body: JSON.stringify({ action: 'create', ...payload }),
    });
    const data = await parseAdminResponse(res);
    return data.manager;
  },

  async update(id, payload) {
    const res = await adminFetch(apiUrl('admin/managers.php'), {
      method: 'POST',
      body: JSON.stringify({ id, ...payload }),
    });
    const data = await parseAdminResponse(res);
    return data.manager;
  },
};
