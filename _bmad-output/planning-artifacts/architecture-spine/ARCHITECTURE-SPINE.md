# Architecture Spine
**Project:** HolcemLK Banker - Customer Signature & Image Collection System
**Purpose:** Build substrate for epics/stories
**Status:** final
**Updated:** 2026-07-03

---

## Paradigm

**Local-Network Secure Capture System** — A secure, local-network system with role-based access, one-time QR authorization, and encrypted image storage.

---

## Invariants (Architecture Decisions)

### AD-1: Dual-Database Architecture
**Binds:** Image upload, audit logging
**Prevents:** Data leakage between operational and image data
**Rule:** `holcemlk_banker_dataentry` is read-only for this system's write operations; `holcemlk_banker_images` is the exclusive write target for customer images.
**[ADOPTED]** HLD: "holcemlk_banker_dataentry is read-only... holcemlk_banker_images is the only database this system writes customer image data into."

### AD-2: QR Session One-Time Enforcement
**Binds:** QR validation, unlock session issuance
**Prevents:** QR replay attacks, unauthorized collection
**Rule:** QR nonce must transition from `pending` → `consumed` atomically in Redis; validation fails if state is not `pending`.
**[ADOPTED]** LLD: "Look up `Redis: qr:{nonce}`. If missing or `status != 'pending'` → reject."

### AD-3: Unlock Session Multiple Uploads with TTL Bound
**Binds:** Image upload, QR validation
**Prevents:** Extended capture windows, session hijacking, excessive uploads per session
**Rule:** Unlock session JWT has 10-minute TTL; allows multiple image uploads (up to a configurable maximum, default 5) per session; each upload still requires valid customer ID lookup. Session invalidated after TTL expiration or upon reaching upload limit.
**[ADOPTED]** Chosen to balance security (limited TTL and upload cap) with practicality (officer can capture both signature and photo for a customer without re-scanning QR).

### AD-4: Password Field Selection
**Binds:** Auth Module
**Prevents:** Authentication bypass via wrong credential field
**Rule:** Login uses `MobilePassword`/`web_password` (bcrypt-hashed), never `UserPassword`.
**[ADOPTED]** PRD: "using existing `systemusers` bcrypt-hashed credentials (`MobilePassword`/`web_password`), never `UserPassword`."

### AD-5: Image Encryption Before Storage
**Binds:** Image Upload Module
**Prevents:** Plain-text image exposure at rest
**Rule:** Images encrypted with AES-256-GCM before write; DB stores path + hash only.
**[ADOPTED]** LLD: "Encrypt image (AES-256-GCM) → write to encrypted file store; DB stores path + hash."

### AD-6: Visible + Invisible Watermarking
**Binds:** Image Upload Module
**Prevents:** Unattributed image capture
**Rule:** Watermark (officer_id + timestamp) applied via `sharp` before encryption.
**[ADOPTED]** PRD: "Visible + invisible watermarking of captured images (officer ID, timestamp)."

### AD-7: Concurrent-Login Prevention
**Binds:** Auth Module
**Prevents:** Session hijacking, unauthorized concurrent access
**Rule:** `Redis: session:{user_id}` tracks active session; new login invalidates previous.
**[ADOPTED]** HLD: "Concurrent-login control" + LLD Redis structure.

### AD-8: Append-Only Audit Trail
**Binds:** All modules
**Prevents:** Audit log tampering, compliance violations
**Rule:** Audit module writes to dedicated append-only table; anomaly alerts for unusual IP/device patterns.
**[ADOPTED]** HLD: "Append-only logging of all auth, QR, and image events."

### AD-9: DB Credential Separation
**Binds:** All database access
**Prevents:** Cross-database privilege escalation, accidental writes to fixed-schema tables
**Rule:** Backend uses two separate, least-privilege MySQL accounts — `app_dataentry_ro` (SELECT-only on `customerinformation`, `systemusers`) and `app_images_rw` (SELECT/INSERT only on `customer_images`, `customer_previous_images`, `audit_log`; no UPDATE/DELETE on the latter two).
**[ADOPTED]** Database Design Document, §6 DB Access Control.

### AD-10: OTP Step-Up Authentication
**Binds:** Auth Module
**Prevents:** Account takeover via credential theft alone
**Rule:** Login from a previously unseen device or IP triggers mandatory OTP verification via `mobile_no`/`mobile_otp` before a session is granted; known devices/IPs skip this step within the JWT's normal validity window.
**[ADOPTED]** SRS FR-14: "Backend shall trigger OTP verification... when a user logs in from a previously unseen device/IP."

### AD-11: TLS Enforcement
**Binds:** All client-backend communication
**Prevents:** MITM interception, credential/image sniffing on the local network
**Rule:** All traffic must use HTTPS/TLS, including LAN-internal connections; no plaintext HTTP is permitted anywhere in the system, regardless of network isolation.
**[ADOPTED]** SRS NFR-01: "All client–backend communication shall use TLS (HTTPS), including on the local network."

### AD-12: Archive-Before-Insert Transaction Integrity
**Binds:** Image Upload Module
**Prevents:** Orphaned or inconsistent image records on partial failure
**Rule:** Replacing an existing customer image (archiving the old record to `customer_previous_images` and inserting the new record into `customer_images`) must be wrapped in a single atomic transaction; any failure mid-operation must roll back completely, never leaving the customer with zero or duplicate current images.
**[ADOPTED]** SRS FR-11 + LLD Image Upload error-handling: "Encryption/storage failure → 500, no partial DB record committed (transaction rollback)."

---

## Data Flow

```
[Admin] → Auth Module → JWT → QR Module → Generate QR
[QR Token] → Collector App → QR Module → Validate → Unlock Session JWT
[Unlock Session] → Customer Lookup → Verify CustomerID
[Image + Unlock] → Image Upload → Encrypt + Watermark → Store → Audit
```

---

## Stack Constraints

| Dimension | Status | Value |
|-----------|--------|-------|
| Backend Framework | **[ADOPTED]** | Node.js + Express + Sequelize/Prisma ORM |
| Frontend Framework | **[ADOPTED]** | Flutter — two separate apps (QR Generator App for Admin, Collector App for Bank Officer) |
| Storage | **[ADOPTED]** | AES-256-GCM encrypted file store for images + MySQL (dual database: `holcemlk_banker_dataentry`, `holcemlk_banker_images`) + Redis for ephemeral QR/session state |
| Deployment | **[ADOPTED]** | Single local host PC running backend + both databases + Redis; isolated branch LAN/VLAN; no internet egress required or permitted |

---

## Deferrables

(None currently)

---

## Revision Note

This version restores full content after a prior write operation (2026-07-02T15:55:30+05:30) produced a header-only file due to a file-move error. All 12 architecture decisions, the data flow, and the corrected (adopted, not deferred) stack constraints are verified present in this version. Verify by reading this file back and confirming 12 `### AD-` headings exist before treating this as final.
