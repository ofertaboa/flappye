import { apiUrl } from '../../../js/shared/api.js';
import { adminFetch, parseAdminResponse } from './adminClient.js';

export const bannersApi = {
  async list() {
    const res = await adminFetch(apiUrl('admin/banners.php'));
    const data = await parseAdminResponse(res);
    return { banners: data.banners || [], specs: data.specs || {} };
  },

  async save(payload) {
    const res = await adminFetch(apiUrl('admin/banners.php'), {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const data = await parseAdminResponse(res);
    return data.banner;
  },

  async remove(id) {
    const res = await adminFetch(apiUrl(`admin/banners.php?id=${id}`), { method: 'DELETE' });
    return parseAdminResponse(res);
  },

  async uploadImage(file) {
    const fd = new FormData();
    fd.append('action', 'upload');
    fd.append('image', file);
    const token = sessionStorage.getItem('flappy_admin_token');
    const res = await fetch(apiUrl('admin/banners.php'), {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });
    return parseAdminResponse(res);
  },
};
