# SecureVault
## Encrypted Document Management System
### Software Documentation

**Course:** IT 16: Information Assurance and Security 1
**Institution:** University of Mindanao, Matina Campus, Davao City, Philippines
**Prepared by:** Evander Harold S. Amorcillo
**Version:** 3.3

---

## Table of Contents

1. Introduction
   - 1.1 Project Overview
   - 1.2 Purpose
   - 1.3 Scope
   - 1.4 Definitions and Acronyms
2. Product Requirements
   - 2.1 User Stories
   - 2.2 Core Features
3. Technical Requirements
   - 3.1 Technology Stack
   - 3.2 External API Integrations
   - 3.3 Development Environment
   - 3.4 Browser Support
4. System Architecture
   - 4.1 Architectural Pattern
   - 4.2 Request Flow
   - 4.3 Directory Structure
   - 4.4 Security Layer Architecture
5. Database Design
   - 5.1 Entity Relationship Summary
   - 5.2 Table Definitions
   - 5.3 Database Security Measures
6. Security Implementation
   - 6.1 Database Security
   - 6.2 Network Security
   - 6.3 External Security Services
7. Functional Requirements
   - 7.1 Authentication Module
   - 7.2 Document Management Module
   - 7.3 Document Sharing Module
   - 7.4 Audit Module
   - 7.5 Administration Module
   - 7.6 Search Module
8. Non-Functional Requirements
9. UI/UX Specification
   - 9.1 Design System
   - 9.2 Color Theme (Noir Amber)
   - 9.3 Component Library
   - 9.4 Page Map
10. Role-Based Access Control Matrix
11. Engineering Principles
    - 11.1 Security Principles
    - 11.2 Development Principles
12. Hard Constraints
13. Testing Strategy
    - 13.1 Security Testing Checklist
    - 13.2 Feature Testing Checklist
14. Revision History

---

## 1. Introduction

### 1.1 Project Overview

SecureVault is a web-based encrypted document management system designed to demonstrate core information assurance and security principles. The system enables users to securely upload, store, manage, and share documents with AES-256-CBC encryption at rest, granular role-based access controls, comprehensive immutable audit logging with HMAC hash chain verification, asynchronous malware scanning via VirusTotal, and a two-tier audit categorization system (Security Events vs. General Activity).

This project serves as a practical implementation of database security and network security concepts covered in IT 16: Information Assurance and Security 1. Every architectural decision prioritizes the CIA triad (Confidentiality, Integrity, Availability) while maintaining usability. The application features a premium Noir Amber visual theme built with Geist Sans typography and shadcn/ui New York style components, with full light and dark mode support.

### 1.2 Purpose

The purpose of this document is to provide a complete technical specification for the SecureVault system, including product requirements, technical architecture, database design, security implementations, external API integrations, RBAC matrix, UI/UX design system, and engineering principles that guide development.

### 1.3 Scope

SecureVault covers the following functional areas:

- User authentication with multi-factor authentication (TOTP-based 2FA)
- AES-256-CBC encrypted document storage with SHA-256 integrity verification
- Asynchronous malware scanning via VirusTotal API dispatched as a background queue job after upload; downloads blocked while scan is pending
- Password breach detection via HaveIBeenPwned API at registration and password change
- Geographic IP enrichment via IPInfo API for audit log context
- User avatar support via Gravatar API with deterministic initials fallback
- Bot mitigation via Google reCAPTCHA v3 on registration and password reset forms
- Three-tier role-based access control (Super Admin, Admin, User) with permission-based enforcement
- Secure document sharing between users with granular permission levels and signed URL generation
- Immutable audit logging with HMAC-SHA256 hash chain for tamper detection
- Two-tier audit categorization: Security Events and General Activity, with tab-based UI separation
- Administrative dashboards for security monitoring, user management, and session control
- Global search across documents, audit logs, and users with keyboard shortcut
- Vault lock screen for idle session protection (30-minute timeout)
- Bulk document operations including ZIP download and batch deletion
- PDF and CSV export of audit logs, respecting active category filter
- Light and dark mode theme with system preference detection and localStorage persistence

### 1.4 Definitions and Acronyms

| Term | Definition |
|------|-----------|
| AES-256-CBC | Advanced Encryption Standard with 256-bit key, Cipher Block Chaining mode |
| CIA Triad | Confidentiality, Integrity, Availability |
| CSRF | Cross-Site Request Forgery |
| CSP | Content Security Policy |
| HIBP | Have I Been Pwned — breach detection service |
| HMAC | Hash-based Message Authentication Code |
| IPInfo | IP geolocation and metadata service |
| MFA/2FA | Multi-Factor Authentication / Two-Factor Authentication |
| RBAC | Role-Based Access Control |
| TOTP | Time-Based One-Time Password |
| XSS | Cross-Site Scripting |
| SQL Injection | Code injection technique targeting SQL databases |
| HTTPS | Hypertext Transfer Protocol Secure |
| ORM | Object-Relational Mapping |
| Inertia.js | Protocol bridging server-side frameworks with SPA frontends |
| shadcn/ui | Copy-paste component library built on Radix UI primitives |
| New York | shadcn/ui component style variant — sharp, compact, high-density |
| Geist Sans | Modern geometric sans-serif typeface by Vercel |
| VirusTotal | Cloud-based malware and threat intelligence service |
| Gravatar | Globally recognized avatar service by Automattic |
| DomPDF | PHP PDF generation library for Laravel |
| k-Anonymity | Privacy model used by HIBP to check passwords without exposing them |
| reCAPTCHA v3 | Google's invisible bot detection service using risk scoring (0.0–1.0) |
| Security Event | Audit log entry classified as authentication, authorization, or threat-related |
| General Activity | Audit log entry classified as routine document or account management action |

---

## 2. Product Requirements

### 2.1 User Stories

| ID | Role | User Story | Priority |
|----|------|-----------|---------|
| US-01 | User | I want to register an account with email verification so that my identity is validated. | High |
| US-02 | User | I want to enable 2FA on my account so that I have an extra layer of protection. | High |
| US-03 | User | I want to upload documents so that they are stored securely and encrypted. | High |
| US-04 | User | I want to view and download my documents with seamless decryption. | High |
| US-05 | User | I want to share documents with specific users with read-only or full access. | Medium |
| US-06 | User | I want to generate a time-limited signed URL to share a document externally. | Medium |
| US-07 | User | I want to see an activity log of actions performed on my documents, separated by security events and general activity. | Medium |
| US-08 | User | I want to manage my profile and update my password securely. | Medium |
| US-09 | User | I want to star important documents so they appear at the top of my vault. | Low |
| US-10 | User | I want to bulk download or delete multiple documents at once. | Medium |
| US-11 | Admin | I want to view the admin dashboard with security metrics and recent security events. | High |
| US-12 | Admin | I want to view system-wide audit logs filtered by security events or general activity. | High |
| US-13 | Admin | I want to monitor and terminate active sessions. | High |
| US-14 | Admin | I want to export audit logs as PDF or CSV for reporting, respecting the active category filter. | Medium |
| US-15 | Super Admin | I want to manage all users (activate, deactivate, change roles). | High |
| US-16 | Super Admin | I want to view all documents in the system for audit purposes. | Medium |

### 2.2 Core Features

#### 2.2.1 Authentication and Authorization

- Email/password registration with email verification link
- Google reCAPTCHA v3 bot mitigation on registration and forgot password forms — invisible, score-based, fails open if Google is unreachable
- Password breach detection via HaveIBeenPwned at registration and password change using k-Anonymity
- Login with rate limiting (5 attempts per minute, lockout after 10 consecutive failures for 15 minutes)
- Optional TOTP-based two-factor authentication (Google Authenticator, Authy) with InputOTP 6-digit component that auto-submits on last digit entry
- 2FA self-healing: if `two_factor_secret` is null or shorter than 16 characters at login, the flag is auto-reset, the user is redirected to login with a safe error message, and a `2fa_corrupt_reset` audit entry is created
- Session management with database-driven sessions, configurable timeout, and remote revocation
- Vault lock screen after 30 minutes of page inactivity (session remains active, UI blurred and locked)
- Password requirements: minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 digit, 1 special character
- Real-time password strength indicator on registration and password change forms

#### 2.2.2 Document Management

- Upload documents (PDF, DOCX, XLSX, images) with a maximum file size of 10 MB
- Asynchronous malware scanning via VirusTotal API dispatched as a Laravel Queue job after upload — file saved immediately with `scan_result = 'pending'`; downloads blocked until scan resolves
- AES-256-CBC encryption applied before storage on disk with unique IV per file
- SHA-256 hash computed on upload and verified on download for integrity checking
- Download with on-the-fly decryption and integrity verification
- Soft delete with 30-day recovery window, automated daily purge via scheduler
- Document starring/favoriting with starred documents pinned to top of vault
- Bulk operations: download multiple documents as ZIP, batch move to trash
- Drag-and-drop file upload from anywhere on the My Vault page with visual overlay
- Confetti animation on first document upload (one-time celebration)

#### 2.2.3 Document Sharing

- Share documents with specific registered users by email
- Permission levels: View Only, Download, Full Access (edit metadata, re-share)
- Optional expiration date on shares using Calendar date picker, automatically revoked when expired
- Generate time-limited signed URLs (1 hour to 7 days) for external sharing using Laravel temporarySignedRoute
- Duplicate share detection: updating existing share instead of creating duplicates

#### 2.2.4 Audit Logging

- Every user action is logged: login, logout, upload, download, share, delete, star, permission change
- Log entries include: timestamp, user ID, action, target resource, IP address, user agent, geographic location from IPInfo, and category
- Two audit categories: `security` (authentication, threats, security configuration changes) and `audit` (document and account management actions)
- Category is auto-assigned by `AuditService` based on a centralized `SECURITY_ACTIONS` constant — callers do not need to specify category manually
- Category value is included in the HMAC-SHA256 hash payload, making category tampering detectable
- Meaningful descriptions derived from metadata (e.g. "Uploaded 'filename.pdf'", "Signed in from Davao City, PH")
- Descriptions generated by a dedicated `AuditDescriptionService` using a `match()` statement over all known action strings
- Logs are append-only with HMAC-SHA256 hash chain for tamper detection
- Users can view their own activity with tab-based category filtering (All Activity / Security Events / General Activity) and Calendar date range pickers
- Admins can view system-wide logs with the same category tabs plus advanced filtering including user search
- Export audit logs as CSV or formatted PDF report with Noir Amber header styling, respecting active category filter

#### 2.2.5 Administration

- Admin dashboard with real-time security metrics (users, sessions, failed logins, storage, pending verifications)
- Time-based greeting on dashboard ("Good morning/afternoon/evening") using user's first name
- Admin Dashboard "Recent System Activity" defaults to security events only
- User management: view, activate/deactivate, assign roles (Super Admin only)
- All Documents view for audit purposes (Super Admin only, read-only)
- System-wide audit log viewer with category tabs and filtering by user, action, date range, IP
- Active session monitoring with force-terminate capability
- Global search across documents, audit logs, and users with Command+K / Ctrl+K keyboard shortcut

---

## 3. Technical Requirements

### 3.1 Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Backend Framework | Laravel | 13.x | Server-side logic, routing, middleware, ORM |
| Frontend Framework | React | 19.x | Component-based UI rendering |
| Bridge | Inertia.js | 2.x | SPA-like navigation without a separate API |
| UI Library | shadcn/ui (New York style) | Latest | Accessible, pre-built React components (Radix UI primitives) |
| CSS Framework | Tailwind CSS | 4.x | Utility-first styling with CSS-native configuration |
| Typography | Geist Sans | Latest | Modern geometric sans-serif by Vercel |
| Database | MySQL | 8.4.x | Primary relational database |
| Auth | Laravel Sanctum | 4.x | Session-based SPA authentication |
| 2FA | pragmarx/google2fa-laravel | Latest | TOTP 2FA implementation |
| Encryption | Laravel Crypt (OpenSSL) | Built-in | AES-256-CBC file and data encryption |
| RBAC | spatie/laravel-permission | 7.x | Role and permission management |
| PDF Export | barryvdh/laravel-dompdf | Latest | PDF generation for audit log export |
| Language | PHP | 8.3+ | Server-side runtime |
| Language | TypeScript | 5.x | Type-safe frontend code |
| Build Tool | Vite | 7.x | Frontend asset bundling |
| Confetti | canvas-confetti | Latest | First upload celebration animation |
| Date Utilities | date-fns | Latest | Date formatting and calculation (trash expiry badges, calendar pickers) |

### 3.2 External API Integrations

| API | Purpose | Authentication | Rate Limit |
|-----|---------|---------------|-----------|
| HaveIBeenPwned (HIBP) | Password breach detection using k-Anonymity model | None required | Reasonable use |
| IPInfo | IP geolocation for audit log enrichment | Bearer token | 50,000 req/month (free) |
| VirusTotal | Async malware scanning of uploaded documents via queue job | API key header | 4 req/min, 500/day (free) |
| Gravatar | User avatar images derived from MD5 hash of email | None required | Unlimited |
| Google reCAPTCHA v3 | Bot mitigation on Register and Forgot Password forms | Site key (public) + Secret key (server-side only) | Free tier, generous quota |

#### 3.2.1 HaveIBeenPwned Implementation

The HIBP k-Anonymity model is used to check passwords without exposing them. Only the first 5 characters of the SHA-1 hash are sent to the API. The full hash and plaintext password never leave the server. This check runs at registration and password change. If HIBP is unavailable, the check fails open without blocking the user action.

#### 3.2.2 IPInfo Implementation

Login-related audit log entries are enriched with geographic location data (city, country) via IPInfo. Results are cached for 24 hours per IP address to conserve free tier quota. Private and local IP ranges return "Local / DEV" without an API call. Location data is stored in the metadata JSON column.

#### 3.2.3 VirusTotal Implementation

Uploaded files are scanned for malware via VirusTotal API using an asynchronous Laravel Queue job (`ScanDocumentWithVirusTotal`). The upload request completes immediately — the file is encrypted, saved to disk, and persisted to the database with `scan_result = 'pending'`. The scan job is dispatched after the HTTP response cycle.

The queue job submits the file to VirusTotal, polls for results, and updates `scan_result` to `clean`, `malicious`, or `unavailable`. If the file is flagged malicious, it is soft-deleted immediately and a `malware_detected` security audit entry is created. Downloads are blocked while `scan_result = 'pending'` or `scan_result = 'malicious'`.

If VirusTotal is unreachable after all retries, the job marks the file `unavailable` and logs a private error entry. The upload is not rolled back — fail-open behavior is preserved for service unavailability.

Queue driver is environment-aware: `deferred` in local development (automatic, no worker process needed), `database` in production (requires a dedicated queue worker).

#### 3.2.4 Custom Avatar Implementation

SecureVault supports optional custom profile picture uploads. Avatar images are stored on the Laravel `public` disk at `storage/app/public/avatars/` using UUID-based filenames only, and the original filename is never preserved. Avatars are intentionally not encrypted and are not submitted to VirusTotal because they are non-sensitive, public-facing profile images rather than confidential vault documents.

Uploaded avatars are normalized server-side before storage. Source images up to 8 MB and 8000x8000 pixels are accepted, then resized automatically to fit within a 512x512 bounding box while preserving aspect ratio. This removes the need for users to manually resize large profile images before upload.

This is a deliberate and documented exception to Hard Constraint #7. Sensitive encrypted documents remain stored exclusively in `storage/app/vault/` outside the public web root. Profile avatars require direct browser access by design and therefore use the symlinked `public` storage path.

Avatar resolution now follows this order: custom uploaded avatar, Gravatar URL built from the MD5 hash of the user's email address (`?d=404&s=80`), then deterministic initials fallback.

User avatars are resolved from a Gravatar URL built from the MD5 hash of the user's email address. The frontend `UserAvatar` component uses shadcn's Avatar with AvatarImage for Gravatar images and AvatarFallback for deterministic initials when no Gravatar exists. The initials fallback uses a color palette of six distinct, theme-compatible colors (amber, blue, emerald, violet, orange, teal) — no pink or magenta values.

#### 3.2.5 reCAPTCHA v3 Implementation

Google reCAPTCHA v3 is integrated on the Register and Forgot Password forms to mitigate automated bot submissions. The implementation uses the invisible v3 variant — no checkbox or image puzzle is presented to the user.

On form submission, the frontend calls `grecaptcha.execute()` with a form-specific action string (`register` or `forgot_password`) to obtain a one-time token. The token is submitted alongside the form data. The backend `RecaptchaService` verifies the token with Google's siteverify endpoint, confirms the action string matches to prevent token reuse across forms, and checks the risk score against a configurable threshold (default: 0.5). Submissions scoring below the threshold are rejected with a validation error and a `bot_detected` security audit entry is created.

The `RECAPTCHA_SITE_KEY` is intentionally shared with the frontend (it is a public key by Google's design). The `RECAPTCHA_SECRET_KEY` is server-side only and must never be exposed in frontend code or version control. If Google's reCAPTCHA service is unreachable, `RecaptchaService` fails open — the form submission proceeds and a private error is logged.

### 3.3 Development Environment

| Requirement | Specification |
|-------------|--------------|
| Operating System | Windows 11, macOS, or Linux |
| Local Server | Laragon (Apache 2.4.66, MySQL 8.4.3, PHP 8.3.30) |
| PHP | 8.3 or higher with OpenSSL, PDO, Mbstring, GD, Fileinfo, Sodium, Intl, Zip extensions |
| Composer | 2.8+ |
| Node.js | 20.x LTS or higher |
| npm | 10.x or higher |
| MySQL | 8.0 or higher |
| Git | Latest stable |
| IDE | Cursor / VS Code with PHP Intelephense, ESLint, Prettier |
| Queue | Automatically configured based on APP_ENV. Local: `deferred` (no worker needed — scan runs automatically after HTTP response). Production: `database` (requires `php artisan queue:work --tries=3 --timeout=60`). |

### 3.4 Browser Support

SecureVault targets modern evergreen browsers. Minimum supported versions:

- Google Chrome 120+
- Mozilla Firefox 120+
- Microsoft Edge 120+
- Safari 17+

---

## 4. System Architecture

### 4.1 Architectural Pattern

SecureVault follows a monolithic MVC architecture using Laravel as the backend framework with Inertia.js bridging server-side controllers to React frontend components. This eliminates the need for a separate REST API layer while maintaining SPA-like user experience.

### 4.2 Request Flow

1. The browser sends an HTTPS request to the Laravel application.
2. Global middleware executes: HTTPS enforcement, security headers, CSRF verification, session handling.
3. Route middleware executes: authentication check, account active verification, 2FA verification, permission check.
4. The controller processes business logic, interacting with Eloquent models.
5. Eloquent ORM translates operations into parameterized SQL queries (preventing SQL injection).
6. For registration and password reset, `RecaptchaService` verifies the reCAPTCHA v3 token before proceeding.
7. For file uploads, the file is encrypted via `EncryptionService` and saved with `scan_result = 'pending'`. `ScanDocumentWithVirusTotal` job is dispatched to the queue — the HTTP response returns immediately.
8. For file operations, `EncryptionService` encrypts/decrypts data using AES-256-CBC.
9. For login events, `IpInfoService` enriches the audit log with geographic location.
10. The controller returns an Inertia response, which renders the appropriate React component.
11. `AuditService` logs the action with HMAC hash chain linking, auto-assigned category, and meaningful metadata.
12. `AuditDescriptionService` generates human-readable descriptions from metadata for display in activity feeds.
13. The queue worker (or deferred driver locally) processes `ScanDocumentWithVirusTotal`, updates `scan_result`, and logs `malware_detected` if the file is flagged.

### 4.3 Directory Structure

| Directory | Purpose |
|-----------|---------|
| `app/Http/Controllers/` | Request handlers for each module |
| `app/Http/Controllers/Admin/` | Admin-specific controllers |
| `app/Http/Middleware/` | Custom middleware (ForceHttps, SecurityHeaders, EnsureTwoFactor, EnsureAccountActive, LogRequest) |
| `app/Models/` | Eloquent models with relationships and scopes |
| `app/Policies/` | Authorization policies (DocumentPolicy — extended for Super Admin read-only access) |
| `app/Services/` | Business logic (EncryptionService, AuditService, AuditDescriptionService, PwnedPasswordService, IpInfoService, VirusTotalService, RecaptchaService) |
| `app/Jobs/` | Queue jobs (ScanDocumentWithVirusTotal — async VirusTotal scan dispatched after upload) |
| `app/Enums/` | PHP enums (AuditCategory) |
| `resources/js/Pages/` | React page components (Inertia pages) |
| `resources/js/components/ui/` | shadcn/ui component library (New York style, ~35 components) |
| `resources/js/components/` | Custom app components (AppLogo, UserAvatar, GlobalSearch, VaultLock, PasswordStrengthBar, ThemeToggle, TimeBasedGreeting, AuditCategoryTabs, ScanBadge, FileTypeBadge, PermissionBadge, RoleBadge) |
| `resources/js/Layouts/` | Layout components (AuthenticatedLayout, GuestLayout) |
| `resources/js/Providers/` | ThemeProvider with useTheme hook and localStorage persistence |
| `resources/js/lib/` | Utility modules (auditActionBadge.ts, fileTypeBadge.ts, trashExpiryBadge.ts, recaptcha.ts) |
| `resources/css/app.css` | Global styles, Tailwind 4 config, Noir Amber tokens, Geist Sans, calendar fixes |
| `database/migrations/` | Database schema migrations |
| `routes/web.php` | Route definitions with permission-based middleware |
| `storage/app/vault/` | Encrypted document storage (outside public directory) |
| `storage/app/public/avatars/` | Public avatar storage (intentional non-sensitive exception to Hard Constraint #7) |
| `storage/app/temp/` | Temporary ZIP files for bulk download (auto-deleted after send) |
| `resources/views/pdf/` | Blade templates for PDF generation |
| `config/securevault.php` | Application-specific security configuration |
| `config/queue.php` | Queue driver auto-selects `deferred` (local) or `database` (production) based on APP_ENV |

### 4.4 Security Layer Architecture

| Layer | Component | Security Measure |
|-------|-----------|-----------------|
| Network | Web Server / Middleware | HTTPS enforcement, rate limiting, CSP headers (production), HSTS |
| Application | Controllers / Middleware | Input validation, CSRF protection, session management, account active checks |
| Bot Mitigation | RecaptchaService | reCAPTCHA v3 invisible scoring on Register and Forgot Password; score threshold 0.5; fails open |
| Authorization | Policies / Permissions | Permission-based RBAC (Spatie v7), resource ownership checks, per-route enforcement |
| Data | Eloquent ORM | Parameterized queries, mass assignment protection via $fillable |
| External | VirusTotalService / PwnedPasswordService / RecaptchaService | Async malware scan via queue job; breach check at registration and password change; bot score check on auth forms |
| Storage | EncryptionService | AES-256-CBC file encryption with unique IV per file, SHA-256 integrity hashing |
| Audit | AuditService + AuditDescriptionService | Immutable append-only logs, HMAC-SHA256 hash chain (includes category in payload), IPInfo geo-enrichment, meaningful descriptions, two-tier category separation |
| Session | VaultLock Component | Client-side 30-minute idle lock overlay; password required to re-enter without ending session |

---

## 5. Database Design

### 5.1 Entity Relationship Summary

- A User has many Documents (one-to-many).
- A User has many Roles through the `model_has_roles` pivot (many-to-many, Spatie v7).
- A Role has many Permissions through `role_has_permissions` pivot (many-to-many, Spatie v7).
- A Document has many DocumentShares (one-to-many).
- A DocumentShare belongs to a Document and a User (the recipient).
- An AuditLog belongs to a User and optionally references a target resource (polymorphic).

### 5.2 Table Definitions

#### 5.2.1 users

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Primary key |
| name | VARCHAR(255) | NOT NULL | Full name |
| email | VARCHAR(255) | NOT NULL, UNIQUE | Email address (login credential) |
| email_verified_at | TIMESTAMP | NULLABLE | Email verification timestamp |
| password | VARCHAR(255) | NOT NULL | Bcrypt-hashed password |
| two_factor_secret | TEXT | NULLABLE, ENCRYPTED | TOTP secret key (encrypted at rest). Must be ≥16 base32 characters when decrypted. Auto-reset to NULL if found invalid during login. |
| two_factor_enabled | BOOLEAN | DEFAULT FALSE | Whether 2FA is active |
| failed_login_attempts | INT | DEFAULT 0 | Consecutive failed login count |
| locked_until | TIMESTAMP | NULLABLE | Account lockout expiry |
| last_login_at | TIMESTAMP | NULLABLE | Last successful login time |
| last_login_ip | VARCHAR(45) | NULLABLE | Last login IP (supports IPv6) |
| is_active | BOOLEAN | DEFAULT TRUE | Account active status |
| created_at | TIMESTAMP | NOT NULL | Record creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |

#### 5.2.2 documents

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Primary key |
| user_id | BIGINT UNSIGNED | FK (users.id), NOT NULL | Document owner |
| original_name | VARCHAR(255) | NOT NULL | Original filename |
| encrypted_name | VARCHAR(255) | NOT NULL, UNIQUE | UUID-based storage filename |
| mime_type | VARCHAR(100) | NOT NULL | File MIME type |
| file_size | BIGINT UNSIGNED | NOT NULL | Original file size in bytes |
| encryption_iv | VARCHAR(255) | NOT NULL | Initialization vector for AES-256-CBC |
| file_hash | VARCHAR(64) | NOT NULL | SHA-256 hash of original file |
| description | TEXT | NULLABLE, ENCRYPTED | Optional description (encrypted at model level) |
| scan_result | VARCHAR(50) | DEFAULT 'unscanned' | VirusTotal result: `pending` (scan in progress), `clean`, `unscanned`, `unavailable`, or `malicious`. Set to `pending` immediately on upload; updated by the `ScanDocumentWithVirusTotal` queue job. Downloads are blocked while `pending` or `malicious`. |
| is_starred | BOOLEAN | DEFAULT FALSE | Whether document is starred/favorited |
| deleted_at | TIMESTAMP | NULLABLE | Soft delete timestamp |
| created_at | TIMESTAMP | NOT NULL | Upload timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |

#### 5.2.3 document_shares

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Primary key |
| document_id | BIGINT UNSIGNED | FK (documents.id), NOT NULL | Shared document |
| shared_by_id | BIGINT UNSIGNED | FK (users.id), NOT NULL | User who shared |
| shared_with_id | BIGINT UNSIGNED | FK (users.id), NOT NULL | Recipient user |
| permission | ENUM | NOT NULL | view_only, download, full_access |
| expires_at | TIMESTAMP | NULLABLE | Optional share expiration |
| created_at | TIMESTAMP | NOT NULL | Share creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |

#### 5.2.4 audit_logs

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Primary key |
| user_id | BIGINT UNSIGNED | FK (users.id), NULLABLE | Actor (null for system events) |
| action | VARCHAR(50) | NOT NULL, INDEXED | Action performed (lowercase with underscores, e.g. login_success, document_uploaded) |
| category | ENUM('security','audit') | NOT NULL, DEFAULT 'audit', INDEXED | Event category. Auto-assigned by AuditService based on SECURITY_ACTIONS map. Included in HMAC hash payload — tampering detectable. |
| auditable_type | VARCHAR(255) | NULLABLE | Polymorphic target model class |
| auditable_id | BIGINT UNSIGNED | NULLABLE | Polymorphic target model ID |
| metadata | JSON | NULLABLE | Context: document_name, shared_with, expires_hours, location, two_factor status |
| ip_address | VARCHAR(45) | NOT NULL | Client IP address |
| user_agent | VARCHAR(500) | NULLABLE | Browser user agent string |
| hash | VARCHAR(64) | NOT NULL | HMAC-SHA256 hash for tamper detection |
| previous_hash | VARCHAR(64) | NULLABLE | Hash of previous log entry (chain integrity) |
| created_at | TIMESTAMP | NOT NULL | Event timestamp (immutable, no updated_at) |

**Note:** The `audit_logs` table is append-only. No UPDATE or DELETE operations are permitted at the application level. The `AuditLog` Eloquent model throws a `RuntimeException` if update or delete operations are attempted. The `category` column is included in the HMAC hash computation — any post-insert modification to a row's category will break the hash chain and be detectable. Action strings are always stored in lowercase with underscores.

**Audit category classification:**

| Action | Category | Rationale |
|--------|----------|-----------|
| login_success | security | Authentication event |
| login_failed | security | Failed authentication attempt |
| account_locked | security | Brute-force protection triggered |
| logout | security | Session termination |
| 2fa_enabled | security | Security configuration change |
| 2fa_disabled | security | Security configuration change |
| 2fa_verified | security | Authentication challenge passed |
| 2fa_failed | security | Failed authentication challenge |
| 2fa_corrupt_reset | security | Automatic security state self-correction |
| malware_detected | security | Threat blocked at upload |
| integrity_violation | security | File tampering detected at download |
| session_terminated | security | Forced session revocation |
| password_changed | security | Credential change |
| signed_url_generated | security | Externally accessible link created |
| bot_detected | security | Automated bot attempt blocked on auth form |
| document_uploaded | audit | General document action |
| document_downloaded | audit | General document action |
| document_deleted | audit | General document action |
| document_restored | audit | General document action |
| document_starred | audit | General document action |
| document_unstarred | audit | General document action |
| document_shared | audit | Sharing action |
| share_revoked | audit | Sharing action |
| profile_updated | audit | Account management |
| user_activated | audit | Admin management action |
| user_deactivated | audit | Admin management action |
| trash_emptied | audit | Bulk delete action |

#### 5.2.5 sessions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(255) | PK | Session identifier |
| user_id | BIGINT UNSIGNED | FK (users.id), NULLABLE, INDEXED | Authenticated user |
| ip_address | VARCHAR(45) | NULLABLE | Client IP address |
| user_agent | TEXT | NULLABLE | Browser user agent |
| payload | LONGTEXT | NOT NULL | Serialized session data |
| last_activity | INT | NOT NULL, INDEXED | Unix timestamp of last activity |

### 5.3 Database Security Measures

| Measure | Implementation | Threat Mitigated |
|---------|---------------|-----------------|
| Parameterized Queries | Eloquent ORM exclusively (zero raw SQL) | SQL Injection |
| Mass Assignment Protection | $fillable whitelist on all models (no $guarded) | Mass assignment attacks |
| Encrypted Columns | Laravel Crypt on two_factor_secret, description | Data exposure from DB breach |
| Password Hashing | Bcrypt with automatic cost factor | Password theft from DB dumps |
| Soft Deletes | deleted_at column on documents | Accidental permanent data loss |
| Foreign Key Constraints | ON DELETE CASCADE / RESTRICT / NULL | Orphaned records, referential integrity |
| Index Strategy | Indexed on email, action, category, user_id, created_at, composite morphs | Query performance |
| Append-Only Audit Logs | No UPDATE/DELETE on audit_logs, RuntimeException guard | Audit log tampering |
| Hash Chain on Logs | HMAC-SHA256 linking consecutive entries, category included in payload | Undetected log modification |

---

## 6. Security Implementation

### 6.1 Database Security

#### 6.1.1 SQL Injection Prevention

All database interactions use Laravel's Eloquent ORM, which automatically generates parameterized prepared statements. No raw SQL queries exist anywhere in the codebase. This is enforced as a hard constraint and verified during code review.

#### 6.1.2 Encryption at Rest

Sensitive data is encrypted before storage using AES-256-CBC via a dedicated `EncryptionService`:

- File contents: Encrypted using `EncryptionService` with a unique initialization vector (IV) per file. The IV is stored in the database for decryption.
- Sensitive columns: The `two_factor_secret` and document `description` fields use Laravel's encrypted casting for transparent encryption/decryption.
- Encryption key: Derived from the application's `APP_KEY` using SHA-256 hashing. The key is never committed to version control.

#### 6.1.3 Data Integrity

File integrity is verified using SHA-256 hashes. On upload, a hash of the original file is computed and stored. On download, the file is decrypted and the hash is recomputed and compared. A mismatch triggers an `integrity_violation` audit log entry and blocks the download with a generic user-facing error. The full exception message is never exposed to the user — it is logged privately via `Log::error()`.

The HMAC hash chain for audit logs includes the following payload fields: timestamp, user ID, action, **category**, metadata (JSON), and previous hash. Including the category field in the hash ensures that any tampering with a row's category classification is detectable during chain verification.

#### 6.1.4 Two-Factor Authentication Resilience

The `two_factor_secret` column stores the TOTP secret encrypted at rest. A `hasTwoFactorSecretValid()` helper method on the `User` model checks that the decrypted secret is non-empty and at least 16 base32 characters (the minimum required by Google2FA). This check is enforced in three locations:

- `TwoFactorController@verify` — if the secret is invalid, the 2FA flag is auto-reset, the user is redirected to login, and a `2fa_corrupt_reset` security audit entry is created
- `TwoFactorController@enable` — if the session secret is missing or too short, the user is redirected back to the QR code page
- `EnsureTwoFactor` middleware — if a user with `two_factor_enabled = true` has an invalid secret, they are force-logged out and redirected to login before reaching the challenge page

#### 6.1.5 Access Control

The Spatie Laravel Permission package (v7) provides role-based access control with permission-based enforcement:

- Roles: Super Admin, Admin, User (assigned on registration)
- Permissions are assigned to roles and enforced per-route using Spatie's permission middleware
- Laravel Policies (`DocumentPolicy`) enforce resource-level authorization
- Admin routes use permission-based middleware rather than role-based checks
- Super Admins with `view_all_documents` permission can view any document's detail page with a read-only admin notice banner — delete, download for personal use, and share form are hidden
- Super Admin cannot deactivate or change the role of their own account — enforced in both UI (menu items hidden/disabled) and backend (guard in controller)

### 6.2 Network Security

#### 6.2.1 HTTPS Enforcement

The `ForceHttps` middleware redirects all HTTP requests to HTTPS in production environments. The `Strict-Transport-Security` (HSTS) header is set with a max-age of one year. The middleware is automatically skipped in local/testing environments.

#### 6.2.2 CSRF Protection

Laravel's built-in CSRF protection covers all state-changing requests. Inertia.js automatically includes the CSRF token in every request header.

#### 6.2.3 Rate Limiting

| Route Group | Limit | Window | Action on Exceed |
|-------------|-------|--------|-----------------|
| Login | 5 requests | 1 minute | 429 Too Many Requests + lockout after 10 consecutive failures |
| Registration | 3 requests | 1 minute | 429 Too Many Requests |
| File Upload | 10 requests | 1 minute | 429 Too Many Requests |
| General API | 60 requests | 1 minute | 429 Too Many Requests |
| Password Reset | 3 requests | 1 minute | 429 Too Many Requests |
| Search | 30 requests | 1 minute | 429 Too Many Requests |
| Vault Unlock | 10 requests | 1 minute | 429 Too Many Requests |

#### 6.2.4 Security Headers

| Header | Value | Purpose |
|--------|-------|---------|
| Content-Security-Policy | Enforced in production; disabled locally for Vite | Prevents XSS by restricting resource origins |
| X-Content-Type-Options | nosniff | Prevents MIME type sniffing |
| X-Frame-Options | DENY | Prevents clickjacking via iframe embedding |
| X-XSS-Protection | 1; mode=block | Enables browser XSS filter |
| Referrer-Policy | strict-origin-when-cross-origin | Controls referrer information leakage |
| Permissions-Policy | camera=(), microphone=(), geolocation=() | Disables unnecessary browser APIs |
| Strict-Transport-Security | max-age=31536000; includeSubDomains | Enforces HTTPS for one year |

#### 6.2.5 Session Security

- Session driver: Database (enables admin session monitoring and revocation)
- Cookie flags: Secure (HTTPS only), HttpOnly (no JavaScript access), SameSite=Lax
- Session lifetime: 120 minutes with idle timeout
- Session regeneration on login (prevents session fixation attacks)
- Vault lock screen activates after 30 minutes of page inactivity — the session remains active but the entire UI is blurred and requires password re-entry to continue

#### 6.2.6 Input Validation

All incoming request data is validated using Laravel Form Requests. File names are replaced with cryptographically random UUIDs before storage. Uploaded files are validated for MIME type and size (10 MB maximum). Decryption errors return a generic message to the user; full exception details are logged privately.

#### 6.2.7 Accessibility Security

All icon-only buttons include aria-label attributes. Focus rings are visible on all interactive elements using CSS focus-visible. Modals trap focus using Radix UI's built-in focus management. The app respects the OS-level prefers-reduced-motion setting to disable animations for users with motion sensitivity.

#### 6.2.8 Bot Mitigation

Google reCAPTCHA v3 is applied to the Register and Forgot Password forms to detect and block automated bot submissions. The invisible v3 variant returns a risk score (0.0–1.0) server-side without any user interaction. Submissions scoring below 0.5 are rejected, and a `bot_detected` security audit entry is created with the form action and score in metadata. The `RECAPTCHA_SITE_KEY` is a public key intentionally shared with the frontend per Google's design; the `RECAPTCHA_SECRET_KEY` is server-side only. If Google's service is unreachable, the check fails open to avoid blocking legitimate users.

### 6.3 External Security Services

#### 6.3.1 Password Breach Detection (HaveIBeenPwned)

At registration and password change, the entered password is checked against the HIBP Pwned Passwords database using the k-Anonymity model. Only the first 5 characters of the SHA-1 hash are sent to the external API — the full hash and plaintext password never leave the server. If the password appears in a known breach, the action is blocked with the breach count displayed to the user. The check fails open if HIBP is unreachable.

#### 6.3.2 Malware Scanning (VirusTotal)

Every uploaded document is scanned via VirusTotal API using an asynchronous Laravel Queue job (`ScanDocumentWithVirusTotal`). The file is encrypted and saved to disk immediately with `scan_result = 'pending'`. The queue job submits the encrypted file for analysis and polls for results. If the file is flagged malicious or suspicious, the file is soft-deleted, and a `malware_detected` security audit log entry is created. Downloads are blocked while `scan_result = 'pending'` or `scan_result = 'malicious'`.

If VirusTotal is unreachable after all job retries are exhausted, the file is marked `scan_result = 'unavailable'` and a private log entry is created. The upload is not rolled back — fail-open behavior is preserved.

Queue driver is environment-aware: `deferred` locally (no worker process required), `database` in production (requires a dedicated queue worker).

#### 6.3.3 Geographic Enrichment (IPInfo)

Login-related audit log events (`login_success`, `login_failed`, `account_locked`) are enriched with geographic data (city, country) from IPInfo. This data is stored in the `metadata` JSON column and displayed in the activity feed as meaningful location context (e.g. "Signed in from Davao City, PH"). Results are cached per IP for 24 hours to stay within the free tier limit. Private/local IP ranges return "Local / DEV" without an API call.

---

## 7. Functional Requirements

### 7.1 Authentication Module

| ID | Requirement | Description |
|----|------------|-------------|
| FR-01 | User Registration | Users register with name, email, password. Email verification required. User role assigned automatically. Password checked against HIBP breach database. reCAPTCHA v3 score verified before account creation. |
| FR-02 | User Login | Email/password login. Rate limited to 5/min. Account lockout after 10 failures for 15 minutes. |
| FR-03 | Email Verification | Signed, time-limited verification link sent on registration. |
| FR-04 | Password Reset | Password reset via email. Reset tokens expire after 60 minutes. New password checked against HIBP. reCAPTCHA v3 score verified before reset link is sent. |
| FR-05 | Two-Factor Auth | Optional TOTP-based 2FA. 6-digit code via InputOTP component — auto-submits on last digit entry. Typewriter animation on challenge page. If `two_factor_secret` is null or invalid at login, flag is auto-reset and a `2fa_corrupt_reset` security audit entry is created. |
| FR-06 | Account Lockout | 10 consecutive failures triggers 15-minute lockout. Audit logged with IP and location. |
| FR-07 | Logout | Invalidates session, regenerates session ID, audit logged. |
| FR-08 | Session Management | Users can view active sessions and revoke others remotely. Admin can terminate any session. |
| FR-09 | Vault Lock Screen | After 30 minutes of page inactivity, UI is blurred and locked. Password required to re-enter. Session remains active. Does not trigger on alt-tab or window focus change. |

### 7.2 Document Management Module

| ID | Requirement | Description |
|----|------------|-------------|
| FR-10 | Upload Document | Upload files (PDF, DOCX, XLSX, PNG, JPG) up to 10 MB. File saved with `scan_result = 'pending'` immediately. `ScanDocumentWithVirusTotal` queue job dispatched asynchronously for VirusTotal analysis. AES-256-CBC encryption applied on upload. |
| FR-11 | View Document List | Paginated, searchable list with file type icons, size, upload date, scan badge (separate from integrity badge), and star indicator. Starred documents pinned to top. |
| FR-12 | Download Document | Blocked if `scan_result = 'pending'` or `malicious`. Decrypted on-the-fly for clean/unavailable files. Integrity verified via SHA-256 hash comparison. Generic error shown on failure; exception logged privately. |
| FR-13 | Delete Document | Soft delete to trash. Permanently deleted after 30 days via scheduler. |
| FR-14 | Restore Document | Restore from trash within the 30-day window. Both Restore and Delete Permanently actions require AlertDialog confirmation before executing. |
| FR-15 | Document Details | Metadata view with integrity hash copy-to-clipboard, scan status badge, sharing controls with Calendar date picker, access control list, and audit trail with meaningful descriptions. |
| FR-16 | Star Document | Toggle star/favorite on a document. Starred documents ordered first in My Vault. |
| FR-17 | Bulk Download | Select multiple documents and download as a ZIP file. Each file decrypted and integrity-verified before zipping. Maximum 20 documents per bulk operation. |
| FR-18 | Bulk Delete | Select multiple documents and move to trash. Maximum 50 documents per bulk operation. |
| FR-19 | Drag-and-Drop | Drag a file anywhere on My Vault to trigger a full-page overlay and redirect to the upload page. |
| FR-20 | First Upload Confetti | One-time confetti animation when a user uploads their very first document. Not triggered on subsequent uploads. |

### 7.3 Document Sharing Module

| ID | Requirement | Description |
|----|------------|-------------|
| FR-21 | Share Document | Share by email with permission level (view_only, download, full_access). Optional expiry via Calendar date picker. |
| FR-22 | Shared with Me | Dedicated view of documents shared with the current user, with permission badges and expiry indicators. Expired shares filtered server-side. |
| FR-23 | Manage Shares | Owners and full_access recipients can view, modify, or revoke active shares via AlertDialog confirmation. |
| FR-24 | Share Expiration | Expired shares filtered server-side before reaching the frontend. Optional "show expired" toggle sends server-side query param (`?show_expired=1`). |
| FR-25 | Signed Share Link | Generate a time-limited signed URL (1 hour to 7 days) using Laravel temporarySignedRoute. URL copied to clipboard. Copied status confirmed with checkmark icon. |

### 7.4 Audit Module

| ID | Requirement | Description |
|----|------------|-------------|
| FR-26 | Log All Actions | Every security-relevant action logged with timestamp, user, action, category, target, IP, and geographic location. |
| FR-27 | Meaningful Descriptions | Activity feed displays context-aware descriptions generated by `AuditDescriptionService` using a match() statement over all known action strings. Examples: "Uploaded 'filename.pdf'", "Signed in from Davao City, PH", "Invalid 2FA code submitted", "Bot verification failed on register form". Descriptions never expose raw action slugs or IP addresses. |
| FR-28 | Personal Activity | Users view their own activity log with tab-based category filtering (All Activity / Security Events / General Activity), action type Select filter, and Calendar date range pickers. |
| FR-29 | Admin Audit Log | Admins view system-wide logs with the same category tabs, user column (avatar, name, email), and advanced filtering including user search. |
| FR-30 | Tamper Detection | HMAC-SHA256 hash chain links consecutive entries for integrity verification. Category value is included in the hash payload. |
| FR-31 | Export CSV | Download audit log as CSV file, respecting active category filter. |
| FR-32 | Export PDF | Download formatted PDF audit report with Noir Amber header styling generated by DomPDF, respecting active category filter. PDF header notes which category is being exported. |

### 7.5 Administration Module

| ID | Requirement | Description |
|----|------------|-------------|
| FR-33 | Admin Dashboard | Security metrics: users, sessions, failed logins (24h), documents, storage, pending verifications. Time-based greeting ("Good morning/afternoon/evening" + emoji) using user's first name. All 6 stat cards are clickable links to their respective admin pages. Recent activity defaults to security events only. |
| FR-34 | User Management | Super Admin can activate/deactivate users and assign roles. Deactivation terminates all active sessions for that user. Self-protection: cannot deactivate or change own role — enforced in both UI (actions hidden) and backend (controller guard). |
| FR-35 | All Documents | Super Admin can view all documents system-wide (read-only with admin notice banner). Permission: view_all_documents. |
| FR-36 | Session Monitoring | Admins can view all active sessions and force-terminate individual or all sessions. Permission: manage_sessions. |
| FR-37 | Export Users CSV | Export user list as CSV with name, email, role, status, last login. |

### 7.6 Search Module

| ID | Requirement | Description |
|----|------------|-------------|
| FR-38 | Global Search | Search bar in authenticated layout header. Searches documents, audit logs, and users simultaneously. |
| FR-39 | Keyboard Shortcut | Command+K / Ctrl+K opens the global search Command popover from anywhere in the authenticated app. |
| FR-40 | Grouped Results | Results returned in groups: Documents (max 5), Activity Logs (max 3), Users (max 3, admin only). |
| FR-41 | Debounced Search | Search fires 300ms after last keystroke. Minimum 2 characters required. Results cleared on input clear. |

---

## 8. Non-Functional Requirements

| ID | Category | Requirement | Target |
|----|----------|------------|--------|
| NFR-01 | Security | All data in transit encrypted via HTTPS/TLS 1.2+. | 100% enforcement |
| NFR-02 | Security | All sensitive data at rest encrypted with AES-256-CBC. | 100% coverage |
| NFR-03 | Security | Least privilege enforced via permission-based RBAC at every layer. | Zero privilege escalation |
| NFR-04 | Security | All uploaded files scanned for malware before being made downloadable. | 100% coverage |
| NFR-05 | Security | Passwords checked against breach database at registration and change. | 100% coverage |
| NFR-06 | Performance | Page load time under 2 seconds on standard connection. | < 2 seconds |
| NFR-07 | Performance | Encryption overhead under 500ms for files up to 10 MB. | < 500ms |
| NFR-08 | Performance | Upload request completes immediately; VirusTotal scan runs asynchronously via queue. | Non-blocking |
| NFR-09 | Usability | Responsive UI functional on viewports 375px and wider. | Mobile to desktop |
| NFR-10 | Usability | Light and dark mode with system preference detection and localStorage persistence. | Full coverage |
| NFR-11 | Usability | Vault lock screen activates after 30 minutes of genuine inactivity. Does not trigger on window/tab switching. | 30 minutes |
| NFR-12 | Accessibility | WCAG 2.1 AA compliance: keyboard navigation, screen reader labels, color contrast >= 4.5:1, focus-visible rings, reduced motion support. | AA standard |
| NFR-13 | Maintainability | PSR-12 (PHP) and ESLint/Prettier (TypeScript) standards. | Zero lint warnings |
| NFR-14 | Audit | Every security-relevant event produces an immutable audit log entry with meaningful metadata and correct category assignment. | Zero gaps |
| NFR-15 | Data Retention | Soft-deleted documents permanently purged after 30 days. | Automated daily |

---

## 9. UI/UX Specification

### 9.1 Design System

| Aspect | Specification |
|--------|--------------|
| Component Library | shadcn/ui (New York style) with Radix UI primitives |
| Typography | Geist Sans by Vercel — modern geometric sans-serif with tight negative letter-spacing on headings (-0.02em). Served from npm package, no CDN dependency. |
| Layout | Sidebar navigation (collapsible), max content width responsive, two-column layouts on detail pages |
| Iconography | Lucide React icon set |
| Theme | Noir Amber — custom dual light/dark theme |
| Border Radius | 0.375rem base (New York default) — sharper than Default/Vega style |
| Accessibility | aria-label on all icon-only buttons, focus-visible ring in primary amber, reduced motion support, ARIA live regions for dynamic content |
| Page Headers | Page title + breadcrumb only. No static descriptive subtitle between title and breadcrumb. The Admin Dashboard and user Dashboard replace the subtitle slot with the time-based greeting component. |

### 9.2 Color Theme (Noir Amber)

SecureVault uses a custom Noir Amber theme with both light and dark variants. The shadcn New York style is extended with these tokens. Amber/gold accents are consistent and prominent across both modes.

#### Light Mode (:root)

| Token | Value | Usage |
|-------|-------|-------|
| --background | #F5F5F0 | Page background, dot-grid on auth pages |
| --card | #EEEEE9 | Card surfaces, elevated elements |
| --muted | #E4E4DF | Secondary surfaces, hover states |
| --foreground | #111111 | Primary text |
| --muted-foreground | #5A5A55 | Secondary text, labels, placeholders |
| --primary | #B8860B | Buttons, active states, links, focus rings |
| --border | #D5D5D0 | Card borders, input borders, dividers |
| --destructive | #B33A3A | Delete buttons, error states |

#### Dark Mode (.dark)

| Token | Value | Usage |
|-------|-------|-------|
| --background | #0A0A0A | Page background |
| --card | #111111 | Card surfaces, elevated elements |
| --muted | #1A1A1A | Secondary surfaces, hover states |
| --foreground | #FAFAF5 | Primary text (warm off-white) |
| --muted-foreground | #888880 | Secondary text, labels, placeholders |
| --primary | #D4A843 | Buttons, active states, links, focus rings |
| --border | #222220 | Card borders, input borders, dividers |
| --destructive | #B33A3A | Delete buttons, error states |

#### Status Colors (both modes)

| Purpose | Classes | Notes |
|---------|---------|-------|
| Success badges | `bg-green-500/15 text-green-700 dark:text-green-400` | Login success, clean scan, 2FA enabled/verified |
| Warning / expiry | `bg-amber-500/15 text-amber-600 dark:text-amber-400` | Expiring soon, download permission badge |
| Info / share | `bg-blue-500/15 text-blue-600 dark:text-blue-400` | Share actions, info badges, Admin role badge |
| Error / destructive | `bg-destructive/15 text-destructive` | Failed logins, integrity violations, expired, 2fa_failed badge |
| Muted / neutral | `bg-muted text-muted-foreground` | Logout, doc deleted, User role badge |

#### Badge Color Rules

All badge/pill elements (file type, scan status, permission level, role, audit action, expiry) must use the `bg-color/15` semi-transparent pattern. The solid primary fill color (`#B8860B` / `#D4A843`) is reserved exclusively for interactive primary action buttons (e.g. "Upload Document", "Apply Filters"). Using the primary color on a read-only badge creates a false affordance.

### 9.3 Component Library

SecureVault uses approximately 35 shadcn/ui components in New York style. The complete installed list:

alert, alert-dialog, aspect-ratio, avatar, badge, breadcrumb, button, calendar, card, checkbox, collapsible, command, dialog, dropdown-menu, hover-card, input, input-otp, label, pagination, popover, progress, radio-group, scroll-area, select, separator, sheet, skeleton, sonner (toast), switch, table, tabs, textarea, toggle, tooltip

Custom application components built on top of shadcn primitives:

| Component | Description |
|-----------|-------------|
| AppLogo | Logo image with mix-blend-mode for dark mode compatibility |
| UserAvatar | Avatar with Gravatar image + deterministic initials fallback (6 theme-compatible colors: amber, blue, emerald, violet, orange, teal — no pink/magenta) |
| GlobalSearch | Command-based search popover with grouped results, debounce, and Command+K shortcut |
| VaultLock | 30-minute idle timeout lock overlay with password re-entry, blur backdrop |
| PasswordStrengthBar | Real-time 5-criteria strength bar using Progress component |
| ThemeToggle | Sun/Moon icon button for light/dark switching |
| ThemeProvider | Context provider with localStorage persistence and system preference detection |
| TimeBasedGreeting | Displays "Good morning/afternoon/evening, [FirstName]! [emoji]" based on current local hour. Used on both user Dashboard (/dashboard) and Admin Dashboard (/admin). |
| AuditCategoryTabs | Shared tab switcher component for All Activity / Security Events / General Activity. Used on personal Activity page and Admin Audit Logs page. Security Events tab shows a destructive-colored count badge. |
| ScanBadge | Displays VirusTotal scan_result with correct color per status (pending=blue+spinner, clean=green, unscanned/unavailable=amber, malicious=destructive). |
| FileTypeBadge | Displays MIME-type-derived file type label with Noir Amber palette colors (PDF=amber, DOCX=blue, XLSX=emerald, IMAGE/JPG/PNG=teal). No purple or pink values. |
| PermissionBadge | Displays share permission level (view_only=blue, download=amber, full_access=emerald) using bg-color/15 pattern. |
| RoleBadge | Displays user role (Super Admin=amber, Admin=blue, User=muted) using bg-color/15 pattern. Labels in title case. |

#### Utility Modules

| Module | Description |
|--------|-------------|
| `lib/auditActionBadge.ts` | Single source of truth for audit action badge labels and colors. Used by Activity page, Admin Dashboard, and Admin Audit Logs — never duplicated per page. |
| `lib/fileTypeBadge.ts` | MIME-type-to-badge config map. Used by FileTypeBadge component. |
| `lib/trashExpiryBadge.ts` | Computes expiry badge color tier from deleted_at timestamp. Three tiers: muted (>7 days), amber (≤7 days), destructive (≤3 days). |
| `lib/recaptcha.ts` | Wraps `grecaptcha.execute()` in a typed Promise. Used by Register and ForgotPassword pages to obtain a v3 token before form submission. |

### 9.4 Page Map

| Page | Route | Access | Description |
|------|-------|--------|-------------|
| Login | /login | Guest | Noir Amber card, email + password with icons, show/hide toggle, rate limit alerts |
| Register | /register | Guest | Single-column fields, strength bar, amber top border h-1.5, "Create My Account", reCAPTCHA v3 token submitted with form |
| 2FA Challenge | /two-factor/challenge | Auth (2FA pending) | InputOTP 6-digit boxes, auto-submit, typewriter animation on subtitle |
| Forgot Password | /forgot-password | Guest | Lock+refresh icon mark, amber top border, success alert, reCAPTCHA v3 token submitted with form |
| Reset Password | /reset-password | Guest | New password with strength bar, show/hide toggle |
| Verify Email | /verify-email | Auth (unverified) | Resend link with status alert, logout ghost button |
| Dashboard | /dashboard | Auth (verified) | Time-based greeting with emoji, stat cards, Vault Storage section, Recent Documents table, Recent Activity feed, Vault Status card |
| My Vault | /documents | Auth | Searchable table with file type badges (FileTypeBadge), scan badges (ScanBadge including pending state), stars, bulk select toolbar (appears when selection > 0, with Download ZIP and Move to Trash), drag-drop overlay |
| Upload | /documents/create | Auth | Drag-drop zone, VirusTotal scanning notice, Progress upload bar, encryption banner |
| Document Detail | /documents/{id} | Auth (owner/shared) | Metadata cards, hash copy, scan badge (ScanBadge), permission badges (PermissionBadge) in access list, share form with Calendar picker, signed URL generator, audit trail with meaningful descriptions |
| Shared with Me | /shared | Auth | Card grid with permission badges (PermissionBadge), expiry urgency badges, filter Popover with Checkboxes (permission + expiry filters). No Filter button in page header — filter controls live in content area only. |
| Trash | /trash | Auth | Notice banner (amber Alert), soft-deleted documents with expiry urgency badges (trashExpiryBadge), restore/purge each requiring AlertDialog confirmation. No page header subtitle. |
| Activity | /activity | Auth | AuditCategoryTabs (All Activity / Security Events / General Activity), Action Type Select filter, Calendar date range pickers, meaningful descriptions (AuditDescriptionService), CSV/PDF export respecting active category |
| Profile | /profile | Auth | Profile form, password update with strength bar, 2FA Card, sessions widget with ScrollArea |
| Sessions | /sessions | Auth | Active sessions, current session highlighted with amber left border, revoke with AlertDialog |
| Admin Dashboard | /admin | permission:view_admin_dashboard | Time-based greeting (TimeBasedGreeting), 6 linked stat cards (all clickable), recent activity table defaults to security events, Avatar + Badge per row. No static subtitle. |
| Admin Users | /admin/users | permission:manage_users | User table with Avatar, RoleBadge (title case, bg-color/15 pattern), status Badge, DropdownMenu actions. Self-protection: Deactivate and Change Role hidden for Super Admin's own row. No page header subtitle. |
| All Documents | /admin/documents | permission:view_all_documents | Read-only system-wide document table with owner Avatar, FileTypeBadge, ScanBadge, encryption/integrity Badge |
| Admin Audit Logs | /admin/audit-logs | permission:view_audit_logs | AuditCategoryTabs (same as personal Activity), system-wide logs with user Avatar column, Calendar filters, meaningful descriptions, CSV/PDF export respecting active category |
| Admin Sessions | /admin/sessions | permission:manage_sessions | All active sessions with user Avatar, Terminate with AlertDialog, Terminate All with AlertDialog |

---

## 10. Role-Based Access Control Matrix

### 10.1 Roles and Permissions

| Permission | Super Admin | Admin | User |
|-----------|------------|-------|------|
| view_admin_dashboard | Yes | Yes | No |
| manage_users | Yes | No | No |
| view_all_documents | Yes | No | No |
| view_audit_logs | Yes | Yes | No |
| manage_sessions | Yes | Yes | No |

### 10.2 Role Descriptions

**Super Admin:** Full system administrator. Can manage users (activate/deactivate, change roles), view all documents system-wide for audit purposes (read-only with admin notice banner), access all admin dashboard features, and perform all operations available to lower roles. Cannot deactivate or change their own role.

**Admin:** Security monitor role. Can view the admin dashboard with security metrics, access system-wide audit logs for security analysis, and monitor/terminate active sessions. Cannot manage users or view other users' documents.

**User:** Default role assigned on registration. Can upload, manage, and share personal documents. Can view personal activity logs with category filtering and manage personal sessions. No access to any admin features.

### 10.3 Enforcement

- Backend: Per-route permission middleware using Spatie's `permission:xxx` syntax
- Frontend: Sidebar navigation conditionally renders items based on `auth.permissions` shared via Inertia `HandleInertiaRequests` middleware
- Policies: `DocumentPolicy` enforces resource-level access; extended to allow Super Admins with `view_all_documents` to access any document detail in read-only mode (`userPermission = 'admin_viewer'`)
- Self-protection: Super Admin cannot deactivate or change their own role — enforced both in UI (menu items hidden for own row) and backend (guard in controller returning 403)
- Direct URL access to unauthorized routes returns 403 Forbidden

---

## 11. Engineering Principles

### 11.1 Security Principles

**Least Privilege:** Every user, process, and component is granted only the minimum permissions necessary. Users start with the basic User role. Admin capabilities require explicit permission assignment. Route middleware enforces permissions, not roles.

**Defense in Depth:** Security controls are layered. Authentication, authorization, encryption, input validation, malware scanning, breach detection, bot mitigation, and audit logging each operate independently. A failure in one layer does not compromise the system.

**Fail Secure:** When an error occurs, the system defaults to denying access. Failed encryption prevents file serving. Failed policy checks deny access. Failed integrity verification blocks downloads and shows a generic error. External API failures (VirusTotal, HIBP, IPInfo, reCAPTCHA) fail open to avoid blocking legitimate users, but are logged privately. Invalid 2FA state is self-healed rather than causing a 500 error.

**Audit Everything:** Every security-relevant action produces an immutable audit trail with meaningful metadata, correct category assignment, and human-readable descriptions. The HMAC hash chain ensures tampering with any entry — including its category — is detectable.

**Separation of Duties:** Encryption keys are managed at the environment level. Database credentials differ between contexts. Audit logs cannot be modified by users who generate them. Super Admins cannot act on their own accounts.

**Privacy by Design:** The HaveIBeenPwned integration uses k-Anonymity — only 5 characters of a SHA-1 hash are sent externally. Full passwords and hashes never leave the server. Gravatar URLs use MD5 hashes of emails, never the email addresses themselves. reCAPTCHA secret keys are server-side only.

**Security Event Separation:** Authentication events, threat detections, and security configuration changes are classified as `security` category in audit logs. Routine document and account actions are classified as `audit` category. This separation allows security monitoring dashboards to surface threats without noise from general activity — a principle borrowed from real-world SIEM systems.

### 11.2 Development Principles

**No Raw SQL:** The entire codebase uses Eloquent ORM. This is a hard constraint with zero exceptions.

**Input Never Trusted:** Every request passes through Form Request validation. File names are replaced with UUIDs. User data is escaped in all outputs. Decryption errors are sanitized before reaching the user.

**Permission over Role Checks:** Authorization checks use permissions (`can:manage_users`) rather than role names (`role:super-admin`). This ensures proper separation even if roles are restructured.

**Configuration over Hardcoding:** Security values (keys, timeouts, limits, API tokens) are managed through environment variables and config files. No API keys in source code.

**External API Resilience:** All external APIs (HIBP, IPInfo, VirusTotal, Gravatar, reCAPTCHA) are wrapped in try-catch blocks and fail open. A service being unavailable must never block a user's core workflow.

**Component Consistency:** All interactive UI elements use shadcn/ui New York style primitives. Custom components extend shadcn primitives rather than replacing them. No inline HTML form elements — all forms use shadcn Input, Select, Textarea, Button. All badge/pill elements use the `bg-color/15` semi-transparent pattern — never solid fills on read-only indicators.

**Shared Utilities:** Badge color logic, audit action labels, file type configs, expiry calculations, and reCAPTCHA token retrieval live in shared utility modules (`lib/auditActionBadge.ts`, `lib/fileTypeBadge.ts`, `lib/trashExpiryBadge.ts`, `lib/recaptcha.ts`) and shared components (`ScanBadge`, `FileTypeBadge`, `PermissionBadge`, `RoleBadge`, `AuditCategoryTabs`). These are never duplicated per page.

---

## 12. Hard Constraints

| # | Constraint | Rationale |
|---|-----------|-----------|
| 1 | Individual project (single developer) | Course requirement |
| 2 | No third-party cloud storage for documents | Files encrypted and stored locally to demonstrate encryption concepts |
| 3 | No raw SQL queries in the entire codebase | Enforces SQL injection prevention via Eloquent ORM |
| 4 | Every security measure must be documented | Each feature includes documentation of threat mitigated and mechanism |
| 5 | APP_KEY must never be committed to version control | Encryption key exposure invalidates all encrypted data |
| 6 | Audit logs are immutable at the application level | No UPDATE or DELETE; RuntimeException guard on model |
| 7 | All file uploads stored outside the public directory | Prevents direct URL access; forces authorized controller access |
| 8 | HTTPS required for all production traffic | Prevents man-in-the-middle attacks |
| 9 | Passwords must meet complexity requirements | Minimum 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special |
| 10 | Maximum upload size: 10 MB per file | Prevents resource exhaustion; manageable encryption and scan overhead |
| 11 | Permission-based route enforcement (not role-based) | Prevents privilege overlap between Admin and Super Admin |
| 12 | External API keys must be stored in .env only | Never hardcoded in source code or committed to version control. Note: `RECAPTCHA_SITE_KEY` is a public key by Google's design and is intentionally shared with the frontend via Inertia shared props — only `RECAPTCHA_SECRET_KEY` is server-side only and subject to this constraint. |
| 13 | VirusTotal scan must be dispatched before a file is made downloadable | The scan job is dispatched immediately after upload. Downloads are blocked while `scan_result = 'pending'`, ensuring no unscanned file is ever served. |
| 14 | HIBP check must use k-Anonymity model | Full password hash must never be transmitted to external service |
| 15 | Vault lock screen must not trigger on tab/window switching | Only genuine inactivity (30 minutes) should trigger the lock |
| 16 | Decryption errors must never expose exception messages to users | Internal errors logged privately; generic message shown to user |
| 17 | Audit action strings must be lowercase with underscores | Consistency with `auditActionBadge.ts` key mapping; prevents badge fallthrough to unknown-action default |
| 18 | Badge/pill elements must use bg-color/15 semi-transparent pattern | Solid primary fill is reserved for interactive buttons only; prevents false affordance on read-only indicators |

---

## 13. Testing Strategy

### 13.1 Security Testing Checklist

| Test Case | Method | Expected Result |
|-----------|--------|----------------|
| SQL Injection on login form | Submit malicious SQL in email/password fields | Parameterized query; validation error returned |
| CSRF token removal | Submit form without CSRF token | 419 status code; request rejected |
| Direct file URL access | Attempt to access storage/app/vault/ via URL | 403 Forbidden; files outside public directory |
| Rate limit on login | Submit 6+ login requests in 1 minute | 429 Too Many Requests after 5th attempt |
| Account lockout | Submit 10+ wrong passwords | Account locked for 15 minutes; audit logged with IP |
| Unauthorized document access | Access /documents/{other_user_id} | 403 Forbidden; DocumentPolicy denies |
| XSS via file name | Upload file with script tag in filename | Filename replaced with UUID; no execution |
| 2FA bypass | Skip 2FA challenge page via direct URL | Redirected back to challenge; session not elevated |
| 2FA corrupt secret | Login with two_factor_enabled=true and null secret | Self-healed: flag reset, redirected to login, 2fa_corrupt_reset logged |
| Audit log tampering | Attempt to modify audit_logs record | RuntimeException thrown; no modification possible |
| Audit category tampering | Manually change category column in DB | Hash chain breaks; detectable on next verification |
| File integrity | Manually corrupt an encrypted file on disk | Download blocked; generic error shown; integrity_violation logged privately |
| Decryption error message | Trigger decryption failure | Generic user-facing message; no exception details exposed |
| Session fixation | Reuse session ID after login | Session regenerated; old ID invalid |
| Admin role access to users | Log in as Admin, access /admin/users | 403 Forbidden; manage_users permission required |
| User role access to admin | Log in as User, access /admin | 403 Forbidden; no admin permissions |
| Super Admin document audit | Log in as Super Admin, access /admin/documents | 200 OK; read-only view with admin notice banner |
| Super Admin document detail | Log in as Super Admin, access any /documents/{id} | 200 OK; read-only, no delete/share controls visible |
| Super Admin self-deactivation | Attempt to deactivate own account | Menu items hidden; backend guard rejects request |
| HIBP breach password | Register with known breached password (e.g. "password123") | Blocked with breach count message |
| HIBP k-Anonymity | Monitor network traffic during registration | Only 5-char SHA-1 prefix sent; full hash never transmitted |
| VirusTotal malicious upload | Upload EICAR test file | File saved as pending, job runs, file soft-deleted; malware_detected audit entry created |
| VirusTotal clean upload | Upload valid PDF | Scan passes; scan_result = 'clean'; ScanBadge shown green |
| Download while pending | Attempt download while scan_result = 'pending' | Blocked with "file is still being scanned" message |
| reCAPTCHA bot submission | Submit register form with score below 0.5 | Rejected; bot_detected audit entry created |
| reCAPTCHA action mismatch | Submit register token on forgot-password endpoint | Rejected; action mismatch detected server-side |
| reCAPTCHA unavailable | Submit form when Google is unreachable | Fails open; form proceeds; private error logged |
| Signed URL expiry | Access signed share link after expiration | 403 Forbidden; link rejected |
| Vault lock — genuine idle | Leave browser idle for 30 minutes | Lock overlay appears |
| Vault lock — alt-tab | Alt-tab away and return immediately | Lock does NOT trigger |
| Vault lock — wrong password | Enter incorrect password at lock screen | Error shown; overlay stays |
| Bulk download scope | Attempt to bulk-download another user's document IDs | Scoped to user_id; foreign documents excluded |
| Empty Trash scope | Trigger Empty Trash | Only deletes documents owned by auth()->user(); cross-user deletion impossible |

### 13.2 Feature Testing Checklist

| Test Case | Expected Result |
|-----------|----------------|
| First document upload | Confetti animation fires once only |
| Subsequent uploads | No confetti |
| Drag file over My Vault | Full-page amber overlay appears |
| Drop file on My Vault | Redirects to upload page |
| Star a document | Document moves to top with filled amber star icon |
| Unstar a document | Document returns to normal sort order |
| Starred filter | Only starred documents shown |
| Bulk select + Download ZIP | ZIP file downloads with correctly decrypted documents |
| Bulk select + Move to Trash | All selected documents soft-deleted with single confirmation |
| Global search Command+K | Search Command popover opens |
| Search "doc" | Returns matching documents in grouped results |
| Admin search for user | Returns user results; regular users see no user group |
| Generate share link (1 hour) | Signed URL copied to clipboard; "Copied!" checkmark shown |
| Access signed link before expiry | Document detail loads in read-only mode |
| Access signed link after expiry | 403 Forbidden |
| Export audit log PDF — security only | Formatted PDF downloads; header notes "Security Events" |
| Export audit log PDF — all | Formatted PDF downloads; header notes "All Events" |
| Export audit log CSV | CSV downloads with correct columns including category |
| Time-based greeting (morning) | "Good morning" + sun emoji shown (before 12:00) |
| Time-based greeting (afternoon) | "Good afternoon" + emoji shown (12:00–17:00) |
| Time-based greeting (evening) | "Good evening" + moon emoji shown (after 17:00) |
| Activity category tab — security | Only security-category events shown |
| Activity category tab — general | Only audit-category events shown |
| Activity category tab — all | All events shown regardless of category |
| Admin Dashboard activity feed | Defaults to showing security events only |
| Admin Dashboard stat cards | All 6 cards are clickable and navigate to correct admin pages |
| Activity description — login | "Signed in from Davao City, PH" (with IPInfo data) |
| Activity description — upload | "Uploaded 'filename.pdf'" |
| Activity description — star | "Starred 'filename.pdf'" |
| Activity description — share link | "Generated share link for 'filename.pdf' (24h)" |
| Activity description — 2fa_failed | "Invalid 2FA code submitted" |
| Activity description — logout | "Signed out" (no IP address in description) |
| Activity description — bot_detected | "Bot verification failed on register form" |
| 2FA_FAILED badge | Renders with bg-destructive/15 text-destructive (not gray) |
| Scan badge — pending | Blue badge with spinning loader icon "Scanning..." |
| Scan badge — clean | Green badge "Clean" |
| Scan badge — unavailable | Amber badge "Unavailable" |
| Trash expiry badge — 30 days | Muted gray badge "30d left" |
| Trash expiry badge — 5 days | Amber badge "5d left" |
| Trash expiry badge — 2 days | Destructive red badge "2d left" |
| Trash expiry badge — 0 days | Destructive red badge "Expires today" |
| Trash Restore button | AlertDialog appears before restoring |
| Trash Delete Permanently button | AlertDialog appears before permanent deletion |
| Permission badge — view_only | Blue bg-blue-500/15 text-blue-600 badge "View Only" |
| Permission badge — download | Amber bg-amber-500/15 text-amber-600 badge "Download" |
| Permission badge — full_access | Emerald bg-emerald-500/15 badge "Full Access" |
| Role badge — Super Admin | Amber bg-amber-500/15 badge "Super Admin" (not solid fill) |
| Role badge — Admin | Blue bg-blue-500/15 badge "Admin" |
| Role badge — User | Muted badge "User" |
| File type badge — PDF | Amber badge "PDF" (not pink) |
| File type badge — IMAGE | Teal badge "IMAGE" (not purple) |
| Shared with Me filter Popover | Opens from content-area Filter button only; no duplicate header button |
| Calendar date picker — select | Button label updates to selected date (e.g. "Mar 22, 2026") |
| Calendar — today highlight | Today's date shows muted background with border |
| Calendar — cell spacing | Day cells evenly spaced; day-of-week headers aligned above columns |
| Avatar color — Super Admin | "SA" initials render in teal, not pink/magenta |
| Avatar fallback | Users without Gravatar show correct initials in theme-compatible color |
| HIBP unavailable | Registration proceeds; failure logged privately |
| VirusTotal unavailable | Upload proceeds; scan_result = 'unavailable' after job retries exhausted; failure logged |
| IPInfo unavailable | Login proceeds; no location in metadata; failure logged |
| reCAPTCHA unavailable | Register and ForgotPassword proceed; failure logged privately |
| Gravatar email has avatar | Profile photo shown in avatar across all pages |
| Gravatar email has no avatar | Initials circle shown; no broken image icon |
| InputOTP 2FA — auto-submit | Entering 6th digit auto-submits the form |
| Typewriter 2FA animation | Subtitle text animates character-by-character on page load |
| Reduced motion | Enable OS reduce-motion setting; all animations disabled |

---

## 14. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | [Date] | Evander Harold S. Amorcillo | Initial document creation |
| 2.0 | [Date] | Evander Harold S. Amorcillo | Updated to reflect final implementation: Laravel 13, Spatie v7, Vega style, Noir Amber theme, RBAC matrix with permission-based enforcement, All Documents admin feature, UI/UX specification |
| 3.0 | [Date] | Evander Harold S. Amorcillo | Major update: Added light/dark mode system, full shadcn/ui component library (35 components), external API integrations (HaveIBeenPwned, IPInfo, VirusTotal, Gravatar), new features (bulk operations, global search, document stars, vault lock screen, confetti, drag-and-drop, signed share links, typewriter 2FA, PDF audit export, time-based greeting), updated database schema (scan_result, is_starred columns), accessibility improvements (WCAG 2.1 AA), updated security layer architecture, complete page map revision |
| 3.1 | [Date] | Evander Harold S. Amorcillo | Visual system migration: Geist Sans font replacing Inter, shadcn New York style replacing Vega (border-radius 0.375rem, tighter spacing, solid sidebar active state). Bug fixes: vault lock timeout corrected to 30 minutes and no longer triggers on alt-tab/window switching, avatar color palette updated to remove pink/magenta (6 theme-compatible colors: amber, blue, emerald, violet, orange, teal), activity feed descriptions now show meaningful context from audit log metadata, Calendar date picker fixed (date selection updates button label, today highlight, cell spacing), stat card layout fixed (labels no longer wrap, consistent min-height, shortened sub-labels), filter bar label spacing corrected, decryption error messages sanitized to prevent information leakage |
| 3.2 | [Date] | Evander Harold S. Amorcillo | Audit log category separation: added `category` ENUM column to `audit_logs` (security/audit), AuditCategory enum, SECURITY_ACTIONS map in AuditService, category included in HMAC hash payload. New shared components: ScanBadge, FileTypeBadge, PermissionBadge, RoleBadge, TimeBasedGreeting, AuditCategoryTabs. New utility modules: auditActionBadge.ts, fileTypeBadge.ts, trashExpiryBadge.ts. Bug fixes: 2FA self-healing guard (hasTwoFactorSecretValid(), 2fa_corrupt_reset audit action), AuditDescriptionService with full action-to-description match() map, trash expiry urgency badges (3-tier color escalation), role badge and permission badge color system (bg-color/15 pattern, no solid fills on read-only indicators), all action badge labels changed from uppercase slugs to human-readable sentence case, 2FA_FAILED badge corrected to destructive color, duplicate Filter button removed from Shared with Me header, Admin Dashboard activity feed defaults to security events, all 6 admin stat cards confirmed as clickable links, page header subtitle removed from all pages (Admin Dashboard uses TimeBasedGreeting in that slot), Hard Constraint #17 and #18 added. |
| 3.3 | [Submission Date] | Evander Harold S. Amorcillo | New feature: Google reCAPTCHA v3 bot mitigation on Register and Forgot Password forms (RecaptchaService, lib/recaptcha.ts, bot_detected security audit action, score threshold 0.5, fails open). New feature: Async VirusTotal scanning via Laravel Queue job (ScanDocumentWithVirusTotal) — uploads complete immediately with scan_result = 'pending'; downloads blocked while pending or malicious; malware_detected logged async. Queue driver environment-aware: deferred locally (no worker needed), database in production. Schema: scan_result column converted from JSON to VARCHAR(50), pending added as valid value. Calendar day-of-week header spacing fixed (head_cell w-9 text-center). Documentation: sections 1.3, 2.2.1, 2.2.2, 3.2, 3.2.3, 3.2.5 (new), 3.3, 4.2, 4.3, 4.4, 5.2.2, 5.2.4, 6.2.8 (new), 6.3.2, 7.1, 7.2, 9.3, 9.4, 12, 13.1, 13.2 updated. Hard Constraint #13 reworded to reflect async model. |
