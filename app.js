// ═══════════════════════════════════════════════════════
// JAPA APP — Page-specific logic (agents, community, checklist)
// ═══════════════════════════════════════════════════════

// ── AGENTS PAGE ───────────────────────────────────────
async function loadAgents(params = {}) {
  const grid = document.getElementById('agents-grid');
  const countEl = document.getElementById('agent-count');
  if (!grid) return;
  grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--gray);">Loading agents...</div>`;
  try {
    const { agents } = await api.getAgents(params);
    if (!agents.length) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--gray);">No agents found. Try different filters.</div>`;
      if (countEl) countEl.textContent = 0;
      return;
    }
    if (countEl) countEl.textContent = agents.length;
    grid.innerHTML = agents.map(a => `
      <div class="agent-card">
        <div class="agent-verified"><span class="badge badge-green">✓ Verified</span></div>
        <div class="agent-card-header">
          <div class="agent-avatar" style="background:linear-gradient(135deg,#1A56A0,#5b9bd5);">${a.full_name.charAt(0)}</div>
          <div>
            <div class="agent-name">${a.full_name}</div>
            <div class="agent-meta">📍 ${a.city} · NIS Lic. #${a.nis_licence}</div>
            <div class="agent-rating"><span class="stars">★★★★★</span> ${Number(a.avg_rating).toFixed(1)} <span style="color:var(--gray);font-weight:400;">(${a.review_count} reviews)</span></div>
          </div>
        </div>
        <div class="agent-tags">${a.countries.map(c => `<span class="agent-tag">${c}</span>`).join('')}${a.visa_types.slice(0,2).map(v => `<span class="agent-tag">${v}</span>`).join('')}</div>
        <p style="font-size:13px;color:var(--gray);line-height:1.6;">${a.bio.substring(0,140)}${a.bio.length>140?'…':''}</p>
        <div class="agent-price">From <strong>₦${a.price_from.toLocaleString()}</strong> · Full service ₦${a.price_full.toLocaleString()}</div>
        <div class="agent-actions">
          <button class="btn btn-primary btn-sm" onclick="openBookingModal('${a.id}','${a.full_name.replace(/'/g,"\\'")}')">Book via Escrow</button>
          <button class="btn btn-outline btn-sm" onclick="viewAgentProfile('${a.id}')">View Profile</button>
        </div>
      </div>`).join('');
  } catch (err) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--gray);">Failed to load agents. Please try again.</div>`;
  }
}

async function viewAgentProfile(id) {
  try {
    const agent = await api.getAgent(id);
    alert(`${agent.full_name}\n${agent.bio}\n\nRating: ${agent.avg_rating} (${agent.review_count} reviews)\nCountries: ${agent.countries.join(', ')}`);
  } catch { showToast('Could not load agent profile', 'error'); }
}

async function submitBooking(agentId, agentName) {
  if (!api.isLoggedIn()) { openAuthModal('login'); return; }
  const service = document.getElementById('booking-service')?.value;
  const desc = document.getElementById('booking-desc')?.value;
  if (!service) { showToast('Please select a service type', 'error'); return; }
  const btn = document.getElementById('booking-submit-btn');
  btn.textContent = 'Submitting…'; btn.disabled = true;
  try {
    await api.createBooking({ agent_id: agentId, service_type: service, description: desc, escrow_amount: 0 });
    closeBooking();
    showToast('✅ Booking submitted! Check your email for next steps.');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.textContent = 'Proceed to Secure Payment'; btn.disabled = false;
  }
}

// ── COMMUNITY PAGE ────────────────────────────────────
async function loadPosts(params = {}) {
  const feed = document.getElementById('posts-feed');
  if (!feed) return;
  feed.innerHTML = `<div style="text-align:center;padding:40px;color:var(--gray);">Loading posts...</div>`;
  try {
    const { posts } = await api.getPosts(params);
    if (!posts.length) { feed.innerHTML = `<div style="text-align:center;padding:40px;color:var(--gray);">No posts in this channel yet. Be the first to post!</div>`; return; }
    feed.innerHTML = posts.map(p => {
      const author = p.profiles || {};
      const initials = (author.full_name || 'U').charAt(0).toUpperCase();
      const relocated = author.is_relocated ? `<span class="badge badge-green" style="font-size:11px;margin-left:6px;">✓ Relocated to ${author.relocated_to||''}</span>` : '';
      const timeAgo = timeSince(p.created_at);
      return `
        <div class="post-card">
          <div class="post-author">
            <div class="post-avatar">${initials}</div>
            <div>
              <div class="post-author-name">${author.full_name||'Member'} ${relocated}</div>
              <div class="post-author-meta">${p.channel} · ${timeAgo}</div>
            </div>
          </div>
          <div class="post-title">${escapeHtml(p.title)}</div>
          <div class="post-excerpt">${escapeHtml(p.content).substring(0,200)}${p.content.length>200?'…':''}</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;">${p.tags.map(t=>`<span class="badge badge-blue">${t}</span>`).join('')}</div>
          <div class="post-footer">
            <div class="post-stats">
              <span class="post-stat" onclick="handleUpvote('${p.id}',this)" style="cursor:pointer;">👍 <strong>${p.upvotes}</strong></span>
              <span class="post-stat">💬 <strong>${p.comment_count||0}</strong></span>
            </div>
            <button class="btn btn-outline btn-sm" onclick="openPostDetail('${p.id}')">Read More</button>
          </div>
        </div>`;
    }).join('');
  } catch (err) {
    feed.innerHTML = `<div style="text-align:center;padding:40px;color:var(--gray);">Failed to load posts.</div>`;
  }
}

async function handleUpvote(postId, el) {
  if (!api.isLoggedIn()) { openAuthModal('login'); return; }
  try {
    const res = await api.upvotePost(postId);
    const countEl = el.querySelector('strong');
    if (countEl) countEl.textContent = parseInt(countEl.textContent) + (res.action === 'added' ? 1 : -1);
  } catch (err) { showToast(err.message, 'error'); }
}

async function submitPost(e) {
  e.preventDefault();
  if (!api.isLoggedIn()) { openAuthModal('login'); return; }
  const btn = document.getElementById('submit-post-btn');
  btn.textContent = 'Publishing…'; btn.disabled = true;
  try {
    await api.createPost({
      title: document.getElementById('post-title-input').value,
      content: document.getElementById('post-content-input').value,
      channel: document.getElementById('post-channel-select').value,
      tags: []
    });
    document.getElementById('post-modal').style.display = 'none';
    showToast('✅ Post published!');
    loadPosts();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.textContent = 'Publish Post'; btn.disabled = false;
  }
}

async function openPostDetail(postId) {
  try {
    const post = await api.getPost(postId);
    const author = post.profiles || {};
    const relocated = author.is_relocated ? `✓ Relocated to ${author.relocated_to}` : '';
    const commentsHtml = (post.comments||[]).map(c => {
      const ca = c.profiles || {};
      return `<div style="padding:12px 0;border-bottom:1px solid var(--border);display:flex;gap:10px;">
        <div class="post-avatar" style="width:30px;height:30px;font-size:12px;flex-shrink:0;">${(ca.full_name||'U').charAt(0)}</div>
        <div><div style="font-size:13px;font-weight:600;">${ca.full_name||'Member'}</div><div style="font-size:13px;color:var(--gray);margin-top:3px;">${escapeHtml(c.content)}</div></div>
      </div>`;
    }).join('') || '<div style="color:var(--gray);font-size:14px;padding:16px 0;">No comments yet. Be the first to reply!</div>';

    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:999;overflow-y:auto;padding:20px 12px;display:flex;align-items:flex-start;justify-content:center;';
    modal.innerHTML = `
      <div style="background:white;border-radius:16px;max-width:640px;width:100%;margin-top:20px;box-shadow:0 24px 64px rgba(0,0,0,0.2);">
        <div style="padding:24px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;">
          <h2 style="font-size:18px;font-weight:700;font-family:var(--font);line-height:1.4;flex:1;">${escapeHtml(post.title)}</h2>
          <button onclick="this.closest('.fixed-modal').remove();document.body.style.overflow=''" style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--gray);margin-left:12px;">✕</button>
        </div>
        <div style="padding:24px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
            <div class="post-avatar">${(author.full_name||'U').charAt(0)}</div>
            <div><div style="font-size:14px;font-weight:600;font-family:var(--font);">${author.full_name||'Member'}</div><div style="font-size:12px;color:var(--gray);">${relocated}</div></div>
          </div>
          <p style="font-size:15px;line-height:1.7;color:#1A1A2E;font-family:var(--font);white-space:pre-wrap;">${escapeHtml(post.content)}</p>
          <h3 style="font-size:16px;font-weight:700;margin:24px 0 8px;font-family:var(--font);">💬 ${post.comments?.length||0} Comments</h3>
          ${commentsHtml}
          ${api.isLoggedIn() ? `
          <form onsubmit="addCommentFromModal(event,'${post.id}')" style="display:flex;gap:10px;margin-top:16px;">
            <input type="text" placeholder="Write a reply..." id="comment-input-${post.id}" style="flex:1;padding:10px 14px;border:1.5px solid var(--border);border-radius:8px;font-family:var(--font);font-size:14px;">
            <button type="submit" class="btn btn-primary btn-sm">Reply</button>
          </form>` : `<a href="#" onclick="openAuthModal('login')" style="display:block;text-align:center;margin-top:16px;font-size:14px;font-weight:600;color:var(--blue);">Sign in to reply →</a>`}
        </div>
      </div>`;
    modal.classList.add('fixed-modal');
    modal.addEventListener('click', e => { if (e.target === modal) { modal.remove(); document.body.style.overflow = ''; }});
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
  } catch (err) { showToast('Could not load post', 'error'); }
}

async function addCommentFromModal(e, postId) {
  e.preventDefault();
  const input = document.getElementById(`comment-input-${postId}`);
  if (!input?.value.trim()) return;
  try {
    await api.addComment(postId, input.value);
    input.value = '';
    showToast('Reply posted!');
  } catch (err) { showToast(err.message, 'error'); }
}

// ── CHECKLIST PAGE ────────────────────────────────────
async function loadSavedChecklist() {
  if (!api.isLoggedIn()) return;
  try {
    const { checklist } = await api.getChecklist();
    if (!checklist) return;
    const countryEl = document.getElementById('setup-country');
    const visaEl = document.getElementById('setup-visa');
    if (countryEl && checklist.country) countryEl.value = checklist.country;
    if (visaEl && checklist.visa_type) visaEl.value = checklist.visa_type;
    if (checklist.country && checklist.visa_type) {
      generateChecklist();
      // restore completed items
      (checklist.completed_items || []).forEach(itemId => {
        const cb = document.getElementById(itemId);
        if (cb) { cb.checked = true; cb.closest('.checklist-item')?.classList.add('done'); }
      });
      updateOverall();
    }
  } catch {}
}

async function autoSaveChecklist() {
  if (!api.isLoggedIn()) return;
  const country = document.getElementById('setup-country')?.value;
  const visa_type = document.getElementById('setup-visa')?.value;
  if (!country || !visa_type) return;
  const completed_items = Array.from(document.querySelectorAll('[id^="chk-"]:checked')).map(c => c.id);
  try { await api.saveChecklist({ country, visa_type, completed_items }); } catch {}
}

// ── SCAM REPORTS ─────────────────────────────────────
async function loadScamReports() {
  const container = document.getElementById('scam-reports-live');
  if (!container) return;
  try {
    const { reports } = await api.getScamReports();
    if (!reports.length) return;
    container.innerHTML = reports.slice(0,3).map(r => `
      <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:12px 14px;">
        <div style="font-size:13px;font-weight:700;color:#C0392B;">⛔ ${escapeHtml(r.agent_name)}${r.company_name?' ('+escapeHtml(r.company_name)+')':''}</div>
        <div style="font-size:12px;color:#666;margin-top:3px;">${escapeHtml(r.description.substring(0,120))}… · ${r.location||'Nigeria'} · ${timeSince(r.created_at)}</div>
      </div>`).join('');
  } catch {}
}

// ── UTILITIES ─────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function timeSince(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── PAGE INIT ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  if (page === 'agents') loadAgents();
  if (page === 'community') loadPosts();
  if (page === 'checklist') loadSavedChecklist();
  loadScamReports();
});
