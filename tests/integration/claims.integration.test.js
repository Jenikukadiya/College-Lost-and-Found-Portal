/**
 * Integration Tests: Module 3 — Claim Management
 * Software Engineering Lab: Integration Testing
 *
 * This test file verifies the real integration between:
 * Claim Submission -> Eligibility Verification -> Duplicate Checks -> Database Updates -> Admin Review
 *
 * All operations execute against the isolated test database: college_lost_found_test.
 */

const request = require('supertest');
const app = require('../../server/server');
const db = require('../../server/database');

describe('Module 3: Claim Management Integration Tests', () => {
  let posterAgent;
  let claimantAgent;
  let adminAgent;
  let foundItemId;
  let submittedClaimId;

  beforeAll(async () => {
    // 1. Create Poster Student (Finder)
    posterAgent = request.agent(app);
    await request(app).post('/api/auth/register').send({
      full_name: 'Ananya Finder',
      email: 'ananya.claim@college.edu',
      phone: '9876543213',
      password: 'StudentPass123!',
      role: 'Student',
      institutional_id: 'STU9020',
      department: 'Mechanical'
    });
    await posterAgent.post('/api/auth/login').send({
      identifier: 'ananya.claim@college.edu',
      password: 'StudentPass123!'
    });

    // Poster posts a FOUND item
    const itemRes = await posterAgent.post('/api/items').send({
      post_type: 'FOUND',
      category_id: 1,
      title: 'Titan Silver Wrist Watch',
      description: 'Found a silver metallic wristwatch on the bench near ground.',
      item_date: '2026-10-26',
      location: 'Sports Ground',
      approximate_time: '17:00',
      identifying_characteristics: 'Silver chain with blue dial'
    });
    foundItemId = itemRes.body.itemId;

    // 2. Create Claimant Student
    claimantAgent = request.agent(app);
    await request(app).post('/api/auth/register').send({
      full_name: 'Vikram Claimant',
      email: 'vikram.claim@college.edu',
      phone: '9876543214',
      password: 'StudentPass123!',
      role: 'Student',
      institutional_id: 'STU9021',
      department: 'Civil'
    });
    await claimantAgent.post('/api/auth/login').send({
      identifier: 'vikram.claim@college.edu',
      password: 'StudentPass123!'
    });

    // 3. Log in as seeded Administrator
    adminAgent = request.agent(app);
    await adminAgent.post('/api/auth/login').send({
      identifier: 'admin@college.edu',
      password: 'AdminSecurePass123!'
    });
  });

  afterAll(async () => {
    // Clean up created records from test database
    if (foundItemId) {
      await db.query('DELETE FROM items WHERE item_id = ?', [foundItemId]);
    }
    await db.query("DELETE FROM users WHERE email IN ('ananya.claim@college.edu', 'vikram.claim@college.edu', 'admin.claim@college.edu')");
  });

  test('TC10 - Authenticated user submits a valid claim', async () => {
    // Arrange: Valid claim details with ownership reasoning and proof description
    const claimData = {
      reason: 'I lost my silver Titan watch while playing football on the ground.',
      ownership_evidence: 'The back has an engraving with initials VS and purchase bill from Titan store.'
    };

    // Act: Send POST request to /api/items/:id/claim
    const response = await claimantAgent
      .post(`/api/items/${foundItemId}/claim`)
      .send(claimData);

    // Assert: Expect HTTP 201 Created and new claimId
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body).toHaveProperty('claimId');
    submittedClaimId = response.body.claimId;

    // Database verification: Verify claim record is stored in MySQL with status 'Pending'
    const dbClaims = await db.query('SELECT status, reason FROM claims WHERE claim_id = ?', [submittedClaimId]);
    expect(dbClaims.length).toBe(1);
    expect(dbClaims[0].status).toBe('Pending');
  });

  test('TC11 - Reject a duplicate claim', async () => {
    // Arrange: Claimant submits another claim on the same item while the first is pending
    const duplicateClaimData = {
      reason: 'Submitting again with extra info.',
      ownership_evidence: 'Bill attached.'
    };

    // Act: Attempt to claim the same item again
    const response = await claimantAgent
      .post(`/api/items/${foundItemId}/claim`)
      .send(duplicateClaimData);

    // Assert: Expect HTTP 400 Bad Request prohibiting duplicate claims
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('already have an active claim');
  });

  test('TC12 - Reject an unauthorized claim operation', async () => {
    // Arrange: Poster attempts to claim the item they posted themselves
    const selfClaimData = {
      reason: 'Trying to claim my own posted item.',
      ownership_evidence: 'Self evidence'
    };

    // Act: Poster sends claim request
    const response = await posterAgent
      .post(`/api/items/${foundItemId}/claim`)
      .send(selfClaimData);

    // Assert: Expect HTTP 400 Bad Request
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('You cannot submit a claim for an item that you posted.');
  });

  test('TC13 - Administrator approves or rejects a claim', async () => {
    // Arrange: Administrator reviews the pending claim
    const approvalData = {
      verification_notes: 'Verified ownership bill and initials match. Approved.'
    };

    // Act: Admin sends PUT request to approve claim
    const response = await adminAgent
      .put(`/api/admin/claims/${submittedClaimId}/approve`)
      .send(approvalData);

    // Assert: Expect HTTP 200 OK
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('Claim approved successfully');

    // Database verification: Verify claim status is now 'Approved' and item status is 'Claimed'
    const updatedClaim = await db.query('SELECT status FROM claims WHERE claim_id = ?', [submittedClaimId]);
    expect(updatedClaim[0].status).toBe('Approved');

    const updatedItem = await db.query('SELECT status FROM items WHERE item_id = ?', [foundItemId]);
    expect(updatedItem[0].status).toBe('Claimed');
  });
});
