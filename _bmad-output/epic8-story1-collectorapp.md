---
epic: 8
story: 1
title: Collector App (Flutter)
status: draft
created: 2026-07-07
---

## Story Goal
Flutter app for Bank Officers: login, QR scan, customer lookup, image capture, upload with offline queue.

## Screens & Requirements

1. **Login (FR-05 UI)** — same pattern as Admin app, uses POST /api/auth/login
2. **Scan QR (FR-06 UI)** — camera-based scanner via mobile_scanner, reads qrToken, calls POST /api/officer/qr/validate, transitions to customer lookup on success
3. **Customer Lookup (FR-08 UI)** — CustomerID input, calls GET /api/officer/customer/:customerId with X-Unlock-Token header, shows customer name
4. **Capture (FR-09 UI)** — camera capture, in-memory only (no gallery/save button exposed)
5. **Upload Status (FR-16)** — uploads immediately if online, queues encrypted via flutter_secure_storage if offline
6. **Security (NFR-05)** — freerasp root/jailbreak detection, FLAG_SECURE, 5-min idle timeout

## Implementation Tasks
1. `flutter create --org com.holcemlk collector_app` (done)
2. `flutter pub add flutter_secure_storage http mobile_scanner freerasp` (done)
3. Screens: login, scan_qr, customer_lookup, capture, upload_status
4. Services: auth_service, qr_service, customer_service, capture_service, offline_queue_service
5. Root/jailbreak detection via freerasp 6.12.0 (verified via real resolved package)
6. Android FLAG_SECURE via MainActivity.kt
7. IOS screenshot blocking deferred (same gap as Epic 7)

## Verification
- flutter analyze: 0 errors
- Each API call field verified against actual backend route files
- No gallery/local unencrypted storage in capture flow
- Offline queue uses flutter_secure_storage only
