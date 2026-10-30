/**
 * Integration Tests: Module 4 — Authentication and Authorization
 * Software Engineering Lab: Integration Testing
 *
 * This test file verifies the real integration between:
 * HTTP Requests -> Express Router -> requireAuth Middleware -> requireAdmin Middleware -> Database Guard
 *
 * All operations execute against the isolated test database: college_lost_found_test.
 */

const request = require('supertest');
const app = require('../../server/server');
const db = require('../../server/database');

describe('Module 4: Authentication and Authorization Integration Tests', () => {
  let studentAgent;
  let adminAgent;
  let blockedAgent;
  let blockedUserId;

  beforeAll(async () => {
    // 1. Regular Student
    studentAgent = request.agent(app);
    await request(app).post('/api/auth/register').send({
      full_name: 'Regular Student',
      email: 'student.perm@college.edu',
      phone: '9876543216',
      password: 'StudentPass123!',
      role: 'Student',
      institutional_id: 'STU9030',
      department: 'Computer Science'
    });
    await studentAgent.post('/api/auth/login').send({
      identifier: 'student.perm@college.edu',
      password: 'StudentPass123!'
    });

    // 2. Active Administrator (seeded in test DB)
    adminAgent = request.agent(app);
    await adminAgent.post('/api/auth/login').send({
      identifier: 'admin@college.edu',
      password: 'AdminSecurePass123!'
    });

    // 3. User to be blocked
    blockedAgent = request.agent(app);
    const regRes = await request(app).post('/api/auth/register').send({
      full_name: 'Blocked User',
      email: 'blocked.perm@college.edu',
      phone: '9876543218',
      password: 'StudentPass123!',
      role: 'Student',
      institutional_id: 'STU9032',
      department: 'Computer Science'
    });
    blockedUserId = regRes.body.userId;
    await blockedAgent.post('/api/auth/login').send({
      identifier: 'blocked.perm@college.edu',
      password: 'StudentPass123!'
    });

    // Mark user as Blocked in database to test dynamic DB middleware check
    await db.query("UPDATE users SET account_status = 'Blocked' WHERE user_id = ?", [blockedUserId]);
  });

  afterAll(async () => {
    await db.query("DELETE FROM users WHERE email IN ('student.perm@college.edu', 'admin.perm@college.edu', 'blocked.perm@college.edu')");
  });

  test('TC14 - Unauthenticated visitor cannot access a protected route', async () => {
    // Arrange: Direct request without any logged-in session cookie

    // Act: Send request to protected /api/items endpoint
    const response = await request(app)
      .get('/api/items');

    // Assert: Middleware must block request with HTTP 401 Unauthorized
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Authentication required. Please log in.');
  });

  test('TC15 - Student cannot access an administrator-only endpoint', async () => {
    // Arrange: Use student agent with valid session, but 'Student' role

    // Act: Student attempts to access admin reports
    const response = await studentAgent
      .get('/api/admin/reports');

    // Assert: Role-based guard must deny access with HTTP 403 Forbidden
    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Access denied. Administrator privilege required.');
  });

  test('TC16 - Active Administrator can access an authorized endpoint', async () => {
    // Arrange: Use active administrator agent

    // Act: Administrator requests administrative stats
    const response = await adminAgent
      .get('/api/admin/stats');

    // Assert: Request should succeed with HTTP 200 OK
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body).toHaveProperty('stats');
  });

  test('TC17 - Blocked user cannot perform a restricted action', async () => {
    // Arrange: User has active session cookie, but account_status in DB is 'Blocked'

    // Act: Blocked user attempts to fetch portal items
    const response = await blockedAgent
      .get('/api/items');

    // Assert: Dynamic database check in requireAuth must reject with HTTP 403 Forbidden
    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Your account has been blocked');
  });
});
