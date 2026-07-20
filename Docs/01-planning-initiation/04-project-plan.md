# Project Plan
## HolcemLK Banker — Customer Signature & Image Collection System

### 1. Phase Breakdown & Indicative Timeline
| Phase | Key Output | Indicative Duration |
|---|---|---|
| 1. Planning & Initiation | Charter, Business Case, Feasibility, Plan | 1 week |
| 2. Requirements Analysis | PRD, SRS, Use Cases, RTM | 1–2 weeks |
| 3. System Design | SDD, HLD, LLD, DB Design, UI/UX | 2 weeks |
| 4. Development | Backend, QR app, Collector app | 4–6 weeks |
| 5. Testing | Test plan/cases, security testing, bug fixing | 2 weeks |
| 6. Deployment | Local deployment, config, release notes | 1 week |

### 2. Resources per Phase
- **Planning/Requirements:** PM, Business Analyst, Compliance Officer
- **Design:** System Architect, DB Designer, UI/UX Designer
- **Development:** Backend Developer (Node.js), Flutter Developer(s)
- **Testing:** QA Engineer(s), Security tester
- **Deployment:** DevOps/IT Admin, PM

### 3. Milestones
1. Charter & requirements signed off
2. Architecture & DB design baselined
3. Backend auth + QR flow functional (internal demo)
4. Both apps functional end-to-end (image capture demo)
5. Security test pass (QR replay, MITM, encryption checks)
6. Go-live on branch local network

### 4. Dependencies
- Design phase depends on finalized SRS.
- Development depends on baselined DB design and API contract.
- Testing depends on a feature-complete build.
- Deployment depends on passed security test sign-off.

### 5. Risk Register (Top Risks)
| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | QR token replay/reuse | Medium | High | One-time Redis session, short expiry, server-side invalidation on use |
| 2 | MITM on LAN | Medium | High | Mandatory TLS (self-signed internal CA) for all traffic |
| 3 | Weak/legacy password storage (`UserPassword`) reused for login | Medium | Critical | Login strictly via bcrypt-hashed `MobilePassword`/`web_password` fields only |
| 4 | Image data leakage from DB/backup | Low | High | AES-256 encryption at rest, restricted DB credentials, encrypted backups |
| 5 | Admin account compromise → mass QR generation | Low | High | OTP step-up on new device/IP, concurrent-login lockout, anomaly alerts |
| 6 | Officer device loss with cached images | Low | Medium | No local gallery storage; in-memory capture; secure storage only for pending offline queue |
| 7 | Tampered/rooted app used to bypass controls | Low | Medium | Root/jailbreak + emulator detection, app integrity checks |
| 8 | Schema drift on fixed tables breaking joins | Low | Medium | Freeze `customerinformation`/`systemusers` schema; version-control migration scripts for the images DB only |

### 6. Governance
Weekly status check between PM and Architect; security sign-off required as a gate before Deployment phase begins.
