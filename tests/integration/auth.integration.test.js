/**
 * Integration Tests: Module 1 — Registration and Login
 * Software Engineering Lab: Integration Testing
 *
 * This test file verifies the real integration between:
 * Express HTTP Routes -> Input Validation -> Database Query -> Password Hashing (bcrypt) -> Session Creation
 *
 * All operations execute against the isolated test database: college_lost_found_test.
 */

const request = require('supertest');
const app = require('../../server/server');
const db = require('../../server/database');

describe('Module 1: User Registration and Login Integration Tests', () => {

  // Clean up registered test user after tests run
  afterAll(async () => {
    await db.query("DELETE FROM users WHERE email IN ('rahul.test@college.edu', 'invalid.test@college.edu')");
  });

  test('TC01 - Register a user with valid information', async () => {
    // Arrange: Valid registration payload for a student
    const newStudent = {
      full_name: 'Rahul Sharma',
      email: 'rahul.test@college.edu',
      phone: '9876543210',
      password: 'StudentPass123!',
      role: 'Student',
      institutional_id: 'STU9001',
      department: 'Computer Science',
      course: 'BTech',
      semester: '6'
    };

    // Act: Send HTTP POST request to /api/register
    const response = await request(app)
      .post('/api/auth/register')
      .send(newStudent);

    // Assert: Verify HTTP status is 201 Created and user ID is returned
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body).toHaveProperty('userId');
    expect(response.body.message).toBe('Account created successfully! You can now log in.');

    // Database verification: Verify user record was actually stored in MySQL
    const dbRecords = await db.query('SELECT full_name, email, role FROM users WHERE email = ?', [newStudent.email]);
    expect(dbRecords.length).toBe(1);
    expect(dbRecords[0].full_name).toBe('Rahul Sharma');
    expect(dbRecords[0].role).toBe('Student');
  });

  test('TC02 - Reject registration with invalid information', async () => {
    // Arrange: Registration payload with a weak password (fails validation rule)
    const invalidStudent = {
      full_name: 'Invalid User',
      email: 'invalid.test@college.edu',
      phone: '9876543210',
      password: '123', // Weak password: < 8 characters, no special character
      role: 'Student',
      institutional_id: 'STU9002',
      department: 'Computer Science'
    };

    // Act: Send HTTP POST request to /api/register
    const response = await request(app)
      .post('/api/auth/register')
      .send(invalidStudent);

    // Assert: Verify HTTP status is 400 Bad Request
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Password must be at least 8 characters long');
  });

  test('TC03 - Reject duplicate registration', async () => {
    // Arrange: Payload using the same email address as registered in TC01
    const duplicateStudent = {
      full_name: 'Rahul Duplicate',
      email: 'rahul.test@college.edu', // Duplicate email
      phone: '9876543211',
      password: 'StudentPass123!',
      role: 'Student',
      institutional_id: 'STU9999',
      department: 'Computer Science'
    };

    // Act: Attempt to register with existing email
    const response = await request(app)
      .post('/api/auth/register')
      .send(duplicateStudent);

    // Assert: System must reject duplicate registration with 400
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('An account with this email address already exists.');
  });

  test('TC04 - Login with valid credentials', async () => {
    // Arrange: Valid credentials for the user created in TC01
    const loginData = {
      identifier: 'rahul.test@college.edu',
      password: 'StudentPass123!'
    };

    // Act: Send HTTP POST request to /api/auth/login
    const response = await request(app)
      .post('/api/auth/login')
      .send(loginData);

    // Assert: Login should succeed and return session cookie
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Login successful!');
    expect(response.body.user).toHaveProperty('full_name', 'Rahul Sharma');
    expect(response.headers['set-cookie']).toBeDefined(); // Verifies session cookie is created
  });

  test('TC05 - Reject login with incorrect credentials', async () => {
    // Arrange: Correct email with wrong password
    const wrongLoginData = {
      identifier: 'rahul.test@college.edu',
      password: 'IncorrectPassword999!'
    };

    // Act: Attempt login with incorrect password
    const response = await request(app)
      .post('/api/auth/login')
      .send(wrongLoginData);

    // Assert: System must return HTTP 401 Unauthorized
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Invalid email/ID or password.');
  });
});
