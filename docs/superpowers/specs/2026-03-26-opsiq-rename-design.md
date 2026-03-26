# opsIQ Rename + PDS Documentation Design

## Goal

Two-part task:
1. Rename the Chrome extension from "TRIBBUTE Auditor" to "opsIQ" across all source files (display names, internal identifiers, event names, guard flags, report headers, documentation).
2. Create the full Product Development Standard (PDS) documentation structure used by the other products in the suite (feedIQ, pdpIQ).

---

## Part 1: Rename

### Files Affected

| File | Changes |
|------|---------|
| `manifest.json` | `"name"`: `"TRIBBUTE Auditor"` → `"opsIQ"` |
| `popup.html` | `<title>` and `<h1>`: `TRIBBUTE Auditor` → `opsIQ` |
| `popup.js` | File comment, report headers (`TRIBBUTE TRACKING AUDIT REPORT`, `TRIBBUTE SCHEMA AUDIT REPORT`, `TRIBBUTE TRACKING AUDITOR REPORT`) |
| `content.js` | File comment, all `__tribbute` guard flags and `__tribbute_event__` / `__tribbute_tracking__` event names |
| `injected.js` | File comment, all `__tribbute` guard flags and `__tribbute_event__` / `__tribbute_tracking__` event names |
| `background.js` | File comment, console.log strings |
| `CLAUDE.md` | Project name, directory path references |
| `README.md` | All user-facing TRIBBUTE references (repo URLs left as-is — requires separate GitHub repo rename) |

### Rename Mapping

| Before | After |
|--------|-------|
| `TRIBBUTE Auditor` | `opsIQ` |
| `TRIBBUTE Tracking Auditor` | `opsIQ` |
| `TRIBBUTE TRACKING AUDIT REPORT` | `opsIQ TRACKING AUDIT REPORT` |
| `TRIBBUTE SCHEMA AUDIT REPORT` | `opsIQ SCHEMA AUDIT REPORT` |
| `TRIBBUTE TRACKING AUDITOR REPORT` | `opsIQ TRACKING AUDITOR REPORT` |
| `__tribbute` (guard flag) | `__opsiq` |
| `__tribbute_event__` | `__opsiq_event__` |
| `__tribbute_tracking__` | `__opsiq_tracking__` |

### Out of Scope for Rename

- GitHub repo URL (`mrkkonechny/tribbute-tracking-auditor`) — requires a GitHub repo rename, done separately
- Folder name on disk — requires OS-level rename, done separately
- `popup.css` — no TRIBBUTE references found

---

## Part 2: PDS Documentation Structure

Matches the structure used by feedIQ and pdpIQ exactly. All files created from scratch with opsIQ-specific content.

### Files to Create

```
docs/
├── 00-PDS_README.md           ← Directory structure guide (adapted from pdpIQ)
├── 01-PRODUCT_BRIEF.md        ← What opsIQ is, who it's for, why it exists
├── 02-TECHNICAL_ARCHITECTURE.md ← System design: injected.js → content.js → background.js → popup.js
├── 03-SPECIFICATION.md        ← User stories for tracking detection, event monitoring, audit, schema
├── 04-API_DOCUMENTATION.md    ← Chrome message-passing API: message types, data models
├── 05-TEST_PLAN.md            ← Test strategy (currently all manual; recommend Vitest for pure logic)
├── 06-DEPLOYMENT_RUNBOOK.md   ← Load unpacked (dev) and Chrome Web Store (prod) process
├── 07-DECISION_LOG.md         ← Architectural decisions with DEC-NNNN IDs; seed with key existing decisions
├── 08-ROADMAP.md              ← Backlog seeded from audit findings (Critical/High/Medium issues as ROAD items)
├── 09-BUG_LOG.md              ← Bug log seeded from audit findings (Critical/High severity as BUG items)
├── 10-CHANGELOG.md            ← Keep a Changelog format; seed with v1.2.0 (current) and v1.0.0 entries
└── .context/
    ├── spec.md                ← Placeholder (ephemeral — overwritten each task)
    └── review-notes.md        ← Placeholder (ephemeral — overwritten each task)

.claude/
└── rules/
    └── pds-protocol.md        ← Operational rules for Claude (exact copy of pdpIQ version, adapted for opsIQ)
```

### PDS Document Content Guidance

**01-PRODUCT_BRIEF:** opsIQ is a Chrome popup extension (not side panel) that audits tracking implementations (GTM/GA4/Google Ads/Facebook Pixel), monitors real-time dataLayer/gtag/fbq events, validates GA4 ecommerce events, and audits schema markup. Zero-telemetry, popup-based UI, MV3. Target users: analytics engineers, tag managers, SEO/tracking QA practitioners.

**02-TECHNICAL_ARCHITECTURE:** Document the 4-context MV3 architecture: `injected.js` (page context, intercepts dataLayer/gtag/fbq via `__opsiq` guards, dispatches CustomEvents) → `content.js` (content script, listens to `__opsiq_event__`/`__opsiq_tracking__`, DOM scans, relays via `chrome.runtime.sendMessage`) → `background.js` (service worker, message routing) → `popup.js` (popup UI, validation engines, rendering). Note the `web_accessible_resources` injection pattern.

**03-SPECIFICATION:** User stories for: (1) detecting tracking implementations on load, (2) monitoring live events in the Events tab, (3) validating GA4 ecommerce events in the Audit tab, (4) auditing schema markup in the Schema tab, (5) identifying schema implementation opportunities, (6) copying/exporting audit reports.

**04-API_DOCUMENTATION:** Document all Chrome message types: `GET_TRACKING_DATA`, `TRACKING_FOUND`, `NEW_EVENT`, `CLEAR_EVENTS`, `GET_EVENTS`, `POPUP_CLOSED`. Document the CustomEvent bridge: `__opsiq_event__` and `__opsiq_tracking__` event schemas.

**07-DECISION_LOG:** Seed with key existing architectural decisions:
- DEC-0001: CustomEvent bridge pattern (injected.js → content.js) — why `chrome.runtime` is inaccessible in page-context scripts
- DEC-0002: `web_accessible_resources` with `<all_urls>` — deliberate tradeoff with fingerprinting risk
- DEC-0003: Popup (not side panel) UI surface — appropriate for quick audits vs. pdpIQ's persistent analysis UX

**08-ROADMAP:** Seed with audit findings as ROAD items:
- ROAD-0001 (P0): Fix `item.source` XSS in popup.js:1126
- ROAD-0002 (P1): Add `tabs` permission to manifest.json
- ROAD-0003 (P1): Fix `isContextValid` permanent-disable on transient SW restart errors
- ROAD-0004 (P1): Replace POPUP_CLOSED `window.unload` with port-based detection
- ROAD-0005 (P2): Cap `capturedEvents` array at 500 entries + incremental DOM rendering
- ROAD-0006 (P2): Fix AW- false positive regex in content.js
- ROAD-0007 (P2): Fix `noscript.textContent` fallback
- ROAD-0008 (P2): Clear `checkGoogleTagManager` interval on zero-ID match
- ROAD-0009 (P2): Debounce `scanForTrackingScripts()` with MutationObserver
- ROAD-0010 (P3): Remove/consolidate inline fallback in content.js (matches injected.js)
- ROAD-0011 (P3): Split popup.js into validators.js / renderers.js / popup.js
- ROAD-0012 (P3): Narrow `web_accessible_resources` matches scope

**09-BUG_LOG:** Seed with Critical/High audit findings as open bugs (BUG-0001 through BUG-0004, matching ROAD-0001 through ROAD-0004).

**10-CHANGELOG:** Seed with v1.2.0 (current release, 2026-03-26) and v1.0.0 entries based on the existing README and git history.

### CLAUDE.md Updates

Add a PDS section to `CLAUDE.md` matching the pattern from pdpIQ's CLAUDE.md:
- Reference `docs/00-PDS_README.md` for structure
- Reference `.claude/rules/pds-protocol.md` for operational rules
- Document the ID systems (DEC/ROAD/BUG)
- Note strategic (01-06) vs. tracking (07-10) distinction
