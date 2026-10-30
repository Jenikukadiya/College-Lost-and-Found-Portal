/* =========================================================
   Item Management, Search & Smart Matching JavaScript (js/items.js)
   Increments 1, 2, 3, and 4
   ========================================================= */

let categoriesList = [];

document.addEventListener('DOMContentLoaded', () => {
  initItemsPage();
});

function initItemsPage() {
  // Tab switching setup
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  // Modal close handlers
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const itemModal = document.getElementById('itemModal');
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeModal);
  }
  if (itemModal) {
    itemModal.addEventListener('click', (e) => {
      if (e.target === itemModal) closeModal();
    });
  }

  // Load Categories
  loadCategories();

  // Search Button handler
  const searchBtn = document.getElementById('searchBtn');
  if (searchBtn) {
    searchBtn.addEventListener('click', searchItems);
  }

  // Clear Filters Button handler
  const clearFiltersBtn = document.getElementById('clearFiltersBtn');
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      const keyword = document.getElementById('searchKeyword');
      const type = document.getElementById('searchType');
      const cat = document.getElementById('searchCategory');
      const loc = document.getElementById('searchLocation');
      const dFrom = document.getElementById('searchDateFrom');
      const dTo = document.getElementById('searchDateTo');
      if (keyword) keyword.value = '';
      if (type) type.value = 'ALL';
      if (cat) cat.value = 'all';
      if (loc) loc.value = '';
      if (dFrom) dFrom.value = '';
      if (dTo) dTo.value = '';
      searchItems();
    });
  }

  // Matches refresh button
  const refreshMatchesBtn = document.getElementById('refreshMatchesBtn');
  if (refreshMatchesBtn) {
    refreshMatchesBtn.addEventListener('click', loadSmartMatches);
  }

  // Post Lost Form handler
  const postLostForm = document.getElementById('postLostForm');
  if (postLostForm) {
    postLostForm.addEventListener('submit', (e) => handlePostItem(e, 'postLostForm'));
  }

  // Post Found Form handler
  const postFoundForm = document.getElementById('postFoundForm');
  if (postFoundForm) {
    postFoundForm.addEventListener('submit', (e) => handlePostItem(e, 'postFoundForm'));
  }

  // Setup Image Upload Live Previews
  setupImagePreview('lostImage', 'lostImagePreviewContainer', 'lostImagePreview', 'lostImageFileName');
  setupImagePreview('foundImage', 'foundImagePreviewContainer', 'foundImagePreview', 'foundImageFileName');

  // Duplicate warning handlers on title blur (FR-39)
  setupDuplicateWarning('lostTitle', 'lostCategory', 'LOST', 'lostDuplicateWarning');
  setupDuplicateWarning('foundTitle', 'foundCategory', 'FOUND', 'foundDuplicateWarning');

  // Handle URL requested tab or default to dashboard
  const urlParams = new URLSearchParams(window.location.search);
  const requestedTab = urlParams.get('tab');
  if (requestedTab && document.getElementById(requestedTab)) {
    switchTab(requestedTab);
  } else if (document.getElementById('dashboardTab')) {
    switchTab('dashboardTab');
  } else if (document.getElementById('itemGrid')) {
    searchItems();
  }
}

// Tab Switching Helper
function switchTab(tabId) {
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

  if (tabId === 'dashboardTab') {
    loadDashboardOverview();
  } else if (tabId === 'myPostsTab') {
    loadMyPosts();
  } else if (tabId === 'searchTab') {
    searchItems();
  } else if (tabId === 'matchesTab') {
    loadSmartMatches();
  } else if (tabId === 'myClaimsTab' && typeof loadMyClaims === 'function') {
    loadMyClaims();
  } else if (tabId === 'notificationsTab' && typeof loadNotifications === 'function') {
    loadNotifications();
  }
}

// Image preview helper
function setupImagePreview(fileInputId, previewContainerId, previewImgId, fileNameId) {
  const fileInput = document.getElementById(fileInputId);
  const container = document.getElementById(previewContainerId);
  const previewImg = document.getElementById(previewImgId);
  const fileName = document.getElementById(fileNameId);

  if (!fileInput || !container || !previewImg) return;

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        previewImg.src = e.target.result;
        if (fileName) fileName.textContent = file.name;
        container.style.display = 'flex';
      };
      reader.readAsDataURL(file);
    } else {
      container.style.display = 'none';
    }
  });
}

function clearImagePreview(fileInputId, previewContainerId) {
  const fileInput = document.getElementById(fileInputId);
  const container = document.getElementById(previewContainerId);
  if (fileInput) fileInput.value = '';
  if (container) container.style.display = 'none';
}
window.clearImagePreview = clearImagePreview;

// Dashboard Overview Module (Real Data Summaries)
async function loadDashboardOverview() {
  const dashPosts = document.getElementById('dashStatPosts');
  const dashClaims = document.getElementById('dashStatClaims');
  const dashMatches = document.getElementById('dashStatMatches');
  const dashNotifs = document.getElementById('dashStatNotifs');
  const recentGrid = document.getElementById('dashRecentItemsGrid');

  try {
    const [myRes, claimsRes, matchesRes, notifsRes, itemsRes] = await Promise.all([
      fetch('/api/items/my').then(r => r.json()).catch(() => ({ items: [] })),
      fetch('/api/claims/my').then(r => r.json()).catch(() => ({ claims: [] })),
      fetch('/api/items/matches').then(r => r.json()).catch(() => ({ matches: [] })),
      fetch('/api/notifications').then(r => r.json()).catch(() => ({ notifications: [], unreadCount: 0 })),
      fetch('/api/items?limit=4').then(r => r.json()).catch(() => ({ items: [] }))
    ]);

    if (dashPosts && myRes.items) {
      dashPosts.textContent = myRes.items.length;
    }
    if (dashClaims && claimsRes.claims) {
      dashClaims.textContent = claimsRes.claims.length;
    }
    if (dashMatches && matchesRes.matches) {
      dashMatches.textContent = matchesRes.matches.length;
    }
    if (dashNotifs && notifsRes) {
      dashNotifs.textContent = notifsRes.unreadCount || 0;
    }

    if (recentGrid) {
      if (itemsRes.items && itemsRes.items.length > 0) {
        recentGrid.innerHTML = '';
        itemsRes.items.slice(0, 4).forEach(item => {
          recentGrid.appendChild(createItemCardElement(item));
        });
      } else {
        recentGrid.innerHTML = `
          <div class="empty-state" style="grid-column: 1/-1;">
            <div class="empty-state-icon">📦</div>
            <div class="empty-state-title">No Recent Campus Listings</div>
            <p class="empty-state-desc">There are no recently published lost or found items at this time.</p>
          </div>
        `;
      }
    }
  } catch (err) {
    console.error('Failed to load dashboard metrics:', err);
  }
}

// Fetch Active Categories
async function loadCategories() {
  try {
    const res = await fetch('/api/categories');
    const data = await res.json();
    if (data.success) {
      categoriesList = data.categories;
      populateCategoryDropdowns(categoriesList);
    }
  } catch (err) {
    console.error('Failed to load categories:', err);
  }
}

function populateCategoryDropdowns(categories) {
  const selects = document.querySelectorAll('.category-select, #searchCategory');
  selects.forEach(select => {
    const isSearch = (select.id === 'searchCategory');
    select.innerHTML = isSearch ? '<option value="all">All Categories</option>' : '<option value="">-- Select Category --</option>';

    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.category_id;
      option.textContent = cat.category_name;
      select.appendChild(option);
    });
  });
}

// Duplicate Detection Setup (FR-39)
function setupDuplicateWarning(titleInputId, categorySelectId, postType, warningContainerId) {
  const titleInput = document.getElementById(titleInputId);
  const catSelect = document.getElementById(categorySelectId);
  const container = document.getElementById(warningContainerId);
  if (!titleInput || !catSelect || !container) return;

  async function check() {
    const title = titleInput.value.trim();
    const category_id = catSelect.value;
    if (title.length < 3 || !category_id) {
      container.style.display = 'none';
      return;
    }

    try {
      const res = await fetch(`/api/items/check-duplicate?title=${encodeURIComponent(title)}&category_id=${encodeURIComponent(category_id)}&post_type=${encodeURIComponent(postType)}`);
      const data = await res.json();

      if (data.success && data.hasDuplicate) {
        container.style.display = 'block';
        container.innerHTML = `
          <div class="alert alert-warning" style="margin-bottom: 0;">
            <span>🔔</span>
            <div>
              <strong>Possible Duplicate Warning:</strong> An active item with a similar title already exists in this category: 
              <em>"${escapeHtml(data.duplicates[0].title)}"</em> (Location: ${escapeHtml(data.duplicates[0].location)}).
              Please verify your item is not already reported.
            </div>
          </div>
        `;
      } else {
        container.style.display = 'none';
      }
    } catch (e) {
      container.style.display = 'none';
    }
  }

  titleInput.addEventListener('blur', check);
  catSelect.addEventListener('change', check);
}

// Search and Filter Items (FR-54 to FR-62)
async function searchItems() {
  const grid = document.getElementById('itemGrid');
  if (!grid) return;

  grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">Searching database...</div>';

  const q = document.getElementById('searchKeyword')?.value || '';
  const post_type = document.getElementById('searchType')?.value || 'ALL';
  const category_id = document.getElementById('searchCategory')?.value || 'all';
  const location = document.getElementById('searchLocation')?.value || '';
  const date_from = document.getElementById('searchDateFrom')?.value || '';
  const date_to = document.getElementById('searchDateTo')?.value || '';

  const params = new URLSearchParams({
    q, post_type, category_id, location, date_from, date_to
  });

  try {
    const res = await fetch(`/api/items?${params.toString()}`);
    const data = await res.json();

    if (data.success && data.items.length > 0) {
      renderItemGrid(data.items);
    } else {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 60px 20px;">
          <div style="font-size: 2.5rem; margin-bottom: 12px;">🔍</div>
          <h4>No Published Items Found</h4>
          <p style="font-size: 0.9rem; color: var(--text-dim); margin-top: 6px;">
            Try broadening your search keyword or clearing location and date filters.
          </p>
        </div>
      `;
    }
  } catch (err) {
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--danger); padding: 40px;">Error searching items. Please try again.</div>';
  }
}

// Create Unified Modern Item Card Element
function createItemCardElement(item) {
  const card = document.createElement('div');
  card.className = 'item-card';

  const imageHtml = item.primary_image
    ? `<div class="item-card-img-container"><img src="${item.primary_image}" class="item-card-img" alt="${escapeHtml(item.title)}"></div>`
    : `<div class="item-card-img-container"><div class="item-card-placeholder">${item.post_type === 'LOST' ? '❓' : '📦'}<span>No Photo Provided</span></div></div>`;

  const postBadgeClass = item.post_type === 'LOST' ? 'badge-lost' : 'badge-found';
  const statusBadge = (item.status && item.status !== 'Published')
    ? `<span class="badge badge-${item.status.toLowerCase()}">${escapeHtml(item.status)}</span>`
    : '';

  card.innerHTML = `
    ${imageHtml}
    <div class="item-card-body">
      <div class="item-card-meta">
        <span class="badge ${postBadgeClass}">${item.post_type}</span>
        <span class="item-card-category">${escapeHtml(item.category_name || 'General')}</span>
      </div>
      <h4 class="item-card-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</h4>
      <p class="item-card-desc">${escapeHtml(item.description)}</p>
      <div class="item-card-details">
        <div class="item-card-detail-item">
          <span>📍</span>
          <span>${escapeHtml(item.location)}</span>
        </div>
        <div class="item-card-detail-item">
          <span>📅</span>
          <span>${formatDate(item.item_date)}${item.approximate_time ? ' at ' + escapeHtml(item.approximate_time) : ''}</span>
        </div>
      </div>
      <div class="item-card-footer">
        ${statusBadge || '<span class="badge badge-published">Published</span>'}
        <button class="btn btn-secondary btn-sm" onclick="openItemDetail(${item.item_id})">
          ${item.post_type === 'FOUND' ? 'View & Claim &rarr;' : 'View Details &rarr;'}
        </button>
      </div>
    </div>
  `;
  return card;
}

// Render Item Card Grid
function renderItemGrid(items) {
  const grid = document.getElementById('itemGrid');
  if (!grid) return;
  grid.innerHTML = '';

  if (!items || items.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1;">
        <div class="empty-state-icon">🔍</div>
        <div class="empty-state-title">No Matching Campus Items Found</div>
        <p class="empty-state-desc">
          Try broadening your search keyword or clearing location and date filters.
        </p>
        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('clearFiltersBtn').click()">
          Reset All Filters
        </button>
      </div>
    `;
    return;
  }

  items.forEach(item => {
    grid.appendChild(createItemCardElement(item));
  });
}

// Client-side item input validation (Time, Description, and Mandatory Fields)
function validateItemClientInput({ title, category_id, location, identifying_characteristics, description, approximate_time }) {
  if (!title || !title.trim()) {
    return { valid: false, message: 'Please enter a valid item title.' };
  }
  if (!category_id) {
    return { valid: false, message: 'Please select an item category.' };
  }
  if (!location || !location.trim()) {
    return { valid: false, message: 'Please enter the item location.' };
  }
  if (!identifying_characteristics || !identifying_characteristics.trim()) {
    return { valid: false, message: 'Please provide identifying characteristics.' };
  }

  // Description validation rules
  if (!description || !description.trim()) {
    return { valid: false, message: 'Item description is mandatory.' };
  }
  const desc = description.trim();
  if (/^\d/.test(desc)) {
    return { valid: false, message: 'Description must not begin with a numerical digit. Please start with descriptive words.' };
  }
  if (desc.length < 15) {
    return { valid: false, message: 'Description is too short. Please provide at least 15 meaningful characters.' };
  }
  const letters = (desc.match(/[a-zA-Z]/g) || []).length;
  if (letters < 8) {
    return { valid: false, message: 'Description must contain meaningful words, not just numbers or symbols.' };
  }
  if (/(.)\1{4,}/.test(desc.replace(/\s/g, ''))) {
    return { valid: false, message: 'Description must not contain repeated meaningless characters.' };
  }
  const uniqueLetters = new Set((desc.toLowerCase().match(/[a-z]/g) || []));
  if (uniqueLetters.size < 4) {
    return { valid: false, message: 'Description must contain meaningful, descriptive text rather than repeated characters.' };
  }

  // Time field validation (must be 24-hour HH:mm if provided)
  if (approximate_time && approximate_time.trim()) {
    const timeVal = approximate_time.trim();
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(timeVal)) {
      return { valid: false, message: 'Invalid time format. Please provide a valid 24-hour time in HH:mm format (e.g. 14:30).' };
    }
  }

  return { valid: true };
}

// Handle Submitting Lost / Found Item (FR-27 to FR-53)
async function handlePostItem(e, formId) {
  e.preventDefault();

  const form = document.getElementById(formId);
  const formData = new FormData(form);

  const title = formData.get('title');
  const category_id = formData.get('category_id');
  const location = formData.get('location');
  const identifying_characteristics = formData.get('identifying_characteristics');
  const description = formData.get('description');
  const approximate_time = formData.get('approximate_time');

  const validation = validateItemClientInput({
    title,
    category_id,
    location,
    identifying_characteristics,
    description,
    approximate_time
  });

  if (!validation.valid) {
    alert('⚠️ ' + validation.message);
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting Post...';

  try {
    const res = await fetch('/api/items', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    if (data.success) {
      alert(data.message);
      form.reset();
      submitBtn.disabled = false;
      submitBtn.textContent = formId === 'postLostForm' ? 'Submit Lost Post' : 'Submit Found Post';

      // Switch to search or matches tab
      switchTab('searchTab');
    } else {
      alert(data.message || 'Submission failed.');
      submitBtn.disabled = false;
      submitBtn.textContent = formId === 'postLostForm' ? 'Submit Lost Post' : 'Submit Found Post';
    }
  } catch (err) {
    alert('Failed to submit item post.');
    submitBtn.disabled = false;
    submitBtn.textContent = formId === 'postLostForm' ? 'Submit Lost Post' : 'Submit Found Post';
  }
}

// Open Item Details Modal (FR-61)
async function openItemDetail(itemId) {
  const modal = document.getElementById('itemModal');
  const body = document.getElementById('modalBody');

  body.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted);">Loading details...</div>';
  modal.classList.add('active');

  try {
    const res = await fetch(`/api/items/${itemId}`);
    const data = await res.json();

    if (data.success) {
      const item = data.item;
      const images = data.images;

      let imageGallery = '';
      if (images && images.length > 0) {
        imageGallery = `
          <div style="margin-bottom: 20px; text-align: center;">
            <img src="${images[0].file_path}" style="max-width: 100%; max-height: 280px; border-radius: var(--radius-sm); border: 1px solid var(--bg-card-border);" alt="${escapeHtml(item.title)}">
          </div>
        `;
      }

      const currentUserId = window.currentUser ? window.currentUser.user_id : null;
      const isOwner = currentUserId && item.user_id === currentUserId;

      body.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <span class="badge ${item.post_type === 'LOST' ? 'badge-lost' : 'badge-found'}">${item.post_type}</span>
            <span class="badge badge-published">${escapeHtml(item.category_name)}</span>
            ${item.is_valuable ? '<span class="badge badge-valuable">💎 High-Value Item</span>' : ''}
          </div>
          <div>
            ${!isOwner ? `
              <button class="btn btn-danger-outline btn-sm" onclick="openMisuseModal(${item.owner_id}, '${escapeHtml(item.owner_name)}', ${item.item_id}, '${escapeHtml(item.title)}')">
                🚩 Report Misuse
              </button>
            ` : ''}
          </div>
        </div>

        <h2 style="margin-bottom: 14px; color: var(--primary); font-size: 1.45rem;">${escapeHtml(item.title)}</h2>

        ${imageGallery}

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 20px; background: var(--bg-card-subtle); border: 1px solid var(--border-color); padding: 14px 16px; border-radius: var(--radius-sm); font-size: 0.88rem;">
          <div><span style="color: var(--text-muted);">Location:</span> <strong>${escapeHtml(item.location)}</strong></div>
          <div><span style="color: var(--text-muted);">Date:</span> <strong>${formatDate(item.item_date)}</strong></div>
          <div><span style="color: var(--text-muted);">Approx. Time:</span> <strong>${escapeHtml(item.approximate_time || 'Not specified')}</strong></div>
          <div><span style="color: var(--text-muted);">Reported By:</span> <strong>${escapeHtml(item.owner_name)} (${escapeHtml(item.owner_department)})</strong></div>
        </div>

        <div style="margin-bottom: 16px;">
          <h4 style="color: var(--text-main); margin-bottom: 6px; font-size: 0.95rem;">Detailed Description:</h4>
          <p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.5; white-space: pre-wrap;">${escapeHtml(item.description)}</p>
        </div>

        <div style="margin-bottom: 20px;">
          <h4 style="color: var(--text-main); margin-bottom: 6px; font-size: 0.95rem;">Identifying Characteristics:</h4>
          <p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.5; white-space: pre-wrap;">${escapeHtml(item.identifying_characteristics)}</p>
        </div>

        <!-- Inline Potential Matches Trigger -->
        <div style="margin-bottom: 20px; padding: 14px; background: var(--secondary-light); border: 1px solid #A9D5D6; border-radius: var(--radius-sm);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <span style="font-size: 0.88rem; color: var(--secondary); font-weight: 600;">
              🎯 Check Complementary ${item.post_type === 'LOST' ? 'Found' : 'Lost'} Matches
            </span>
            <button class="btn btn-secondary btn-sm" onclick="checkItemMatchesInline(${item.item_id})">
              Check Matches
            </button>
          </div>
          <div id="inlineMatchesContainer" style="display: none; margin-top: 12px;"></div>
        </div>

        <!-- Claiming Workflow Area -->
        ${(() => {
          if (item.status === 'Returned') {
            return `
              <div style="border-top: 1px solid var(--border-color); padding-top: 16px;">
                <div class="alert alert-info" style="margin-bottom: 0;">
                  <span>✅</span>
                  <div><strong>Item Returned:</strong> This item handover is completed and verified. No further claims can be submitted.</div>
                </div>
              </div>
            `;
          } else if (item.status === 'Claimed') {
            return `
              <div style="border-top: 1px solid var(--border-color); padding-top: 16px;">
                <div class="alert alert-warning" style="margin-bottom: 0;">
                  <span>⏳</span>
                  <div><strong>Under Handover:</strong> A verified ownership claim has been approved by the administrator for this item.</div>
                </div>
              </div>
            `;
          } else if (isOwner) {
            return `
              <div style="border-top: 1px solid var(--border-color); padding-top: 16px;">
                <div class="alert alert-info" style="margin-bottom: 0;">
                  <span>📌</span>
                  <div><strong>Your Post:</strong> You posted this item. You can edit or manage it from the "My Posts" tab.</div>
                </div>
              </div>
            `;
          } else if (item.post_type === 'FOUND' && item.status === 'Published') {
            return `
              <div style="border-top: 1px solid var(--border-color); padding-top: 16px;">
                <button id="showClaimFormBtn" class="btn btn-primary" style="width: 100%; padding: 11px; font-size: 0.95rem;" onclick="toggleClaimForm()">
                  ✋ Claim This Item (Submit Ownership Proof)
                </button>

                <div id="claimFormContainer" style="display: none; margin-top: 16px; background: var(--bg-card-subtle); border: 1px solid var(--border-color); padding: 20px; border-radius: var(--radius-sm);">
                  <h4 style="margin-bottom: 6px; color: var(--primary);">Submit Ownership Claim</h4>
                  <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px;">
                    Provide clear proof of ownership. An administrator will verify your evidence before approving handover.
                  </p>
                  <div id="claimAlertContainer"></div>
                  <form id="itemClaimForm" onsubmit="handleClaimSubmit(event, ${item.item_id})">
                    <div class="form-group">
                      <label for="claimReason">Reason for Claim *</label>
                      <textarea id="claimReason" name="reason" class="form-control" rows="2" placeholder="Explain why you believe this item is yours and when/where you lost it..." required></textarea>
                    </div>
                    <div class="form-group">
                      <label for="claimEvidence">Ownership Evidence & Distinct Details *</label>
                      <textarea id="claimEvidence" name="ownership_evidence" class="form-control" rows="3" placeholder="Provide distinct characteristics, purchase information, unique marks, stickers, or hidden details..." required></textarea>
                    </div>
                    <div class="form-group">
                      <label for="claimEvidenceImage">Supporting Photo / Purchase Receipt / ID Proof (Optional, Max 5MB)</label>
                      <input type="file" id="claimEvidenceImage" name="evidence_image" class="form-control" accept="image/jpeg,image/png,image/webp">
                    </div>
                    <div style="display: flex; gap: 10px; margin-top: 16px;">
                      <button type="submit" id="submitClaimBtn" class="btn btn-primary" style="flex: 1; padding: 10px;">
                        Submit Claim
                      </button>
                      <button type="button" class="btn btn-secondary" onclick="toggleClaimForm()" style="padding: 10px 16px;">
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            `;
          }
          return '';
        })()}
      `;
    } else {
      body.innerHTML = `<div class="alert alert-danger">${data.message || 'Could not load item.'}</div>`;
    }
  } catch (err) {
    body.innerHTML = '<div class="alert alert-danger">Network error loading item details.</div>';
  }
}

// Inline Check Matches
async function checkItemMatchesInline(itemId) {
  const container = document.getElementById('inlineMatchesContainer');
  if (!container) return;

  if (container.style.display === 'block') {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem;">Calculating matches...</div>';

  try {
    const res = await fetch(`/api/items/${itemId}/matches`);
    const data = await res.json();

    if (data.success && data.matches && data.matches.length > 0) {
      container.innerHTML = '';
      data.matches.forEach(m => {
        const div = document.createElement('div');
        div.style.cssText = 'background: rgba(0,0,0,0.3); border: 1px solid var(--bg-card-border); padding: 10px 14px; border-radius: var(--radius-sm); margin-bottom: 8px; font-size: 0.85rem;';
        div.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <strong>${escapeHtml(m.item.title)}</strong>
            <span class="badge badge-approved" style="font-size: 0.75rem;">${m.matchScore}% Match</span>
          </div>
          <div style="color: var(--text-muted); font-size: 0.8rem;">
            📍 ${escapeHtml(m.item.location)} &bull; 📅 ${formatDate(m.item_date)}
          </div>
          <div style="font-size: 0.78rem; color: #a5b4fc; margin-top: 4px;">
            Reasons: ${escapeHtml(m.reasons.join(' &bull; '))}
          </div>
        `;
        container.appendChild(div);
      });
    } else {
      container.innerHTML = '<div style="color: var(--text-dim); font-size: 0.85rem;">No strong matches found in the opposite category yet.</div>';
    }
  } catch (err) {
    container.innerHTML = '<div style="color: var(--danger); font-size: 0.85rem;">Failed to load matches.</div>';
  }
}

function closeModal() {
  const modal = document.getElementById('itemModal');
  if (modal) modal.classList.remove('active');
}

// ---------------------------------------------------------
// SMART MATCHES TAB MODULE (INCREMENT 4)
// ---------------------------------------------------------
async function loadSmartMatches() {
  const container = document.getElementById('smartMatchesContainer');
  if (!container) return;

  container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 40px;">Calculating smart matches across all your active posts...</div>';

  try {
    const res = await fetch('/api/items/matches/my');
    const data = await res.json();

    if (data.success && data.allMatches && data.allMatches.length > 0) {
      container.innerHTML = '';

      data.allMatches.forEach(group => {
        const groupCard = document.createElement('div');
        groupCard.style.cssText = 'background: #FFFFFF; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 20px; margin-bottom: 22px; box-shadow: var(--shadow-xs);';

        groupCard.innerHTML = `
          <div style="margin-bottom: 16px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px;">
            <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 4px;">
              <span class="badge ${group.myPost.post_type === 'LOST' ? 'badge-lost' : 'badge-found'}">${group.myPost.post_type}</span>
              <span class="badge badge-published">${escapeHtml(group.myPost.category_name || 'General')}</span>
            </div>
            <h4 style="font-size: 1.15rem; color: var(--primary); margin-bottom: 2px;">
              Your Post: "${escapeHtml(group.myPost.title)}"
            </h4>
            <div style="font-size: 0.85rem; color: var(--text-muted);">
              📍 ${escapeHtml(group.myPost.location)} &bull; Date: ${formatDate(group.myPost.item_date)}
            </div>
          </div>
          <div class="matches-list"></div>
        `;

        const matchesList = groupCard.querySelector('.matches-list');

        group.matches.forEach(m => {
          const mCard = document.createElement('div');
          mCard.className = 'match-card';

          const imgHtml = m.item.primary_image
            ? `<img src="${m.item.primary_image}" style="width: 70px; height: 70px; object-fit: cover; border-radius: var(--radius-sm); border: 1px solid var(--border-color);" alt="Match">`
            : `<div style="width: 70px; height: 70px; background: var(--bg-card-subtle); border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; font-size: 1.8rem; border-radius: var(--radius-sm);">${m.item.post_type === 'LOST' ? '❓' : '📦'}</div>`;

          mCard.innerHTML = `
            ${imgHtml}
            <div>
              <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 4px;">
                <span class="badge ${m.item.post_type === 'LOST' ? 'badge-lost' : 'badge-found'}">${m.item.post_type}</span>
                <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 500;">${escapeHtml(m.item.category_name)}</span>
              </div>
              <h4 style="font-size: 1.05rem; margin-bottom: 4px; color: var(--primary);">${escapeHtml(m.item.title)}</h4>
              <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 6px;">
                📍 Location: ${escapeHtml(m.item.location)} &bull; 📅 Date: ${formatDate(m.item.item_date)}
              </div>
              <div style="font-size: 0.82rem; color: var(--secondary); font-weight: 500;">
                Match Factors: ${escapeHtml(m.reasons.join(', '))}
              </div>
            </div>

            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 10px;">
              <div class="match-score-badge">
                ${m.matchScore}%
                <div class="match-score-sub">Match</div>
              </div>
              <button class="btn btn-secondary btn-sm" onclick="openItemDetail(${m.item.item_id})">
                ${m.item.post_type === 'FOUND' ? 'View & Claim' : 'View Post'}
              </button>
            </div>
          `;
          matchesList.appendChild(mCard);
        });

        container.appendChild(groupCard);
      });
    } else {
      container.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 50px 20px;">
          <div style="font-size: 2.5rem; margin-bottom: 12px;">🎯</div>
          <h4>No Suggested Matches at this Time</h4>
          <p style="font-size: 0.9rem; color: var(--text-dim); margin-top: 6px;">
            When complementary items matching your active lost or found posts are published on campus, they will appear here automatically.
          </p>
        </div>
      `;
    }
  } catch (err) {
    container.innerHTML = '<div class="alert alert-danger">Error retrieving smart matches.</div>';
  }
}

// ---------------------------------------------------------
// MISUSE REPORTING MODAL (INCREMENT 3)
// ---------------------------------------------------------
function openMisuseModal(userId, userName, itemId, itemTitle) {
  const modal = document.getElementById('misuseReportModal');
  const targetIdInput = document.getElementById('reportTargetUserId');
  const targetNameInput = document.getElementById('reportTargetUserName');
  const relatedItemInput = document.getElementById('reportRelatedItemId');

  if (targetIdInput) targetIdInput.value = userId;
  if (targetNameInput) targetNameInput.value = `${userName} (Item: ${itemTitle})`;
  if (relatedItemInput) relatedItemInput.value = itemId || '';

  if (modal) modal.classList.add('active');
}

function closeMisuseModal() {
  const modal = document.getElementById('misuseReportModal');
  if (modal) modal.classList.remove('active');
  const form = document.getElementById('misuseReportForm');
  if (form) form.reset();
}

async function handleMisuseReportSubmit(e) {
  e.preventDefault();
  const reported_user_id = document.getElementById('reportTargetUserId').value;
  const related_item_id = document.getElementById('reportRelatedItemId').value || null;
  const reason = document.getElementById('misuseReason').value;
  const description = document.getElementById('misuseDescription').value.trim();
  const submitBtn = document.getElementById('submitReportBtn');

  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';

  try {
    const res = await fetch('/api/reports/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reported_user_id, related_item_id, reason, description })
    });

    const data = await res.json();
    if (data.success) {
      alert('✓ ' + data.message);
      closeMisuseModal();
    } else {
      alert('⚠️ ' + (data.message || 'Failed to submit report.'));
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Report';
    }
  } catch (err) {
    alert('Server error submitting report.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Report';
  }
}

// ---------------------------------------------------------
// MY POSTS MANAGEMENT
// ---------------------------------------------------------
async function loadMyPosts() {
  const container = document.getElementById('myPostsContainer');
  if (!container) return;

  container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 40px;">Loading your posts...</div>';

  try {
    const res = await fetch('/api/items/my/posts');
    const data = await res.json();

    if (data.success && data.items.length > 0) {
      container.innerHTML = '';
      data.items.forEach(item => {
        const div = document.createElement('div');
        div.style.cssText = 'background: #FFFFFF; border: 1px solid var(--border-color); padding: 18px 22px; border-radius: var(--radius-md); margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; box-shadow: var(--shadow-xs);';

        let statusBadge = '<span class="badge badge-published">Published</span>';
        if (item.status === 'Pending Approval') statusBadge = '<span class="badge badge-pending">Pending Approval</span>';
        else if (item.status === 'Returned') statusBadge = '<span class="badge badge-returned">Returned / Resolved</span>';
        else if (item.status === 'Claimed') statusBadge = '<span class="badge badge-claimed">Claimed</span>';
        else if (item.status === 'Rejected') statusBadge = '<span class="badge badge-rejected">Rejected</span>';
        else if (item.status === 'Archived') statusBadge = '<span class="badge badge-archived">Archived</span>';

        div.innerHTML = `
          <div>
            <div style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center; flex-wrap: wrap;">
              <span class="badge ${item.post_type === 'LOST' ? 'badge-lost' : 'badge-found'}">${item.post_type}</span>
              ${statusBadge}
              ${item.is_valuable ? '<span class="badge badge-valuable">💎 High-Value</span>' : ''}
            </div>
            <h4 style="font-size: 1.15rem; margin-bottom: 4px; color: var(--primary);">${escapeHtml(item.title)}</h4>
            <div style="font-size: 0.85rem; color: var(--text-muted);">
              📍 Location: ${escapeHtml(item.location)} &bull; 📅 Date: ${formatDate(item.item_date)} &bull; Category: ${escapeHtml(item.category_name)}
            </div>
          </div>

          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button class="btn btn-secondary btn-sm" onclick="openItemDetail(${item.item_id})">
              🔍 Details
            </button>
            ${item.status !== 'Returned' ? `
              <button class="btn btn-secondary btn-sm" onclick="openEditItemModal(${item.item_id})">✏️ Edit</button>
              <button class="btn btn-secondary btn-sm" onclick="markResolved(${item.item_id})">✓ Mark Resolved</button>
            ` : ''}
            <button class="btn btn-danger-outline btn-sm" onclick="deleteMyPost(${item.item_id})">Delete</button>
          </div>
        `;

        container.appendChild(div);
      });
    } else {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <div class="empty-state-title">No Posts Submitted Yet</div>
          <p class="empty-state-desc">
            You have not submitted any lost or found items on campus yet.
          </p>
          <div style="display: flex; gap: 10px; justify-content: center;">
            <button class="btn btn-primary btn-sm" onclick="switchTab('postLostTab')">
              📢 Report Lost Item
            </button>
            <button class="btn btn-teal btn-sm" onclick="switchTab('postFoundTab')">
              💡 Report Found Item
            </button>
          </div>
        </div>
      `;
    }
  } catch (err) {
    container.innerHTML = '<div class="alert alert-danger">Error loading your posts.</div>';
  }
}

async function markResolved(itemId) {
  if (!confirm('Mark this item as resolved/returned? This indicates the item has been recovered or handed over.')) return;
  try {
    const res = await fetch(`/api/items/${itemId}/resolve`, { method: 'PUT' });
    const data = await res.json();
    alert(data.message);
    loadMyPosts();
  } catch (err) {
    alert('Error updating post.');
  }
}

async function deleteMyPost(itemId) {
  if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) return;
  try {
    const res = await fetch(`/api/items/${itemId}`, { method: 'DELETE' });
    const data = await res.json();
    alert(data.message);
    loadMyPosts();
  } catch (err) {
    alert('Error deleting post.');
  }
}

// ---------------------------------------------------------
// EDIT ITEM MODAL HANDLERS
// ---------------------------------------------------------
async function openEditItemModal(itemId) {
  try {
    const res = await fetch(`/api/items/${itemId}`);
    const data = await res.json();
    if (!data.success) {
      alert('Failed to load item for editing.');
      return;
    }
    const item = data.item;

    document.getElementById('editItemId').value = item.item_id;
    document.getElementById('editTitle').value = item.title;

    // Populate category dropdown
    const editCat = document.getElementById('editCategory');
    if (editCat) {
      editCat.innerHTML = '<option value="">-- Select Category --</option>';
      categoriesList.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.category_id;
        opt.textContent = cat.category_name;
        if (cat.category_id === item.category_id) opt.selected = true;
        editCat.appendChild(opt);
      });
    }

    const d = new Date(item.item_date);
    const dateFormatted = !isNaN(d) ? d.toISOString().split('T')[0] : item.item_date;
    document.getElementById('editDate').value = dateFormatted;
    document.getElementById('editLocation').value = item.location;
    document.getElementById('editTime').value = item.approximate_time || '';
    document.getElementById('editDescription').value = item.description;
    document.getElementById('editCharacteristics').value = item.identifying_characteristics;

    document.getElementById('editItemModal').classList.add('active');
  } catch (err) {
    alert('Error loading item details for editing.');
  }
}

function closeEditModal() {
  const modal = document.getElementById('editItemModal');
  if (modal) modal.classList.remove('active');
  const form = document.getElementById('editItemForm');
  if (form) form.reset();
}

async function handleEditItemSubmit(e) {
  e.preventDefault();
  const itemId = document.getElementById('editItemId').value;
  const title = document.getElementById('editTitle').value;
  const category_id = document.getElementById('editCategory').value;
  const item_date = document.getElementById('editDate').value;
  const location = document.getElementById('editLocation').value;
  const approximate_time = document.getElementById('editTime').value;
  const description = document.getElementById('editDescription').value;
  const identifying_characteristics = document.getElementById('editCharacteristics').value;
  const saveBtn = document.getElementById('saveEditBtn');

  const validation = validateItemClientInput({
    title,
    category_id,
    location,
    identifying_characteristics,
    description,
    approximate_time
  });

  if (!validation.valid) {
    alert('⚠️ ' + validation.message);
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    const res = await fetch(`/api/items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        category_id,
        item_date,
        location,
        approximate_time: approximate_time || null,
        description,
        identifying_characteristics
      })
    });

    const data = await res.json();
    if (data.success) {
      alert('✓ ' + data.message);
      closeEditModal();
      loadMyPosts();
    } else {
      alert('⚠️ ' + (data.message || 'Failed to update item.'));
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Changes';
    }
  } catch (err) {
    alert('Server error updating item.');
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Changes';
  }
}

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
