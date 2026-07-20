# Architecture Spine
**Project:** HolcemLK Banker - Customer Signature & Image Collection System
**Purpose:** Build substrate for epics/stories
**Status:** final
**Updated:** 2026-07-03

---

## Paradigm

**Local-Network Secure Capture System** â€” A secure, local-network system with role-based access, one-time QR authorization, and encrypted image storage.

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
**Rule:** QR nonce must transition from `pending` â†’ `consumed` atomically in Redis; validation fails if state is not `pending`.
**[ADOPTED]** LLD: "Look up `Redis: qr:{nonce}`. If missing or `status != 'pending'` â†’ reject."
### AD-5: Image Encryption Before Storage
**Binds:** Image Upload Module
**Prevents:** Plain-text image exposure at rest
**Rule:** Images encrypted with AES-256-GCM before write; encrypted binary stored directly as BLOB in customer_images.image_data column (holcemlk_banker_images database). SHA-256 hash still stored alongside for integrity verification. No file-system storage_path used.
**[REVISED 2026-07-07]** Changed from file-store+path approach to direct BLOB storage per explicit Project Owner decision. Trade-offs (DB size growth, backup/replication overhead, no streaming) acknowledged and accepted — documented in Docs/06-deployment/04-known-limitations-and-recommendations.md.
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
**Rule:** Backend uses two separate, least-privilege MySQL accounts â€” `app_dataentry_ro` (SELECT-only on `customerinformation`, `systemusers`) and `app_images_rw` (SELECT/INSERT only on `customer_images`, `customer_previous_images`, `audit_log`; no UPDATE/DELETE on the latter two).
**[ADOPTED]** Database Design Document, Â§6 DB Access Control.

### AD-10: OTP Step-Up Authentication
**Binds:** Auth Module
**Prevents:** Account takeover via credential theft alone
**Rule:** Login from a previously unseen device or IP triggers mandatory OTP verification via `mobile_no`/`mobile_otp` before a session is granted; known devices/IPs skip this step within the JWT's normal validity window.
**[ADOPTED]** SRS FR-14: "Backend shall trigger OTP verification... when a user logs in from a previously unseen device/IP."

### AD-11: TLS Enforcement
**Binds:** All client-backend communication
**Prevents:** MITM interception, credential/image sniffing on the local network
**Rule:** All traffic must use HTTPS/TLS, including LAN-internal connections; no plaintext HTTP is permitted anywhere in the system, regardless of network isolation.
**[ADOPTED]** SRS NFR-01: "All clientâ€“backend communication shall use TLS (HTTPS), including on the local network."

### AD-12: Archive-Before-Insert Transaction Integrity
**Binds:** Image Upload Module
**Prevents:** Orphaned or inconsistent image records on partial failure
**Rule:** Replacing an existing customer image (archiving the old record to `customer_previous_images` and inserting the new record into `customer_images`) must be wrapped in a single atomic transaction; any failure mid-operation must roll back completely, never leaving the customer with zero or duplicate current images.
**[ADOPTED]** SRS FR-11 + LLD Image Upload error-handling: "Encryption/storage failure â†’ 500, no partial DB record committed (transaction rollback)."

---

## Data Flow

```
[Admin] â†’ Auth Module â†’ JWT â†’ QR Module â†’ Generate QR
[QR Token] â†’ Collector App â†’ QR Module â†’ Validate â†’ Unlock Session JWT
[Unlock Session] â†’ Customer Lookup â†’ Verify CustomerID
[Image + Unlock] â†’ Image Upload â†’ Encrypt + Watermark â†’ Store â†’ Audit
```

---

## Stack Constraints

| Dimension | Status | Value |
|-----------|--------|-------|
| Backend Framework | **[ADOPTED]** | Node.js + Express + Sequelize/Prisma ORM |
| Frontend Framework | **[ADOPTED]** | Flutter â€” two separate apps (QR Generator App for Admin, Collector App for Bank Officer) |
| Storage | **[ADOPTED]** | AES-256-GCM encrypted file store for images + MySQL (dual database: `holcemlk_banker_dataentry`, `holcemlk_banker_images`) + Redis for ephemeral QR/session state |
| Deployment | **[ADOPTED]** | Single local host PC running backend + both databases + Redis; isolated branch LAN/VLAN; no internet egress required or permitted |

---

## Deferrables

(None currently)

---

## Revision Note

This version restores full content after a prior write operation (2026-07-02T15:55:30+05:30) produced a header-only file due to a file-move error. All 12 architecture decisions, the data flow, and the corrected (adopted, not deferred) stack constraints are verified present in this version. Verify by reading this file back and confirming 12 `### AD-` headings exist before treating this as final.



**Addendum (2026-07-06):** logEvent() is fail-closed (throws on DB write failure). Since audit_log lives in holcemlk_banker_images (imagesDb), this creates a new availability dependency: LOGIN, QR generation, and QR validation now require imagesDb to be reachable, not just dataEntryDb. Previously login depended only on dataEntryDb. This is an accepted trade-off (no audit event is ever silently lost) but does mean imagesDb downtime now blocks login and QR operations alongside image upload. If this coupling is judged unacceptable later, revisit with either: (a) a separate lightweight audit DB/table independent of image storage, or (b) making logEvent() fail-open with a local fallback queue for retry.
