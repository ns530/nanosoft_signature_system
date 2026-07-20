# Database Design Document
## HolcemLK Banker — Customer Signature & Image Collection System

### 1. Overview
Two databases, on the same local MySQL instance (or separate instances), accessed via **separate, least-privilege credentials** from the Node.js backend.

- `holcemlk_banker_dataentry` — existing, **fixed schema** (`customerinformation`, `systemusers`) — read-only for this system.
- `holcemlk_banker_images` — new, **flexible schema**, owned by this project.

### 2. holcemlk_banker_images — Table: customer_images
| Column | Type | Notes |
|---|---|---|
| image_id | CHAR(36), PK | UUID v4 |
| customer_id | VARCHAR(20), FK (logical) → dataentry.customerinformation.CustomerID | Not a DB-enforced FK across databases; validated at application layer |
| image_type | ENUM('profile_picture','signature') | |
| image_data | LONGBLOB | AES-256-GCM encrypted binary (chosen per Project Owner decision — see Security Note below) |
| file_hash | CHAR(64) | SHA-256 of encrypted data, for integrity checks |
| collected_by | VARCHAR(20), FK (logical) → dataentry.systemusers.UserName or UserID | |
| collected_at | DATETIME | |
| qr_session_ref | CHAR(36) | Nonce of the QR session used, for audit correlation |

**Indexes:** `INDEX idx_customer_id (customer_id)`, `UNIQUE idx_customer_type (customer_id, image_type)` (one current image per type per customer).

### 3. holcemlk_banker_images — Table: customer_previous_images
| Column | Type | Notes |
|---|---|---|
| log_id | BIGINT AUTO_INCREMENT, PK | |
| image_id | CHAR(36) | Original image_id being archived |
| customer_id | VARCHAR(20) | |
| old_image_data | LONGBLOB | AES-256-GCM encrypted binary (archived) |
| old_file_hash | CHAR(64) | |
| replaced_by | VARCHAR(20) | UserID/UserName of officer who triggered replacement |
| replaced_at | DATETIME | |

**Indexes:** `INDEX idx_customer_id (customer_id)`, `INDEX idx_replaced_at (replaced_at)`.

### 4. Recommended Additional Table: audit_log
| Column | Type | Notes |
|---|---|---|
| log_id | BIGINT AUTO_INCREMENT, PK | |
| event_type | VARCHAR(50) | e.g. LOGIN, QR_GENERATED, QR_VALIDATED, IMAGE_CAPTURED, IMAGE_REPLACED |
| user_id | VARCHAR(20) | |
| ip_address | VARCHAR(45) | |
| device_fingerprint | VARCHAR(255) | |
| event_time | DATETIME | |
| detail | JSON | Event-specific extra context |

*(Append-only; no UPDATE/DELETE privilege granted to the application DB user on this table.)*

### 5. Entity Relationship Summary (for ER diagram tool)
- `customerinformation (1) —— (0..2) customer_images` (one signature + one profile picture per customer, logical FK on `CustomerID`)
- `customer_images (1) —— (0..N) customer_previous_images` (historical versions, logical FK on `image_id`)
- `systemusers (1) —— (0..N) customer_images` (collected_by, logical FK)
- `systemusers (1) —— (0..N) audit_log` (user_id, logical FK)

### 6. Security Note — BLOB vs File-Store Decision
**Original recommendation (superseded):** Store encrypted files on the filesystem with only a path reference in the database, on the basis that LONGBLOB storage adds DB size growth, backup overhead, and prevents streaming reads.

**Current decision (2026-07-07):** Direct BLOB storage in `customer_images.image_data` / `customer_previous_images.old_image_data` per explicit Project Owner requirement. Rationale: eliminates filesystem dependency, simplifies backup (single DB dump captures both metadata and encrypted blobs), and avoids path-related fragility (orphaned files, path drift, OS filesystem limits). Encrypted binary blobs are opaque to MySQL — no indexing, no streaming — so the performance/streaming concerns are acknowledged but accepted.

**Trade-offs documented in:** `Docs/06-deployment/04-known-limitations-and-recommendations.md`.

### 7. DB Access Control
- Backend uses **two separate DB connection pools** with two separate MySQL users:
  - `app_dataentry_ro` — SELECT-only on `holcemlk_banker_dataentry`.
  - `app_images_rw` — SELECT/INSERT on `holcemlk_banker_images` (no UPDATE/DELETE on `customer_previous_images` or `audit_log`).
