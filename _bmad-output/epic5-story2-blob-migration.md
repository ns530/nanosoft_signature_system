---
epic: 5
story: 2
title: BLOB Storage Migration (Image Storage Destination)
status: complete
created: 2026-07-07
completed: 2026-07-07
supersedes: epic5-story1-upload (partial — only storage destination changes; all other Epic 5 scope remains)
verified_via: full raw file content + timestamp cross-check after revert action confirmed no fabrication
---

## Story Goal
Migrate image storage from encrypted-file-on-disk to encrypted-BLOB-in-database, per Project Owner requirement (2026-07-07). Only the storage destination changes — encryption, watermarking, transaction logic, and API remain identical.

## Acceptance Criteria

1. **customer_images.image_data (LONGBLOB) replaces storage_path**
   - Given a successfully encrypted image buffer
   - When inserting into `customer_images`
   - Then the AES-256-GCM encrypted binary (`encrypted` buffer from `encryptImage()`) is stored directly in the `image_data` LONGBLOB column
   - And `storage_path` is no longer written to or read from
   - Per DB design Docs/03-system-design/04-database-design.md §2 (revised 2026-07-07)

2. **customer_previous_images.old_image_data (LONGBLOB) replaces old_storage_path**
   - Given an existing image being archived during a replace
   - When inserting into `customer_previous_images`
   - Then the encrypted binary is stored in `old_image_data`
   - And `old_storage_path` is no longer written to or read from
   - Per DB design Docs/03-system-design/04-database-design.md §3 (revised 2026-07-07)

3. **Archive-before-insert transaction (AD-12) unchanged**
   - The same `Sequelize.transaction()` pattern from `handleArchiveInsert()` continues to work
   - Only the column names change: `storage_path` → `image_data`, `old_storage_path` → `old_image_data`
   - Atomicity (rollback on failure) preserved exactly as-is

4. **writeEncryptedFile() removed**
   - src/image/imageUploadService.ts's `writeEncryptedFile()` function is deleted
   - No more `fs.writeFileSync` / `fs.promises.writeFile` for image data anywhere in the upload pipeline
   - The `uploads/` directory and its creation logic are removed
   - `fs` import removed from imageUploadService.ts (no longer needed)

5. **Encryption logic unchanged**
   - `encryptImage()` continues producing AES-256-GCM output with the same key from `keyManagement.ts`
   - `watermark → encrypt → store` pipeline order unchanged
   - Key management, IV generation, auth tag handling identical

6. **Migration note for existing test data**
   - No production data exists at this stage (greenfield project).
   - If test images were stored via `writeEncryptedFile()` during development, they remain as files in `uploads/` directory and can be manually archived or deleted.
   - A future migration script (out of scope) could re-insert orphaned file-based images into the BLOB column if needed.

## Implementation Tasks

1. **`src/image/imageUploadService.ts`:**
   - Remove `writeEncryptedFile()` function entirely (lines ~158-170 in current file)
   - Remove `fs` import (no longer needed)
   - Remove `UPLOAD_DIR` constant
   - Update `handleArchiveInsert()`:
     - Change `INSERT INTO customer_images (...) storage_path, file_hash` to `image_data, file_hash`
     - Change `INSERT INTO customer_previous_images (...) old_storage_path, old_file_hash` to `old_image_data, old_file_hash`
     - Accept the encrypted `Buffer` as a parameter instead of `storagePath: string` and `fileHash: string`
   - Update `processImageUpload()`:
     - Remove the call to `writeEncryptedFile()`
     - Pass the `encrypted` buffer directly to `handleArchiveInsert()`

2. No changes needed to: `imageUploadRouter.ts`, `server.ts`, encryption pipeline, watermarking, magic-byte validation, consumeUploadSlot, or any other module.

## Verification Steps

1. Build passes: `npx tsc --noEmit` reports 0 errors
2. Upload flow still works end-to-end: same HTTP request → same response; only the storage destination changes
3. Verify `writeEncryptedFile()` is no longer exported from any module
4. Verify `fs` is no longer imported in `imageUploadService.ts`
5. Verify `handleArchiveInsert` SQL uses `image_data` and `old_image_data` column names

## Requirements Traceability

- **FR-11:** Archive-before-insert (unchanged)
- **AD-5 (revised 2026-07-07):** BLOB storage, not file-store
- **AD-12:** Archive-insert atomicity (unchanged)
- **Docs/03-system-design/04-database-design.md §2, §3:** Revised column definitions
- **Docs/06-deployment/04-known-limitations-and-recommendations.md:** Trade-offs documented

## Open Questions

1. LONGBLOB capacity: Max 4GB per row. With ~500KB per encrypted image, this allows ~8,000 images per row before approaching limits. Acceptable.
2. Backup strategy: Single `mysqldump` now captures both metadata and encrypted blobs. No separate filesystem backup needed for images. This is a simplification, not a concern.
3. Streaming reads: Not applicable — images are always read in full (decrypt → return to client or replace). Chunked reads are not part of the protocol.
