---
epic: 4
story: 1
title: Customer Lookup
status: draft
created: 2026-07-06
---

## Story Goal
Implement CustomerID verification against the `customerinformation` table (read-only, `holcemlk_banker_dataentry` database), gated by a valid unlock-session JWT, returning only the minimal fields needed for officer confirmation.

## Acceptance Criteria

1. **Customer Lookup with Valid Unlock Session (FR-08, AD-11)**
   - Given a valid unlock-session JWT in the `X-Unlock-Token` header
   - When calling `GET /api/officer/customer/:customerId`
   - Then the unlock JWT signature and `exp` are verified (type must be `unlock_session`)
   - And `CustomerID` existence is checked against `customerinformation` via the `app_dataentry_ro` connection
   - And 200 OK is returned with minimal fields (CustomerID, CustomerName — no unnecessary PII)

2. **Customer Lookup — Not Found (TC-CUST-02)**
   - Given a valid unlock-session JWT
   - When calling `GET /api/officer/customer/:customerId` with a non-existent ID
   - Then 404 Not Found is returned with message "Customer not found"

3. **Unauthorized Access Without Unlock Session (TC-API-01 pattern)**
   - Given a request without a valid X-Unlock-Token header
   - When calling `GET /api/officer/customer/:customerId`
   - Then 401 Unauthorized is returned

4. **Read-Only DataEntry Query (AD-1, AD-9)**
   - When querying `customerinformation`
   - Then it must use the `app_dataentry_ro` connection (read-only)
   - And use parameterized SQL (no string concatenation)
   - And select only minimal fields (CustomerID, CustomerName) — not the full record

## Implementation Tasks

1. Create `src/customer/customerLookupService.ts` with:
   - `lookupCustomer(customerId: string): Promise<{ CustomerID: string; CustomerName: string } | null>` — parameterized query against `customerinformation` via `dataEntryDb`
   - `verifyUnlockSession(token: string): Promise<{ officer_id: string; nonce: string }>` — calls `verifyToken` from jwtService, checks `type === 'unlock_session'`

2. Create `src/customer/customerLookupRouter.ts` with:
   - `GET /api/officer/customer/:customerId` — validates X-Unlock-Token, calls lookupCustomer, returns minimal customer info or 404

3. Wire into `src/server.ts`

## Verification Steps

1. Valid unlock session + existing CustomerID → 200 + basic info (CustomerID, CustomerName)
2. Valid unlock session + non-existent CustomerID → 404 "Customer not found"
3. Missing/invalid X-Unlock-Token → 401
4. Query uses `dataEntryDb` (not `imagesDb`) — confirm by checking import path
5. Query uses parameterized SQL — confirm by checking `replacements` usage

## Requirements Traceability

- **FR-08:** CustomerID verification before capture
- **AD-1:** Dual-database (dataentry read-only)
- **AD-9:** DB credential separation (app_dataentry_ro)
- **AD-11:** TLS for all endpoints

## Open Questions

1. Minimal fields: CustomerID and CustomerName only. Any additional display fields needed (e.g. branch, account type)? Provisionally "no" — the officer needs enough to confirm identity, not a full profile. Adjust if business analyst requests more.
