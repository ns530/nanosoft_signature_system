# Product Requirements Document (PRD)
## HolcemLK Banker — Customer Signature & Image Collection System

### 1. Vision
A secure, local-network system that lets bank branches digitally capture customer signatures and photographs, with capture strictly gated behind Admin-issued, one-time QR authorization — replacing manual/paper collection with a fully auditable digital flow.

### 2. Target Users
- **Bank Admin** — generates time-bound QR authorization sessions; sole authority to open a collection window.
- **Bank Officer (System User)** — authenticates, scans Admin's QR, looks up a customer, captures signature/photo, uploads securely.

### 3. Core Features
1. Role-based login (Admin app / Collector app) using existing `systemusers` bcrypt-hashed credentials (`MobilePassword`/`web_password`), never `UserPassword`.
2. Dynamic, one-time-use, short-lived QR session token generation (Admin app).
3. QR scan validation and session unlock (Collector app ↔ backend).
4. Customer lookup/verification against `customerinformation` before allowing capture.
5. Signature/photo capture, in-memory only, uploaded directly to backend (no local gallery save).
6. Encrypted image storage in `holcemlk_banker_images`, separate from `holcemlk_banker_dataentry`.
7. Visible + invisible watermarking of captured images (officer ID, timestamp).
8. Full audit trail of capture/replace events (`customer_previous_images`).
9. OTP step-up authentication for logins from a new device/IP.
10. Concurrent-login prevention per user account.

### 4. Out of Scope
- Modifying `customerinformation` / `systemusers` schemas.
- Any internet-facing access or public app-store release.
- Core transaction processing (loans, deposits, withdrawals).

### 5. Success Metrics
- 100% of captured images traceable to an authorized QR session and officer.
- 0 successful QR replay attempts in security testing.
- 100% of passwords verified via bcrypt-hashed fields only.
- All images encrypted at rest, verified in a storage audit.
