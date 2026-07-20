---
stepsCompleted: ["epic2_stories_created_retroactively"]
inputDocuments:
  - D:\Company\nanosoft_signature_system\Docs\02-requirements-analysis\02-srs.md
  - D:\Company\nanosoft_signature_system\_bmad-output\architecture-spine\ARCHITECTURE-SPINE.md
  - D:\Company\nanosoft_signature_system\_bmad-output\epics.md
---

# Epic 2: Auth Module — Retroactive Story Documentation

> **NOTE:** This file was created retroactively. Epic 2 was implemented
> directly as code without prior story planning, deviating from the
> standard BMAD create-story-then-implement process used in Epic 1.
> The contents below document what was actually built, not what was
> planned beforehand. All acceptance criteria and file mappings are
> based on code review, not design.

## Stories

### Story 2.1: Authentication Backend (authService + jwtService + rbacMiddleware)

**Acceptance Criteria:**

1. **Password Verification (FR-01, FR-05, AD-4)**
   - Given a login request with username and password
   - When the auth service verifies credentials
   - Then it must use `bcrypt.compare()` against `web_password` or `MobilePassword` only
   - And never reference the legacy `UserPassword` field (FR-02)

2. **JWT Issuance with Role Claims (FR-01, FR-05, FR-14)**
   - Given a successfully authenticated user
   - When issuing tokens
   - Then access token must have 15-minute expiry and role claim (1-Administrator or 1-Bank Officer)
   - And refresh token must have 7-day expiry
   - And OTP challenge token must have 5-minute expiry

3. **JWT Verification (AD-11)**
   - Given a protected route request
   - When authenticating the token
   - Then it must verify signature AND expiry (`exp`)
   - And return specific error for expired tokens (not generic "invalid token")

4. **RBAC Enforcement (FR-01, FR-05)**
   - Given an authenticated user
   - When accessing a role-restricted route
   - Then `requireRole` must check user role against allowed roles
   - And return 403 if role is insufficient

**Covered by files:**
- `src/auth/authService.ts` (258B) — bcrypt.compare(), no dead code
- `src/auth/jwtService.ts` (1601B) — JWT sign/verify, auto-generated secret via secretStore
- `src/auth/rbacMiddleware.ts` (1564B) — authenticateToken, requireRole

---

### Story 2.2: OTP Step-Up & Device Tracking (otpService)

**Acceptance Criteria (FR-14, AD-10):**

1. **New Device Detection**
   - Given a user logging in from a previously unseen device/IP
   - When OTP service checks device fingerprint
   - Then it must return "not known" to trigger OTP flow

2. **OTP Generation & Verification**
   - Given a new device login requiring step-up
   - When OTP is generated
   - Then it must be a 6-digit code stored in Redis with 5-minute TTL
   - And one-time-use (deleted after successful verification)

3. **Known Device Registration**
   - Given successful OTP verification
   - When registering the device
   - Then the device fingerprint must be stored in Redis with 30-day TTL

**Covered by files:**
- `src/auth/otpService.ts` (1782B) — OTP generation, device tracking

---

### Story 2.3: Session Management (sessionService + authRouter session routes)

**Acceptance Criteria (FR-15, AD-7, NFR-06):**

1. **Session Creation with Unique Token**
   - Given a successful login
   - When creating a session
   - Then a random session token must be generated and stored in `session:{userId}` Redis key
   - And the session token must be returned to the client

2. **Concurrent Login Prevention (FR-15)**
   - Given User A logged in on Device 1 with session token T1
   - When User A logs in on Device 2 (new session token T2 overwrites Redis key)
   - Then Device 2 receives T2 and Device 1's T1 is no longer valid at `session:{userId}`
   - And Device 1's next `/session/validate` request with T1 returns 401

3. **Session Invalidation on Logout**
   - Given an authenticated user
   - When logging out
   - Then the `session:{userId}` Redis key must be deleted

4. **Session TTL Refresh (NFR-06)**
   - Given an active session
   - When `/session/validate` is called
   - Then the session TTL (900s) must be refreshed

**Covered by files:**
- `src/auth/sessionService.ts` (1875B) — createSession, validateSession, invalidateSession
- `src/auth/authRouter.ts` (7362B) — /logout, /session/validate routes

---

### Story 2.4: Rate Limiting & Lockout (rateLimiter)

**Acceptance Criteria (NFR-04):**

1. **Failed Attempt Tracking**
   - Given a login attempt with invalid credentials
   - When recording the failure
   - Then a Redis counter `failed_login:{identifier}` is incremented with 5-minute window

2. **Account Lockout**
   - Given 5 consecutive failed login attempts
   - When the 5th failure is recorded
   - Then a `lockout:{identifier}` key is set in Redis with 15-minute TTL
   - And subsequent login attempts return 429

3. **Lockout Clear on Success**
   - Given a successful login after previous failures
   - When clearing failed attempts
   - Then both `failed_login:{identifier}` and `lockout:{identifier}` Redis keys are deleted

**Covered by files:**
- `src/auth/rateLimiter.ts` (1818B) — Redis-based counter, lockout, exponential behavior

---

### Story 2.5: User Repository (userRepository)

**Acceptance Criteria (AD-1, AD-9):**

1. **Read-Only DataEntry Query**
   - Given a login request
   - When looking up the user
   - Then the query must use the `app_dataentry_ro` connection (read-only)
   - And use parameterized SQL (no string concatenation)

2. **Field Selection (FR-02, AD-4)**
   - When querying the `systemusers` table
   - Then it must select `MobilePassword` and `web_password` fields
   - And never select or reference `UserPassword`

**Covered by files:**
- `src/auth/userRepository.ts` (792B) — Parameterized SQL, dataentry connection

---

### Story 2.6: Server Entry Point (server.ts)

**Acceptance Criteria (AD-11, NFR-01):**

1. **HTTPS Server with TLS**
   - Given the server starts
   - When loading TLS credentials
   - Then it must read `TLS_CERT_PATH` and `TLS_KEY_PATH` from .env
   - And throw a startup error if either file is missing
   - And create an `https.createServer()` (not plain http)

2. **Auth Route Mounting**
   - Given the Express app is configured
   - When mounting routes
   - Then auth routes must be at `/api/auth`
   - And health check must be at `/api/health`

**Covered by files:**
- `src/server.ts` (1188B) — https.createServer, TLS cert loading, route wiring

---

## Known Gaps & Open Items

1. **Session TTL cleanup** — Resolved: old archive key (`session:{userId}:old`) now has TTL matching
   the active session TTL (900s), preventing accumulation in Redis.

2. **Dead code removed** — `SALT_ROUNDS` constant removed from `authService.ts`. No password-hashing
   path is required by Epic 2's FRs (login only verifies existing hashes).

3. **Concurrent login enforcement** — Resolved: `validateSession()` now compares the client-supplied
   `sessionToken` against the current Redis value. When Device B logs in, a new random token is
   generated at `session:{userId}`, making Device A's old token fail validation.

4. **OTP device tracking uses its own Redis client** — Each service (`otpService`, `sessionService`,
   `rateLimiter`) creates a separate Redis connection. Consider consolidating into a shared Redis
   client from Epic 1's `src/redis/index.ts` as a future optimization. This does not affect
   correctness or security.

## Verification

- `tsc --noEmit`: 0 errors, 0 warnings
- `UserPassword` references: 0 across all src/auth/ files
- `bcrypt.compare()` used for password verification (constant-time)
- JWT verification checks signature AND expiry on every protected route
- Rate limiting wired into login route (not unused middleware)
- HTTPS server created via `https.createServer()` with TLS cert validation