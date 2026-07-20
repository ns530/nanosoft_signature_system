# UI/UX Design Guide & Wireframes (Text Description)
## HolcemLK Banker — Customer Signature & Image Collection System

### QR Generator App (Admin)

**Screen 1 — Login**
- Fields: Username, Password. Button: "Login".
- States: default, loading (spinner on button), error (inline message: "Invalid credentials"), OTP-required (redirect to OTP screen if new device/IP).

**Screen 2 — OTP Verification (conditional)**
- Field: 6-digit OTP input. Button: "Verify". Resend-OTP link (rate-limited).

**Screen 3 — Generate QR**
- Button: "Generate New QR Session".
- Displays: QR code image, countdown timer (15:00 → 0:00), status badge ("Active" / "Used" / "Expired").
- States: generating (spinner), active (QR + countdown), consumed (green "Scanned by [Officer Name] at [time]"), expired (greyed QR, "Generate New" button re-enabled).

**Screen 4 — Recent Sessions (Audit view)**
- List: QR sessions generated today, status, which officer consumed it, timestamp.

---

### Collector App (Bank Officer)

**Screen 1 — Login**
- Same pattern as Admin login (Username/Password → OTP if new device).

**Screen 2 — Scan QR**
- Full-screen camera viewfinder with scan target overlay.
- States: scanning (default), validating (spinner overlay "Validating session..."), success (green checkmark, auto-navigate to Customer Lookup), error ("QR expired" / "QR already used" / "Invalid QR" with a "Try Again" button).

**Screen 3 — Customer Lookup**
- Field: CustomerID input (or scan customer ID barcode if available).
- Button: "Find Customer".
- States: found (shows customer name + masked NIC for confirmation, "Proceed to Capture" button), not found (error message, no proceed option).

**Screen 4 — Capture**
- Tabs/toggle: "Signature" / "Profile Photo".
- Camera/signature-pad capture area.
- Button: "Retake" and "Upload".
- Important: no gallery/save option exposed — capture is immediately held in memory only.

**Screen 5 — Upload Status**
- States: uploading (progress indicator), success ("Image securely uploaded and encrypted"), offline-pending ("No connection — saved securely, will upload automatically", with a small lock icon indicating encrypted local queue), failed (retry button).

**Screen 6 — Session Timeout Modal**
- Triggered after 5 min idle: "Session expired for security. Please log in again." → returns to Login screen.

### Design Principles
- No sensitive data (passwords, raw images) ever rendered as plain text or cached to visible storage.
- Every screen that can fail (QR scan, upload) has an explicit, distinct error state — never a silent failure.
- Countdown timers visible wherever a token/session has limited validity, to set correct user expectations.
