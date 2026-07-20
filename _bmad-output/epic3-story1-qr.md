---
epic: 3
story: 1
title: QR Generation & Validation
status: complete
created: 2026-07-05
completed: 2026-07-06
note: This story file was created manually because the BMAD workflow commands (bmad-create-story / bmad-create-epics-and-stories) are multi-step guided workflows designed for full epic creation from scratch, not for adding individual known stories to an existing epics.md. Using them for a single known epic would require running the full interactive 4-step process, which is disproportionate when the requirements are already defined in epics.md.
---

## Story Goal
Implement QR session token generation (Admin-only) and QR token validation (Officer-only) with atomic one-time use enforcement, producing short-lived unlock sessions for image capture.

## Acceptance Criteria

1. **QR Session Generation (FR-03, AD-2, AD-11)**
   - Given an authenticated Admin user (role `1-Administrator`)
   - When calling `POST /api/admin/qr/generate`
   - Then a signed JWT is created with:
     - `nonce` (UUID v4)
     - `admin_id`
     - `iat` (issued at)
     - `exp` (expiry, 900 seconds = 15 min max)
   - And Redis key `qr:{nonce}` is set to `{"status":"pending","admin_id","created_at"}` with 900s TTL
   - And the signed token is returned to the client

2. **Unauthorized QR Generation Rejected**
   - Given a non-Admin user (Officer role or unauthenticated)
   - When calling `POST /api/admin/qr/generate`
   - Then 403 Forbidden is returned

3. **QR Validation — Success (FR-04, FR-06, FR-07, AD-2, AD-3)**
   - Given a valid pending QR token and an authenticated Officer JWT
   - When calling `POST /api/officer/qr/validate`
   - Then the QR JWT signature and `exp` are verified
   - And `Redis: qr:{nonce}` status is checked — must be `"pending"`
   - And the status is atomically transitioned to `"consumed"` with officer_id recorded
   - And a short-lived "unlock session" JWT is issued (10-min TTL)
   - And the unlock token is returned to the client

4. **QR Reuse Rejected (FR-04, AD-2)**
   - Given a QR token that has already been consumed
   - When calling `POST /api/officer/qr/validate` with the same token
   - Then 409 Conflict is returned with message `"QR already used"`

5. **QR Expiry Rejected (AD-2)**
   - Given a QR token whose JWT `exp` has passed
   - When calling `POST /api/officer/qr/validate`
   - Then 410 Gone is returned with message `"QR expired, request a new one"`

6. **TLS Enforcement (AD-11)**
   - All QR endpoints must be served via HTTPS (enforced by server.ts)
   - QR route handler does not need separate TLS logic

## Implementation Tasks

1. Create `src/qr/qrService.ts` with:
   - `generateQrSession(adminId: string): Promise<string>` — signs JWT with nonce, stores in Redis
   - `validateQrToken(qrToken: string, officerId: string): Promise<{ unlockToken: string }>` — verifies JWT, atomically consumes Redis key, issues unlock session JWT
   - Uses `redisConnection` wrapper methods (get/set/del) from Epic 1/2 — never raw `getClient()`
   - Uses `jwt` from `jsonwebtoken` for signing tokens

2. Create `src/qr/qrRouter.ts` with:
   - `POST /api/admin/qr/generate` — requires Admin role via `authenticateToken` + `requireRole('1-Administrator')`
   - `POST /api/officer/qr/validate` — requires Officer role via `authenticateToken` + `requireRole('1-Bank Officer')`

3. Wire QR routes into `src/server.ts`:
   - Add `app.use('/api', qrRouter)` alongside existing auth routes

## Verification Steps

1. Admin login → generate QR → receive signed token
2. Officer login → validate same QR → receive unlock session token
3. Re-submit same QR → receive 409 "QR already used"
4. Submit expired QR JWT → receive 410 "QR expired"
5. Non-Admin requests QR generation → receive 403

## Open Questions

1. Unlock session upload cap (per AD-3, default 5) — **RESOLVED**: Tracked in Redis key `unlock:{nonce}` with field `uploads_used`. JWT carries no mutable counter. Epic 5's upload endpoint must call `consumeUploadSlot(nonce)` which atomically increments `uploads_used` via Lua EVAL and returns false if the cap is reached. Implemented in qrService.ts as `consumeUploadSlot()` - ready for Epic 5 to consume.

2. Should the unlock session token be bound to a specific CustomerID? Per AD-3, provisionally "not customer-bound" — the unlock session allows the officer to look up and capture for any customer within the 10-min window. Confirm with business analyst if this needs tightening.

## Requirements Traceability

- **FR-03:** QR generation with signed short-lived token
- **FR-04:** One-time consumption, reject reuse
- **FR-06:** Officer scans QR, submits token + own JWT
- **FR-07:** Unlock session issued after validation
- **AD-2:** Atomic pending→consumed in Redis
- **AD-3:** Unlock session TTL, upload cap
- **AD-11:** TLS for all endpoints

## Verification Status

- `npx tsc --noEmit`: 0 errors (confirmed)
- Source code patterns verified via `Select-String`:
  - `return {-1, decoded.status}` — present (line 47)
  - `return {0, decoded.status}` — absent (old bug pattern removed)
  - `success === -1) return false` — present (line 62)
  - `newCount <=` — absent (old JS check removed)
- `consumeUploadSlot()` control-flow logic tested via real function call against a faithful mock of the Lua script's behavior (6 sequential calls, all PASS)
- **Pre-production item:** Actual Lua EVAL syntax/cjson correctness has NOT been tested against a live Redis instance. Integration test needed before production deployment. See memlog.md entry 15.