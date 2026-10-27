// Thin fetch wrapper with JWT handling, refresh-on-401, and typed-ish helpers.
// Tokens live in localStorage (demo). Production should use HttpOnly cookies.
//
// API base: defaults to "" (relative paths). In dev, Vite proxies /api to the
// backend. In prod (Vercel), vercel.json rewrites /api/* to the Render backend —
// so relative paths work without any code change. Override with VITE_API_BASE_URL
// to call the backend directly instead (then configure CORS accordingly).
const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

const ACCESS_KEY = "lp_access";
const REFRESH_KEY = "lp_refresh";

export const token = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(access, refresh) {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

let refreshing = Promise.resolve(null);

async function refreshAccess() {
  const r = token.refresh;
  if (!r) return null;
  // Dedupe concurrent refresh attempts.
  refreshing = refreshing.catch(async () => {
    const res = await fetch(API_BASE + "/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: r }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    token.set(data.access_token, data.refresh_token);
    return data.access_token;
  });
  try {
    return await refreshing;
  } finally {
    refreshing = Promise.resolve(null);
  }
}

export async function api(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth && token.access) headers.Authorization = `Bearer ${token.access}`;

  let res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Transparent token refresh on expiry.
  if (res.status === 401 && auth && token.refresh) {
    const fresh = await refreshAccess();
    if (fresh) {
      headers.Authorization = `Bearer ${fresh}`;
      res = await fetch(API_BASE + path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    }
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const err = await res.json();
      // FastAPI validation errors return detail as an array of objects.
      if (Array.isArray(err.detail)) {
        detail = err.detail.map((d) => d.msg || JSON.stringify(d)).join(", ");
      } else {
        detail = err.detail || err.message || detail;
      }
    } catch {
      /* ignore */
    }
    const error = new Error(String(detail));
    error.status = res.status;
    throw error;
  }
  if (res.status === 204) return null;
  return res.json();
}

// High-level endpoint helpers -----------------------------------------------
export const apiClient = {
  register: (body) => api("/api/auth/register", { method: "POST", body, auth: false }),
  login: (body) => api("/api/auth/login", { method: "POST", body, auth: false }),
  me: () => api("/api/auth/me"),
  // draws
  listDraws: () => api("/api/draws"),
  getDraw: (id) => api(`/api/draws/${id}`),
  createDraw: (body) => api("/api/draws", { method: "POST", body }),
  freezeDraw: (id) => api(`/api/draws/${id}/freeze`, { method: "POST" }),
  runDraw: (id, clientSeed) =>
    api(`/api/draws/${id}/run?${clientSeed ? `client_seed=${encodeURIComponent(clientSeed)}` : ""}`, {
      method: "POST",
    }),
  cancelDraw: (id) => api(`/api/draws/${id}/cancel`, { method: "POST" }),
  // tickets
  buyTicket: (body) => api("/api/tickets", { method: "POST", body }),
  quickPick: (drawId) => api(`/api/tickets/quick-pick/${drawId}`),
  myTickets: () => api("/api/tickets/mine"),
  // wallet
  myWallet: () => api("/api/wallet"),
  deposit: (amount) => api("/api/wallet/deposit", { method: "POST", body: { amount } }),
  transactions: () => api("/api/wallet/transactions"),
  // admin
  listUsers: () => api("/api/admin/users"),
  updateUser: (id, body) => api(`/api/admin/users/${id}`, { method: "PATCH", body }),
  auditLogs: () => api("/api/admin/audit"),
  metrics: () => api("/api/admin/metrics"),
};
