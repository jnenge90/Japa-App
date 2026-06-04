// ═══════════════════════════════════════════════════════
// JAPA APP — API Client
// Set your deployed backend URL below before going live
// ═══════════════════════════════════════════════════════
const API_BASE = window.JAPA_API_URL || 'https://japaapp-api.railway.app';

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('japa_token');
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

const api = {
  // ── AUTH ──────────────────────────────────────────────
  async signup(email, password, fullName) {
    const data = await apiFetch('/auth/signup', { method: 'POST', body: JSON.stringify({ email, password, full_name: fullName }) });
    return data;
  },
  async login(email, password) {
    const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    if (data.access_token) {
      localStorage.setItem('japa_token', data.access_token);
      localStorage.setItem('japa_user', JSON.stringify(data.user));
    }
    return data;
  },
  logout() {
    localStorage.removeItem('japa_token');
    localStorage.removeItem('japa_user');
    window.location.href = 'index.html';
  },
  getUser() {
    try { return JSON.parse(localStorage.getItem('japa_user')); } catch { return null; }
  },
  isLoggedIn() { return !!localStorage.getItem('japa_token'); },
  async getMe() { return apiFetch('/auth/me'); },
  async updateProfile(data) { return apiFetch('/auth/me', { method: 'PUT', body: JSON.stringify(data) }); },

  // ── AGENTS ────────────────────────────────────────────
  async getAgents(params = {}) {
    const qs = new URLSearchParams(Object.entries(params).filter(([,v]) => v)).toString();
    return apiFetch(`/agents${qs ? '?' + qs : ''}`);
  },
  async getAgent(id) { return apiFetch(`/agents/${id}`); },
  async registerAgent(data) { return apiFetch('/agents/register', { method: 'POST', body: JSON.stringify(data) }); },
  async reviewAgent(agentId, data) { return apiFetch(`/agents/${agentId}/reviews`, { method: 'POST', body: JSON.stringify(data) }); },

  // ── BOOKINGS ──────────────────────────────────────────
  async createBooking(data) { return apiFetch('/bookings', { method: 'POST', body: JSON.stringify(data) }); },
  async getMyBookings() { return apiFetch('/bookings'); },
  async releaseEscrow(bookingId) { return apiFetch(`/bookings/${bookingId}/release-escrow`, { method: 'POST' }); },

  // ── COMMUNITY ─────────────────────────────────────────
  async getPosts(params = {}) {
    const qs = new URLSearchParams(Object.entries(params).filter(([,v]) => v)).toString();
    return apiFetch(`/posts${qs ? '?' + qs : ''}`);
  },
  async getPost(id) { return apiFetch(`/posts/${id}`); },
  async createPost(data) { return apiFetch('/posts', { method: 'POST', body: JSON.stringify(data) }); },
  async upvotePost(id) { return apiFetch(`/posts/${id}/upvote`, { method: 'POST' }); },
  async addComment(postId, content) { return apiFetch(`/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify({ content }) }); },

  // ── CHECKLIST ─────────────────────────────────────────
  async getChecklist() { return apiFetch('/checklist'); },
  async saveChecklist(data) { return apiFetch('/checklist', { method: 'PUT', body: JSON.stringify(data) }); },
  async getShareLink() { return apiFetch('/checklist/share', { method: 'POST' }); },

  // ── SCAM REPORTS ──────────────────────────────────────
  async getScamReports() { return apiFetch('/scam-reports'); },
  async reportScam(data) { return apiFetch('/scam-reports', { method: 'POST', body: JSON.stringify(data) }); },
};
