const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const ACCESS_KEY = "lp_access";
const REFRESH_KEY = "lp_refresh";

export function mediaUrl(url) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }
  const base = (API_BASE || "").replace(/\/+$/, "");
  return base + (url.startsWith("/") ? url : "/" + url);
}

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
  updateProfile: (b) => api("/api/auth/profile", { method: "PATCH", body: b }),

  // lotteries
  listLotteries: (status) => api(`/api/lotteries${status ? `?status=${status}` : ""}`),
  getLottery: (id) => api(`/api/lotteries/${id}`),
  takenNumbers: (id) => api(`/api/lotteries/${id}/taken-numbers`, { auth: false }),
  createLottery: (b) => api("/api/lotteries", { method: "POST", body: b }),
  updateLottery: (id, b) => api(`/api/lotteries/${id}`, { method: "PATCH", body: b }),
  publishLottery: (id) => api(`/api/lotteries/${id}/publish`, { method: "POST" }),
  closeLottery: (id) => api(`/api/lotteries/${id}/close`, { method: "POST" }),
  cancelLottery: (id) => api(`/api/lotteries/${id}/cancel`, { method: "POST" }),
  resetLottery: (id) => api(`/api/lotteries/${id}/reset`, { method: "POST" }),
  deleteLottery: (id) => api(`/api/lotteries/${id}`, { method: "DELETE" }),
  uploadCover: (id, formData) => api(`/api/lotteries/${id}/cover-image`, { method: "POST", body: formData, form: true }),
  uploadPrizeImages: (id, formData) => api(`/api/lotteries/${id}/prize-images`, { method: "POST", body: formData, form: true }),

  // tickets
  myTickets: () => api("/api/tickets/mine"),
  getTicket: (id) => api(`/api/tickets/${id}`),
  lotteryTickets: (lotteryId) => api(`/api/tickets/lottery/${lotteryId}`),

  // payments
  paymentAccounts: () => api("/api/payments/accounts", { auth: false }),
  submitPayment: (formData) => api("/api/payments/submit", { method: "POST", body: formData, form: true }),
  myPayments: () => api("/api/payments/mine"),
  confirmPayment: (id) => api(`/api/payments/${id}/confirm`, { method: "POST" }),
  rejectPayment: (id) => api(`/api/payments/${id}/reject`, { method: "POST" }),

  // results
  getResults: (lotteryId) => api(`/api/lotteries/${lotteryId}/results`),
  getWinners: (lotteryId) => api(`/api/lotteries/${lotteryId}/winners`),
  publishResults: (lotteryId, b) => api(`/api/lotteries/${lotteryId}/results`, { method: "POST", body: b }),
  uploadDrawVideo: (id, formData) => api(`/api/lotteries/${id}/results/video`, { method: "POST", body: formData, form: true }),
  uploadDrawVideos: (id, formData) => api(`/api/lotteries/${id}/results/videos`, { method: "POST", body: formData, form: true }),
  uploadProofImages: (id, formData) => api(`/api/lotteries/${id}/results/proof-images`, { method: "POST", body: formData, form: true }),

  // admin
  metrics: () => api("/api/admin/metrics"),
  listUsers: (params) => {
    let query = "";
    if (params) {
      const sp = new URLSearchParams();
      if (params.q) sp.set("q", params.q);
      if (params.role && params.role !== "ALL") sp.set("role", params.role);
      const str = sp.toString();
      if (str) query = `?${str}`;
    }
    return api(`/api/admin/users${query}`);
  },
  updateUser: (id, b) => api(`/api/admin/users/${id}`, { method: "PATCH", body: b }),
  resetUserPassword: (id, new_password) => api(`/api/admin/users/${id}/reset-password`, { method: "POST", body: { new_password } }),
  allTransactions: () => api("/api/admin/transactions"),
  auditLogs: () => api("/api/admin/audit"),
  adminPaymentAccounts: () => api("/api/admin/payment-accounts"),
  savePaymentAccount: (b) => api("/api/admin/payment-accounts", { method: "POST", body: b }),
  updatePaymentAccount: (id, b) => api(`/api/admin/payment-accounts/${id}`, { method: "PATCH", body: b }),
  deletePaymentAccount: (id) => api(`/api/admin/payment-accounts/${id}`, { method: "DELETE" }),
  lotteryTickets: (lotteryId) => api(`/api/tickets/lottery/${lotteryId}`),
};

