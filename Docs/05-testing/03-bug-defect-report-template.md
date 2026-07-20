# Bug / Defect Report Template
## HolcemLK Banker — Customer Signature & Image Collection System

| Field | Value |
|---|---|
| Defect ID | DEF-XXX |
| Title | *(short, specific summary)* |
| Severity | Critical / High / Medium / Low |
| Priority | P1 / P2 / P3 / P4 |
| Module | Auth / QR / Customer Lookup / Image Upload / Audit / App-UI |
| Environment | *(test/staging, device/OS, backend version/commit)* |
| Steps to Reproduce | 1. ...<br>2. ...<br>3. ... |
| Expected Result | |
| Actual Result | |
| Screenshots/Logs | *(attach, redact any real customer PII)* |
| Reported By | |
| Date Reported | |
| Status | Open / In Progress / Fixed / Retest / Closed / Rejected |
| Resolution Notes | |
| Verified By | |
| Date Closed | |

### Severity Guide (project-specific)
- **Critical:** Any bypass of QR one-time-use, auth bypass, unencrypted image storage, or exposure of another customer's data.
- **High:** Incorrect audit logging, OTP bypass, concurrent-login control failure.
- **Medium:** Usability/error-message issues that don't compromise security.
- **Low:** Cosmetic UI issues.
