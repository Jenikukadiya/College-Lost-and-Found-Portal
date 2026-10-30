/**
 * College Lost & Found Portal - User Reporting Validator & Service
 * Software Engineering Lab Experiment 9: Unit Testing
 *
 * Implements business rules for reporting abusive or policy-violating users:
 * - Mandatory fields verification
 * - Self-reporting prevention
 * - Administrator immunity from reporting
 * - Duplicate active report prevention (Pending or Under Investigation)
 */

/**
 * Validate immediate input fields and prevent self-reporting
 * @param {Object} params
 * @param {number|string} params.reporterId
 * @param {number|string} params.reported_user_id
 * @param {string} params.reason
 * @param {string} [params.description]
 * @returns {{ valid: boolean, status?: number, message?: string }}
 */
function validateReportInput({ reporterId, reported_user_id, reason, description }) {
  if (!reported_user_id || !reason || !String(reason).trim()) {
    return {
      valid: false,
      status: 400,
      message: 'Reported user and reason are mandatory.'
    };
  }

  if (parseInt(reported_user_id, 10) === parseInt(reporterId, 10)) {
    return {
      valid: false,
      status: 400,
      message: 'You cannot report yourself.'
    };
  }

  return { valid: true };
}

/**
 * Validate reported user target constraints and duplicate active reports
 * @param {Object} params
 * @param {Object|null} params.reportedUser
 * @param {Array} [params.existingActiveReports]
 * @returns {{ valid: boolean, status?: number, message?: string }}
 */
function validateReportTargetAndDuplicates({ reportedUser, existingActiveReports = [] }) {
  if (!reportedUser) {
    return {
      valid: false,
      status: 404,
      message: 'Reported user not found.'
    };
  }

  if (reportedUser.role === 'Administrator') {
    return {
      valid: false,
      status: 400,
      message: 'Administrator accounts cannot be reported.'
    };
  }

  if (existingActiveReports && existingActiveReports.length > 0) {
    return {
      valid: false,
      status: 400,
      message: 'You have already submitted an active report for this user with the same reason.'
    };
  }

  return { valid: true };
}

/**
 * Full report eligibility check with database queries
 * @param {number|string} reporterId
 * @param {number|string} reportedUserId
 * @param {string} reason
 * @param {Object} db - Database connection or mock
 * @returns {Promise<{ valid: boolean, status?: number, message?: string }>}
 */
async function checkReportEligibility(reporterId, reportedUserId, reason, db) {
  const inputCheck = validateReportInput({ reporterId, reported_user_id: reportedUserId, reason });
  if (!inputCheck.valid) {
    return inputCheck;
  }

  const users = await db.query('SELECT user_id, full_name, role FROM users WHERE user_id = ?', [reportedUserId]);
  const reportedUser = users && users.length > 0 ? users[0] : null;

  const existing = await db.query(
    `SELECT report_id FROM user_reports 
     WHERE reporter_id = ? AND reported_user_id = ? AND reason = ? AND status IN ('Pending', 'Under Investigation')`,
    [reporterId, reportedUserId, String(reason).trim()]
  );

  return validateReportTargetAndDuplicates({
    reportedUser,
    existingActiveReports: existing || []
  });
}

module.exports = {
  validateReportInput,
  validateReportTargetAndDuplicates,
  checkReportEligibility
};
