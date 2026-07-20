---
epic: 7
story: 1
title: QR Generator App (Flutter)
status: complete
created: 2026-07-06
completed: 2026-07-07
note: freerasp API verified against actual resolved package (6.12.0) via flutter analyze.
      The real API was significantly different from documentation assumed earlier —
      onMultiInstance, onLocationSpoofing, onTimeSpoofing, onUnsecureWifi, onAutomation
      callbacks and killOnBypass config flag are 8.x-only features not available in 6.12.0.
      Root/jailbreak (onPrivilegedAccess) and emulator (onSimulator) detection confirmed.
      Flutter SDK upgrade to 3.44.x+ recommended before production for freerasp 8.x.
---

## Story Goal
Flutter app for Admin users: login with OTP support, QR code generation with countdown timer, session history view.

## Acceptance Criteria

1. **Login Screen (FR-01 UI)**
   - Username/password fields
   - Calls POST /api/auth/login with { username, password, deviceFingerprint }
   - Handles 200 response: stores accessToken, refreshToken, sessionToken in flutter_secure_storage
   - Handles 202 response: navigates to OTP screen with otpToken from response
   - Handles 401/403/429: shows inline error message

2. **OTP Screen**
   - 6-digit OTP input field
   - Calls POST /api/auth/otp/verify with { otpToken, otp }
   - On success: stores tokens, navigates to QR screen

3. **QR Generation Screen (FR-03 UI)**
   - Button Generate New QR Session
   - Calls POST /api/admin/qr/generate with Authorization: Bearer <accessToken>
   - Displays QR code from qrToken value in response { qrToken, expiresIn }
   - Countdown timer from expiresIn seconds
   - States: generating (spinner), active (QR + countdown), expired (greyed)

4. **Session History Screen** - Scaffold only (deferred)

5. **Security (NFR-05)**
   - flutter_secure_storage for all tokens
   - Android: FLAG_SECURE via MainActivity.kt window.setFlags()
   - iOS: Screenshot detection not implemented (see Platform Gaps)
   - Root/jailbreak/emulator detection via freerasp
   - 5-minute idle session timeout to login screen

## Platform Gaps
- iOS screenshot blocking: No direct equivalent of FLAG_SECURE. iOS can only detect screenshots (UIApplication.userDidTakeScreenshotNotification) or add blur overlay on app-switcher entry (willResignActive). Both require Swift/Obj-C native code not yet written. Android is fully protected.

## Implementation Tasks
1. Flutter project structure (flutter create)
2. Dependencies: flutter_secure_storage, http, qr_flutter, freerasp
3. Screens: login, otp, qr_generate, session_history
4. Wire auth service (field names verified against authRouter.ts)
5. Wire QR service (field names verified against qrRouter.ts)
6. Root/jailbreak detection via freerasp startup check
7. Android FLAG_SECURE via MainActivity.kt

## Requirements Traceability
- FR-01 (UI): Admin login screen
- FR-03 (UI): QR generation with countdown
- NFR-05: Screenshot blocking (Android only), secure storage, idle timeout
