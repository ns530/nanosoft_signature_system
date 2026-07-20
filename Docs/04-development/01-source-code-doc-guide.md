# Source Code Documentation Guide
## HolcemLK Banker — Backend (Node.js)

### 1. Suggested Folder Structure
```
/backend
  /src
    /config        - env loading, DB connection configs (dataentry + images), Redis config
    /models         - ORM models: SystemUser, CustomerInformation (read-only), CustomerImage, CustomerPreviousImage, AuditLog
    /routes         - route definitions grouped by domain (auth.routes.js, qr.routes.js, image.routes.js)
    /controllers     - request handling, input validation
    /services        - business logic (authService, qrService, imageService, auditService)
    /middleware      - authenticateJWT, requireRole, rateLimiter, validateUnlockSession
    /utils           - encryption helpers, watermark helper, logger
  /certs             - local TLS cert/key (never committed)
  .env.example
```

### 2. Naming Conventions
- Files: `camelCase.js` for services/utils, `PascalCase.js` for model files.
- Functions: verbs first — `generateQrToken()`, `validateQrToken()`, `encryptImageBuffer()`.
- DB fields: match existing schema exactly for `customerinformation`/`systemusers` (no renaming); `snake_case` for new tables in `holcemlk_banker_images`.

### 3. Commenting Standard (JSDoc)
Every function touching auth, QR, or image data must have a JSDoc block stating **what security control it enforces**, not just what it does. Example:

```js
/**
 * Validates a scanned QR session token and issues a short-lived unlock session.
 * Security controls enforced:
 *  - Signature verification (JWT) — rejects tampered tokens
 *  - Expiry check — rejects tokens older than 15 minutes
 *  - One-time-use check via Redis — rejects already-consumed tokens
 * @param {string} qrToken - signed JWT from the scanned QR
 * @param {string} officerId - authenticated officer's user id
 * @returns {Promise<{unlockToken: string, expiresAt: number}>}
 */
async function validateQrToken(qrToken, officerId) { /* ... */ }
```

### 4. Do-Not-Do List (enforced in code review)
- Never log full JWTs, passwords, or raw image bytes.
- Never reference `UserPassword` in any auth path.
- Never write image data to disk unencrypted, even temporarily.
