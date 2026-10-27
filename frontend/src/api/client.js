const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const ACCESS_KEY = "lp_access";
const REFRESH_KEY = "lp_refresh";

export const token = {
  get access() { return localStorage.getItem(ACCESS_KEY); },
  get refresh() { return localStorage.getItem(REFRESH_KEY); },
  set(a, r) { localStorage.setItem(ACCESS_KEY, a); if (r) localStorage.setItem(REFRESH_KEY, r); },
  clear() { localStorage.removeItem(ACCESS_KEY); localStorage.removeItem(REFRESH_KEY); },
};

async function refreshAccess() {
  const r = token.refresh;
  if (!r) return null;
  try {
    const res = await fetch(API_BASE + "/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: r }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    token.set(data.access_token, data.refresh_token);
    return data.access_token;
  } catch { return null; }
}

export async function api(path, { method = "GET", body, auth = true, form = false } = {}) {
  const headers = {};
  if (!form) headers["Content-Type"] = "application/json";
  if (auth && token.access) headers.Authorization = `Bearer ${token.access}`;

  let res = await fetch(API_BASE + path, {
    method,
    headers,
    body: form ? body : body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth && token.refresh) {
    const fresh = await refreshAccess();
    if (fresh) {
      headers.Authorization = `Bearer ${fresh}`;
      res = await fetch(API_BASE + path, {
        method, headers,
        body: form ? body : body ? JSON.stringify(body) : undefined,
      });
    }
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const err = await res.json();
      detail = Array.isArray(err.detail)
        ? err.detail.map((d) => d.msg || JSON.stringify(d)).join(", ")
        : err.detail || err.message || detail;
    } catch { /* ignore */ }
    const error = new Error(String(detail));
    error.status = res.status;
    throw error;
  }
  if (res.status === 204) return null;
  return res.json();
}

// ── Endpoint helpers ──────────────────────────────────────────────────────────
export const apiClient = {
  // auth
  register: (b) => api("/api/auth/register", { method: "POST", body: b, auth: false }),
  login: (b) => api("/api/auth/login", { method: "POST", body: b, auth: false }),
  me: () => api("/api/auth/me"),

  // lotteries
  listLotteries: (status) => api(`/api/lotteries${status ? `?status=${status}` : ""}`),
  getLottery: (id) => api(`/api/lotteries/${id}`),
  createLottery: (b) => api("/api/lotteries", { method: "POST", body: b }),
  updateLottery: (id, b) => api(`/api/lotteries/${id}`, { method: "PATCH", body: b }),
  publishLottery: (id) => api(`/api/lotteries/${id}/publish`, { method: "POST" }),
  closeLottery: (id) => api(`/api/lotteries/${id}/close`, { method: "POST" }),
  cancelLottery: (id) => api(`/api/lotteries/${id}/cancel`, { method: "POST" }),
  uploadCover: (id, formData) => api(`/api/lotteries/${id}/cover-image`, { method: "POST", body: formData, form: true }),
  uploadPrizeImages: (id, formData) => api(`/api/lotteries/${id}/prize-images`, { method: "POST", body: formData, form: true }),

  // tickets
  myTickets: () => api("/api/tickets/mine"),
  getTicket: (id) => api(`/api/tickets/${id}`),
  lotteryTickets: (lotteryId) => api(`/api/tickets/lottery/${lotteryId}`),

  // payments
  initiatePayment: (b) => api("/api/payments/initiate", { method: "POST", body: b }),
  myPayments: () => api("/api/payments/mine"),
  confirmPayment: (id) => api(`/api/payments/${id}/confirm`, { method: "POST" }),

  // results
  getResults: (lotteryId) => api(`/api/lotteries/${lotteryId}/results`),
  getWinners: (lotteryId) => api(`/api/lotteries/${lotteryId}/winners`),
  publishResults: (lotteryId, b) => api(`/api/lotteries/${lotteryId}/results`, { method: "POST", body: b }),
  uploadDrawVideo: (id, formData) => api(`/api/lotteries/${id}/results/video`, { method: "POST", body: formData, form: true }),
  uploadProofImages: (id, formData) => api(`/api/lotteries/${id}/results/proof-images`, { method: "POST", body: formData, form: true }),

  // admin
  metrics: () => api("/api/admin/metrics"),
  listUsers: () => api("/api/admin/users"),
  updateUser: (id, b) => api(`/api/admin/users/${id}`, { method: "PATCH", body: b }),
  allTransactions: () => api("/api/admin/transactions"),
  auditLogs: () => api("/api/admin/audit"),
};
