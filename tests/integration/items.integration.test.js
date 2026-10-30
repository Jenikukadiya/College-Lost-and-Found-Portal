/**
 * Integration Tests: Module 2 — Lost and Found Items
 * Software Engineering Lab: Integration Testing
 *
 * This test file verifies the real integration between:
 * Express Item Routes -> Authentication Middleware (requireAuth) -> Item Validator -> MySQL Database
 *
 * All operations execute against the isolated test database: college_lost_found_test.
 */

const request = require('supertest');
const app = require('../../server/server');
const db = require('../../server/database');

describe('Module 2: Lost and Found Items Integration Tests', () => {
  let authenticatedAgent;
  let testUserId;
  let createdItemId;

  beforeAll(async () => {
    // 1. Create an authenticated user in test database
    authenticatedAgent = request.agent(app);

    const userPayload = {
      full_name: 'Pooja Verma',
      email: 'pooja.items@college.edu',
      phone: '9876543212',
      password: 'StudentPass123!',
      role: 'Student',
      institutional_id: 'STU9010',
      department: 'Electrical Engineering'
    };

    const regRes = await request(app).post('/api/auth/register').send(userPayload);
    testUserId = regRes.body.userId;

    // 2. Log in through agent to acquire authenticated session cookie
    await authenticatedAgent
      .post('/api/auth/login')
      .send({ identifier: 'pooja.items@college.edu', password: 'StudentPass123!' });
  });

  afterAll(async () => {
    // Clean up created items and user from test database
    if (createdItemId) {
      await db.query('DELETE FROM items WHERE item_id = ?', [createdItemId]);
    }
    await db.query('DELETE FROM users WHERE email = ?', ['pooja.items@college.edu']);
  });

  test('TC06 - Authenticated user successfully posts a lost item', async () => {
    // Arrange: Valid lost item payload
    const itemData = {
      post_type: 'LOST',
      category_id: 1, // Electronics category
      title: 'Dell Laptop Power Adapter',
      description: 'Original black 65W Dell charger left near front desk.',
      item_date: '2026-10-25',
      location: 'Block C Room 204',
      approximate_time: '14:30',
      identifying_characteristics: 'Small piece of yellow tape on the cable'
    };

    // Act: Send POST request with authenticated agent
    const response = await authenticatedAgent
      .post('/api/items')
      .send(itemData);

    // Assert: Expect HTTP 201 Created and new itemId
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body).toHaveProperty('itemId');
    createdItemId = response.body.itemId;

    // Database verification: Confirm item is actually saved in MySQL
    const itemRows = await db.query('SELECT title, post_type, status FROM items WHERE item_id = ?', [createdItemId]);
    expect(itemRows.length).toBe(1);
    expect(itemRows[0].title).toBe('Dell Laptop Power Adapter');
    expect(itemRows[0].post_type).toBe('LOST');
    expect(itemRows[0].status).toBe('Published');
  });

  test('TC07 - Reject an item with invalid input', async () => {
    // Arrange: Item data with description shorter than 15 characters
    const invalidItemData = {
      post_type: 'LOST',
      category_id: 1,
      title: 'Water Bottle',
      description: 'Found it', // Fails rule: must be at least 15 chars
      item_date: '2026-10-25',
      location: 'Campus Canteen',
      identifying_characteristics: 'Blue cap'
    };

    // Act: Send POST request
    const response = await authenticatedAgent
      .post('/api/items')
      .send(invalidItemData);

    // Assert: Expect HTTP 400 Bad Request
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('at least 15 meaningful characters');
  });

  test('TC08 - Retrieve the list of items', async () => {
    // Arrange: Use authenticated agent

    // Act: Send GET request to /api/items
    const response = await authenticatedAgent
      .get('/api/items');

    // Assert: Expect HTTP 200 OK and an array of published items
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.items)).toBe(true);
    expect(response.body.items.length).toBeGreaterThanOrEqual(1);
  });

  test('TC09 - Search or filter items', async () => {
    // Arrange: Search keyword 'Dell' and filter post_type 'LOST'

    // Act: Send GET request with query parameters
    const response = await authenticatedAgent
      .get('/api/items?search=Dell&post_type=LOST');

    // Assert: Expect HTTP 200 OK and matching item in results
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    const found = response.body.items.some(item => item.title.includes('Dell'));
    expect(found).toBe(true);
  });
});
