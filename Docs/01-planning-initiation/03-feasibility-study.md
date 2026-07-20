# Feasibility Study
## HolcemLK Banker — Customer Signature & Image Collection System

### 1. Technical Feasibility
- **Backend:** Node.js with an ORM (Sequelize/Prisma) supports multiple simultaneous DB connections, which is required for the `holcemlk_banker_dataentry` / `holcemlk_banker_images` split. Mature libraries exist for bcrypt hashing, JWT, Redis session handling, and image processing (sharp).
- **Frontend/Apps:** Flutter supports QR generation/scanning, secure storage, screen-capture blocking, and root/jailbreak detection via existing packages — verified as technically viable.
- **Infrastructure:** A single local PC can host the Node.js server and both MySQL databases for the expected transaction volume (branch-level, not high-concurrency).
- **Verdict:** Technically feasible with standard, well-supported tooling.

### 2. Operational Feasibility
- Bank Officers already perform manual signature/photo collection; the new workflow (login → wait for Admin QR → scan → capture → upload) adds a coordination step but removes paper handling.
- Requires Admin availability to generate QR sessions — an operational dependency that should be documented in the officer workflow (SOP).
- **Verdict:** Feasible, with a minor process/training adjustment.

### 3. Economic Feasibility
- No new cloud/infrastructure spend — reuses existing local PC and network.
- Primary cost is internal development and testing time.
- **Verdict:** Feasible; cost is time-bound, not recurring.

### 4. Legal / Regulatory Feasibility
- Signatures and photographs are sensitive personal data under Sri Lanka's PDPA. The system must document lawful basis for collection (customer onboarding/KYC), retention policy, and access controls.
- Local-only, non-internet-facing design reduces cross-border data transfer concerns.
- **Verdict:** Feasible, provided a data retention & consent policy is documented (recommended output of Requirements phase).

### 5. Overall Feasibility Verdict
**Go**, subject to: (a) Admin-availability SOP defined, (b) PDPA retention/consent policy documented before go-live, (c) security controls in the agreed architecture (QR one-time tokens, encryption, audit logging) implemented as designed — not descoped for convenience.
