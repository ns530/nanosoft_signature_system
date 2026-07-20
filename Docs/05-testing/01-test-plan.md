# Test Plan
## HolcemLK Banker — Customer Signature & Image Collection System

### 1. Scope
Covers functional testing of Auth, QR, Customer Lookup, and Image Upload modules; security/penetration testing of the QR flow and data-at-rest encryption; performance testing under expected branch-level load; and usability testing of both Flutter apps.

### 2. Testing Types
- **Functional testing** — verifies each FR in the SRS behaves as specified.
- **Security/penetration testing** — verifies each NFR security control (TLS, one-time QR, encryption, rate limiting) cannot be bypassed.
- **Performance testing** — verifies acceptable response time for QR validation and image upload under concurrent branch usage (e.g. 5–10 officers).
- **Usability testing** — verifies app flows are clear, error states are understandable, and offline queueing works as expected.

### 3. Entry Criteria
- Feature-complete build deployed to a test environment (mirroring local-network topology).
- SRS and API documentation finalized and available to QA.
- Test data seeded (dummy customers, dummy system users — never using real production customer PII).

### 4. Exit Criteria
- 100% of FR/NFR-linked test cases executed.
- 0 open Critical/High severity defects.
- Security test suite fully passed (QR replay, tampering, encryption verification).
- Sign-off from QA Lead, Security reviewer, and Project Manager.

### 5. Test Environment
- Isolated local network segment, mirroring production topology (same VLAN pattern, same self-signed TLS setup).
- Test-only databases seeded with synthetic data, not the real `customerinformation`/`systemusers` production data.

### 6. Roles & Responsibilities
| Role | Responsibility |
|---|---|
| QA Engineer | Write/execute functional + usability test cases |
| Security Tester | Execute penetration test cases |
| Backend Developer | Fix defects, support test environment setup |
| PM | Track defect status, coordinate go/no-go decision |
