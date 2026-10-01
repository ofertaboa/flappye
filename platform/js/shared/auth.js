export function authHeaders() {
  const token = localStorage.getItem('flappy_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function adminAuthHeaders() {
  const token = sessionStorage.getItem('flappy_admin_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}
