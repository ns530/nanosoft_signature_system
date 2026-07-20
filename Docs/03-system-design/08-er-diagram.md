# Entity Relationship (ER) Diagram
## HolcemLK Banker Customer Signature & Image Collection System

Entities span two databases. Relationships crossing the `holcemlk_banker_dataentry` ↔ `holcemlk_banker_images` boundary are **logical only** (application-enforced) — there is no DB-level foreign key across separate database schemas/credentials, by design (least-privilege isolation).

```mermaid
erDiagram
    CUSTOMERINFORMATION ||--o{ CUSTOMER_IMAGES : "has (logical FK, app-enforced)"
    SYSTEMUSERS ||--o{ CUSTOMER_IMAGES : "collected_by (logical FK)"
    CUSTOMER_IMAGES ||--o{ CUSTOMER_PREVIOUS_IMAGES : "archives to"
    SYSTEMUSERS ||--o{ CUSTOMER_PREVIOUS_IMAGES : "replaced_by (logical FK)"
    SYSTEMUSERS ||--o{ AUDIT_LOG : "performs (logical FK)"

    CUSTOMERINFORMATION {
        varchar CustomerID PK
        varchar CustomerFullName
        varchar NIC
        varchar HomeTown
        varchar MemberStatus
        date JoinedDate
    }

    SYSTEMUSERS {
        int UserID PK
        varchar UserName
        varchar UserPassword "legacy - never used for login"
        varchar MobilePassword "bcrypt - used for login"
        varchar web_password "bcrypt - used for login"
        varchar UserRole
        varchar Device_id
        varchar mobile_no
        varchar mobile_otp
    }

    CUSTOMER_IMAGES {
        char image_id PK "UUID"
        varchar customer_id "logical FK -> CUSTOMERINFORMATION.CustomerID"
        enum image_type "profile_picture | signature"
        varchar storage_path "encrypted file path"
        char file_hash "SHA-256"
        varchar collected_by "logical FK -> SYSTEMUSERS.UserName"
        datetime collected_at
        char qr_session_ref "nonce, audit correlation"
    }

    CUSTOMER_PREVIOUS_IMAGES {
        bigint log_id PK
        char image_id "archived image_id"
        varchar customer_id
        varchar old_storage_path
        char old_file_hash
        varchar replaced_by "logical FK -> SYSTEMUSERS.UserName"
        datetime replaced_at
    }

    AUDIT_LOG {
        bigint log_id PK
        varchar event_type "LOGIN, QR_GENERATED, QR_VALIDATED, IMAGE_CAPTURED, IMAGE_REPLACED"
        varchar user_id "logical FK -> SYSTEMUSERS.UserID"
        varchar ip_address
        varchar device_fingerprint
        datetime event_time
        json detail
    }
```

### Cross-Database Boundary
```mermaid
graph LR
    subgraph DB1["holcemlk_banker_dataentry (fixed schema, read-only)"]
        CI[customerinformation]
        SU[systemusers]
    end
    subgraph DB2["holcemlk_banker_images (this project's schema)"]
        CIM[customer_images]
        CPI[customer_previous_images]
        AL[audit_log]
    end
    CI -. "logical FK: CustomerID<br/>(app-validated, not DB-enforced)" .-> CIM
    SU -. "logical FK: UserID/UserName<br/>(app-validated, not DB-enforced)" .-> CIM
    SU -. "logical FK" .-> AL
```
