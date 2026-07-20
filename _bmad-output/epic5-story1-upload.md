---
epic: 5
story: 1
title: Image Upload & Encryption
status: complete
created: 2026-07-06
completed: 2026-07-06
note: Critical bug found during review — verifyUnlockSession() read payload.userId instead of payload.officer_id (watermark, filename, and collected_by would all have been "undefined"). Fixed: UnlockSessionPayload added to jwtService.ts as single source of truth, imported by all consumers. Retroactive fix also applied to Epic 4's customerLookupService.ts (same bug, same fix).
---

## Story Goal
Implement secure image upload with unlock-session gating, upload-cap enforcement, magic-byte validation, visible+invisible watermarking, AES-256-GCM encryption, archive-before-insert with transaction rollback, and encrypted file storage (path + hash in DB, never raw image bytes).

## Acceptance Criteria

1. **Unlock Session Required (FR-10)**
   - Given a request without a valid X-Unlock-Token header
   - When calling `POST /api/officer/customer/:customerId/image`
   - Then 401 Unauthorized is returned

2. **Upload Cap Enforced (AD-3)**
   - Given an unlock session that has reached its upload limit (5)
   - When calling the upload endpoint
   - Then `consumeUploadSlot(nonce)` returns false, and 429 Too Many Requests is returned

3. **File Type Validation via Magic Bytes**
   - Given an uploaded file
   - When processing the image
   - Then the first bytes are checked against known magic byte signatures (JPEG ff d8 ff, PNG 89 50 4e 47, etc.)
   - And 400 Bad Request is returned if the signature does not match, regardless of filename extension or MIME header

4. **Watermark Applied Before Encryption (FR-12, AD-6)**
   - Given a valid image buffer
   - Before encryption
   - Then `sharp` applies visible text overlay (officer_id + timestamp)
   - And invisible watermark is embedded via metadata or steganography technique

5. **Encrypted Before Disk Write (FR-06, AD-5)**
   - Given the watermarked image buffer
   - When storing the image
   - Then AES-256-GCM encryption is applied before any file write
   - And no unencrypted temp file exists at any point during the upload process — the buffer flows in-memory: multipart → magic-byte check → watermark (sharp) → encrypt → disk write

6. **Archive-Before-Insert with Transaction (FR-11, AD-12)**
   - Given an existing customer_images row for (customer_id, image_type)
   - When inserting a new image for the same customer/type
   - Then the old row is moved to customer_previous_images (archival)
   - And the new row is inserted into customer_images
   - Both operations are wrapped in a single Sequelize transaction
   - If any step fails, the entire transaction is rolled back — never leaving orphaned/duplicate records
   - If no existing row exists, skip archival and just insert

7. **Storage: Path + Hash Only in DB (AD-5)**
   - After encryption, the encrypted file is written to the filesystem
   - DB stores only: storage_path (path to encrypted file) + file_hash (SHA-256 of encrypted bytes)
   - Never store raw image bytes in the customer_images table

## Implementation Tasks

1. Create `src/image/imageUploadService.ts`:
   - `verifyUnlockSession(token)` — reuse Epic 4 pattern, check type === 'unlock_session'
   - `consumeUploadSlot(nonce)` — call from Epic 3's qrService
   - `validateMagicBytes(buffer)` — check JPEG/PNG signatures
   - `applyWatermark(buffer, officerId)` — sharp visible overlay + metadata
   - `encryptImage(buffer)` — AES-256-GCM using key from keyManagement.ts
   - `handleArchiveInsert(customerId, imageType, collectedBy, ...)` — Sequelize transaction wrapping archive + insert
   - `writeEncryptedFile(buffer)` — write to filesystem, return path + hash

2. Create `src/image/imageUploadRouter.ts`: POST /api/officer/customer/:customerId/image

3. Wire into server.ts

## Verification Steps

1. Missing unlock token → 401
2. Valid unlock session + valid image → 201 + imageId
3. Same customer/type uploaded twice → old record archived, new inserted
4. Invalid file type → 400
5. Exceed upload cap (6th upload) → 429
6. Mid-transaction failure → rollback confirmed, no orphaned records

## Requirements Traceability

- **FR-09:** Capture in memory, never device gallery
- **FR-10:** Unlock session required for upload
- **FR-11:** Archive before insert
- **FR-12:** Watermarking
- **FR-16:** Offline queue (app-side — not in backend)
- **AD-3:** Upload cap via consumeUploadSlot
- **AD-5:** AES-256-GCM, path+hash in DB
- **AD-6:** Sharp watermark before encryption
- **AD-12:** Atomic archive-insert transaction
- **NFR-03:** Images encrypted at rest
