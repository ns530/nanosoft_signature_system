# Business Case / Proposal
## HolcemLK Banker — Customer Signature & Image Collection System

### 1. Problem Statement
Currently, customer signature cards and photographs are collected and stored manually (paper-based or ad-hoc digital files). This creates: no reliable audit trail of who captured/handled the data, risk of loss/damage/tampering, slow retrieval during verification, and no enforced control over who is authorized to collect biometric-adjacent customer data.

### 2. Proposed Solution
A local, network-isolated system where only a Bank Admin can authorize a data-collection session (via a short-lived QR token), and only an authenticated Bank Officer can scan that token to capture and upload a customer's signature/photo. All captured images are encrypted at rest, watermarked, and fully audit-logged, stored separately from other customer data.

### 3. Expected Benefits
- **Control:** No image can be captured without explicit, time-bound Admin authorization.
- **Traceability:** Every capture/replacement is logged with officer identity and timestamp.
- **Data protection:** Encryption + watermarking + DB separation reduce breach impact.
- **Efficiency:** Digital retrieval replaces manual document search.
- **Compliance readiness:** Structured handling aligned with Sri Lanka's Personal Data Protection Act (PDPA) for sensitive personal data.

### 4. Cost-Benefit Overview (Qualitative)
| Cost | Benefit |
|---|---|
| Internal developer time (backend + 2 Flutter apps) | Eliminates recurring manual filing/retrieval cost |
| Local infra hardening (TLS certs, Redis, encryption keys) | Reduces breach/fraud liability exposure |
| QA/security testing effort | Avoids regulatory non-compliance penalties |

### 5. Risks of Not Proceeding
Continued manual handling risk: data loss, unauthorized access to physical/loose signature files, no accountability trail, slower audits, potential PDPA non-compliance exposure.

### 6. Alternatives Considered
- **Do nothing (status quo manual process):** Rejected — does not scale, no audit trail.
- **Third-party cloud SaaS for document capture:** Rejected — conflicts with requirement to keep core banking data fully on-premise/local-network only.
- **Build in-house, local-only system (chosen):** Meets security, compliance, and infrastructure constraints.

### 7. Recommendation
Proceed with the in-house local system as scoped in the Project Charter.
