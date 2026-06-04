// ═══════════════════════════════════════════════════════
// JAPA APP — Auth UI & State Management
// Include after api.js on every page
// ═══════════════════════════════════════════════════════

// ── INJECT AUTH MODAL ─────────────────────────────────
function injectAuthModal() {
  const modal = document.createElement('div');
  modal.id = 'auth-modal';
  modal.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;align-items:center;justify-content:center;';
  modal.innerHTML = `
    <div style="background:white;border-radius:16px;padding:32px;max-width:420px;width:92%;box-shadow:0 24px 64px rgba(0,0,0,0.2);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <h2 id="auth-title" style="font-size:22px;font-weight:800;font-family:var(--font);">Sign In</h2>
        <button onclick="closeAuthModal()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#6B7280;">✕</button>
      </div>
      <div id="auth-error" style="display:none;background:#FEE2E2;border:1px solid #FECACA;border-radius:8px;padding:10px 14px;font-size:13px;color:#991B1B;margin-bottom:14px;"></div>

      <!-- LOGIN FORM -->
      <form id="login-form" onsubmit="handleLogin(event)" style="display:flex;flex-direction:column;gap:12px;">
        <input type="email" id="login-email" placeholder="Email address" required style="padding:12px 14px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:14px;font-family:var(--font);">
        <div style="position:relative;">
          <input type="password" id="login-password" placeholder="Password" required style="padding:12px 14px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:14px;font-family:var(--font);width:100%;">
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;padding:13px;" id="login-btn">
          Sign In
        </button>
        <p style="text-align:center;font-size:13px;color:#6B7280;">
          Don't have an account? <a href="#" onclick="switchToSignup()" style="color:#1A56A0;font-weight:600;">Sign up free</a>
        </p>
      </form>

      <!-- SIGNUP FORM -->
      <form id="signup-form" style="display:none;flex-direction:column;gap:12px;" onsubmit="handleSignup(event)">
        <input type="text" id="signup-name" placeholder="Full name" required style="padding:12px 14px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:14px;font-family:var(--font);">
        <input type="email" id="signup-email" placeholder="Email address" required style="padding:12px 14px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:14px;font-family:var(--font);">
        <input type="password" id="signup-password" placeholder="Password (min 8 chars)" required minlength="8" style="padding:12px 14px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:14px;font-family:var(--font);">
        <select id="signup-country" style="padding:12px 14px;border:1.5px solid #E5E7EB;border-radius:8px;font-size:14px;font-family:var(--font);">
          <option value="">Where do you want to Japa? (optional)</option>
          <option>Canada</option><option>United Kingdom</option><option>Germany</option>
          <option>United States</option><option>Australia</option><option>UAE</option>
          <option>Ireland</option><option>Netherlands</option>
        </select>
        <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;padding:13px;" id="signup-btn">
          Create Free Account
        </button>
        <p style="text-align:center;font-size:13px;color:#6B7280;">
          Already have an account? <a href="#" onclick="switchToLogin()" style="color:#1A56A0;font-weight:600;">Sign in</a>
        </p>
        <p style="text-align:center;font-size:11px;color:#9CA3AF;">By signing up, you agree to our Terms of Service and Privacy Policy.</p>
      </form>
    </div>`;
  document.body.appendChild(modal);
}

function openAuthModal(mode = 'login') {
  const modal = document.getElementById('auth-modal');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  if (mode === 'signup') switchToSignup();
  else switchToLogin();
}
function closeAuthModal() {
  document.getElementById('auth-modal').style.display = 'none';
  document.body.style.overflow = '';
}
function switchToSignup() {
  document.getElementById('auth-title').textContent = 'Create Account';
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('signup-form').style.display = 'flex';
  clearAuthError();
}
function switchToLogin() {
  document.getElementById('auth-title').textContent = 'Sign In';
  document.getElementById('login-form').style.display = 'flex';
  document.getElementById('signup-form').style.display = 'none';
  clearAuthError();
}
function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg; el.style.display = 'block';
}
function clearAuthError() {
  document.getElementById('auth-error').style.display = 'none';
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  btn.textContent = 'Signing in…'; btn.disabled = true;
  try {
    await api.login(
      document.getElementById('login-email').value,
      document.getElementById('login-password').value
    );
    closeAuthModal();
    updateNavAuth();
    showToast('✅ Welcome back!');
  } catch (err) {
    showAuthError(err.message);
  } finally {
    btn.textContent = 'Sign In'; btn.disabled = false;
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const btn = document.getElementById('signup-btn');
  btn.textContent = 'Creating account…'; btn.disabled = true;
  try {
    await api.signup(
      document.getElementById('signup-email').value,
      document.getElementById('signup-password').value,
      document.getElementById('signup-name').value
    );
    closeAuthModal();
    showToast('🎉 Account created! Check your email to verify, then sign in.');
    switchToLogin();
  } catch (err) {
    showAuthError(err.message);
  } finally {
    btn.textContent = 'Create Free Account'; btn.disabled = false;
  }
}

// ── NAVBAR AUTH STATE ─────────────────────────────────
function updateNavAuth() {
  const user = api.getUser();
  const actionsEl = document.querySelector('.navbar-actions');
  if (!actionsEl) return;
  if (user) {
    const initials = (user.full_name || user.email || 'U').charAt(0).toUpperCase();
    actionsEl.innerHTML = `
      <div style="position:relative;">
        <button onclick="toggleUserMenu()" style="display:flex;align-items:center;gap:8px;background:var(--blue-light);border:1.5px solid var(--blue);border-radius:8px;padding:7px 12px;cursor:pointer;font-family:var(--font);font-size:14px;font-weight:600;color:var(--blue);">
          <span style="width:26px;height:26px;background:var(--blue);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:700;">${initials}</span>
          ${user.full_name ? user.full_name.split(' ')[0] : 'Account'} ▾
        </button>
        <div id="user-menu" style="display:none;position:absolute;right:0;top:calc(100% + 8px);background:white;border:1px solid var(--border);border-radius:10px;box-shadow:var(--shadow);min-width:160px;z-index:200;overflow:hidden;">
          <a href="checklist.html" style="display:block;padding:10px 16px;font-size:14px;color:var(--dark);font-family:var(--font);">📋 My Checklist</a>
          <a href="#" onclick="viewBookings()" style="display:block;padding:10px 16px;font-size:14px;color:var(--dark);font-family:var(--font);">📅 My Bookings</a>
          <a href="#" onclick="viewProfile()" style="display:block;padding:10px 16px;font-size:14px;color:var(--dark);font-family:var(--font);">👤 Profile</a>
          <hr style="margin:4px 0;border-color:var(--border);">
          <a href="#" onclick="api.logout()" style="display:block;padding:10px 16px;font-size:14px;color:#C0392B;font-family:var(--font);">Sign Out</a>
        </div>
      </div>`;
  } else {
    actionsEl.innerHTML = `
      <a href="#" onclick="openAuthModal('login')" class="btn btn-outline btn-sm">Log In</a>
      <a href="#" onclick="openAuthModal('signup')" class="btn btn-primary btn-sm">Sign Up Free</a>`;
  }
}

function toggleUserMenu() {
  const m = document.getElementById('user-menu');
  if (m) m.style.display = m.style.display === 'none' ? 'block' : 'none';
}
document.addEventListener('click', (e) => {
  const m = document.getElementById('user-menu');
  if (m && !e.target.closest('[onclick="toggleUserMenu()"]')) m.style.display = 'none';
});

function viewBookings() { showToast('📅 Bookings dashboard — coming in the next update!'); }
function viewProfile()  { showToast('👤 Profile editor — coming in the next update!'); }

// ── TOAST NOTIFICATIONS ───────────────────────────────
function showToast(msg, type = 'success') {
  const colors = { success: '#0D7A3E', error: '#C0392B', info: '#1A56A0' };
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;bottom:24px;right:24px;background:${colors[type]||colors.success};color:white;border-radius:10px;padding:14px 20px;font-family:var(--font);font-size:14px;font-weight:600;box-shadow:0 4px 20px rgba(0,0,0,0.2);z-index:9999;max-width:300px;animation:slideIn .3s ease;`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

// ── INIT ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  injectAuthModal();
  updateNavAuth();
  // Close modal on backdrop click
  document.getElementById('auth-modal').addEventListener('click', (e) => {
    if (e.target.id === 'auth-modal') closeAuthModal();
  });
});

// Hook CTA buttons that open auth
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('a[href="index.html#signup"]').forEach(a => {
    a.addEventListener('click', (e) => { e.preventDefault(); openAuthModal('signup'); });
  });
});
