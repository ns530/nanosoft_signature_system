# System Architecture Diagram
## HolcemLK Banker Customer Signature & Image Collection System

Logical component architecture — all traffic confined to the local network, TLS-encrypted end to end.

```mermaid
graph TB
    subgraph LAN["Local Network (isolated, no internet egress)"]
        subgraph AdminDevice["Admin Device"]
            QRApp["QR Generator App<br/>(Flutter)"]
        end

        subgraph OfficerDevice["Officer Device(s)"]
            CollectorApp["Collector App<br/>(Flutter)"]
        end

        subgraph HostPC["Backend Host PC"]
            Backend["Node.js Backend<br/>(Express + ORM)<br/>HTTPS only"]
            Redis[("Redis<br/>QR sessions,<br/>login sessions,<br/>rate-limit counters")]
            DBEntry[("MySQL<br/>holcemlk_banker_dataentry<br/>(customerinformation, systemusers)<br/>READ-ONLY access")]
            DBImages[("MySQL<br/>holcemlk_banker_images<br/>(customer_images,<br/>customer_previous_images,<br/>audit_log)<br/>READ/WRITE access")]
            EncStore["Encrypted File Store<br/>(AES-256 image files)"]
        end
    end

    QRApp -- "HTTPS: login, generate QR" --> Backend
    CollectorApp -- "HTTPS: login, scan QR,<br/>lookup customer, upload image" --> Backend

    Backend -- "app_dataentry_ro" --> DBEntry
    Backend -- "app_images_rw" --> DBImages
    Backend --> Redis
    Backend -- "encrypt/decrypt" --> EncStore

    style DBEntry fill:#f7dede,stroke:#b33
    style DBImages fill:#dbeeff,stroke:#357
    style EncStore fill:#dbeeff,stroke:#357
```

### Architecture Notes
- **Two isolated credential paths** into the databases — `app_dataentry_ro` cannot write, `app_images_rw` cannot touch `customerinformation`/`systemusers`.
- **Redis** exists purely for ephemeral state (QR one-time-use tracking, concurrent-login session pointer, rate-limit counters) — not a system of record.
- **Encrypted File Store** holds the actual AES-256 encrypted image binaries; `customer_images`/`customer_previous_images` tables hold only paths + hashes (per the earlier design decision to avoid LONGBLOB).
- No component in this diagram has an inbound connection from outside the LAN — router-level port forwarding/UPnP must remain disabled (see Configuration Document, Phase 6).
