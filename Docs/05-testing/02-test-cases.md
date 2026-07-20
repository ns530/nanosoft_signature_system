# Test Cases
## HolcemLK Banker — Customer Signature & Image Collection System

| TC ID | Title | Precondition | Steps | Expected Result |
|---|---|---|---|---|
| TC-AUTH-01 | Valid Admin login | Admin account exists, bcrypt password set | POST /auth/login with correct credentials | 200 OK, JWT returned, role = 1-Administrator |
| TC-AUTH-02 | Login rejected via legacy UserPassword | Account has UserPassword ≠ MobilePassword | Attempt login using UserPassword value | 401 Unauthorized — legacy field never checked |
| TC-AUTH-03 | Valid Officer login | Officer account exists | POST /auth/login with correct credentials | 200 OK, JWT returned, role = 1-Bank Officer |
| TC-AUTH-04 | OTP challenge on new device | User has no prior session from this deviceFingerprint | Login from new device | 202 Accepted, otpRequired = true; login completes only after correct OTP |
| TC-AUTH-05 | Concurrent login invalidation | User already logged in on Device A | Log in same user on Device B | Device A session invalidated; Device A's next request returns 401 |
| TC-QR-01 | QR generation | Admin logged in | POST /admin/qr/generate | 200 OK, qrToken + expiresAt returned (~15 min out) |
| TC-QR-02 | QR reuse rejected | QR token already validated once | Submit same qrToken to /officer/qr/validate again | 409 Conflict "QR already used" |
| TC-QR-03 | QR expiry rejected | QR token older than 15 min | Submit expired qrToken | 410 Gone "QR expired" |
| TC-QR-04 | Valid QR scan → unlock session | Fresh, unused QR token; valid Officer JWT | POST /officer/qr/validate | 200 OK, unlockToken returned |
| TC-CUST-01 | Customer lookup success | Valid unlock session; existing CustomerID | GET /officer/customer/:id | 200 OK, customer basic info returned |
| TC-CUST-02 | Customer lookup — not found | Valid unlock session; non-existent CustomerID | GET /officer/customer/:id | 404 Not Found |
| TC-API-01 | Upload blocked without unlock session | No unlock token in request | POST image upload without X-Unlock-Token header | 401 Unauthorized |
| TC-API-02 | Upload succeeds with valid session | Valid unlock session, valid CustomerID, valid image | POST image upload | 201 Created, imageId returned; row in customer_images |
| TC-DB-01 | Replace archives previous image | Existing image for customer/type | Upload a new image for same customer/type | Old row moved to customer_previous_images; new row in customer_images |
| TC-IMG-01 | Watermark applied | Valid upload | Retrieve stored (decrypted, for test only) image | Officer ID + timestamp visibly and invisibly watermarked |
| TC-APP-01 | No gallery save on capture | Officer captures image in app | Check device gallery/local storage after capture | No image file present outside app's encrypted in-memory/queue handling |
| TC-APP-02 | Offline queue and auto-upload | Device offline during capture | Capture image while offline, then restore network | Image queued securely, then uploaded automatically once online, status updates to "success" |
| TC-APP-03 | Screenshot blocked | App open on capture/login screen | Attempt to take a screenshot | Screenshot blocked / blank capture returned by OS |
| TC-APP-04 | Idle session timeout | User logged in, app idle 5+ min | Wait 5 minutes without interaction | App auto-logs-out, returns to login screen |
