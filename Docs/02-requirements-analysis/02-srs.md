# Software Requirements Specification (SRS)
## HolcemLK Banker — Customer Signature & Image Collection System

### 1. Functional Requirements

| ID | Requirement |
|---|---|
| FR-01 | Admin shall log in via the QR Generator App using bcrypt-verified credentials (`web_password`/`MobilePassword`); role must equal `1-Administrator`. |
| FR-02 | System shall reject login attempts using the legacy `UserPassword` field. |
| FR-03 | Admin shall generate a QR code embedding a signed, short-lived (≤15 min) one-time session token. |
| FR-04 | Backend shall mark a QR token as consumed immediately upon first successful validation; subsequent scans of the same token shall be rejected. |
| FR-05 | Bank Officer shall log in via the Collector App using bcrypt-verified credentials; role must equal `1-Bank Officer`. |
| FR-06 | Collector App shall scan the Admin's QR and submit the embedded token plus the officer's own access token to the backend for validation. |
| FR-07 | Backend shall issue a short-lived "unlock" session only after both tokens validate successfully. |
| FR-08 | Officer shall input/select a `CustomerID`; backend shall verify existence in `customerinformation` before permitting capture. |
| FR-09 | Officer shall capture a signature and/or photo; image shall be held in memory and uploaded directly via API — never saved to device gallery/local unencrypted storage. |
| FR-10 | Upload request shall require the valid unlock-session token; requests without it shall be rejected. |
| FR-11 | Backend shall store new images in `customer_images`; if an image of the same type already exists for that customer, the prior record shall be moved to `customer_previous_images` before insert (archival, not overwrite). |
| FR-12 | Backend shall apply visible and invisible watermarking (officer ID + timestamp) to each stored image. |
| FR-13 | Backend shall log every login, QR generation, QR scan, and image capture/replace event with user ID, timestamp, and IP/device fingerprint. |
| FR-14 | Backend shall trigger OTP verification (via `mobile_no`/`mobile_otp`) when a user logs in from a previously unseen device/IP. |
| FR-15 | Backend shall prevent concurrent active sessions for the same user account (`LogStatus` based invalidation of the older session). |
| FR-16 | Collector App shall queue captures securely (encrypted local storage) if network is unavailable, and upload automatically once connectivity is restored. |

### 2. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-01 | All client–backend communication shall use TLS (HTTPS), including on the local network. |
| NFR-02 | All stored passwords shall use bcrypt (cost ≥ 12) or argon2id; no reversible encryption for authentication credentials. |
| NFR-03 | All stored images shall be encrypted at rest (AES-256). |
| NFR-04 | Backend shall implement rate limiting and account lockout after repeated failed logins. |
| NFR-05 | Apps shall block screenshots/screen recording and detect rooted/jailbroken devices and emulators. |
| NFR-06 | Sessions (app-level) shall auto-expire after 5 minutes of inactivity. |
| NFR-07 | System shall not depend on any internet connectivity for core operation. |
| NFR-08 | System shall retain audit logs in a tamper-evident (append-only) manner. |
| NFR-09 | System shall comply with Sri Lanka's Personal Data Protection Act requirements for sensitive personal data (signatures/photos), including documented retention policy. |
| NFR-10 | Backend DB credentials for `holcemlk_banker_images` and `holcemlk_banker_dataentry` shall be separate, least-privilege accounts. |
