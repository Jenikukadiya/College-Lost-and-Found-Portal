/**
 * Integration Tests: Module 5 — User Reporting and Blocking
 * Software Engineering Lab: Integration Testing
 *
 * This test file verifies the real integration between:
 * Reporting API -> Self-Report Rules -> Admin Moderation -> User Blocking -> Unblocking -> Database State
 *
 * All operations execute against the isolated test database: college_lost_found_test.
 */

const request = require('supertest');
const app = require('../../server/server');
const db = require('../../server/database');

describe('Module 5: User Reporting and Blocking Integration Tests', () => {
  let reporterAgent;
  let targetAgent;
  let adminAgent;
  let reporterUserId;
  let targetUserId;

  beforeAll(async () => {
    // 1. Reporter Student
    reporterAgent = request.agent(app);
    const repRes = await request(app).post('/api/auth/register').send({
      full_name: 'Kavita Reporter',
      email: 'kavita.report@college.edu',
      phone: '9876543219',
      password: 'StudentPass123!',
      role: 'Student',
      institutional_id: 'STU9040',
      department: 'Biotechnology'
    });
    reporterUserId = repRes.body.userId;
    await reporterAgent.post('/api/auth/login').send({
      identifier: 'kavita.report@college.edu',
      password: 'StudentPass123!'
    });

    // 2. Target Student (to be reported and blocked)
    targetAgent = request.agent(app);
    const targetRes = await request(app).post('/api/auth/register').send({
      full_name: 'Spam Offender',
      email: 'offender.report@college.edu',
      phone: '9876543220',
      password: 'StudentPass123!',
      role: 'Student',
      institutional_id: 'STU9041',
      department: 'Civil'
    });
    targetUserId = targetRes.body.userId;
    await targetAgent.post('/api/auth/login').send({
      identifier: 'offender.report@college.edu',
      password: 'StudentPass123!'
    });

    // 3. Administrator (seeded in test DB)
    adminAgent = request.agent(app);
    await adminAgent.post('/api/auth/login').send({
      identifier: 'admin@college.edu',
      password: 'AdminSecurePass123!'
    });
  });

  afterAll(async () => {
    await db.query("DELETE FROM users WHERE email IN ('kavita.report@college.edu', 'offender.report@college.edu', 'mod.admin@college.edu')");
  });

  test('TC18 - User successfully reports another user', async () => {
    // Arrange: Valid misuse report targeting another student
    const reportData = {
      reported_user_id: targetUserId,
      reason: 'Spam post',
      description: 'Posting repeated fake listings across categories.'
    };

    // Act: Send POST request to /api/reports/user
    const response = await reporterAgent
      .post('/api/reports/user')
      .send(reportData);

    // Assert: Expect HTTP 201 Created and reportId
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body).toHaveProperty('reportId');

    // Database verification: Verify report is saved in MySQL with status 'Pending'
    const dbReports = await db.query('SELECT status, reason FROM user_reports WHERE report_id = ?', [response.body.reportId]);
    expect(dbReports.length).toBe(1);
    expect(dbReports[0].status).toBe('Pending');
  });

  test('TC19 - Reject an invalid report (self-reporting)', async () => {
    // Arrange: User attempts to report their own user ID
    const selfReportData = {
      reported_user_id: reporterUserId,
      reason: 'Self report test'
    };

    // Act: Send POST request
    const response = await reporterAgent
      .post('/api/reports/user')
      .send(selfReportData);

    // Assert: Expect HTTP 400 Bad Request
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('You cannot report yourself.');
  });

  test('TC20 - Administrator blocks a reported user', async () => {
    // Arrange: Admin blocking the reported user with an official reason
    const blockData = {
      reason: 'Violated portal community guidelines by posting spam.'
    };

    // Act: Administrator sends PUT request to /api/admin/users/:id/block
    const response = await adminAgent
      .put(`/api/admin/users/${targetUserId}/block`)
      .send(blockData);

    // Assert: Expect HTTP 200 OK
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('has been blocked');

    // Database verification: Confirm user account_status in MySQL is 'Blocked'
    const userRow = await db.query('SELECT account_status FROM users WHERE user_id = ?', [targetUserId]);
    expect(userRow[0].account_status).toBe('Blocked');
  });

  test('TC21 - Blocked user cannot access restricted features', async () => {
    // Arrange: Blocked user attempts to log in again

    // Act: Send login request with blocked user credentials
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'offender.report@college.edu',
        password: 'StudentPass123!'
      });

    // Assert: Server blocks login attempt with HTTP 403 Forbidden
    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Your account has been blocked due to portal policy violation.');
  });

  test('TC22 - Administrator unblocks a user', async () => {
    // Arrange: Admin unblocks the user to restore access

    // Act: Administrator sends PUT request to /api/admin/users/:id/unblock
    const response = await adminAgent
      .put(`/api/admin/users/${targetUserId}/unblock`)
      .send({});

    // Assert: Expect HTTP 200 OK
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('has been unblocked');

    // Database verification: Confirm account_status is restored to 'Active'
    const restoredRow = await db.query('SELECT account_status FROM users WHERE user_id = ?', [targetUserId]);
    expect(restoredRow[0].account_status).toBe('Active');
  });
});
