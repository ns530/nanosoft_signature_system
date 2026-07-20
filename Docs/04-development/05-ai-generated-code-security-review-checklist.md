# AI-Generated Code Security Review Checklist
## HolcemLK Banker Customer Signature & Image Collection System

**Purpose:** Documentation and architecture diagrams (Phases 1–3) reduce *design* risk — missed requirements, inconsistent scope. They do **not** verify that code an AI coding tool (Kilo Code, Cursor, Claude Code, Copilot, etc.) actually writes is secure. This checklist is a mandatory gate before any AI-generated module touching auth, QR, or image data is merged — run it as a distinct review pass, not folded into a general code review.

**How to use:** After an AI tool generates a module, run it through the relevant section below. Anything unchecked blocks merge. Where possible, also literally paste the module + this checklist back to an AI and ask it to self-audit — but treat that self-audit as a first pass, not a substitute for human sign-off on the Critical-severity items.

---

### 1. Secrets & Configuration
- [ ] No hardcoded secrets anywhere in generated code (JWT secret, DB passwords, `IMAGE_ENCRYPTION_KEY`) — all pulled from `process.env`.
- [ ] `.env.example` contains only placeholders; the AI tool was never given a filled-in `.env` with real values as context.
- [ ] No secret values appear in code comments, log statements, or error messages the AI generated.

### 2. Authentication
- [ ] Login logic checks `MobilePassword`/`web_password` only — grep the generated auth module for any reference to `UserPassword` and confirm zero hits.
- [ ] Password comparison uses `bcrypt.compare()` (constant-time) — never `===`, `==`, or manual string comparison on hashes.
- [ ] JWT verification checks signature **and** expiry (`exp`) on every protected route — not just presence of a token.
- [ ] Failed-login rate limiting is actually wired into the login route, not just defined as an unused middleware function.

### 3. QR / Session Logic (highest-risk area for AI-introduced bugs)
- [ ] QR token consumption (mark-as-used) and the validity check happen as a single atomic Redis operation (e.g. `GET`+`SET` wrapped safely, or a Lua script / `SETNX`) — **not** a separate "check" call followed by a separate "invalidate" call, which creates a race window where two scans in quick succession could both pass.
- [ ] QR token expiry is checked server-side from the JWT `exp` claim, not trusted from any client-supplied value.
- [ ] Unlock-session token is required and verified on the actual upload route, not only checked on an earlier "validate" call that isn't re-verified at upload time.

### 4. Image Handling & Encryption
- [ ] Uploaded file type is verified by magic bytes / content sniffing, not just the filename extension or client-supplied MIME type.
- [ ] Image is encrypted (AES-256-GCM or equivalent authenticated encryption) before being written to disk — confirm no intermediate unencrypted temp file is left behind by the AI's implementation.
- [ ] Encryption key is loaded from config/secret store, never generated inline or derived from a weak/predictable value.
- [ ] "Archive previous image, then insert new" is implemented as a transaction (or with equivalent rollback handling) — confirm the AI didn't generate a version where a failure mid-way leaves the DB in an inconsistent state (e.g. archived but new row not inserted).

### 5. Database Access
- [ ] Backend uses two separate connection configs/credentials for `holcemlk_banker_dataentry` (read-only) and `holcemlk_banker_images` (read/write) — confirm the AI didn't collapse them into a single shared connection "for simplicity."
- [ ] All queries are parameterized (ORM query builder or parameterized raw SQL) — no string-concatenated SQL, even in code the AI generated for CustomerID lookup.
- [ ] No `UPDATE`/`DELETE` capability implemented against `customer_previous_images` or `audit_log` in the application code, matching the least-privilege DB grants.

### 6. Logging & Audit
- [ ] Audit log writes never include the raw password, full JWT, or raw image bytes — check the AI didn't log entire request bodies for "debugging" during generation.
- [ ] Every auth, QR, and image event required by the SRS actually triggers an audit log call — cross-check against the FR list, since AI tools sometimes implement the "happy path" and skip logging on error branches.

### 7. Dependencies
- [ ] Run `npm audit` (or equivalent) on any new packages the AI introduced — AI tools sometimes suggest packages by name from training data without checking current maintenance status or known CVEs.
- [ ] Confirm no unnecessary package was added that expands attack surface (e.g. a full templating engine pulled in for a one-line string format).

### 8. General AI-Generated-Code Red Flags
- [ ] Re-read any comment the AI wrote explaining *why* it made a security-relevant choice — if the reasoning is missing, wrong, or contradicts this document, treat it as a signal to manually rewrite that section rather than trust it.
- [ ] Diff the AI's implementation against the LLD pseudocode (Phase 3, `03-lld.md`) function by function — flag any deviation for explicit review, not just functional testing.
- [ ] Re-run the relevant Phase 5 security test cases (`TC-QR-02`, `TC-QR-03`, `TC-API-01`, `TC-DB-01`, `TC-IMG-01`) against the AI-generated build before considering the module done — passing these is the actual evidence of security, not the presence of this checklist being followed.

---

### Sign-off
| Module | AI Tool Used | Reviewed By (human) | Checklist Passed | Date |
|---|---|---|---|---|
| Auth | | | | |
| QR Generation/Validation | | | | |
| Image Upload/Encryption | | | | |
| Audit Logging | | | | |
