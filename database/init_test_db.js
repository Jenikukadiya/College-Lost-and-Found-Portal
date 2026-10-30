/**
 * College Lost & Found Portal - Isolated Test Database Initializer
 *
 * This script safely creates and initializes the isolated `college_lost_found_test` database.
 * It NEVER touches or modifies the production/development `college_lost_found` database.
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function initTestDatabase() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3307', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const testDbName = process.env.TEST_DB_NAME || 'college_lost_found_test';

  console.log(`Connecting to MySQL at ${host}:${port} to initialize [${testDbName}]...`);

  // Connect without database selected first
  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true
  });

  try {
    // 1. Create test database
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${testDbName}\`;`);
    await conn.query(`USE \`${testDbName}\`;`);

    // 2. Drop existing test tables in reverse foreign key order to ensure clean state
    await conn.query(`
      DROP TABLE IF EXISTS audit_logs;
      DROP TABLE IF EXISTS notifications;
      DROP TABLE IF EXISTS blocked_users;
      DROP TABLE IF EXISTS user_reports;
      DROP TABLE IF EXISTS claims;
      DROP TABLE IF EXISTS item_images;
      DROP TABLE IF EXISTS items;
      DROP TABLE IF EXISTS categories;
      DROP TABLE IF EXISTS users;
    `);

    // 3. Create tables in test database
    await conn.query(`
      CREATE TABLE users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        phone VARCHAR(20) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('Student', 'Faculty', 'Staff', 'Administrator') NOT NULL DEFAULT 'Student',
        institutional_id VARCHAR(50) NOT NULL UNIQUE,
        department VARCHAR(100) NOT NULL,
        course VARCHAR(100) NULL,
        semester VARCHAR(20) NULL,
        account_status ENUM('Active', 'Blocked', 'Deactivated') NOT NULL DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE categories (
        category_id INT AUTO_INCREMENT PRIMARY KEY,
        category_name VARCHAR(50) NOT NULL UNIQUE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE items (
        item_id INT AUTO_INCREMENT PRIMARY KEY,
        post_type ENUM('LOST', 'FOUND') NOT NULL,
        user_id INT NOT NULL,
        category_id INT NOT NULL,
        title VARCHAR(150) NOT NULL,
        description TEXT NOT NULL,
        item_date DATE NOT NULL,
        location VARCHAR(150) NOT NULL,
        approximate_time VARCHAR(50) NULL,
        identifying_characteristics TEXT NOT NULL,
        is_valuable BOOLEAN NOT NULL DEFAULT FALSE,
        status ENUM('Draft', 'Pending Approval', 'Published', 'Claimed', 'Returned', 'Rejected', 'Removed', 'Archived') NOT NULL DEFAULT 'Published',
        approval_status ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Approved',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP NULL,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(category_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE item_images (
        image_id INT AUTO_INCREMENT PRIMARY KEY,
        item_id INT NOT NULL,
        file_path VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        file_size INT NOT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (item_id) REFERENCES items(item_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE claims (
        claim_id INT AUTO_INCREMENT PRIMARY KEY,
        item_id INT NOT NULL,
        claimant_id INT NOT NULL,
        reason TEXT NOT NULL,
        ownership_evidence TEXT NOT NULL,
        evidence_file_path VARCHAR(255) NULL,
        status ENUM('Pending', 'Under Verification', 'Approved', 'Rejected', 'Cancelled') NOT NULL DEFAULT 'Pending',
        verification_notes TEXT NULL,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        verified_by INT NULL,
        FOREIGN KEY (item_id) REFERENCES items(item_id) ON DELETE CASCADE,
        FOREIGN KEY (claimant_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (verified_by) REFERENCES users(user_id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE user_reports (
        report_id INT AUTO_INCREMENT PRIMARY KEY,
        reporter_id INT NOT NULL,
        reported_user_id INT NOT NULL,
        related_item_id INT NULL,
        reason VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        status ENUM('Pending', 'Under Investigation', 'Resolved', 'Dismissed') NOT NULL DEFAULT 'Pending',
        admin_action TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP NULL,
        resolved_by INT NULL,
        FOREIGN KEY (reporter_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (reported_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (related_item_id) REFERENCES items(item_id) ON DELETE SET NULL,
        FOREIGN KEY (resolved_by) REFERENCES users(user_id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE blocked_users (
        block_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        blocked_by INT NOT NULL,
        reason TEXT NOT NULL,
        blocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        unblocked_at TIMESTAMP NULL,
        status ENUM('Active', 'Unblocked') NOT NULL DEFAULT 'Active',
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (blocked_by) REFERENCES users(user_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE notifications (
        notification_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        related_item_id INT NULL,
        related_claim_id INT NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (related_item_id) REFERENCES items(item_id) ON DELETE SET NULL,
        FOREIGN KEY (related_claim_id) REFERENCES claims(claim_id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE audit_logs (
        audit_id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id INT NOT NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INT NULL,
        details TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 4. Seed predefined categories in test database
    await conn.query(`
      INSERT INTO categories (category_name) VALUES
        ('Electronics'),
        ('Identification & Cards'),
        ('Keys'),
        ('Books & Stationery'),
        ('Bags & Backpacks'),
        ('Clothing & Accessories'),
        ('Valuables & Jewelry'),
        ('Wallets & Purses'),
        ('Other');
    `);

    // 5. Seed default Administrator account in test database
    const bcrypt = require('bcryptjs');
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@college.edu';
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminSecurePass123!';
    const adminInstId = process.env.ADMIN_INSTITUTIONAL_ID || 'ADMIN001';
    const adminName = process.env.ADMIN_FULL_NAME || 'System Administrator';
    const adminPhone = process.env.ADMIN_PHONE || '1234567890';
    const adminDept = process.env.ADMIN_DEPARTMENT || 'Administration';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminPassword, salt);

    await conn.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role, institutional_id, department, account_status)
       VALUES (?, ?, ?, ?, 'Administrator', ?, ?, 'Active')`,
      [adminName, adminEmail, adminPhone, passwordHash, adminInstId, adminDept]
    );

    console.log(`[SUCCESS] Isolated test database [${testDbName}] initialized successfully!`);
    return true;
  } catch (err) {
    console.error(`[ERROR] Failed to initialize test database:`, err.message);
    throw err;
  } finally {
    await conn.end();
  }
}

if (require.main === module) {
  initTestDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { initTestDatabase };
