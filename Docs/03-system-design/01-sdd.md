# System Design Document (SDD)
## HolcemLK Banker — Customer Signature & Image Collection System

### 1. Architecture Style
Client–server architecture, single Node.js backend serving two Flutter mobile clients, with two logically and physically separated MySQL databases, plus Redis for ephemeral QR/session state. Entire system runs on an isolated local network (no internet egress required).

### 2. Major Components
| Component | Responsibility |
|---|---|
| Node.js Backend (ORM) | Auth, RBAC, QR issuance/validation, customer lookup, image encryption/watermark/storage, audit logging |
| holcemlk_banker_dataentry (MySQL) | `customerinformation`, `systemusers` — existing, fixed schema |
| holcemlk_banker_images (MySQL) | `customer_images`, `customer_previous_images` — new, flexible schema |
| Redis | One-time QR session tokens, concurrent-login session tracking, rate-limit counters |
| QR Generator App (Flutter) | Admin login, QR display |
| Collector App (Flutter) | Officer login, QR scan, customer lookup, capture, secure offline queue |

### 3. Component Interaction Overview
1. Admin authenticates → backend issues Admin JWT.
2. Admin requests QR → backend creates signed one-time token, stores state in Redis, returns to app as QR payload.
3. Officer authenticates → backend issues Officer JWT.
4. Officer scans QR → app sends {QR token, Officer JWT} to backend `/qr/validate`.
5. Backend validates both, marks QR token consumed in Redis, issues short-lived "unlock" session.
6. Officer looks up CustomerID → backend validates against `customerinformation` (dataentry DB).
7. Officer captures image → uploads to backend with unlock-session header.
8. Backend validates unlock session, encrypts + watermarks image, archives any prior image, stores in `holcemlk_banker_images`, writes audit log entry.

### 4. Technology Stack
- **Backend:** Node.js, Express, Sequelize/Prisma ORM, bcrypt, jsonwebtoken, sharp (watermarking), Redis client
- **DB:** MySQL (both databases)
- **Mobile:** Flutter (Dart), flutter_secure_storage, mobile_scanner/qr_code_scanner, flutter_windowmanager
- **Transport:** HTTPS/TLS via internal self-signed CA

### 5. Security Architecture Summary
- TLS on all connections, including LAN-internal.
- Passwords verified only via bcrypt-hashed `MobilePassword`/`web_password`.
- QR tokens: signed JWT, short expiry, single-use (Redis-enforced).
- Images encrypted at rest (AES-256), stored with path reference in DB, watermarked.
- Two DB connections with separate least-privilege credentials.
- OTP step-up on new device/IP; concurrent-login invalidation; full audit trail.
