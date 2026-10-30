/**
 * Unit Tests: User Misuse Reporting Validation
 * Software Engineering Lab Experiment 9
 *
 * This file tests:
 * 1. Self-reporting prevention (a user cannot report themselves)
 * 2. Administrator immunity (admin accounts cannot be reported)
 * 3. Duplicate active report prevention (prevents spamming reports)
 * 4. Database-backed eligibility checking using Jest mocks
 */

// Import the actual report validation functions from our server
const {
  validateReportInput,
  validateReportTargetAndDuplicates,
  checkReportEligibility
} = require('../server/validators/reportValidator');

describe('1. Basic Report Input & Self-Report Prevention Tests', () => {

  test('TC23 - Should reject a report when reported user ID is missing', () => {
    // Arrange: Report data with missing reported_user_id
    const reportData = {
      reporterId: 5,
      reported_user_id: null,
      reason: 'Spam post'
    };

    // Act: Validate the report inputs
    const result = validateReportInput(reportData);

    // Assert: Should return HTTP 400 Bad Request
    expect(result.valid).toBe(false);
    expect(result.status).toBe(400);
    expect(result.message).toBe('Reported user and reason are mandatory.');
  });

  test('TC24 - Should reject a report when reason is empty', () => {
    // Arrange: Report data with empty reason
    const reportData = {
      reporterId: 5,
      reported_user_id: 8,
      reason: '   '
    };

    // Act: Validate the report inputs
    const result = validateReportInput(reportData);

    // Assert: Should return HTTP 400 Bad Request
    expect(result.valid).toBe(false);
    expect(result.status).toBe(400);
    expect(result.message).toBe('Reported user and reason are mandatory.');
  });

  test('TC25 - Should prevent a user from reporting themselves', () => {
    // Arrange: Both reporterId and reported_user_id are the same user (ID 10)
    const reportData = {
      reporterId: 10,
      reported_user_id: 10,
      reason: 'Testing self report'
    };

    // Act: Validate the report inputs
    const result = validateReportInput(reportData);

    // Assert: System must reject self-reporting
    expect(result.valid).toBe(false);
    expect(result.status).toBe(400);
    expect(result.message).toBe('You cannot report yourself.');
  });

  test('TC26 - Should prevent self-reporting even when ID is sent as a string', () => {
    // Arrange: reporterId is number 10, reported_user_id is string "10"
    const reportData = {
      reporterId: 10,
      reported_user_id: '10',
      reason: 'Testing string ID equivalence'
    };

    // Act: Validate the report inputs
    const result = validateReportInput(reportData);

    // Assert: System should detect identical user and reject
    expect(result.valid).toBe(false);
    expect(result.status).toBe(400);
    expect(result.message).toBe('You cannot report yourself.');
  });

  test('TC27 - Should accept report input when reporting another user', () => {
    // Arrange: User 10 reporting a different user (User 15)
    const reportData = {
      reporterId: 10,
      reported_user_id: 15,
      reason: 'Fake claim submission'
    };

    // Act: Validate the report inputs
    const result = validateReportInput(reportData);

    // Assert: Inputs should be accepted
    expect(result.valid).toBe(true);
  });
});

describe('2. Target Role & Duplicate Report Prevention Tests', () => {

  test('TC28 - Should reject report if the reported user does not exist in database', () => {
    // Arrange: reportedUser is null (user was not found in DB)
    const reportedUser = null;
    const existingActiveReports = [];

    // Act: Check target validity
    const result = validateReportTargetAndDuplicates({ reportedUser, existingActiveReports });

    // Assert: Should return HTTP 404 Not Found
    expect(result.valid).toBe(false);
    expect(result.status).toBe(404);
    expect(result.message).toBe('Reported user not found.');
  });

  test('TC29 - Should not allow anyone to report an administrator account', () => {
    // Arrange: Target user has the Administrator role
    const adminUser = { user_id: 1, full_name: 'Campus Admin', role: 'Administrator' };
    const existingActiveReports = [];

    // Act: Check target validity
    const result = validateReportTargetAndDuplicates({ reportedUser: adminUser, existingActiveReports });

    // Assert: Administrators have immunity from standard user reports
    expect(result.valid).toBe(false);
    expect(result.status).toBe(400);
    expect(result.message).toBe('Administrator accounts cannot be reported.');
  });

  test('TC30 - Should reject duplicate report if an active report already exists', () => {
    // Arrange: Target is a student, but an active 'Pending' report already exists
    const studentUser = { user_id: 8, full_name: 'John Student', role: 'Student' };
    const existingReports = [{ report_id: 1, status: 'Pending', reason: 'Spam post' }];

    // Act: Check target validity and duplicate reports
    const result = validateReportTargetAndDuplicates({
      reportedUser: studentUser,
      existingActiveReports: existingReports
    });

    // Assert: System prevents duplicate active reports
    expect(result.valid).toBe(false);
    expect(result.status).toBe(400);
    expect(result.message).toBe('You have already submitted an active report for this user with the same reason.');
  });

  test('TC31 - Should allow report against a student when no duplicate exists', () => {
    // Arrange: Target is a student and there are no previous reports
    const studentUser = { user_id: 8, full_name: 'John Student', role: 'Student' };
    const existingReports = [];

    // Act: Check target validity and duplicate reports
    const result = validateReportTargetAndDuplicates({
      reportedUser: studentUser,
      existingActiveReports: existingReports
    });

    // Assert: Report is valid and allowed
    expect(result.valid).toBe(true);
  });
});

describe('3. Database-Backed Reporting Tests with Mocks', () => {

  test('TC32 - Should allow report when user exists and no active report is found in database', async () => {
    // Arrange: Mock database responses using Jest mock function
    const mockDb = {
      query: jest.fn()
        // 1st DB query: Returns target user details
        .mockResolvedValueOnce([{ user_id: 12, full_name: 'Alice', role: 'Student' }])
        // 2nd DB query: Returns empty array (no active duplicates)
        .mockResolvedValueOnce([])
    };

    // Act: Call the full async eligibility function
    const result = await checkReportEligibility(5, 12, 'Harassment', mockDb);

    // Assert: Report check should succeed and database was queried twice
    expect(result.valid).toBe(true);
    expect(mockDb.query).toHaveBeenCalledTimes(2);
  });

  test('TC33 - Should stop self-report immediately without querying database', async () => {
    // Arrange: Reporter 7 reporting User 7
    const mockDb = {
      query: jest.fn()
    };

    // Act: Call the full async eligibility function
    const result = await checkReportEligibility(7, 7, 'Self report', mockDb);

    // Assert: Should fail early without wasting database queries
    expect(result.valid).toBe(false);
    expect(result.message).toBe('You cannot report yourself.');
    expect(mockDb.query).not.toHaveBeenCalled();
  });

  test('TC34 - Should reject duplicate report found by database query', async () => {
    // Arrange: Mock DB returns an existing report under investigation
    const mockDb = {
      query: jest.fn()
        .mockResolvedValueOnce([{ user_id: 14, full_name: 'Bob', role: 'Student' }])
        .mockResolvedValueOnce([{ report_id: 99, status: 'Under Investigation' }])
    };

    // Act: Call the full async eligibility function
    const result = await checkReportEligibility(5, 14, 'Spam post', mockDb);

    // Assert: System detects duplicate active report and rejects
    expect(result.valid).toBe(false);
    expect(result.status).toBe(400);
    expect(result.message).toBe('You have already submitted an active report for this user with the same reason.');
  });
});
