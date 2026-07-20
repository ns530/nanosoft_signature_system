---
epic: 6
story: 1
title: Audit Logging
status: draft
created: 2026-07-06
---

## Story Goal
Implement append-only audit logging across all system events — LOGIN, QR_GENERATED, QR_VALIDATED, IMAGE_CAPTURED, IMAGE_REPLACED — using the app_images_rw connection with no UPDATE/DELETE capability.

## Acceptance Criteria

1. **Append-Only Log Service (FR-13, NFR-08, AD-8)**
   - Given any auditable event
   - When calling `logEvent(eventType, userId, ipAddress, deviceFingerprint, detail)`
   - Then an INSERT is performed on the `audit_log` table via `imagesDb` (app_images_rw connection)
   - And no UPDATE or DELETE capability is provided by the service — only INSERT

2. **Login Events (FR-13)**
   - Given a successful login (Admin or Officer)
   - When `POST /api/auth/login` returns 200
   - Then a `LOGIN` event is logged with the user ID, IP, and device fingerprint

3. **Login Failure Events (FR-13)**
   - Given a failed login attempt
   - When `POST /api/auth/login` returns 401
   - Then a `LOGIN_FAILED` event is logged with the attempted username, IP, and device fingerprint

4. **QR Generation Events (FR-13)**
   - Given an Admin generates a QR
   - When `POST /api/admin/qr/generate` returns 200
   - Then a `QR_GENERATED` event is logged with admin_id and nonce
   - Field name: `payload.userId` (from access token's TokenPayload — Admin's userId)

5. **QR Validation Events (FR-13)**
   - Given a successful QR scan by an Officer
   - When `POST /api/officer/qr/validate` returns 200
   - Then a `QR_VALIDATED` event is logged with officer_id (from access token's userId) and nonce

6. **Image Capture Events (FR-13)**
   - Given a successful image upload
   - When `POST /api/officer/customer/:customerId/image` returns 201
   - Then an `IMAGE_CAPTURED` event is logged with officer_id (from unlock session's officer_id), customer_id, and image_type

7. **Image Replace Events (FR-13)**
   - Given an upload that replaces a previous image
   - When a row is moved from customer_images to customer_previous_images
   - Then an `IMAGE_REPLACED` event is logged with the same details plus the old image_id

8. **No Sensitive Data in Logs (checklist Section 6)**
   - Audit log entries must never include: raw passwords, full JWTs, raw image bytes, or complete request/response bodies
   - Only event type, user/role identifiers, timestamps, IP, device fingerprint, and event-specific context (nonce, customer_id, image_type)

## Implementation Tasks

1. Create `src/audit/auditLogService.ts` with:
   - `logEvent(eventType, userId, ipAddress, deviceFingerprint, detail)` — parameterized INSERT into audit_log via imagesDb (app_images_rw)
   - No export of UPDATE or DELETE functions

2. Wire into every event point:
   - `src/auth/authRouter.ts` — LOGIN (success/failure at login endpoint), LOGIN (OTP verify)
   - `src/qr/qrRouter.ts` — QR_GENERATED, QR_VALIDATED
   - `src/image/imageUploadService.ts` — IMAGE_CAPTURED, IMAGE_REPLACED

3. Field name verification: each call site must use the CORRECT JWT payload field based on which token type is in scope:
   - Access token payload uses `userId` (TokenPayload)
   - Unlock session token payload uses `officer_id` (UnlockSessionPayload)

## Verification Steps

1. Full journey test: login → QR generate → QR validate → image upload → verify all 5+ audit log entries exist
2. Confirm no UPDATE or DELETE functions exist in audit module
3. Confirm no password/JWT/image bytes appear in any log event

## Requirements Traceability

- **FR-13:** Log all auth, QR, and image events
- **NFR-08:** Append-only, tamper-evident
- **AD-8:** Append-only audit table, anomaly alerts
