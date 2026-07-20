# Sequence Diagrams
## HolcemLK Banker Customer Signature & Image Collection System

*(Not explicitly requested, but a standard System Design artifact — added to make the QR flow and upload flow from the LLD unambiguous for developers implementing them.)*

## 1. QR Generation & Validation Flow

```mermaid
sequenceDiagram
    actor Admin
    actor Officer
    participant AdminApp as QR Generator App
    participant OfficerApp as Collector App
    participant BE as Backend
    participant Redis

    Admin->>AdminApp: Login (username/password)
    AdminApp->>BE: POST /auth/login
    BE->>BE: bcrypt.compare()
    BE-->>AdminApp: JWT (Admin)

    Admin->>AdminApp: Tap "Generate QR"
    AdminApp->>BE: POST /admin/qr/generate (JWT)
    BE->>BE: sign JWT {nonce, exp=15min}
    BE->>Redis: SET qr:{nonce} = pending, TTL 900s
    BE-->>AdminApp: qrToken
    AdminApp-->>Admin: Display QR code + countdown

    Officer->>OfficerApp: Login (username/password)
    OfficerApp->>BE: POST /auth/login
    BE-->>OfficerApp: JWT (Officer)

    Officer->>OfficerApp: Scan Admin's QR
    OfficerApp->>BE: POST /officer/qr/validate (qrToken, Officer JWT)
    BE->>BE: verify signature + expiry
    BE->>Redis: GET qr:{nonce}
    alt token valid and pending
        BE->>Redis: SET qr:{nonce} = consumed
        BE-->>OfficerApp: unlockToken (10 min)
        BE->>BE: log QR_VALIDATED
    else already consumed
        BE-->>OfficerApp: 409 QR already used
    else expired
        BE-->>OfficerApp: 410 QR expired
    end
```

## 2. Image Capture & Upload Flow

```mermaid
sequenceDiagram
    actor Officer
    participant App as Collector App
    participant BE as Backend
    participant DBEntry as dataentry DB
    participant DBImages as images DB
    participant Enc as Encrypted Store

    Officer->>App: Enter CustomerID
    App->>BE: GET /officer/customer/:id (unlockToken)
    BE->>BE: verify unlockToken
    BE->>DBEntry: SELECT ... WHERE CustomerID = :id
    alt found
        DBEntry-->>BE: customer basic info
        BE-->>App: 200 OK
    else not found
        BE-->>App: 404 Not Found
    end

    Officer->>App: Capture signature/photo (in-memory only)
    App->>BE: POST /officer/customer/:id/image (unlockToken, file)
    BE->>BE: verify unlockToken, validate file
    BE->>DBImages: SELECT existing image (customer_id, type)
    alt existing image found
        BE->>DBImages: INSERT INTO customer_previous_images (archive)
    end
    BE->>BE: apply watermark (sharp)
    BE->>Enc: encrypt (AES-256-GCM) + write file
    BE->>DBImages: INSERT INTO customer_images (path, hash)
    BE->>BE: log IMAGE_CAPTURED
    BE-->>App: 201 Created {imageId}
    App-->>Officer: "Securely uploaded and encrypted"
```
