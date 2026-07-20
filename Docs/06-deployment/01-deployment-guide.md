# Deployment Plan / Guide
## HolcemLK Banker — Customer Signature & Image Collection System

### 1. Pre-Deployment Checklist
- [ ] Security test suite passed (see Phase 5 Test Summary Report), sign-off obtained.
- [ ] Production TLS certificate generated and ready for distribution.
- [ ] MySQL databases and least-privilege accounts provisioned (`app_dataentry_ro`, `app_images_rw`).
- [ ] Redis instance provisioned and secured (local bind only, auth password set).
- [ ] `.env` production values set locally on host (never committed to Git).
- [ ] Router/VLAN configuration applied per Configuration Document.
- [ ] Backup mechanism configured and tested (see Backup & DR Note).

### 2. Installation Steps
1. Install Node.js LTS, MySQL, Redis on the designated branch host PC.
2. Restore/point to existing `holcemlk_banker_dataentry` database (do not modify schema).
3. Create `holcemlk_banker_images` database and run migrations to create `customer_images`, `customer_previous_images`, `audit_log`.
4. Deploy backend code to host, install dependencies (`npm ci --production`), place production `.env` and TLS cert/key.
5. Start backend as a managed service (e.g. `pm2` or a systemd service) so it restarts automatically on host reboot.
6. Distribute the TLS certificate (or its public cert) to all Admin and Officer devices; install/trust it.
7. Install the QR Generator App on the Admin's device(s), configured with the production `API_BASE_URL`.
8. Install the Collector App on each Officer's device, configured with the production `API_BASE_URL`.
9. Seed/confirm `systemusers` accounts have bcrypt-hashed `MobilePassword`/`web_password` set (no accounts should rely on the legacy `UserPassword` field).
10. Perform a smoke test: Admin login → QR generate → Officer login → QR scan → customer lookup → test image upload (using a synthetic test customer, not a real one) → confirm audit log entries created.

### 3. Rollback Plan
- If backend fails smoke test: stop the new service, restore previous state (if this is an update) or leave the manual/paper process in place (if this is initial go-live) until issues are resolved.
- Database migrations should be reversible (down-migration scripts prepared in advance) so `holcemlk_banker_images` schema changes can be rolled back without affecting `holcemlk_banker_dataentry`.
- Keep the previous backend build/artifact available for immediate redeploy if a critical issue is found post-go-live.
