const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./database');
const { validateItemInput, validateTimeFormat, validateDescription } = require('./validators/itemValidator');
const { validateReportInput, validateReportTargetAndDuplicates, checkReportEligibility } = require('./validators/reportValidator');
const { validateClaimEligibility, validateClaimApprovalTransition } = require('./services/claimService');
const { requireAuth, requireAdmin } = require('./middleware/authMiddleware');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ---------------------------------------------------------
// MULTER FILE UPLOAD CONFIGURATION & VALIDATION
// ---------------------------------------------------------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'item-' + uniqueSuffix + ext);
  }
});

const fileFilter = function (req, file, cb) {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();

  if (allowedExtensions.includes(ext) && allowedMimeTypes.includes(mime)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid image file format. Only JPG, JPEG, PNG, and WebP images are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB maximum file size limit
  }
});

// ---------------------------------------------------------
// AUDIT & NOTIFICATION HELPER FUNCTIONS (INCREMENTS 3 & 4)
// ---------------------------------------------------------

/**
 * Record an administrative action into the audit_logs table (FR-132, FR-133, FR-134)
 */
async function logAudit(adminId, action, entityType, entityId, details) {
  try {
    await db.query(
      `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, details)
       VALUES (?, ?, ?, ?, ?)`,
      [adminId, action, entityType, entityId || null, details || null]
    );
  } catch (err) {
    console.error('Audit log creation error:', err.message);
  }
}

/**
 * Create an in-app notification record for a user (FR-98 to FR-104)
 */
async function createNotification(userId, type, message, relatedItemId = null, relatedClaimId = null) {
  try {
    await db.query(
      `INSERT INTO notifications (user_id, type, message, related_item_id, related_claim_id, is_read)
       VALUES (?, ?, ?, ?, ?, FALSE)`,
      [userId, type, message, relatedItemId || null, relatedClaimId || null]
    );
  } catch (err) {
    console.error('Notification creation error:', err.message);
  }
}

// validateItemInput is loaded from ./validators/itemValidator (Experiment 9 Modular Architecture)

/**
 * Rule-based matching engine between Lost and Found posts (FR-63 to FR-67)
 * Considers: category, title keywords, description, location keywords, date proximity.
 */
async function findMatchesForItem(itemId) {
  const items = await db.query(
    `SELECT i.*, c.category_name, u.full_name as owner_name 
     FROM items i 
     JOIN categories c ON i.category_id = c.category_id 
     JOIN users u ON i.user_id = u.user_id 
     WHERE i.item_id = ?`,
    [itemId]
  );
  if (items.length === 0) return [];
  const source = items[0];
  const oppositeType = source.post_type === 'LOST' ? 'FOUND' : 'LOST';

  // Find candidate items of opposite post_type that are published
  const candidates = await db.query(
    `SELECT i.*, c.category_name, u.full_name as owner_name, u.email as owner_email, img.file_path as primary_image
     FROM items i
     JOIN categories c ON i.category_id = c.category_id
     JOIN users u ON i.user_id = u.user_id
     LEFT JOIN (
       SELECT item_id, MIN(file_path) as file_path 
       FROM item_images 
       GROUP BY item_id
     ) img ON i.item_id = img.item_id
     WHERE i.post_type = ? AND i.status = 'Published' AND i.item_id != ?`,
    [oppositeType, itemId]
  );

  const tokenize = (text) => {
    if (!text) return [];
    return text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !['the','and','for','with','this','that','from','near','some'].includes(w));
  };

  const sourceTitleWords = tokenize(source.title);
  const sourceCharWords = tokenize(source.identifying_characteristics);
  const sourceLocWords = tokenize(source.location);

  const matches = [];

  for (const cand of candidates) {
    let score = 0;
    const reasons = [];

    // Category match: 35 points
    if (cand.category_id === source.category_id) {
      score += 35;
      reasons.push(`Same category (${source.category_name})`);
    }

    // Title keyword overlap: up to 30 points
    const candTitleWords = tokenize(cand.title);
    const titleCommon = sourceTitleWords.filter(w => candTitleWords.includes(w));
    if (titleCommon.length > 0) {
      const titleScore = Math.min(30, titleCommon.length * 15);
      score += titleScore;
      reasons.push(`Title keywords matched: "${titleCommon.join(', ')}"`);
    }

    // Location keyword overlap: up to 20 points
    const candLocWords = tokenize(cand.location);
    const locCommon = sourceLocWords.filter(w => candLocWords.includes(w));
    if (locCommon.length > 0) {
      const locScore = Math.min(20, locCommon.length * 10);
      score += locScore;
      reasons.push(`Location matched: "${locCommon.join(', ')}"`);
    }

    // Identifying characteristics overlap: up to 20 points
    const candCharWords = tokenize(cand.identifying_characteristics);
    const charCommon = sourceCharWords.filter(w => candCharWords.includes(w));
    if (charCommon.length > 0) {
      const charScore = Math.min(20, charCommon.length * 10);
      score += charScore;
      reasons.push(`Characteristics overlap: "${charCommon.join(', ')}"`);
    }

    // Date proximity: up to 15 points
    if (source.item_date && cand.item_date) {
      const d1 = new Date(source.item_date);
      const d2 = new Date(cand.item_date);
      const diffDays = Math.abs((d1 - d2) / (1000 * 60 * 60 * 24));
      if (diffDays <= 7) {
        score += 15;
        reasons.push('Dates within 7 days');
      } else if (diffDays <= 30) {
        score += 5;
        reasons.push('Dates within 30 days');
      }
    }

    if (score >= 35) {
      matches.push({
        item: cand,
        matchScore: Math.min(100, score),
        reasons
      });
    }
  }

  matches.sort((a, b) => b.matchScore - a.matchScore);
  return matches;
}

/**
 * Auto-archive inactive or returned items older than configured ARCHIVE_DAYS (FR-122 to FR-125)
 */
async function runAutoArchive(adminId = null) {
  const archiveDays = parseInt(process.env.ARCHIVE_DAYS || '60', 10);
  try {
    const candidateItems = await db.query(
      `SELECT item_id, title, status FROM items 
       WHERE status IN ('Published', 'Returned') 
       AND DATEDIFF(CURRENT_TIMESTAMP, created_at) >= ?`,
      [archiveDays]
    );

    if (candidateItems.length > 0) {
      const ids = candidateItems.map(i => i.item_id);
      const placeholders = ids.map(() => '?').join(',');
      await db.query(
        `UPDATE items SET status = 'Archived' WHERE item_id IN (${placeholders})`,
        ids
      );
      if (adminId) {
        await logAudit(
          adminId,
          'RUN_ARCHIVE',
          'Archive',
          null,
          `Archived ${candidateItems.length} records older than ${archiveDays} days.`
        );
      }
      return { success: true, count: candidateItems.length, archivedIds: ids };
    }
    return { success: true, count: 0, archivedIds: [] };
  } catch (err) {
    console.error('Auto-archiving error:', err);
    return { success: false, count: 0, error: err.message };
  }
}

// ---------------------------------------------------------
// MIDDLEWARE: AUTHENTICATION & AUTHORIZATION GUARDS
// ---------------------------------------------------------

// requireAuth and requireAdmin are loaded from ./middleware/authMiddleware (Experiment 9 Modular Architecture)

// ---------------------------------------------------------
// INPUT VALIDATION & VERIFICATION HELPERS (INCREMENT 1)
// ---------------------------------------------------------

function validatePasswordStrength(password) {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter.';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter.';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number.';
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return 'Password must contain at least one special character.';
  }
  return null;
}

function validateFullName(name) {
  if (!name || typeof name !== 'string') {
    return 'Full name is mandatory.';
  }
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return 'Full name must be at least 2 characters long.';
  }
  if (trimmed.length > 100) {
    return 'Full name cannot exceed 100 characters.';
  }
  if (/\d/.test(trimmed)) {
    return 'Full name cannot contain numbers or digits. Please enter a valid name with letters only.';
  }
  if (!/^[A-Za-z\s.'-]+$/.test(trimmed)) {
    return 'Full name can only contain letters, spaces, hyphens, periods, and apostrophes.';
  }
  const letterCount = (trimmed.match(/[A-Za-z]/g) || []).length;
  if (letterCount < 2) {
    return 'Full name must contain at least 2 alphabetic letters.';
  }
  return null;
}

function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return 'Phone number must contain exactly 10 digits.';
  }
  const trimmed = phone.trim();
  if (!/^\d{10}$/.test(trimmed)) {
    return 'Phone number must contain exactly 10 digits.';
  }
  return null;
}

function validateInstitutionalId(id) {
  if (!id || typeof id !== 'string') {
    return 'Institutional ID is mandatory.';
  }
  const trimmed = id.trim();
  if (trimmed.length < 3 || trimmed.length > 30) {
    return 'Institutional ID must be between 3 and 30 characters.';
  }
  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) {
    return 'Institutional ID must contain only letters, numbers, hyphens, or underscores without spaces.';
  }
  return null;
}

function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return 'Email address is mandatory.';
  }
  const trimmed = email.trim();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed) || trimmed.length > 100) {
    return 'Please provide a valid email address (e.g. name@college.edu).';
  }
  return null;
}

function validateDepartment(dept) {
  if (!dept || typeof dept !== 'string') {
    return 'Department is mandatory.';
  }
  const trimmed = dept.trim();
  if (trimmed.length === 0) {
    return 'Department is mandatory.';
  }
  if (!/^[A-Za-z\s]+$/.test(trimmed)) {
    return 'Department must contain letters only.';
  }
  if (trimmed.length < 2 || trimmed.length > 100) {
    return 'Department must be between 2 and 100 characters.';
  }
  return null;
}

function validateCourse(course) {
  if (course === undefined || course === null || course === '') {
    return null;
  }
  if (typeof course !== 'string') {
    return 'Course must contain letters only.';
  }
  const trimmed = course.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (!/^[A-Za-z\s]+$/.test(trimmed)) {
    return 'Course must contain letters only.';
  }
  if (trimmed.length < 2 || trimmed.length > 100) {
    return 'Course must be between 2 and 100 characters.';
  }
  return null;
}

function validateSemester(semester) {
  if (semester === undefined || semester === null || semester === '') {
    return null;
  }
  const str = String(semester).trim();
  if (str.length === 0) {
    return null;
  }
  if (!/^[1-8]$/.test(str)) {
    return 'Please enter a valid semester number between 1 and 8.';
  }
  return null;
}

// ---------------------------------------------------------
// 1. AUTHENTICATION & USER MANAGEMENT ENDPOINTS
// ---------------------------------------------------------

// POST /api/auth/register (FR-01 to FR-10)
router.post('/auth/register', async (req, res) => {
  try {
    const {
      full_name,
      email,
      phone,
      password,
      role,
      institutional_id,
      department,
      course,
      semester
    } = req.body;

    if (!full_name || !email || !phone || !password || !role || !institutional_id || !department) {
      return res.status(400).json({ success: false, message: 'Please fill in all mandatory fields.' });
    }

    const validRoles = ['Student', 'Faculty', 'Staff'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role selection. Choose Student, Faculty, or Staff.' });
    }

    const nameError = validateFullName(full_name);
    if (nameError) return res.status(400).json({ success: false, message: nameError });

    const phoneError = validatePhone(phone);
    if (phoneError) return res.status(400).json({ success: false, message: phoneError });

    const instIdError = validateInstitutionalId(institutional_id);
    if (instIdError) return res.status(400).json({ success: false, message: instIdError });

    const emailError = validateEmail(email);
    if (emailError) return res.status(400).json({ success: false, message: emailError });

    const deptError = validateDepartment(department);
    if (deptError) return res.status(400).json({ success: false, message: deptError });

    if (course !== undefined && course !== null && String(course).trim() !== '') {
      const courseError = validateCourse(course);
      if (courseError) return res.status(400).json({ success: false, message: courseError });
    }

    if (semester !== undefined && semester !== null && String(semester).trim() !== '') {
      const semesterError = validateSemester(semester);
      if (semesterError) return res.status(400).json({ success: false, message: semesterError });
    }

    const passwordError = validatePasswordStrength(password);
    if (passwordError) return res.status(400).json({ success: false, message: passwordError });

    // Check duplicate email or institutional ID (FR-04, FR-05)
    const existing = await db.query(
      'SELECT user_id, email, institutional_id FROM users WHERE email = ? OR institutional_id = ?',
      [email.toLowerCase().trim(), institutional_id.trim()]
    );

    if (existing.length > 0) {
      if (existing[0].email.toLowerCase() === email.toLowerCase().trim()) {
        return res.status(400).json({ success: false, message: 'An account with this email address already exists.' });
      }
      return res.status(400).json({ success: false, message: 'An account with this institutional ID already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const finalCourse = (role === 'Student' && course && typeof course === 'string' && course.trim()) ? course.trim() : null;
    const finalSemester = (role === 'Student' && semester !== undefined && semester !== null && String(semester).trim()) ? String(semester).trim() : null;

    const result = await db.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role, institutional_id, department, course, semester, account_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')`,
      [full_name.trim(), email.toLowerCase().trim(), phone.trim(), password_hash, role, institutional_id.trim(), department.trim(), finalCourse, finalSemester]
    );

    return res.status(201).json({
      success: true,
      message: 'Account created successfully! You can now log in.',
      userId: result.insertId
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ success: false, message: 'Server error during registration. Please try again.' });
  }
});

// POST /api/auth/login (FR-11 to FR-16)
router.post('/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Please provide your email/institutional ID and password.' });
    }

    const users = await db.query(
      'SELECT * FROM users WHERE email = ? OR institutional_id = ?',
      [identifier.toLowerCase().trim(), identifier.trim()]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email/ID or password.' });
    }

    const user = users[0];

    // Check if blocked (FR-20)
    if (user.account_status === 'Blocked') {
      return res.status(403).json({ success: false, message: 'Your account has been blocked due to portal policy violation.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email/ID or password.' });
    }

    req.session.user = {
      user_id: user.user_id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      institutional_id: user.institutional_id,
      department: user.department,
      course: user.course,
      semester: user.semester,
      account_status: user.account_status
    };

    return res.json({
      success: true,
      message: 'Login successful!',
      user: req.session.user
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// POST /api/auth/logout (FR-17)
router.post('/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Could not log out.' });
    }
    res.clearCookie('connect.sid');
    return res.json({ success: true, message: 'Logged out successfully.' });
  });
});

// GET /api/auth/me (FR-18)
router.get('/auth/me', (req, res) => {
  if (req.session && req.session.user) {
    return res.json({ success: true, user: req.session.user });
  }
  return res.json({ success: false, user: null });
});

// POST /api/auth/forgot-password (FR-21)
// Controlled identity-verified password reset flow for academic lab demo
router.post('/auth/forgot-password', async (req, res) => {
  try {
    const { email, institutional_id, new_password } = req.body;

    if (!email || !institutional_id || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide registered email, institutional ID, and a new password.'
      });
    }

    const passwordError = validatePasswordStrength(new_password);
    if (passwordError) {
      return res.status(400).json({ success: false, message: passwordError });
    }

    const users = await db.query(
      'SELECT user_id, account_status FROM users WHERE email = ? AND institutional_id = ?',
      [email.toLowerCase().trim(), institutional_id.trim()]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No matching user found with the provided email and institutional ID.'
      });
    }

    if (users[0].account_status === 'Blocked') {
      return res.status(403).json({
        success: false,
        message: 'Blocked accounts cannot reset passwords. Contact portal administrator.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(new_password, salt);

    await db.query('UPDATE users SET password_hash = ? WHERE user_id = ?', [password_hash, users[0].user_id]);

    return res.json({
      success: true,
      message: 'Password reset successful! You can now log in with your new password.'
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ success: false, message: 'Server error resetting password.' });
  }
});

// PUT /api/users/profile (FR-22 to FR-24)
router.put('/users/profile', requireAuth, async (req, res) => {
  try {
    const { full_name, phone, department, course, semester } = req.body;
    const userId = req.session.user.user_id;

    if (!full_name || !phone || !department) {
      return res.status(400).json({ success: false, message: 'Full name, phone, and department are mandatory.' });
    }

    const nameError = validateFullName(full_name);
    if (nameError) return res.status(400).json({ success: false, message: nameError });

    const phoneError = validatePhone(phone);
    if (phoneError) return res.status(400).json({ success: false, message: phoneError });

    const deptError = validateDepartment(department);
    if (deptError) return res.status(400).json({ success: false, message: deptError });

    if (course !== undefined && course !== null && String(course).trim() !== '') {
      const courseError = validateCourse(course);
      if (courseError) return res.status(400).json({ success: false, message: courseError });
    }

    if (semester !== undefined && semester !== null && String(semester).trim() !== '') {
      const semesterError = validateSemester(semester);
      if (semesterError) return res.status(400).json({ success: false, message: semesterError });
    }

    await db.query(
      `UPDATE users SET full_name = ?, phone = ?, department = ?, course = ?, semester = ? WHERE user_id = ?`,
      [full_name.trim(), phone.trim(), department.trim(), course ? course.trim() : null, semester ? semester.trim() : null, userId]
    );

    req.session.user.full_name = full_name.trim();
    req.session.user.phone = phone.trim();
    req.session.user.department = department.trim();
    req.session.user.course = course ? course.trim() : null;
    req.session.user.semester = semester ? semester.trim() : null;

    return res.json({ success: true, message: 'Profile updated successfully.', user: req.session.user });
  } catch (err) {
    console.error('Profile update error:', err);
    return res.status(500).json({ success: false, message: 'Server error updating profile.' });
  }
});

// PUT /api/users/password (FR-25)
router.put('/users/password', requireAuth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const userId = req.session.user.user_id;

    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, message: 'Please provide both current and new passwords.' });
    }

    const passwordError = validatePasswordStrength(new_password);
    if (passwordError) return res.status(400).json({ success: false, message: passwordError });

    const users = await db.query('SELECT password_hash FROM users WHERE user_id = ?', [userId]);
    if (users.length === 0) return res.status(404).json({ success: false, message: 'User not found.' });

    const isMatch = await bcrypt.compare(current_password, users[0].password_hash);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Incorrect current password.' });

    const salt = await bcrypt.genSalt(10);
    const new_password_hash = await bcrypt.hash(new_password, salt);

    await db.query('UPDATE users SET password_hash = ? WHERE user_id = ?', [new_password_hash, userId]);

    return res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Password change error:', err);
    return res.status(500).json({ success: false, message: 'Server error changing password.' });
  }
});

// ---------------------------------------------------------
// 2. CATEGORIES ENDPOINT
// ---------------------------------------------------------
router.get('/categories', async (req, res) => {
  try {
    const categories = await db.query('SELECT * FROM categories WHERE is_active = TRUE ORDER BY category_name ASC');
    return res.json({ success: true, categories });
  } catch (err) {
    console.error('Fetch categories error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch categories.' });
  }
});

// ---------------------------------------------------------
// 3. ITEM POSTING, SEARCH & MANAGEMENT ENDPOINTS
// ---------------------------------------------------------

// GET /api/items/check-duplicate - Check for duplicate posts (FR-39)
router.get('/items/check-duplicate', requireAuth, async (req, res) => {
  try {
    const { title, category_id, post_type } = req.query;
    if (!title || !category_id) {
      return res.json({ success: true, hasDuplicate: false, duplicates: [] });
    }

    const duplicates = await db.query(
      `SELECT item_id, title, location, item_date, status, post_type 
       FROM items 
       WHERE category_id = ? AND post_type = ? AND status IN ('Published', 'Pending Approval')
       AND (title LIKE ? OR description LIKE ?)
       LIMIT 5`,
      [category_id, post_type || 'LOST', `%${title.trim()}%`, `%${title.trim()}%`]
    );

    return res.json({
      success: true,
      hasDuplicate: duplicates.length > 0,
      duplicates
    });
  } catch (err) {
    console.error('Duplicate check error:', err);
    return res.status(500).json({ success: false, message: 'Server error checking duplicates.' });
  }
});

// POST /api/items - Submit a Lost or Found item post (FR-27 to FR-53)
router.post('/items', requireAuth, (req, res) => {
  upload.single('item_image')(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'Uploaded file exceeds the maximum 5MB size limit.' });
      }
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    try {
      const {
        post_type,
        category_id,
        title,
        description,
        item_date,
        location,
        approximate_time,
        identifying_characteristics,
        is_valuable
      } = req.body;

      if (!post_type || !item_date) {
        return res.status(400).json({ success: false, message: 'Post type and item date are required.' });
      }

      if (!['LOST', 'FOUND'].includes(post_type)) {
        return res.status(400).json({ success: false, message: 'Post type must be LOST or FOUND.' });
      }

      const validation = validateItemInput({
        title,
        category_id,
        location,
        identifying_characteristics,
        description,
        approximate_time
      });

      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.message });
      }

      const userId = req.session.user.user_id;
      const isValuable = (is_valuable === 'true' || is_valuable === true || is_valuable === '1');

      // Valuable items require administrator review before publication (FR-37, FR-50)
      const status = isValuable ? 'Pending Approval' : 'Published';
      const approval_status = isValuable ? 'Pending' : 'Approved';

      const result = await db.query(
        `INSERT INTO items 
         (post_type, user_id, category_id, title, description, item_date, location, approximate_time, identifying_characteristics, is_valuable, status, approval_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          post_type,
          userId,
          category_id,
          title.trim(),
          description.trim(),
          item_date,
          location.trim(),
          approximate_time ? approximate_time.trim() : null,
          identifying_characteristics.trim(),
          isValuable,
          status,
          approval_status
        ]
      );

      const itemId = result.insertId;

      if (req.file) {
        const relativePath = '/uploads/' + req.file.filename;
        await db.query(
          `INSERT INTO item_images (item_id, file_path, original_name, mime_type, file_size)
           VALUES (?, ?, ?, ?, ?)`,
          [itemId, relativePath, req.file.originalname, req.file.mimetype, req.file.size]
        );
      }

      // If normal item, it's auto-published: run matching check & notify users if potential match detected (FR-63, FR-99)
      if (!isValuable) {
        try {
          const matches = await findMatchesForItem(itemId);
          for (const m of matches) {
            if (m.matchScore >= 45) {
              // Notify current user
              await createNotification(
                userId,
                'POTENTIAL_MATCH',
                `Potential match found (${m.matchScore}%): "${m.item.title}" matches your recent ${post_type.toLowerCase()} post "${title}".`,
                m.item.item_id
              );
              // Notify owner of candidate item
              await createNotification(
                m.item.user_id,
                'POTENTIAL_MATCH',
                `A new ${post_type.toLowerCase()} post "${title}" potentially matches your listed item "${m.item.title}".`,
                itemId
              );
            }
          }
        } catch (matchErr) {
          console.error('Match notification error on posting:', matchErr);
        }
      }

      const message = isValuable
        ? 'Your valuable item post has been submitted and is pending administrator approval before publication.'
        : 'Item post published successfully!';

      return res.status(201).json({
        success: true,
        message,
        itemId,
        isValuable
      });
    } catch (dbErr) {
      console.error('Item posting error:', dbErr);
      return res.status(500).json({ success: false, message: 'Server error while saving item post.' });
    }
  });
});

// GET /api/items - Search and Filter published items (FR-54 to FR-62)
router.get('/items', requireAuth, async (req, res) => {
  try {
    const { q, category_id, location, date_from, date_to, post_type } = req.query;

    let sql = `
      SELECT 
        i.item_id, i.post_type, i.title, i.description, i.item_date, i.location,
        i.approximate_time, i.identifying_characteristics, i.is_valuable, i.status, i.created_at,
        c.category_name,
        u.user_id as owner_id, u.full_name as owner_name, u.department as owner_department,
        img.file_path as primary_image
      FROM items i
      JOIN categories c ON i.category_id = c.category_id
      JOIN users u ON i.user_id = u.user_id
      LEFT JOIN (
        SELECT item_id, MIN(file_path) as file_path 
        FROM item_images 
        GROUP BY item_id
      ) img ON i.item_id = img.item_id
      WHERE i.status = 'Published'
    `;

    const params = [];

    if (post_type && ['LOST', 'FOUND'].includes(post_type.toUpperCase())) {
      sql += ' AND i.post_type = ?';
      params.push(post_type.toUpperCase());
    }

    if (category_id && category_id !== 'all') {
      sql += ' AND i.category_id = ?';
      params.push(category_id);
    }

    if (location && location.trim() !== '') {
      sql += ' AND i.location LIKE ?';
      params.push(`%${location.trim()}%`);
    }

    if (date_from) {
      sql += ' AND i.item_date >= ?';
      params.push(date_from);
    }

    if (date_to) {
      sql += ' AND i.item_date <= ?';
      params.push(date_to);
    }

    if (q && q.trim() !== '') {
      const searchTerm = `%${q.trim()}%`;
      sql += ' AND (i.title LIKE ? OR i.description LIKE ? OR i.identifying_characteristics LIKE ? OR i.location LIKE ?)';
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    sql += ' ORDER BY i.created_at DESC';

    const items = await db.query(sql, params);
    return res.json({ success: true, items });
  } catch (err) {
    console.error('Search items error:', err);
    return res.status(500).json({ success: false, message: 'Server error during item search.' });
  }
});

// GET /api/items/my/posts - Retrieve logged-in user's own items (FR-118)
router.get('/items/my/posts', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.user_id;

    const items = await db.query(
      `SELECT 
        i.item_id, i.post_type, i.title, i.description, i.item_date, i.location,
        i.approximate_time, i.identifying_characteristics, i.is_valuable, i.status, i.approval_status, i.created_at,
        c.category_name,
        img.file_path as primary_image
       FROM items i
       JOIN categories c ON i.category_id = c.category_id
       LEFT JOIN (
         SELECT item_id, MIN(file_path) as file_path 
         FROM item_images 
         GROUP BY item_id
       ) img ON i.item_id = img.item_id
       WHERE i.user_id = ?
       ORDER BY i.created_at DESC`,
      [userId]
    );

    return res.json({ success: true, items });
  } catch (err) {
    console.error('Fetch my posts error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch your posts.' });
  }
});

// GET /api/items/:id - View details of a specific item (FR-61)
router.get('/items/:id', requireAuth, async (req, res) => {
  try {
    const itemId = req.params.id;

    const items = await db.query(
      `SELECT 
        i.*,
        c.category_name,
        u.user_id as owner_id, u.full_name as owner_name, u.department as owner_department
       FROM items i
       JOIN categories c ON i.category_id = c.category_id
       JOIN users u ON i.user_id = u.user_id
       WHERE i.item_id = ?`,
      [itemId]
    );

    if (items.length === 0) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    const item = items[0];
    const images = await db.query('SELECT * FROM item_images WHERE item_id = ?', [itemId]);

    return res.json({
      success: true,
      item,
      images
    });
  } catch (err) {
    console.error('Fetch item detail error:', err);
    return res.status(500).json({ success: false, message: 'Server error loading item details.' });
  }
});

// PUT /api/items/:id - Edit own post (FR-40, FR-51, FR-119)
router.put('/items/:id', requireAuth, async (req, res) => {
  try {
    const itemId = req.params.id;
    const userId = req.session.user.user_id;
    const { title, description, category_id, location, item_date, approximate_time, identifying_characteristics } = req.body;

    const items = await db.query('SELECT user_id, status FROM items WHERE item_id = ?', [itemId]);
    if (items.length === 0) {
      return res.status(404).json({ success: false, message: 'Item post not found.' });
    }

    if (items[0].user_id !== userId && req.session.user.role !== 'Administrator') {
      return res.status(403).json({ success: false, message: 'You are not authorized to edit this post.' });
    }

    if (!item_date) {
      return res.status(400).json({ success: false, message: 'Item date is required.' });
    }

    const validation = validateItemInput({
      title,
      category_id,
      location,
      identifying_characteristics,
      description,
      approximate_time
    });

    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    await db.query(
      `UPDATE items SET 
        title = ?, description = ?, category_id = ?, location = ?, item_date = ?, approximate_time = ?, identifying_characteristics = ?
       WHERE item_id = ?`,
      [
        title.trim(),
        description.trim(),
        category_id,
        location.trim(),
        item_date,
        approximate_time ? approximate_time.trim() : null,
        identifying_characteristics.trim(),
        itemId
      ]
    );

    return res.json({ success: true, message: 'Item updated successfully.' });
  } catch (err) {
    console.error('Edit item error:', err);
    return res.status(500).json({ success: false, message: 'Server error updating item.' });
  }
});

// DELETE /api/items/:id - Delete own post (FR-41, FR-52, FR-120)
router.delete('/items/:id', requireAuth, async (req, res) => {
  try {
    const itemId = req.params.id;
    const userId = req.session.user.user_id;

    const items = await db.query('SELECT user_id FROM items WHERE item_id = ?', [itemId]);
    if (items.length === 0) {
      return res.status(404).json({ success: false, message: 'Item post not found.' });
    }

    if (items[0].user_id !== userId && req.session.user.role !== 'Administrator') {
      return res.status(403).json({ success: false, message: 'You are not authorized to delete this post.' });
    }

    // Remove associated image files
    const images = await db.query('SELECT file_path FROM item_images WHERE item_id = ?', [itemId]);
    for (const img of images) {
      const fullPath = path.join(__dirname, '..', img.file_path);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    await db.query('DELETE FROM items WHERE item_id = ?', [itemId]);

    return res.json({ success: true, message: 'Item post deleted successfully.' });
  } catch (err) {
    console.error('Delete item error:', err);
    return res.status(500).json({ success: false, message: 'Server error deleting item.' });
  }
});

// PUT /api/items/:id/resolve - Mark own lost/found item as returned / resolved (FR-42, FR-84)
router.put('/items/:id/resolve', requireAuth, async (req, res) => {
  try {
    const itemId = req.params.id;
    const userId = req.session.user.user_id;

    const items = await db.query('SELECT user_id FROM items WHERE item_id = ?', [itemId]);
    if (items.length === 0) {
      return res.status(404).json({ success: false, message: 'Item post not found.' });
    }

    if (items[0].user_id !== userId && req.session.user.role !== 'Administrator') {
      return res.status(403).json({ success: false, message: 'You are not authorized to update this post.' });
    }

    await db.query(
      `UPDATE items SET status = 'Returned', resolved_at = CURRENT_TIMESTAMP WHERE item_id = ?`,
      [itemId]
    );

    return res.json({ success: true, message: 'Item marked as resolved/returned successfully.' });
  } catch (err) {
    console.error('Resolve item error:', err);
    return res.status(500).json({ success: false, message: 'Server error marking item resolved.' });
  }
});

// PUT /api/items/:id/return - Confirm item return (owner or admin) (FR-80, FR-81)
router.put('/items/:id/return', requireAuth, async (req, res) => {
  try {
    const itemId = req.params.id;
    const userId = req.session.user.user_id;

    const items = await db.query('SELECT user_id, title, status FROM items WHERE item_id = ?', [itemId]);
    if (items.length === 0) {
      return res.status(404).json({ success: false, message: 'Item post not found.' });
    }

    if (items[0].user_id !== userId && req.session.user.role !== 'Administrator') {
      return res.status(403).json({ success: false, message: 'You are not authorized to mark this item returned.' });
    }

    await db.query(
      `UPDATE items SET status = 'Returned', resolved_at = CURRENT_TIMESTAMP WHERE item_id = ?`,
      [itemId]
    );

    // Notify claimants of item return completion (FR-83)
    const approvedClaims = await db.query('SELECT claimant_id FROM claims WHERE item_id = ? AND status = "Approved"', [itemId]);
    for (const c of approvedClaims) {
      await createNotification(
        c.claimant_id,
        'ITEM_RETURNED',
        `Item "${items[0].title}" handover is complete and marked as Returned!`,
        itemId
      );
    }

    return res.json({ success: true, message: 'Item confirmed as returned and resolved.' });
  } catch (err) {
    console.error('Item return error:', err);
    return res.status(500).json({ success: false, message: 'Server error marking item returned.' });
  }
});

// ---------------------------------------------------------
// 4. SMART MATCHING MODULE (INCREMENT 4)
// ---------------------------------------------------------

// GET /api/items/:id/matches - Find potential matches for an item (FR-63 to FR-67)
router.get('/items/:id/matches', requireAuth, async (req, res) => {
  try {
    const itemId = req.params.id;
    const matches = await findMatchesForItem(itemId);
    return res.json({ success: true, matches });
  } catch (err) {
    console.error('Matching engine error:', err);
    return res.status(500).json({ success: false, message: 'Server error finding potential matches.' });
  }
});

// GET /api/items/matches/my - Retrieve all potential matches across current user's active posts (FR-65)
router.get('/items/matches/my', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const userPosts = await db.query(
      `SELECT item_id, title, post_type, location, item_date, status 
       FROM items 
       WHERE user_id = ? AND status IN ('Published', 'Pending Approval')`,
      [userId]
    );

    const results = [];
    for (const post of userPosts) {
      const postMatches = await findMatchesForItem(post.item_id);
      if (postMatches.length > 0) {
        results.push({
          myPost: post,
          matches: postMatches
        });
      }
    }

    return res.json({ success: true, allMatches: results });
  } catch (err) {
    console.error('Fetch my matches error:', err);
    return res.status(500).json({ success: false, message: 'Server error calculating matches.' });
  }
});

// ---------------------------------------------------------
// 5. CLAIMS MANAGEMENT & VERIFICATION (INCREMENT 2)
// ---------------------------------------------------------

// POST /api/items/:id/claim - Submit a claim for an item (FR-68 to FR-72)
router.post('/items/:id/claim', requireAuth, (req, res) => {
  upload.single('evidence_image')(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'Evidence file exceeds maximum 5MB size limit.' });
      }
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    try {
      const itemId = req.params.id;
      const userId = req.session.user.user_id;
      const { reason, ownership_evidence } = req.body;

      if (!reason || !reason.trim() || !ownership_evidence || !ownership_evidence.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Both claim reason and ownership evidence description are required.'
        });
      }

      const items = await db.query('SELECT item_id, user_id, title, status, post_type FROM items WHERE item_id = ?', [itemId]);
      if (items.length === 0) {
        return res.status(404).json({ success: false, message: 'Item not found.' });
      }

      const item = items[0];

      // Prevent users from claiming their own post
      if (item.user_id === userId) {
        return res.status(400).json({
          success: false,
          message: 'You cannot submit a claim for an item that you posted.'
        });
      }

      // Prevent claims on returned items (FR-82)
      if (item.status === 'Returned') {
        return res.status(400).json({
          success: false,
          message: 'This item has already been marked as returned and is no longer accepting claims.'
        });
      }

      if (item.status === 'Claimed') {
        return res.status(400).json({
          success: false,
          message: 'This item has already been claimed and is undergoing handover.'
        });
      }

      if (item.status !== 'Published') {
        return res.status(400).json({
          success: false,
          message: `Cannot claim item with status '${item.status}'. Only published items can be claimed.`
        });
      }

      // Prevent duplicate active claims from the same claimant (FR-71)
      const existingClaims = await db.query(
        `SELECT claim_id, status FROM claims 
         WHERE item_id = ? AND claimant_id = ? AND status IN ('Pending', 'Under Verification', 'Approved')`,
        [itemId, userId]
      );

      if (existingClaims.length > 0) {
        return res.status(400).json({
          success: false,
          message: `You already have an active claim (${existingClaims[0].status}) for this item.`
        });
      }

      const evidenceFilePath = req.file ? '/uploads/' + req.file.filename : null;

      const result = await db.query(
        `INSERT INTO claims (item_id, claimant_id, reason, ownership_evidence, evidence_file_path, status)
         VALUES (?, ?, ?, ?, ?, 'Pending')`,
        [itemId, userId, reason.trim(), ownership_evidence.trim(), evidenceFilePath]
      );

      const claimId = result.insertId;

      // Notify the item poster of a new incoming claim (FR-100)
      await createNotification(
        item.user_id,
        'CLAIM_SUBMITTED',
        `A new ownership claim has been submitted for your found item: "${item.title}".`,
        itemId,
        claimId
      );

      return res.status(201).json({
        success: true,
        message: 'Your claim has been submitted successfully and is pending administrator verification.',
        claimId
      });
    } catch (dbErr) {
      console.error('Submit claim error:', dbErr);
      return res.status(500).json({ success: false, message: 'Server error while submitting claim.' });
    }
  });
});

// GET /api/claims/my - View current user's submitted claims (FR-78)
router.get('/claims/my', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.user_id;

    const claims = await db.query(
      `SELECT 
        c.claim_id, c.item_id, c.reason, c.ownership_evidence, c.evidence_file_path,
        c.status, c.status as claim_status, c.verification_notes, c.submitted_at, c.updated_at,
        i.title as item_title, i.post_type, i.location as item_location, i.item_date,
        i.status as item_status, i.is_valuable, i.resolved_at,
        cat.category_name,
        u.full_name as poster_name, u.department as poster_department
       FROM claims c
       JOIN items i ON c.item_id = i.item_id
       JOIN categories cat ON i.category_id = cat.category_id
       JOIN users u ON i.user_id = u.user_id
       WHERE c.claimant_id = ?
       ORDER BY c.submitted_at DESC`,
      [userId]
    );

    return res.json({ success: true, claims });
  } catch (err) {
    console.error('Fetch my claims error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve your claims.' });
  }
});

// PUT /api/claims/:id/cancel - Cancel own pending claim (FR-79)
router.put('/claims/:id/cancel', requireAuth, async (req, res) => {
  try {
    const claimId = req.params.id;
    const userId = req.session.user.user_id;

    const claims = await db.query('SELECT * FROM claims WHERE claim_id = ?', [claimId]);
    if (claims.length === 0) {
      return res.status(404).json({ success: false, message: 'Claim not found.' });
    }

    const claim = claims[0];

    if (claim.claimant_id !== userId && req.session.user.role !== 'Administrator') {
      return res.status(403).json({ success: false, message: 'You are not authorized to cancel this claim.' });
    }

    if (claim.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel claim with status '${claim.status}'. Only pending claims can be cancelled.`
      });
    }

    await db.query(`UPDATE claims SET status = 'Cancelled' WHERE claim_id = ?`, [claimId]);

    return res.json({ success: true, message: 'Claim has been cancelled successfully.' });
  } catch (err) {
    console.error('Cancel claim error:', err);
    return res.status(500).json({ success: false, message: 'Server error cancelling claim.' });
  }
});

// ---------------------------------------------------------
// 6. VALUABLE ITEM APPROVAL (INCREMENT 3)
// ---------------------------------------------------------

// GET /api/admin/valuable-items - View pending valuable posts (FR-107)
router.get('/admin/valuable-items', requireAdmin, async (req, res) => {
  try {
    const items = await db.query(
      `SELECT 
        i.*,
        c.category_name,
        u.full_name as owner_name, u.email as owner_email, u.phone as owner_phone,
        u.institutional_id as owner_institutional_id, u.department as owner_department, u.role as owner_role,
        img.file_path as primary_image
       FROM items i
       JOIN categories c ON i.category_id = c.category_id
       JOIN users u ON i.user_id = u.user_id
       LEFT JOIN (
         SELECT item_id, MIN(file_path) as file_path 
         FROM item_images 
         GROUP BY item_id
       ) img ON i.item_id = img.item_id
       WHERE i.is_valuable = TRUE AND i.approval_status = 'Pending'
       ORDER BY i.created_at ASC`
    );

    return res.json({ success: true, items });
  } catch (err) {
    console.error('Admin fetch valuable items error:', err);
    return res.status(500).json({ success: false, message: 'Server error retrieving valuable items.' });
  }
});

// PUT /api/admin/items/:id/approve - Administrator approve valuable post (FR-38, FR-108)
router.put('/admin/items/:id/approve', requireAdmin, async (req, res) => {
  try {
    const itemId = req.params.id;
    const adminId = req.session.user.user_id;

    const items = await db.query('SELECT * FROM items WHERE item_id = ?', [itemId]);
    if (items.length === 0) {
      return res.status(404).json({ success: false, message: 'Item post not found.' });
    }

    const item = items[0];
    if (item.approval_status === 'Approved') {
      return res.status(400).json({ success: false, message: 'This item post is already approved.' });
    }

    await db.query(
      `UPDATE items SET status = 'Published', approval_status = 'Approved' WHERE item_id = ?`,
      [itemId]
    );

    // Audit record (FR-132)
    await logAudit(adminId, 'APPROVE_VALUABLE_ITEM', 'Item', itemId, `Approved valuable item: "${item.title}"`);

    // Notify post creator (FR-101)
    await createNotification(
      item.user_id,
      'VALUABLE_APPROVED',
      `Your valuable item post "${item.title}" has been approved by the administrator and is now published!`,
      itemId
    );

    // Run matching engine now that item is published
    try {
      const matches = await findMatchesForItem(itemId);
      for (const m of matches) {
        if (m.matchScore >= 45) {
          await createNotification(
            item.user_id,
            'POTENTIAL_MATCH',
            `Potential match found (${m.matchScore}%): "${m.item.title}" matches your newly approved post "${item.title}".`,
            m.item.item_id
          );
          await createNotification(
            m.item.user_id,
            'POTENTIAL_MATCH',
            `A newly approved valuable post "${item.title}" potentially matches your listed item "${m.item.title}".`,
            itemId
          );
        }
      }
    } catch (matchErr) {
      console.error('Match notification on approval error:', matchErr);
    }

    return res.json({ success: true, message: 'Valuable item post approved and published successfully.' });
  } catch (err) {
    console.error('Approve valuable item error:', err);
    return res.status(500).json({ success: false, message: 'Server error approving valuable item post.' });
  }
});

// PUT /api/admin/items/:id/reject - Administrator reject valuable post (FR-38, FR-109)
router.put('/admin/items/:id/reject', requireAdmin, async (req, res) => {
  try {
    const itemId = req.params.id;
    const adminId = req.session.user.user_id;
    const { reason } = req.body;

    const items = await db.query('SELECT * FROM items WHERE item_id = ?', [itemId]);
    if (items.length === 0) {
      return res.status(404).json({ success: false, message: 'Item post not found.' });
    }

    const item = items[0];
    const rejectReason = reason ? reason.trim() : 'Does not meet college portal high-value verification guidelines.';

    await db.query(
      `UPDATE items SET status = 'Rejected', approval_status = 'Rejected' WHERE item_id = ?`,
      [itemId]
    );

    await logAudit(adminId, 'REJECT_VALUABLE_ITEM', 'Item', itemId, `Rejected valuable item: "${item.title}". Reason: ${rejectReason}`);

    await createNotification(
      item.user_id,
      'VALUABLE_REJECTED',
      `Your valuable item post "${item.title}" was not approved. Reason: ${rejectReason}`,
      itemId
    );

    return res.json({ success: true, message: 'Valuable item post has been rejected.' });
  } catch (err) {
    console.error('Reject valuable item error:', err);
    return res.status(500).json({ success: false, message: 'Server error rejecting valuable item post.' });
  }
});

// ---------------------------------------------------------
// 7. USER MISUSE REPORTING & INVESTIGATION (INCREMENT 3)
// ---------------------------------------------------------

// POST /api/reports/user - Submit a misuse report (Simplified User Reporting)
router.post('/reports/user', requireAuth, async (req, res) => {
  try {
    const reporterId = req.session.user.user_id;
    const { reported_user_id, related_item_id, reason, description } = req.body;

    if (!reported_user_id || !reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Reported user and reason are mandatory.'
      });
    }

    if (parseInt(reported_user_id, 10) === reporterId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot report yourself.'
      });
    }

    // Verify reported user exists and is not an Administrator
    const users = await db.query('SELECT user_id, full_name, role FROM users WHERE user_id = ?', [reported_user_id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Reported user not found.' });
    }
    if (users[0].role === 'Administrator') {
      return res.status(400).json({ success: false, message: 'Administrator accounts cannot be reported.' });
    }

    // Prevent duplicate active reports by the same reporter for the same reported user and reason
    const existing = await db.query(
      `SELECT report_id FROM user_reports 
       WHERE reporter_id = ? AND reported_user_id = ? AND reason = ? AND status IN ('Pending', 'Under Investigation')`,
      [reporterId, reported_user_id, reason.trim()]
    );
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted an active report for this user with the same reason.'
      });
    }

    const explanation = (description && description.trim()) ? description.trim() : 'No explanation provided.';

    const result = await db.query(
      `INSERT INTO user_reports (reporter_id, reported_user_id, related_item_id, reason, description, status)
       VALUES (?, ?, ?, ?, ?, 'Pending')`,
      [reporterId, reported_user_id, related_item_id || null, reason.trim(), explanation]
    );

    return res.status(201).json({
      success: true,
      message: 'Misuse report submitted successfully. An administrator will review this report.',
      reportId: result.insertId
    });
  } catch (err) {
    console.error('Submit report error:', err);
    return res.status(500).json({ success: false, message: 'Server error submitting misuse report.' });
  }
});

// GET /api/admin/reports - View misuse reports (Reported Users Section)
router.get('/admin/reports', requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;

    let sql = `
      SELECT 
        r.*,
        reporter.full_name as reporter_name, reporter.institutional_id as reporter_institutional_id, reporter.email as reporter_email, reporter.role as reporter_role,
        reported.full_name as reported_name, reported.institutional_id as reported_institutional_id, reported.email as reported_email, reported.role as reported_role,
        reported.department as reported_department, reported.account_status as reported_account_status,
        (SELECT COUNT(*) FROM user_reports ur2 WHERE ur2.reported_user_id = r.reported_user_id) as total_reports_received,
        i.title as related_item_title,
        resolver.full_name as resolver_name
      FROM user_reports r
      JOIN users reporter ON r.reporter_id = reporter.user_id
      JOIN users reported ON r.reported_user_id = reported.user_id
      LEFT JOIN items i ON r.related_item_id = i.item_id
      LEFT JOIN users resolver ON r.resolved_by = resolver.user_id
      WHERE 1=1
    `;

    const params = [];
    if (status && status !== 'all') {
      sql += ' AND r.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY r.created_at DESC';

    const reports = await db.query(sql, params);
    return res.json({ success: true, reports });
  } catch (err) {
    console.error('Fetch reports error:', err);
    return res.status(500).json({ success: false, message: 'Server error retrieving misuse reports.' });
  }
});

// PUT /api/admin/reports/:id/dismiss - Administrator dismiss report without blocking
router.put('/admin/reports/:id/dismiss', requireAdmin, async (req, res) => {
  try {
    const reportId = req.params.id;
    const adminId = req.session.user.user_id;

    const reports = await db.query('SELECT * FROM user_reports WHERE report_id = ?', [reportId]);
    if (reports.length === 0) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    await db.query(
      `UPDATE user_reports 
       SET status = 'Dismissed', admin_action = 'Report dismissed by administrator upon review.', resolved_at = CURRENT_TIMESTAMP, resolved_by = ? 
       WHERE report_id = ?`,
      [adminId, reportId]
    );

    await logAudit(
      adminId,
      'DISMISS_MISUSE_REPORT',
      'UserReport',
      reportId,
      `Report #${reportId} dismissed by administrator.`
    );

    return res.json({ success: true, message: 'Report dismissed successfully and kept in moderation history.' });
  } catch (err) {
    console.error('Dismiss report error:', err);
    return res.status(500).json({ success: false, message: 'Server error dismissing report.' });
  }
});

// PUT /api/admin/reports/:id/resolve - Administrator resolve misuse report (FR-92, FR-102)
router.put('/admin/reports/:id/resolve', requireAdmin, async (req, res) => {
  try {
    const reportId = req.params.id;
    const adminId = req.session.user.user_id;
    const { status, admin_action } = req.body;

    if (!['Resolved', 'Dismissed', 'Under Investigation'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be Resolved, Dismissed, or Under Investigation.'
      });
    }

    const reports = await db.query('SELECT * FROM user_reports WHERE report_id = ?', [reportId]);
    if (reports.length === 0) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    const report = reports[0];
    const actionText = admin_action ? admin_action.trim() : `Report marked as ${status} by administrator.`;

    await db.query(
      `UPDATE user_reports 
       SET status = ?, admin_action = ?, resolved_at = CURRENT_TIMESTAMP, resolved_by = ? 
       WHERE report_id = ?`,
      [status, actionText, adminId, reportId]
    );

    await logAudit(
      adminId,
      'RESOLVE_MISUSE_REPORT',
      'UserReport',
      reportId,
      `Report #${reportId} updated to ${status}. Action: ${actionText}`
    );

    // Notify the reporter about the resolution (FR-102)
    await createNotification(
      report.reporter_id,
      'REPORT_RESOLVED',
      `Your report regarding portal misuse has been marked as ${status}. Note: ${actionText}`,
      report.related_item_id
    );

    return res.json({ success: true, message: `Report marked as ${status} successfully.` });
  } catch (err) {
    console.error('Resolve report error:', err);
    return res.status(500).json({ success: false, message: 'Server error resolving misuse report.' });
  }
});

// ---------------------------------------------------------
// 8. USER MANAGEMENT & BLOCKING CONTROLS (INCREMENT 3)
// ---------------------------------------------------------

// GET /api/admin/users - Administrator view and search all users (FR-112)
router.get('/admin/users', requireAdmin, async (req, res) => {
  try {
    const { q, role, status } = req.query;

    let sql = `
      SELECT 
        u.user_id, u.full_name, u.email, u.phone, u.role, u.institutional_id,
        u.department, u.course, u.semester, u.account_status, u.created_at,
        COUNT(DISTINCT i.item_id) as total_posts,
        COUNT(DISTINCT c.claim_id) as total_claims,
        COUNT(DISTINCT r.report_id) as total_reports_received
      FROM users u
      LEFT JOIN items i ON u.user_id = i.user_id
      LEFT JOIN claims c ON u.user_id = c.claimant_id
      LEFT JOIN user_reports r ON u.user_id = r.reported_user_id
      WHERE 1=1
    `;

    const params = [];

    if (role && role !== 'all') {
      sql += ' AND u.role = ?';
      params.push(role);
    }

    if (status && status !== 'all') {
      sql += ' AND u.account_status = ?';
      params.push(status);
    }

    if (q && q.trim()) {
      const term = `%${q.trim()}%`;
      sql += ' AND (u.full_name LIKE ? OR u.email LIKE ? OR u.institutional_id LIKE ? OR u.department LIKE ?)';
      params.push(term, term, term, term);
    }

    sql += ' GROUP BY u.user_id ORDER BY u.created_at DESC';

    const users = await db.query(sql, params);
    return res.json({ success: true, users });
  } catch (err) {
    console.error('Fetch users error:', err);
    return res.status(500).json({ success: false, message: 'Server error retrieving users.' });
  }
});

// PUT /api/admin/users/:id/block - Administrator block user (FR-93, FR-94, FR-115)
router.put('/admin/users/:id/block', requireAdmin, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const adminId = req.session.user.user_id;
    const { reason } = req.body;

    const blockReason = (reason && reason.trim()) ? reason.trim() : 'Administrative block following user reports and policy violations.';

    if (parseInt(targetUserId, 10) === adminId) {
      return res.status(400).json({ success: false, message: 'You cannot block your own administrator account.' });
    }

    const users = await db.query('SELECT user_id, role, full_name, account_status FROM users WHERE user_id = ?', [targetUserId]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (users[0].role === 'Administrator') {
      return res.status(400).json({ success: false, message: 'Cannot block another administrator account.' });
    }

    if (users[0].account_status === 'Blocked') {
      return res.status(400).json({ success: false, message: 'This user is already blocked.' });
    }

    // 1. Update user account status
    await db.query(`UPDATE users SET account_status = 'Blocked' WHERE user_id = ?`, [targetUserId]);

    // 2. Record in blocked_users table (FR-97)
    await db.query(
      `INSERT INTO blocked_users (user_id, blocked_by, reason, status)
       VALUES (?, ?, ?, 'Active')`,
      [targetUserId, adminId, blockReason]
    );

    // 3. Auto-resolve pending misuse reports for this user
    await db.query(
      `UPDATE user_reports 
       SET status = 'Resolved', admin_action = ?, resolved_at = CURRENT_TIMESTAMP, resolved_by = ?
       WHERE reported_user_id = ? AND status IN ('Pending', 'Under Investigation')`,
      [`User blocked by administrator. Reason: ${blockReason}`, adminId, targetUserId]
    );

    // 4. Write audit log (FR-132)
    await logAudit(
      adminId,
      'BLOCK_USER',
      'User',
      targetUserId,
      `Blocked user ${users[0].full_name} (#${targetUserId}). Reason: ${blockReason}`
    );

    return res.json({
      success: true,
      message: `User ${users[0].full_name} has been blocked successfully and restricted from portal activities.`
    });
  } catch (err) {
    console.error('Block user error:', err);
    return res.status(500).json({ success: false, message: 'Server error blocking user.' });
  }
});

// PUT /api/admin/users/:id/unblock - Administrator unblock user (FR-96, FR-116)
router.put('/admin/users/:id/unblock', requireAdmin, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const adminId = req.session.user.user_id;

    const users = await db.query('SELECT user_id, full_name, account_status FROM users WHERE user_id = ?', [targetUserId]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (users[0].account_status !== 'Blocked') {
      return res.status(400).json({ success: false, message: 'This user is not currently blocked.' });
    }

    // 1. Restore user account status to Active
    await db.query(`UPDATE users SET account_status = 'Active' WHERE user_id = ?`, [targetUserId]);

    // 2. Update blocked_users history
    await db.query(
      `UPDATE blocked_users 
       SET status = 'Unblocked', unblocked_at = CURRENT_TIMESTAMP 
       WHERE user_id = ? AND status = 'Active'`,
      [targetUserId]
    );

    // 3. Write audit log
    await logAudit(
      adminId,
      'UNBLOCK_USER',
      'User',
      targetUserId,
      `Unblocked user ${users[0].full_name} (#${targetUserId}). Access restored.`
    );

    // 4. Notify user
    await createNotification(
      targetUserId,
      'ACCOUNT_UNBLOCKED',
      'Your portal account has been restored by the administrator. You may now resume using portal features.'
    );

    return res.json({
      success: true,
      message: `User ${users[0].full_name} has been unblocked and account restored to Active.`
    });
  } catch (err) {
    console.error('Unblock user error:', err);
    return res.status(500).json({ success: false, message: 'Server error unblocking user.' });
  }
});

// GET /api/admin/blocked-users - View currently blocked users and blocking history (FR-97)
router.get('/admin/blocked-users', requireAdmin, async (req, res) => {
  try {
    const blocked = await db.query(
      `SELECT 
        b.*,
        u.full_name as user_name, u.email as user_email, u.role as user_role, u.institutional_id, u.department, u.account_status,
        admin.full_name as blocked_by_name
       FROM blocked_users b
       JOIN users u ON b.user_id = u.user_id
       JOIN users admin ON b.blocked_by = admin.user_id
       ORDER BY b.blocked_at DESC`
    );

    const currentlyBlocked = await db.query(
      `SELECT 
        u.user_id, u.full_name as user_name, u.email as user_email, u.role as user_role, u.institutional_id, u.department, u.account_status,
        b.block_id, b.reason, b.blocked_at,
        admin.full_name as blocked_by_name
       FROM users u
       JOIN blocked_users b ON u.user_id = b.user_id AND b.status = 'Active'
       JOIN users admin ON b.blocked_by = admin.user_id
       WHERE u.account_status = 'Blocked'
       ORDER BY b.blocked_at DESC`
    );

    return res.json({ success: true, currentlyBlocked, blockedUsers: blocked });
  } catch (err) {
    console.error('Fetch blocked users error:', err);
    return res.status(500).json({ success: false, message: 'Server error loading blocked user history.' });
  }
});

// DELETE /api/admin/items/:id - Remove inappropriate post (FR-114)
router.delete('/admin/items/:id', requireAdmin, async (req, res) => {
  try {
    const itemId = req.params.id;
    const adminId = req.session.user.user_id;
    const { removal_reason } = req.body;

    const items = await db.query('SELECT * FROM items WHERE item_id = ?', [itemId]);
    if (items.length === 0) {
      return res.status(404).json({ success: false, message: 'Item post not found.' });
    }

    const item = items[0];
    const reasonText = removal_reason ? removal_reason.trim() : 'Violated portal community rules.';

    await db.query(`UPDATE items SET status = 'Removed' WHERE item_id = ?`, [itemId]);

    await logAudit(
      adminId,
      'REMOVE_INAPPROPRIATE_ITEM',
      'Item',
      itemId,
      `Removed post "${item.title}" (#${itemId}). Reason: ${reasonText}`
    );

    await createNotification(
      item.user_id,
      'POST_REMOVED',
      `Your post "${item.title}" was removed by an administrator. Reason: ${reasonText}`,
      itemId
    );

    return res.json({ success: true, message: 'Item post marked as Removed and hidden from users.' });
  } catch (err) {
    console.error('Admin remove item error:', err);
    return res.status(500).json({ success: false, message: 'Server error removing item post.' });
  }
});

// ---------------------------------------------------------
// 9. ADMIN CLAIMS VERIFICATION & HANDOVER (INCREMENT 2)
// ---------------------------------------------------------

// GET /api/admin/claims - Administrator view of all claims (FR-73)
router.get('/admin/claims', requireAdmin, async (req, res) => {
  try {
    const { status, item_id } = req.query;

    let sql = `
      SELECT 
        c.claim_id, c.item_id, c.claimant_id, c.reason, c.ownership_evidence, c.evidence_file_path,
        c.status, c.status as claim_status, c.verification_notes, c.submitted_at, c.updated_at, c.verified_by,
        i.title as item_title, i.post_type, i.location as item_location, i.item_date,
        i.status as item_status, i.is_valuable, i.resolved_at,
        cat.category_name,
        claimant.full_name as claimant_name, claimant.email as claimant_email,
        claimant.phone as claimant_phone, claimant.institutional_id as claimant_institutional_id,
        claimant.department as claimant_department, claimant.role as claimant_role,
        poster.full_name as poster_name, poster.email as poster_email, poster.department as poster_department,
        verifier.full_name as verifier_name
      FROM claims c
      JOIN items i ON c.item_id = i.item_id
      JOIN categories cat ON i.category_id = cat.category_id
      JOIN users claimant ON c.claimant_id = claimant.user_id
      JOIN users poster ON i.user_id = poster.user_id
      LEFT JOIN users verifier ON c.verified_by = verifier.user_id
      WHERE 1=1
    `;

    const params = [];

    if (status && status !== 'all') {
      sql += ' AND c.status = ?';
      params.push(status);
    }

    if (item_id) {
      sql += ' AND c.item_id = ?';
      params.push(item_id);
    }

    sql += ' ORDER BY c.submitted_at DESC';

    const claims = await db.query(sql, params);
    return res.json({ success: true, claims });
  } catch (err) {
    console.error('Admin fetch claims error:', err);
    return res.status(500).json({ success: false, message: 'Server error retrieving claims.' });
  }
});

// PUT /api/admin/claims/:id/approve - Administrator approve claim (FR-74, FR-75, FR-77, FR-81)
router.put('/admin/claims/:id/approve', requireAdmin, async (req, res) => {
  let conn;
  try {
    const claimId = req.params.id;
    const adminId = req.session.user.user_id;
    const { verification_notes } = req.body;

    const claims = await db.query('SELECT * FROM claims WHERE claim_id = ?', [claimId]);
    if (claims.length === 0) {
      return res.status(404).json({ success: false, message: 'Claim not found.' });
    }

    const claim = claims[0];

    const items = await db.query('SELECT * FROM items WHERE item_id = ?', [claim.item_id]);
    if (items.length === 0) {
      return res.status(404).json({ success: false, message: 'Associated item not found.' });
    }

    const item = items[0];
    if (item.status === 'Returned') {
      return res.status(400).json({ success: false, message: 'This item has already been marked as returned.' });
    }

    // Check for conflicting approvals (FR-77)
    const existingApproved = await db.query(
      'SELECT claim_id FROM claims WHERE item_id = ? AND status = "Approved" AND claim_id != ?',
      [claim.item_id, claimId]
    );

    if (existingApproved.length > 0 || item.status === 'Claimed') {
      return res.status(400).json({
        success: false,
        message: 'Conflicting approval: Another claim for this item has already been approved.'
      });
    }

    if (claim.status === 'Approved') {
      return res.status(400).json({ success: false, message: 'This claim is already approved.' });
    }
    if (claim.status === 'Rejected' || claim.status === 'Cancelled') {
      return res.status(400).json({ success: false, message: `Cannot approve a claim with status '${claim.status}'.` });
    }

    // Database transaction to maintain consistent state (NFR-17)
    conn = await db.pool.getConnection();
    await conn.beginTransaction();

    const notes = verification_notes ? verification_notes.trim() : 'Approved by administrator upon evidence verification.';

    // 1. Approve this claim
    await conn.execute(
      `UPDATE claims SET status = 'Approved', verification_notes = ?, verified_by = ? WHERE claim_id = ?`,
      [notes, adminId, claimId]
    );

    // 2. Reject competing pending claims for the same item (FR-77)
    const competingRejectNotes = `Rejected: Another claim was verified and approved by administrator.`;
    await conn.execute(
      `UPDATE claims 
       SET status = 'Rejected', verification_notes = ?
       WHERE item_id = ? AND claim_id != ? AND status IN ('Pending', 'Under Verification')`,
      [competingRejectNotes, claim.item_id, claimId]
    );

    // 3. Update item status to Claimed
    await conn.execute(
      `UPDATE items SET status = 'Claimed' WHERE item_id = ?`,
      [claim.item_id]
    );

    await conn.commit();

    // Audit log
    await logAudit(
      adminId,
      'APPROVE_CLAIM',
      'Claim',
      claimId,
      `Approved claim #${claimId} for item "${item.title}" (#${claim.item_id})`
    );

    // Notify approved claimant (FR-83, FR-100)
    await createNotification(
      claim.claimant_id,
      'CLAIM_APPROVED',
      `Good news! Your claim for "${item.title}" has been verified and approved by the administrator.`,
      claim.item_id,
      claimId
    );

    // Notify item poster
    await createNotification(
      item.user_id,
      'CLAIM_APPROVED',
      `A claim for your item "${item.title}" was verified and approved. Handover can now take place.`,
      claim.item_id,
      claimId
    );

    // Notify competing claimants of rejection
    const [competing] = await db.pool.execute(
      'SELECT claimant_id, claim_id FROM claims WHERE item_id = ? AND claim_id != ? AND status = "Rejected"',
      [claim.item_id, claimId]
    );
    for (const comp of competing) {
      await createNotification(
        comp.claimant_id,
        'CLAIM_REJECTED',
        `Your claim for "${item.title}" was rejected because another claim provided verified ownership proof.`,
        claim.item_id,
        comp.claim_id
      );
    }

    return res.json({
      success: true,
      message: 'Claim approved successfully! Item status updated to Claimed, and competing claims resolved.'
    });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('Approve claim error:', err);
    return res.status(500).json({ success: false, message: 'Server error approving claim.' });
  } finally {
    if (conn) conn.release();
  }
});

// PUT /api/admin/claims/:id/reject - Administrator reject claim (FR-76)
router.put('/admin/claims/:id/reject', requireAdmin, async (req, res) => {
  try {
    const claimId = req.params.id;
    const adminId = req.session.user.user_id;
    const { verification_notes } = req.body;

    const claims = await db.query(
      `SELECT c.*, i.title as item_title FROM claims c JOIN items i ON c.item_id = i.item_id WHERE c.claim_id = ?`,
      [claimId]
    );
    if (claims.length === 0) {
      return res.status(404).json({ success: false, message: 'Claim not found.' });
    }

    const claim = claims[0];

    if (claim.status === 'Approved') {
      return res.status(400).json({ success: false, message: 'Cannot reject an already approved claim.' });
    }
    if (claim.status === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'This claim was cancelled by the claimant.' });
    }

    const notes = verification_notes ? verification_notes.trim() : 'Rejected by administrator: Insufficient ownership proof.';

    await db.query(
      `UPDATE claims SET status = 'Rejected', verification_notes = ?, verified_by = ? WHERE claim_id = ?`,
      [notes, adminId, claimId]
    );

    await logAudit(
      adminId,
      'REJECT_CLAIM',
      'Claim',
      claimId,
      `Rejected claim #${claimId} for item "${claim.item_title}". Notes: ${notes}`
    );

    // Notify claimant (FR-100)
    await createNotification(
      claim.claimant_id,
      'CLAIM_REJECTED',
      `Your claim for "${claim.item_title}" was rejected. Verification remarks: ${notes}`,
      claim.item_id,
      claimId
    );

    return res.json({ success: true, message: 'Claim has been rejected.' });
  } catch (err) {
    console.error('Reject claim error:', err);
    return res.status(500).json({ success: false, message: 'Server error rejecting claim.' });
  }
});

// PUT /api/admin/items/:id/return - Administrator confirm item return (FR-80, FR-81)
router.put('/admin/items/:id/return', requireAdmin, async (req, res) => {
  try {
    const itemId = req.params.id;
    const adminId = req.session.user.user_id;

    const items = await db.query('SELECT item_id, user_id, title, status FROM items WHERE item_id = ?', [itemId]);
    if (items.length === 0) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    const item = items[0];

    await db.query(
      `UPDATE items SET status = 'Returned', resolved_at = CURRENT_TIMESTAMP WHERE item_id = ?`,
      [itemId]
    );

    await logAudit(
      adminId,
      'CONFIRM_ITEM_RETURN',
      'Item',
      itemId,
      `Handover confirmed for item "${item.title}" (#${itemId})`
    );

    // Notify claimants and poster (FR-103)
    const approvedClaims = await db.query('SELECT claimant_id FROM claims WHERE item_id = ? AND status = "Approved"', [itemId]);
    for (const c of approvedClaims) {
      await createNotification(
        c.claimant_id,
        'ITEM_RETURNED',
        `Item "${item.title}" has been confirmed as Returned. Handover complete!`,
        itemId
      );
    }
    await createNotification(
      item.user_id,
      'ITEM_RETURNED',
      `Your post "${item.title}" has been officially marked as Returned.`,
      itemId
    );

    return res.json({ success: true, message: 'Item handover confirmed and marked as Returned.' });
  } catch (err) {
    console.error('Admin item return error:', err);
    return res.status(500).json({ success: false, message: 'Server error marking item returned.' });
  }
});

// ---------------------------------------------------------
// 10. NOTIFICATIONS MODULE (INCREMENT 4)
// ---------------------------------------------------------

// GET /api/notifications - View user's notifications (FR-98, FR-104)
router.get('/notifications', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.user_id;

    const notifications = await db.query(
      `SELECT * FROM notifications 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [userId]
    );

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return res.json({
      success: true,
      notifications,
      unreadCount
    });
  } catch (err) {
    console.error('Fetch notifications error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve notifications.' });
  }
});

// PUT /api/notifications/:id/read - Mark notification as read (FR-104)
router.put('/notifications/:id/read', requireAuth, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.session.user.user_id;

    await db.query(
      `UPDATE notifications SET is_read = TRUE WHERE notification_id = ? AND user_id = ?`,
      [notificationId, userId]
    );

    return res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    console.error('Mark read error:', err);
    return res.status(500).json({ success: false, message: 'Server error marking notification read.' });
  }
});

// PUT /api/notifications/read-all - Mark all notifications as read
router.put('/notifications/read-all', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    await db.query(`UPDATE notifications SET is_read = TRUE WHERE user_id = ?`, [userId]);
    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('Mark all read error:', err);
    return res.status(500).json({ success: false, message: 'Server error marking notifications read.' });
  }
});

// ---------------------------------------------------------
// 11. ARCHIVING & AUDIT LOGS (INCREMENT 4)
// ---------------------------------------------------------

// GET /api/admin/archived-items - View archived records (FR-124, FR-125)
router.get('/admin/archived-items', requireAdmin, async (req, res) => {
  try {
    const items = await db.query(
      `SELECT 
        i.*,
        c.category_name,
        u.full_name as owner_name, u.email as owner_email, u.department as owner_department
       FROM items i
       JOIN categories c ON i.category_id = c.category_id
       JOIN users u ON i.user_id = u.user_id
       WHERE i.status = 'Archived'
       ORDER BY i.updated_at DESC`
    );

    return res.json({ success: true, items });
  } catch (err) {
    console.error('Fetch archived items error:', err);
    return res.status(500).json({ success: false, message: 'Server error retrieving archived items.' });
  }
});

// POST /api/admin/archive-run - Manually trigger archiving batch (FR-122, FR-123)
router.post('/admin/archive-run', requireAdmin, async (req, res) => {
  try {
    const adminId = req.session.user.user_id;
    const result = await runAutoArchive(adminId);
    if (result.success) {
      return res.json({
        success: true,
        message: `Archiving completed. ${result.count} records archived.`,
        count: result.count
      });
    }
    return res.status(500).json({ success: false, message: result.error || 'Failed to run archiving.' });
  } catch (err) {
    console.error('Archive run error:', err);
    return res.status(500).json({ success: false, message: 'Server error executing archiving batch.' });
  }
});

// GET /api/admin/activity - View administrative audit logs (FR-132, FR-133, FR-134, Section 13)
router.get('/admin/activity', requireAdmin, async (req, res) => {
  try {
    const { action, limit } = req.query;

    let sql = `
      SELECT 
        a.*,
        u.full_name as admin_name, u.email as admin_email
      FROM audit_logs a
      JOIN users u ON a.admin_id = u.user_id
      WHERE 1=1
    `;

    const params = [];
    if (action && action !== 'all') {
      sql += ' AND a.action = ?';
      params.push(action);
    }

    sql += ' ORDER BY a.created_at DESC LIMIT ?';
    params.push(parseInt(limit || '100', 10));

    const logs = await db.query(sql, params);
    return res.json({ success: true, logs });
  } catch (err) {
    console.error('Fetch audit logs error:', err);
    return res.status(500).json({ success: false, message: 'Server error retrieving audit logs.' });
  }
});

// GET /api/admin/stats - High-level summary metrics for Admin Dashboard
router.get('/admin/stats', requireAdmin, async (req, res) => {
  try {
    const userCount = await db.query('SELECT COUNT(*) as cnt FROM users WHERE role != "Administrator"');
    const pendingValuable = await db.query('SELECT COUNT(*) as cnt FROM items WHERE is_valuable = TRUE AND approval_status = "Pending"');
    const pendingClaims = await db.query('SELECT COUNT(*) as cnt FROM claims WHERE status = "Pending"');
    const pendingReports = await db.query('SELECT COUNT(*) as cnt FROM user_reports WHERE status = "Pending"');
    const archivedCount = await db.query('SELECT COUNT(*) as cnt FROM items WHERE status = "Archived"');
    const totalPublished = await db.query('SELECT COUNT(*) as cnt FROM items WHERE status = "Published"');

    return res.json({
      success: true,
      stats: {
        totalUsers: userCount[0]?.cnt || 0,
        pendingValuable: pendingValuable[0]?.cnt || 0,
        pendingClaims: pendingClaims[0]?.cnt || 0,
        pendingReports: pendingReports[0]?.cnt || 0,
        archivedItems: archivedCount[0]?.cnt || 0,
        publishedItems: totalPublished[0]?.cnt || 0
      }
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    return res.status(500).json({ success: false, message: 'Server error retrieving stats.' });
  }
});

router.validateItemInput = validateItemInput;
router.validateTimeFormat = validateTimeFormat;
router.validateDescription = validateDescription;
router.validateReportInput = validateReportInput;
router.validateReportTargetAndDuplicates = validateReportTargetAndDuplicates;
router.checkReportEligibility = checkReportEligibility;
router.validateClaimEligibility = validateClaimEligibility;
router.validateClaimApprovalTransition = validateClaimApprovalTransition;
router.requireAuth = requireAuth;
router.requireAdmin = requireAdmin;

module.exports = router;
