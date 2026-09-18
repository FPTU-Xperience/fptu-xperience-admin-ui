/**
 * Future API client — reserved for wiring the admin UI to real backend
 * endpoints (awards, authentication, etc.). The prototype stores everything
 * locally: see `context/WorkspaceContext.jsx` and `utils/seed.js`.
 *
 * Keep API surface here so page components never talk to fetch() directly.
 */
const BASE_URL = import.meta.env.VITE_API_URL ?? '';

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers ?? {}) };
  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!response.ok) throw new Error(`API ${response.status}: ${await response.text()}`);
  return response.json();
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
};

export default api;