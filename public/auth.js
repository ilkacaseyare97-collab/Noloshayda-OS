const TOKEN_KEY = 'noloshayda_token';
const SESSION_KEY = 'noloshayda_session';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

function authHeaders(extra = {}) {
  const token = getToken();
  const headers = { ...extra };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function apiFetch(url, options = {}) {
  const headers = authHeaders(options.headers || {});
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  return fetch(url, { ...options, headers, credentials: 'same-origin' });
}

async function register(payload) {
  const res = await apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Khalad ayaa dhacay');
  if (data.token) setToken(data.token);
  return data;
}

async function login(credentials) {
  const res = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Khalad ayaa dhacay');
  if (data.token) setToken(data.token);
  return data;
}

async function logout() {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' });
  } catch (e) {}
  clearToken();
}

function appUrl() {
  return '/app';
}

function loginUrl() {
  return '/login';
}

window.NoloAuth = {
  register,
  login,
  logout,
  getToken,
  setToken,
  clearToken,
  authHeaders,
  apiFetch,
  appUrl,
  loginUrl
};
