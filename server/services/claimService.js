/**
 * College Lost & Found Portal - Claim Service & Eligibility Validator
 * Software Engineering Lab Experiment 9: Unit Testing
 *
 * Implements business rules for ownership claims and status transitions:
 * - Claim eligibility validation (poster cannot claim own post, item must be Published)
 * - Terminal state protections (Returned items reject new claims)
 * - Duplicate active claim prevention
 * - Administrator claim approval transition checks and conflicting claim detection
 */

/**
 * Validate claim submission eligibility
 * @param {Object} params
 * @param {number|string} params.userId - Claimant's user ID
 * @param {Object|null} params.item - Item record
 * @param {Array} [params.existingClaims] - Claimant's existing claims for this item
 * @param {string} params.reason - Claim reasoning
 * @param {string} params.ownership_evidence - Evidence description
 * @returns {{ eligible: boolean, status?: number, message?: string }}
 */
function validateClaimEligibility({ userId, item, existingClaims = [], reason, ownership_evidence }) {
  if (!reason || !String(reason).trim() || !ownership_evidence || !String(ownership_evidence).trim()) {
    return {
      eligible: false,
      status: 400,
      message: 'Both claim reason and ownership evidence description are required.'
    };
  }

  if (!item) {
    return {
      eligible: false,
      status: 404,
      message: 'Item not found.'
    };
  }

  // Prevent users from claiming their own post
  if (parseInt(item.user_id, 10) === parseInt(userId, 10)) {
    return {
      eligible: false,
      status: 400,
      message: 'You cannot submit a claim for an item that you posted.'
    };
  }

  // Prevent claims on returned items (FR-82)
  if (item.status === 'Returned') {
    return {
      eligible: false,
      status: 400,
      message: 'This item has already been marked as returned and is no longer accepting claims.'
    };
  }

  // Prevent claims on already claimed items undergoing handover
  if (item.status === 'Claimed') {
    return {
      eligible: false,
      status: 400,
      message: 'This item has already been claimed and is undergoing handover.'
    };
  }

  // Only published items can receive claims
  if (item.status !== 'Published') {
    return {
      eligible: false,
      status: 400,
      message: `Cannot claim item with status '${item.status}'. Only published items can be claimed.`
    };
  }

  // Prevent duplicate active claims from the same claimant (FR-71)
  if (existingClaims && existingClaims.length > 0) {
    const active = existingClaims.find(c => ['Pending', 'Under Verification', 'Approved'].includes(c.status));
    if (active) {
      return {
        eligible: false,
        status: 400,
        message: `You already have an active claim (${active.status}) for this item.`
      };
    }
  }

  return { eligible: true };
}

/**
 * Validate administrator claim approval transition rules
 * @param {Object} params
 * @param {Object|null} params.claim - Claim to be approved
 * @param {Object|null} params.item - Associated item
 * @param {Array} [params.existingApprovedClaims] - Conflicting approved claims for the same item
 * @returns {{ valid: boolean, status?: number, message?: string }}
 */
function validateClaimApprovalTransition({ claim, item, existingApprovedClaims = [] }) {
  if (!claim) {
    return {
      valid: false,
      status: 404,
      message: 'Claim not found.'
    };
  }

  if (!item) {
    return {
      valid: false,
      status: 404,
      message: 'Associated item not found.'
    };
  }

  if (item.status === 'Returned') {
    return {
      valid: false,
      status: 400,
      message: 'This item has already been marked as returned.'
    };
  }

  // Check for conflicting approvals (FR-77)
  if ((existingApprovedClaims && existingApprovedClaims.length > 0) || item.status === 'Claimed') {
    return {
      valid: false,
      status: 400,
      message: 'Conflicting approval: Another claim for this item has already been approved.'
    };
  }

  if (claim.status === 'Approved') {
    return {
      valid: false,
      status: 400,
      message: 'This claim is already approved.'
    };
  }

  if (claim.status === 'Rejected' || claim.status === 'Cancelled') {
    return {
      valid: false,
      status: 400,
      message: `Cannot approve a claim with status '${claim.status}'.`
    };
  }

  return { valid: true };
}

module.exports = {
  validateClaimEligibility,
  validateClaimApprovalTransition
};
