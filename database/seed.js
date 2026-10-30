const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seed() {
  console.log('--- Starting Database Seeding ---');
  
  // 1. Connect without selecting database to ensure database exists
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'college_lost_found';

  let connection;
  try {
    connection = await mysql.createConnection({ host, port, user, password, multipleStatements: true });
    console.log(`Connected to MySQL server at ${host}:${port}`);
  } catch (err) {
    console.error('Failed to connect to MySQL server:', err.message);
    process.exit(1);
  }

  try {
    // 2. Read schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    // 3. Execute schema script
    console.log('Executing database/schema.sql...');
    await connection.query(sql);
    console.log(`Database '${dbName}' and tables created successfully.`);

    // 4. Select database
    await connection.changeUser({ database: dbName });

    // 5. Seed Administrator account securely using env variables
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@college.edu';
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminSecurePass123!';
    const adminInstId = process.env.ADMIN_INSTITUTIONAL_ID || 'ADMIN001';
    const adminName = process.env.ADMIN_FULL_NAME || 'System Administrator';
    const adminPhone = process.env.ADMIN_PHONE || '1234567890';
    const adminDept = process.env.ADMIN_DEPARTMENT || 'Administration';

    // Hash admin password using bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminPassword, salt);

    // Check if administrator already exists
    const [existing] = await connection.execute(
      'SELECT user_id FROM users WHERE email = ? OR institutional_id = ?',
      [adminEmail, adminInstId]
    );

    if (existing.length === 0) {
      await connection.execute(
        `INSERT INTO users (full_name, email, phone, password_hash, role, institutional_id, department, account_status)
         VALUES (?, ?, ?, ?, 'Administrator', ?, ?, 'Active')`,
        [adminName, adminEmail, adminPhone, passwordHash, adminInstId, adminDept]
      );
      console.log(`Administrator account created successfully for: ${adminEmail}`);
    } else {
      console.log(`Administrator account (${adminEmail}) already exists. Updating credentials...`);
      await connection.execute(
        `UPDATE users SET password_hash = ?, account_status = 'Active' WHERE email = ?`,
        [passwordHash, adminEmail]
      );
      console.log('Administrator credentials updated.');
    }

    console.log('--- Database Seeding Completed Successfully ---');
  } catch (err) {
    console.error('Error during database seeding:', err.message);
  } finally {
    await connection.end();
  }
}

seed();
