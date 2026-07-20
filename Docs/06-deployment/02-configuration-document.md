# Configuration Document
## HolcemLK Banker — Customer Signature & Image Collection System

### 1. Environment Variables (production — values set locally, never in Git)
Same variable names as the Build & Setup Guide `.env.example` (`PORT`, `TLS_CERT_PATH`, `TLS_KEY_PATH`, `DATAENTRY_DB_*`, `IMAGES_DB_*`, `REDIS_*`, `JWT_SECRET`, `JWT_ACCESS_EXPIRY`, `JWT_REFRESH_EXPIRY`, `QR_TOKEN_EXPIRY_SECONDS`, `IMAGE_ENCRYPTION_KEY`). Store the filled `.env` only on the host filesystem with restricted OS permissions (readable by the service account only).

### 2. MySQL User/Grant Setup
```sql
-- Dataentry: read-only
CREATE USER 'app_dataentry_ro'@'localhost' IDENTIFIED BY '<strong-password>';
GRANT SELECT ON holcemlk_banker_dataentry.customerinformation TO 'app_dataentry_ro'@'localhost';
GRANT SELECT ON holcemlk_banker_dataentry.systemusers TO 'app_dataentry_ro'@'localhost';

-- Images: read/write, restricted on audit table
CREATE USER 'app_images_rw'@'localhost' IDENTIFIED BY '<strong-password>';
GRANT SELECT, INSERT ON holcemlk_banker_images.customer_images TO 'app_images_rw'@'localhost';
GRANT SELECT, INSERT ON holcemlk_banker_images.customer_previous_images TO 'app_images_rw'@'localhost';
GRANT SELECT, INSERT ON holcemlk_banker_images.audit_log TO 'app_images_rw'@'localhost';
-- No UPDATE/DELETE granted on customer_previous_images or audit_log (append-only/tamper-evident)
FLUSH PRIVILEGES;
```

### 3. Redis Configuration
- Bind to `127.0.0.1` only (no external network exposure).
- Set `requirepass` to a strong local password.
- Enable `appendonly yes` for basic persistence of session/QR state across restarts (optional, evaluate need vs risk of stale state).

### 4. TLS Certificate Distribution
1. Generate the production self-signed certificate (or use an internal CA if the bank has one).
2. Copy `server.crt` to each Admin/Officer device; install as a trusted certificate at OS level, or configure the Flutter apps to pin this specific certificate.
3. Rotate the certificate annually or upon any suspected compromise; re-distribute to all devices when rotated.

### 5. Firewall / Router Rules
- Assign the backend host, Admin device(s), and Officer devices to the same VLAN/subnet, isolated from guest/other traffic if the router supports VLANs.
- Disable UPnP and port forwarding on the router — this system must never be reachable from outside the LAN.
- If the router supports it, enable a MAC allowlist for known bank devices; treat this as a defense-in-depth measure, not the primary control (per earlier decision, do not rely on static IP/MAC binding as an *access control* — user-facing OTP + concurrent-login control fills that role instead).
- Change default router admin credentials; disable WPS; use WPA3 (or WPA2-Enterprise) for WiFi.
