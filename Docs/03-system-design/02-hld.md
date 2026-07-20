# High-Level Design (HLD)
## HolcemLK Banker — Customer Signature & Image Collection System

### Module 1: Auth Module
- **Responsibility:** Login (Admin/Officer), password verification (bcrypt), JWT issuance, RBAC middleware, OTP step-up, concurrent-login control.
- **Input:** username, password, device fingerprint, IP.
- **Output:** JWT access token, refresh token, or OTP challenge.
- **Data touched:** `systemusers` (dataentry DB, read), Redis (session tracking).

### Module 2: QR Module
- **Responsibility:** Generate signed one-time QR session tokens (Admin), validate QR + Officer token pair, issue unlock session.
- **Input:** Admin JWT (generate); QR token + Officer JWT (validate).
- **Output:** QR payload (generate); unlock-session token (validate).
- **Data touched:** Redis (token state, one-time enforcement).

### Module 3: Customer Lookup Module
- **Responsibility:** Verify CustomerID exists before allowing capture.
- **Input:** CustomerID, valid unlock session.
- **Output:** Customer existence confirmation (minimal fields only — no unnecessary PII exposure to the app).
- **Data touched:** `customerinformation` (dataentry DB, read-only).

### Module 4: Image Upload Module
- **Responsibility:** Receive image, verify unlock session, encrypt, watermark, archive prior image, store record.
- **Input:** image binary/base64, CustomerID, image_type, unlock-session token.
- **Output:** Success/failure, stored image_id.
- **Data touched:** `customer_images`, `customer_previous_images` (images DB, write).

### Module 5: Audit Module
- **Responsibility:** Append-only logging of all auth, QR, and image events.
- **Input:** Event type, user_id, timestamp, IP/device, related entity id.
- **Output:** Audit record; anomaly alerts to Admin for unusual IP/device patterns.
- **Data touched:** Dedicated audit log table (images DB or separate logging store).

### Data Flow Summary
Auth Module → issues tokens consumed by QR Module and Image Upload Module → QR Module gates access to Customer Lookup and Image Upload Modules → every module writes to Audit Module. `holcemlk_banker_dataentry` is read-only from this system's perspective (except audit references); `holcemlk_banker_images` is the only database this system writes customer image data into.
