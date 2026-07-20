# Stakeholder RACI Matrix
## HolcemLK Banker Customer Signature & Image Collection System

R = Responsible, A = Accountable, C = Consulted, I = Informed

| Phase | PM | Business Analyst | System Architect | Backend Dev | Flutter Dev | QA | DevOps | Bank Admin | Compliance Officer |
|---|---|---|---|---|---|---|---|---|---|
| 1. Planning & Initiation | A | R | C | I | I | I | I | C | C |
| 2. Requirements Analysis | A | R | C | C | C | I | I | C | C |
| 3. System Design | A | C | R | R | R | C | I | I | C |
| 4. Development | A | I | C | R | R | I | C | I | I |
| 5. Testing | A | I | C | C | C | R | I | C | C |
| 6. Deployment | A | I | C | C | C | C | R | R | I |

### Notes
- PM holds Accountable across all phases — single point of overall delivery ownership.
- Business Analyst is Responsible in early phases (requirements gathering), shifting to Informed once development starts.
- System Architect is Responsible for Design, Consulted through Development/Testing to confirm implementation matches design intent.
- Compliance Officer is Consulted at every phase gate (Planning, Requirements, Design, Testing) — this is a sensitive-personal-data system under PDPA, so compliance sign-off should never be a purely end-of-project step.
- Bank Admin is Responsible at Deployment (device setup, first QR generation) alongside DevOps.
