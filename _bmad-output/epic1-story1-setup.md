---
epic: 1
story: 1
title: Setup Project Structure & Dual-DB Connection
status: draft
---

## Story Goal
Establish the foundational project structure and implement secure connections to both databases (`holcemlk_banker_dataentry` and `holcemlk_banker_images`) with proper credential separation, plus Redis connection for session management.

## Acceptance Criteria

1. **Dual-DB & Redis Connection Setup**
   - Given the Node.js project is initialized
   - When configuring database connections
   - Then three separate connections are created with:
     - `app_dataentry_ro` (SELECT-only on `customerinformation`, `systemusers`)
     - `app_images_rw` (SELECT/INSERT on `customer_images`, `customer_previous_images`, `audit_log`)
     - Redis client for session/token state (with same TLS requirements as DB connections)
     - And no UPDATE/DELETE permissions on protected tables (AD-9)

2. **TLS Enforcement**
   - Given connection configurations
   - When establishing connections
   - Then all connections (MySQL and Redis) must:
     - Use TLS 1.2+ (NFR-01)
     - Reject plaintext connections (AD-11)
     - Verify server certificates

3. **Encryption Key Management**
   - Given the security requirements
   - When configuring the system
   - Then it must provide:
     - Secure key storage using OS-level secret store (Windows DPAPI/Linux keyring)
     - Key rotation interface stub
     - Compliance documentation placeholder (NFR-09)
   - Note: Actual encrypt/decrypt implementation belongs to Epic 5

4. **Offline Capability Foundation**
   - Given the connection modules
   - When network connectivity is unavailable
   - Then they must:
     - Detect disconnection (NFR-07)
     - Surface connection state to application layer
     - Not silently fail or corrupt data

5. **Credential Security**
   - Given the system credentials
   - When stored in configuration
   - Then they must:
     - Use OS-level secret store for production
     - Never appear in source code
     - Follow least-privilege principle (NFR-10)

## Implementation Tasks

1. Initialize Node.js project with:
   - TypeScript
   - Sequelize/Prisma ORM + Redis client
   - Config loader for environment variables

2. Create connection modules:
   - `src/db` with separate MySQL connection pools
   - `src/redis` with health-checked client
   - Shared TLS configuration for all connections

3. Implement key management service with:
   - OS-level secret storage (DPAPI/keyring)
   - Key rotation interface stub
   - Compliance documentation placeholder

4. Add connection state tracking:
   - Unified state monitor for MySQL+Redis
   - Exponential backoff reconnection
   - Graceful degradation

## Verification Steps

1. Execute connection tests with:
   - Valid credentials (success)
   - Insufficient permissions (failure)
   - TLS handshake verification

2. Validate key management:
   - Test key loading from OS secret store
   - Verify rotation interface exists
   - Confirm keys never logged

3. Test offline behavior:
   - Simulate network dropout
   - Verify detection and state reporting
   - Check no partial writes occur

## Open Questions

1. **Credential Storage Implementation**
   - Current Guidance: Use OS-level secret store (Windows DPAPI/Linux keyring) for production, with HSM/KMS as future enhancement if budget allows
   - Follow-up: Document in deployment guide (Docs/06-deployment)

2. **Detailed PDPA Requirements**
   - Need legal review of key management
   - Marked as Epic 5 follow-up

3. **Connection Retry Strategy**
   - Recommended: Exponential backoff (max 5 retries)
   - Confirmed in implementation