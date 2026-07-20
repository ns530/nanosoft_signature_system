# HolcemLK Banker — Customer Signature & Image Collection System
## Full SDLC Documentation Set (6 Phases)

This package contains AI prompts + generated documents for all 6 SDLC phases, built around the security architecture agreed for this system: dual-database separation, QR-gated one-time-session image capture, bcrypt authentication, encrypted image storage, watermarking, and full audit logging.

## Folder Structure
```
01-planning-initiation/     Project Charter, Business Case, Feasibility Study, Project Plan
02-requirements-analysis/   PRD, SRS, Use Cases/User Stories, RTM
03-system-design/           SDD, HLD, LLD, Database Design, UI/UX Guide
04-development/             Source Code Doc Guide, API Docs, Changelog, Build & Setup Guide
05-testing/                 Test Plan, Test Cases, Bug Report Template, Test Summary Report
06-deployment/               Deployment Guide, Configuration Document, Release Notes
```

Each phase folder starts with `00-ai-prompts.md` — 6 ready-to-use AI prompts for generating/refining that phase's documents with an AI assistant. Feed each phase's outputs forward as context into the next phase's prompts (e.g. paste the finalized SRS before running Phase 3 prompts).

## How to Use With an AI Coding Assistant
1. Start with Phase 1 documents — get sign-off before moving on.
2. When developing (Phase 4), keep the SDD/HLD/LLD open as the source of truth — ask the AI to implement one module at a time, referencing the exact security control it must enforce (see `04-development/01-source-code-doc-guide.md` for the JSDoc security-comment convention).
3. Do not skip Phase 5 security test cases before Phase 6 deployment — several are Critical-severity gates (QR replay, encryption verification, auth bypass).

## Important Reminders (carried over from design discussion)
- `customerinformation` and `systemusers` schemas are fixed — read-only from this system.
- Login must use bcrypt-verified `MobilePassword`/`web_password` fields only — never the legacy `UserPassword` field.
- QR tokens are one-time-use and short-lived — this is the core access control replacing static IP/MAC binding.
- All traffic TLS-encrypted even though the system is LAN-only.

## Before You Call This "Production Ready"
Read `06-deployment/04-known-limitations-and-recommendations.md` before go-live. Documentation and an AI-code security checklist reduce design and implementation risk, but do not by themselves make this system verified-safe for real customer biometric-adjacent data. That document lists 7 specific, unresolved gaps (key management, device management, admin single-point-of-failure, automated security pipeline, regulatory coverage beyond PDPA, independent audit) with a sign-off table — every item needs an explicit decision recorded before this goes live with real customers, not a silent skip.
