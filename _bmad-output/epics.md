---
stepsCompleted: ["requirements_extraction", "epics_created", "epic1_complete"]
inputDocuments:
  - D:\Company\nanosoft_signature_system\Docs\02-requirements-analysis\01-prd.md
  - D:\Company\nanosoft_signature_system\Docs\02-requirements-analysis\02-srs.md
  - D:\Company\nanosoft_signature_system\Docs\03-system-design\02-hld.md
  - D:\Company\nanosoft_signature_system\_bmad-output\architecture-spine\ARCHITECTURE-SPINE.md
---

# HolcemLK Banker - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for HolcemLK Banker, decomposing the requirements from the PRD, SRS, HLD, and Architecture Spine into implementable stories.

## Requirements Inventory

### Functional Requirements

FR-01: Admin login via QR Generator App using bcrypt-verified credentials
FR-02: System shall reject login attempts using the legacy UserPassword field
FR-03: Admin shall generate a QR code embedding a signed, short-lived session token
FR-04: Backend shall mark a QR token as consumed immediately upon first validation
FR-05: Bank Officer login via Collector App using bcrypt-verified credentials
FR-06: Collector App shall scan the Admin's QR and submit tokens for validation
FR-07: Backend shall issue a short-lived "unlock" session after validation
FR-08: Officer shall input/select CustomerID; backend shall verify existence
FR-09: Officer shall capture signature/photo in memory only
FR-10: Upload request shall require valid unlock-session token
FR-11: Backend shall archive prior image before inserting new one
FR-12: Backend shall apply visible/invisible watermarking to images
FR-13: Backend shall log all login, QR, and image events
FR-14: Backend shall trigger OTP verification for new device/IP login
FR-15: Backend shall prevent concurrent active sessions
FR-16: Collector App shall queue captures securely if offline

### NonFunctional Requirements

NFR-01: All communication shall use TLS (HTTPS), including LAN-internal traffic
NFR-02: Stored passwords shall use bcrypt/argon2id
NFR-03: Images shall be encrypted at rest (AES-256)
NFR-04: Implement rate limiting and account lockout
NFR-05: Block screenshots, detect rooted devices
NFR-06: Sessions shall auto-expire after 5 min inactivity
NFR-07: No internet dependency for core operation
NFR-08: Tamper-evident (append-only) audit logs
NFR-09: Comply with Sri Lanka's PDPA
NFR-10: Separate least-privilege DB credentials

### Additional Requirements

- Backend uses two MySQL accounts: app_dataentry_ro (SELECT-only) and app_images_rw (limited INSERT)
- Redis tracks active sessions and QR token state
- Unlock session JWT has 10-minute TTL (max 5 uploads per session)
- Image replacement uses atomic transactions

### FR Coverage Map

FR-01: Epic 2/7 - Admin login (backend + QR Generator App)
FR-02: Epic 2 - Reject legacy UserPassword field
FR-03: Epic 3/7 - QR generation (backend + app)
FR-04: Epic 3 - QR token consumption
FR-05: Epic 2/8 - Bank Officer login (backend + Collector App)
FR-06: Epic 3/8 - QR scan (backend + app)
FR-07: Epic 3 - Unlock session issuance
FR-08: Epic 4/8 - Customer verification (backend + app)
FR-09: Epic 5/8 - Secure capture (backend + app)
FR-10: Epic 5 - Upload validation
FR-11: Epic 5 - Archive-before-insert
FR-12: Epic 5 - Watermarking
FR-13: Epic 6 - Event logging
FR-14: Epic 2 - OTP verification
FR-15: Epic 2 - Concurrent login prevention
FR-16: Epic 5/8 - Offline queue (backend + app)

### NFR Coverage Map

NFR-01: Epic 1/2/3/4/5 - TLS enforcement (system-wide transport requirement; Epic 1 establishes it at server setup, enforced across every subsequent module's endpoints)
NFR-02: Epic 2 - Password hashing
NFR-03: Epic 1/5 - AES-256 encryption (setup + upload implementation)
NFR-04: Epic 2 - Rate limiting
NFR-05: Epic 7/8 - Device security
NFR-06: Epic 2 - Session expiry
NFR-07: Epic 1 - Offline/no-internet operation (deployment/infrastructure constraint, not upload-specific)
NFR-08: Epic 6 - Tamper-evident logs
NFR-09: Epic 1/5/6 - Data protection compliance (cross-cutting: encryption at setup, applied during upload, verified via audit trail; retention/consent policy itself is a compliance-documentation task outside the epic/story structure â€” see Docs\06-deployment\04-known-limitations-and-recommendations.md)
NFR-10: Epic 1 - DB credential separation

### AD Coverage Map

AD-1: Epic 1 - Dual-Database Architecture
AD-2: Epic 3 - QR Session One-Time Enforcement
AD-3: Epic 3 - Unlock Session Multiple Uploads with TTL Bound
AD-4: Epic 2 - Password Field Selection
AD-5: Epic 5 - Image Encryption Before Storage
AD-6: Epic 5 - Visible + Invisible Watermarking
AD-7: Epic 2 - Concurrent-Login Prevention
AD-8: Epic 6 - Append-Only Audit Trail
AD-9: Epic 1 - DB Credential Separation
AD-10: Epic 2 - OTP Step-Up Authentication
AD-11: Epic 1/2/3/4/5 - TLS Enforcement (system-wide; established at Epic 1 setup, applies to every module's endpoints through Epic 5)
AD-12: Epic 5 - Archive-Before-Insert Transaction Integrity

## Epic List

### Epic 1: Setup & Dual-DB Connection [COMPLETE]
Establish project structure, dual-database connection, and system-wide transport security baseline.
**Verification:** `tsc --noEmit` clean; MySQL + Redis CA cert enforcement confirmed; Redis reconnect capped at 5 retries (returns Error); secret store mutex uses single shared lock key; atomic writes via temp-file + rename; Windows ACL enforcement on dir/file creation.
**Files:** src/db/index.ts (2979B), src/redis/index.ts (2736B), src/services/secretStore.ts (2153B), src/services/keyManagement.ts (785B), src/services/databaseStateTracker.ts (5506B), src/scripts/verifySetup.ts (1745B), .env.example (753B)
**FRs covered:** (none)
**NFRs covered:** NFR-01 (TLS baseline), NFR-03 (encryption infrastructure setup), NFR-07 (no-internet deployment constraint), NFR-09 (compliance foundation), NFR-10
**ADs covered:** AD-1, AD-9, AD-11 (baseline TLS setup â€” enforced per-endpoint in every later epic)

### Epic 2: Auth Module [COMPLETE]
Implement role-based authentication and session management.
**Stories:** _bmad-output/epic2.md (6 stories, created retroactively)
**FRs covered:** FR-01 (backend), FR-02, FR-05 (backend), FR-14, FR-15
**NFRs covered:** NFR-01 (enforced on auth endpoints), NFR-02, NFR-04, NFR-06
**ADs covered:** AD-4, AD-7, AD-10, AD-11 (enforced on auth endpoints)
**Verification:** tsc --noEmit clean; UserPassword grep = 0 hits; bcrypt.compare() constant-time; JWT sig+expiry verified on every route; rate limiting wired into login route with fail-closed Redis; HTTPS server startup order fixed (Redis + DB init before listen); no unhandled rejections (all Redis wrapper calls method-caught or route-caught); sessionToken-based concurrent login enforcement confirmed.
**Deferred items:** Error-code granularity (500 vs 503 distinction), Redis outage messaging (429 vs generic infrastructure failure).

### Epic 3: QR Generation & Validation [COMPLETE]
Admin QR generation and officer validation flow.
**Stories:** _bmad-output/epic3-story1-qr.md (created manually; BMAD create-story command is a multi-step workflow for sprint planning, not a single-story generator)
**FRs covered:** FR-03 (backend), FR-04, FR-06 (backend), FR-07
**NFRs covered:** NFR-01 (enforced on QR endpoints)
**ADs covered:** AD-2, AD-3, AD-11 (enforced on QR endpoints)
**Verification:** tsc --noEmit clean; QR atomicity via Lua EVAL (single Redis operation, no race window); upload-cap counter tracked in `unlock:{nonce}` Redis key, NOT in JWT (mutable-counter design flaw fixed); consumeUploadSlot control-flow tested via real function call against mocked Redis (6 calls, 5 allowed + 1 rejected); pre-production item: Lua EVAL syntax vs live Redis.

### Epic 4: Customer Lookup [COMPLETE]
Customer verification before capture.
**Stories:** _bmad-output/epic4-story1-lookup.md
**FRs covered:** FR-08 (backend)
**NFRs covered:** NFR-01 (enforced on lookup endpoint)
**ADs covered:** AD-11 (enforced on lookup endpoint)
**Verification:** tsc --noEmit clean; unlock-session type check confirmed (rejects access/refresh/otp tokens); parameterized SQL via Sequelize replacements; dataEntryDb read-only connection used; minimal PII (CustomerID + CustomerName only); trim-crash bug on params.customerId found and fixed via safe typeof check.

### Epic 5: Image Upload & Encryption [COMPLETE]
Secure encryption and BLOB storage of captured signatures/photos in `holcemlk_banker_images` database, with watermark-before-encryption and transactional archive-before-insert.
**FRs covered:** FR-09 (backend), FR-10, FR-11, FR-12, FR-16 (backend)
**NFRs covered:** NFR-01 (enforced on upload endpoint), NFR-03 (implementation), NFR-09 (encryption + watermark applied here)
**ADs covered:** AD-5 (revised 2026-07-07 — BLOB storage, not file-store), AD-6, AD-11 (enforced on upload endpoint), AD-12
**BLOB migration verified:** `handleArchiveInsert()` confirmed passing correct Buffer values (existing row's `image_data` → archive `old_image_data`; new `encrypted` buffer → new `image_data`) with `npx tsc --noEmit` clean. Sequelize/MySQL2 native Buffer-to-BLOB binding confirmed (no special ORM handling required for BLOB parameters). No `fs` module, no `writeEncryptedFile()`, no `storage_path`/`storagePath` references remain. `epic5-story2-blob-migration.md` marked [COMPLETE].
**Remaining gap:** BLOB round-trip through a real MySQL instance (write encrypted Buffer → read it back → decrypt) has been verified at the code/type level only, not via a live database test. Tracked alongside item 9 in `Docs/06-deployment/04-known-limitations-and-recommendations.md`.

### Epic 6: Audit Logging [COMPLETE]
Append-only logging of all system events.
**FRs covered:** FR-13
**NFRs covered:** NFR-08, NFR-09 (audit trail supports compliance verification)
**ADs covered:** AD-8

### Epic 7: QR Generator App [COMPLETE]
Admin-facing Flutter app for QR generation.
**FRs covered:** FR-01 (UI), FR-03 (UI)
**NFRs covered:** NFR-05
**Verification:** flutter analyze clean (0 errors) against real freerasp 6.12.0 package; root/jailbreak/emulator detection confirmed via onPrivilegedAccess + onSimulator callbacks; flutter_secure_storage for all tokens; FLAG_SECURE via MainActivity.kt; 5-min idle timeout via Timer; API field names verified against actual backend routes (authRouter.ts, qrRouter.ts); iOS screenshot blocking deferred (see Platform Gaps in story file).

### Epic 8: Collector App [COMPLETE]
Officer-facing Flutter app for capture flow.
**FRs covered:** FR-05 (UI), FR-06 (UI), FR-08 (UI), FR-09 (UI), FR-16 (UI)
**NFRs covered:** NFR-05
**Verification:** flutter analyze clean (0 errors) against real freerasp 6.12.0 package; root/jailbreak/emulator detection confirmed via onPrivilegedAccess + onSimulator callbacks; mobile_scanner 4.0.1 API verified against actual resolved package source; flutter_secure_storage per-item keys for offline queue (avoids single-key size limits); _flushQueue retry triggered after each successful upload; FLAG_SECURE via MainActivity.kt; 5-min idle timeout; API field names verified against actual backend routes (authRouter.ts, qrRouter.ts, customerLookupRouter.ts, imageUploadRouter.ts); BLOB storage change in Epic 5 required no Collector App changes (app sends raw bytes via HTTP body only).

## Compliance Note

NFR-09 (Sri Lanka PDPA compliance) is deliberately not treated as a single-epic deliverable. Technical controls supporting it are distributed across Epic 1 (encryption infrastructure), Epic 5 (encryption/watermarking applied), and Epic 6 (audit trail). The non-technical component â€” a documented data retention and consent policy â€” is tracked separately as an open item in Docs\06-deployment\04-known-limitations-and-recommendations.md and must be signed off by the Compliance Officer before production go-live, independent of story completion status in this document.

