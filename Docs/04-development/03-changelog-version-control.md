# CHANGELOG
## HolcemLK Banker — Customer Signature & Image Collection System

Format based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]
### Added
- Admin login with bcrypt verification and RBAC.
- Officer login with bcrypt verification and RBAC.
- OTP step-up authentication for new device/IP.
- QR session generation (Admin) with 15-minute expiry.
- QR scan validation (Officer) with one-time-use enforcement via Redis.
- Customer lookup by CustomerID against `customerinformation`.
- Image capture and upload with AES-256 encryption at rest.
- Visible + invisible watermarking of captured images.
- Archival of replaced images into `customer_previous_images`.
- Append-only audit logging for auth, QR, and image events.
- Concurrent-login prevention.
- Secure offline capture queue in Collector App.
- Screenshot/screen-record blocking and root/jailbreak/emulator detection in both apps.

### Security
- All traffic enforced over TLS, including local network.
- Two separate least-privilege DB credentials for dataentry vs images databases.

---

## Git Branching Strategy
- `main` — always deployable, protected branch.
- `develop` — integration branch for completed features.
- `feature/<name>` — one branch per feature (e.g. `feature/qr-validation`, `feature/image-encryption`).
- Pull Requests required into `develop`; PR review must pass the Code Review Checklist (see AI Prompts, Prompt 5) before merge.
- Tag releases on `main` as `vMAJOR.MINOR.PATCH` (semantic versioning) once deployed to a branch.
