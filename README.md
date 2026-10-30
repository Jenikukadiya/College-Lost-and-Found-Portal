# 🎓 College Lost and Found Portal

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-v4.19-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.x-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Jest](https://img.shields.io/badge/Tested%20with-Jest%2030-C21325?logo=jest&logoColor=white)](https://jestjs.io/)
[![Supertest](https://img.shields.io/badge/Integration-Supertest-green)](https://github.com/ladjs/supertest)
[![Software Engineering](https://img.shields.io/badge/Model-Incremental%20Development-blue)]()

A modern, production-grade, full-stack web application designed for university and college campuses to streamline reporting, searching, claiming, verifying, and recovering lost and found belongings.

Built strictly in accordance with the **Project Management Specification (PMS)** following the **Incremental Software Development Model** for the **Software Engineering Lab**.

---

## 📑 Table of Contents
1. [Project Overview](#-project-overview)
2. [Technology Stack](#-technology-stack)
3. [Key Features & Implemented Increments](#-key-features--implemented-increments)
4. [System Architecture & Directory Structure](#-system-architecture--directory-structure)
5. [Database Schema](#-database-schema)
6. [Prerequisites & System Requirements](#-prerequisites--system-requirements)
7. [Installation & Local Setup](#-installation--local-setup)
8. [Running Automated Tests](#-running-automated-tests)
   - [Unit Testing (55 Tests)](#1-unit-testing-jest)
   - [Integration Testing (22 Tests)](#2-integration-testing-supertest--mysql)
9. [REST API Documentation](#-rest-api-documentation)
10. [Demo Credentials for Viva / Evaluation](#-demo-credentials-for-viva--evaluation)
11. [Software Engineering Concepts Applied](#-software-engineering-concepts-applied)

---

## 🌟 Project Overview

Colleges and university campuses experience frequent loss of student and faculty belongings—such as student ID cards, laptops, calculators, lab equipment, keys, and books. Traditional lost-and-found noticeboards or social media groups suffer from fragmented communication, lack of identity verification, absence of chain of custody, and high risk of fraudulent claims.

The **College Lost and Found Portal** addresses these challenges with:
* **Role-Based Access**: Specialized portals for Students, Faculty, Staff, and Administrators.
* **Strict Input Validation**: Boundary value checks, 24-hour time validation, sanitization, and password security policies.
* **Intelligent Duplicate Prevention & Smart Matching**: Real-time duplicate alerts and rule-based algorithmic matching between lost and found items.
* **Two-Phase Claim Verification**: Evidence submission and administrative verification with atomic resolution of competing claims.
* **Valuable Item Protection**: Escalation workflow requiring admin pre-approval before publishing sensitive or high-value items.
* **Misuse Prevention & Accountability**: User reporting mechanism, real-time access blocking, and tamper-evident audit logging.
* **Automated Data Lifecycle**: Automatic background archiving of inactive and resolved posts.

---

## 🛠️ Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | HTML5, Modern CSS3, Vanilla JavaScript | Responsive layout, modern university aesthetic, accessible modals, live validation feedback |
| **Backend** | Node.js & Express.js | Modular RESTful API architecture, parameterized queries, centralized error handling |
| **Database** | MySQL 8.x | 9 normalized relational tables, foreign key constraints, atomic transactions |
| **Authentication** | `express-session` & `bcryptjs` | Salted password hashing (10 rounds), session cookies, real-time account status checks |
| **File Storage** | `multer` | Strict MIME type validation (JPEG/PNG/WebP) and 5 MB size limits for item images |
| **Testing** | Jest & Supertest | Comprehensive unit tests (55 tests) and end-to-end integration tests (22 tests) |

---

## 🚀 Key Features & Implemented Increments

The project was developed in four distinct increments following the **Incremental Software Development Model**:

### 🔹 Increment 1: Authentication, Item Management & Search
* **User Onboarding & Security**:
  * Registration for Students, Faculty, and Staff with institutional email and ID verification.
  * Strict phone number (10 digits), non-numeric department/course validation, and semester limits (1–8).
  * Password security policy: minimum 8 characters, uppercase, lowercase, digit, and special character.
  * Self-service password reset with registered ID verification.
* **Item Management**:
  * Report Lost and Report Found items with mandatory category, location, date, time (24h format), and characteristics.
  * Real-time duplicate detection warning users of potential existing matches before submission.
  * Multi-filter search (by type, category, date range, keyword, and campus location).
  * Owner actions: edit post details, mark as resolved, or delete item.

### 🔹 Increment 2: Claims, Verification & Physical Handover
* **Claim Workflow**:
  * Claimants submit ownership claims with detailed reasons and verifiable proof/evidence.
  * Posters are strictly barred from claiming their own posted items.
  * Multiple independent claimants can file claims on the same found item.
* **Administrative Verification**:
  * Admin claims dashboard to inspect competing claims and review attached proof.
  * **Atomic Conflict Resolution**: Approving a verified claim automatically rejects all other competing pending claims within an isolated database transaction.
* **Handover & Return**:
  * Confirmed physical item handover transitions item status to `Returned` and locks subsequent claims.

### 🔹 Increment 3: Valuable Items, Misuse Reporting & User Blocking
* **Valuable Item Approval Workflow**:
  * High-value items (wallets, electronics, official documents, cash, jewelry) enter `Pending Approval` upon submission and remain hidden from public search until reviewed.
  * Administrators approve or reject submissions with feedback notes.
* **Platform Misuse Reporting**:
  * Users can report fraudulent claims, spam, or harassment against another user. Self-reporting is prevented.
  * Administrators investigate reports and log corrective action notes.
* **Admin User Blocking**:
  * Administrators can block offending users with a mandatory recorded reason.
  * Real-time authorization middleware immediately revokes access (`HTTP 403 Forbidden`) on all subsequent requests and blocks future login attempts.
  * Administrator unblock functionality restores user privileges.

### 🔹 Increment 4: Smart Matching, Notifications, Archiving & Audit Logs
* **Rule-Based Smart Matching Engine**:
  * Algorithmic scoring cross-matching Lost and Found listings based on category (35 pts), title keywords (up to 30 pts), location keywords (up to 20 pts), identifying characteristics (up to 20 pts), and date proximity (up to 15 pts).
* **Notifications System**:
  * Automated user alerts generated for matching items, claim updates, and approval status changes.
  * Unread notification count badge and full notification center with mark-as-read options.
* **Automated Archiving**:
  * Background process archiving resolved and inactive items past retention thresholds.
* **Tamper-Evident Audit Logging**:
  * Immutable event records for sensitive administrative operations (claim approvals, user blocks, item deletions).
  * Admin KPI dashboard metrics (total users, active items, pending valuables, open claims, resolved cases).

---

## 📁 System Architecture & Directory Structure

```
SE Lost&Found/
├── .env.example                     # Environment configuration template
├── .gitignore                        # Git exclusion rules (node_modules, .env, DB sockets)
├── College_Lost_and_Found_Portal_PMS.md # Complete Project Management Specification
├── README.md                         # Project documentation and guide
├── package.json                      # Project metadata, dependencies, and test scripts
├── package-lock.json                 # Dependency lockfile
├── jest.config.js                    # Jest testing framework configuration
│
├── index.html                        # Public portal homepage and announcements
├── login.html                        # Authentication page with demo credential selectors
├── register.html                     # Multi-field user registration page with live checklist
├── portal.html                       # User dashboard (Search, Post, Claims, Smart Matches)
├── admin.html                        # Administrator moderation & KPI control center
│
├── css/
│   └── style.css                     # Unified stylesheet with design system & components
│
├── js/
│   ├── auth.js                       # Frontend session management & form handlers
│   ├── items.js                      # Item search, posting, and duplicate detection
│   ├── claims.js                     # Claim submission and history tracking
│   └── admin.js                      # Admin KPI dashboard, claims, and moderation workflows
│
├── server/
│   ├── server.js                     # Express HTTP server bootstrap and middleware config
│   ├── database.js                   # MySQL connection pool with parameterized query helper
│   ├── routes.js                     # Central REST API routes & controllers
│   ├── middleware/
│   │   └── authMiddleware.js         # Authentication, authorization & blocked-user guards
│   ├── services/
│   │   └── claimService.js           # Modular business logic for claim verification
│   └── validators/
│       ├── itemValidator.js          # Time, description, and item field validation
│       └── reportValidator.js        # User report validation and self-report guards
│
├── database/
│   ├── schema.sql                    # 9-table relational database schema & default categories
│   ├── seed.js                       # Database seeding script (admin user & sample data)
│   └── init_test_db.js               # Isolated test database initializer (`college_lost_found_test`)
│
├── tests/
│   ├── itemValidation.test.js        # Unit tests: time format, description & required fields
│   ├── reportValidation.test.js      # Unit tests: user reports & self-report prevention
│   ├── claimService.test.js          # Unit tests: claim eligibility & atomic approval rules
│   ├── authPermissions.test.js       # Unit tests: role permissions & blocked account guards
│   └── integration/
│       ├── auth.integration.test.js       # Integration tests: user registration & login
│       ├── items.integration.test.js      # Integration tests: item posting & search
│       ├── claims.integration.test.js     # Integration tests: claim submission & admin review
│       ├── permissions.integration.test.js# Integration tests: route guards & RBAC
│       └── reports.integration.test.js    # Integration tests: user reporting & blocking
│
└── uploads/
    └── .gitkeep                      # Placeholder to maintain uploads directory in Git
```

---

## 🗄️ Database Schema

The database consists of **9 relational tables** enforcing relational integrity via foreign keys:

1. **`users`**: Account records (`user_id`, `full_name`, `email`, `phone`, `password_hash`, `role`, `institutional_id`, `department`, `course`, `semester`, `account_status`, timestamps).
2. **`categories`**: Item categories (`category_id`, `category_name`, `is_active`).
3. **`items`**: Lost and found listings (`item_id`, `post_type`, `user_id`, `category_id`, `title`, `description`, `item_date`, `location`, `approximate_time`, `identifying_characteristics`, `is_valuable`, `status`, `approval_status`, timestamps).
4. **`item_images`**: Stored image attachments (`image_id`, `item_id`, `file_path`, `is_primary`, `uploaded_at`).
5. **`claims`**: Ownership claims on found items (`claim_id`, `item_id`, `claimant_id`, `reason`, `ownership_evidence`, `status`, `verification_notes`, `verified_by`, timestamps).
6. **`user_reports`**: Platform misuse reports (`report_id`, `reporter_id`, `reported_user_id`, `related_item_id`, `reason`, `description`, `status`, `admin_action`, `resolved_by`, timestamps).
7. **`blocked_users`**: User blocking audit log (`block_id`, `user_id`, `blocked_by`, `reason`, `blocked_at`, `unblocked_at`, `unblocked_by`).
8. **`notifications`**: Event notifications (`notification_id`, `user_id`, `title`, `message`, `type`, `reference_id`, `is_read`, timestamps).
9. **`audit_logs`**: Tamper-evident admin action log (`log_id`, `admin_id`, `action_type`, `target_entity`, `target_id`, `details`, `ip_address`, `created_at`).

---

## 💻 Prerequisites & System Requirements

Before running the application, make sure you have:
* **Node.js**: `v18.0.0` or higher installed ([Download Node.js](https://nodejs.org/))
* **npm**: `v9.0.0` or higher (bundled with Node.js)
* **MySQL Server**: `v8.0` or higher installed and running locally
* **Git**: Installed for version control

---

## ⚙️ Installation & Local Setup

### Step 1: Clone or Open the Repository
```bash
git clone <repository_url>
cd "SE Lost&Found"
```

### Step 2: Install Node.js Dependencies
```bash
npm install
```

### Step 3: Environment Configuration
Create a `.env` file in the root directory by copying the template:
```bash
cp .env.example .env
```

Open `.env` and configure your local MySQL settings:
```ini
# Server Configuration
PORT=3000
NODE_ENV=development

# MySQL Database Configuration
DB_HOST=127.0.0.1
DB_PORT=3306        # or 3307 depending on your MySQL setup
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=college_lost_found

# Session Security Key
SESSION_SECRET=college_lost_found_secure_session_key

# Auto-Archiving Threshold (days)
ARCHIVE_DAYS=60
```

### Step 4: Initialize and Seed the Database
Run the automated database setup and seeding script:
```bash
npm run seed
```
This executes `database/schema.sql`, configures tables, populates default item categories, and creates the default administrator account.

### Step 5: Start the Web Application
```bash
# Start standard server
npm start

# Or start in watch mode for development
npm run dev
```

Open your browser and navigate to:
**[http://localhost:3000](http://localhost:3000)**

---

## 🧪 Running Automated Tests

The project includes both **Unit Tests** (Software Engineering Lab Experiment 9) and **Integration Tests** with 100% pass rates.

### 1. Unit Testing (Jest)
Tests isolated business logic, input validation, time formatting, and authorization guards without modifying the database.

```bash
npm test
```

* **Test Suites**: 4 suites
* **Total Tests**: **55 passed / 55 total**
* **Covered Modules**:
  * `tests/itemValidation.test.js`: 24-hour time formats, description length & character repetition boundary tests (22 tests)
  * `tests/reportValidation.test.js`: Self-report blocking, duplicate report prevention, and input sanitization (12 tests)
  * `tests/claimService.test.js`: Claim eligibility, status transitions, and atomic approval conflict checks (12 tests)
  * `tests/authPermissions.test.js`: Role-based access control and blocked account interception (9 tests)

### 2. Integration Testing (Supertest + MySQL)
Tests end-to-end HTTP request/response flows against an isolated MySQL test database (`college_lost_found_test`), verifying that database state updates accurately after API calls.

```bash
npm run test:integration
```

* **Test Suites**: 5 suites
* **Total Tests**: **22 passed / 22 total**
* **Covered Workflows**:
  * `auth.integration.test.js`: Registration validation, duplicate checks, login sessions (5 tests)
  * `items.integration.test.js`: Item posting, category validation, search filtering (4 tests)
  * `claims.integration.test.js`: Ownership claims, multi-claim submission, admin approvals (4 tests)
  * `permissions.integration.test.js`: Unauthenticated blocks, role permissions, 403 Forbidden guards (4 tests)
  * `reports.integration.test.js`: Misuse reporting, admin user blocking, and login restriction (5 tests)

### Run All Tests Together
```bash
npm run test:all
```

---

## 🔌 REST API Documentation

### 🔑 Authentication Endpoints
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register new Student, Faculty, or Staff account |
| `POST` | `/api/auth/login` | Public | Authenticate user credentials and start session |
| `POST` | `/api/auth/logout` | Authenticated | Destroy session and log out |
| `GET` | `/api/auth/me` | Authenticated | Fetch active user session profile |
| `POST` | `/api/auth/forgot-password` | Public | Reset password verifying email & institutional ID |
| `PUT` | `/api/users/profile` | Authenticated | Update user contact details and department |
| `PUT` | `/api/users/password` | Authenticated | Change user account password |

### 📦 Item & Search Endpoints
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/categories` | Public | Get all active item categories |
| `GET` | `/api/items` | Public | Search and filter published lost/found listings |
| `GET` | `/api/items/check-duplicate` | Authenticated | Check for potential duplicate items before posting |
| `POST` | `/api/items` | Authenticated | Submit lost or found item post (with photo upload) |
| `GET` | `/api/items/my/posts` | Authenticated | Retrieve items created by logged-in user |
| `GET` | `/api/items/:id` | Public | Get full item details and images |
| `PUT` | `/api/items/:id` | Owner / Admin | Update item post details |
| `PUT` | `/api/items/:id/status` | Owner / Admin | Mark item post as Resolved |
| `DELETE` | `/api/items/:id` | Owner / Admin | Delete item listing |
| `GET` | `/api/items/:id/matches` | Authenticated | Retrieve rule-based algorithmic matches for item |
| `GET` | `/api/items/matches/my` | Authenticated | Get suggested matches across all user posts |

### 🤝 Claim & Handover Endpoints
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/items/:id/claim` | Authenticated | Submit ownership claim with proof |
| `GET` | `/api/claims/my` | Authenticated | View claim history for current user |
| `PUT` | `/api/claims/:id/cancel` | Claimant | Cancel pending claim |
| `GET` | `/api/admin/claims` | Admin Only | View all submitted claims across all items |
| `PUT` | `/api/admin/claims/:id/approve` | Admin Only | Approve verified claim and reject competing claims |
| `PUT` | `/api/admin/claims/:id/reject` | Admin Only | Reject unverified claim with administrative notes |
| `PUT` | `/api/admin/items/:id/return` | Admin Only | Confirm physical handover and mark item `Returned` |

### 🛡️ Moderation, Admin & Audit Endpoints
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/admin/valuable-items` | Admin Only | View valuable items pending publication approval |
| `PUT` | `/api/admin/items/:id/approve` | Admin Only | Approve and publish valuable item |
| `PUT` | `/api/admin/items/:id/reject` | Admin Only | Reject valuable item submission |
| `POST` | `/api/reports/user` | Authenticated | Submit platform misuse report |
| `GET` | `/api/admin/reports` | Admin Only | View misuse reports |
| `PUT` | `/api/admin/reports/:id/resolve` | Admin Only | Resolve misuse report with notes |
| `GET` | `/api/admin/users` | Admin Only | View all registered accounts and statuses |
| `PUT` | `/api/admin/users/:id/block` | Admin Only | Block offending user account |
| `PUT` | `/api/admin/users/:id/unblock` | Admin Only | Restore blocked user account to Active |
| `GET` | `/api/admin/stats` | Admin Only | Get aggregated KPI statistics |
| `POST` | `/api/admin/archive-run` | Admin Only | Trigger batch auto-archiving run |
| `GET` | `/api/admin/activity` | Admin Only | Fetch tamper-evident administrative audit logs |

---

## 👥 Demo Credentials for Viva / Evaluation

For convenience during lab evaluation and viva presentation, test accounts are available:

| Account Role | Email Identifier | Password | Access Portal |
|---|---|---|---|
| **System Administrator** | `admin@college.edu` | `AdminSecurePass123!` | [Admin Dashboard](http://localhost:3000/admin.html) |
| **Student** | `alice.student@college.edu` | `SecurePass123!` | [User Portal](http://localhost:3000/portal.html) |
| **Faculty Member** | `prof.smith@college.edu` | `SecurePass123!` | [User Portal](http://localhost:3000/portal.html) |

> 💡 **Tip**: The login page (`login.html`) features one-click quick demo fill buttons for fast evaluation during the viva.

---

## 📚 Software Engineering Concepts Applied

* **Incremental Model**: Iterative delivery across 4 distinct, fully documented increments with continuous verification.
* **Requirements Traceability**: Every feature maps directly to documented functional requirements (`FR-01` through `FR-134`) in the PMS specification.
* **Boundary Value Analysis (BVA)**: Applied in test suites to validate edge cases (00:00 midnight time, 23:59 time, 14-char vs 15-char description limits, semesters 1 & 8).
* **Equivalence Class Partitioning (ECP)**: Applied for validating user inputs (valid 10-digit phone numbers vs short/long/alphabetic inputs).
* **Defense in Depth**: Frontend validation, backend schema validation, middleware authorization guards, and database-level constraints.
* **Separation of Concerns**: Modular decomposition into controllers, route handlers, validation services, and database persistence layers.
* **Security Best Practices**: Bcrypt password hashing, session-based authentication, SQL injection defense via parameterized queries, XSS prevention, and strict MIME type checks for uploads.
