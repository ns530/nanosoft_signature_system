# API Documentation
## HolcemLK Banker — Backend REST API

Base URL (local): `https://<local-server-ip>:PORT/api`
All endpoints require `Content-Type: application/json` unless noted, and all require TLS.

---

### POST /auth/login
Authenticates Admin or Officer.

**Request body:**
```json
{ "username": "string", "password": "string", "deviceFingerprint": "string" }
```
**Responses:**
- `200 OK` → `{ "accessToken": "jwt", "refreshToken": "jwt", "role": "1-Administrator|1-Bank Officer" }`
- `202 Accepted` → `{ "otpRequired": true, "otpRef": "string" }` (new device/IP)
- `401 Unauthorized` → invalid credentials
- `423 Locked` → account locked (too many failed attempts)

---

### POST /admin/qr/generate
**Auth:** Bearer Admin JWT

**Response `200 OK`:**
```json
{ "qrToken": "signed-jwt", "expiresAt": 1730000900 }
```
**Errors:** `401` (invalid/expired admin token), `403` (role ≠ Administrator)

---

### POST /officer/qr/validate
**Auth:** Bearer Officer JWT

**Request body:** `{ "qrToken": "signed-jwt-from-scan" }`

**Response `200 OK`:**
```json
{ "unlockToken": "jwt", "expiresAt": 1730001500 }
```
**Errors:** `401` (invalid officer token), `403` (role ≠ Bank Officer), `409` (QR already used), `410` (QR expired)

---

### GET /officer/customer/:customerId
**Auth:** Bearer Officer JWT + `X-Unlock-Token` header

**Response `200 OK`:**
```json
{ "customerId": "010100001", "customerName": "string", "exists": true }
```
**Errors:** `401` (missing/invalid unlock token), `404` (customer not found)

---

### POST /officer/customer/:customerId/image
**Auth:** Bearer Officer JWT + `X-Unlock-Token` header
**Content-Type:** `multipart/form-data`

**Form fields:** `imageType` (`signature`|`profile_picture`), `imageFile` (binary)

**Response `201 Created`:**
```json
{ "imageId": "uuid", "storedAt": "2026-07-01T09:00:00Z" }
```
**Errors:** `400` (invalid file type/size), `401` (missing/expired unlock token), `404` (customer not found), `500` (encryption/storage failure — no partial record persisted)

---

### General Error Format
```json
{ "error": { "code": "QR_EXPIRED", "message": "QR session has expired, please request a new one." } }
```

### Rate Limits
- `/auth/login`: 5 attempts / 15 min per username+IP, then temporary lockout.
- `/officer/qr/validate`: 10 requests / min per officer (defensive; not expected to be hit in normal use).
