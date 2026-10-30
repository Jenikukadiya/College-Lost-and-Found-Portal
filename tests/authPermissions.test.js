/**
 * Unit Tests: Authentication & Authorization Permissions Middleware
 * Software Engineering Lab Experiment 9
 *
 * This file tests:
 * 1. requireAdmin - Verifies only active Administrators can access admin endpoints
 * 2. requireAuth - Verifies only logged-in and active users can perform protected actions
 */

// Import the middleware functions
const { requireAdmin, requireAuth } = require('../server/middleware/authMiddleware');

describe('1. Administrator Permission Guard (requireAdmin) Tests', () => {

  test('TC47 - Should reject unauthenticated visitor with 401 Unauthorized', async () => {
    // Arrange: Request without a logged-in user session
    const req = { session: null };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();
    const mockDb = { query: jest.fn() };

    // Act: Call the middleware
    await requireAdmin(req, res, next, mockDb);

    // Assert: Must return 401 and must NOT call next()
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Authentication required.'
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('TC48 - Should reject regular student user trying to access admin route with 403 Forbidden', async () => {
    // Arrange: Logged-in user is a Student
    const req = {
      session: {
        user: { user_id: 10, role: 'Student' }
      }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    // Mock database returning the student's role
    const mockDb = {
      query: jest.fn().mockResolvedValueOnce([
        { role: 'Student', account_status: 'Active' }
      ])
    };

    // Act: Call the middleware
    await requireAdmin(req, res, next, mockDb);

    // Assert: Must return 403 Forbidden
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Access denied. Administrator privilege required.'
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('TC49 - Should reject faculty user trying to access admin route with 403 Forbidden', async () => {
    // Arrange: Logged-in user is Faculty
    const req = {
      session: {
        user: { user_id: 15, role: 'Faculty' }
      }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    const mockDb = {
      query: jest.fn().mockResolvedValueOnce([
        { role: 'Faculty', account_status: 'Active' }
      ])
    };

    // Act: Call the middleware
    await requireAdmin(req, res, next, mockDb);

    // Assert: Must return 403 Forbidden
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Access denied. Administrator privilege required.'
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('TC50 - Should reject staff user trying to access admin route with 403 Forbidden', async () => {
    // Arrange: Logged-in user is Staff
    const req = {
      session: {
        user: { user_id: 18, role: 'Staff' }
      }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    const mockDb = {
      query: jest.fn().mockResolvedValueOnce([
        { role: 'Staff', account_status: 'Active' }
      ])
    };

    // Act: Call the middleware
    await requireAdmin(req, res, next, mockDb);

    // Assert: Must return 403 Forbidden
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Access denied. Administrator privilege required.'
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('TC51 - Should reject blocked administrator account with 403 Forbidden', async () => {
    // Arrange: Administrator user whose account status is 'Blocked'
    const req = {
      session: {
        user: { user_id: 1, role: 'Administrator' }
      }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    const mockDb = {
      query: jest.fn().mockResolvedValueOnce([
        { role: 'Administrator', account_status: 'Blocked' }
      ])
    };

    // Act: Call the middleware
    await requireAdmin(req, res, next, mockDb);

    // Assert: Blocked admin cannot perform administrative actions
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Administrator account is currently blocked.'
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('TC52 - Should allow access and call next() when user is an active administrator', async () => {
    // Arrange: Valid active Administrator
    const req = {
      session: {
        user: { user_id: 1, role: 'Administrator' }
      }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    const mockDb = {
      query: jest.fn().mockResolvedValueOnce([
        { role: 'Administrator', account_status: 'Active' }
      ])
    };

    // Act: Call the middleware
    await requireAdmin(req, res, next, mockDb);

    // Assert: next() should be executed, no errors returned
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('2. User Authentication & Blocked Status Guard (requireAuth) Tests', () => {

  test('TC53 - Should reject visitor without session on protected route with 401', async () => {
    // Arrange: Unauthenticated user
    const req = { session: null };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();
    const mockDb = { query: jest.fn() };

    // Act: Call the middleware
    await requireAuth(req, res, next, mockDb);

    // Assert: Must return 401 Unauthorized
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Authentication required. Please log in.'
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('TC54 - Should reject blocked student user on protected route with 403', async () => {
    // Arrange: Student user whose database status is 'Blocked'
    const req = {
      session: {
        user: { user_id: 25, account_status: 'Active' }
      }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    const mockDb = {
      query: jest.fn().mockResolvedValueOnce([
        { account_status: 'Blocked' }
      ])
    };

    // Act: Call the middleware
    await requireAuth(req, res, next, mockDb);

    // Assert: Blocked user must receive 403 Forbidden
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Your account has been blocked due to portal policy violation. Restricted actions are prohibited.'
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('TC55 - Should allow access and call next() when student account is active', async () => {
    // Arrange: Active student user
    const req = {
      session: {
        user: { user_id: 25, account_status: 'Active' }
      }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    const mockDb = {
      query: jest.fn().mockResolvedValueOnce([
        { account_status: 'Active' }
      ])
    };

    // Act: Call the middleware
    await requireAuth(req, res, next, mockDb);

    // Assert: User is allowed through to next()
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
