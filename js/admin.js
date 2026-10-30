/* =========================================================
   Administrator Panel JavaScript (js/admin.js)
   Increments 2, 3, and 4
   ========================================================= */

let adminClaimsCache = [];
let adminValuableCache = [];

document.addEventListener('DOMContentLoaded', () => {
  initAdminDashboard();
});

function initAdminDashboard() {
  initAdminTabs();
  initAdminClaims();
  initAdminValuable();
  initAdminReports();
  initAdminUsers();
  initAdminArchive();
  initAdminAudit();

  // Load KPI overview metrics
  loadAdminStats();

  // Initial tab loading
  const activeTab = document.querySelector('.tab-content.active');
  if (activeTab) {
    handleTabLoad(activeTab.id);
  }
}

function initAdminTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      switchAdminTab(tabId);
      handleTabLoad(tabId);
    });
  });
}

function switchAdminTab(tabId) {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    if (btn.getAttribute('data-tab') === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  tabContents.forEach(content => {
    if (content.id === tabId) {
      content.style.display = 'block';
    } else {
      content.style.display = 'none';
    }
  });
}

function handleTabLoad(tabId) {
  if (tabId === 'valuableTab') loadValuablePosts();
  else if (tabId === 'claimsTab') loadAdminClaims();
  else if (tabId === 'reportsTab') loadMisuseReports();
  else if (tabId === 'usersTab') loadBlockedUsers();
  else if (tabId === 'archiveTab') loadArchivedItems();
  else if (tabId === 'auditTab') loadAuditLogs();
}

// ---------------------------------------------------------
// KPI METRICS STATS (DASHBOARD HEADER)
// ---------------------------------------------------------
async function loadAdminStats() {
  try {
    const res = await fetch('/api/admin/stats');
    const data = await res.json();
    if (data.success && data.stats) {
      const s = data.stats;
      const elUsers = document.getElementById('statTotalUsers');
      const elValuable = document.getElementById('statPendingValuable');
      const elClaims = document.getElementById('statPendingClaims');
      const elReports = document.getElementById('statPendingReports');
      const elPublished = document.getElementById('statPublishedItems');
      const elArchived = document.getElementById('statArchivedItems');

      if (elUsers) elUsers.textContent = s.totalUsers;
      if (elValuable) elValuable.textContent = s.pendingValuable;
      if (elClaims) elClaims.textContent = s.pendingClaims;
      if (elReports) elReports.textContent = s.pendingReports;
      if (elPublished) elPublished.textContent = s.publishedItems;
      if (elArchived) elArchived.textContent = s.archivedItems;
    }
  } catch (err) {
    console.error('Failed to load admin stats:', err);
  }
}

// ---------------------------------------------------------
// 1. VALUABLE ITEM APPROVALS (INCREMENT 3)
// ---------------------------------------------------------
function initAdminValuable() {
  const refreshBtn = document.getElementById('refreshValuableBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadValuablePosts);
  }
}

async function loadValuablePosts() {
  const container = document.getElementById('valuableItemsContainer');
  if (!container) return;

  container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 40px;">Loading pending valuable items...</div>';

  try {
    const res = await fetch('/api/admin/valuable-items');
    const data = await res.json();

    if (data.success) {
      adminValuableCache = data.items || [];
      renderValuablePosts(adminValuableCache, container);
    } else {
      container.innerHTML = `<div class="alert alert-danger">${data.message || 'Failed to load valuable items.'}</div>`;
    }
  } catch (err) {
    container.innerHTML = '<div class="alert alert-danger">Network error loading valuable items.</div>';
  }
}

function renderValuablePosts(items, container) {
  if (!items || items.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 50px 20px;">
        <div style="font-size: 2.5rem; margin-bottom: 12px;">💎</div>
        <h4>No Pending Valuable Items</h4>
        <p style="font-size: 0.9rem; color: var(--text-dim); margin-top: 6px;">
          All high-value lost and found items have been reviewed and processed.
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  items.forEach(item => {
    const card = document.createElement('div');
    card.style.cssText = `
      background: #FFFFFF;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 22px;
      margin-bottom: 20px;
      box-shadow: var(--shadow-xs);
    `;

    const imgHtml = item.primary_image
      ? `<div style="text-align: center; margin-bottom: 14px;"><img src="${item.primary_image}" style="max-height: 200px; max-width: 100%; border-radius: var(--radius-sm); border: 1px solid var(--border-color);" alt="Valuable Item"></div>`
      : '';

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 14px; margin-bottom: 14px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px;">
        <div>
          <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 6px; flex-wrap: wrap;">
            <span class="badge ${item.post_type === 'LOST' ? 'badge-lost' : 'badge-found'}">${item.post_type}</span>
            <span class="badge badge-pending">Pending Admin Approval</span>
            <span class="badge badge-valuable">💎 High-Value Item</span>
            <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 500;">${escapeHtml(item.category_name)}</span>
          </div>
          <h4 style="font-size: 1.25rem; color: var(--primary); margin-bottom: 4px;">
            ${escapeHtml(item.title)}
          </h4>
          <div style="font-size: 0.85rem; color: var(--text-muted);">
            📍 Location: ${escapeHtml(item.location)} &bull; 📅 Date: ${formatDate(item.item_date)} &bull; Time: ${escapeHtml(item.approximate_time || 'N/A')}
          </div>
        </div>

        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button class="btn btn-teal btn-sm" onclick="approveValuablePost(${item.item_id})">
            ✓ Approve & Publish
          </button>
          <button class="btn btn-danger-outline btn-sm" onclick="rejectValuablePost(${item.item_id})">
            ✕ Reject Post
          </button>
        </div>
      </div>

      ${imgHtml}

      <!-- Owner Info Box -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px; background: var(--bg-card-subtle); border: 1px solid var(--border-color); padding: 12px 16px; border-radius: var(--radius-sm); margin-bottom: 14px; font-size: 0.88rem;">
        <div><strong>Poster:</strong> ${escapeHtml(item.owner_name)} (${escapeHtml(item.owner_role)})</div>
        <div><strong>ID:</strong> ${escapeHtml(item.owner_institutional_id)}</div>
        <div><strong>Email:</strong> ${escapeHtml(item.owner_email)}</div>
        <div><strong>Phone:</strong> ${escapeHtml(item.owner_phone)}</div>
        <div><strong>Department:</strong> ${escapeHtml(item.owner_department)}</div>
      </div>

      <div style="background: var(--bg-card-subtle); border: 1px solid var(--border-color); padding: 14px 16px; border-radius: var(--radius-sm); font-size: 0.9rem; margin-bottom: 10px;">
        <div style="margin-bottom: 8px;">
          <strong style="color: var(--primary);">Description:</strong>
          <div style="color: var(--text-main); margin-top: 4px; white-space: pre-wrap;">${escapeHtml(item.description)}</div>
        </div>
        <div>
          <strong style="color: var(--primary);">Identifying Characteristics:</strong>
          <div style="color: var(--text-main); margin-top: 4px; white-space: pre-wrap;">${escapeHtml(item.identifying_characteristics)}</div>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-dim); margin-top: 10px;">
        <span>Item ID: #${item.item_id}</span>
        <span>Submitted: ${new Date(item.created_at).toLocaleString()}</span>
      </div>
    `;

    container.appendChild(card);
  });
}

async function approveValuablePost(itemId) {
  if (!confirm('Approve this valuable post? It will immediately become Published and visible to campus search.')) return;

  try {
    const res = await fetch(`/api/admin/items/${itemId}/approve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await res.json();
    if (data.success) {
      alert('✓ ' + data.message);
      loadValuablePosts();
      loadAdminStats();
    } else {
      alert('⚠️ ' + (data.message || 'Failed to approve valuable post.'));
    }
  } catch (err) {
    alert('Server error approving valuable post.');
  }
}

async function rejectValuablePost(itemId) {
  const reason = prompt('Enter administrative reason for rejecting this valuable post:', 'Does not meet college portal high-value guidelines or contains insufficient details.');
  if (reason === null) return;

  try {
    const res = await fetch(`/api/admin/items/${itemId}/reject`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });

    const data = await res.json();
    if (data.success) {
      alert('✓ ' + data.message);
      loadValuablePosts();
      loadAdminStats();
    } else {
      alert('⚠️ ' + (data.message || 'Failed to reject valuable post.'));
    }
  } catch (err) {
    alert('Server error rejecting valuable post.');
  }
}

// ---------------------------------------------------------
// 2. CLAIMS VERIFICATION & RETURN MANAGEMENT (INCREMENT 2)
// ---------------------------------------------------------
function initAdminClaims() {
  const filter = document.getElementById('adminClaimStatusFilter');
  if (filter) filter.addEventListener('change', loadAdminClaims);

  const refreshBtn = document.getElementById('refreshAdminClaimsBtn');
  if (refreshBtn) refreshBtn.addEventListener('click', loadAdminClaims);

  const closeBtn = document.getElementById('adminModalCloseBtn');
  if (closeBtn) closeBtn.addEventListener('click', closeAdminModal);
}

function closeAdminModal() {
  const modal = document.getElementById('adminClaimModal');
  if (modal) modal.classList.remove('active');
}

async function loadAdminClaims() {
  const container = document.getElementById('adminClaimsContainer');
  if (!container) return;

  const filterSelect = document.getElementById('adminClaimStatusFilter');
  const statusFilter = filterSelect ? filterSelect.value : 'all';

  container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 40px;">Loading claims...</div>';

  try {
    const url = `/api/admin/claims${statusFilter && statusFilter !== 'all' ? `?status=${encodeURIComponent(statusFilter)}` : ''}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.success) {
      adminClaimsCache = data.claims || [];
      renderAdminClaims(adminClaimsCache, container);
    } else {
      container.innerHTML = `<div class="alert alert-danger">${data.message || 'Failed to load claims.'}</div>`;
    }
  } catch (err) {
    container.innerHTML = '<div class="alert alert-danger">Network error loading claims.</div>';
  }
}

function renderAdminClaims(claims, container) {
  if (!claims || claims.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 50px 20px;">
        <div style="font-size: 2.5rem; margin-bottom: 12px;">⚖️</div>
        <h4>No Claims Found</h4>
        <p style="font-size: 0.9rem; color: var(--text-dim); margin-top: 6px;">
          No ownership claims match the selected filter.
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  claims.forEach(claim => {
    const card = document.createElement('div');
    card.style.cssText = `
      background: #FFFFFF;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 22px;
      margin-bottom: 20px;
      box-shadow: var(--shadow-xs);
    `;

    let statusBadgeClass = 'badge-pending';
    if (claim.claim_status === 'Approved') statusBadgeClass = 'badge-approved';
    else if (claim.claim_status === 'Rejected') statusBadgeClass = 'badge-rejected';
    else if (claim.claim_status === 'Cancelled') statusBadgeClass = 'badge-cancelled';

    let itemStatusBadgeClass = 'badge-published';
    if (claim.item_status === 'Claimed') itemStatusBadgeClass = 'badge-claimed';
    else if (claim.item_status === 'Returned') itemStatusBadgeClass = 'badge-returned';

    let evidencePhotoHtml = '';
    if (claim.evidence_file_path) {
      evidencePhotoHtml = `
        <div style="margin-top: 10px;">
          <a href="${claim.evidence_file_path}" target="_blank" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
            📷 View Attached Evidence File
          </a>
        </div>
      `;
    }

    let verificationNotesHtml = '';
    if (claim.verification_notes) {
      verificationNotesHtml = `
        <div style="margin-top: 12px; background: #FFFFFF; border: 1px solid var(--border-color); padding: 10px 14px; border-radius: var(--radius-sm); border-left: 3px solid ${claim.claim_status === 'Approved' ? '#10b981' : '#f87171'}; font-size: 0.88rem;">
          <strong>Admin Remarks:</strong> ${escapeHtml(claim.verification_notes)}
          ${claim.verifier_name ? ` <span style="color: var(--text-dim);">(by ${escapeHtml(claim.verifier_name)})</span>` : ''}
        </div>
      `;
    }

    let actionButtonsHtml = '';
    if (claim.claim_status === 'Pending') {
      actionButtonsHtml = `
        <button class="btn btn-teal btn-sm" onclick="promptApproveClaim(${claim.claim_id})">
          ✓ Approve Claim
        </button>
        <button class="btn btn-danger-outline btn-sm" onclick="promptRejectClaim(${claim.claim_id})">
          ✕ Reject Claim
        </button>
      `;
    } else if (claim.claim_status === 'Approved' && claim.item_status !== 'Returned') {
      actionButtonsHtml = `
        <button class="btn btn-primary btn-sm" onclick="confirmItemReturn(${claim.item_id})">
          📦 Confirm Item Returned
        </button>
      `;
    } else if (claim.item_status === 'Returned') {
      actionButtonsHtml = `
        <span class="badge badge-returned" style="padding: 6px 12px;">
          ✓ Handover Completed / Returned
        </span>
      `;
    }

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 14px; margin-bottom: 14px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">
            <span class="badge ${claim.post_type === 'LOST' ? 'badge-lost' : 'badge-found'}">${claim.post_type}</span>
            <span class="badge ${statusBadgeClass}">Claim: ${claim.claim_status}</span>
            <span class="badge ${itemStatusBadgeClass}">Item: ${claim.item_status}</span>
            <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 500;">${escapeHtml(claim.category_name)}</span>
          </div>
          <h4 style="font-size: 1.2rem; color: var(--primary); margin-bottom: 4px;">
            Item: ${escapeHtml(claim.item_title)}
          </h4>
          <div style="font-size: 0.85rem; color: var(--text-muted);">
            📍 Location: ${escapeHtml(claim.item_location)} &bull; 📅 Post Date: ${formatDate(claim.item_date)} &bull; Reported by: <strong>${escapeHtml(claim.poster_name)}</strong> (${escapeHtml(claim.poster_department)})
          </div>
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          ${actionButtonsHtml}
          <button class="btn btn-secondary btn-sm" onclick="openAdminClaimDetail(${claim.claim_id})">
            🔍 Full Review
          </button>
        </div>
      </div>

      <!-- Claimant Profile Box -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; background: var(--bg-card-subtle); border: 1px solid var(--border-color); padding: 12px 16px; border-radius: var(--radius-sm); margin-bottom: 14px; font-size: 0.88rem;">
        <div><strong>Claimant:</strong> ${escapeHtml(claim.claimant_name)} <span class="badge badge-published" style="font-size: 0.7rem; padding: 2px 6px;">${claim.claimant_role}</span></div>
        <div><strong>ID:</strong> ${escapeHtml(claim.claimant_institutional_id)}</div>
        <div><strong>Email:</strong> ${escapeHtml(claim.claimant_email)}</div>
        <div><strong>Phone:</strong> ${escapeHtml(claim.claimant_phone)}</div>
        <div><strong>Department:</strong> ${escapeHtml(claim.claimant_department)}</div>
      </div>

      <!-- Claim Content -->
      <div style="background: var(--bg-card-subtle); border: 1px solid var(--border-color); padding: 14px 18px; border-radius: var(--radius-sm); font-size: 0.9rem;">
        <div style="margin-bottom: 8px;">
          <strong style="color: var(--primary);">Claim Reason:</strong>
          <div style="color: var(--text-main); margin-top: 4px; white-space: pre-wrap;">${escapeHtml(claim.reason)}</div>
        </div>
        <div>
          <strong style="color: var(--primary);">Ownership Proof / Identifying Evidence:</strong>
          <div style="color: var(--text-main); margin-top: 4px; white-space: pre-wrap;">${escapeHtml(claim.ownership_evidence)}</div>
        </div>
        ${evidencePhotoHtml}
      </div>

      ${verificationNotesHtml}

      <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-dim); margin-top: 12px;">
        <span>Claim ID: #${claim.claim_id} (Item #${claim.item_id})</span>
        <span>Submitted: ${new Date(claim.submitted_at).toLocaleString()}</span>
      </div>
    `;

    container.appendChild(card);
  });
}

async function promptApproveClaim(claimId) {
  const notes = prompt('Enter administrative verification notes (optional):', 'Ownership evidence verified and approved for return handover.');
  if (notes === null) return;

  try {
    const res = await fetch(`/api/admin/claims/${claimId}/approve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verification_notes: notes })
    });

    const data = await res.json();
    if (data.success) {
      alert('✓ ' + data.message);
      closeAdminModal();
      loadAdminClaims();
      loadAdminStats();
    } else {
      alert('⚠️ ' + (data.message || 'Failed to approve claim.'));
    }
  } catch (err) {
    alert('Server error while approving claim.');
  }
}

async function promptRejectClaim(claimId) {
  const notes = prompt('Enter reason for rejection:', 'Insufficient or non-matching ownership evidence provided.');
  if (notes === null) return;

  try {
    const res = await fetch(`/api/admin/claims/${claimId}/reject`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verification_notes: notes })
    });

    const data = await res.json();
    if (data.success) {
      alert('✓ ' + data.message);
      closeAdminModal();
      loadAdminClaims();
      loadAdminStats();
    } else {
      alert('⚠️ ' + (data.message || 'Failed to reject claim.'));
    }
  } catch (err) {
    alert('Server error while rejecting claim.');
  }
}

async function confirmItemReturn(itemId) {
  if (!confirm('Confirm that this item has been physically returned / handed over to the claimant? This will mark the item as Returned and complete the workflow.')) {
    return;
  }

  try {
    const res = await fetch(`/api/admin/items/${itemId}/return`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await res.json();
    if (data.success) {
      alert('✓ ' + data.message);
      closeAdminModal();
      loadAdminClaims();
      loadAdminStats();
    } else {
      alert('⚠️ ' + (data.message || 'Failed to mark item returned.'));
    }
  } catch (err) {
    alert('Server error confirming item return.');
  }
}

function openAdminClaimDetail(claimId) {
  const claim = adminClaimsCache.find(c => c.claim_id === claimId);
  if (!claim) return;

  const modal = document.getElementById('adminClaimModal');
  const body = document.getElementById('adminClaimModalBody');
  if (!modal || !body) return;

  let evidencePhotoHtml = '';
  if (claim.evidence_file_path) {
    evidencePhotoHtml = `
      <div style="margin: 14px 0; text-align: center;">
        <img src="${claim.evidence_file_path}" style="max-width: 100%; max-height: 250px; border-radius: var(--radius-sm); border: 1px solid var(--bg-card-border);" alt="Evidence">
        <div style="margin-top: 6px;">
          <a href="${claim.evidence_file_path}" target="_blank" class="btn btn-secondary btn-sm">Open Full Image</a>
        </div>
      </div>
    `;
  }

  body.innerHTML = `
    <h3 style="margin-bottom: 8px;">Claim Verification Review</h3>
    <div style="display: flex; gap: 8px; margin-bottom: 16px;">
      <span class="badge ${claim.claim_status === 'Approved' ? 'badge-approved' : claim.claim_status === 'Rejected' ? 'badge-rejected' : 'badge-pending'}">${claim.claim_status}</span>
      <span class="badge ${claim.post_type === 'LOST' ? 'badge-lost' : 'badge-found'}">${claim.post_type}</span>
      <span class="badge badge-published">${escapeHtml(claim.category_name)}</span>
    </div>

    <!-- Item Details -->
    <div style="background: rgba(0,0,0,0.2); padding: 14px; border-radius: var(--radius-sm); margin-bottom: 14px;">
      <h4 style="color: var(--text-main); margin-bottom: 6px;">Item: ${escapeHtml(claim.item_title)}</h4>
      <div style="font-size: 0.88rem; color: var(--text-muted);">
        📍 Location: ${escapeHtml(claim.item_location)} &bull; Date: ${formatDate(claim.item_date)}<br>
        Reporter: ${escapeHtml(claim.poster_name)} (${escapeHtml(claim.poster_email)})
      </div>
    </div>

    <!-- Claimant Details -->
    <div style="background: rgba(0,0,0,0.2); padding: 14px; border-radius: var(--radius-sm); margin-bottom: 14px; font-size: 0.88rem;">
      <h4 style="color: var(--text-main); margin-bottom: 6px;">Claimant Details</h4>
      <div><strong>Name:</strong> ${escapeHtml(claim.claimant_name)} (${escapeHtml(claim.claimant_role)})</div>
      <div><strong>Institutional ID:</strong> ${escapeHtml(claim.claimant_institutional_id)}</div>
      <div><strong>Email:</strong> ${escapeHtml(claim.claimant_email)}</div>
      <div><strong>Phone:</strong> ${escapeHtml(claim.claimant_phone)}</div>
      <div><strong>Department:</strong> ${escapeHtml(claim.claimant_department)}</div>
    </div>

    <!-- Submitted Evidence -->
    <div style="background: rgba(0,0,0,0.2); padding: 14px; border-radius: var(--radius-sm); margin-bottom: 16px; font-size: 0.9rem;">
      <div style="margin-bottom: 10px;">
        <strong style="color: #93c5fd;">Claim Reason:</strong>
        <p style="margin-top: 4px; color: var(--text-main);">${escapeHtml(claim.reason)}</p>
      </div>
      <div>
        <strong style="color: #93c5fd;">Ownership Proof:</strong>
        <p style="margin-top: 4px; color: var(--text-main);">${escapeHtml(claim.ownership_evidence)}</p>
      </div>
      ${evidencePhotoHtml}
    </div>

    <!-- Admin Decision Controls -->
    <div style="margin-top: 20px; border-top: 1px solid var(--bg-card-border); padding-top: 16px;">
      <label for="adminDecisionNotes" style="display: block; font-weight: 500; margin-bottom: 6px;">
        Administrative Verification Notes:
      </label>
      <textarea id="adminDecisionNotes" class="form-control" rows="3" placeholder="Enter reason, verification details, or handover instructions...">${escapeHtml(claim.verification_notes || '')}</textarea>

      <div style="display: flex; gap: 10px; margin-top: 16px; flex-wrap: wrap;">
        ${claim.claim_status === 'Pending' ? `
          <button class="btn btn-primary" style="flex: 1; background: #10b981; border-color: #10b981;" onclick="executeModalApprove(${claim.claim_id})">
            ✓ Approve Claim
          </button>
          <button class="btn btn-danger" style="flex: 1;" onclick="executeModalReject(${claim.claim_id})">
            ✕ Reject Claim
          </button>
        ` : ''}

        ${claim.claim_status === 'Approved' && claim.item_status !== 'Returned' ? `
          <button class="btn btn-primary" style="flex: 1; background: #8b5cf6; border-color: #8b5cf6;" onclick="executeModalReturn(${claim.item_id})">
            📦 Confirm Item Handover / Returned
          </button>
        ` : ''}

        <button class="btn btn-secondary" onclick="closeAdminModal()">
          Close
        </button>
      </div>
    </div>
  `;

  modal.classList.add('active');
}

async function executeModalApprove(claimId) {
  const notesInput = document.getElementById('adminDecisionNotes');
  const notes = notesInput ? notesInput.value.trim() : '';

  try {
    const res = await fetch(`/api/admin/claims/${claimId}/approve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verification_notes: notes })
    });
    const data = await res.json();
    if (data.success) {
      alert('✓ ' + data.message);
      closeAdminModal();
      loadAdminClaims();
      loadAdminStats();
    } else {
      alert('⚠️ ' + (data.message || 'Failed to approve claim.'));
    }
  } catch (err) {
    alert('Server error while approving claim.');
  }
}

async function executeModalReject(claimId) {
  const notesInput = document.getElementById('adminDecisionNotes');
  const notes = notesInput ? notesInput.value.trim() : '';

  try {
    const res = await fetch(`/api/admin/claims/${claimId}/reject`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verification_notes: notes })
    });
    const data = await res.json();
    if (data.success) {
      alert('✓ ' + data.message);
      closeAdminModal();
      loadAdminClaims();
      loadAdminStats();
    } else {
      alert('⚠️ ' + (data.message || 'Failed to reject claim.'));
    }
  } catch (err) {
    alert('Server error while rejecting claim.');
  }
}

async function executeModalReturn(itemId) {
  if (!confirm('Confirm physical return / handover for this item?')) return;
  await confirmItemReturn(itemId);
}

// ---------------------------------------------------------
// 3. REPORTED USERS SECTION (SIMPLIFIED MODERATION)
// ---------------------------------------------------------
function initAdminReports() {
  const filter = document.getElementById('adminReportStatusFilter');
  if (filter) filter.addEventListener('change', loadMisuseReports);

  const refreshBtn = document.getElementById('refreshReportsBtn');
  if (refreshBtn) refreshBtn.addEventListener('click', loadMisuseReports);
}

async function loadMisuseReports() {
  const container = document.getElementById('misuseReportsContainer');
  if (!container) return;

  const filter = document.getElementById('adminReportStatusFilter');
  const status = filter ? filter.value : 'Pending';

  container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 40px;">Loading reported users...</div>';

  try {
    const url = `/api/admin/reports${status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : ''}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.success) {
      renderMisuseReports(data.reports || [], container);
    } else {
      container.innerHTML = `<div class="alert alert-danger">${data.message || 'Failed to load reports.'}</div>`;
    }
  } catch (err) {
    container.innerHTML = '<div class="alert alert-danger">Network error loading reports.</div>';
  }
}

function renderMisuseReports(reports, container) {
  if (!reports || reports.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 50px 20px;">
        <div style="font-size: 2.5rem; margin-bottom: 12px;">✅</div>
        <h4>No Reports in Current View</h4>
        <p style="font-size: 0.9rem; color: var(--text-dim); margin-top: 6px;">
          All reported users have been reviewed, or no reports match the selected filter.
        </p>
      </div>
    `;
    return;
  }

  // Group reports by reported_user_id
  const userGroups = new Map();
  reports.forEach(r => {
    if (!userGroups.has(r.reported_user_id)) {
      userGroups.set(r.reported_user_id, {
        userId: r.reported_user_id,
        name: r.reported_name,
        institutionalId: r.reported_institutional_id || 'N/A',
        role: r.reported_role,
        department: r.reported_department || 'N/A',
        email: r.reported_email,
        accountStatus: r.reported_account_status,
        totalReports: r.total_reports_received || 0,
        reports: []
      });
    }
    userGroups.get(r.reported_user_id).reports.push(r);
  });

  container.innerHTML = '';
  userGroups.forEach(group => {
    const isBlocked = (group.accountStatus === 'Blocked');
    const card = document.createElement('div');
    card.style.cssText = `
      background: #FFFFFF;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 22px;
      margin-bottom: 20px;
      box-shadow: var(--shadow-xs);
    `;

    let reportsListHtml = '';
    group.reports.forEach(r => {
      let statusBadge = 'badge-pending';
      if (r.status === 'Resolved') statusBadge = 'badge-approved';
      else if (r.status === 'Dismissed') statusBadge = 'badge-rejected';

      reportsListHtml += `
        <div style="background: var(--bg-card-subtle); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 14px; margin-top: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px;">
            <div>
              <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 4px; flex-wrap: wrap;">
                <span class="badge ${statusBadge}">${r.status}</span>
                <span class="badge badge-rejected">${escapeHtml(r.reason)}</span>
                ${r.related_item_title ? `<span style="font-size: 0.8rem; color: var(--text-muted);">Item: "${escapeHtml(r.related_item_title)}"</span>` : ''}
              </div>
              <div style="font-size: 0.88rem; color: var(--text-main);">
                <strong>Reported By:</strong> ${escapeHtml(r.reporter_name)} (ID: ${escapeHtml(r.reporter_institutional_id || 'N/A')}) &bull; <span style="color: var(--text-muted); font-size: 0.82rem;">${new Date(r.created_at).toLocaleString()}</span>
              </div>
            </div>
            <div>
              ${r.status === 'Pending' ? `
                <button class="btn btn-secondary btn-sm" onclick="adminDismissReport(${r.report_id}, '${escapeHtml(group.name)}')">
                  ✕ Dismiss Report
                </button>
              ` : `
                <span style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">${r.status}</span>
              `}
            </div>
          </div>

          <div style="margin-top: 8px; font-size: 0.88rem; color: var(--text-main); background: #FFFFFF; border: 1px solid var(--border-color); padding: 8px 12px; border-radius: 4px;">
            <strong style="color: var(--primary);">Explanation:</strong> ${escapeHtml(r.description || 'No explanation provided.')}
          </div>

          ${r.admin_action ? `
            <div style="margin-top: 6px; font-size: 0.84rem; color: var(--secondary);">
              <strong>Admin Note:</strong> ${escapeHtml(r.admin_action)}
            </div>
          ` : ''}
        </div>
      `;
    });

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px;">
        <div>
          <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 4px; flex-wrap: wrap;">
            <span class="badge ${isBlocked ? 'badge-blocked' : 'badge-approved'}">${group.accountStatus}</span>
            <span class="badge ${group.role === 'Student' ? 'badge-published' : group.role === 'Faculty' ? 'badge-valuable' : 'badge-secondary'}">${group.role}</span>
            <span class="badge badge-rejected">${group.totalReports} total reports</span>
          </div>
          <h3 style="font-size: 1.25rem; color: var(--primary); margin-bottom: 4px;">
            ${escapeHtml(group.name)} <span style="font-size: 0.9rem; font-weight: 400; color: var(--text-muted);">(ID: ${escapeHtml(group.institutionalId)})</span>
          </h3>
          <div style="font-size: 0.85rem; color: var(--text-muted);">
            Email: ${escapeHtml(group.email)} &bull; Dept: ${escapeHtml(group.department)}
          </div>
        </div>

        <div style="display: flex; gap: 10px; align-items: center;">
          ${!isBlocked ? `
            <button class="btn btn-danger btn-sm" onclick="adminBlockReportedUser(${group.userId}, '${escapeHtml(group.name)}')" style="padding: 8px 16px; font-weight: 600;">
              🚫 Block User
            </button>
          ` : `
            <span class="badge badge-blocked" style="font-size: 0.88rem; padding: 6px 12px;">Account Blocked</span>
          `}
        </div>
      </div>

      <div style="margin-top: 14px;">
        <h5 style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 4px;">Submitted Reports (${group.reports.length}):</h5>
        ${reportsListHtml}
      </div>
    `;

    container.appendChild(card);
  });
}

async function adminBlockReportedUser(userId, userName) {
  if (!confirm(`Are you sure you want to block user "${userName}"? This will restrict them from logging in and accessing portal features.`)) {
    return;
  }

  const reason = prompt(`Enter optional reason for blocking user "${userName}":`, 'Policy violations reported by users.');
  if (reason === null) return;

  try {
    const res = await fetch(`/api/admin/users/${userId}/block`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason.trim() || 'Policy violations reported by users.' })
    });

    const data = await res.json();
    if (data.success) {
      alert('✓ ' + data.message);
      loadMisuseReports();
      loadAdminStats();
    } else {
      alert('⚠️ ' + (data.message || 'Failed to block user.'));
    }
  } catch (err) {
    alert('Server error blocking user.');
  }
}

async function adminDismissReport(reportId, userName) {
  if (!confirm(`Are you sure you want to dismiss this report against "${userName}"? The user will not be blocked, and the report will be kept in history.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/admin/reports/${reportId}/dismiss`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await res.json();
    if (data.success) {
      alert('✓ ' + data.message);
      loadMisuseReports();
      loadAdminStats();
    } else {
      alert('⚠️ ' + (data.message || 'Failed to dismiss report.'));
    }
  } catch (err) {
    alert('Server error dismissing report.');
  }
}

// ---------------------------------------------------------
// 4. BLOCKED USERS SECTION (SIMPLIFIED UNBLOCKING)
// ---------------------------------------------------------
function initAdminUsers() {
  const searchInput = document.getElementById('blockedUserSearchInput');
  const refreshBlockedBtn = document.getElementById('refreshBlockedUsersBtn');
  const viewBlockedBtn = document.getElementById('viewBlockedHistoryBtn');

  if (searchInput) searchInput.addEventListener('input', debounce(loadBlockedUsers, 300));
  if (refreshBlockedBtn) refreshBlockedBtn.addEventListener('click', loadBlockedUsers);
  if (viewBlockedBtn) viewBlockedBtn.addEventListener('click', loadBlockedHistory);
}

async function loadBlockedUsers() {
  const container = document.getElementById('blockedUsersContainer');
  if (!container) return;

  const q = (document.getElementById('blockedUserSearchInput')?.value || '').toLowerCase().trim();

  container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 40px;">Loading blocked accounts...</div>';

  try {
    const res = await fetch('/api/admin/blocked-users');
    const data = await res.json();

    if (data.success) {
      let users = data.currentlyBlocked || [];
      if (q) {
        users = users.filter(u =>
          (u.user_name && u.user_name.toLowerCase().includes(q)) ||
          (u.institutional_id && u.institutional_id.toLowerCase().includes(q)) ||
          (u.user_email && u.user_email.toLowerCase().includes(q))
        );
      }
      renderBlockedUsersTable(users, container);
    } else {
      container.innerHTML = `<div class="alert alert-danger">${data.message || 'Failed to load blocked accounts.'}</div>`;
    }
  } catch (err) {
    container.innerHTML = '<div class="alert alert-danger">Network error loading blocked accounts.</div>';
  }
}

function renderBlockedUsersTable(users, container) {
  if (!users || users.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 45px 20px;">
        <div style="font-size: 2.2rem; margin-bottom: 10px;">✅</div>
        <h4>No Currently Blocked Users</h4>
        <p style="font-size: 0.88rem; color: var(--text-dim); margin-top: 6px;">
          All student, faculty, and staff accounts are currently in Active standing.
        </p>
      </div>
    `;
    return;
  }

  let rowsHtml = '';
  users.forEach(u => {
    rowsHtml += `
      <tr>
        <td><strong>${escapeHtml(u.user_name)}</strong></td>
        <td><span class="badge ${u.user_role === 'Student' ? 'badge-published' : u.user_role === 'Faculty' ? 'badge-valuable' : 'badge-secondary'}">${u.user_role}</span></td>
        <td>${escapeHtml(u.institutional_id || 'N/A')}</td>
        <td>${escapeHtml(u.user_email)}</td>
        <td><span class="badge badge-blocked">Blocked</span></td>
        <td style="max-width: 250px; font-size: 0.88rem; color: #fca5a5;">${escapeHtml(u.reason)}</td>
        <td style="font-size: 0.85rem; color: var(--text-muted);">${new Date(u.blocked_at).toLocaleString()}</td>
        <td style="font-size: 0.85rem;">${escapeHtml(u.blocked_by_name)}</td>
        <td>
          <button class="btn btn-primary btn-sm" onclick="unblockUser(${u.user_id}, '${escapeHtml(u.user_name)}')" style="background: #10b981; border-color: #10b981;">
            ✓ Unblock User
          </button>
        </td>
      </tr>
    `;
  });

  container.innerHTML = `
    <div class="data-table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>User Name</th>
            <th>Role</th>
            <th>Inst. ID</th>
            <th>Email</th>
            <th>Status</th>
            <th>Blocking Reason</th>
            <th>Date Blocked</th>
            <th>Blocked By</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;
}

async function unblockUser(userId, userName) {
  if (!confirm(`Are you sure you want to unblock user "${userName}" and restore their account access?`)) return;

  try {
    const res = await fetch(`/api/admin/users/${userId}/unblock`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await res.json();
    if (data.success) {
      alert('✓ ' + data.message);
      loadBlockedUsers();
      loadAdminStats();
    } else {
      alert('⚠️ ' + (data.message || 'Failed to unblock user.'));
    }
  } catch (err) {
    alert('Server error unblocking user.');
  }
}

async function loadBlockedHistory() {
  const modal = document.getElementById('blockedHistoryModal');
  const body = document.getElementById('blockedHistoryBody');
  if (!modal || !body) return;

  body.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 30px;">Loading blocked history...</div>';
  modal.classList.add('active');

  try {
    const res = await fetch('/api/admin/blocked-users');
    const data = await res.json();

    if (data.success) {
      const records = data.blockedUsers || [];
      if (records.length === 0) {
        body.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 30px;">No user blocking records logged.</div>';
        return;
      }

      let rows = '';
      records.forEach(r => {
        rows += `
          <tr>
            <td><strong>${escapeHtml(r.user_name)}</strong> (${escapeHtml(r.user_role)})</td>
            <td>${escapeHtml(r.institutional_id)}</td>
            <td><span class="badge ${r.status === 'Active' ? 'badge-blocked' : 'badge-approved'}">${r.status}</span></td>
            <td>${escapeHtml(r.reason)}</td>
            <td>${escapeHtml(r.blocked_by_name)}</td>
            <td>${new Date(r.blocked_at).toLocaleString()}</td>
            <td>${r.unblocked_at ? new Date(r.unblocked_at).toLocaleString() : '-'}</td>
          </tr>
        `;
      });

      body.innerHTML = `
        <div class="data-table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Inst. ID</th>
                <th>Block Status</th>
                <th>Reason</th>
                <th>Blocked By</th>
                <th>Blocked At</th>
                <th>Unblocked At</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      `;
    }
  } catch (err) {
    body.innerHTML = '<div class="alert alert-danger">Error loading block history.</div>';
  }
}

function closeBlockedHistoryModal() {
  const modal = document.getElementById('blockedHistoryModal');
  if (modal) modal.classList.remove('active');
}

// ---------------------------------------------------------
// 5. ARCHIVED ITEMS (INCREMENT 4)
// ---------------------------------------------------------
function initAdminArchive() {
  const refreshBtn = document.getElementById('refreshArchivedBtn');
  const runBtn = document.getElementById('runArchiveBatchBtn');

  if (refreshBtn) refreshBtn.addEventListener('click', loadArchivedItems);
  if (runBtn) runBtn.addEventListener('click', triggerManualArchive);
}

async function loadArchivedItems() {
  const container = document.getElementById('archivedItemsContainer');
  if (!container) return;

  container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 40px;">Loading archived records...</div>';

  try {
    const res = await fetch('/api/admin/archived-items');
    const data = await res.json();

    if (data.success) {
      renderArchivedTable(data.items || [], container);
    } else {
      container.innerHTML = `<div class="alert alert-danger">${data.message || 'Failed to load archived items.'}</div>`;
    }
  } catch (err) {
    container.innerHTML = '<div class="alert alert-danger">Network error loading archived records.</div>';
  }
}

function renderArchivedTable(items, container) {
  if (!items || items.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 50px 20px;">
        <div style="font-size: 2.5rem; margin-bottom: 12px;">🗄️</div>
        <h4>No Archived Items</h4>
        <p style="font-size: 0.9rem; color: var(--text-dim); margin-top: 6px;">
          Completed returns and unresolved items older than 60 days will be archived here.
        </p>
      </div>
    `;
    return;
  }

  let rows = '';
  items.forEach(i => {
    rows += `
      <tr>
        <td><strong>${escapeHtml(i.title)}</strong></td>
        <td><span class="badge ${i.post_type === 'LOST' ? 'badge-lost' : 'badge-found'}">${i.post_type}</span></td>
        <td>${escapeHtml(i.category_name)}</td>
        <td>${escapeHtml(i.location)}</td>
        <td>${escapeHtml(i.owner_name)} (${escapeHtml(i.owner_department)})</td>
        <td>${formatDate(i.item_date)}</td>
        <td><span class="badge badge-archived">Archived</span></td>
        <td>${new Date(i.updated_at).toLocaleDateString()}</td>
      </tr>
    `;
  });

  container.innerHTML = `
    <div class="data-table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Item Title</th>
            <th>Type</th>
            <th>Category</th>
            <th>Location</th>
            <th>Poster</th>
            <th>Post Date</th>
            <th>Status</th>
            <th>Archived On</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

async function triggerManualArchive() {
  if (!confirm('Run automatic archiving batch now? Inactive and returned posts older than 60 days will be archived.')) return;

  try {
    const res = await fetch('/api/admin/archive-run', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      alert(`✓ ${data.message}`);
      loadArchivedItems();
      loadAdminStats();
    } else {
      alert('⚠️ ' + (data.message || 'Archiving run failed.'));
    }
  } catch (err) {
    alert('Server error executing archiving batch.');
  }
}

// ---------------------------------------------------------
// 6. AUDIT TRAIL LOGS (INCREMENT 4)
// ---------------------------------------------------------
function initAdminAudit() {
  const filter = document.getElementById('auditActionFilter');
  const refreshBtn = document.getElementById('refreshAuditBtn');

  if (filter) filter.addEventListener('change', loadAuditLogs);
  if (refreshBtn) refreshBtn.addEventListener('click', loadAuditLogs);
}

async function loadAuditLogs() {
  const container = document.getElementById('auditLogsContainer');
  if (!container) return;

  const filter = document.getElementById('auditActionFilter');
  const action = filter ? filter.value : 'all';

  container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 40px;">Loading audit logs...</div>';

  try {
    const url = `/api/admin/activity${action && action !== 'all' ? `?action=${encodeURIComponent(action)}` : ''}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.success) {
      renderAuditLogsTable(data.logs || [], container);
    } else {
      container.innerHTML = `<div class="alert alert-danger">${data.message || 'Failed to load audit logs.'}</div>`;
    }
  } catch (err) {
    container.innerHTML = '<div class="alert alert-danger">Network error loading audit logs.</div>';
  }
}

function renderAuditLogsTable(logs, container) {
  if (!logs || logs.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 50px 20px;">
        <div style="font-size: 2.5rem; margin-bottom: 12px;">📜</div>
        <h4>No Audit Logs Found</h4>
        <p style="font-size: 0.9rem; color: var(--text-dim); margin-top: 6px;">
          Administrative actions will be recorded here automatically.
        </p>
      </div>
    `;
    return;
  }

  let rows = '';
  logs.forEach(l => {
    let actionBadgeColor = 'badge-published';
    if (l.action.includes('REJECT') || l.action.includes('BLOCK') || l.action.includes('REMOVE')) {
      actionBadgeColor = 'badge-rejected';
    } else if (l.action.includes('APPROVE') || l.action.includes('UNBLOCK')) {
      actionBadgeColor = 'badge-approved';
    }

    rows += `
      <tr>
        <td>${new Date(l.created_at).toLocaleString()}</td>
        <td><strong>${escapeHtml(l.admin_name)}</strong></td>
        <td><span class="badge ${actionBadgeColor}">${escapeHtml(l.action)}</span></td>
        <td>${escapeHtml(l.entity_type)} ${l.entity_id ? `(#${l.entity_id})` : ''}</td>
        <td>${escapeHtml(l.details || '-')}</td>
      </tr>
    `;
  });

  container.innerHTML = `
    <div class="data-table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Administrator</th>
            <th>Action</th>
            <th>Target Entity</th>
            <th>Details & Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

// ---------------------------------------------------------
// UTILITY FUNCTIONS
// ---------------------------------------------------------
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}
