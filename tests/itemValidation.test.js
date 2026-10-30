/**
 * Unit Tests: Item Validation
 * Software Engineering Lab Experiment 9
 *
 * This file tests validation rules for:
 * 1. Time format (24-hour HH:mm)
 * 2. Description text rules (length, characters, starting letter)
 * 3. Complete item form submission
 */

// Import the actual validation functions from our server
const {
  validateTimeFormat,
  validateDescription,
  validateItemInput
} = require('../server/validators/itemValidator');

describe('1. Time Format Validation Tests', () => {

  test('TC01 - Should accept a valid standard time (14:30)', () => {
    // Arrange: Give a valid 24-hour time string
    const inputTime = '14:30';

    // Act: Call the validation function
    const result = validateTimeFormat(inputTime);

    // Assert: Expect valid to be true
    expect(result.valid).toBe(true);
  });

  test('TC02 - Should accept midnight boundary time (00:00)', () => {
    // Arrange: Minimum boundary time
    const inputTime = '00:00';

    // Act: Call the validation function
    const result = validateTimeFormat(inputTime);

    // Assert: Expect valid to be true
    expect(result.valid).toBe(true);
  });

  test('TC03 - Should accept end of day boundary time (23:59)', () => {
    // Arrange: Maximum boundary time
    const inputTime = '23:59';

    // Act: Call the validation function
    const result = validateTimeFormat(inputTime);

    // Assert: Expect valid to be true
    expect(result.valid).toBe(true);
  });

  test('TC04 - Should accept empty time because approximate time is optional', () => {
    // Arrange: Empty or null inputs
    const emptyTime = '';
    const nullTime = null;

    // Act & Assert: Optional fields should be accepted when empty
    expect(validateTimeFormat(emptyTime).valid).toBe(true);
    expect(validateTimeFormat(nullTime).valid).toBe(true);
  });

  test('TC05 - Should reject alphabetic time input ("abc")', () => {
    // Arrange: Invalid text input
    const inputTime = 'abc';

    // Act: Call the validation function
    const result = validateTimeFormat(inputTime);

    // Assert: Expect valid to be false and contain an error message
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Invalid time format. Please provide a valid 24-hour time in HH:mm format (e.g. 14:30).');
  });

  test('TC06 - Should reject alphanumeric time input ("12ab")', () => {
    // Arrange: Mixed letters and numbers
    const inputTime = '12ab';

    // Act: Call the validation function
    const result = validateTimeFormat(inputTime);

    // Assert: Expect validation to fail
    expect(result.valid).toBe(false);
  });

  test('TC07 - Should reject invalid hour greater than 23 ("25:70")', () => {
    // Arrange: 25 hours is out of range (00-23)
    const inputTime = '25:70';

    // Act: Call the validation function
    const result = validateTimeFormat(inputTime);

    // Assert: Expect validation to fail
    expect(result.valid).toBe(false);
  });

  test('TC08 - Should reject invalid minute greater than 59 ("14:60")', () => {
    // Arrange: 60 minutes is out of range (00-59)
    const inputTime = '14:60';

    // Act: Call the validation function
    const result = validateTimeFormat(inputTime);

    // Assert: Expect validation to fail
    expect(result.valid).toBe(false);
  });
});

describe('2. Description Validation Tests', () => {

  test('TC09 - Should accept a valid descriptive description', () => {
    // Arrange: A normal description with more than 15 characters
    const description = 'Black leather wallet with student ID card inside.';

    // Act: Call the validation function
    const result = validateDescription(description);

    // Assert: Should pass validation
    expect(result.valid).toBe(true);
  });

  test('TC10 - Should accept description containing numbers inside words', () => {
    // Arrange: A valid sentence that mentions numbers naturally
    const description = 'Found blue water bottle on 2nd floor desk 4.';

    // Act: Call the validation function
    const result = validateDescription(description);

    // Assert: Should pass validation
    expect(result.valid).toBe(true);
  });

  test('TC11 - Should reject description shorter than 15 characters', () => {
    // Arrange: Short description (only 11 characters)
    const shortDescription = 'Blue bottle';

    // Act: Call the validation function
    const result = validateDescription(shortDescription);

    // Assert: Should reject with minimum character message
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Description must contain at least 15 meaningful characters.');
  });

  test('TC12 - Should reject description with exactly 14 characters (boundary test)', () => {
    // Arrange: Exactly 14 characters (1 character below minimum 15)
    const boundaryShort = 'Blue water cup'; // 14 characters

    // Act: Call the validation function
    const result = validateDescription(boundaryShort);

    // Assert: Should fail boundary check
    expect(result.valid).toBe(false);
  });

  test('TC13 - Should accept description with exactly 15 characters (boundary test)', () => {
    // Arrange: Exactly 15 characters (minimum valid boundary)
    const boundaryValid = 'Blue water bowl'; // 15 characters

    // Act: Call the validation function
    const result = validateDescription(boundaryValid);

    // Assert: Should pass boundary check
    expect(result.valid).toBe(true);
  });

  test('TC14 - Should reject description starting with a numerical digit', () => {
    // Arrange: Description starts with number "123"
    const numberStartDescription = '123 Found near the campus library entrance.';

    // Act: Call the validation function
    const result = validateDescription(numberStartDescription);

    // Assert: Should reject starting with digit
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Description must not begin with a numerical digit. Please start with descriptive words.');
  });

  test('TC15 - Should reject description with 5 or more repeated identical characters', () => {
    // Arrange: Spam-like repeated letters "aaaaaa"
    const spamDescription = 'Found a bag aaaaaabbbbbb in room 101.';

    // Act: Call the validation function
    const result = validateDescription(spamDescription);

    // Assert: Should reject repeated characters
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Description must not contain repeated meaningless characters.');
  });

  test('TC16 - Should reject empty or whitespace description', () => {
    // Arrange: Empty string
    const emptyDescription = '   ';

    // Act: Call the validation function
    const result = validateDescription(emptyDescription);

    // Assert: Should reject missing description
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Item description is mandatory.');
  });
});

describe('3. Complete Item Form Validation Tests', () => {

  // Reusable sample of a completely valid item
  const validItemData = {
    title: 'Scientific Calculator',
    category_id: 1,
    location: 'Computer Lab 2',
    identifying_characteristics: 'Casio model with initials AJ engraved on back',
    description: 'Black scientific calculator left on table row 3.',
    approximate_time: '14:30'
  };

  test('TC17 - Should accept a complete valid item with all required fields', () => {
    // Arrange: Use valid item data
    const item = { ...validItemData };

    // Act: Validate the complete item
    const result = validateItemInput(item);

    // Assert: Form should be valid
    expect(result.valid).toBe(true);
  });

  test('TC18 - Should reject an item when title is missing', () => {
    // Arrange: Item with empty title
    const item = { ...validItemData, title: '' };

    // Act: Validate the item
    const result = validateItemInput(item);

    // Assert: Should reject missing title
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Item title is mandatory.');
  });

  test('TC19 - Should reject an item when category is missing', () => {
    // Arrange: Item with null category_id
    const item = { ...validItemData, category_id: null };

    // Act: Validate the item
    const result = validateItemInput(item);

    // Assert: Should reject missing category
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Item category is mandatory.');
  });

  test('TC20 - Should reject an item when location is missing', () => {
    // Arrange: Item with empty location
    const item = { ...validItemData, location: '   ' };

    // Act: Validate the item
    const result = validateItemInput(item);

    // Assert: Should reject missing location
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Item location is mandatory.');
  });

  test('TC21 - Should reject an item when identifying characteristics are missing', () => {
    // Arrange: Item with empty characteristics
    const item = { ...validItemData, identifying_characteristics: '' };

    // Act: Validate the item
    const result = validateItemInput(item);

    // Assert: Should reject missing characteristics
    expect(result.valid).toBe(false);
    expect(result.message).toBe('Identifying characteristics are mandatory.');
  });

  test('TC22 - Should reject an item when approximate time format is invalid', () => {
    // Arrange: Item with invalid time format
    const item = { ...validItemData, approximate_time: 'morning' };

    // Act: Validate the item
    const result = validateItemInput(item);

    // Assert: Should reject invalid time format
    expect(result.valid).toBe(false);
    expect(result.message).toContain('Invalid time format');
  });
});
