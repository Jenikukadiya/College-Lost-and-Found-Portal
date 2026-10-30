const mysql = require('mysql2/promise');
require('dotenv').config();

const dbName = process.env.NODE_ENV === 'test'
  ? (process.env.TEST_DB_NAME || 'college_lost_found_test')
  : (process.env.DB_NAME || 'college_lost_found');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: dbName,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Helper function for executing parameterized queries
async function query(sql, params = []) {
  const [results] = await pool.execute(sql, params);
  return results;
}

// Helper to test database connection
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('Successfully connected to MySQL database:', dbName);
    conn.release();
    return true;
  } catch (err) {
    console.error('MySQL connection error:', err.message);
    return false;
  }
}

// Helper to cleanly close pool after integration tests
async function closePool() {
  try {
    await pool.end();
  } catch (err) {
    // Ignore if already closed
  }
}

module.exports = {
  pool,
  query,
  testConnection,
  closePool,
  dbName
};
