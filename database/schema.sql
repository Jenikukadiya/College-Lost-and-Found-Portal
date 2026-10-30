-- College Lost & Found Portal Database Schema
-- Version 1.0

CREATE DATABASE IF NOT EXISTS college_lost_found;
USE college_lost_found;

-- Drop tables in reverse foreign key order if re-initializing
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS blocked_users;
DROP TABLE IF EXISTS user_reports;
DROP TABLE IF EXISTS claims;
DROP TABLE IF EXISTS item_images;
DROP TABLE IF EXISTS items;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;

-- 1. Users table
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

-- 2. Categories table
CREATE TABLE categories (
  category_id INT AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(50) NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Items table
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

-- 4. Item Images table
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

-- 5. Claims table
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

-- 6. User Reports table
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

-- 7. Blocked Users table
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

-- 8. Notifications table
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

-- 9. Audit Logs table
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

-- Seed predefined Categories
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
