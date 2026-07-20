# System File Structure
## HolcemLK Banker Customer Signature & Image Collection System

Full repository/system layout — covers backend, both Flutter apps, and shared infrastructure config, at the whole-system level (not just backend internals).

```
holcemlk-banker-system/
│
├── backend/                          # Node.js API server
│   ├── src/
│   │   ├── config/                   # env loading, DB configs (dataentry + images), Redis config
│   │   ├── models/                   # ORM models
│   │   │   ├── SystemUser.js
│   │   │   ├── CustomerInformation.js   # read-only mapping, fixed schema
│   │   │   ├── CustomerImage.js
│   │   │   ├── CustomerPreviousImage.js
│   │   │   └── AuditLog.js
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── qr.routes.js
│   │   │   └── image.routes.js
│   │   ├── controllers/
│   │   ├── services/
│   │   │   ├── authService.js
│   │   │   ├── qrService.js
│   │   │   ├── imageService.js
│   │   │   └── auditService.js
│   │   ├── middleware/
│   │   │   ├── authenticateJWT.js
│   │   │   ├── requireRole.js
│   │   │   ├── rateLimiter.js
│   │   │   └── validateUnlockSession.js
│   │   └── utils/
│   │       ├── encryption.js
│   │       ├── watermark.js
│   │       └── logger.js
│   ├── migrations/                   # DB migrations — images DB only
│   ├── certs/                        # local TLS cert/key (gitignored)
│   ├── .env.example
│   └── package.json
│
├── apps/
│   ├── qr-generator-app/             # Flutter — Admin
│   │   ├── lib/
│   │   │   ├── screens/ (login, otp, generate_qr, session_history)
│   │   │   ├── services/ (api_client, secure_storage)
│   │   │   └── widgets/
│   │   └── pubspec.yaml
│   │
│   └── collector-app/                # Flutter — Bank Officer
│       ├── lib/
│       │   ├── screens/ (login, otp, scan_qr, customer_lookup, capture, upload_status)
│       │   ├── services/ (api_client, secure_storage, offline_queue)
│       │   └── widgets/
│       └── pubspec.yaml
│
├── infra/
│   ├── redis/                        # local Redis config
│   ├── mysql/                        # grant scripts for least-privilege DB users
│   └── nginx-or-node-tls/            # TLS termination config, if applicable
│
├── docs/                             # this documentation set (all 6 SDLC phases)
│
├── .gitignore                        # excludes .env, certs/, node_modules, build artifacts
└── README.md
```

### Key Placement Rules
- `backend/certs/` and any filled `.env` are **never committed** — only `.env.example` with placeholders is tracked.
- `migrations/` only ever alters `holcemlk_banker_images` — no migration in this repo touches `holcemlk_banker_dataentry`.
- Each Flutter app has its own `secure_storage` service wrapper — no shared/global storage between the two apps, since Admin and Officer credentials must never mix.
