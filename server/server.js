const express = require('express');
const session = require('express-session');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const db = require('./database');
const apiRoutes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Express Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'college_lost_found_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true if running HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours session duration
    }
  })
);

// Serve static uploaded images
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..')));

// Register API Routes
app.use('/api', apiRoutes);

// Root route redirects to landing page index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'An unexpected internal server error occurred.'
  });
});

// Start Server & Test Database Connection (only when executed directly, not when imported by tests)
let server = null;
if (require.main === module) {
  server = app.listen(PORT, async () => {
    console.log(`====================================================`);
    console.log(`  College Lost & Found Portal Server Running`);
    console.log(`  Port: http://localhost:${PORT}`);
    console.log(`====================================================`);
    
    await db.testConnection();
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n[FATAL] Port ${PORT} is already in use by another process.`);
      console.error(`Please terminate the existing process or use a different PORT in .env.\n`);
      process.exit(1);
    } else {
      console.error('Server error:', err);
    }
  });
}

module.exports = app;

