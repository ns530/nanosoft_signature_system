# Requirement Traceability Matrix (RTM)
## HolcemLK Banker — Customer Signature & Image Collection System

| Req ID | Requirement (summary) | Source | Design Doc Ref | Test Case Ref | Status |
|---|---|---|---|---|---|
| FR-01 | Admin login (bcrypt) | SRS §1 | TBD-Design (SDD Auth) | TBD-Test (TC-AUTH-01) | Open |
| FR-02 | Reject legacy UserPassword login | SRS §1 | TBD-Design (SDD Auth) | TBD-Test (TC-AUTH-02) | Open |
| FR-03 | QR generation, ≤15min expiry | SRS §1 | TBD-Design (SDD QR Flow) | TBD-Test (TC-QR-01) | Open |
| FR-04 | One-time QR use enforcement | SRS §1 | TBD-Design (SDD QR Flow) | TBD-Test (TC-QR-02) | Open |
| FR-05 | Officer login (bcrypt) | SRS §1 | TBD-Design (SDD Auth) | TBD-Test (TC-AUTH-03) | Open |
| FR-06 | QR scan + officer token submission | SRS §1 | TBD-Design (SDD QR Flow) | TBD-Test (TC-QR-03) | Open |
| FR-07 | Unlock session issuance | SRS §1 | TBD-Design (SDD QR Flow) | TBD-Test (TC-QR-04) | Open |
| FR-08 | CustomerID verification | SRS §1 | TBD-Design (SDD Data Layer) | TBD-Test (TC-CUST-01) | Open |
| FR-09 | In-memory capture, no gallery save | SRS §1 | TBD-Design (App Design) | TBD-Test (TC-APP-01) | Open |
| FR-10 | Upload requires unlock session | SRS §1 | TBD-Design (SDD API) | TBD-Test (TC-API-01) | Open |
| FR-11 | Archive previous image on replace | SRS §1 | TBD-Design (DB Design) | TBD-Test (TC-DB-01) | Open |
| FR-12 | Watermarking | SRS §1 | TBD-Design (SDD Image Pipeline) | TBD-Test (TC-IMG-01) | Open |
| FR-13 | Audit logging | SRS §1 | TBD-Design (SDD Audit) | TBD-Test (TC-AUDIT-01) | Open |
| FR-14 | OTP on new device/IP | SRS §1 | TBD-Design (SDD Auth) | TBD-Test (TC-AUTH-04) | Open |
| FR-15 | Concurrent login prevention | SRS §1 | TBD-Design (SDD Auth) | TBD-Test (TC-AUTH-05) | Open |
| FR-16 | Secure offline queue | SRS §1 | TBD-Design (App Design) | TBD-Test (TC-APP-02) | Open |
| NFR-01 | TLS everywhere | SRS §2 | TBD-Design (SDD Network) | TBD-Test (TC-SEC-01) | Open |
| NFR-02 | bcrypt/argon2 only | SRS §2 | TBD-Design (SDD Auth) | TBD-Test (TC-SEC-02) | Open |
| NFR-03 | Encrypted image storage | SRS §2 | TBD-Design (DB Design) | TBD-Test (TC-SEC-03) | Open |
| NFR-04 | Rate limiting / lockout | SRS §2 | TBD-Design (SDD API) | TBD-Test (TC-SEC-04) | Open |
| NFR-05 | Screenshot/root/emulator block | SRS §2 | TBD-Design (App Design) | TBD-Test (TC-APP-03) | Open |
| NFR-06 | 5-min idle session timeout | SRS §2 | TBD-Design (App Design) | TBD-Test (TC-APP-04) | Open |
| NFR-07 | No internet dependency | SRS §2 | TBD-Design (SDD Network) | TBD-Test (TC-INFRA-01) | Open |
| NFR-08 | Tamper-evident audit logs | SRS §2 | TBD-Design (SDD Audit) | TBD-Test (TC-AUDIT-02) | Open |
| NFR-09 | PDPA compliance | SRS §2 | TBD-Design (Compliance Notes) | TBD-Test (TC-COMP-01) | Open |
| NFR-10 | Separate least-privilege DB creds | SRS §2 | TBD-Design (DB Design) | TBD-Test (TC-DB-02) | Open |

*Update "Design Doc Ref" and "Test Case Ref" columns once Phase 3 (Design) and Phase 5 (Testing) documents are finalized.*
