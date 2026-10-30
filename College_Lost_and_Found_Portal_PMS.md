**COLLEGE LOST & FOUND PORTAL**

**PROJECT MASTER SPECIFICATION (PMS)**

*A Software Engineering Project Specification*

  **Document Item**     **Value**
  --------------------- --------------------------------------------------
  Project               College Lost & Found Portal
  Document              Project Master Specification (PMS)
  Project Type          Web-based Software Engineering Project
  Selected SDLC Model   Incremental Model with short verification cycles
  Frontend              HTML5, CSS3, Vanilla JavaScript
  Backend               Node.js + Express
  Database              MySQL
  Primary Users         Students, Faculty, Authorized Staff
  Administrator         College Portal Administrator
  Prepared for          Software Engineering Lab / Project Development
  Version               1.0

*Prepared from the submitted project requirements, client questionnaire,
product backlog, and existing UML material.*

# 1. Document Control & Purpose

This PMS is the single source of truth for implementing the College Lost
& Found Portal. It converts the submitted requirements and Software
Engineering lab material into a development-ready specification for an
AI coding agent such as Antigravity and for human developers.

  **Version**   **Purpose**                                                       **Status**
  ------------- ----------------------------------------------------------------- -------------------
  1.0           Initial complete master specification for development             Baseline
  Future        Requirement changes must be recorded here before implementation   Change-controlled

## 1.1 How this document must be used

1.  Read the complete PMS before writing or modifying code.
2.  Treat MUST/SHALL requirements as mandatory unless the project owner
    explicitly changes them.
3.  Do not silently remove, rename, or reinterpret a role, business
    rule, status, or workflow.
4.  Implement the project incrementally and test each increment before
    starting the next.
5.  Keep the implementation simple: HTML, CSS and JavaScript are
    preferred over unnecessary frameworks.
6.  Do not create a separate file for every small function. Files should
    represent meaningful modules.
7.  Every source file must have a clear responsibility reflected by its
    filename.
8.  Any unresolved ambiguity must be documented in the README rather
    than guessed silently.

## 1.2 Source basis

The PMS is based primarily on the uploaded requirements document and the
Software Engineering Laboratory Manual/project report. The requirements
document defines 134 functional requirements and 62 non-functional
requirements, while the lab material provides the project abstract,
client questionnaire, backlog and UML artefacts.

# 2. Project Overview

## 2.1 Problem Statement

Traditional college lost-and-found handling is often manual, fragmented
and difficult to track. Students and staff may not know where to report
a lost or found item, how to discover a matching item, or how ownership
should be verified when multiple people claim the same item. The
proposed portal provides a centralized, authenticated and traceable
platform for reporting lost/found items, searching and matching them,
submitting claims, verifying ownership, managing valuable items,
reporting misuse and completing item returns.

## 2.2 Project Objectives

-   Provide a centralized digital platform for lost and found items
    within the college.
-   Restrict portal access to verified college users.
-   Allow users to submit and manage lost and found posts.
-   Provide keyword search and useful filters for discovery.
-   Identify potential matches between lost and found posts.
-   Provide a controlled claim and ownership-verification process.
-   Apply additional administrator approval to valuable/high-value
    items.
-   Allow users to report portal misuse and allow administrators to
    investigate it.
-   Allow administrators to block/unblock users when appropriate.
-   Maintain item, claim, report and administrative records.
-   Archive old or resolved records while keeping them available for
    authorized reference.

## 2.3 Scope

  **In Scope**                               **Out of Scope for Initial Version**
  ------------------------------------------ --------------------------------------
  Registration/login and role-based access   Public anonymous posting
  Lost/found posting and image upload        Open access to non-college users
  Search, filters and item details           Complex AI image recognition
  Potential matching                         External marketplace/e-commerce
  Claims and ownership evidence              Payment processing
  Valuable-item approval                     Unrelated campus services
  Misuse reports and blocking                Over-engineered microservices
  Notifications                              Large-scale enterprise deployment
  Archiving and audit records                Unnecessary third-party integrations

## 2.4 Stakeholders

  **Stakeholder**   **Interest / Responsibility**
  ----------------- --------------------------------------------------------------------------
  Student           Report/search/claim/resolve items; report misuse
  Faculty           Same core portal functions as an authorized college user
  Staff             Same core portal functions as an authorized college user
  Administrator     Approve valuable posts, verify claims, investigate reports, manage users
  Project Team      Develop, test, document and maintain the system
  College/Client    Defines policy and approves business rules

# 3. Software Engineering Process & SDLC Model

## 3.1 Selected Model: Incremental Model

The project will use the Incremental Software Development Model. The
complete system is divided into functional increments. Each increment is
designed, coded, tested and reviewed before the next increment is added.
This is appropriate because the submitted requirements already identify
a natural progression from core portal functions to special
security/verification logic and then enhancements.

## 3.2 Why Incremental Model fits this project

-   The portal can deliver useful functionality early: authentication →
    posting → search → claim → return.
-   Complex modules such as valuable-item approval and multiple-claim
    verification can be added after the core workflow is stable.
-   Testing can be performed after every increment, reducing the chance
    that one large implementation hides defects.
-   Requirements can remain traceable to individual increments.
-   The approach matches the submitted project plan of Core System,
    Special Project Logic and Enhancement phases.

  **Increment**                               **Modules**                                                                   **Exit Criteria**
  ------------------------------------------- ----------------------------------------------------------------------------- ----------------------------------------------------
  Increment 1 --- Core                        Registration, login, roles, profile, lost/found posts, search, item details   Users can securely register/login, post and search
  Increment 2 --- Resolution                  Claims, ownership proof, claim statuses, return workflow                      A found item can be claimed, verified and returned
  Increment 3 --- Project-specific controls   Valuable-item approval, multiple claims, misuse reports, blocking             Admin can control high-risk workflows
  Increment 4 --- Enhancements                Matching, notifications, archiving, audit/activity, advanced filters          Complete traceable portal with enhancement modules

## 3.3 Engineering workflow for every increment

1.  Confirm requirements and acceptance criteria.
2.  Update database schema only if required by the increment.
3.  Implement backend logic and validation.
4.  Implement or update the relevant HTML/CSS/JavaScript screens.
5.  Run positive, negative and authorization tests.
6.  Check database state after important transactions.
7.  Review naming, comments, code duplication and unused code.
8.  Update README and traceability information.
9.  Only then proceed to the next increment.

# 4. Technical Architecture

## 4.1 Recommended technology stack

  **Layer**                   **Technology**                                    **Reason**
  --------------------------- ------------------------------------------------- ---------------------------------------------------------------------------------------
  Presentation                HTML5                                             Simple, transparent page structure; easy for a Software Engineering lab project
  Styling                     CSS3                                              No UI framework required; full control over layout and responsive design
  Client logic                Vanilla JavaScript                                Keeps coding basic and avoids unnecessary frontend framework complexity
  Server                      Node.js + Express                                 JavaScript backend; simple API development and same language across stack
  Database                    MySQL                                             Relational structure fits users, items, claims, reports and foreign-key relationships
  Authentication              Server-side session + bcrypt password hashing     Simple secure authentication suitable for this project
  Image upload                Multer on server; local uploads for development   Simple implementation; validate file type and size
  Development database tool   MySQL Workbench or phpMyAdmin                     Easy schema inspection and SQL execution

## 4.2 Database recommendation: MySQL

MySQL is recommended because the portal has strongly related structured
data: users own posts, claims refer to items, reports refer to users,
administrators perform actions, and statuses must remain consistent.
Primary keys, foreign keys, unique constraints and transactions directly
support the stated data-integrity requirements.

## 4.3 Three-layer architecture

  **Layer**            **Responsibility**                                             **Examples**
  -------------------- -------------------------------------------------------------- -------------------------------
  Presentation Layer   Displays pages/forms and collects user input                   HTML, CSS, browser JavaScript
  Application Layer    Authentication, authorization, validation and business rules   Express routes/controllers
  Data Layer           Stores and retrieves persistent records                        MySQL tables, SQL queries

## 4.4 Core architecture rule

Browser code must not directly connect to MySQL. All database operations
must pass through the server. Authorization must be checked on the
server even if the UI hides an unavailable button.

# 5. Project Structure & File Responsibilities

The project intentionally uses a small number of meaningful files. Do
not create dozens of files for individual buttons or tiny functions.

    lost-and-found-portal/
    │
    ├── index.html                 # Landing page / project entry
    ├── login.html                 # Login form
    ├── register.html              # Registration form
    ├── portal.html                # Main authenticated user portal/dashboard
    ├── admin.html                 # Administrator dashboard
    │
    ├── css/
    │   └── style.css              # Shared responsive styling
    │
    ├── js/
    │   ├── auth.js                # Login, registration, logout, session UI
    │   ├── items.js               # Lost/found posting, search, filters, item details
    │   ├── claims.js              # Claim submission, evidence, claim status/return
    │   └── admin.js               # Admin approvals, reports, blocking, archive/activity
    │
    ├── server/
    │   ├── server.js              # Express server, middleware and route registration
    │   ├── database.js            # MySQL connection and database helper functions
    │   └── routes.js              # API endpoints and request/response handling
    │
    ├── uploads/                   # Development image storage
    │
    ├── database/
    │   └── schema.sql             # Database tables, constraints and seed/admin setup
    │
    └── README.md                  # Setup, architecture, coding rules and test instructions

## 5.1 File naming rule

-   Use lowercase descriptive names with hyphens only when needed for
    multi-word HTML pages.
-   Do not use names such as temp.js, final.js, new.js, test2.js or
    code.js.
-   A file name must tell a developer what responsibility it owns.
-   Shared styling belongs in style.css rather than separate CSS files
    for every page.
-   Only create a new module when the existing module would become
    difficult to understand or maintain.

## 5.2 Responsibility rule

Each file should have one clear primary responsibility. A file may
contain multiple related functions, but unrelated modules must not be
mixed together.

# 6. Coding Standards & Development Rules

## 6.1 General standards

-   Use meaningful camelCase names for JavaScript variables and
    functions.
-   Use PascalCase only for classes/constructors if classes are
    introduced.
-   Use UPPER_SNAKE_CASE for true constants such as MAX_IMAGE_SIZE.
-   Use descriptive HTML IDs and class names such as loginForm,
    itemSearchInput and claimStatus.
-   Use 2 or 4 spaces consistently; do not mix indentation styles.
-   Use semicolons consistently in JavaScript.
-   Avoid deeply nested functions and repeated code.
-   Keep functions short and focused on one logical task.
-   Validate all user input on the server; client validation is for
    usability, not security.
-   Never store passwords as plain text.

## 6.2 Comments

Comments should explain why non-obvious logic exists, not repeat what
the code obviously says.

Good:

    // Valuable posts remain hidden until an administrator approves them.

Avoid:

    // This is an if statement.

## 6.3 Global and local variables

  **Scope**                    **Rule**                                                  **Example**
  ---------------------------- --------------------------------------------------------- -----------------------------------------------
  Global/module constant       Use only for values genuinely shared by a module          const MAX_IMAGE_SIZE = 5 \* 1024 \* 1024;
  Module-level shared object   Use sparingly for configuration or initialized services   const db = createDatabaseConnection();
  Function-local variable      Default choice for temporary/calculated values            const itemId = req.params.itemId;
  Avoid                        Do not create unnecessary mutable globals                 let currentUser = \... at global window scope

## 6.4 Security coding rules

-   Hash passwords using bcrypt before storing them.
-   Use parameterized SQL queries; never concatenate user input into SQL
    strings.
-   Check session/authentication before protected operations.
-   Check role authorization on the server for administrator operations.
-   Check ownership before editing/deleting a user\'s own post.
-   Validate upload extension, MIME type and size.
-   Do not expose claim evidence or private contact information
    publicly.
-   Do not put passwords, database credentials or secret keys into
    frontend JavaScript.

## 6.5 Error handling

-   Return user-friendly messages such as \'Your claim could not be
    submitted. Please provide ownership proof.\'
-   Do not expose SQL errors, stack traces or credentials to the
    browser.
-   Log useful technical details on the server during development.
-   Handle database/network failures gracefully.

# 7. Roles, Permissions & Access Control

  **Function**                  **Student**   **Faculty**   **Staff**   **Administrator**
  ----------------------------- ------------- ------------- ----------- ----------------------------------
  Register/Login                ✓             ✓             ✓           Admin account managed separately
  Submit lost/found post        ✓             ✓             ✓           Optional
  Search/view published items   ✓             ✓             ✓           ✓
  Submit claim                  ✓             ✓             ✓           ✓
  Submit ownership evidence     ✓             ✓             ✓           ✓
  Report user misuse            ✓             ✓             ✓           ✓
  Edit/delete own posts         ✓             ✓             ✓           ✓ where applicable
  Approve valuable posts        ---           ---           ---         ✓
  Verify claims                 ---           ---           ---         ✓
  Investigate misuse reports    ---           ---           ---         ✓
  Block/unblock users           ---           ---           ---         ✓
  Remove inappropriate posts    ---           ---           ---         ✓
  View admin activity           ---           ---           ---         ✓

## 7.1 Important distinction

Submit Post and Report User are different functions. A lost/found post
describes an item. A user misuse report describes inappropriate
behaviour by another portal user. They must be represented separately in
the UI, database and backend.

# 8. Core Business Rules & Workflows

## 8.1 Registration and authentication

1.  User selects Student, Faculty or Staff.
2.  User enters required identity and contact information.
3.  System validates mandatory fields and uniqueness of
    email/institutional ID.
4.  System validates password rules.
5.  System securely hashes the password and creates an Active account.
6.  User logs in using registered credentials.
7.  Server establishes an authenticated session and redirects the user
    to the appropriate portal.
8.  Blocked users must not be allowed to perform restricted portal
    activities.

## 8.2 Lost/found post workflow

1.  Authenticated user chooses Lost Item or Found Item.
2.  User enters item information and optionally uploads an image.
3.  System validates the form.
4.  Normal/low-value item → publish automatically after validation.
5.  Valuable/high-value item → create Pending Approval record and keep
    it hidden from normal users.
6.  Administrator approves or rejects the valuable post.
7.  Approved post becomes visible; rejected post remains unavailable to
    normal search.

## 8.3 Claim workflow

1.  Authenticated user opens a found-item detail page.
2.  User submits claim reason and ownership evidence.
3.  System creates a Pending claim.
4.  Administrator reviews evidence where required.
5.  If multiple claims exist, administrator reviews all claims and
    selects the legitimate claimant based on submitted evidence.
6.  Approved claim changes item state appropriately; rejected claims
    remain recorded with the rejection status.
7.  After successful handover, item is marked Returned and further
    claims are prevented.

## 8.4 Misuse workflow

1.  User selects Report User Misuse from an appropriate user/item
    context.
2.  User selects or enters a misuse reason and description.
3.  System stores report as Pending.
4.  Administrator reviews relevant activity/posts.
5.  Administrator may take no action, warn, remove inappropriate content
    or block the user.
6.  Report becomes Resolved or Dismissed as appropriate.

## 8.5 Archiving

Based on the submitted client questionnaire, unresolved posts are
intended to be archived after 60 days; returned items are completed and
moved to archive for future reference. The 60-day period must be stored
as a configurable value rather than hard-coded throughout the
application.

# 9. Status Model

  **Entity**               **Allowed / Recommended Statuses**
  ------------------------ ------------------------------------------------------------------------------------
  Account                  Active, Blocked, Deactivated
  Lost/Found Post          Draft, Pending Approval, Published, Claimed, Returned, Rejected, Removed, Archived
  Claim                    Pending, Under Verification, Approved, Rejected, Cancelled
  Misuse Report            Pending, Under Investigation, Resolved, Dismissed
  Valuable Post Approval   Pending, Approved, Rejected
  Item resolution          Available → Claimed → Returned

## 9.1 State transition rules

-   A Pending Approval valuable post cannot appear in normal published
    search results.
-   A Rejected or Removed post cannot be claimed through normal user
    workflow.
-   A Returned item cannot accept new claims.
-   A Blocked user cannot create restricted new posts/claims.
-   An Archived post is excluded from active search by default.
-   Only authorized administrators may perform administrative status
    transitions.

# 10. Functional Requirements Baseline

The following baseline preserves the requirement IDs and intent supplied
in the requirements document. These IDs should be used in implementation
comments, test cases and acceptance checks.

## 10.1 Registration

**FR-01 ---** The system shall allow a new user to create an account.

**FR-02 ---** The system shall allow the user to select Student, Faculty
or Staff.

**FR-03 ---** The system shall collect full name, email, phone,
password, user type, applicable institutional ID, department and
applicable course/semester.

**FR-04 ---** The system shall ensure each email address is associated
with only one active account.

**FR-05 ---** The system shall prevent duplicate accounts using the same
registered email or institutional ID.

**FR-06 ---** The system shall validate password rules including minimum
length, uppercase, lowercase, number and special character.

**FR-07 ---** The system shall validate all mandatory registration
fields before account creation.

**FR-08 ---** The system shall display an appropriate error message for
invalid registration data.

**FR-09 ---** After successful registration, the system shall create the
account and store account information securely.

**FR-10 ---** The system shall maintain account status: Active, Blocked
or Deactivated.

## 10.2 Login & Authentication

**FR-11 ---** The system shall allow registered users to log in using
registered credentials.

**FR-12 ---** The system shall verify entered email/ID and password.

**FR-13 ---** Incorrect credentials shall produce an appropriate error
message.

**FR-14 ---** Successful authentication shall redirect the user to the
appropriate dashboard.

**FR-15 ---** The system shall identify Student, Faculty, Staff and
Administrator roles.

**FR-16 ---** The system shall provide functionality according to the
user\'s role.

**FR-17 ---** The system shall allow secure logout.

**FR-18 ---** The system shall maintain an authenticated session for
protected features.

**FR-19 ---** Unauthenticated users shall be prevented from protected
functions.

**FR-20 ---** Blocked users shall be prevented from restricted portal
functions.

**FR-21 ---** The system should provide forgotten-password reset.

## 10.3 User Profile

**FR-22 ---** Users shall be able to view their profile.

**FR-23 ---** Users shall be able to update permitted profile
information.

**FR-24 ---** Profile may display name, email, phone, type, department,
course/semester and account status.

**FR-25 ---** Authenticated users shall be able to change password.

**FR-26 ---** The system may show history of lost posts, found posts,
claims and reports.

## 10.4 Lost Item

**FR-27 ---** Authenticated users shall be able to submit a lost-item
post.

**FR-28 ---** Lost-item post shall collect title, category, description,
lost date/location, approximate time, identifying characteristics,
optional photo, contact preferences and valuable-item indication.

**FR-29 ---** User shall select an item category.

**FR-30 ---** User shall provide an identifying description.

**FR-31 ---** User shall specify lost location.

**FR-32 ---** User shall specify lost date.

**FR-33 ---** System shall allow lost-item image upload where available.

**FR-34 ---** User shall indicate whether the item is
valuable/high-value.

**FR-35 ---** System shall validate lost-item information before
publication.

**FR-36 ---** Normal/low-value posts that pass validation shall be
automatically published.

**FR-37 ---** Valuable posts shall enter pending administrator review.

**FR-38 ---** Valuable post status shall support Pending, Approved and
Rejected.

**FR-39 ---** System should detect/warn about possible duplicate lost
posts.

**FR-40 ---** Owner shall be able to edit permitted lost-post
information.

**FR-41 ---** Owner shall be able to delete own lost post subject to
rules.

**FR-42 ---** User shall be able to mark a lost post as
resolved/returned where appropriate.

## 10.5 Found Item

**FR-43 ---** Authenticated users shall be able to submit a found-item
post.

**FR-44 ---** Found post shall collect title, category, description,
found date/location, approximate time, identifying characteristics,
optional photo and valuable-item indication.

**FR-45 ---** User shall provide found location.

**FR-46 ---** User shall specify found date.

**FR-47 ---** System shall allow found-item photograph upload.

**FR-48 ---** System shall validate found-item information.

**FR-49 ---** Normal/low-value found items passing validation shall be
automatically published.

**FR-50 ---** Valuable found items shall require administrator review
before publication.

**FR-51 ---** Owner shall be able to edit permitted found-post
information.

**FR-52 ---** Owner shall be able to delete own found post.

**FR-53 ---** Found item shall be markable as returned after successful
claim verification.

## 10.6 Search

**FR-54 ---** Authenticated users shall be able to search lost and found
items.

**FR-55 ---** Users shall be able to search by keyword.

**FR-56 ---** Users shall be able to filter by category.

**FR-57 ---** Users shall be able to filter by location.

**FR-58 ---** Users shall be able to filter by date.

**FR-59 ---** Users shall be able to select Lost, Found or Both.

**FR-60 ---** System shall display relevant matching items.

**FR-61 ---** Users shall be able to view item details.

**FR-62 ---** System may sort by most recent, date, category or
location.

## 10.7 Matching

**FR-63 ---** System shall identify potential matches between lost and
found posts.

**FR-64 ---** Matching may consider category, item name, description,
location, date and identifying characteristics.

**FR-65 ---** System shall display potential matching items to relevant
users.

**FR-66 ---** System shall notify users when a potential match is
identified.

**FR-67 ---** System shall allow a found item to be associated with a
relevant lost-item post.

## 10.8 Claims

**FR-68 ---** Authenticated user shall be able to submit a claim for a
found item.

**FR-69 ---** Claimant shall provide a reason for believing the item is
theirs.

**FR-70 ---** Claimant shall be able to provide ownership evidence such
as photograph, purchase information, serial number or unique identifying
information.

**FR-71 ---** Claim status shall support Pending, Under Verification,
Approved, Rejected and Cancelled.

**FR-72 ---** Multiple users shall be able to submit claims for the same
found item.

**FR-73 ---** Administrator shall be able to see all claims associated
with an item.

**FR-74 ---** Administrator shall verify ownership evidence.

**FR-75 ---** Administrator shall approve a legitimate claim.

**FR-76 ---** Administrator shall reject an invalid claim.

**FR-77 ---** Where multiple claims exist, administrator shall select
the legitimate claimant based on submitted evidence.

**FR-78 ---** Users shall be able to track claim status.

**FR-79 ---** User shall be able to cancel a pending claim where
permitted.

## 10.9 Return

**FR-80 ---** System shall allow an item to be marked returned after
successful claim verification.

**FR-81 ---** Item status shall update after return, e.g. Available →
Claimed → Returned.

**FR-82 ---** Returned items shall not accept new claims.

**FR-83 ---** Affected claimants should be notified of the final
decision.

**FR-84 ---** Associated lost/found posts may be marked resolved after
successful return.

## 10.10 User Misuse

**FR-85 ---** User shall be able to report another user for portal
misuse.

**FR-86 ---** Reporter shall select/enter a misuse reason such as fake
claim, spam, fake post, harassment, misuse or other.

**FR-87 ---** Reporter shall provide additional details.

**FR-88 ---** System shall store the misuse report.

**FR-89 ---** Report status shall support Pending, Under Investigation,
Resolved and Dismissed.

**FR-90 ---** Administrator shall investigate misuse reports.

**FR-91 ---** Administrator shall review relevant user activity/posts.

**FR-92 ---** Administrator may take no action, warn, remove
inappropriate content or block the user.

## 10.11 Blocking

**FR-93 ---** Administrator shall be able to block users who repeatedly
violate portal rules.

**FR-94 ---** Administrator shall record a block reason.

**FR-95 ---** Blocked users shall be restricted from portal activities
defined by policy.

**FR-96 ---** Administrator shall be able to unblock users.

**FR-97 ---** System should maintain blocking history.

## 10.12 Notifications

**FR-98 ---** System shall provide notifications for important events.

**FR-99 ---** User shall receive potential-match notifications.

**FR-100 ---** Relevant user shall receive claim-status notifications.

**FR-101 ---** User shall be notified when a valuable post is approved
or rejected.

**FR-102 ---** Reporter may be notified about misuse-report resolution.

**FR-103 ---** Relevant users shall be notified when an item is
returned.

**FR-104 ---** Users should be able to view notification history.

## 10.13 Administration

**FR-105 ---** Administrator shall authenticate using administrator
credentials.

**FR-106 ---** System shall provide an administrator dashboard.

**FR-107 ---** Administrator shall view pending valuable posts.

**FR-108 ---** Administrator shall approve valuable item posts.

**FR-109 ---** Administrator shall reject valuable item posts.

**FR-110 ---** Administrator shall view submitted claims.

**FR-111 ---** Administrator shall verify claims.

**FR-112 ---** Administrator shall view and manage users.

**FR-113 ---** Administrator shall investigate misuse reports.

**FR-114 ---** Administrator shall remove inappropriate/fake posts.

**FR-115 ---** Administrator shall block problematic users.

**FR-116 ---** Administrator shall unblock users.

**FR-117 ---** Administrator may view relevant system activity and
records.

## 10.14 Item Management

**FR-118 ---** Users shall be able to view their own lost/found posts.

**FR-119 ---** Users shall be able to edit own posts where permitted.

**FR-120 ---** Users shall be able to delete own posts where permitted.

**FR-121 ---** System shall maintain post statuses: Draft, Pending
Approval, Published, Claimed, Returned, Rejected, Removed and Archived.

## 10.15 Archiving

**FR-122 ---** System shall identify old/inactive posts according to a
configured period.

**FR-123 ---** System shall allow old resolved/inactive posts to be
archived.

**FR-124 ---** Archived items shall normally be excluded from active
search.

**FR-125 ---** Administrator may view/manage archived records.

## 10.16 Data & Audit

**FR-126 ---** System shall store user account information.

**FR-127 ---** System shall store lost/found item information.

**FR-128 ---** System shall store claim information and verification
status.

**FR-129 ---** System shall store misuse reports.

**FR-130 ---** System shall store blocked-user information.

**FR-131 ---** System shall maintain relationships between users/posts,
users/claims, items/claims, lost/found items, users/reports and
administrators/approvals.

**FR-132 ---** System should record important administrative actions
such as approvals, rejections, blocks and removals.

**FR-133 ---** System should record timestamps for important actions.

**FR-134 ---** System should identify which administrator performed an
administrative action.

# 11. Non-Functional Requirements Baseline

**NFR-01 ---** Normal user requests should respond within approximately
2--3 seconds under normal load.

**NFR-02 ---** Search results should meet the defined response-time
target under normal database load.

**NFR-03 ---** Login requests should meet the defined response-time
target.

**NFR-04 ---** Image uploads should provide progress/feedback.

**NFR-05 ---** Multiple simultaneous users should not cause significant
performance degradation.

**NFR-06 ---** Passwords shall not be stored as plain text and shall use
secure hashing.

**NFR-07 ---** Protected functions shall require authentication.

**NFR-08 ---** Users shall access only functionality permitted by their
role.

**NFR-09 ---** Administrator functions shall not be accessible to normal
users.

**NFR-10 ---** Sessions shall be securely managed.

**NFR-11 ---** Unauthorized users shall be prevented from protected
resources.

**NFR-12 ---** All user input shall be validated before processing.

**NFR-13 ---** Parameterized/secure database access shall reduce SQL
injection risks.

**NFR-14 ---** Uploaded images shall be validated for type, size and
extension.

**NFR-15 ---** Users may modify only their own posts/claims unless
authorized as administrator.

**NFR-16 ---** User, item and claim information shall remain accurate
and consistent.

**NFR-17 ---** Important operations such as claim approval and return
shall maintain consistent database state.

**NFR-18 ---** Unexpected errors shall not expose sensitive system
information.

**NFR-19 ---** Database backup and recovery mechanisms should be
supported.

**NFR-20 ---** System should remain available during normal college
operating hours.

**NFR-21 ---** Interface shall be simple enough for students, faculty
and staff.

**NFR-22 ---** Navigation shall be clear.

**NFR-23 ---** Success and error messages shall be understandable.

**NFR-24 ---** Portal should work on desktop, laptop, tablet and mobile.

**NFR-25 ---** Buttons, forms, menus and messages shall use consistent
design.

**NFR-26 ---** Forms shall clearly identify missing or invalid fields.

**NFR-27 ---** System should use logical modules such as authentication,
item management, search/matching, claims, notifications, reports,
administration and database.

**NFR-28 ---** Source code shall follow consistent naming and coding
conventions.

**NFR-29 ---** Important modules/APIs shall be documented.

**NFR-30 ---** New categories/features should be addable without major
unrelated changes.

**NFR-31 ---** System should support an increasing number of registered
users.

**NFR-32 ---** Database should support increasing users, posts, claims,
reports and notifications.

**NFR-33 ---** Future features should be addable without redesigning the
whole portal.

**NFR-34 ---** Support modern browsers including Chrome, Safari, Edge
and Firefox.

**NFR-35 ---** Support common operating systems through a supported
browser.

**NFR-36 ---** Personal information shall only be accessible to
authorized users.

**NFR-37 ---** Personal contact information should not be unnecessarily
exposed publicly.

**NFR-38 ---** Claim evidence shall only be accessible to authorized
personnel.

**NFR-39 ---** Sensitive administrative information shall only be
accessible to administrators.

**NFR-40 ---** Use readable fonts and appropriate text sizes.

**NFR-41 ---** Provide sufficient contrast.

**NFR-42 ---** Important functions should support keyboard navigation
where practical.

**NFR-43 ---** Form inputs shall have clear labels.

**NFR-44 ---** Support JPG/JPEG, PNG and WebP images.

**NFR-45 ---** Enforce a maximum image size; initial project target: 5
MB per image.

**NFR-46 ---** Reject unsupported or invalid files.

**NFR-47 ---** Associate uploaded images with the relevant item record.

**NFR-48 ---** Database shall maintain valid relationships.

**NFR-49 ---** Users, items, claims and reports shall have unique
identifiers.

**NFR-50 ---** Foreign keys shall maintain referential integrity.

**NFR-51 ---** Database should be backed up regularly.

**NFR-52 ---** System should support restoring data from a valid backup.

**NFR-53 ---** Portal should be available whenever users are expected to
access it.

**NFR-54 ---** Service failures should show an appropriate message
instead of crashing the entire application.

**NFR-55 ---** Temporary database failures should be handled gracefully.

**NFR-56 ---** Important data should be restorable after system failure.

**NFR-57 ---** Admin dashboard shall organize pending posts, claims and
reports clearly.

**NFR-58 ---** Admin shall be able to filter records by relevant status.

**NFR-59 ---** Administrative actions should require a reasonable number
of steps.

**NFR-60 ---** Registration should provide appropriate terms/consent
information.

**NFR-61 ---** Users should be informed that fake claims, spam and
misuse are prohibited.

**NFR-62 ---** User data should be handled according to applicable
college privacy/data-retention policy.

# 12. Database Design Specification

Recommended relational schema. Antigravity may adjust column data types
during implementation, but relationships and business meaning must
remain consistent.

  **Table**       **Core fields**
  --------------- -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  users           user_id PK, full_name, email UNIQUE, phone, password_hash, role, institutional_id UNIQUE, department, course, semester, account_status, created_at, updated_at
  categories      category_id PK, category_name UNIQUE, is_active
  items           item_id PK, post_type \[LOST/FOUND\], user_id FK, category_id FK, title, description, item_date, location, approximate_time, identifying_characteristics, is_valuable, status, approval_status, created_at, updated_at, resolved_at
  item_images     image_id PK, item_id FK, file_path, original_name, mime_type, file_size, uploaded_at
  claims          claim_id PK, item_id FK, claimant_id FK, reason, ownership_evidence, status, verification_notes, submitted_at, updated_at, verified_by FK
  user_reports    report_id PK, reporter_id FK, reported_user_id FK, related_item_id FK nullable, reason, description, status, admin_action, created_at, resolved_at, resolved_by FK
  blocked_users   block_id PK, user_id FK, blocked_by FK, reason, blocked_at, unblocked_at, status
  notifications   notification_id PK, user_id FK, type, message, related_item_id FK nullable, related_claim_id FK nullable, is_read, created_at
  audit_logs      audit_id PK, admin_id FK, action, entity_type, entity_id, details, created_at

## 12.1 Relationship summary

-   One user can create many lost/found item posts.
-   One category can be associated with many items.
-   One item can have multiple images.
-   One found item can have multiple claims.
-   One user can submit multiple claims.
-   One user can submit multiple misuse reports and can be the subject
    of multiple reports.
-   One administrator can approve/reject many posts and verify many
    claims; these actions should be auditable.
-   One user can receive many notifications.

## 12.2 Database integrity rules

-   Use foreign keys for relationships.
-   Use UNIQUE constraints for email and institutional ID where
    appropriate.
-   Use transactions for claim approval + item status updates.
-   Do not physically delete critical audit/history records unless
    policy explicitly requires it; prefer status/archival.
-   Use timestamps for creation and important state changes.

# 13. Backend/API Specification

The backend should expose a small REST-style API. Exact URL names may be
adjusted during implementation, but the responsibilities must remain.

  **Method**   **Endpoint**                     **Purpose**
  ------------ -------------------------------- -----------------------------------
  POST         /api/auth/register               Create user account
  POST         /api/auth/login                  Authenticate and create session
  POST         /api/auth/logout                 Destroy session
  GET          /api/auth/me                     Return current authenticated user
  PUT          /api/users/profile               Update permitted profile data
  PUT          /api/users/password              Change password
  GET          /api/items                       Search/filter published items
  GET          /api/items/:id                   View item details
  POST         /api/items                       Create lost/found post
  PUT          /api/items/:id                   Edit own post
  DELETE       /api/items/:id                   Delete own post where allowed
  POST         /api/items/:id/claim             Submit claim
  GET          /api/claims/my                   View own claims
  PUT          /api/claims/:id/cancel           Cancel permitted pending claim
  GET          /api/notifications               View notifications
  PUT          /api/notifications/:id/read      Mark notification read
  POST         /api/reports/user                Submit misuse report
  GET          /api/admin/valuable-items        View pending valuable posts
  PUT          /api/admin/items/:id/approve     Approve valuable post
  PUT          /api/admin/items/:id/reject      Reject valuable post
  GET          /api/admin/claims                View claims
  PUT          /api/admin/claims/:id/approve    Approve claim
  PUT          /api/admin/claims/:id/reject     Reject claim
  GET          /api/admin/reports               View misuse reports
  PUT          /api/admin/reports/:id/resolve   Resolve/dismiss report
  PUT          /api/admin/users/:id/block       Block user
  PUT          /api/admin/users/:id/unblock     Unblock user
  GET          /api/admin/activity              View audit records

## 13.1 API rules

-   Return JSON for API responses.
-   Use appropriate HTTP status codes.
-   Do not return password_hash in any user response.
-   Validate IDs and body fields.
-   Enforce authorization on every protected endpoint.
-   Return consistent error format, e.g. { success: false, message:
    \'\...\' }.

# 14. Page & UI Specification

  **File**        **Page**                  **Required content**
  --------------- ------------------------- ------------------------------------------------------------------------------------------------------------------------------
  index.html      Landing                   Project purpose, Login, Register, concise explanation, access restriction notice
  login.html      Login                     Email/institutional ID, password, validation messages, login, password reset link
  register.html   Registration              Role selection, identity/contact fields, password rules, terms/consent, validation
  portal.html     Authenticated portal      Dashboard summary, navigation to Post Lost, Post Found, Search, My Posts, My Claims, Notifications, Profile, Report Misuse
  admin.html      Administrator dashboard   Pending valuable posts, claims, misuse reports, users, blocked users, archived/activity records, filters and action controls

## 14.1 UI principles

-   Clean, professional college-portal appearance.
-   Consistent header/navigation/buttons/forms across pages.
-   Use clear labels rather than placeholder-only instructions.
-   Show status badges consistently.
-   Display confirmation before destructive actions.
-   Use responsive CSS without requiring a UI framework.
-   Do not expose private contact details or claim evidence on public
    item cards.

## 14.2 Important user screens inside portal.html

-   Dashboard
-   Create Lost Item form
-   Create Found Item form
-   Search & filter
-   Item detail
-   My Posts
-   My Claims
-   Notifications
-   Profile
-   Report User Misuse

# 15. UML & Software Engineering Artefacts

The submitted lab material already contains a hand-drawn use-case
diagram and a class diagram. These should be retained as project
artefacts but refined for consistency before the final report.

## 15.1 Use Case Diagram

-   Actors: User (Student/Faculty/Staff) and Administrator.
-   User use cases: Register/Login, Submit Lost Item, Submit Found Item,
    Upload Item Photo, Search Items, View Item Details, Submit Claim,
    Provide Ownership Proof, Track Claim Status, Mark Item Returned,
    Report User Misuse, Manage Own Posts, Receive Notifications.
-   Administrator use cases: Review Valuable Item Posts, Approve/Reject
    Posts, Verify Claims, View Misuse Reports, Investigate Misuse,
    Remove Fake/Inappropriate Posts, Block/Unblock Users, Manage Users,
    View System Records/Reports.
-   Use \<\<include\>\> only where the included behaviour is mandatory
    for the base use case, e.g. Submit Claim → Provide Ownership Proof
    if evidence is mandatory for that workflow.

## 15.2 Class/domain model

The existing class diagram includes User, Student, Faculty, Staff,
Administrator, LostItem, FoundItem, Category, Claim, UserReport and
BlockedUser. For implementation, the domain/data model should
additionally represent ItemImage, Notification and AuditLog because
these are explicit requirements.

## 15.3 Sequence diagrams to prepare

-   Registration sequence
-   Login sequence
-   Submit lost/found item sequence
-   Valuable item approval sequence
-   Search and potential match sequence
-   Claim + ownership verification sequence
-   Multiple-claim administrator decision sequence
-   Misuse report + block sequence
-   Return item + notification sequence

The submitted lab manual labels a Sequence Diagram session, but the
supplied PDF page does not contain a completed sequence diagram.
Therefore, these sequence diagrams should be created before final
submission.

# 16. Requirements Traceability & Testing

Every major requirement must have at least one acceptance/test case. Use
requirement IDs directly in test-case IDs.

  **Test ID**   **Requirement**   **Scenario**                                     **Expected Result**
  ------------- ----------------- ------------------------------------------------ ----------------------------------------------------
  TC-FR-01      FR-04/05          Register with duplicate email/institutional ID   Registration rejected with clear message
  TC-FR-02      FR-12/13          Login with wrong password                        Login rejected; no protected access
  TC-FR-03      FR-36             Submit normal low-value item                     Post becomes Published after validation
  TC-FR-04      FR-37             Submit valuable item                             Post becomes Pending Approval and is hidden
  TC-FR-05      FR-68/70          Submit claim without required evidence           Validation prevents submission
  TC-FR-06      FR-72/77          Two users claim same item                        Admin can view both and select legitimate claimant
  TC-FR-07      FR-82             Attempt claim after Returned                     New claim rejected
  TC-FR-08      FR-85/90          Report another user                              Report stored and visible to admin
  TC-FR-09      FR-93/95          Blocked user attempts restricted action          Action rejected
  TC-NFR-06     NFR-06            Inspect database password field                  Password is hashed, not plain text
  TC-NFR-13     NFR-13            Submit SQL-like input                            No SQL injection / query remains parameterized
  TC-NFR-24     NFR-24            Open portal on mobile width                      Layout remains usable

## 16.1 Testing levels

-   Unit-level testing for validation/business helper functions.
-   Integration testing for API + MySQL operations.
-   System testing for complete user workflows.
-   Security/authorization testing for blocked users and role
    restrictions.
-   Usability testing with representative student/faculty/staff
    scenarios.
-   Regression testing after every increment.

# 17. Development Backlog

  **Inc.**   **Module**          **Work**                                                    **Traceability**                **Priority**
  ---------- ------------------- ----------------------------------------------------------- ------------------------------- --------------
  I1         Authentication      Register/login/logout/session/profile                       FR-01--26                       High
  I1         Item Management     Lost/found posts, validation, images, own-post management   FR-27--53, FR-118--121          High
  I1         Search              Keyword, category, location, date, type, details            FR-54--62                       High
  I2         Claims              Claim reason, evidence, statuses, multiple claims           FR-68--79                       High
  I2         Return              Approve, return, prevent further claims                     FR-80--84                       High
  I3         Valuable Items      Admin approval/rejection                                    FR-37--38, FR-50, FR-107--109   High
  I3         Misuse & Blocking   Reports, investigation, block/unblock                       FR-85--97                       High
  I4         Matching            Potential match detection and association                   FR-63--67                       Medium
  I4         Notifications       Match, claim, approval, return, history                     FR-98--104                      Medium
  I4         Archive & Audit     Archive, activity logs, admin accountability                FR-122--134                     Medium

## 17.1 Definition of Done

-   Requirement implemented according to PMS.
-   Server-side validation present.
-   Authorization checked.
-   Database transaction/integrity considered.
-   User-facing success/error messages implemented.
-   Relevant test case passes.
-   No console errors or unhandled server errors in normal workflow.
-   Code naming/comments/file responsibility checked.
-   README updated if setup or behavior changed.

# 18. Antigravity Development Instructions

The following section can be copied into the Antigravity project
instructions together with this PMS.

    You are the lead developer for the College Lost & Found Portal.

    1. Read PROJECT_MASTER_SPECIFICATION completely before coding.
    2. Treat the PMS as the baseline source of truth.
    3. Build using the Incremental Model in the increments defined in Section 17.
    4. Use HTML5, CSS3 and Vanilla JavaScript for the frontend.
    5. Use Node.js + Express for the backend and MySQL for persistent data.
    6. Keep the code simple and suitable for a Software Engineering undergraduate project.
    7. Do not introduce React, Angular, Vue, TypeScript, MongoDB, microservices or other unnecessary technologies unless explicitly approved.
    8. Keep the number of files small. Use the exact file responsibilities defined in Section 5.
    9. Do not create files named temp, final, new, misc or similarly vague names.
    10. Do not put database credentials or secrets in frontend code.
    11. Use bcrypt for password hashing and parameterized SQL queries.
    12. Enforce authentication and role authorization on the server, not only in the UI.
    13. Validate all input on the server and provide clear user-facing errors.
    14. Implement valuable-item approval as a separate workflow from normal-item auto-publication.
    15. Keep User Misuse Reports separate from Lost/Found Item Posts.
    16. Preserve the defined statuses and valid transitions.
    17. Use comments for non-obvious business rules, especially valuable-item approval, claim selection and blocking.
    18. Prefer local variables. Avoid unnecessary global mutable variables.
    19. Before adding a new file, check whether the responsibility belongs in an existing module.
    20. After each increment, run the relevant tests and fix defects before continuing.
    21. Never silently change a requirement. If a requirement is ambiguous or conflicts with another requirement, record the issue and ask for clarification.
    22. Update README.md with setup instructions, database setup, run commands, folder responsibilities and test instructions.
    23. At the end of each increment, provide a short implementation summary, files changed, database changes, tests performed and remaining work.

## 18.1 What Antigravity must not do

-   Do not replace MySQL with a different database without approval.
-   Do not create a complex frontend framework when plain HTML/CSS/JS is
    sufficient.
-   Do not expose all database records through one unrestricted
    endpoint.
-   Do not allow normal users to approve valuable items or verify claims
    as administrators.
-   Do not treat a misuse report as an item report.
-   Do not store passwords as plain text.
-   Do not use client-side role checks as the only security mechanism.
-   Do not delete audit/history records simply to make the UI look
    cleaner.
-   Do not generate large duplicate files containing the same functions.

# 19. Controlled Decisions & Clarifications

These points should be confirmed by the project team/client before final
deployment. They are recorded here so the coding agent does not silently
invent policy.

  **Topic**                 **Current PMS decision / status**
  ------------------------- ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  Image requirement         Requirements baseline treats item photos as optional/where available; client questionnaire says at least one image is optional but recommended. Keep image optional unless client changes policy.
  Valuable-item threshold   The project requires a valuable/high-value flag, but no exact monetary threshold is specified. Store the flag; define the college policy separately.
  Password reset            Required as a suggested requirement; implementation method depends on whether email service is available. For a local demo, provide a controlled reset flow rather than inventing a real email provider.
  Notifications             In-app notification records are required; external email/SMS is not required for the base implementation.
  Archive period            60 days is stated in the client questionnaire for unresolved posts. Keep it configurable.
  Messaging                 Client questionnaire mentions masked contact or in-app messaging, but the detailed functional requirements do not define a full messaging module. Do not build a large chat system in the MVP unless approved.
  Match algorithm           Requirements specify fields to consider but do not define an exact scoring algorithm. Start with transparent rule-based matching rather than adding AI.

## 19.1 Requirement consistency rule

If a later client/teacher decision changes one of these items, update
this PMS and the traceability/test cases before changing the
implementation. Do not patch the code first and document later.

# 20. Final Acceptance Checklist

**☐** Registration works for Student, Faculty and Staff.

**☐** Duplicate email/institutional ID is prevented.

**☐** Passwords are securely hashed.

**☐** Login/logout/session and role authorization work.

**☐** Blocked users cannot perform restricted actions.

**☐** Users can create and manage lost/found posts.

**☐** Normal items are auto-published after validation.

**☐** Valuable items remain pending until admin approval.

**☐** Images are validated and stored safely.

**☐** Search and filters work.

**☐** Item details do not expose restricted evidence/contact
information.

**☐** Potential matches can be identified.

**☐** Claims support evidence and status tracking.

**☐** Multiple claims can be handled by the administrator.

**☐** Approved claims lead to return; returned items reject new claims.

**☐** Users can report misuse separately from item posting.

**☐** Administrators can investigate reports and block/unblock users.

**☐** Notifications are stored and displayed.

**☐** Old/resolved records can be archived.

**☐** Administrative actions are auditable.

**☐** Database relationships use primary/foreign keys.

**☐** SQL queries are parameterized.

**☐** Application handles errors without exposing sensitive details.

**☐** UI is responsive and consistent.

**☐** README contains setup and run instructions.

**☐** All high-priority test cases pass.

**☐** Use-case/class/sequence diagrams are consistent with
implementation.

# Appendix A --- Source Artefacts Reviewed

1\. L&F requirements PDF: detailed functional and non-functional
requirements, including FR-01 through FR-134 and NFR-01 through NFR-62.

2\. Software Engineering Lab PDF: project abstract, client
questionnaire, functional/non-functional summary, product backlog,
use-case material and class-diagram material.

The existing class diagram was reviewed visually; it includes User, role
specializations, LostItem, FoundItem, Category, Claim, UserReport,
BlockedUser and Administrator. The existing hand-drawn use-case diagram
covers the major user/admin workflows.

# Appendix B --- Change Log

  **Version**   **Date**     **Change**                                                                **Author**
  ------------- ------------ ------------------------------------------------------------------------- --------------
  1.0           2026-10-02   Initial PMS created from supplied project requirements and lab material   Project Team
