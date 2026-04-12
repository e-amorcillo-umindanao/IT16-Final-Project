# SecureVault
## Encrypted Document Management System
### Software Documentation

**Course:** IT 16: Information Assurance and Security 1
**Institution:** University of Mindanao, Matina Campus, Davao City, Philippines
**Prepared by:** Evander Harold S. Amorcillo
**Version:** 3.13

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

This project serves as a practical implementation of database security and network security concepts covered in IT 16: Information Assurance and Security 1. Every architectural decision prioritizes the CIA triad (Confidentiality, Integrity, Availability) while maintaining usability. Version 3.13 extends the system with Google OAuth as an additive authentication method, while preserving existing email verification, reCAPTCHA, password-expiry, local-password, and 2FA controls. The application features a premium Noir Amber visual theme built with Geist Sans typography and shadcn/ui New York style components, with full light and dark mode support.

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
- Custom profile picture upload: users may upload a personal avatar (JPEG, PNG, WebP, max 8 MB, up to 8000Ã—8000px source) which takes priority over linked Google avatar, then Gravatar. Oversized images are automatically resized server-side by `AvatarImageService` to fit within a 512Ã—512 box (aspect ratio preserved) before saving. JPEG EXIF orientation metadata is auto-corrected before resize to prevent sideways images from phone uploads. Uploads do not fail due to large dimensions or file size alone. Images below the minimum size threshold are still rejected. Stored in `storage/app/public/avatars/` as a UUID-named file. Avatar uploads are exempt from VirusTotal scanning. Removing a custom avatar reverts to the Google avatar â†’ Gravatar â†’ initials fallback chain.
- Bot mitigation via Google reCAPTCHA v2 checkbox challenge on registration and password reset forms
- Google OAuth as an additional sign-in method for existing accounts that have been explicitly linked from Profile settings; OAuth replaces the password step only and does not create accounts
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
- Admin IP allowlist / blocklist with CIDR matching for network-level access control
- Password expiry policy with configurable maximum age and forced change flow
- TOTP 2FA backup recovery codes (one-time-use, bcrypt-hashed) for account recovery
- Document version history with per-version encryption, integrity hashes, and restore capability
- PDF download watermarking: downloader name, email, and timestamp overlaid in-memory at serve time
- GDPR-style personal data export delivered as a signed ZIP download link via email
- Account deletion request with 30-day grace period, cancellation link, and scheduled purge

### 1.4 Definitions and Acronyms

| Term | Definition |
|------|-----------|
| AES-256-CBC | Advanced Encryption Standard with 256-bit key, Cipher Block Chaining mode |
| CIA Triad | Confidentiality, Integrity, Availability |
| CSRF | Cross-Site Request Forgery |
| CSP | Content Security Policy |
| HIBP | Have I Been Pwned â€” breach detection service |
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
| New York | shadcn/ui component style variant â€” sharp, compact, high-density |
| Geist Sans | Modern geometric sans-serif typeface by Vercel |
| VirusTotal | Cloud-based malware and threat intelligence service |
| Gravatar | Globally recognized avatar service by Automattic |
| DomPDF | PHP PDF generation library for Laravel |
| k-Anonymity | Privacy model used by HIBP to check passwords without exposing them |
| reCAPTCHA v2 | Google's visible "I'm not a robot" checkbox challenge service |
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
| US-17 | Super Admin | I want to manage an IP allowlist and blocklist so that access can be restricted by network. | High |
| US-18 | User | I want to be forced to change my password when it expires so that my credentials stay fresh. | Medium |
| US-19 | User | I want backup recovery codes when enabling 2FA so that I can regain access if I lose my authenticator. | High |
| US-20 | User | I want to view and restore previous versions of my documents so that I can recover from accidental overwrites. | Medium |
| US-21 | User | I want downloaded PDFs to include a watermark with my identity so that document leaks are traceable. | Medium |
| US-22 | User | I want to export a copy of my personal data so that I know what information is held about me. | Medium |
| US-23 | User | I want to permanently delete my account and all associated data with a grace period to change my mind. | Medium |
| US-24 | User | I want to be reminded to set up 2FA within 3 days of registration so that my account is secured in a timely manner. | High |

### 2.2 Core Features

#### 2.2.1 Authentication and Authorization

- Email/password registration with email verification link (email verification is now enforced. New registrations receive a signed verification link at their Gmail address via Gmail SMTP. The `markEmailAsVerified()` shortcut has been removed.)
- Google reCAPTCHA v2 checkbox bot mitigation on registration and forgot password forms â€” visible challenge, fails open if Google is unreachable
- Password breach detection via HaveIBeenPwned at registration and password change using k-Anonymity
- Login with rate limiting (5 attempts per minute, lockout after 10 consecutive failures for 15 minutes)
- Google OAuth sign-in for linked accounts only â€” login lookup uses `google_id` first, then email, and still passes through verified, 2FA, password-expiry, and IP-policy middleware
- Optional TOTP-based two-factor authentication (Google Authenticator, Authy) with InputOTP 6-digit component that auto-submits on last digit entry
- 2FA self-healing: if `two_factor_secret` is null or shorter than 16 characters at login, the flag is auto-reset, the user is redirected to login with a safe error message, and a `2fa_corrupt_reset` audit entry is created
- Session management with database-driven sessions, configurable timeout, and remote revocation
- Vault lock screen after 30 minutes of page inactivity (session remains active, UI blurred and locked)
- Password requirements: minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 digit, 1 special character
- Real-time password strength indicator on registration and password change forms
- Password expiry policy: configurable maximum password age (default 90 days) enforced by `EnsurePasswordNotExpired` middleware; users are redirected to a forced change screen on expiry; 14-day advance warning banner on the dashboard
- 2FA backup recovery codes: 8 one-time-use codes generated when 2FA is enabled; stored as bcrypt hashes; consumed via a dedicated recovery challenge page; regenerable from Profile; `recovery_code_used` and `recovery_code_failed` security audit events logged

#### 2.2.2 Document Management

- Upload documents (PDF, DOCX, XLSX, images) with a maximum file size of 10 MB
- Asynchronous malware scanning via VirusTotal API dispatched as a Laravel Queue job after upload â€” file saved immediately with `scan_result = 'pending'`; downloads blocked until scan resolves. **Note: profile picture (avatar) uploads are exempt from VirusTotal scanning â€” only document uploads in `storage/app/vault/` are scanned.**
- AES-256-CBC encryption applied before storage on disk with unique IV per file
- SHA-256 hash computed on upload and verified on download for integrity checking
- Download with on-the-fly decryption and integrity verification
- Soft delete with 30-day recovery window, automated daily purge via scheduler
- Document starring/favoriting with starred documents pinned to top of vault
- Bulk operations: download multiple documents as ZIP, batch move to trash
- Drag-and-drop file upload from anywhere on the My Vault page with visual overlay
- Confetti animation on first document upload (one-time celebration)
- Document version history: replacing a document archives the previous encrypted file as a version; users can view all prior versions and restore any of them; each version stores its own IV, hash, uploader, and timestamp
- PDF download watermarking: every PDF download is overlaid in-memory with the downloader's name, email, timestamp, and document name before serving; the stored encrypted file is never modified; fails open if the watermark library errors

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
- Category is auto-assigned by `AuditService` based on a centralized `SECURITY_ACTIONS` constant â€” callers do not need to specify category manually
- Category value is included in the HMAC-SHA256 hash payload, making category tampering detectable
- Meaningful descriptions derived from metadata (e.g. "Uploaded 'filename.pdf'", "Signed in from Davao City, PH")
- Descriptions generated by a dedicated `AuditDescriptionService` using a `match()` statement over all known action strings
- Logs are append-only with HMAC-SHA256 hash chain for tamper detection
- Users can view their own activity with tab-based category filtering (All Activity / Security Events / General Activity) and Calendar date range pickers
- Admins can view system-wide logs with the same category tabs plus advanced filtering including user search
- Export audit logs as CSV or formatted PDF report with Noir Amber header styling, respecting active category filter
- Admin-only audit integrity verification page supporting full-chain and recent-500 verification modes, reporting pass/fail counts with capped failure details; each run is recorded as an `audit_integrity_check` security audit entry

#### 2.2.5 Administration

- Admin dashboard with real-time security metrics (users, sessions, failed logins, storage, pending verifications), color escalation on Failed Logins and Pending Verifications, quota-based storage Progress bar, and a 7-day successful-logins bar chart
- Time-based greeting on dashboard ("Good morning/afternoon/evening") using user's first name
- Admin Dashboard "Recent System Activity" defaults to security events only
- User management: view, activate/deactivate, assign roles (Super Admin only)
- All Documents view for audit purposes (Super Admin only, read-only)
- System-wide audit log viewer with category tabs and filtering by user, action, date range, IP
- Active session monitoring with force-terminate capability
- Global search across documents, audit logs, and users with Command+K / Ctrl+K keyboard shortcut
- IP allowlist / blocklist management: Super Admin can define CIDR rules enforced by `CheckIpPolicy` middleware on every authenticated request; private/local IP ranges always bypass the blocklist; rules cached for 5 minutes; access denials logged as `access_blocked_ip` security events

#### 2.2.6 Privacy and Account Lifecycle

- GDPR-style personal data export: users can request a ZIP archive of their profile data, document metadata, and full audit log; delivered via a 24-hour signed download link emailed asynchronously; one request per 24 hours; export files deleted after download or on expiry
- Account deletion request: users can schedule permanent account deletion with a 30-day grace period; account is deactivated immediately; a cancellation link is emailed; after 30 days a scheduler purges the account, all documents, and physical files; audit log entries are anonymised (user_id set to null) rather than deleted to preserve hash chain integrity

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
| OAuth | laravel/socialite | Latest | Google OAuth 2.0 integration |
| 2FA | pragmarx/google2fa-laravel | Latest | TOTP 2FA implementation |
| Encryption | Laravel Crypt (OpenSSL) | Built-in | AES-256-CBC file and data encryption |
| RBAC | spatie/laravel-permission | 7.x | Role and permission management |
| PDF Export | barryvdh/laravel-dompdf | Latest | PDF generation for audit log export |
| Language | PHP | 8.3+ | Server-side runtime |
| Language | TypeScript | 5.x | Type-safe frontend code |
| Build Tool | Vite | 7.x | Frontend asset bundling |
| Confetti | canvas-confetti | Latest | First upload celebration animation |
| Date Utilities | date-fns | Latest | Date formatting and calculation (trash expiry badges, calendar pickers) |
| PDF Watermarking | setasign/fpdi + setasign/fpdf | Latest | In-memory PDF overlay for download watermarking |

### 3.2 External API Integrations

| API | Purpose | Authentication | Rate Limit |
|-----|---------|---------------|-----------|
| Gmail SMTP | Outbound email delivery for verification emails | Gmail App Password | Free, subject to Google sending limits |
| Google OAuth 2.0 | User authentication via Google account | Client ID (public) + Client Secret (server-side only) | Google API quotas apply |
| HaveIBeenPwned (HIBP) | Password breach detection using k-Anonymity model | None required | Reasonable use |
| IPInfo | IP geolocation for audit log enrichment | Bearer token | 50,000 req/month (free) |
| VirusTotal | Async malware scanning of uploaded documents via queue job | API key header | 4 req/min, 500/day (free) |
| Gravatar | User avatar images derived from MD5 hash of email | None required | Unlimited |
| Google reCAPTCHA v2 Checkbox | Bot mitigation on Register and Forgot Password forms | Site key (public) + Secret key (server-side only) | Free tier, generous quota |

#### 3.2.1 HaveIBeenPwned Implementation

The HIBP k-Anonymity model is used to check passwords without exposing them. Only the first 5 characters of the SHA-1 hash are sent to the API. The full hash and plaintext password never leave the server. This check runs at registration and password change. If HIBP is unavailable, the check fails open without blocking the user action.

#### 3.2.2 IPInfo Implementation

Login-related audit log entries are enriched with geographic location data (city, country) via IPInfo. Results are cached for 24 hours per IP address to conserve free tier quota. Private and local IP ranges return "Local / DEV" without an API call. Location data is stored in the metadata JSON column.

#### 3.2.3 VirusTotal Implementation

Uploaded files are scanned for malware via VirusTotal API using an asynchronous Laravel Queue job (`ScanDocumentWithVirusTotal`). The upload request completes immediately â€” the file is encrypted, saved to disk, and persisted to the database with `scan_result = 'pending'`. The scan job is dispatched after the HTTP response cycle.

The queue job submits the file to VirusTotal, polls for results, and updates `scan_result` to `clean`, `malicious`, or `unavailable`. If the file is flagged malicious, it is soft-deleted immediately and a `malware_detected` security audit entry is created. Downloads are blocked while `scan_result = 'pending'` or `scan_result = 'malicious'`.

If VirusTotal is unreachable after all retries, the job marks the file `unavailable` and logs a private error entry. The upload is not rolled back â€” fail-open behavior is preserved for service unavailability.

Queue driver is environment-aware: `deferred` in local development (automatic, no worker process needed), `database` in production (requires a dedicated queue worker).

#### 3.2.4 Gravatar Implementation

User avatars follow a four-tier resolution chain in the `UserAvatar` component:
1. **Custom upload** (`user.avatar_url`) â€” if the user has uploaded a profile picture, it is used first.
2. **Google avatar** (`user.google_avatar`) â€” if the user has linked Google OAuth and no custom upload exists, the Google-hosted profile image is used.
3. **Gravatar** â€” a Gravatar URL built from the MD5 hash of the user's email address with `?d=404` is attempted if neither of the above succeeds.
4. **Initials fallback** â€” shadcn's `AvatarFallback` renders deterministic initials when all image sources fail.

The initials fallback uses a color palette of six distinct, theme-compatible colors (amber, blue, emerald, violet, orange, teal) â€” no pink or magenta values.

#### 3.2.5 reCAPTCHA v2 Implementation

Google reCAPTCHA v2 checkbox is integrated on the Register and Forgot Password forms to mitigate automated bot submissions. The visible checkbox widget is rendered on the page and issues a one-time token only after the user completes the challenge.

The frontend `RecaptchaWidget.tsx` loads the Google script once, stores the returned token via callback, and submits it with the form. The backend `RecaptchaService` verifies the token using Google's `siteverify` endpoint and rejects failed challenges, recording a `bot_detected` security audit entry when verification fails.

The `RECAPTCHA_SITE_KEY` / `VITE_RECAPTCHA_SITE_KEY` value is intentionally shared with the frontend because Google's site key is public by design. The `RECAPTCHA_SECRET_KEY` is server-side only and must never be exposed in frontend code or version control. If Google's script or API is unreachable, `lib/recaptcha.ts` returns the sentinel string `__recaptcha_unavailable__` and the backend fails open while logging the event privately.

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
| Queue | Automatically configured based on APP_ENV. Local: `deferred` (no worker needed â€” scan runs automatically after HTTP response). Production: `database` (requires `php artisan queue:work --tries=3 --timeout=60`). |

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
6. For registration and password reset, `RecaptchaService` verifies the reCAPTCHA v2 checkbox token before proceeding.
7. For file uploads, the file is encrypted via `EncryptionService` and saved with `scan_result = 'pending'`. `ScanDocumentWithVirusTotal` job is dispatched to the queue â€” the HTTP response returns immediately.
8. For file operations, `EncryptionService` encrypts/decrypts data using AES-256-CBC.
9. For login events, `IpInfoService` enriches the audit log with geographic location.
10. The controller returns an Inertia response, which renders the appropriate React component.
11. `AuditService` logs the action with HMAC hash chain linking, auto-assigned category, and meaningful metadata.
12. `AuditDescriptionService` generates human-readable descriptions from metadata for display in activity feeds.
13. The queue worker (or deferred driver locally) processes `ScanDocumentWithVirusTotal`, updates `scan_result`, and logs `malware_detected` if the file is flagged.

### 4.3 Directory Structure

| Directory | Purpose |
|-----------|---------|
| `app/Http/Controllers/` | Request handlers for each module (includes `AvatarController.php`, `AccountDeletionController.php`, `DataExportController.php`, `ExpiredPasswordController.php`) |
| `app/Http/Controllers/Admin/` | Admin-specific controllers (AuditIntegrityController.php, IpRuleController.php) |
| `app/Http/Middleware/` | Custom middleware (ForceHttps, SecurityHeaders, EnsureTwoFactor, EnsureAccountActive, LogRequest, CheckIpPolicy, EnsurePasswordNotExpired) |
| `app/Models/` | Eloquent models with relationships and scopes |
| `app/Policies/` | Authorization policies (DocumentPolicy â€” extended for Super Admin read-only access) |
| `app/Services/` | Business logic (EncryptionService, AuditService, AuditDescriptionService, PwnedPasswordService, IpInfoService, VirusTotalService, RecaptchaService, AuditIntegrityService, AvatarImageService, IpPolicyService, RecoveryCodeService, DocumentVersionService, PdfWatermarkService) |
| `app/Jobs/` | Queue jobs (ScanDocumentWithVirusTotal â€” async VirusTotal scan dispatched after upload; ExportUserDataJob â€” async personal data export ZIP generation) |
| `app/Enums/` | PHP enums (AuditCategory) |
| `app/Rules/` | Custom validation rules (ValidCidr â€” validates IPv4/IPv6 CIDR notation; NotPwnedPassword â€” wraps PwnedPasswordService) |
| `app/Models/` (additions) | IpRule, TwoFactorRecoveryCode, DocumentVersion, DataExport |
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
| `storage/app/temp/` | Temporary ZIP files for bulk download (auto-deleted after send) |
| `storage/app/exports/` | Temporary personal data export ZIPs (deleted after download or 24h expiry via scheduler) |
| `resources/views/pdf/` | Blade templates for PDF generation |
| `config/securevault.php` | Application-specific security configuration |
| `config/queue.php` | Queue driver auto-selects `deferred` (local) or `database` (production) based on APP_ENV |

### 4.4 Security Layer Architecture

| Layer | Component | Security Measure |
|-------|-----------|-----------------|
| Network | Web Server / Middleware | HTTPS enforcement, rate limiting, CSP headers (production), HSTS |
| Application | Controllers / Middleware | Input validation, CSRF protection, session management, account active checks |
| Bot Mitigation | RecaptchaService + RecaptchaWidget | reCAPTCHA v2 checkbox on Register and Forgot Password; token verified server-side; fails open if Google is unreachable |
| OAuth | GoogleOAuthController | Email ownership enforcement, `google_id` primary lookup, no account creation via OAuth, unlink requires current password, Socialite state parameter CSRF protection |
| Authorization | Policies / Permissions | Permission-based RBAC (Spatie v7), resource ownership checks, per-route enforcement |
| Data | Eloquent ORM | Parameterized queries, mass assignment protection via $fillable |
| External | VirusTotalService / PwnedPasswordService / RecaptchaService | Async malware scan via queue job; breach check at registration and password change; visible reCAPTCHA checkbox verification on auth forms |
| Storage | EncryptionService | AES-256-CBC file encryption with unique IV per file, SHA-256 integrity hashing |
| Audit | AuditService + AuditDescriptionService | Immutable append-only logs, HMAC-SHA256 hash chain (includes category in payload), IPInfo geo-enrichment, meaningful descriptions, two-tier category separation |
| IP Policy | CheckIpPolicy Middleware | CIDR-based allowlist / blocklist enforced on every authenticated request; private ranges always bypass; rules cached 5 min; denials logged as security events |
| Credential Lifecycle | EnsurePasswordNotExpired Middleware | Forces password change after configurable expiry (default 90 days); proactive 14-day warning on dashboard |
| Session | VaultLock Component | Client-side 30-minute idle lock overlay; password required to re-enter without ending session |
| Error Handling | Laravel exception pipeline (`bootstrap/app.php`) | Full exception details logged privately; generic error responses returned in production; stack traces never exposed to clients |
| Data Masking | MaskingHelper + `maskData.ts` | Email and IP values masked in user-facing views and safer exports; original values remain in the database |

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
| two_factor_secret | TEXT | NULLABLE, ENCRYPTED | TOTP secret key (encrypted at rest). Must be â‰¥16 base32 characters when decrypted. Auto-reset to NULL if found invalid during login. |
| two_factor_enabled | BOOLEAN | DEFAULT FALSE | Whether 2FA is active |
| two_factor_deadline | TIMESTAMP | NULLABLE | Date by which the user must enable 2FA (registration + 3 days). Cleared when 2FA is enabled. Legacy accounts receive a deadline on first authenticated request after rollout. |
| failed_login_attempts | INT | DEFAULT 0 | Consecutive failed login count |
| locked_until | TIMESTAMP | NULLABLE | Account lockout expiry |
| last_login_at | TIMESTAMP | NULLABLE | Last successful login time |
| last_login_ip | VARCHAR(45) | NULLABLE | Last login IP (supports IPv6) |
| is_active | BOOLEAN | DEFAULT TRUE | Account active status |
| is_system_account | BOOLEAN | DEFAULT FALSE | Marks a protected hidden recovery account. System accounts are excluded from admin user management queries and exempt from lifecycle policies. |
| avatar_path | VARCHAR(255) | NULLABLE | Path to custom uploaded avatar relative to storage/app/public/avatars/. Null means no custom upload â€” falls back to linked Google avatar, then Gravatar, then initials. |
| google_id | VARCHAR(255) | NULLABLE, UNIQUE | Google sub claim. Null means no Google account linked. Hidden from serialization. |
| google_avatar | VARCHAR(255) | NULLABLE | Google profile picture URL. Used as fallback in the avatar resolution chain when no custom avatar exists. |
| password_changed_at | TIMESTAMP | NULLABLE | Timestamp of last password change. Used by password expiry policy. Set to created_at on registration for existing users; updated on every password change or reset. |
| deletion_requested_at | TIMESTAMP | NULLABLE | When the user submitted a deletion request. Null means no pending deletion. |
| deletion_scheduled_for | TIMESTAMP | NULLABLE | Date the account is scheduled for permanent purge (deletion_requested_at + 30 days). |
| deletion_cancel_token | VARCHAR(64) | NULLABLE | Random token included in the cancellation email link. Cleared on cancellation or purge. |
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
| current_version | INT UNSIGNED | DEFAULT 1 | Increments each time the document is replaced. Used to label the active version. |
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
| category | ENUM('security','audit') | NOT NULL, DEFAULT 'audit', INDEXED | Event category. Auto-assigned by AuditService based on SECURITY_ACTIONS map. Included in HMAC hash payload â€” tampering detectable. |
| auditable_type | VARCHAR(255) | NULLABLE | Polymorphic target model class |
| auditable_id | BIGINT UNSIGNED | NULLABLE | Polymorphic target model ID |
| metadata | JSON | NULLABLE | Context: document_name, shared_with, expires_hours, location, two_factor status, watermarked (boolean â€” present on `document_downloaded` entries; `true` if a PDF watermark was successfully applied, `false` if watermarking failed and the original decrypted file was served instead) |
| ip_address | VARCHAR(45) | NOT NULL | Client IP address |
| user_agent | VARCHAR(500) | NULLABLE | Browser user agent string |
| hash | VARCHAR(64) | NOT NULL | HMAC-SHA256 hash for tamper detection |
| previous_hash | VARCHAR(64) | NULLABLE | Hash of previous log entry (chain integrity) |
| created_at | TIMESTAMP | NOT NULL | Event timestamp (immutable, no updated_at) |

**Note:** The `audit_logs` table is append-only. No UPDATE or DELETE operations are permitted at the application level. The `AuditLog` Eloquent model throws a `RuntimeException` if update or delete operations are attempted. The `category` column is included in the HMAC hash computation â€” any post-insert modification to a row's category will break the hash chain and be detectable. Action strings are always stored in lowercase with underscores.

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
| signed_url_accessed | security | External signed link was accessed |
| bot_detected | security | Automated bot attempt blocked on auth form |
| audit_integrity_check | security | Admin-triggered HMAC hash chain verification run |
| google_oauth_login | security | OAuth authentication event |
| google_oauth_login_failed | security | Failed OAuth authentication attempt |
| google_oauth_linked | security | User linked a Google account to their profile |
| google_oauth_unlinked | security | User unlinked their Google account |
| google_oauth_link_failed | security | Failed attempt to link a Google account |
| google_oauth_denied | security | User denied Google OAuth consent screen |
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
| document_version_uploaded | audit | Document replacement archived as a new version |
| document_version_restored | audit | Previous document version promoted to current |
| data_export_requested | audit | User requested a personal data export |
| user_role_changed | audit | Admin management action |
| access_blocked_ip | security | Request denied by IP allowlist/blocklist policy |
| ip_rule_added | security | Super Admin added an IP allowlist or blocklist rule |
| ip_rule_removed | security | Super Admin removed an IP allowlist or blocklist rule |
| password_expired_changed | security | Password changed due to expiry policy enforcement |
| recovery_code_used | security | User authenticated using a 2FA backup recovery code |
| recovery_code_failed | security | Invalid or already-used recovery code submitted |
| recovery_codes_regenerated | security | User regenerated their 2FA backup recovery codes |
| account_deletion_requested | security | User submitted a permanent account deletion request |
| account_deletion_cancelled | security | User cancelled a pending account deletion request |
| account_deletion_executed | security | Scheduled account purge executed by system (user_id = null) |

#### 5.2.5 sessions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(255) | PK | Session identifier |
| user_id | BIGINT UNSIGNED | FK (users.id), NULLABLE, INDEXED | Authenticated user |
| ip_address | VARCHAR(45) | NULLABLE | Client IP address |
| user_agent | TEXT | NULLABLE | Browser user agent |
| payload | LONGTEXT | NOT NULL | Serialized session data |
| last_activity | INT | NOT NULL, INDEXED | Unix timestamp of last activity |

#### 5.2.6 ip_rules

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Primary key |
| type | ENUM('allowlist','blocklist') | NOT NULL, INDEXED | Rule type. If any allowlist rule exists, all non-listed IPs are denied. Blocklist rules apply only when no allowlist rules are present. |
| cidr | VARCHAR(50) | NOT NULL | IPv4 or IPv6 CIDR notation (e.g. 203.0.113.0/24). Validated by ValidCidr rule. |
| label | VARCHAR(255) | NULLABLE | Optional human-readable note (e.g. "Office network") |
| created_by | BIGINT UNSIGNED | FK (users.id), CASCADE | Super Admin who created the rule |
| created_at | TIMESTAMP | NOT NULL | Rule creation timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last update timestamp |

Unique constraint on `(type, cidr)` â€” no duplicate rules of the same type and CIDR. Private/local IP ranges always bypass the blocklist regardless of rules.

#### 5.2.7 two_factor_recovery_codes

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Primary key |
| user_id | BIGINT UNSIGNED | FK (users.id), CASCADE | Owning user |
| code_hash | VARCHAR(255) | NOT NULL | Bcrypt hash of the plaintext recovery code. Plaintext is never stored. |
| used_at | TIMESTAMP | NULLABLE | Timestamp of consumption. Null = unused. Used codes cannot be reused. |
| created_at | TIMESTAMP | NOT NULL | Code generation timestamp |

Indexed on `user_id`. 8 codes generated per user when 2FA is enabled; all existing codes are deleted and replaced on regeneration or when 2FA is disabled.

#### 5.2.8 document_versions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Primary key |
| document_id | BIGINT UNSIGNED | FK (documents.id), CASCADE | Parent document |
| version_number | INT UNSIGNED | NOT NULL | Sequential version label (1 = first archived version) |
| original_name | VARCHAR(255) | NOT NULL | Filename at the time of archiving |
| encrypted_name | VARCHAR(255) | NOT NULL, UNIQUE | UUID storage filename in storage/app/vault/ |
| mime_type | VARCHAR(100) | NOT NULL | MIME type at time of archiving |
| file_size | BIGINT UNSIGNED | NOT NULL | File size in bytes |
| encryption_iv | VARCHAR(255) | NOT NULL | AES-256-CBC IV for this version |
| file_hash | VARCHAR(64) | NOT NULL | SHA-256 hash for integrity verification of this version |
| uploaded_by | BIGINT UNSIGNED | FK (users.id), RESTRICT | User who uploaded this version |
| created_at | TIMESTAMP | NOT NULL | Archiving timestamp |

Composite index on `(document_id, version_number)`. Encrypted files persist in storage until the parent document is permanently deleted, at which point cascade deletion removes version records and an observer/job cleans up the physical files.

#### 5.2.9 data_exports

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | Primary key |
| user_id | BIGINT UNSIGNED | FK (users.id), CASCADE | Requesting user |
| token | VARCHAR(64) | NOT NULL, UNIQUE | Random token used to generate the signed download URL |
| file_path | VARCHAR(255) | NULLABLE | Path within storage/app/exports/. Null until the job completes. |
| status | ENUM('pending','ready','downloaded','expired') | DEFAULT 'pending' | Export lifecycle state |
| expires_at | TIMESTAMP | NOT NULL | Download link expiry (24 hours after creation) |
| created_at | TIMESTAMP | NOT NULL | Request timestamp |
| updated_at | TIMESTAMP | NOT NULL | Last state update timestamp |

One active (pending/ready) export allowed per user per 24 hours. File is deleted from disk after download or when the scheduler marks it expired.

### 5.3 Database Security Measures

| Measure | Implementation | Threat Mitigated |
|---------|---------------|-----------------|
| Parameterized Queries | Eloquent ORM exclusively (zero raw SQL) | SQL Injection |
| Mass Assignment Protection | $fillable whitelist on all models (no $guarded) | Mass assignment attacks |
| Encrypted Columns | Laravel Crypt on two_factor_secret, description | Data exposure from DB breach |
| Password Hashing | Bcrypt with automatic cost factor | Password theft from DB dumps |
| `google_id` hidden from serialization | Added to `User::$hidden` | Prevents Google sub claim leakage through API/JSON output |
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

File integrity is verified using SHA-256 hashes. On upload, a hash of the original file is computed and stored. On download, the file is decrypted and the hash is recomputed and compared. A mismatch triggers an `integrity_violation` audit log entry and blocks the download with a generic user-facing error. The full exception message is never exposed to the user â€” it is logged privately via `Log::error()`.

The HMAC hash chain for audit logs includes the following payload fields: timestamp, user ID, action, **category**, metadata (JSON), and previous hash. Including the category field in the hash ensures that any tampering with a row's category classification is detectable during chain verification.

#### 6.1.4 Two-Factor Authentication Resilience

The `two_factor_secret` column stores the TOTP secret encrypted at rest. A `hasTwoFactorSecretValid()` helper method on the `User` model checks that the decrypted secret is non-empty and at least 16 base32 characters (the minimum required by Google2FA). This check is enforced in three locations:

- `TwoFactorController@verify` â€” if the secret is invalid, the 2FA flag is auto-reset, the user is redirected to login, and a `2fa_corrupt_reset` security audit entry is created
- `TwoFactorController@enable` â€” if the session secret is missing or too short, the user is redirected back to the QR code page
- `EnsureTwoFactor` middleware â€” if a user with `two_factor_enabled = true` has an invalid secret, they are force-logged out and redirected to login before reaching the challenge page

**2FA Backup Recovery Codes:** When 2FA is enabled, 8 one-time-use recovery codes are generated by `RecoveryCodeService` and displayed once (never stored in plaintext â€” only bcrypt hashes are persisted in `two_factor_recovery_codes`). On the 2FA challenge page a "Use a recovery code" path redirects to `/two-factor/recovery`. Consuming a valid code elevates the session identically to a successful TOTP verification and marks the code `used_at`. Users with 2 or fewer remaining codes see a warning on their Profile. Codes can be regenerated at any time, which invalidates all existing codes. `recovery_code_used`, `recovery_code_failed`, and `recovery_codes_regenerated` security audit events are logged.

#### 6.1.5 Access Control

The Spatie Laravel Permission package (v7) provides role-based access control with permission-based enforcement:

- Roles: Super Admin, Admin, User (assigned on registration)
- Permissions are assigned to roles and enforced per-route using Spatie's permission middleware
- Laravel Policies (`DocumentPolicy`) enforce resource-level authorization
- Admin routes use permission-based middleware rather than role-based checks
- Super Admins with `view_all_documents` permission can view any document's detail page with a read-only admin notice banner â€” delete, download for personal use, and share form are hidden
- Super Admin cannot deactivate or change the role of their own account â€” enforced in both UI (menu items hidden/disabled) and backend (guard in controller)

#### 6.1.6 Password Expiry Policy

A configurable password expiry policy enforced by the `EnsurePasswordNotExpired` middleware. The maximum password age is set via `PASSWORD_EXPIRY_DAYS` in `.env` (default: 90 days, 0 = disabled). The expiry clock uses `password_changed_at` on the `User` model; this is set to `created_at` on registration and updated on every voluntary or forced password change. When a user's password is expired the middleware redirects them to `/password/expired` before any other authenticated route. The expired password form reuses the same HIBP breach check as the regular password change flow. A 14-day advance warning banner is shown on the user Dashboard when expiry is approaching.

#### 6.1.7 Data Masking

Sensitive values are masked at the presentation layer to reduce accidental exposure in screenshots, shoulder surfing, and exported files:

- Shared With Me masks sharer email addresses for regular users
- Personal Activity masks the final segments of IP addresses for regular users
- Audit descriptions never inject raw IP addresses; location is shown instead when available
- Admin user CSV export masks email addresses by default
- Admin and Super Admin users retain access to unmasked values in dedicated admin contexts

#### 6.1.8 Backup Super Admin Account

A hidden recovery account exists for emergency administrator access. It is flagged with `is_system_account = true`, assigned the `super-admin` role, excluded from `/admin/users` and dashboard user counts, and protected from activation, deactivation, role changes, and deletion through the UI. Credentials are sourced from `BACKUP_SUPERADMIN_EMAIL` and `BACKUP_SUPERADMIN_PASSWORD` in `.env` and must be stored offline.

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
- Vault lock screen activates after 30 minutes of page inactivity â€” the session remains active but the entire UI is blurred and requires password re-entry to continue

#### 6.2.6 Input Validation

All incoming request data is validated using Laravel Form Requests. File names are replaced with cryptographically random UUIDs before storage. Uploaded files are validated for MIME type and size (10 MB maximum). Decryption errors return a generic message to the user; full exception details are logged privately.

#### 6.2.7 Accessibility Security

All icon-only buttons include aria-label attributes. Focus rings are visible on all interactive elements using CSS focus-visible. Modals trap focus using Radix UI's built-in focus management. The app respects the OS-level prefers-reduced-motion setting to disable animations for users with motion sensitivity.

#### 6.2.8 Bot Mitigation

Google reCAPTCHA v2 checkbox is applied to the Register and Forgot Password forms to detect and block automated bot submissions. Users must complete the visible "I'm not a robot" challenge before a token is issued. The backend verifies the token via Google's `siteverify` endpoint and rejects unsuccessful challenges, recording a `bot_detected` security audit entry. The `RECAPTCHA_SITE_KEY` is intentionally shared with the frontend because Google's site key is public by design; the `RECAPTCHA_SECRET_KEY` remains server-side only. If Google's script or API is unreachable, the integration fails open to avoid blocking legitimate users.

#### 6.2.9 IP Allowlist / Blocklist

The `CheckIpPolicy` middleware runs on every authenticated request and consults the `ip_rules` table via `IpPolicyService`. Two rule types are supported:

- **Allowlist:** If any allowlist rule exists, only requests from matching CIDRs are permitted. All other IPs receive 403.
- **Blocklist:** If no allowlist rules exist, requests from matching CIDRs in the blocklist are denied. All other IPs proceed normally.

CIDR matching is implemented using PHP's `inet_pton()`, supporting both IPv4 and IPv6. Private and local IP ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`, `::1/128`) always bypass the blocklist regardless of rules, preventing administrator self-lockout during local development. Rules are cached for 5 minutes in the application cache and the cache is invalidated immediately when a rule is added or removed. Every denied request produces an `access_blocked_ip` security audit entry. The `manage_ip_rules` permission is required to manage rules (Super Admin only).

#### 6.2.10 Environment File Security

The `.env` file stores sensitive application secrets including `APP_KEY`, database credentials, and third-party API keys. SecureVault protects this surface using multiple controls:

- `.env` and `.env.*` are ignored by Git; `.env.example` is committed as a safe template with placeholders only
- `public/.htaccess` blocks direct access to `.env`, backup, log, SQL, and swap files
- `AppServiceProvider` halts production boot if `APP_DEBUG=true` or `APP_KEY` is missing
- A boot-time critical log entry is written if a `.env` file is detected under `public/`
- Production deployments should restrict `.env` permissions to `600`
- `RECAPTCHA_SITE_KEY` and `GOOGLE_CLIENT_ID` are the only credentials intentionally exposed to the frontend/browser because they are public identifiers by design
- `RECAPTCHA_SECRET_KEY` and `GOOGLE_CLIENT_SECRET` remain server-side only and are never shared with Inertia or Vite

### 6.3 External Security Services

#### 6.3.1 Password Breach Detection (HaveIBeenPwned)

At registration and password change, the entered password is checked against the HIBP Pwned Passwords database using the k-Anonymity model. Only the first 5 characters of the SHA-1 hash are sent to the external API â€” the full hash and plaintext password never leave the server. If the password appears in a known breach, the action is blocked with the breach count displayed to the user. The check fails open if HIBP is unreachable.

#### 6.3.2 Malware Scanning (VirusTotal)

Every uploaded document is scanned via VirusTotal API using an asynchronous Laravel Queue job (`ScanDocumentWithVirusTotal`). The file is encrypted and saved to disk immediately with `scan_result = 'pending'`. The queue job submits the encrypted file for analysis and polls for results. If the file is flagged malicious or suspicious, the file is soft-deleted, and a `malware_detected` security audit log entry is created. Downloads are blocked while `scan_result = 'pending'` or `scan_result = 'malicious'`.

If VirusTotal is unreachable after all job retries are exhausted, the file is marked `scan_result = 'unavailable'` and a private log entry is created. The upload is not rolled back â€” fail-open behavior is preserved.

Queue driver is environment-aware: `deferred` locally (no worker process required), `database` in production (requires a dedicated queue worker).

#### 6.3.3 Geographic Enrichment (IPInfo)

Login-related audit log events (`login_success`, `login_failed`, `account_locked`) are enriched with geographic data (city, country) from IPInfo. This data is stored in the `metadata` JSON column and displayed in the activity feed as meaningful location context (e.g. "Signed in from Davao City, PH"). Results are cached per IP for 24 hours to stay within the free tier limit. Private/local IP ranges return "Local / DEV" without an API call.

#### 6.3.4 Google OAuth 2.0

Google OAuth is implemented via `laravel/socialite` as an additional sign-in method for existing SecureVault accounts. OAuth does not create accounts and does not replace the local credential lifecycle. Registration still flows through Gmail-only signup, HIBP breach checks, reCAPTCHA, signed email verification, and 2FA enrollment deadline assignment.

The OAuth callback enforces multiple checks before a session is established:

1. The Google account must return a verified Gmail address.
2. The SecureVault account must already exist locally.
3. Login lookup prefers `google_id` first, then falls back to email matching.
4. The Google email must match the SecureVault email exactly.
5. The local account must be active.
6. The Google account must have been linked previously from the Profile page.

If login succeeds, the app regenerates the session, updates the cached `google_avatar`, logs a `google_oauth_login` security event with IPInfo-enriched location metadata, and then continues through the normal middleware stack. Email verification, 2FA challenge, 2FA enrollment deadline enforcement, password expiry policy, IP allowlist/blocklist, vault lock, and account deletion local-password checks all remain active.

Linking is available only to authenticated users from Profile settings. The callback requires the Google email to match the logged-in user's SecureVault email exactly, and prevents `google_id` reuse across accounts. Unlinking requires the current local password, preventing an attacker with a stolen session from silently removing the OAuth association.

---

## 7. Functional Requirements

### 7.1 Authentication Module

| ID | Requirement | Description |
|----|------------|-------------|
| FR-01 | User Registration | Users register with name, Gmail address, and password. Email verification is enforced before dashboard access. User role assigned automatically. Password checked against HIBP breach database. reCAPTCHA v2 checkbox verified before account creation. |
| FR-02 | User Login | Email/password login. Rate limited to 5/min. Account lockout after 10 failures for 15 minutes. |
| FR-02a | Google OAuth Login | Existing users may sign in with a previously linked Google account. OAuth replaces the password step only; verified middleware, 2FA challenge, password expiry, and IP policy still apply. |
| FR-03 | Email Verification | Signed, time-limited verification link is sent on registration and must be clicked before protected routes such as the dashboard can be accessed. |
| FR-04 | Password Reset | Password reset via email. Reset tokens expire after 60 minutes. New password checked against HIBP. reCAPTCHA v2 checkbox verified before reset link is sent. |
| FR-05 | Two-Factor Auth | Optional TOTP-based 2FA. 6-digit code via InputOTP component â€” auto-submits on last digit entry. Typewriter animation on challenge page. If `two_factor_secret` is null or invalid at login, flag is auto-reset and a `2fa_corrupt_reset` security audit entry is created. |
| FR-06 | Account Lockout | 10 consecutive failures triggers 15-minute lockout. Audit logged with IP and location. |
| FR-07 | Logout | Invalidates session, regenerates session ID, audit logged. |
| FR-08 | Session Management | Users can view active sessions and revoke others remotely. Admin can terminate any session. |
| FR-09 | Vault Lock Screen | After 30 minutes of page inactivity, UI is blurred and locked. Password required to re-enter. Session remains active. Does not trigger on alt-tab or window focus change. |
| FR-09a | Password Expiry | If `password_changed_at` exceeds the configured expiry threshold, user is redirected to `/password/expired` on every route until they change their password. Expiry check performed by `EnsurePasswordNotExpired` middleware. New password must pass HIBP breach check. |
| FR-09b | 2FA Recovery Codes | On 2FA enable, 8 one-time recovery codes are generated and shown once. On the 2FA challenge page, users can choose "Use a recovery code" to authenticate via `/two-factor/recovery`. Each code is consumed on use. Users can regenerate codes from Profile. |
| FR-09c | 2FA Enrollment Deadline | New registrations receive a `two_factor_deadline` of 3 days. Legacy accounts receive a deadline on first authenticated request after rollout. After the deadline, `EnsureTwoFactorEnrolled` redirects users to setup until 2FA is enabled. |

### 7.2 Document Management Module

| ID | Requirement | Description |
|----|------------|-------------|
| FR-10 | Upload Document | Upload files (PDF, DOCX, XLSX, PNG, JPG) up to 10 MB. File saved with `scan_result = 'pending'` immediately. `ScanDocumentWithVirusTotal` queue job dispatched asynchronously for VirusTotal analysis. AES-256-CBC encryption applied on upload. |
| FR-11 | View Document List | Paginated, searchable list with file type icons, size, upload date, scan badge (separate from integrity badge), and star indicator. Starred documents pinned to top. |
| FR-12 | Download Document | Blocked if `scan_result = 'pending'` or `malicious`. Decrypted on-the-fly for clean/unavailable files. Integrity verified via SHA-256 hash comparison. For PDFs, a diagonal watermark bearing the downloader's name, email, timestamp, and document name is applied in-memory before serving; original encrypted file is never modified. Generic error shown on failure; exception logged privately. |
| FR-13 | Delete Document | Soft delete to trash. When deleted from My Vault, a Sonner toast with an Undo action is shown for 5 seconds â€” clicking Undo immediately restores the document without navigating to Trash. Permanently deleted after 30 days via scheduler. |
| FR-14 | Restore Document | Restore from trash within the 30-day window. Both Restore and Delete Permanently actions require AlertDialog confirmation before executing. |
| FR-15 | Document Details | Metadata view with integrity hash copy-to-clipboard, scan status badge, sharing controls with Calendar date picker, access control list, and audit trail with meaningful descriptions. |
| FR-16 | Star Document | Toggle star/favorite on a document. Starred documents ordered first in My Vault. |
| FR-17 | Bulk Download | Select multiple documents and download as a ZIP file. Each file decrypted and integrity-verified before zipping. Maximum 20 documents per bulk operation. |
| FR-18 | Bulk Delete | Select multiple documents and move to trash. Maximum 50 documents per bulk operation. |
| FR-19 | Drag-and-Drop | Drag a file anywhere on My Vault to trigger a full-page overlay and redirect to the upload page. |
| FR-20 | First Upload Confetti | One-time confetti animation when a user uploads their very first document. Not triggered on subsequent uploads. |
| FR-20a | Document Replace | Owners and `full_access` recipients can replace a document with a new file. The current file is automatically archived as a version before the new file is stored. The new file is scanned by VirusTotal asynchronously. |
| FR-20b | Version History | Document Detail page shows all previous versions with metadata (version number, name, size, uploader, date). Owners can restore any prior version via AlertDialog confirmation. Restoring archives the current file first. |

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
| FR-27 | Meaningful Descriptions | Activity feed displays context-aware descriptions generated by `AuditDescriptionService` using a match() statement over **all** known action strings. Examples: "Uploaded 'filename.pdf'", "Signed in from Davao City, PH", "Invalid 2FA code submitted", "Bot verification failed on register form", "Downloaded 3 document(s) as ZIP", "Accessed share link for 'filename.pdf'", "Sign-in blocked â€” account is inactive", "Changed role of John Doe to Admin". Descriptions never expose raw action slugs or IP addresses. |
| FR-28 | Personal Activity | Users view their own activity log with tab-based category filtering (All Activity / Security Events / General Activity), action type Select filter, and Calendar date range pickers. |
| FR-29 | Admin Audit Log | Admins view system-wide logs with the same category tabs, user column (avatar, name, email), and advanced filtering including user search. |
| FR-30 | Tamper Detection | HMAC-SHA256 hash chain links consecutive entries for integrity verification. Category value is included in the hash payload. |
| FR-31 | Export CSV | Download audit log as CSV file, respecting active category filter. |
| FR-32 | Export PDF | Download formatted PDF audit report with Noir Amber header styling generated by DomPDF, respecting active category filter. PDF header notes which category is being exported. |
| FR-33 | Audit Integrity Verification | Admin-only page at `/admin/audit-integrity` backed by `AuditIntegrityService`. Supports two verification modes: full-chain (all records) and recent-500. Reports total checked, pass count, fail count, and capped failure details per run. Shows last verified banner sourced from the most recent `audit_integrity_check` entry, verification history for the last 10 runs, animated progress state during verification, a downloadable PDF integrity report, and an HMAC info card explaining the chain mechanism. Each verification run records an `audit_integrity_check` security audit entry. Permission: `view_audit_logs`. |

### 7.5 Administration Module

| ID | Requirement | Description |
|----|------------|-------------|
| FR-33 | Admin Dashboard | Security metrics: users, sessions, failed logins (24h), documents, storage, pending verifications. Time-based greeting ("Good morning/afternoon/evening" + emoji) using user's first name. All 6 stat cards are clickable links to their respective admin pages. Recent activity defaults to security events only. |
| FR-34 | User Management | Super Admin can activate/deactivate users and assign roles. Deactivation terminates all active sessions for that user. Self-protection: cannot deactivate or change own role â€” enforced in both UI (actions hidden) and backend (controller guard). |
| FR-35 | All Documents | Super Admin can view all documents system-wide (read-only with admin notice banner). Permission: view_all_documents. |
| FR-36 | Session Monitoring | Admins can view all active sessions and force-terminate individual or all sessions. Permission: manage_sessions. |
| FR-37 | Export Users CSV | Export user list as CSV with name, email, role, status, last login. |
| FR-37a | IP Rule Management | Super Admin can add and remove CIDR-based allowlist or blocklist rules on `/admin/ip-rules`. The page shows the admin's current IP, validates CIDR input in real time with range preview, warns on self-lockout risk for blocklist rules, and requires confirmation before saving. Rules cached 5 min. Each add/remove logged as a security audit event. Permission: `manage_ip_rules`. |

### 7.6 Search Module

| ID | Requirement | Description |
|----|------------|-------------|
| FR-38 | Global Search | Search bar in authenticated layout header. Searches documents, audit logs, and users simultaneously. |
| FR-39 | Keyboard Shortcut | Command+K / Ctrl+K opens the global search Command popover from anywhere in the authenticated app. |
| FR-40 | Grouped Results | Results returned in groups: Documents (max 5), Activity Logs (max 3), Users (max 3, admin only). |
| FR-41 | Debounced Search | Search fires 300ms after last keystroke. Minimum 2 characters required. Results cleared on input clear. |

### 7.7 Privacy Module

| ID | Requirement | Description |
|----|------------|-------------|
| FR-42 | Personal Data Export | Users can request a ZIP export of their profile data, document metadata, and audit log from the Profile page. The job runs asynchronously and delivers a signed 24-hour download link by email. One request per 24 hours. File is deleted from disk after download. |
| FR-43 | Account Deletion Request | Users can request permanent account deletion from the Profile "Danger Zone" card, confirmed with password and, if 2FA is enabled, either a valid TOTP code or a backup recovery code. Account is deactivated immediately; all sessions terminated. A cancellation link is emailed, valid for 30 days. After 30 days a scheduler permanently deletes the account, all documents, and all files. Audit log entries are anonymised (user_id = null) to preserve hash chain integrity. Super Admin accounts cannot self-delete. |

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
| Typography | Geist Sans by Vercel â€” modern geometric sans-serif with tight negative letter-spacing on headings (-0.02em). Served from npm package, no CDN dependency. |
| Layout | Sidebar navigation (collapsible), max content width responsive, two-column layouts on detail pages |
| Iconography | Lucide React icon set |
| Theme | Noir Amber â€” custom dual light/dark theme |
| Border Radius | 0.375rem base (New York default) â€” sharper than Default/Vega style |
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
| UserAvatar | Avatar with three-tier resolution: (1) custom uploaded avatar via `user.avatar_url`, (2) Gravatar image from MD5 of email with `?d=404`, (3) deterministic initials fallback. 6 theme-compatible colors: amber, blue, emerald, violet, orange, teal â€” no pink/magenta. |
| GlobalSearch | Command-based search popover with grouped results, debounce, and Command+K shortcut. All visible text is role-aware: empty-state subtitle, dialog description, search button text, input placeholder, and input aria-label adapt based on whether the user has admin permissions â€” regular Users never see copy referencing user/email search. |
| VaultLock | 30-minute idle timeout lock overlay with password re-entry, blur backdrop |
| PasswordStrengthBar | Real-time 5-criteria strength bar using Progress component |
| ThemeToggle | Sun/Moon icon button for light/dark switching |
| ThemeProvider | Context provider with localStorage persistence and system preference detection |
| TimeBasedGreeting | Displays "Good morning/afternoon/evening, [FirstName]! [emoji]" based on current local hour. Used on both user Dashboard (/dashboard) and Admin Dashboard (/admin). |
| LoginChart | Recharts BarChart wrapped in shadcn `ChartContainer` showing successful login counts grouped by day for the past 7 days. Bars use the primary amber color. Zero-login days are included as empty bars. Used on the Admin Dashboard only. |
| EventsChart | Stacked Recharts BarChart showing security events (destructive) and general activity (primary amber) per hour for the current day. All 24 hourly slots are present, including zero-count hours. Used on the Admin Audit Logs page only. |
| RelativeTime | Displays an absolute timestamp as visible text with a Tooltip showing relative time (e.g. "2 hours ago") on hover. Uses date-fns `formatDistanceToNow`. Used on the Activity and Admin Audit Logs pages. |
| AuditCategoryTabs | Shared tab switcher component for All Activity / Security Events / General Activity. Used on personal Activity page and Admin Audit Logs page. Security Events tab shows a destructive-colored count badge. |
| ScanBadge | Displays VirusTotal scan_result with correct color per status (pending=blue+spinner, clean=green, unscanned/unavailable=amber, malicious=destructive). Each status includes a Tooltip with a plain-language explanation of what the badge means. |
| FileTypeBadge | Displays MIME-type-derived file type label with Noir Amber palette colors (PDF=amber, DOCX=blue, XLSX=emerald, IMAGE/JPG/PNG=teal). No purple or pink values. |
| PermissionBadge | Displays share permission level (view_only=blue, download=amber, full_access=emerald) using bg-color/15 pattern. |
| RoleBadge | Displays user role (Super Admin=amber, Admin=blue, User=muted) using bg-color/15 pattern. Labels in title case. |
| SortableHeader | Column header sort button. Accepts optional `routeName` prop (defaults to `documents.index`) so it can be reused on admin pages pointing at different routes. Shows ChevronUp/Down for the active column and ChevronsUpDown for inactive columns. Starred documents always remain pinned above sort order on My Vault. |

#### Utility Modules

| Module | Description |
|--------|-------------|
| `lib/auditActionBadge.ts` | Single source of truth for audit action badge labels and colors. Used by Activity page, Admin Dashboard, and Admin Audit Logs â€” never duplicated per page. |
| `lib/fileTypeBadge.ts` | MIME-type-to-badge config map. Used by FileTypeBadge component. |
| `lib/cidrContains.ts` | Client-side CIDR utilities: `cidrContainsIp(cidr, ip)` checks whether an IPv4 address falls within a CIDR range; `parseCidr(cidr)` returns first/last address, host count, and a validity flag with error message. Used on the IP Rules page for real-time validation, range preview, and self-lockout detection. |
| `lib/maskData.ts` | Presentation-layer masking helpers for email and IP values in user-facing views. |
| `lib/parseUserAgent.ts` | Wraps `ua-parser-js` to return a structured `DeviceInfo` object (browser, OS, human-readable label, `isMobile`). Used on the personal Sessions page and Admin Sessions page. |
| `lib/trashExpiryBadge.ts` | Computes expiry badge color tier from deleted_at timestamp. Three tiers: muted (>7 days), amber (â‰¤7 days), destructive (â‰¤3 days). |
| `lib/recaptcha.ts` | Stores, resets, and fails-open the current reCAPTCHA v2 token used by Register and Forgot Password forms. |
| RecaptchaWidget | Visible Google reCAPTCHA v2 checkbox widget used on Register and Forgot Password forms. |

### 9.4 Page Map

| Page | Route | Access | Description |
|------|-------|--------|-------------|
| Login | /login | Guest | Noir Amber card, email + password with icons, show/hide toggle, rate limit alerts, contextual flash messages for `deletion-scheduled` (account deactivated, deletion pending) and `deletion-cancelled` (account reactivated) states. When `VITE_DEMO_MODE=true` in `.env`, a "Demo Accounts" section is shown below the login button with one-click quick-login buttons for Super Admin, Admin, and User roles (for presentation purposes only â€” must be removed before production) |
| Register | /register | Guest | Single-column fields, strength bar, amber top border h-1.5, "Create My Account", visible reCAPTCHA v2 checkbox submitted with form |
| 2FA Setup | /two-factor/setup | Auth | QR setup page with manual key, verification input, and deadline warning banner when 2FA enrollment grace period is active or expired |
| 2FA Challenge | /two-factor/challenge | Auth (2FA pending) | InputOTP 6-digit boxes, auto-submit, typewriter animation on subtitle |
| Forgot Password | /forgot-password | Guest | Lock+refresh icon mark, amber top border, success alert, visible reCAPTCHA v2 checkbox submitted with form |
| Reset Password | /reset-password | Guest | New password with strength bar, show/hide toggle |
| Verify Email | /verify-email | Auth (unverified) | Resend link with status alert, logout ghost button |
| Dashboard | /dashboard | Auth (verified) | Time-based greeting with emoji, stat cards, Vault Storage section, Recent Documents table, Recent Activity feed, Vault Status card, amber Alert banner when password expires within 14 days |
| My Vault | /documents | Auth | Searchable table with file type badges (FileTypeBadge), scan badges (ScanBadge including pending state), stars, bulk select toolbar (appears when selection > 0, with Download ZIP and Move to Trash), drag-drop overlay |
| Upload | /documents/create | Auth | Drag-drop zone, VirusTotal scanning notice, Progress upload bar, encryption banner |
| Document Detail | /documents/{id} | Auth (owner/shared) | Metadata cards, hash copy, scan badge (ScanBadge), permission badges (PermissionBadge) in access list, share form with Calendar picker, signed URL generator, audit trail with meaningful descriptions, Version History section (inline card below metadata; previous versions table with restore via AlertDialog; Replace File button for owners/full_access) |
| Shared with Me | /shared | Auth | Card grid with permission badges (PermissionBadge), expiry urgency badges, filter Popover with Checkboxes (permission + expiry filters). No Filter button in page header â€” filter controls live in content area only. |
| Trash | /trash | Auth | Notice banner (amber Alert), soft-deleted documents with expiry urgency badges (trashExpiryBadge), name search input, restore/purge each requiring AlertDialog confirmation. Empty state shown when trash contains no items. No page header subtitle. |
| Activity | /activity | Auth | AuditCategoryTabs (All Activity / Security Events / General Activity), Action Type Select filter, Calendar date range pickers, meaningful descriptions (AuditDescriptionService), CSV/PDF export respecting active category |
| Profile | /profile | Auth | Profile form, password update with strength bar, 2FA Card (includes recovery code count + Regenerate Codes button when 2FA enabled), sessions preview card (current session with link to full Sessions page), avatar upload card, "Your Data" card (Request Data Export button), "Danger Zone" card (Delete My Account with AlertDialog requiring password + TOTP code or recovery code if 2FA is enabled) |
| Sessions | /sessions | Auth | Active sessions, current session highlighted with amber left border, revoke with AlertDialog |
| Admin Dashboard | /admin | permission:view_admin_dashboard | Time-based greeting (TimeBasedGreeting), 6 linked stat cards (all clickable), Pending Verifications count turns amber when above zero, 7-day successful logins bar chart below stat cards, recent activity table defaults to security events with HH:MM:SS timestamps, Avatar + Badge per row. No static subtitle. |
| Admin Users | /admin/users | permission:manage_users | User table with Avatar, RoleBadge (title case, bg-color/15 pattern), status Badge, 2FA status icon (`ShieldCheck` / `ShieldOff` with tooltip), email verification icon (`MailCheck` / `MailX` with tooltip), "Pending Deletion" destructive badge on rows with scheduled deletion. Columns sortable by Name and Last Active via `SortableHeader`. Inactive rows render at reduced opacity. Visible Activate/Deactivate icon button per row (hidden for own account); action still requires AlertDialog confirmation. No page header subtitle. |
| All Documents | /admin/documents | permission:view_all_documents | Read-only system-wide document table with owner Avatar, FileTypeBadge, ScanBadge, Encrypted badge (tooltip: "AES-256-CBC with unique IV per file"), integrity hash-status badge with SHA-256 tooltip context, and amber admin notice Alert banner. Columns sortable by Owner, Size, and Uploaded via `SortableHeader`. Owner filter is a Select dropdown populated with all users. No delete, download, or share controls visible. |
| Admin Audit Logs | /admin/audit-logs | permission:view_audit_logs | AuditCategoryTabs (same as personal Activity), system-wide logs with user Avatar column (clickable - sets user filter), grouped action type Select covering the full audit action catalog, user Select dropdown, Calendar filters, meaningful descriptions, brute-force cluster alert banner, events-per-hour stacked bar chart, and CSV/PDF export with scope-aware labels |
| Audit Integrity | /admin/audit-integrity | permission:view_audit_logs | Admin-only HMAC hash chain verification page (AuditIntegrity.tsx). Shows last verified timestamp and result banner sourced from the most recent `audit_integrity_check` log entry. Two verification modes: full-chain and recent-500, with animated progress bar and disabled buttons during verification plus Sonner toast on completion. Verification history table shows last 10 runs with mode, counts, and pass/fail badge. "Download integrity report" exports a DomPDF PDF with verification summary and failure details. HMAC info card explains hash-per-entry, chaining, and tamper detection. Each run records an `audit_integrity_check` security audit entry. |
| Admin Sessions | /admin/sessions | permission:manage_sessions | All active sessions with user Avatar, device/browser info (`ua-parser-js`), IP address with IPInfo location, last active text with stale-session highlighting after 24 hours, user Select filter, manual Refresh button with last-refreshed timestamp, Terminate with AlertDialog copy naming the affected user, Terminate All with AlertDialog copy naming the affected session count, and an idle empty state when no other sessions are active. |
| IP Rules | /admin/ip-rules | permission:manage_ip_rules | Two-section page: Add Rule form (type Select, CIDR Input with real-time validation and range preview, Label Input, self-lockout warning when current IP falls in CIDR, AlertDialog confirmation before saving, info Alert) + Current Rules table (type badge, CIDR, label, added by, date, delete with AlertDialog). Rule count summary (allowlist/blocklist counts) shown in section header. Admin's current IP shown in a reference banner at the top of the page. Empty state shown when no rules configured. |
| Password Expired | /password/expired | Auth (verified, expired password) | Forced password change screen. Same visual style as Reset Password. Current password + new password (with PasswordStrengthBar) + confirm. No back link â€” user must change password to proceed. |
| 2FA Recovery | /two-factor/recovery | Auth (2FA pending) | Recovery code input page. Same Noir Amber card as 2FA Challenge. Standard Input (not InputOTP). "Back to authenticator code" link. |

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
| manage_ip_rules | Yes | No | No |

### 10.2 Role Descriptions

**Super Admin:** Full system administrator. Can manage users (activate/deactivate, change roles), view all documents system-wide for audit purposes (read-only with admin notice banner), manage IP allowlist/blocklist rules, access all admin dashboard features, and perform all operations available to lower roles. Cannot deactivate or change their own role. Cannot submit an account deletion request for their own account. A hidden Backup Super Admin (`is_system_account = true`) exists for emergency recovery access and is invisible in User Management and dashboard user counts.

**Admin:** Security monitor role. Can view the admin dashboard with security metrics, access system-wide audit logs for security analysis, and monitor/terminate active sessions. Cannot manage users or view other users' documents.

**User:** Default role assigned on registration. Can upload, manage, and share personal documents. Can view personal activity logs with category filtering and manage personal sessions. No access to any admin features.

### 10.3 Enforcement

- Backend: Per-route permission middleware using Spatie's `permission:xxx` syntax
- Frontend: Sidebar navigation conditionally renders items based on `auth.permissions` shared via Inertia `HandleInertiaRequests` middleware
- Policies: `DocumentPolicy` enforces resource-level access; extended to allow Super Admins with `view_all_documents` to access any document detail in read-only mode (`userPermission = 'admin_viewer'`)
- Self-protection: Super Admin cannot deactivate or change their own role â€” enforced both in UI (menu items hidden for own row) and backend (guard in controller returning 403)
- Direct URL access to unauthorized routes returns 403 Forbidden

---

## 11. Engineering Principles

### 11.1 Security Principles

**Least Privilege:** Every user, process, and component is granted only the minimum permissions necessary. Users start with the basic User role. Admin capabilities require explicit permission assignment. Route middleware enforces permissions, not roles.

**Defense in Depth:** Security controls are layered. Authentication, authorization, encryption, input validation, malware scanning, breach detection, bot mitigation, and audit logging each operate independently. A failure in one layer does not compromise the system.

**Fail Secure:** When an error occurs, the system defaults to denying access. Failed encryption prevents file serving. Failed policy checks deny access. Failed integrity verification blocks downloads and shows a generic error. External API failures (VirusTotal, HIBP, IPInfo, reCAPTCHA) fail open to avoid blocking legitimate users, but are logged privately. Invalid 2FA state is self-healed rather than causing a 500 error.

**Audit Everything:** Every security-relevant action produces an immutable audit trail with meaningful metadata, correct category assignment, and human-readable descriptions. The HMAC hash chain ensures tampering with any entry â€” including its category â€” is detectable.

**Separation of Duties:** Encryption keys are managed at the environment level. Database credentials differ between contexts. Audit logs cannot be modified by users who generate them. Super Admins cannot act on their own accounts.

**Privacy by Design:** The HaveIBeenPwned integration uses k-Anonymity â€” only 5 characters of a SHA-1 hash are sent externally. Full passwords and hashes never leave the server. Gravatar URLs use MD5 hashes of emails, never the email addresses themselves. reCAPTCHA secret keys are server-side only.

**Security Event Separation:** Authentication events, threat detections, and security configuration changes are classified as `security` category in audit logs. Routine document and account actions are classified as `audit` category. This separation allows security monitoring dashboards to surface threats without noise from general activity â€” a principle borrowed from real-world SIEM systems.

### 11.2 Development Principles

**No Raw SQL:** The entire codebase uses Eloquent ORM. This is a hard constraint with zero exceptions.

**Input Never Trusted:** Every request passes through Form Request validation. File names are replaced with UUIDs. User data is escaped in all outputs. Decryption errors are sanitized before reaching the user.

**Permission over Role Checks:** Authorization checks use permissions (`can:manage_users`) rather than role names (`role:super-admin`). This ensures proper separation even if roles are restructured.

**Configuration over Hardcoding:** Security values (keys, timeouts, limits, API tokens) are managed through environment variables and config files. No API keys in source code.

**External API Resilience:** All external APIs (HIBP, IPInfo, VirusTotal, Gravatar, reCAPTCHA) are wrapped in try-catch blocks and fail open. A service being unavailable must never block a user's core workflow.

**Component Consistency:** All interactive UI elements use shadcn/ui New York style primitives. Custom components extend shadcn primitives rather than replacing them. No inline HTML form elements â€” all forms use shadcn Input, Select, Textarea, Button. All badge/pill elements use the `bg-color/15` semi-transparent pattern â€” never solid fills on read-only indicators.

**Shared Utilities:** Badge color logic, audit action labels, file type configs, expiry calculations, CIDR parsing/containment checks, and reCAPTCHA token retrieval live in shared utility modules (`lib/auditActionBadge.ts`, `lib/fileTypeBadge.ts`, `lib/cidrContains.ts`, `lib/trashExpiryBadge.ts`, `lib/recaptcha.ts`) and shared components (`ScanBadge`, `FileTypeBadge`, `PermissionBadge`, `RoleBadge`, `AuditCategoryTabs`). These are never duplicated per page.

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
| 12 | External API keys must be stored in .env only | Never hardcoded in source code or committed to version control. Note: `RECAPTCHA_SITE_KEY` is a public key by Google's design and is intentionally shared with the frontend via Inertia shared props â€” only `RECAPTCHA_SECRET_KEY` is server-side only and subject to this constraint. |
| 13 | VirusTotal scan must be dispatched before a file is made downloadable | The scan job is dispatched immediately after upload. Downloads are blocked while `scan_result = 'pending'`, ensuring no unscanned file is ever served. |
| 14 | HIBP check must use k-Anonymity model | Full password hash must never be transmitted to external service |
| 15 | Vault lock screen must not trigger on tab/window switching | Only genuine inactivity (30 minutes) should trigger the lock |
| 16 | Decryption errors must never expose exception messages to users | Internal errors logged privately; generic message shown to user |
| 17 | Audit action strings must be lowercase with underscores | Consistency with `auditActionBadge.ts` key mapping; prevents badge fallthrough to unknown-action default |
| 18 | Badge/pill elements must use bg-color/15 semi-transparent pattern | Solid primary fill is reserved for interactive buttons only; prevents false affordance on read-only indicators |
| 19 | Avatar images stored in `storage/app/public/avatars/` are a deliberate exception to Hard Constraint #7 | Avatars are non-sensitive, require public URL access by design, and are never encrypted. Sensitive encrypted documents remain exclusively in `storage/app/vault/` (outside public). |
| 20 | Private and local IP ranges must always bypass the IP blocklist | Blocking `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`, or `::1/128` via the admin UI must have no effect. Prevents administrator self-lockout during local development. |
| 21 | Recovery codes must never be stored in plaintext | Generated in memory, returned once to the user via Inertia response, and persisted only as bcrypt hashes. Not stored in session, logs, or any persistent column. |
| 22 | PDF watermarking must be applied exclusively in memory | The watermarked file must never be written to disk. The stored encrypted file is always the original unmodified document. If watermarking fails, the service fails open and serves the original decrypted file. |
| 23 | Data export ZIP files must never include encrypted document payloads | Exports contain document metadata only (filename, size, MIME type, upload date, scan result). Including encrypted payloads would create a bulk exfiltration vector. |
| 24 | Archived document version files must not be deleted on replacement | Physical encrypted files in `storage/app/vault/` for prior versions must persist until the parent document is permanently purged. Only cascade deletion on permanent document purge may remove version files. |
| 25 | The `EnsurePasswordNotExpired` middleware must not expose expiry date in the redirect | Expiry date is surfaced only as a proactive dashboard warning. The redirect response itself reveals nothing about when the password expired. |
| 26 | Super Admin accounts cannot be self-deleted via the Account Deletion Request flow | A Super Admin must first be demoted by another Super Admin before the deletion flow is available. Enforced in both UI (button hidden) and backend (403 guard). |
| 27 | Audit log entries must not be hard-deleted when a user account is purged | The `user_id` FK is set to NULL (already nullable) and an `account_deletion_executed` system event is recorded. No audit rows are removed. Hash chain integrity is preserved. |
| 31 | `GOOGLE_CLIENT_SECRET` must be stored in `.env` only and never committed to version control | OAuth client secret grants token exchange capability |
| 32 | Google OAuth cannot create new SecureVault accounts â€” registration must always go through the standard flow | Preserves HIBP, reCAPTCHA, email verification, and 2FA enrollment at account intake |

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
| Audit integrity â€” full chain pass | Run full-chain verification on unmodified logs | All entries pass; pass count equals total; audit_integrity_check security entry created |
| Audit integrity â€” tamper detected | Modify a log row directly in DB, run verification | Fail count > 0; failure details reported; audit_integrity_check security entry created |
| Audit integrity â€” recent-500 mode | Run recent-500 verification | Only last 500 entries checked; correct counts reported |
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
| reCAPTCHA bot submission | Submit register form with failed checkbox token | Rejected; bot_detected audit entry created |
| reCAPTCHA unavailable | Submit form when Google is unreachable | Fails open; form proceeds; private error logged |
| Production exception handling | Trigger a server error with APP_ENV=production and APP_DEBUG=false | Generic error page returned; details logged privately; no stack trace exposed |
| 2FA enrollment deadline | Authenticate with overdue non-2FA account | Redirected to `/two-factor/setup` until 2FA is enabled |
| Hidden backup super admin | Open /admin/users and dashboard counts | System recovery account is not listed and not counted |
| Signed URL expiry | Access signed share link after expiration | 403 Forbidden; link rejected |
| Vault lock â€” genuine idle | Leave browser idle for 30 minutes | Lock overlay appears |
| Vault lock â€” alt-tab | Alt-tab away and return immediately | Lock does NOT trigger |
| Vault lock â€” wrong password | Enter incorrect password at lock screen | Error shown; overlay stays |
| Bulk download scope | Attempt to bulk-download another user's document IDs | Scoped to user_id; foreign documents excluded |
| Empty Trash scope | Trigger Empty Trash | Only deletes documents owned by auth()->user(); cross-user deletion impossible |
| IP blocklist â€” blocked IP | Request from a CIDR-matched blocked IP | 403 Forbidden; `access_blocked_ip` security event logged |
| IP blocklist â€” local IP | Add blocklist rule covering 127.0.0.1; make request | Request allowed through; private IP bypass enforced |
| IP allowlist â€” unlisted IP | Add allowlist rule; request from non-listed IP | 403 Forbidden |
| IP allowlist â€” listed IP | Request from CIDR-matched allowlist IP | Request allowed through |
| Invalid CIDR input | Submit `999.0.0.0/24` as a new IP rule | ValidCidr rule rejects; no rule saved |
| `CheckIpPolicy` exception | Force IpPolicyService to throw | Fails open; request proceeds; `Log::error` written |
| Password expiry â€” redirect | Set `password_changed_at` to 91 days ago | Every route redirects to `/password/expired` |
| Password expiry â€” bypass attempt | Direct URL to `/dashboard` with expired password | Middleware intercepts; redirected to `/password/expired` |
| Password expiry â€” update | Submit correct current password + new password | `password_changed_at` updated; redirect to dashboard |
| Recovery code â€” valid | Enter a valid unused recovery code at challenge | Session elevated; code marked `used_at`; `recovery_code_used` logged |
| Recovery code â€” reuse | Enter the same code a second time | Rejected; `recovery_code_failed` logged |
| Recovery code â€” invalid | Enter a non-existent code | Rejected; `recovery_code_failed` logged |
| Recovery codes â€” plaintext storage | Inspect `two_factor_recovery_codes` table | Only bcrypt hashes present; no plaintext values |
| Watermark â€” PDF download | Download a PDF as an authenticated user | Watermark with correct name, email, timestamp on every page |
| Watermark â€” non-PDF | Download a DOCX or PNG | No watermark applied; file served normally |
| Watermark â€” stored file unchanged | Download a PDF multiple times; inspect disk | Encrypted file on disk is identical after every download |
| Account deletion â€” Super Admin | Attempt deletion as Super Admin | 403 Forbidden; backend guard enforces |
| Account deletion â€” wrong password | Submit deletion form with wrong password | Validation error; deletion not scheduled |
| Account deletion â€” cancel link | Use cancel token within 30 days | Account reactivated; `account_deletion_cancelled` logged |
| Account purge â€” audit log integrity | Run purge; inspect `audit_logs` | Rows have `user_id = null`; no rows deleted; hash chain intact |
| Data export â€” ZIP contents | Request export and download ZIP | Contains `profile.json`, `documents.json`, `activity.json`; no encrypted file payloads |
| Data export â€” signed link expiry | Access download link after 24 hours | 404 / 403; link expired |

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
| Export audit log PDF â€” security only | Formatted PDF downloads; header notes "Security Events" |
| Export audit log PDF â€” all | Formatted PDF downloads; header notes "All Events" |
| Register reCAPTCHA checkbox | Visible "I'm not a robot" checkbox widget renders and must be completed before submission |
| Forgot Password reCAPTCHA checkbox | Visible "I'm not a robot" checkbox widget renders and must be completed before submission |
| Shared With Me masking | Sharer email is partially masked for regular users |
| Personal Activity IP masking | IP addresses show masked final segments for regular users |
| 2FA grace warning | Dashboard warning banner shows the countdown to 2FA enforcement |
| Export audit log CSV | CSV downloads with correct columns including category |
| Time-based greeting (morning) | "Good morning" + sun emoji shown (before 12:00) |
| Time-based greeting (afternoon) | "Good afternoon" + emoji shown (12:00â€“17:00) |
| Time-based greeting (evening) | "Good evening" + moon emoji shown (after 17:00) |
| Activity category tab â€” security | Only security-category events shown |
| Activity category tab â€” general | Only audit-category events shown |
| Activity category tab â€” all | All events shown regardless of category |
| Admin Dashboard activity feed | Defaults to showing security events only |
| Admin Dashboard stat cards | All 6 cards are clickable and navigate to correct admin pages |
| Failed logins â€” count = 0 | Stat card value renders in muted gray |
| Failed logins â€” count = 5 | Stat card value turns amber |
| Failed logins â€” count = 20 | Stat card value turns destructive red |
| Pending Verifications â€” count > 0 | Have at least 1 unverified user | Card value renders in amber |
| Pending Verifications â€” count = 0 | All users verified | Card value renders in muted gray |
| Vault storage â€” below 75% | Progress bar renders in primary amber; correct byte label shown |
| Vault storage â€” 75â€“89% | Progress bar turns amber |
| Vault storage â€” 90%+ | Progress bar turns destructive red |
| Dashboard timestamp â€” seconds | View Recent Activity on Admin Dashboard | Timestamps show HH:MM:SS matching Activity page format |
| Breadcrumb â€” no static subtitle | Load Admin Dashboard | No "Admin Dashboard" static subtitle shown below title; greeting shown instead |
| Login chart â€” renders | Load Admin Dashboard | Bar chart visible with 7 day columns |
| Login chart â€” zero days | No logins on a specific day | Bar for that day renders at zero height, not missing |
| Login chart â€” tooltip | Hover over a bar | Tooltip shows date and login count |
| Login chart â€” today | View chart on current day | Rightmost bar reflects today's `login_success` count |
| Activity description â€” login | "Signed in from Davao City, PH" (with IPInfo data) |
| Activity description â€” upload | "Uploaded 'filename.pdf'" |
| Activity description â€” star | "Starred 'filename.pdf'" |
| Activity description â€” share link | "Generated share link for 'filename.pdf' (24h)" |
| Activity description â€” 2fa_failed | "Invalid 2FA code submitted" |
| Activity description â€” logout | "Signed out" (no IP address in description) |
| Activity description â€” bot_detected | "Bot verification failed on register form" |
| Sort by Name Ã¢â‚¬â€ asc | Click Name header once | Documents sorted AÃ¢â€ â€™Z; ChevronUp shown |
| Sort by Name Ã¢â‚¬â€ desc | Click Name header again | Documents sorted ZÃ¢â€ â€™A; ChevronDown shown |
| Sort by Size | Click Size header | Sorted by file_size; starred docs stay top |
| Sort by Uploaded | Click Uploaded header | Sorted by created_at desc by default |
| Scan badge tooltip Ã¢â‚¬â€ clean | Hover over Clean badge | "VirusTotal found no threats in this file" |
| Scan badge tooltip Ã¢â‚¬â€ pending | Hover over Scanning badge | "Scan in progress Ã¢â‚¬â€ download unavailable until complete" |
| Integrity badge tooltip | Hover over Verified badge | SHA-256 message shown |
| Inline download Ã¢â‚¬â€ clean | Click Download icon | File decrypts and downloads |
| Inline download Ã¢â‚¬â€ pending | Hover Download icon | Button disabled; tooltip explains why |
| Inline download Ã¢â‚¬â€ malicious | Hover Download icon | Button disabled; "File quarantined" shown |
| Star hover Ã¢â‚¬â€ unstarred | Hover over empty star | Star turns amber and scales up slightly |
| Star Ã¢â‚¬â€ toggle on | Click empty star | Star fills amber; document moves to top |
| Star Ã¢â‚¬â€ toggle off | Click filled star | Star empties; document returns to sort |
| Shared card Ã¢â‚¬â€ expiry > 7 days | View card with expires_at 10 days away | Muted "Expires in 10 days" shown with clock icon |
| Shared card Ã¢â‚¬â€ expiry 3Ã¢â‚¬â€œ7 days | View card with expires_at 5 days away | Amber "Expires in 5 days" shown |
| Shared card Ã¢â‚¬â€ expiry Ã¢â€°Â¤ 3 days | View card with expires_at 2 days away | Destructive "Expires in 2 days" shown |
| Shared card Ã¢â‚¬â€ expires today | View card expiring same day | Destructive "Expires today" shown |
| Shared card Ã¢â‚¬â€ no expiry | View card with no expires_at | No expiry label rendered |
| Shared card Ã¢â‚¬â€ action tooltip | Hover over View icon button | "View document" tooltip shown |
| Shared card Ã¢â‚¬â€ download tooltip | Hover over Download icon (pending scan) | "Scan in progress Ã¢â‚¬â€ download unavailable" shown |
| Shared card Ã¢â‚¬â€ hover state | Hover over any shared card | Border shifts from muted to amber/40 |
| Trash search Ã¢â‚¬â€ match | Type partial filename in search input | Matching deleted files shown; non-matches hidden |
| Trash search Ã¢â‚¬â€ no match | Type a name that matches nothing | "No deleted files match" message shown |
| Trash search Ã¢â‚¬â€ clear | Click X on search input | All deleted files shown again |
| Trash empty state | View Trash with no deleted documents | Trash2 icon + "Your trash is empty" message shown |
| Trash empty state Ã¢â‚¬â€ hidden | View Trash with at least one document | Empty state not rendered |
| Undo toast Ã¢â‚¬â€ single delete | Delete a document from My Vault | Toast appears with document name and Undo button (5s) |
| Undo toast Ã¢â‚¬â€ click undo | Click Undo within 5 seconds | Document restored; "File restored to your vault." toast |
| Undo toast Ã¢â‚¬â€ expires | Let toast expire without clicking Undo | Document remains in trash; no restore occurs |
| Undo toast Ã¢â‚¬â€ bulk delete | Bulk delete 3 documents | Toast shows "3 file(s) moved to trash" with Undo all |
| Undo toast Ã¢â‚¬â€ bulk undo | Click Undo all within 5 seconds | All 3 documents restored to vault |
| Brute force cluster Ã¢â‚¬â€ detected | Log page has 3+ failures within 60s | Destructive alert banner shown above table with count and IP |
| Brute force cluster Ã¢â‚¬â€ not triggered | Log page has 2 failures within 60s | No alert banner shown |
| Brute force cluster Ã¢â‚¬â€ admin log | Admin audit log page has cluster | Same alert banner shown in Admin Audit Logs |
| Relative timestamp Ã¢â‚¬â€ hover | Hover over any timestamp cell | Tooltip shows relative time, e.g. "2 hours ago" |
| Category badge Ã¢â‚¬â€ security row | View any security event row | Badge reads "Security" not "SEC" |
| Category badge Ã¢â‚¬â€ activity row | View any general activity row | Badge reads "Activity" not "GEN" |
| Timestamp sort Ã¢â‚¬â€ default | Load Activity page | Newest entries at top; ChevronDown on Timestamp header |
| Timestamp sort Ã¢â‚¬â€ ascending | Click Timestamp header | Oldest entries at top; ChevronUp shown; active filters kept |
| Export label Ã¢â‚¬â€ no filter active | No tab/action/date filter selected | Buttons read "Export all (CSV)" and "Export all (PDF)" |
| Export label Ã¢â‚¬â€ filter active | Select Security tab or an action filter | Buttons read "Export filtered results (CSV)" and "Export filtered results (PDF)" |
| Action filter - document actions | Open action dropdown | document_uploaded, document_deleted, and document_shared options are present |
| Action filter - full catalog | Open action dropdown | All audit actions from the catalog are present and grouped by category |
| User filter - select user | Choose a user from dropdown | Only logs for that user are shown |
| User filter - all users | Select "All users" | Full log restored; user_id param cleared |
| Click username to filter | Click a user name in a log row | User filter is set to that user; other filters are preserved |
| Click username - system event | Click the System row | Row is non-actionable; no filter change occurs |
| Events chart - renders | Load Admin Audit Logs page | Stacked chart shows 24 hourly slots |
| Events chart - security spike | Have 5 security events in one hour | That hour shows a visible red security segment |
| Events chart - zero hours | View an hour with no events | Zero-height bar is still represented in the 24-slot chart |
| Events chart - tooltip | Hover over a bar | Tooltip shows the hour plus security and activity counts |
| Last verified - after run | Run a verification | Banner updates with timestamp, mode, and result immediately |
| Last verified - pass state | Run verification on unmodified logs | Green banner with CheckCircle2 icon and pass message |
| Last verified - fail state | Tamper a log row, run verification | Red banner with XCircle icon and fail message |
| Last verified - never run | Fresh install with no prior verifications | "No verification has been run yet" clock banner shown |
| History table - populates | Run 3 verifications | Table shows 3 rows with correct timestamps and results |
| History table - pass badge | View passing run in history | Emerald "Pass" badge shown |
| History table - fail badge | View failing run in history | Destructive "Fail" badge shown |
| Progress bar - appears | Click either verify button | Progress bar animates; buttons show "Verifying..." and disable |
| Progress bar - completes | Verification finishes | Bar reaches 100%, fades, and buttons re-enable |
| Toast - pass | Run verification on clean logs | Success toast: "Integrity verified - all N entries passed." |
| Toast - fail | Run verification with tampered entry | Error toast: "Integrity check failed - N issue(s) detected." |
| PDF export - downloads | Click "Download integrity report" | PDF downloads with correct timestamp, counts, and verifier name |
| PDF export - failure details | Export after a failing verification | PDF includes failure details table with entry IDs |
| PDF export - pass result | Export after a passing verification | PDF shows "PASS - Chain intact" in result row |
| HMAC info card - renders | Load Audit Integrity page | Explanatory info card visible beside the verification workspace |
| 2FA_FAILED badge | Renders with bg-destructive/15 text-destructive (not gray) |
| Scan badge â€” pending | Blue badge with spinning loader icon "Scanning..." |
| Scan badge â€” clean | Green badge "Clean" |
| Scan badge â€” unavailable | Amber badge "Unavailable" |
| Trash expiry badge â€” 30 days | Muted gray badge "30d left" |
| Trash expiry badge â€” 5 days | Amber badge "5d left" |
| Trash expiry badge â€” 2 days | Destructive red badge "2d left" |
| Trash expiry badge â€” 0 days | Destructive red badge "Expires today" |
| Trash Restore button | AlertDialog appears before restoring |
| Trash Delete Permanently button | AlertDialog appears before permanent deletion |
| Permission badge â€” view_only | Blue bg-blue-500/15 text-blue-600 badge "View Only" |
| Permission badge â€” download | Amber bg-amber-500/15 text-amber-600 badge "Download" |
| Permission badge â€” full_access | Emerald bg-emerald-500/15 badge "Full Access" |
| Role badge â€” Super Admin | Amber bg-amber-500/15 badge "Super Admin" (not solid fill) |
| Role badge â€” Admin | Blue bg-blue-500/15 badge "Admin" |
| Role badge â€” User | Muted badge "User" |
| File type badge â€” PDF | Amber badge "PDF" (not pink) |
| File type badge â€” IMAGE | Teal badge "IMAGE" (not purple) |
| Shared with Me filter Popover | Opens from content-area Filter button only; no duplicate header button |
| Calendar date picker â€” select | Button label updates to selected date (e.g. "Mar 22, 2026") |
| Calendar â€” today highlight | Today's date shows muted background with border |
| Calendar â€” cell spacing | Day cells evenly spaced; day-of-week headers aligned above columns |
| Avatar color â€” Super Admin | "SA" initials render in teal, not pink/magenta |
| Avatar fallback | Users without Gravatar show correct initials in theme-compatible color |
| HIBP unavailable | Registration proceeds; failure logged privately |
| VirusTotal unavailable | Upload proceeds; scan_result = 'unavailable' after job retries exhausted; failure logged |
| IPInfo unavailable | Login proceeds; no location in metadata; failure logged |
| reCAPTCHA unavailable | Register and ForgotPassword proceed; failure logged privately |
| Gravatar email has avatar | Profile photo shown in avatar across all pages |
| Gravatar email has no avatar | Initials circle shown; no broken image icon |
| InputOTP 2FA â€” auto-submit | Entering 6th digit auto-submits the form |
| Typewriter 2FA animation | Subtitle text animates character-by-character on page load |
| Reduced motion | Enable OS reduce-motion setting; all animations disabled |
| IP rule â€” add allowlist | Submit valid CIDR + label | Rule saved; cache cleared; row appears in table |
| IP rule â€” delete | Click delete + confirm AlertDialog | Rule removed; cache cleared; row gone |
| IP rule â€” type badge | Allowlist rule | Emerald badge; blocklist shows destructive badge |
| Grammar - singular last active | Session inactive exactly 1 day | Shows "1 day ago" not "1 days ago" |
| Device info - desktop | View session from Chrome on Windows | Browser and OS shown with Monitor icon |
| Device info - mobile | View session from mobile browser | Smartphone icon shown instead of Monitor |
| Device info - unknown UA | Session with null user_agent | "Unknown device" shown gracefully |
| Location - local IP | Session from 127.0.0.1 | IP shown; no location label rendered |
| Location - enriched IP | Session from public IP with IPInfo cache | City and country shown below IP with MapPin icon |
| Last active - stale text | Session inactive 25h | Last active shown in amber with "Inactive 25h" note |
| Stale row - amber background | Session inactive 24h+ | Row has subtle amber background |
| Stale row - active session | Session active within 24h | No amber background or stale text |
| Refresh button - click | Click Refresh | Page data reloads and last refreshed timestamp updates |
| Refresh button - spinning | Click Refresh while loading | Refresh icon spins and button shows "Refreshing..." |
| User filter - select user | Choose user from dropdown | Only that user's sessions are shown |
| User filter - all users | Select "All users" | All sessions are shown again |
| Empty state - no other sessions | Only admin session active | ShieldCheck icon and "No other active sessions" message shown |
| Terminate dialog - has user name | Click Terminate on a session | Dialog mentions the affected user's name |
| Terminate All dialog - has count | Click Terminate All with N sessions | Dialog mentions how many other sessions will end |
| Current IP display | Load IP Rules page | Admin's current IP shown in reference banner |
| Rule count â€” mixed rules | Have 2 allowlist + 1 blocklist rule | "2 allowlist" and "1 blocklist" shown in section header |
| Rule count â€” empty | No rules configured | "No rules configured" shown in section header |
| CIDR validation â€” valid | Type `203.0.113.0/24` in CIDR input | Green banner shows range and 256 addresses |
| CIDR validation â€” invalid | Type `999.0.0.0/24` in CIDR input | Red banner shows error message |
| CIDR validation â€” /32 | Type `1.2.3.4/32` | Green banner shows a single address (1 address) |
| Self-lockout â€” blocklist risk | Enter CIDR containing current IP, type=blocklist | Destructive self-lockout warning shown |
| Self-lockout â€” allowlist safe | Enter CIDR containing current IP, type=allowlist | No self-lockout warning shown |
| Self-lockout â€” outside range | Enter CIDR not containing current IP | No self-lockout warning shown |
| Add rule â€” confirmation dialog | Click Add rule with valid CIDR | AlertDialog shows rule type, CIDR, and resolved range |
| Add rule â€” blocklist warning | Add a blocklist rule | Dialog shows immediate-denial warning |
| Add rule â€” first allowlist warn | Add allowlist when no allowlist rules exist | Dialog warns all non-listed IPs will be blocked |
| Add rule â€” cancel | Open dialog then click Cancel | Rule not saved; form values preserved |
| Add rule â€” confirm | Click Add rule in dialog | Rule saved; form cleared; row appears in table |
| Submit button â€” invalid CIDR | Enter invalid CIDR | Add rule button disabled; dialog cannot open |
| Password expiry â€” 14-day warning | Set `password_changed_at` to 77 days ago (90-day policy) | Amber Alert banner shown on dashboard |
| Password expiry â€” no warning | Set `password_changed_at` to 70 days ago | No banner shown |
| Password expiry â€” disabled | Set `PASSWORD_EXPIRY_DAYS=0` | No redirect; no warning ever |
| Recovery codes â€” display on 2FA enable | Enable 2FA | Modal shows 8 codes in 2Ã—4 grid; "I've saved my codes" close button |
| Recovery codes â€” copy all | Click "Copy all codes" in modal | All 8 codes copied to clipboard |
| Recovery codes â€” download as txt | Click "Download as .txt" in modal | Plain text file downloaded containing all 8 recovery codes |
| Recovery codes â€” count on Profile | Use 2 codes | Profile 2FA card shows "6 of 8 codes remaining" |
| Recovery codes â€” low warning | Reduce to â‰¤2 remaining | Warning label shown on Profile 2FA card |
| Recovery codes â€” regenerate | Confirm regenerate AlertDialog | Old codes invalidated; new 8 codes shown in modal; `recovery_codes_regenerated` logged |
| Version history â€” replace file | Upload replacement on Document Detail | Current file archived as version; new file stored with `pending` scan |
| Version history â€” version table | View Document Detail after replacement | Previous version listed with correct version number, name, size, uploader, date |
| Version history â€” restore | Restore version 1 via AlertDialog | Version 1 promoted to current; prior state archived; `document_version_restored` logged |
| Version history â€” restore download | Download after restore | Correct file served; integrity hash verified |
| Watermark â€” multi-page PDF | Download a multi-page PDF | Watermark appears on every page |
| Watermark â€” correct identity | Download PDF as User B | Watermark shows User B's name and email (not document owner's) |
| Watermark â€” FPDI failure | Force FPDI to throw | Fails open; original PDF served; `Log::error` written; no exception shown |
| Watermark â€” audit metadata (success) | Download a PDF as an authenticated user | `document_downloaded` audit entry includes `watermarked: true` in metadata |
| Watermark â€” audit metadata (failure) | Force FPDI to throw during PDF download | `document_downloaded` audit entry includes `watermarked: false` in metadata; original decrypted file served |
| Data export â€” request | Click "Request Data Export" | Job dispatched; toast shown; button disabled for 24h |
| Data export â€” duplicate request | Click again within 24h | Error: already requested |
| Data export â€” email | Job completes | Email with signed download link received |
| Data export â€” profile.json | Open profile.json from ZIP | Correct user data; no password hash; no 2FA secret |
| Data export â€” documents.json | Open documents.json from ZIP | Document metadata only; no file contents; no encryption IVs |
| Data export â€” file deleted after download | Download ZIP; attempt second download | File gone; second attempt returns 404 |
| Account deletion â€” request | Submit with correct password | Account deactivated; sessions terminated; confirmation email sent; `account_deletion_requested` logged |
| Account deletion â€” login blocked | Attempt login after request submitted | Login blocked â€” account inactive |
| Account deletion â€” cancel | Click cancel link in email | Account reactivated; `account_deletion_cancelled` logged; deletion fields cleared |
| Account deletion â€” scheduler purge | Advance clock past 30-day threshold | Account hard-deleted; documents purged; audit entries anonymised; `account_deletion_executed` logged |
| Admin Users â€” pending deletion badge | View users list with a pending deletion | Destructive "Pending Deletion" badge visible on that row |
| Login flash â€” deletion scheduled | Attempt login after submitting a deletion request | Flash message shown indicating account is deactivated and deletion is pending |
| Login flash â€” deletion cancelled | Attempt login after cancelling deletion via email link | Flash message shown indicating account has been reactivated |

| Last Active Ã¢â‚¬â€ no "about" prefix | View Users table | "1 hour ago" shown, not "about 1 hour ago" |
| Inactive row styling | Deactivate a user, view Users table | Row renders at reduced opacity |
| Action shortcut Ã¢â‚¬â€ active user | View row for active user | PauseCircle icon visible; tooltip reads "Deactivate user" |
| Action shortcut Ã¢â‚¬â€ inactive user | View row for inactive user | PlayCircle icon visible; tooltip reads "Activate user" |
| Action shortcut Ã¢â‚¬â€ own row | View Super Admin's own row | No action icon shown |
| Action shortcut Ã¢â‚¬â€ triggers dialog | Click Deactivate icon | AlertDialog opens before action fires |
| Sort by Name Ã¢â‚¬â€ asc | Click Name header | Users sorted AÃ¢â€ â€™Z; ChevronUp shown |
| Sort by Name Ã¢â‚¬â€ desc | Click Name header again | Users sorted ZÃ¢â€ â€™A; ChevronDown shown |
| Sort by Last Active | Click Last Active header | Most recently active user at top |
| 2FA column Ã¢â‚¬â€ enabled | View user with 2FA enabled | ShieldCheck in emerald; tooltip "2FA enabled" |
| 2FA column Ã¢â‚¬â€ disabled | View user without 2FA | ShieldOff muted; tooltip "2FA not enabled" |
| Verified column Ã¢â‚¬â€ verified | View user with email_verified_at set | MailCheck in emerald; tooltip "Email verified" |
| Verified column Ã¢â‚¬â€ unverified | View user with email_verified_at null | MailX in amber; tooltip "Email not verified" |
| Encrypted badge tooltip | Hover over Encrypted badge | "AES-256-CBC with unique IV per file" tooltip shown |
| Integrity - hash present | View document with file_hash set | "Hash present" emerald badge; tooltip explains SHA-256 context |
| Integrity - no hash | View document with empty or null file_hash | "No hash" amber badge; tooltip shown |
| Sort by Owner - asc | Click Owner header | Documents sorted by owner name A-Z |
| Sort by Size - desc | Click Size header | Largest files first |
| Sort by Uploaded - asc | Click Uploaded header until ascending | Oldest uploads first |
| Owner filter - select user | Choose a user from dropdown | Only that user's documents shown; sort preserved |
| Owner filter - all owners | Select "All owners" | Full document list restored; owner_id param cleared |
| Owner filter - preserves sort | Filter by owner while sort is active | Sort column and direction preserved after filter change |

---

## 14. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 3.11 | [Date] | Evander Harold S. Amorcillo | Security hardening and lifecycle enforcement release: reCAPTCHA migrated from v3 invisible scoring to visible v2 checkbox with callback-based token handling and fail-open sentinel support; production safeguards added for `.env` handling (`.gitignore`, `.env.example`, `.htaccess`, README checklist, AppServiceProvider checks for `APP_DEBUG` and missing `APP_KEY`, public `.env` warning); data masking added via `MaskingHelper.php` and `maskData.ts` for user-facing email/IP display and safer admin CSV export; global exception handling now logs privately and returns generic production responses with a dedicated `errors/500.blade.php`; new `two_factor_deadline` lifecycle enforcement added via `EnsureTwoFactorEnrolled` middleware, dashboard warning banner, and setup-page messaging; hidden backup recovery administrator support added via `is_system_account`, `User::notSystem()`, `BackupSuperAdminSeeder`, and backend guards protecting the account from UI mutation. |
| 3.9 | [Date] | Evander Harold S. Amorcillo | My Vault usability enhancements: sortable Name, Size, and Uploaded column headers via `SortableHeader.tsx` and `?sort&direction` query params while starred documents remain pinned above sort order; ScanBadge and integrity badges now include plain-language Tooltip explanations; an inline Download icon button was added beside the existing actions menu and shows an explanatory tooltip when disabled for `pending` or `malicious` files; the star toggle now uses amber hover feedback with a subtle scale-up. Shared With Me improvements: cards now display a relative expiry label ("Expires in N days" / "Expires today") with urgency coloring via `formatExpiry.ts`; action icon buttons now expose shadcn Tooltip labels with scan-aware download messaging; and cards now shift from `border-border` to `border-primary/40` on hover in keeping with the flat New York style. Activity Log improvements: brute-force failure clustering now renders a destructive alert banner when 3 or more failure actions appear within 60 seconds on the current page via `detectCluster.ts`; timestamps now show relative time in a hover Tooltip via `RelativeTime.tsx`; category badges now read "Security" and "Activity"; the Timestamp column is now sortable ascending/descending via `?direction=asc|desc` while preserving active filters; and export buttons now show context-aware scope labels ("Export all" vs. "Export filtered results"). Trash improvements: the Trash page now includes a debounced name search input filtering deleted documents by `original_name`, a dedicated no-results state, and a friendly empty state when no deleted files exist; soft-deleting from My Vault now shows a 5-second Sonner toast with Undo for single delete and Undo all for bulk delete, restoring directly without navigating to Trash. All Documents improvements: the Encrypted badge now exposes "AES-256-CBC with unique IV per file" on hover; a dedicated integrity column shows whether a SHA-256 hash is on record for each file; Owner, Size, and Uploaded columns are sortable via `SortableHeader` using the new optional `routeName` prop; and the owner filter now uses a Select dropdown populated with all users instead of free-text input. Admin Audit Logs improvements: the action filter now exposes the full audit action catalog in grouped sections; the user filter now uses a Select dropdown backed by `user_id`; clicking a user row applies that filter instantly; the brute-force cluster alert remains active on the admin view; and a new `EventsChart.tsx` stacked hourly chart shows today's security vs activity volume above the table. Audit Integrity improvements: the page now shows a last-verified banner sourced from the latest `audit_integrity_check` entry, a verification history table for the last 10 runs, animated progress state with Sonner completion toasts, a downloadable DomPDF integrity report, and an HMAC info card explaining hash-per-entry, chaining, and tamper detection. IP Rules improvements: the page now shows the admin's current IP in a reference banner, summarizes allowlist/blocklist counts above the table, validates CIDR input in real time with range preview, warns when a blocklist would include the current IP, and requires AlertDialog confirmation before saving a new rule. `lib/cidrContains.ts` added for client-side CIDR parsing and containment checks. Admin Sessions improvements: the admin Sessions page now uses `formatDistanceToNow` for singular-safe last-active text, shows parsed browser and OS information via `lib/parseUserAgent.ts`, renders cached IPInfo location beneath each IP when available, highlights stale 24-hour sessions, adds a manual Refresh button with last-refreshed timestamp, supports filtering by user via Select, shows an idle empty state when no other sessions exist, and updates the single-session and terminate-all AlertDialog copy to include the affected user and session count. Â§7.4, Â§9.3, Â§9.4, and Â§13.2 updated. |
| 1.0 | [Date] | Evander Harold S. Amorcillo | Initial document creation |
| 2.0 | [Date] | Evander Harold S. Amorcillo | Updated to reflect final implementation: Laravel 13, Spatie v7, Vega style, Noir Amber theme, RBAC matrix with permission-based enforcement, All Documents admin feature, UI/UX specification |
| 3.0 | [Date] | Evander Harold S. Amorcillo | Major update: Added light/dark mode system, full shadcn/ui component library (35 components), external API integrations (HaveIBeenPwned, IPInfo, VirusTotal, Gravatar), new features (bulk operations, global search, document stars, vault lock screen, confetti, drag-and-drop, signed share links, typewriter 2FA, PDF audit export, time-based greeting), updated database schema (scan_result, is_starred columns), accessibility improvements (WCAG 2.1 AA), updated security layer architecture, complete page map revision |
| 3.13 | 2026-04-12 | Evander Harold S. Amorcillo | New feature: Google OAuth via `laravel/socialite` as an additive sign-in method for linked accounts only. Added `google_id` and `google_avatar` columns to `users`, `GoogleOAuthController`, OAuth routes, `google_oauth` rate limiter, profile link/unlink flow with password-confirmed unlink, login-page Google button, register email prefill after missing-account redirect, avatar fallback chain update (custom â†’ Google â†’ Gravatar â†’ initials), and six new security audit actions (`google_oauth_login`, `google_oauth_login_failed`, `google_oauth_linked`, `google_oauth_unlinked`, `google_oauth_link_failed`, `google_oauth_denied`). Added Hard Constraints #31â€“#32. Tests passed: `GoogleOAuthTest.php`, `AuthenticationTest.php`, `RegistrationTest.php`, `ProfileTest.php`, `AuditActionConsistencyTest.php`. Documentation sections updated: Â§1.3, Â§2.2.1, Â§3.1, Â§3.2, Â§4.4, Â§5.2.1, Â§5.3, Â§6.2.10, Â§6.3.4, Â§7.1, Â§12. |
| 3.1 | [Date] | Evander Harold S. Amorcillo | Visual system migration: Geist Sans font replacing Inter, shadcn New York style replacing Vega (border-radius 0.375rem, tighter spacing, solid sidebar active state). Bug fixes: vault lock timeout corrected to 30 minutes and no longer triggers on alt-tab/window switching, avatar color palette updated to remove pink/magenta (6 theme-compatible colors: amber, blue, emerald, violet, orange, teal), activity feed descriptions now show meaningful context from audit log metadata, Calendar date picker fixed (date selection updates button label, today highlight, cell spacing), stat card layout fixed (labels no longer wrap, consistent min-height, shortened sub-labels), filter bar label spacing corrected, decryption error messages sanitized to prevent information leakage |
| 3.2 | [Date] | Evander Harold S. Amorcillo | Audit log category separation: added `category` ENUM column to `audit_logs` (security/audit), AuditCategory enum, SECURITY_ACTIONS map in AuditService, category included in HMAC hash payload. New shared components: ScanBadge, FileTypeBadge, PermissionBadge, RoleBadge, TimeBasedGreeting, AuditCategoryTabs. New utility modules: auditActionBadge.ts, fileTypeBadge.ts, trashExpiryBadge.ts. Bug fixes: 2FA self-healing guard (hasTwoFactorSecretValid(), 2fa_corrupt_reset audit action), AuditDescriptionService with full action-to-description match() map, trash expiry urgency badges (3-tier color escalation), role badge and permission badge color system (bg-color/15 pattern, no solid fills on read-only indicators), all action badge labels changed from uppercase slugs to human-readable sentence case, 2FA_FAILED badge corrected to destructive color, duplicate Filter button removed from Shared with Me header, Admin Dashboard activity feed defaults to security events, all 6 admin stat cards confirmed as clickable links, page header subtitle removed from all pages (Admin Dashboard uses TimeBasedGreeting in that slot), Hard Constraint #17 and #18 added. |
| 3.4 | [Submission Date] | Evander Harold S. Amorcillo | Implementation alignment fixes: `User` model now implements `MustVerifyEmail` contract with auto-verify at registration (SMTP deferred); reCAPTCHA fail-open sentinel (`__recaptcha_unavailable__`) documented for frontend token-load failures; `metadata` confirmed in HMAC hash payload per Â§6.1.3; `account-active` and `two-factor` middleware wired to main authenticated route group; search rate limit corrected to 30/min; `general` API throttle group (60/min) added; audit action `signed_url_accessed` added to catalog and badge map; `AuditDescriptionService` coverage expanded to include `bulk_download`, `signed_url_accessed`, `login_blocked_inactive`, `user_role_changed`; `HibpService` renamed to `PwnedPasswordService` throughout; All Documents page updated â€” subtitle removed, amber admin notice Alert banner added, ScanBadge column added, FileTypeBadge colors corrected (PNG/JPG â†’ teal), Encrypted badge corrected to bg-color/15 pattern, duplicate Export CSV button removed. |
| 3.5 | [Date] | Evander Harold S. Amorcillo | New feature: Admin Audit Integrity verification page (`/admin/audit-integrity`, `AuditIntegrity.tsx`, `AuditIntegrityController.php`, `AuditIntegrityService.php`). Supports full-chain and recent-500 verification modes; reports pass/fail counts with capped failure details. New security audit action `audit_integrity_check` added to action catalog (Â§5.2.4), `AuditService.php`, `AuditDescriptionService.php`, and `auditActionBadge.ts`. Route wired in `web.php`; sidebar link added in `AuthenticatedLayout.tsx`. Feature tests passed: `AuditIntegrityTest.php`, `AuditActionConsistencyTest.php`, `AuditLogCategoryTest.php`. Page Map (Â§9.4), Directory Structure (Â§4.3), FR catalog (Â§7.4), and Security Testing Checklist (Â§13.1) updated. |
| 3.8 | [Date] | Evander Harold S. Amorcillo | Admin Dashboard enhancements: Failed Logins stat card now uses a 3-tier color escalation (muted -> amber at 5 -> destructive at 20), with thresholds configurable via `FAILED_LOGIN_WARN` and `FAILED_LOGIN_DANGER`; `failedLoginBadge.ts` utility added. Pending Verifications stat card now turns amber when count > 0 via `pendingVerificationColor.ts`. Vault Storage stat card now includes a quota-based Progress bar with tiered color escalation (primary below 75% -> amber at 75% -> destructive at 90%), driven by `STORAGE_LIMIT_BYTES`; `formatBytes.ts` utility added. Recent Activity on Admin Dashboard now shows full `HH:MM:SS` timestamps, consistent with the Activity and Admin Audit Logs pages. The subtitle slot is occupied only by `TimeBasedGreeting`; no static subtitle text is rendered. A 7-day successful-logins bar chart is displayed below the stat cards, built with shadcn `ChartContainer` + Recharts via `LoginChart.tsx`, with zero-login days included. User Management improvements: Last Active labels no longer show the "about" prefix; inactive users render at reduced opacity; an inline Activate/Deactivate icon shortcut now appears per row (hidden for own account) and still routes through AlertDialog confirmation; Name and Last Active columns are sortable via `SortableHeader`; and new 2FA and email verification status columns show tooltip-backed `ShieldCheck` / `ShieldOff` and `MailCheck` / `MailX` indicators sourced from `two_factor_enabled` and `email_verified_at`. §2.2.5, §9.3, §9.4, and §13.2 updated. |
| 3.7 | [Date] | Evander Harold S. Amorcillo | Seven new features: Admin IP allowlist/blocklist (IpPolicyService, CheckIpPolicy middleware, ip_rules table, manage_ip_rules permission), Password expiry policy (EnsurePasswordNotExpired middleware, password_changed_at column, ExpiredPasswordController, 14-day dashboard warning), 2FA backup recovery codes (RecoveryCodeService, two_factor_recovery_codes table, TwoFactorRecovery page, regeneration flow), Document version history (DocumentVersionService, document_versions table, replace/restore routes, Version History tab on Document Detail), PDF download watermarking in-memory via setasign/fpdi (PdfWatermarkService, no disk writes, fails open), GDPR-style data export (ExportUserDataJob, data_exports table, signed download link, 24h expiry, scheduler cleanup), Account deletion request (AccountDeletionController, 30-day grace period, cancellation email, PurgeScheduledDeletions command, audit log anonymisation). New columns on users (password_changed_at, deletion_requested_at, deletion_scheduled_for, deletion_cancel_token) and documents (current_version). 15 new audit actions. manage_ip_rules permission added to RBAC matrix. Hard Constraints #20â€“#27 added. Â§5.2, Â§6, Â§7, Â§9.4, Â§10.1, Â§12, Â§13.1, Â§13.2 updated. |
| 3.6 | [Date] | Evander Harold S. Amorcillo | New feature: Custom profile picture upload. Users may upload a personal avatar (JPEG, PNG, WebP) which takes priority over Gravatar in the `UserAvatar` resolution chain (custom â†’ Gravatar â†’ initials). New `avatar_path` column on `users` table. New `AvatarController.php`, `AvatarRequest.php`, and `AvatarImageService.php`. Server-side auto-resize normalizes images to fit within 512Ã—512 (aspect ratio preserved); EXIF orientation auto-corrected for JPEGs before resize to prevent sideways images from phone uploads. Source images up to 8 MB / 8000Ã—8000px accepted â€” validation rejects only images below minimum size. Stored in `storage/app/public/avatars/` as UUID-named files â€” documented as deliberate exception to Hard Constraint #7 (Hard Constraint #19 added). Avatar uploads exempt from VirusTotal scanning. Audit logging reuses `profile_updated` action with `action_detail` metadata (`avatar_uploaded` / `avatar_removed`); `AuditDescriptionService` updated. `UserAvatar.tsx` updated to three-tier resolution; `gravatar.ts` utility added. Profile page updated with avatar upload card (preview, progress, remove with AlertDialog). Bug fix: `GlobalSearch.tsx` all visible text strings (empty-state subtitle, dialog description, search button text, input placeholder, input aria-label) are now role-aware â€” regular Users never see copy referencing user name or email search. Tests passed: `ProfileAvatarTest.php` (including auto-resize, EXIF orientation, and minimum-size rejection coverage), `ProfileTest.php`, `AuditActionConsistencyTest.php`. Â§2.2.1, Â§2.2.2, Â§3.2.4, Â§4.3, Â§5.2.1, Â§9.3, Â§9.4, Â§12 updated. |
| 3.3 | [Submission Date] | Evander Harold S. Amorcillo | New feature: Google reCAPTCHA v3 bot mitigation on Register and Forgot Password forms (RecaptchaService, lib/recaptcha.ts, bot_detected security audit action, score threshold 0.5, fails open). New feature: Async VirusTotal scanning via Laravel Queue job (ScanDocumentWithVirusTotal) â€” uploads complete immediately with scan_result = 'pending'; downloads blocked while pending or malicious; malware_detected logged async. Queue driver environment-aware: deferred locally (no worker needed), database in production. Schema: scan_result column converted from JSON to VARCHAR(50), pending added as valid value. Calendar day-of-week header spacing fixed (head_cell w-9 text-center). Documentation: sections 1.3, 2.2.1, 2.2.2, 3.2, 3.2.3, 3.2.5 (new), 3.3, 4.2, 4.3, 4.4, 5.2.2, 5.2.4, 6.2.8 (new), 6.3.2, 7.1, 7.2, 9.3, 9.4, 12, 13.1, 13.2 updated. Hard Constraint #13 reworded to reflect async model. |
