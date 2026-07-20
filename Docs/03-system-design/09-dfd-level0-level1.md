# Data Flow Diagrams — DFD Level 0 (Context) & Level 1
## HolcemLK Banker Customer Signature & Image Collection System

## DFD Level 0 (Context Diagram)
Single process representing the whole system, showing external entities only.

```mermaid
graph LR
    Admin["Bank Admin<br/>(external entity)"]
    Officer["Bank Officer<br/>(external entity)"]
    Sys(("0.0<br/>HolcemLK Banker<br/>Signature & Image<br/>Collection System"))

    Admin -- "login credentials" --> Sys
    Sys -- "QR session token" --> Admin
    Sys -- "active-session status" --> Admin

    Officer -- "login credentials" --> Sys
    Officer -- "scanned QR token" --> Sys
    Officer -- "CustomerID" --> Sys
    Officer -- "signature/photo image" --> Sys
    Sys -- "unlock-session confirmation" --> Officer
    Sys -- "customer verification result" --> Officer
    Sys -- "upload status" --> Officer
```

## DFD Level 1 (Process Decomposition)
Breaks the single Level-0 process into its core functional processes and data stores.

```mermaid
graph TB
    Admin["Bank Admin"]
    Officer["Bank Officer"]

    P1(("1.0<br/>Authenticate User"))
    P2(("2.0<br/>Generate QR Session"))
    P3(("3.0<br/>Validate QR &<br/>Lookup Customer"))
    P4(("4.0<br/>Capture & Store Image"))
    P5(("5.0<br/>Audit Logging"))

    D1[("D1: systemusers")]
    D2[("D2: customerinformation")]
    D3[("D3: customer_images")]
    D4[("D4: customer_previous_images")]
    D5[("D5: audit_log")]
    R1[("R1: Redis<br/>(QR / session state)")]

    Admin -- "credentials" --> P1
    Officer -- "credentials" --> P1
    P1 <-- "verify bcrypt hash" --> D1
    P1 -- "session token" --> R1
    P1 -- "JWT" --> Admin
    P1 -- "JWT" --> Officer

    Admin -- "generate request (JWT)" --> P2
    P2 -- "store one-time token" --> R1
    P2 -- "QR payload" --> Admin

    Officer -- "scanned QR + CustomerID" --> P3
    P3 <-- "check/consume token" --> R1
    P3 <-- "verify CustomerID exists" --> D2
    P3 -- "unlock session" --> Officer

    Officer -- "image + unlock session" --> P4
    P4 <-- "check existing image" --> D3
    P4 -- "archive prior image" --> D4
    P4 -- "store new image" --> D3

    P1 -- "log event" --> P5
    P2 -- "log event" --> P5
    P3 -- "log event" --> P5
    P4 -- "log event" --> P5
    P5 -- "append record" --> D5
```

### Process Descriptions
| Process | Description | Reads | Writes |
|---|---|---|---|
| 1.0 Authenticate User | Verifies bcrypt-hashed credentials, issues JWT, handles OTP step-up and concurrent-login control | D1 (systemusers) | R1 (session pointer) |
| 2.0 Generate QR Session | Admin-only; creates signed, one-time, 15-min QR token | — | R1 (qr:{nonce}) |
| 3.0 Validate QR & Lookup Customer | Consumes QR token, issues unlock session, verifies CustomerID | R1, D2 (customerinformation) | R1 (mark consumed) |
| 4.0 Capture & Store Image | Encrypts, watermarks, archives-then-inserts image | D3 | D3, D4 |
| 5.0 Audit Logging | Append-only logging of every event across all processes | — | D5 (audit_log) |
