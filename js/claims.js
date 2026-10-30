/* =========================================================
   Claims Management JavaScript (js/claims.js)
   Increment 2: Claim Management & Item Return Workflow
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  initClaimsModule();
});

function initClaimsModule() {
  const refreshBtn = document.getElementById('refreshMyClaimsBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadMyClaims);
  }

  // Load claims when "My Claims" tab is clicked
  const myClaimsTabBtn = document.querySelector('.tab-btn[data-tab="myClaimsTab"]');
  if (myClaimsTabBtn) {
    myClaimsTabBtn.addEventListener('click', () => {
      loadMyClaims();
    });
  }
}

// Toggle claim form visibility inside item details modal
function toggleClaimForm() {
  const formContainer = document.getElementById('claimFormContainer');
  const showBtn = document.getElementById('showClaimFormBtn');
  if (!formContainer) return;

  if (formContainer.style.display === 'none' || formContainer.style.display === '') {
    formContainer.style.display = 'block';
    if (showBtn) showBtn.style.display = 'none';
    const reasonInput = document.getElementById('claimReason');
    if (reasonInput) reasonInput.focus();
  } else {
    formContainer.style.display = 'none';
    if (showBtn) showBtn.style.display = 'block';
  }
}

// Handle Claim Form Submission
async function handleClaimSubmit(e, itemId) {
  e.preventDefault();

  const reason = document.getElementById('claimReason').value.trim();
  const evidence = document.getElementById('claimEvidence').value.trim();
  const fileInput = document.getElementById('claimEvidenceImage');
  const submitBtn = document.getElementById('submitClaimBtn');
  const alertContainer = document.getElementById('claimAlertContainer');

  if (!reason || !evidence) {
    showClaimAlert('Please provide both the claim reason and ownership evidence.', 'danger');
    return;
  }

  const formData = new FormData();
  formData.append('reason', reason);
  formData.append('ownership_evidence', evidence);
  if (fileInput && fileInput.files[0]) {
    formData.append('evidence_image', fileInput.files[0]);
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting Claim...';

  try {
    const res = await fetch(`/api/items/${itemId}/claim`, {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    if (data.success) {
      showClaimAlert('✓ ' + data.message, 'success');
      submitBtn.textContent = 'Submitted!';
      setTimeout(() => {
        closeModal();
        // Switch to My Claims tab if available
        if (typeof switchTab === 'function') {
          switchTab('myClaimsTab');
        }
        loadMyClaims();
      }, 1500);
    } else {
      showClaimAlert(data.message || 'Failed to submit claim.', 'danger');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Claim';
    }
  } catch (err) {
    showClaimAlert('Network error submitting claim. Please try again.', 'danger');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Claim';
  }
}

function showClaimAlert(message, type = 'danger') {
  const container = document.getElementById('claimAlertContainer');
  if (!container) return;
  container.innerHTML = `
    <div class="alert alert-${type}" style="margin-bottom: 14px;">
      <span>${type === 'danger' ? '⚠️' : '✅'}</span>
      <div>${escapeHtml(message)}</div>
    </div>
  `;
}

// Load Current User's Claims
async function loadMyClaims() {
  const container = document.getElementById('myClaimsContainer');
  if (!container) return;

  container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 40px;">Loading your claims...</div>';

  try {
    const res = await fetch('/api/claims/my');
    const data = await res.json();

    if (data.success && data.claims && data.claims.length > 0) {
      container.innerHTML = '';

      data.claims.forEach(claim => {
        const card = document.createElement('div');
        card.style.cssText = `
          background: #FFFFFF;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 20px;
          margin-bottom: 18px;
          box-shadow: var(--shadow-xs);
        `;

        let statusBadgeClass = 'badge-pending';
        if (claim.claim_status === 'Approved') statusBadgeClass = 'badge-approved';
        else if (claim.claim_status === 'Rejected') statusBadgeClass = 'badge-rejected';
        else if (claim.claim_status === 'Cancelled') statusBadgeClass = 'badge-cancelled';

        const itemTypeBadge = claim.post_type === 'LOST' ? 'badge-lost' : 'badge-found';

        let evidencePhotoHtml = '';
        if (claim.evidence_file_path) {
          evidencePhotoHtml = `
            <div style="margin-top: 10px;">
              <strong>Attached Photo/Proof:</strong>
              <div style="margin-top: 6px;">
                <a href="${claim.evidence_file_path}" target="_blank" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
                  📷 View Uploaded Evidence
                </a>
              </div>
            </div>
          `;
        }

        let verificationNotesHtml = '';
        if (claim.verification_notes) {
          verificationNotesHtml = `
            <div style="margin-top: 12px; background: #FFFFFF; border: 1px solid var(--border-color); padding: 10px 14px; border-radius: var(--radius-sm); border-left: 3px solid ${claim.claim_status === 'Approved' ? '#10b981' : '#f87171'}; font-size: 0.88rem;">
              <strong>Admin Verification Remarks:</strong> ${escapeHtml(claim.verification_notes)}
            </div>
          `;
        }

        let actionsHtml = '';
        if (claim.claim_status === 'Pending') {
          actionsHtml = `
            <button class="btn btn-danger-outline btn-sm" onclick="cancelClaim(${claim.claim_id})">
              ✕ Cancel Claim
            </button>
          `;
        } else if (claim.claim_status === 'Approved') {
          actionsHtml = `
            <span class="badge badge-approved" style="padding: 5px 10px;">
              ✓ Handover Approved
            </span>
          `;
        }

        card.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">
                <span class="badge ${itemTypeBadge}">${claim.post_type}</span>
                <span class="badge ${statusBadgeClass}">Claim: ${claim.claim_status}</span>
                <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 500;">${escapeHtml(claim.category_name)}</span>
              </div>
              <h4 style="font-size: 1.15rem; color: var(--primary); margin-bottom: 4px;">
                ${escapeHtml(claim.item_title)}
              </h4>
              <div style="font-size: 0.85rem; color: var(--text-muted);">
                📍 ${escapeHtml(claim.item_location)} &bull; 📅 Post Date: ${formatDate(claim.item_date)} &bull; Posted by: ${escapeHtml(claim.poster_name)} (${escapeHtml(claim.poster_department)})
              </div>
            </div>
            <div>
              ${actionsHtml}
            </div>
          </div>

          <div style="background: var(--bg-card-subtle); border: 1px solid var(--border-color); padding: 14px 16px; border-radius: var(--radius-sm); margin-bottom: 10px; font-size: 0.9rem;">
            <div style="margin-bottom: 6px;">
              <strong style="color: var(--primary);">My Reason for Claim:</strong>
              <span style="color: var(--text-main);">${escapeHtml(claim.reason)}</span>
            </div>
            <div>
              <strong style="color: var(--primary);">Ownership Evidence Provided:</strong>
              <span style="color: var(--text-main);">${escapeHtml(claim.ownership_evidence)}</span>
            </div>
            ${evidencePhotoHtml}
          </div>

          ${verificationNotesHtml}

          <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-dim); margin-top: 10px; border-top: 1px solid var(--border-color); padding-top: 8px;">
            <span>Claim ID: #${claim.claim_id}</span>
            <span>Submitted: ${new Date(claim.submitted_at).toLocaleString()}</span>
          </div>
        `;

        container.appendChild(card);
      });
    } else {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📝</div>
          <div class="empty-state-title">No Claims Submitted Yet</div>
          <p class="empty-state-desc">
            When you find an item in Browse Items that belongs to you, click "View & Claim" to submit your ownership proof.
          </p>
          <button class="btn btn-primary btn-sm" onclick="switchTab('searchTab')">
            Browse Campus Items &rarr;
          </button>
        </div>
      `;
    }
  } catch (err) {
    container.innerHTML = '<div class="alert alert-danger">Error retrieving claims list. Please try again.</div>';
  }
}

// Cancel a Pending Claim
async function cancelClaim(claimId) {
  if (!confirm('Are you sure you want to cancel this pending claim?')) {
    return;
  }

  try {
    const res = await fetch(`/api/claims/${claimId}/cancel`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await res.json();

    if (data.success) {
      alert(data.message || 'Claim cancelled successfully.');
      loadMyClaims();
    } else {
      alert(data.message || 'Failed to cancel claim.');
    }
  } catch (err) {
    alert('Server error while cancelling claim.');
  }
}

// Helpers
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
