# Low-Level Design (LLD)
## QR Generation & Validation, and Image Upload Modules

### 1. QR Generation (Admin App → Backend)
**Endpoint:** `POST /api/admin/qr/generate` (requires Admin JWT)

**JWT QR payload structure:**
```json
{
  "type": "qr_session",
  "admin_id": "01",
  "nonce": "uuid-v4",
  "iat": 1730000000,
  "exp": 1730000900
}
```
**Steps:**
1. Verify Admin JWT + role == `1-Administrator`.
2. Generate `nonce` (UUID v4).
3. Sign payload with server secret → `qr_token`.
4. Store `Redis: qr:{nonce} = {status: "pending", admin_id, created_at}` with TTL = 900s (15 min).
5. Return `qr_token` to app; app renders as QR image.

### 2. QR Validation (Collector App → Backend)
**Endpoint:** `POST /api/officer/qr/validate` (requires Officer JWT + qr_token in body)

**Steps:**
1. Verify Officer JWT + role == `1-Bank Officer`.
2. Verify `qr_token` signature and `exp`.
3. Look up `Redis: qr:{nonce}`. If missing or `status != "pending"` → reject (expired/already used).
4. Set `Redis: qr:{nonce}.status = "consumed"`, record `officer_id`, `consumed_at`.
5. Issue **unlock-session** JWT (short-lived, e.g. 10 min): `{type: "unlock_session", officer_id, admin_id, nonce, exp}`.
6. Write audit log: `QR_VALIDATED`.

**Error paths:**
- Expired token → `410 Gone`, message "QR expired, request a new one."
- Already consumed → `409 Conflict`, message "QR already used."
- Signature invalid → `401 Unauthorized`.

### 3. Image Upload (Collector App → Backend)
**Endpoint:** `POST /api/officer/customer/:customerId/image` (requires unlock-session token in header)

**Steps:**
1. Verify unlock-session JWT validity and `exp`.
2. Verify `customerId` exists in `customerinformation` (dataentry DB).
3. Validate image (magic-byte check, size limit, allowed type: signature/profile_picture).
4. If existing `customer_images` row for `(customer_id, image_type)` exists → copy it into `customer_previous_images` (archival).
5. Encrypt image (AES-256-GCM) → write to encrypted file store; DB stores path + hash.
6. Apply watermark (officer_id + timestamp) via `sharp` before encryption.
7. Insert new row into `customer_images`.
8. Write audit log: `IMAGE_CAPTURED`.
9. Invalidate unlock-session (single use for upload, or allow N uploads within its short TTL — decision to confirm with Business Analyst).

**Error paths:**
- Missing/expired unlock session → `401 Unauthorized`.
- CustomerID not found → `404 Not Found`.
- Invalid file type/size → `400 Bad Request`.
- Encryption/storage failure → `500`, no partial DB record committed (transaction rollback).

### 4. Redis Key Structure Summary
| Key pattern | Purpose | TTL |
|---|---|---|
| `qr:{nonce}` | QR session state | 15 min |
| `unlock:{nonce}` | Unlock session state (if tracked separately) | 10 min |
| `session:{user_id}` | Active session for concurrent-login control | Session lifetime |
| `ratelimit:{user_id or ip}` | Failed-login counters | Rolling window |
