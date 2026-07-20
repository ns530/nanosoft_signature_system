# Release Notes
## HolcemLK Banker — Customer Signature & Image Collection System
### Version 1.0.0

### New Features
- Admin QR Generator App: secure login, one-time QR session generation (15-minute expiry).
- Collector App: secure login, QR scan, customer lookup, in-memory signature/photo capture, secure upload, offline queueing.
- Backend: dual-database architecture (`holcemlk_banker_dataentry` read-only, `holcemlk_banker_images` read/write), bcrypt authentication, JWT-based session and QR-token flow, AES-256 image encryption at rest, visible + invisible watermarking, full audit logging.
- Security: OTP step-up on new device/IP, concurrent-login prevention, TLS enforced across all traffic, rate limiting on login.

### Known Limitations (v1.0.0)
- No automatic certificate renewal — TLS certificate rotation is a manual process.
- Offline queue supports a limited number of pending captures before requiring connectivity (confirm exact limit in app config).
- Anomaly detection (unusual IP/login pattern alerts to Admin) is basic threshold-based, not ML-based.

### Security Controls Implemented
See Configuration Document and SRS NFR list — TLS, bcrypt/argon2, one-time QR tokens, AES-256 encrypted image storage, least-privilege DB accounts, append-only audit log, root/jailbreak/emulator detection, screenshot blocking, 5-minute idle session timeout.

### Upgrade / Migration Notes
- Future releases touching `holcemlk_banker_images` schema must ship both up- and down-migration scripts.
- `holcemlk_banker_dataentry` (`customerinformation`, `systemusers`) schema must remain untouched by this application; any required schema change there is out of this project's scope and must go through the core banking system's own change process.
