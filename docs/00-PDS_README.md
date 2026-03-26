# Product Development Standard (PDS) — Unified Documentation Structure

## Directory Layout

```
opsIQ/
├── CLAUDE.md                              ← Project config, references this system
├── .claude/
│   └── rules/
│       └── pds-protocol.md                ← Scoped rules for managing PDS files
│
├── docs/
│   │
│   │  ── PRODUCT DEFINITION (Strategic) ──────────────────────
│   │
│   ├── 01-PRODUCT_BRIEF.md                ← What this is, who it's for, why it exists
│   ├── 02-TECHNICAL_ARCHITECTURE.md        ← System design, infrastructure, data flow
│   ├── 03-SPECIFICATION.md                 ← Detailed functional/non-functional requirements
│   ├── 04-API_DOCUMENTATION.md             ← Message types, data models, CustomEvent bridge
│   │
│   │  ── OPERATIONS (How to build, test, ship) ───────────────
│   │
│   ├── 05-TEST_PLAN.md                     ← Testing strategy, cases, coverage requirements
│   ├── 06-DEPLOYMENT_RUNBOOK.md            ← How to deploy, rollback, environment configs
│   │
│   │  ── TRACKING (Living records, updated continuously) ─────
│   │
│   ├── 07-DECISION_LOG.md                  ← Architectural and strategic decisions with rationale
│   ├── 08-ROADMAP.md                       ← Strategic feature plan with priorities and status
│   ├── 09-BUG_LOG.md                       ← Bug tracking with BUG-NNNN IDs
│   ├── 10-CHANGELOG.md                     ← All notable changes, Keep a Changelog format
│   │
│   │  ── AGENT CONTEXT (Ephemeral, per-session) ─────────────
│   │
│   └── .context/
│       ├── spec.md                         ← Current task spec (ARCHITECT output)
│       └── review-notes.md                 ← Current review status (REVIEWER output)
```

## File Purposes and Relationships

### Strategic Layer (01-04): Define the product. Updated infrequently.
These files are the product's identity. They answer: what are we building, why, and how is it designed? Agents read these for context but rarely modify them without explicit instruction.

### Operations Layer (05-06): Define how to validate and ship. Updated per-release.
These files support the build process. They answer: how do we know it works, and how do we get it live?

### Tracking Layer (07-10): Living records. Updated continuously during development.
These files are the project's memory. They answer: what did we decide, what's planned, what broke, and what changed? Agents update these proactively during work.

### Agent Context (.context/): Ephemeral session files. Overwritten each task.
These files are the current work-in-progress state. They exist for agent-to-agent handoff within a single development cycle and are not permanent records.

## How They Cross-Reference

- A completed **Roadmap item** (08) → entry in **Changelog** (10) under Added/Changed
- A fixed **Bug** (09) → entry in **Changelog** (10) under Fixed
- An **architectural decision** during development → entry in **Decision Log** (07)
- A **Decision Log** entry that changes the spec → update **Specification** (03) or **Technical Architecture** (02)
- An **Agent spec** (.context/spec.md) references the **Specification** (03) for acceptance criteria
- **Review notes** (.context/review-notes.md) may generate **Bug Log** entries (09)
