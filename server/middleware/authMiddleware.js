/**
 * College Lost & Found Portal - Authentication & Authorization Middleware
 * Software Engineering Lab Experiment 9: Unit Testing
 *
 * Implements role-based access control (RBAC) and security guards:
 * - Session verification
 * - User blocking enforcement (instant 403 for blocked accounts)
 * - Administrator privilege guard (FR-15, FR-16, FR-105)
 */

const defaultDb = require('../database');

/**
 * Server-side Authentication & Blocked-User Guard (FR-18, FR-19, FR-20, FR-95)
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 * @param {Object} [dbInstance] - Injected database instance (for testing/mocking)
 */
async function requireAuth(req, res, next, dbInstance = defaultDb) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
  }

  try {
    const users = await dbInstance.query('SELECT account_status FROM users WHERE user_id = ?', [req.session.user.user_id]);
    if (users.length === 0) {
      if (typeof req.session.destroy === 'function') {
        req.session.destroy(() => {});
      }
      return res.status(401).json({ success: false, message: 'User account not found. Please log in again.' });
    }

    if (users[0].account_status === 'Blocked') {
      req.session.user.account_status = 'Blocked';
      return res.status(403).json({
        success: false,
        message: 'Your account has been blocked due to portal policy violation. Restricted actions are prohibited.'
      });
    }

    req.session.user.account_status = users[0].account_status;
    next();
  } catch (err) {
    console.error('requireAuth database error:', err);
    next();
  }
}

/**
 * Administrator Role Guard (FR-15, FR-16, FR-105)
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 * @param {Object} [dbInstance] - Injected database instance (for testing/mocking)
 */
async function requireAdmin(req, res, next, dbInstance = defaultDb) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  try {
    const users = await dbInstance.query('SELECT role, account_status FROM users WHERE user_id = ?', [req.session.user.user_id]);
    if (users.length === 0 || users[0].role !== 'Administrator') {
      return res.status(403).json({ success: false, message: 'Access denied. Administrator privilege required.' });
    }
    if (users[0].account_status === 'Blocked') {
      return res.status(403).json({ success: false, message: 'Administrator account is currently blocked.' });
    }
    next();
  } catch (err) {
    console.error('requireAdmin error:', err);
    return res.status(500).json({ success: false, message: 'Server error verifying administrator privileges.' });
  }
}

module.exports = {
  requireAuth,
  requireAdmin
};
