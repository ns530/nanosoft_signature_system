# Build & Setup Guide
## HolcemLK Banker — Customer Signature & Image Collection System

### 1. Prerequisites
- Node.js LTS (18.x or later)
- MySQL 8.x (two databases: `holcemlk_banker_dataentry`, `holcemlk_banker_images`)
- Redis 6.x or later
- Flutter SDK (stable channel) + Android Studio / Xcode for builds
- OpenSSL (for generating local self-signed TLS certs)

### 2. Environment Variables (.env.example)
```
# Server
PORT=8443
NODE_ENV=development

# TLS
TLS_CERT_PATH=./certs/server.crt
TLS_KEY_PATH=./certs/server.key

# DB - dataentry (read-only app user)
DATAENTRY_DB_HOST=127.0.0.1
DATAENTRY_DB_NAME=holcemlk_banker_dataentry
DATAENTRY_DB_USER=app_dataentry_ro
DATAENTRY_DB_PASSWORD=__set_locally__

# DB - images (read/write app user)
IMAGES_DB_HOST=127.0.0.1
IMAGES_DB_NAME=holcemlk_banker_images
IMAGES_DB_USER=app_images_rw
IMAGES_DB_PASSWORD=__set_locally__

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# Auth
JWT_SECRET=__set_locally_min_32_chars__
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
QR_TOKEN_EXPIRY_SECONDS=900

# Encryption
IMAGE_ENCRYPTION_KEY=__set_locally_32_byte_key__
```
*(Never commit a filled-in `.env`. Store real secrets in a local secrets file or OS-level secret manager.)*

### 3. Generate Local Self-Signed TLS Certificate
```bash
openssl req -x509 -nodes -newkey rsa:2048 \
  -keyout certs/server.key -out certs/server.crt \
  -days 365 -subj "/CN=holcemlk-backend.local"
```
Distribute `server.crt` to Admin/Officer devices as a trusted certificate (or configure apps to pin it) so TLS validation succeeds on the local network.

### 4. Run Backend Locally
```bash
cd backend
npm install
npm run db:migrate   # creates customer_images, customer_previous_images, audit_log tables
npm run dev           # starts HTTPS server on $PORT
```

### 5. Run Flutter Apps Against Local Backend
```bash
cd apps/qr-generator-app
flutter pub get
flutter run --dart-define=API_BASE_URL=https://<server-lan-ip>:8443/api

cd apps/collector-app
flutter pub get
flutter run --dart-define=API_BASE_URL=https://<server-lan-ip>:8443/api
```
Ensure the device/emulator is on the same LAN/subnet as the backend host, and has the self-signed cert trusted (or certificate pinning configured to accept it).

### 6. Verify Setup
- Hit `GET /api/health` (no auth) → should return `200 OK`.
- Attempt Admin login with a seeded test account → should receive JWT.
- Generate a QR, scan with a test Officer account → should receive unlock token.
