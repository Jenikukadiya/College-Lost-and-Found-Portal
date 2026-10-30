/* =========================================================
   Authentication & Session Management JavaScript (js/auth.js)
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  initAuthPage();
});

function initAuthPage() {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const logoutBtn = document.getElementById('logoutBtn');
  const adminLogoutBtn = document.getElementById('adminLogoutBtn');
  const profileForm = document.getElementById('profileForm');
  const passwordForm = document.getElementById('passwordForm');

  // Forgot password modal controls (FR-21)
  const forgotLink = document.getElementById('forgotPasswordLink');
  const closeForgotBtn = document.getElementById('closeForgotModalBtn');
  const forgotForm = document.getElementById('forgotPasswordForm');

  if (forgotLink) {
    forgotLink.addEventListener('click', (e) => {
      e.preventDefault();
      openForgotModal();
    });
  }
  if (closeForgotBtn) {
    closeForgotBtn.addEventListener('click', closeForgotModal);
  }
  if (forgotForm) {
    forgotForm.addEventListener('submit', handleForgotPassword);
  }

  // Notifications Bell & buttons (FR-98 to FR-104)
  const notifBellBtn = document.getElementById('notifBellBtn');
  if (notifBellBtn) {
    notifBellBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof switchTab === 'function') {
        switchTab('notificationsTab');
      }
    });
  }
  const refreshNotifsBtn = document.getElementById('refreshNotifsBtn');
  if (refreshNotifsBtn) {
    refreshNotifsBtn.addEventListener('click', loadNotifications);
  }
  const markAllReadBtn = document.getElementById('markAllReadBtn');
  if (markAllReadBtn) {
    markAllReadBtn.addEventListener('click', markAllNotificationsRead);
  }

  // Login handler
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  // Registration handler & real-time verification
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
    initRegisterValidation();
  }

  // Profile Form handler & verification
  if (profileForm) {
    profileForm.addEventListener('submit', handleProfileUpdate);
    initProfileValidation();
  }

  // Logout handler
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
  if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener('click', handleLogout);
  }

  // Password Change handler
  if (passwordForm) {
    passwordForm.addEventListener('submit', handlePasswordChange);
  }

  // Password Show / Hide Toggle Listeners
  document.querySelectorAll('.password-toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (!input) return;
      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
        btn.setAttribute('title', 'Hide password');
      } else {
        input.type = 'password';
        btn.textContent = '👁️';
        btn.setAttribute('title', 'Show password');
      }
    });
  });

  // Session check on portal and admin pages
  if (window.location.pathname.endsWith('portal.html') || window.location.pathname.endsWith('admin.html')) {
    checkSession();
  }
}


// Display alert helper
function showAlert(message, type = 'danger', containerId = 'alertContainer') {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="alert alert-${type}">
      <span>${type === 'danger' ? '⚠️' : type === 'warning' ? '🔔' : '✅'}</span>
      <div>${message}</div>
    </div>
  `;
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

// ---------------------------------------------------------
// INPUT VALIDATION & VERIFICATION HELPERS
// ---------------------------------------------------------

/**
 * Validates full name:
 * - Must not contain any digits
 * - Only letters, spaces, hyphens, periods, and apostrophes
 * - At least 2 alphabetic letters, max 100 characters
 */
function checkFullName(name) {
  if (!name || !name.trim()) {
    return { valid: false, message: 'Full name is mandatory.' };
  }
  const trimmed = name.trim();
  if (/\d/.test(trimmed)) {
    return { valid: false, message: 'Full name cannot contain numbers or digits. Please enter letters only.' };
  }
  if (!/^[A-Za-z\s.'-]+$/.test(trimmed)) {
    return { valid: false, message: 'Only letters, spaces, hyphens, and apostrophes are allowed.' };
  }
  const letters = (trimmed.match(/[A-Za-z]/g) || []).length;
  if (letters < 2) {
    return { valid: false, message: 'Full name must contain at least 2 letters.' };
  }
  if (trimmed.length > 100) {
    return { valid: false, message: 'Full name cannot exceed 100 characters.' };
  }
  return { valid: true, message: '✓ Valid name' };
}

/**
 * Validates mobile phone number:
 * - Must contain exactly 10 digits
 * - Rejects letters, spaces, special characters, or fewer/more than 10 digits
 */
function checkPhone(phone) {
  if (!phone || !phone.trim()) {
    return { valid: false, message: 'Phone number must contain exactly 10 digits.' };
  }
  const trimmed = phone.trim();
  if (!/^\d{10}$/.test(trimmed)) {
    return { valid: false, message: 'Phone number must contain exactly 10 digits.' };
  }
  return { valid: true, message: '✓ Valid 10-digit phone number' };
}

/**
 * Validates institutional ID (e.g. STU2026001, FAC001)
 */
function checkInstitutionalId(id) {
  if (!id || !id.trim()) {
    return { valid: false, message: 'Institutional ID is mandatory.' };
  }
  const trimmed = id.trim();
  if (trimmed.length < 3 || trimmed.length > 30) {
    return { valid: false, message: 'ID must be between 3 and 30 characters.' };
  }
  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) {
    return { valid: false, message: 'ID can only contain letters, numbers, and hyphens (no spaces).' };
  }
  return { valid: true, message: '✓ Valid institutional ID' };
}

/**
 * Validates college email format
 */
function checkEmail(email) {
  if (!email || !email.trim()) {
    return { valid: false, message: 'Email address is mandatory.' };
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email.trim()) || email.trim().length > 100) {
    return { valid: false, message: 'Please enter a valid email address (e.g. name@college.edu).' };
  }
  return { valid: true, message: '✓ Valid email address' };
}

/**
 * Validates department:
 * - Alphabetic characters and spaces only
 * - Rejects numerical digits or special characters
 */
function checkDepartment(dept) {
  if (!dept || !dept.trim()) {
    return { valid: false, message: 'Department is mandatory.' };
  }
  const trimmed = dept.trim();
  if (!/^[A-Za-z\s]+$/.test(trimmed)) {
    return { valid: false, message: 'Department must contain letters only.' };
  }
  if (trimmed.length < 2 || trimmed.length > 100) {
    return { valid: false, message: 'Department must be between 2 and 100 characters.' };
  }
  return { valid: true, message: '✓ Valid department' };
}

/**
 * Validates course:
 * - Alphabetic characters and spaces only
 * - Rejects numerical digits or special characters
 */
function checkCourse(course) {
  if (!course || !course.trim()) {
    return { valid: true, message: '' };
  }
  const trimmed = course.trim();
  if (!/^[A-Za-z\s]+$/.test(trimmed)) {
    return { valid: false, message: 'Course must contain letters only.' };
  }
  if (trimmed.length < 2 || trimmed.length > 100) {
    return { valid: false, message: 'Course must be between 2 and 100 characters.' };
  }
  return { valid: true, message: '✓ Valid course' };
}

/**
 * Validates semester:
 * - Numeric digits only
 * - Valid semester number between 1 and 8
 * - Rejects letters, spaces, decimal values, negative values, or special characters
 */
function checkSemester(sem) {
  if (sem === undefined || sem === null || (typeof sem === 'string' && !sem.trim())) {
    return { valid: true, message: '' };
  }
  const trimmed = String(sem).trim();
  if (!/^[1-8]$/.test(trimmed)) {
    return { valid: false, message: 'Please enter a valid semester number between 1 and 8.' };
  }
  return { valid: true, message: '✓ Valid semester (1-8)' };
}

/**
 * Checks password strength against all 5 security criteria
 */
function checkPasswordStrength(password) {
  const length = password.length >= 8;
  const uppercase = /[A-Z]/.test(password);
  const lowercase = /[a-z]/.test(password);
  const number = /[0-9]/.test(password);
  const special = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const valid = length && uppercase && lowercase && number && special;
  return { valid, length, uppercase, lowercase, number, special };
}

function setFieldFeedback(inputEl, feedbackEl, result) {
  if (!inputEl) return;
  if (!result.valid) {
    inputEl.classList.add('is-invalid');
    inputEl.classList.remove('is-valid');
    if (feedbackEl) {
      feedbackEl.className = 'input-feedback text-danger';
      feedbackEl.textContent = result.message;
    }
  } else {
    inputEl.classList.remove('is-invalid');
    inputEl.classList.add('is-valid');
    if (feedbackEl) {
      feedbackEl.className = 'input-feedback text-success';
      feedbackEl.textContent = result.message;
    }
  }
}

function clearFieldFeedback(inputEl, feedbackEl) {
  if (!inputEl) return;
  inputEl.classList.remove('is-invalid', 'is-valid');
  if (feedbackEl) {
    feedbackEl.className = 'input-feedback';
    feedbackEl.textContent = '';
  }
}

// ---------------------------------------------------------
// REAL-TIME VERIFICATION INITIALIZERS
// ---------------------------------------------------------
function initRegisterValidation() {
  const role = document.getElementById('role');
  const courseGroup = document.getElementById('courseGroup');
  const semesterGroup = document.getElementById('semesterGroup');
  const fullName = document.getElementById('fullName');
  const fullNameFb = document.getElementById('fullNameFeedback');
  const phone = document.getElementById('phone');
  const phoneFb = document.getElementById('phoneFeedback');
  const email = document.getElementById('email');
  const emailFb = document.getElementById('emailFeedback');
  const instId = document.getElementById('institutionalId');
  const instIdFb = document.getElementById('institutionalIdFeedback');
  const dept = document.getElementById('department');
  const deptFb = document.getElementById('departmentFeedback');
  const course = document.getElementById('course');
  const courseFb = document.getElementById('courseFeedback');
  const semester = document.getElementById('semester');
  const semesterFb = document.getElementById('semesterFeedback');
  const password = document.getElementById('password');
  const confirmPassword = document.getElementById('confirmPassword');
  const confirmFb = document.getElementById('confirmPasswordFeedback');

  // Dynamic visibility of Course and Semester (applicable to Student)
  function updateRoleVisibility() {
    if (!role) return;
    const selectedRole = role.value;
    if (selectedRole === 'Faculty' || selectedRole === 'Staff') {
      if (courseGroup) courseGroup.style.display = 'none';
      if (semesterGroup) semesterGroup.style.display = 'none';
      if (course) {
        course.value = '';
        clearFieldFeedback(course, courseFb);
      }
      if (semester) {
        semester.value = '';
        clearFieldFeedback(semester, semesterFb);
      }
    } else {
      if (courseGroup) courseGroup.style.display = 'block';
      if (semesterGroup) semesterGroup.style.display = 'block';
    }
  }

  if (role) {
    role.addEventListener('change', updateRoleVisibility);
    updateRoleVisibility();
  }

  if (fullName) {
    fullName.addEventListener('input', () => {
      if (fullName.value.trim().length === 0) {
        clearFieldFeedback(fullName, fullNameFb);
        return;
      }
      setFieldFeedback(fullName, fullNameFb, checkFullName(fullName.value));
    });
    fullName.addEventListener('blur', () => {
      if (fullName.value.trim().length > 0) {
        setFieldFeedback(fullName, fullNameFb, checkFullName(fullName.value));
      }
    });
  }

  if (phone) {
    phone.addEventListener('input', () => {
      // Do not allow users to enter more than 10 digits
      if (phone.value.length > 10) {
        phone.value = phone.value.slice(0, 10);
      }
      if (phone.value.trim().length === 0) {
        clearFieldFeedback(phone, phoneFb);
        return;
      }
      setFieldFeedback(phone, phoneFb, checkPhone(phone.value));
    });
    phone.addEventListener('blur', () => {
      if (phone.value.trim().length > 0) {
        setFieldFeedback(phone, phoneFb, checkPhone(phone.value));
      }
    });
  }

  if (email) {
    email.addEventListener('input', () => {
      if (email.value.trim().length === 0) {
        clearFieldFeedback(email, emailFb);
        return;
      }
      setFieldFeedback(email, emailFb, checkEmail(email.value));
    });
    email.addEventListener('blur', () => {
      if (email.value.trim().length > 0) {
        setFieldFeedback(email, emailFb, checkEmail(email.value));
      }
    });
  }

  if (instId) {
    instId.addEventListener('input', () => {
      if (instId.value.trim().length === 0) {
        clearFieldFeedback(instId, instIdFb);
        return;
      }
      setFieldFeedback(instId, instIdFb, checkInstitutionalId(instId.value));
    });
    instId.addEventListener('blur', () => {
      if (instId.value.trim().length > 0) {
        setFieldFeedback(instId, instIdFb, checkInstitutionalId(instId.value));
      }
    });
  }

  if (dept) {
    dept.addEventListener('input', () => {
      if (dept.value.trim().length === 0) {
        clearFieldFeedback(dept, deptFb);
        return;
      }
      setFieldFeedback(dept, deptFb, checkDepartment(dept.value));
    });
    dept.addEventListener('blur', () => {
      if (dept.value.trim().length > 0) {
        setFieldFeedback(dept, deptFb, checkDepartment(dept.value));
      }
    });
  }

  if (course) {
    course.addEventListener('input', () => {
      if (course.value.trim().length === 0) {
        clearFieldFeedback(course, courseFb);
        return;
      }
      setFieldFeedback(course, courseFb, checkCourse(course.value));
    });
    course.addEventListener('blur', () => {
      if (course.value.trim().length > 0) {
        setFieldFeedback(course, courseFb, checkCourse(course.value));
      }
    });
  }

  if (semester) {
    semester.addEventListener('input', () => {
      if (semester.value.trim().length === 0) {
        clearFieldFeedback(semester, semesterFb);
        return;
      }
      setFieldFeedback(semester, semesterFb, checkSemester(semester.value));
    });
    semester.addEventListener('blur', () => {
      if (semester.value.trim().length > 0) {
        setFieldFeedback(semester, semesterFb, checkSemester(semester.value));
      }
    });
  }

  if (password) {
    password.addEventListener('input', () => {
      updatePasswordChecklist(password.value);
      if (confirmPassword && confirmPassword.value) {
        checkConfirmPasswordMatch();
      }
    });
  }

  if (confirmPassword) {
    confirmPassword.addEventListener('input', checkConfirmPasswordMatch);
  }

  function checkConfirmPasswordMatch() {
    if (!confirmFb) return;
    if (!confirmPassword.value) {
      clearFieldFeedback(confirmPassword, confirmFb);
      return;
    }
    if (confirmPassword.value === password.value) {
      confirmPassword.classList.remove('is-invalid');
      confirmPassword.classList.add('is-valid');
      confirmFb.className = 'input-feedback text-success';
      confirmFb.textContent = '✓ Passwords match';
    } else {
      confirmPassword.classList.add('is-invalid');
      confirmPassword.classList.remove('is-valid');
      confirmFb.className = 'input-feedback text-danger';
      confirmFb.textContent = '❌ Passwords do not match';
    }
  }

  function updatePasswordChecklist(val) {
    const checks = checkPasswordStrength(val);
    const updateItem = (id, met) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (met) {
        el.classList.add('met');
        el.querySelector('.chk-icon').textContent = '✓';
      } else {
        el.classList.remove('met');
        el.querySelector('.chk-icon').textContent = '○';
      }
    };

    updateItem('chkLength', checks.length);
    updateItem('chkUpper', checks.uppercase);
    updateItem('chkLower', checks.lowercase);
    updateItem('chkNumber', checks.number);
    updateItem('chkSpecial', checks.special);

    if (val.length === 0) {
      clearFieldFeedback(password, null);
    } else if (checks.valid) {
      password.classList.remove('is-invalid');
      password.classList.add('is-valid');
    } else {
      password.classList.add('is-invalid');
      password.classList.remove('is-valid');
    }
  }
}

function initProfileValidation() {
  const nameInput = document.getElementById('profileFullName');
  const nameFb = document.getElementById('profileFullNameFeedback');
  const phoneInput = document.getElementById('profilePhone');
  const phoneFb = document.getElementById('profilePhoneFeedback');

  if (nameInput) {
    nameInput.addEventListener('input', () => {
      setFieldFeedback(nameInput, nameFb, checkFullName(nameInput.value));
    });
  }

  if (phoneInput) {
    phoneInput.addEventListener('input', () => {
      setFieldFeedback(phoneInput, phoneFb, checkPhone(phoneInput.value));
    });
  }
}

// ---------------------------------------------------------
// AUTHENTICATION ACTION HANDLERS
// ---------------------------------------------------------

// Handle User Login
async function handleLogin(e) {
  e.preventDefault();
  const identifier = document.getElementById('identifier').value.trim();
  const password = document.getElementById('password').value;
  const submitBtn = document.getElementById('loginSubmitBtn');

  if (!identifier || !password) {
    showAlert('Please enter both email/ID and password.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Authenticating...';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });

    const data = await res.json();

    if (data.success) {
      showAlert('Login successful! Redirecting...', 'success');
      setTimeout(() => {
        if (data.user.role === 'Administrator') {
          window.location.href = 'admin.html';
        } else {
          window.location.href = 'portal.html';
        }
      }, 800);
    } else {
      showAlert(data.message || 'Login failed.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
    }
  } catch (err) {
    showAlert('Network error. Failed to reach server.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign In';
  }
}

// Handle User Registration
async function handleRegister(e) {
  e.preventDefault();

  const role = document.getElementById('role').value;
  const fullName = document.getElementById('fullName').value.trim();
  const institutionalId = document.getElementById('institutionalId').value.trim();
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const department = document.getElementById('department').value.trim();
  const course = document.getElementById('course').value.trim();
  const semester = document.getElementById('semester').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const termsConsent = document.getElementById('termsConsent').checked;

  if (!role) {
    showAlert('Please select your user role.');
    document.getElementById('role').focus();
    return;
  }

  // 1. Full name verification (prevent digits and invalid characters)
  const nameCheck = checkFullName(fullName);
  if (!nameCheck.valid) {
    showAlert(nameCheck.message);
    document.getElementById('fullName').focus();
    return;
  }

  // 2. Institutional ID verification
  const instIdCheck = checkInstitutionalId(institutionalId);
  if (!instIdCheck.valid) {
    showAlert(instIdCheck.message);
    document.getElementById('institutionalId').focus();
    return;
  }

  // 3. Email verification
  const emailCheck = checkEmail(email);
  if (!emailCheck.valid) {
    showAlert(emailCheck.message);
    document.getElementById('email').focus();
    return;
  }

  // 4. Phone number verification (prevent wrong phone numbers)
  const phoneCheck = checkPhone(phone);
  if (!phoneCheck.valid) {
    showAlert(phoneCheck.message);
    document.getElementById('phone').focus();
    return;
  }

  // 5. Department verification (letters and spaces only)
  const deptCheck = checkDepartment(department);
  if (!deptCheck.valid) {
    showAlert(deptCheck.message);
    document.getElementById('department').focus();
    return;
  }

  // 6. Course verification (applicable to Student)
  if (role === 'Student' && course) {
    const courseCheck = checkCourse(course);
    if (!courseCheck.valid) {
      showAlert(courseCheck.message);
      document.getElementById('course').focus();
      return;
    }
  }

  // 7. Semester verification (applicable to Student)
  if (role === 'Student' && semester) {
    const semCheck = checkSemester(semester);
    if (!semCheck.valid) {
      showAlert(semCheck.message);
      document.getElementById('semester').focus();
      return;
    }
  }

  // 8. Password strength verification
  const pwCheck = checkPasswordStrength(password);
  if (!pwCheck.valid) {
    showAlert('Password does not meet all security requirements. Please verify the checklist below.');
    document.getElementById('password').focus();
    return;
  }

  // 9. Password match confirmation
  if (password !== confirmPassword) {
    showAlert('Passwords do not match. Please verify and re-enter your password.');
    document.getElementById('confirmPassword').focus();
    return;
  }

  // 10. Terms consent
  if (!termsConsent) {
    showAlert('You must accept the terms of use to register.');
    return;
  }

  const submitBtn = document.getElementById('registerSubmitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Verifying & Creating Account...';

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role,
        full_name: fullName,
        institutional_id: institutionalId,
        email,
        phone,
        department,
        course: role === 'Student' && course ? course : null,
        semester: role === 'Student' && semester ? semester : null,
        password
      })
    });

    const data = await res.json();

    if (data.success) {
      showAlert('Account verified and created successfully! Redirecting to login...', 'success');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1200);
    } else {
      showAlert(data.message || 'Registration failed.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account';
    }
  } catch (err) {
    showAlert('Network error. Failed to reach server.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Account';
  }
}

// Handle Logout
async function handleLogout() {
  try {
    const res = await fetch('/api/auth/logout', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      window.location.href = 'login.html';
    }
  } catch (err) {
    window.location.href = 'login.html';
  }
}

// Check Current Session
async function checkSession() {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();

    if (!data.success || !data.user) {
      window.location.href = 'login.html';
      return;
    }

    const user = data.user;
    window.currentUser = user;

    // Admin redirect if on portal page or user access on admin page
    if (window.location.pathname.endsWith('admin.html') && user.role !== 'Administrator') {
      window.location.href = 'portal.html';
      return;
    }

    // Populate user headers
    const userGreeting = document.getElementById('userGreeting');
    if (userGreeting) {
      userGreeting.innerHTML = `<span>👤</span> <strong>${escapeHtml(user.full_name)}</strong> <span class="badge ${user.role === 'Student' ? 'badge-published' : user.role === 'Faculty' ? 'badge-valuable' : 'badge-secondary'}" style="font-size: 0.72rem; padding: 2px 7px;">${user.role}</span>`;
    }

    // Populate dashboard welcome banner
    const dashWelcomeName = document.getElementById('dashWelcomeName');
    const dashWelcomeSub = document.getElementById('dashWelcomeSub');
    if (dashWelcomeName) {
      dashWelcomeName.textContent = `Welcome back, ${user.full_name}!`;
    }
    if (dashWelcomeSub) {
      dashWelcomeSub.textContent = `${user.role} • ${user.department || 'Campus Member'} • ID: ${user.institutional_id}`;
    }

    // Display Admin Panel Link for Administrator role
    const adminLink = document.getElementById('adminPanelLink');
    if (adminLink && user.role === 'Administrator') {
      adminLink.style.display = 'inline-flex';
    }

    const adminGreeting = document.getElementById('adminGreeting');
    if (adminGreeting) {
      adminGreeting.innerHTML = `Admin: <strong>${escapeHtml(user.full_name)}</strong>`;
    }

    // Populate profile form if on portal.html
    populateProfileForm(user);

    // Initial fetch of unread notifications & start polling
    fetchNotificationsCount();
    setInterval(fetchNotificationsCount, 20000);
  } catch (err) {
    console.error('Session check error:', err);
  }
}

function populateProfileForm(user) {
  const nameInput = document.getElementById('profileFullName');
  const instIdInput = document.getElementById('profileInstId');
  const emailInput = document.getElementById('profileEmail');
  const phoneInput = document.getElementById('profilePhone');
  const deptInput = document.getElementById('profileDept');
  const courseInput = document.getElementById('profileCourse');
  const semInput = document.getElementById('profileSemester');

  if (nameInput) nameInput.value = user.full_name || '';
  if (instIdInput) instIdInput.value = user.institutional_id || '';
  if (emailInput) emailInput.value = user.email || '';
  if (phoneInput) phoneInput.value = user.phone || '';
  if (deptInput) deptInput.value = user.department || '';
  if (courseInput) courseInput.value = user.course || '';
  if (semInput) semInput.value = user.semester || '';
}

// Handle Profile Update
async function handleProfileUpdate(e) {
  e.preventDefault();
  const full_name = document.getElementById('profileFullName').value.trim();
  const phone = document.getElementById('profilePhone').value.trim();
  const department = document.getElementById('profileDept').value.trim();
  const course = document.getElementById('profileCourse').value.trim();
  const semester = document.getElementById('profileSemester').value.trim();

  // Validate full name
  const nameCheck = checkFullName(full_name);
  if (!nameCheck.valid) {
    showAlert(nameCheck.message, 'danger', 'portalAlertContainer');
    document.getElementById('profileFullName').focus();
    return;
  }

  // Validate phone number
  const phoneCheck = checkPhone(phone);
  if (!phoneCheck.valid) {
    showAlert(phoneCheck.message, 'danger', 'portalAlertContainer');
    document.getElementById('profilePhone').focus();
    return;
  }

  // Validate department
  const deptCheck = checkDepartment(department);
  if (!deptCheck.valid) {
    showAlert(deptCheck.message, 'danger', 'portalAlertContainer');
    document.getElementById('profileDept').focus();
    return;
  }

  // Validate course
  if (course) {
    const courseCheck = checkCourse(course);
    if (!courseCheck.valid) {
      showAlert(courseCheck.message, 'danger', 'portalAlertContainer');
      document.getElementById('profileCourse').focus();
      return;
    }
  }

  // Validate semester
  if (semester) {
    const semCheck = checkSemester(semester);
    if (!semCheck.valid) {
      showAlert(semCheck.message, 'danger', 'portalAlertContainer');
      document.getElementById('profileSemester').focus();
      return;
    }
  }

  try {
    const res = await fetch('/api/users/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name, phone, department, course, semester })
    });

    const data = await res.json();
    if (data.success) {
      showAlert('Profile verified and updated successfully!', 'success', 'portalAlertContainer');
    } else {
      showAlert(data.message || 'Profile update failed.', 'danger', 'portalAlertContainer');
    }
  } catch (err) {
    showAlert('Server error updating profile.', 'danger', 'portalAlertContainer');
  }
}

// Handle Password Change
async function handlePasswordChange(e) {
  e.preventDefault();
  const current_password = document.getElementById('currentPassword').value;
  const new_password = document.getElementById('newPassword').value;
  const confirmNewPassword = document.getElementById('confirmNewPassword').value;

  const pwCheck = checkPasswordStrength(new_password);
  if (!pwCheck.valid) {
    showAlert('New password does not meet security requirements (8+ chars, uppercase, lowercase, number, special character).', 'danger', 'portalAlertContainer');
    return;
  }

  if (new_password !== confirmNewPassword) {
    showAlert('New passwords do not match.', 'danger', 'portalAlertContainer');
    return;
  }

  try {
    const res = await fetch('/api/users/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password, new_password })
    });

    const data = await res.json();
    if (data.success) {
      showAlert('Password updated successfully!', 'success', 'portalAlertContainer');
      document.getElementById('passwordForm').reset();
    } else {
      showAlert(data.message || 'Password update failed.', 'danger', 'portalAlertContainer');
    }
  } catch (err) {
    showAlert('Server error changing password.', 'danger', 'portalAlertContainer');
  }
}

// ---------------------------------------------------------
// FORGOT PASSWORD MODAL HANDLERS (FR-21)
// ---------------------------------------------------------
function openForgotModal() {
  const modal = document.getElementById('forgotPasswordModal');
  if (modal) modal.classList.add('active');
}

function closeForgotModal() {
  const modal = document.getElementById('forgotPasswordModal');
  if (modal) modal.classList.remove('active');
}

async function handleForgotPassword(e) {
  e.preventDefault();
  const email = document.getElementById('resetEmail').value.trim();
  const institutional_id = document.getElementById('resetInstId').value.trim();
  const new_password = document.getElementById('resetNewPassword').value;
  const alertContainer = document.getElementById('forgotAlertContainer');

  const pwCheck = checkPasswordStrength(new_password);
  if (!pwCheck.valid) {
    if (alertContainer) {
      alertContainer.innerHTML = `
        <div class="alert alert-danger">
          <span>⚠️</span><div>Password must be at least 8 chars with uppercase, lowercase, number, and special character.</div>
        </div>
      `;
    }
    return;
  }

  try {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, institutional_id, new_password })
    });

    const data = await res.json();
    if (data.success) {
      if (alertContainer) {
        alertContainer.innerHTML = `
          <div class="alert alert-success">
            <span>✅</span><div>${data.message}</div>
          </div>
        `;
      }
      setTimeout(() => {
        closeForgotModal();
        const idInput = document.getElementById('identifier');
        if (idInput) idInput.value = email;
      }, 1500);
    } else {
      if (alertContainer) {
        alertContainer.innerHTML = `
          <div class="alert alert-danger">
            <span>⚠️</span><div>${data.message || 'Password reset failed.'}</div>
          </div>
        `;
      }
    }
  } catch (err) {
    if (alertContainer) {
      alertContainer.innerHTML = `
        <div class="alert alert-danger">
          <span>⚠️</span><div>Network error during password reset.</div>
        </div>
      `;
    }
  }
}

// ---------------------------------------------------------
// NOTIFICATIONS MODULE (INCREMENT 4)
// ---------------------------------------------------------
async function fetchNotificationsCount() {
  try {
    const res = await fetch('/api/notifications');
    const data = await res.json();
    if (data.success) {
      const count = data.unreadCount || 0;
      const navBadge = document.getElementById('navNotifBadge');
      const tabBadge = document.getElementById('notifTabBadge');

      if (navBadge) {
        if (count > 0) {
          navBadge.textContent = count;
          navBadge.style.display = 'flex';
        } else {
          navBadge.style.display = 'none';
        }
      }

      if (tabBadge) {
        if (count > 0) {
          tabBadge.textContent = count;
          tabBadge.style.display = 'inline-block';
        } else {
          tabBadge.style.display = 'none';
        }
      }
    }
  } catch (err) {
    // Silent catch for background notification poll
  }
}

async function loadNotifications() {
  const container = document.getElementById('notificationsContainer');
  if (!container) return;

  container.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 40px;">Loading notifications...</div>';

  try {
    const res = await fetch('/api/notifications');
    const data = await res.json();

    if (data.success) {
      const list = data.notifications || [];
      if (list.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; color: var(--text-muted); padding: 50px 20px;">
            <div style="font-size: 2.5rem; margin-bottom: 12px;">🔕</div>
            <h4>No Notifications Yet</h4>
            <p style="font-size: 0.9rem; color: var(--text-dim); margin-top: 6px;">
              You will be notified here when someone claims your found item, when a potential match is found, or when an administrator updates your post.
            </p>
          </div>
        `;
        return;
      }

      container.innerHTML = '';
      list.forEach(notif => {
        const item = document.createElement('div');
        item.className = `notif-item ${notif.is_read ? '' : 'unread'}`;

        let icon = '🔔';
        if (notif.type === 'POTENTIAL_MATCH') icon = '🎯';
        else if (notif.type === 'CLAIM_APPROVED' || notif.type === 'VALUABLE_APPROVED') icon = '✅';
        else if (notif.type === 'CLAIM_REJECTED' || notif.type === 'VALUABLE_REJECTED' || notif.type === 'POST_REMOVED') icon = '⚠️';
        else if (notif.type === 'ITEM_RETURNED') icon = '📦';

        item.innerHTML = `
          <div style="font-size: 1.5rem;">${icon}</div>
          <div class="notif-content">
            <div class="notif-title">${escapeHtml(notif.message)}</div>
            <div class="notif-time">${new Date(notif.created_at).toLocaleString()}</div>
          </div>
          <div>
            ${!notif.is_read ? `
              <button class="btn btn-secondary btn-sm" onclick="markNotificationRead(${notif.notification_id})" style="font-size: 0.78rem;">
                Mark Read
              </button>
            ` : '<span style="font-size: 0.78rem; color: var(--text-dim);">Read</span>'}
          </div>
        `;
        container.appendChild(item);
      });

      // Update badge counts
      fetchNotificationsCount();
    }
  } catch (err) {
    container.innerHTML = '<div class="alert alert-danger">Error loading notifications.</div>';
  }
}

async function markNotificationRead(id) {
  try {
    const res = await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
    const data = await res.json();
    if (data.success) {
      loadNotifications();
      fetchNotificationsCount();
    }
  } catch (err) {
    console.error('Failed to mark read:', err);
  }
}

async function markAllNotificationsRead() {
  try {
    const res = await fetch('/api/notifications/read-all', { method: 'PUT' });
    const data = await res.json();
    if (data.success) {
      loadNotifications();
      fetchNotificationsCount();
    }
  } catch (err) {
    console.error('Failed to mark all read:', err);
  }
}

