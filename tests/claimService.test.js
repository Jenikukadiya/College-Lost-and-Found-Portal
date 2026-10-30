/**
 * Unit Tests: Claim Service & Ownership Verification
 * Software Engineering Lab Experiment 9
 *
 * This file tests business rules for:
 * 1. Claim eligibility (preventing self-claims, duplicate claims, claims on returned items)
 * 2. Claim approval status transitions (preventing conflicting approvals)
 */

// Import the actual claim validation functions from our server
const {
  validateClaimEligibility,
  validateClaimApprovalTransition
} = require('../server/services/claimService');

describe('1. Claim Eligibility Validation Tests', () => {

  // Reusable sample of a published found item
  const publishedFoundItem = {
    item_id: 101,
    user_id: 20, // Posted by User 20
    title: 'Blue Water Bottle',
    post_type: 'FOUND',
    status: 'Published'
  };

  test('TC35 - Should reject claim when reason or ownership evidence is missing', () => {
    // Arrange: Claim missing a reason
    const claimData = {
      userId: 25,
      item: publishedFoundItem,
      existingClaims: [],
      reason: '', // Empty reason
      ownership_evidence: 'Receipt from college bookstore'
    };

    // Act: Validate eligibility
    const result = validateClaimEligibility(claimData);

    // Assert: Must reject incomplete claim
    expect(result.eligible).toBe(false);
    expect(result.status).toBe(400);
    expect(result.message).toBe('Both claim reason and ownership evidence description are required.');
  });

  test('TC36 - Should prevent a user from claiming an item they posted themselves', () => {
    // Arrange: Claimant (User 20) is the same person who posted the item
    const claimData = {
      userId: 20, // Same user_id as item.user_id
      item: publishedFoundItem,
      existingClaims: [],
      reason: 'This is my item',
      ownership_evidence: 'I have photo proof'
    };

    // Act: Validate eligibility
    const result = validateClaimEligibility(claimData);

    // Assert: User cannot claim their own post
    expect(result.eligible).toBe(false);
    expect(result.status).toBe(400);
    expect(result.message).toBe('You cannot submit a claim for an item that you posted.');
  });

  test('TC37 - Should reject a claim on an item that is already returned', () => {
    // Arrange: Item status is 'Returned'
    const returnedItem = { ...publishedFoundItem, status: 'Returned' };
    const claimData = {
      userId: 30,
      item: returnedItem,
      existingClaims: [],
      reason: 'I lost it earlier',
      ownership_evidence: 'I have photos'
    };

    // Act: Validate eligibility
    const result = validateClaimEligibility(claimData);

    // Assert: Returned items do not accept new claims
    expect(result.eligible).toBe(false);
    expect(result.status).toBe(400);
    expect(result.message).toBe('This item has already been marked as returned and is no longer accepting claims.');
  });

  test('TC38 - Should reject a claim on an item that is already claimed', () => {
    // Arrange: Item is currently 'Claimed' and undergoing handover
    const claimedItem = { ...publishedFoundItem, status: 'Claimed' };
    const claimData = {
      userId: 30,
      item: claimedItem,
      existingClaims: [],
      reason: 'My water bottle',
      ownership_evidence: 'Sticker with my name'
    };

    // Act: Validate eligibility
    const result = validateClaimEligibility(claimData);

    // Assert: Already claimed items cannot receive new claims
    expect(result.eligible).toBe(false);
    expect(result.status).toBe(400);
    expect(result.message).toBe('This item has already been claimed and is undergoing handover.');
  });

  test('TC39 - Should reject a claim on an item that is not published', () => {
    // Arrange: Item is still 'Pending Approval' by administrator
    const pendingItem = { ...publishedFoundItem, status: 'Pending Approval' };
    const claimData = {
      userId: 30,
      item: pendingItem,
      existingClaims: [],
      reason: 'My item',
      ownership_evidence: 'Bill'
    };

    // Act: Validate eligibility
    const result = validateClaimEligibility(claimData);

    // Assert: Only published items can be claimed
    expect(result.eligible).toBe(false);
    expect(result.status).toBe(400);
    expect(result.message).toBe("Cannot claim item with status 'Pending Approval'. Only published items can be claimed.");
  });

  test('TC40 - Should reject a duplicate claim if claimant already has an active claim', () => {
    // Arrange: Claimant User 30 already has an active 'Pending' claim
    const previousClaims = [
      { claim_id: 12, claimant_id: 30, status: 'Pending' }
    ];
    const claimData = {
      userId: 30,
      item: publishedFoundItem,
      existingClaims: previousClaims,
      reason: 'Trying to claim again',
      ownership_evidence: 'Added more details'
    };

    // Act: Validate eligibility
    const result = validateClaimEligibility(claimData);

    // Assert: Duplicate active claims are prohibited
    expect(result.eligible).toBe(false);
    expect(result.status).toBe(400);
    expect(result.message).toBe('You already have an active claim (Pending) for this item.');
  });

  test('TC41 - Should allow a valid claim from another user on a published item', () => {
    // Arrange: Distinct user claiming a published item with proper evidence
    const claimData = {
      userId: 45, // Different user from item creator (20)
      item: publishedFoundItem,
      existingClaims: [], // No prior claims
      reason: 'I forgot my bottle in Lab 2 on Monday afternoon',
      ownership_evidence: 'Has a small scratch near the top cap and engraved initials AJ'
    };

    // Act: Validate eligibility
    const result = validateClaimEligibility(claimData);

    // Assert: Claim must be accepted
    expect(result.eligible).toBe(true);
  });
});

describe('2. Claim Approval Transition Tests', () => {

  const publishedItem = {
    item_id: 101,
    title: 'Blue Water Bottle',
    status: 'Published'
  };

  const pendingClaim = {
    claim_id: 50,
    item_id: 101,
    status: 'Pending'
  };

  test('TC42 - Should allow admin to approve a pending claim on a published item', () => {
    // Arrange: Normal pending claim on published item
    const transitionData = {
      claim: pendingClaim,
      item: publishedItem,
      existingApprovedClaims: []
    };

    // Act: Validate approval transition
    const result = validateClaimApprovalTransition(transitionData);

    // Assert: Approval should be allowed
    expect(result.valid).toBe(true);
  });

  test('TC43 - Should reject approval if another claim for this item is already approved', () => {
    // Arrange: Another claim was already approved previously
    const existingApproved = [{ claim_id: 49, status: 'Approved' }];
    const transitionData = {
      claim: pendingClaim,
      item: publishedItem,
      existingApprovedClaims: existingApproved
    };

    // Act: Validate approval transition
    const result = validateClaimApprovalTransition(transitionData);

    // Assert: Must reject conflicting approval
    expect(result.valid).toBe(false);
    expect(result.status).toBe(400);
    expect(result.message).toBe('Conflicting approval: Another claim for this item has already been approved.');
  });

  test('TC44 - Should reject approval if the item is already claimed', () => {
    // Arrange: Item status is already 'Claimed'
    const claimedItem = { ...publishedItem, status: 'Claimed' };
    const transitionData = {
      claim: pendingClaim,
      item: claimedItem,
      existingApprovedClaims: []
    };

    // Act: Validate approval transition
    const result = validateClaimApprovalTransition(transitionData);

    // Assert: Must reject approval on already claimed items
    expect(result.valid).toBe(false);
    expect(result.status).toBe(400);
    expect(result.message).toBe('Conflicting approval: Another claim for this item has already been approved.');
  });

  test('TC45 - Should reject approval if this claim is already approved', () => {
    // Arrange: This claim itself is already 'Approved'
    const alreadyApprovedClaim = { ...pendingClaim, status: 'Approved' };
    const transitionData = {
      claim: alreadyApprovedClaim,
      item: publishedItem,
      existingApprovedClaims: []
    };

    // Act: Validate approval transition
    const result = validateClaimApprovalTransition(transitionData);

    // Assert: Idempotent check - reject already approved claim
    expect(result.valid).toBe(false);
    expect(result.status).toBe(400);
    expect(result.message).toBe('This claim is already approved.');
  });

  test('TC46 - Should reject approval if the claim status is rejected or cancelled', () => {
    // Arrange: Claims in terminal state (Rejected / Cancelled)
    const rejectedClaim = { ...pendingClaim, status: 'Rejected' };
    const cancelledClaim = { ...pendingClaim, status: 'Cancelled' };

    // Act & Assert: Cannot approve terminal claims
    expect(validateClaimApprovalTransition({ claim: rejectedClaim, item: publishedItem }).valid).toBe(false);
    expect(validateClaimApprovalTransition({ claim: cancelledClaim, item: publishedItem }).valid).toBe(false);
  });
});
