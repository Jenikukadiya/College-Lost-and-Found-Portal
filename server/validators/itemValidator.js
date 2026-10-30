/**
 * College Lost & Found Portal - Item Validation Module
 * Software Engineering Lab Experiment 9: Unit Testing
 *
 * Implements business validation rules for Lost & Found item details:
 * - Title, category, location, and characteristics validation
 * - Description rules (minimum length, letter count, pattern checks)
 * - 24-hour time format validation (HH:mm)
 */

/**
 * Validate 24-hour approximate time (HH:mm)
 * @param {string|null|undefined} approximate_time
 * @returns {{ valid: boolean, message?: string }}
 */
function validateTimeFormat(approximate_time) {
  if (approximate_time === undefined || approximate_time === null) {
    return { valid: true };
  }

  const timeVal = String(approximate_time).trim();
  if (timeVal === '') {
    return { valid: true }; // Time is optional
  }

  // Exact 24-hour time regex: 00:00 to 23:59
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!timeRegex.test(timeVal)) {
    return {
      valid: false,
      message: 'Invalid time format. Please provide a valid 24-hour time in HH:mm format (e.g. 14:30).'
    };
  }

  return { valid: true };
}

/**
 * Validate item description rules
 * @param {string} description
 * @returns {{ valid: boolean, message?: string }}
 */
function validateDescription(description) {
  if (!description || !description.trim()) {
    return { valid: false, message: 'Item description is mandatory.' };
  }

  const desc = description.trim();

  // Rule 1: Must not begin with a numerical digit
  if (/^\d/.test(desc)) {
    return {
      valid: false,
      message: 'Description must not begin with a numerical digit. Please start with descriptive words.'
    };
  }

  // Rule 2: Minimum 15 characters
  if (desc.length < 15) {
    return {
      valid: false,
      message: 'Description must contain at least 15 meaningful characters.'
    };
  }

  // Rule 3: Must contain at least 8 alphabetic letters
  const letters = (desc.match(/[a-zA-Z]/g) || []).length;
  if (letters < 8) {
    return {
      valid: false,
      message: 'Description must contain meaningful words, not just numbers or symbols.'
    };
  }

  // Rule 4: No 5 or more consecutive identical characters
  if (/(.)\1{4,}/.test(desc.replace(/\s/g, ''))) {
    return {
      valid: false,
      message: 'Description must not contain repeated meaningless characters.'
    };
  }

  // Rule 5: Must contain at least 4 distinct letters
  const uniqueLetters = new Set((desc.toLowerCase().match(/[a-z]/g) || []));
  if (uniqueLetters.size < 4) {
    return {
      valid: false,
      message: 'Description must contain meaningful, descriptive text rather than repeated characters.'
    };
  }

  return { valid: true };
}

/**
 * Validate complete Lost / Found item details
 * @param {Object} itemData
 * @returns {{ valid: boolean, message?: string }}
 */
function validateItemInput({ title, category_id, location, identifying_characteristics, description, approximate_time }) {
  if (!title || !title.trim()) {
    return { valid: false, message: 'Item title is mandatory.' };
  }
  if (!category_id) {
    return { valid: false, message: 'Item category is mandatory.' };
  }
  if (!location || !location.trim()) {
    return { valid: false, message: 'Item location is mandatory.' };
  }
  if (!identifying_characteristics || !identifying_characteristics.trim()) {
    return { valid: false, message: 'Identifying characteristics are mandatory.' };
  }

  // Description validation
  const descValidation = validateDescription(description);
  if (!descValidation.valid) {
    return descValidation;
  }

  // Time validation (optional, but must be valid 24h format if supplied)
  const timeValidation = validateTimeFormat(approximate_time);
  if (!timeValidation.valid) {
    return timeValidation;
  }

  return { valid: true };
}

module.exports = {
  validateTimeFormat,
  validateDescription,
  validateItemInput
};
