# Use Cases & User Stories
## HolcemLK Banker — Customer Signature & Image Collection System

### 1. User Stories

**Admin**
- As an Admin, I want to log in securely with my bcrypt-verified credentials, so that only authorized administrators can access the QR generation function.
- As an Admin, I want to generate a one-time, short-lived QR code, so that image collection can only happen within a controlled, time-bound window.
- As an Admin, I want to see which QR sessions are currently active/used, so that I can monitor collection activity.
- As an Admin, I want to be notified of anomalous login attempts (new IP/device), so that I can detect potential account compromise.

**Bank Officer**
- As a Bank Officer, I want to log in securely with my own credentials, so that my actions are individually attributable.
- As a Bank Officer, I want to scan the Admin's QR code, so that I can unlock the ability to capture customer data.
- As a Bank Officer, I want to search for a customer by CustomerID, so that I capture the image against the correct record.
- As a Bank Officer, I want to capture a signature/photo and upload it immediately, so that no unencrypted copy is left on my device.
- As a Bank Officer, I want the app to queue my capture securely if the network drops, so that I don't lose work or leak data locally.

### 2. Use Case Diagram (textual description)

**Actors:** Admin, Bank Officer, Backend System

**Use Cases:**
1. Admin Login
2. Generate QR Session (extends: Admin Login)
3. Officer Login
4. Scan QR Session (includes: Validate QR Token)
5. Lookup Customer (includes: Validate CustomerID)
6. Capture & Upload Image (includes: Validate Unlock Session, Encrypt & Store, Watermark, Archive Previous Image, Audit Log)
7. View Audit Log (Admin only)

**Relationships:**
- Officer → Scan QR Session → Backend (includes Validate QR Token)
- Officer → Capture & Upload Image → Backend (includes Validate Unlock Session)
- Admin → Generate QR Session → Backend
- Backend → Audit Log → (triggered by all above use cases)

*(Recommend rendering this as a formal UML use-case diagram in draw.io/Lucidchart during the Design phase.)*
