# Known Limitations & Recommendations Before Production
## HolcemLK Banker Customer Signature & Image Collection System

**Purpose:** This document exists so no one mistakes "documentation complete" or "AI-generated code passes the security checklist" for "ready to hold real customer signatures and photographs." It lists what this documentation set does **not** solve, why each gap matters, and what to do about it before go-live. This should be read alongside the Test Summary Report (Phase 5) and the Go-Live Checklist prompt (Phase 6) — it is an honest limitations statement, not a scare document, and not a reason to abandon the project.

---

### 1. Encryption Key Management
**Gap:** The design specifies `IMAGE_ENCRYPTION_KEY` as an environment variable. On a single local PC, that means the key sits in a plaintext `.env` file on the same disk as the encrypted images it protects. If the disk is copied or the host is compromised, the attacker gets both the ciphertext and the key.

**Why it matters:** Encryption is only as strong as key separation. Co-located key + ciphertext is close to no encryption at all against a motivated attacker with disk access.

**Recommendation before production:**
- At minimum: restrict `.env` file permissions to the service account only (`chmod 600`), enable full-disk encryption on the host PC, and never include `.env` in any backup that isn't itself separately encrypted with a different key.
- Better: use an OS-level secret store (Windows DPAPI / Linux keyring) or a local secrets manager (e.g. HashiCorp Vault in dev mode, or even a hardware-backed keystore if the host supports a TPM) instead of a raw `.env` value.
- Best (if budget allows): a small hardware security module (HSM) or cloud KMS reachable only from the local network for key operations, so the key material never lives on the same disk as the data it protects.

### 2. Database Connection Encryption
**Gap:** The design assumes backend↔MySQL traffic is safe because it's typically loopback (`127.0.0.1`). This has not been explicitly configured or verified.

**Recommendation:** Enable TLS on the MySQL connection regardless (`require_secure_transport=ON` server-side, `ssl: true` in the ORM config) — cheap to do, removes an assumption instead of relying on it.

### 3. Officer Device Management
**Gap:** There is no Mobile Device Management (MDM) layer. If an Officer's phone is lost or stolen while unlocked, or its OS-level lock is bypassed, the app's secure storage may still be reachable. There is also no remote-wipe capability for the Collector App's cached offline queue.

**Recommendation before production:** Enroll all Officer devices in a basic MDM solution (even a lightweight one) that provides remote wipe and enforces device-level PIN/biometric lock as a precondition for the Collector App to run. This is a gap the SRS/design docs did not address at all — it needs its own short requirements pass before go-live.

### 4. Single Point of Authority (Admin Account)
**Gap:** The entire access-control model hinges on QR sessions issued by one Admin role. If an Admin account is compromised (phishing, credential reuse, social engineering), an attacker gains the ability to authorize unlimited data-collection sessions, and OTP step-up only slows this down for new devices — it doesn't stop misuse from an already-trusted device.

**Recommendation before production:** Introduce dual control for high-risk actions if operationally feasible — e.g. a second Admin or a Compliance Officer must be notified/co-sign for QR generation outside expected hours, or an automatic hard cap on QR sessions per day with alerting if exceeded. At minimum, treat Admin accounts as the highest-value target in the audit/anomaly-detection design and review their activity logs more frequently than Officer accounts.

### 5. No Automated Security Pipeline
**Gap:** The AI-Generated Code Security Review Checklist (Phase 4) is a manual process. Nothing in the current design enforces that it's actually run before code merges.

**Recommendation before production:** Add `npm audit` (or `snyk`/equivalent) and a basic SAST tool (e.g. `eslint-plugin-security`, Semgrep) as automated CI steps that block merges on Critical/High findings — even a minimal local CI setup (a pre-commit hook or a simple GitHub Actions/self-hosted runner) is far more reliable than "remember to run the checklist."

### 6. Regulatory Coverage Is Incomplete
**Gap:** This documentation set references Sri Lanka's PDPA only. It has not been checked against the Central Bank of Sri Lanka's (CBSL) technology risk management / information security directives that apply to licensed banks' IT systems, which may impose additional requirements (e.g. specific encryption standards, incident reporting timelines, third-party risk assessments) beyond what's documented here.

**Recommendation before production:** Have the bank's Compliance Officer or legal counsel confirm this system's design against current CBSL directives specifically — not just PDPA — before go-live. This is a compliance sign-off gap, not a technical one, but it can block go-live just the same.

### 7. No Independent Security Audit
**Gap:** The Test Plan (Phase 5) covers internal QA and internally-designed security test cases. It does not include independent, third-party penetration testing.

**Why it matters:** Internal teams (and AI tools) tend to test against the threats they already thought of. A system handling customer signatures/photographs tied to a core banking system is a realistic target for both external attackers and insider misuse — an independent reviewer finds classes of issues internal testing structurally tends to miss.

**Recommendation before production:** Commission at least one external security review or penetration test — this doesn't need to be an expensive enterprise engagement; even a focused freelance security consultant reviewing the auth, QR, and encryption modules for a few days would materially close this gap.

---

### 8. Flutter SDK version - outdated, blocking freerasp upgrade
**Gap:** The development environment uses Flutter SDK 3.13.0 (Dart 3.1.0), which is ~3 years old. Current stable is 3.44.x. This prevents upgrading freerasp beyond ^6.12.0 (the latest is 8.x), losing:
- `killOnBypass` process-termination reaction (critical threats don't auto-kill the app)
- `onMultiInstance` detection (Parallel Space/clone apps)
- `onLocationSpoofing` detection
- `onTimeSpoofing` detection
- `onUnsecureWifi` detection
- `onAutomation` detection
**Recommendation:** Before production deployment, upgrade Flutter SDK to latest stable (3.44.x or later), then run `flutter pub upgrade freerasp` to restore full threat coverage. See `_bmad-output/architecture-spine/memlog.md` entry for Epic 7.

### 9. BLOB Storage Trade-offs (Project Owner Decision)
**Gap:** Per AD-5 revised 2026-07-07, encrypted image binary is stored directly as LONGBLOB in `customer_images.image_data` / `customer_previous_images.old_image_data` rather than on the filesystem. This decision introduces:
- **DB size growth:** Each ~500KB encrypted image adds ~500KB to the database. At 500 images/day over 5 years → ~450MB total. Manageable but non-trivial for `mysqldump` runtime.
- **Backup/restore time impact:** File-store backups could skip unchanged images; BLOB backups must dump all image data every time. `mysqldump --single-transaction` helps but restore time scales linearly with BLOB volume.
- **Connection pool memory usage:** A Sequelize query returning a LONGBLOB allocates the full binary into memory. If multiple officers upload simultaneously, each connection holds one encrypted image buffer (~500KB each). At pool size 5 → ~2.5MB peak. Acceptable at current scale.
- **No streaming reads:** Images are always read entirely into memory before decrypt. This is acceptable because the use case is "read once to display or replace," not progressive/partial reads.
- **Rationale accepted:** Simpler backup (single mysqldump captures everything), no orphaned-file risk, no filesystem path fragility, no OS permission management for the uploads directory.

**Recommendation:** Monitor DB size quarterly. If `customer_images` exceeds 2GB, evaluate either (a) archiving images older than 6 months to cold file-store, or (b) reverting to file-store with a migration script.
**Status as of 2026-07-08:** Core mechanism verified via live E2E test — encrypted Buffer written to `customer_images.image_data`, read back, hash matched, AES-256-GCM decrypt succeeded. Production-scale concerns (DB size, backup time, pool memory at 500+ images/day) remain untested at this single-image level.

### Honest Bottom Line
Following this documentation set and the AI-code security checklist will get you a **well-architected, thoughtfully-scoped system** where the intent is right and the obvious mistakes (plaintext passwords, static QR codes, unencrypted images) are avoided. It will **not**, on its own, get you a system verified safe to hold real customer biometric-adjacent data in a core-banking context. The nine items above are the specific, named reasons why — treat this document as a checklist against your Phase 6 Go-Live Checklist, and don't consider the project production-ready until each item has an explicit decision recorded (fixed, accepted-risk-with-sign-off, or deferred-with-a-date) rather than being silently skipped.

### Sign-off
| Gap # | Item | Decision (Fixed / Accepted Risk / Deferred) | Approved By | Date |
|---|---|---|---|---|
| 1 | Encryption key management | | | |
| 2 | DB connection TLS | | | |
| 3 | Officer device management (MDM) | | | |
| 4 | Admin single point of authority | | | |
| 5 | Automated security pipeline | | | |
| 6 | CBSL regulatory review | | | |
| 7 | Independent security audit | | | |
| 8 | Flutter SDK version - outdated, blocking freerasp upgrade | | | |
| 9 | BLOB storage trade-offs (Project Owner decision) | Encrypt-store-decrypt round-trip verified live 2026-07-08 (1 image, 119B); DB size growth / backup scaling / pool memory at production scale remain untested | | |
