---
paths:
  - docs/*
---

# PDS Protocol — Claude Code Rules

## File Numbering Convention
PDS documents are numbered 01-10. Always use the prefix number in references and filenames. The numbering represents dependency order, not priority.

## ID Systems
- **DEC-NNNN** — Decision Log entries (07)
- **ROAD-NNNN** — Roadmap items (08)
- **BUG-NNNN** — Bug Log entries (09)
- Always assign the next sequential ID. Never reuse IDs.

## Cross-Referencing Rules
When you complete work, update ALL relevant tracking files:

- **Finished a Roadmap item** → Update ROAD status in Roadmap (08) + add entry in Changelog (10) under Added/Changed
- **Fixed a bug** → Update BUG status in Bug Log (09) + add entry in Changelog (10) under Fixed
- **Made an architectural decision** → Add DEC entry in Decision Log (07). If it changes the design, update Technical Architecture (02) or Specification (03)
- **Review found a bug** → Log in Bug Log (09) from review-notes.md
- **Completed a release** → Move Changelog (10) [Unreleased] items into a versioned section. Update Deployment Runbook (06) if process changed.

## Strategic vs. Tracking Files
- Documents 01-06 are **strategic** — do not modify without explicit instruction from the user
- Documents 07-10 are **tracking** — update proactively as you work
- `.context/` files are **ephemeral** — overwrite freely each task cycle

## Template Discipline
- Use the exact template format in each file. Do not improvise field names.
- Never delete entries from tracking files. Move them to completed/resolved sections.
- Keep entries concise but specific enough to be useful months later.

## Backlog Management
- When a feature idea, improvement, or tech debt item comes up during work, add it to Roadmap (08) as Proposed/Unranked
- Do not approve or prioritize Roadmap items without explicit user instruction

## Agent Context Files
- `.context/spec.md` is written by the ARCHITECT agent and consumed by the IMPLEMENTER
- `.context/review-notes.md` is written by the REVIEWER agent
- These files are per-task and do not accumulate history — that goes in the permanent tracking files
