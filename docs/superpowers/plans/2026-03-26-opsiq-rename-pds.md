# opsIQ Rename + PDS Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the Chrome extension from "TRIBBUTE Auditor" to "opsIQ" across all source files, and create the full PDS documentation structure matching feedIQ/pdpIQ.

**Architecture:** Part 1 is a pure search-and-replace rename across 8 files. Part 2 creates 14 new documentation files under `docs/` and `.claude/rules/`, seeding tracking files (07-10) with content from the engineering audit findings. No source logic changes.

**Tech Stack:** Chrome Extension MV3, Vanilla JS, no build tools. All file edits via Read/Edit/Write tools.

---

## Prerequisites

- [ ] **Commit this plan before starting**

```bash
git add docs/superpowers/plans/2026-03-26-opsiq-rename-pds.md
git commit -m "docs: add opsIQ rename + PDS implementation plan"
```

---

## Part 1: Rename

### Task 1: Rename display names in manifest.json, popup.html, background.js

**Files:**
- Modify: `manifest.json:3`
- Modify: `popup.html:6,12`
- Modify: `background.js:1,16,18`

- [ ] **Step 1: Update manifest.json**

Edit `manifest.json` line 3:
```json
  "name": "opsIQ",
```

- [ ] **Step 2: Update popup.html title and h1**

Edit `popup.html` line 6:
```html
  <title>opsIQ</title>
```

Edit `popup.html` line 12:
```html
      <h1>opsIQ</h1>
```

- [ ] **Step 3: Update background.js**

Edit `background.js` line 1:
```js
// opsIQ - Background Service Worker
```

Edit `background.js` line 16:
```js
    console.log('opsIQ installed');
```

Edit `background.js` line 18:
```js
    console.log('opsIQ updated');
```

- [ ] **Step 4: Verify**

Run:
```bash
grep -n "TRIBBUTE\|tribbute" manifest.json popup.html background.js
```
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add manifest.json popup.html background.js
git commit -m "rename: update display names in manifest, popup.html, background.js"
```

---

### Task 2: Rename internal identifiers in injected.js

**Files:**
- Modify: `injected.js` (all occurrences of `__tribbute`, `__tribbute_event__`, `__tribbute_tracking__`)

The identifiers to rename (all are JS property names or CustomEvent type strings — safe to replace globally):

| Before | After |
|--------|-------|
| `window.dataLayer.__tribbute` | `window.dataLayer.__opsiq` |
| `window.gtag.__tribbute` | `window.gtag.__opsiq` |
| `window.fbq.__tribbute` | `window.fbq.__opsiq` |
| `.__tribbute` (any occurrence) | `.__opsiq` |
| `'__tribbute_event__'` | `'__opsiq_event__'` |
| `'__tribbute_tracking__'` | `'__opsiq_tracking__'` |
| `// TRIBBUTE Tracking Auditor - Injected Script` | `// opsIQ - Injected Script` |

- [ ] **Step 1: Apply all renames in injected.js**

Read the current `injected.js` to confirm line numbers, then apply each edit:

Line 1 — file comment:
```js
// opsIQ - Injected Script
```

Every occurrence of `.__tribbute` → `.__opsiq` (lines 67, 117, 144, 171, 181, 241).

Every occurrence of `'__tribbute_event__'` → `'__opsiq_event__'` (lines 79, 104, 153, 225).

Every occurrence of `'__tribbute_tracking__'` → `'__opsiq_tracking__'` (lines 87, 89, 91, 125, 127, 129, 161, 163, 165, 193, 201, 211, 223, 254).

- [ ] **Step 2: Verify**

```bash
grep -n "tribbute\|TRIBBUTE" injected.js
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add injected.js
git commit -m "rename: update internal identifiers in injected.js to __opsiq"
```

---

### Task 3: Rename internal identifiers in content.js

**Files:**
- Modify: `content.js` (all occurrences of `__tribbute`, `__tribbute_event__`, `__tribbute_tracking__`)

| Before | After |
|--------|-------|
| `// TRIBBUTE Auditor - Content Script` | `// opsIQ - Content Script` |
| `'TRIBBUTE: Could not inject...'` | `'opsIQ: Could not inject...'` |
| `.__tribbute` (any occurrence) | `.__opsiq` |
| `'__tribbute_event__'` | `'__opsiq_event__'` |
| `'__tribbute_tracking__'` | `'__opsiq_tracking__'` |
| `dispatchEvent('__tribbute_event__'` | `dispatchEvent('__opsiq_event__'` |
| `dispatchEvent('__tribbute_tracking__'` | `dispatchEvent('__opsiq_tracking__'` |
| `window.addEventListener('__tribbute_event__'` | `window.addEventListener('__opsiq_event__'` |
| `window.addEventListener('__tribbute_tracking__'` | `window.addEventListener('__opsiq_tracking__'` |

- [ ] **Step 1: Apply all renames in content.js**

Read current `content.js` to confirm line numbers, then apply each edit:

Line 1 — file comment:
```js
// opsIQ - Content Script
```

Line 72 — error string:
```js
      console.log('opsIQ: Could not inject interceptor script');
```

Lines 101, 117, 124, 137, 144, 155 — `.__tribbute` → `.__opsiq`.

Lines 109, 111, 129, 132, 133, 148, 150, 164, 172, 191 — `'__tribbute_event__'` and `'__tribbute_tracking__'` → `'__opsiq_event__'` and `'__opsiq_tracking__'`.

- [ ] **Step 2: Verify**

```bash
grep -n "tribbute\|TRIBBUTE" content.js
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add content.js
git commit -m "rename: update internal identifiers in content.js to __opsiq"
```

---

### Task 4: Rename file comment and report headers in popup.js

**Files:**
- Modify: `popup.js:1` (file comment)
- Modify: `popup.js:419` (tracking audit report header)
- Modify: `popup.js:1180` (schema audit report header)
- Modify: `popup.js:1542` (auditor report header)

- [ ] **Step 1: Update file comment (line 1)**

```js
// opsIQ - Popup Script
```

- [ ] **Step 2: Update tracking audit report header (line 419)**

```js
    report += '               opsIQ TRACKING AUDIT REPORT\n';
```

- [ ] **Step 3: Update schema audit report header (line 1180)**

```js
    report += '               opsIQ SCHEMA AUDIT REPORT\n';
```

- [ ] **Step 4: Update auditor report header (line 1542)**

```js
    report += '               opsIQ TRACKING AUDITOR REPORT\n';
```

- [ ] **Step 5: Verify**

```bash
grep -n "TRIBBUTE\|tribbute" popup.js
```
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add popup.js
git commit -m "rename: update file comment and report headers in popup.js"
```

---

### Task 5: Rename in CLAUDE.md and README.md

**Files:**
- Modify: `CLAUDE.md`
- Modify: `README.md`

- [ ] **Step 1: Update CLAUDE.md**

Line 1 — heading:
```markdown
# opsIQ
```

Line 8 — directory path:
```
tribbute-tracking-auditor/
```
Leave the directory path as-is (folder not yet renamed on disk — out of scope). Change only the heading and description text.

Edit line 11:
```
├── popup.css        # Popup styles with opsIQ branding
```

- [ ] **Step 2: Update README.md**

Apply these replacements throughout README.md:

| Before | After |
|--------|-------|
| `# TRIBBUTE Auditor` | `# opsIQ` |
| `TRIBBUTE Auditor` (all occurrences) | `opsIQ` |
| `Select the \`tribbute-tracking-auditor\` folder` | `Select the \`opsIQ\` folder` |
| `Click the refresh icon on the TRIBBUTE Auditor card` | `Click the refresh icon on the opsIQ card` |

Leave the two `github.com/mrkkonechny/tribbute-tracking-auditor` URLs unchanged (requires separate GitHub repo rename).

- [ ] **Step 3: Final verification across all source files**

```bash
grep -rn "TRIBBUTE\|tribbute" --include="*.js" --include="*.json" --include="*.html" --include="*.css" --include="*.md" .
```
Expected: only the two GitHub repo URLs in README.md remain. No other occurrences.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md README.md
git commit -m "rename: update CLAUDE.md and README.md to opsIQ"
```

---

## Part 2: PDS Documentation Structure

### Task 6: Create .claude/rules/pds-protocol.md

**Files:**
- Create: `.claude/rules/pds-protocol.md`

- [ ] **Step 1: Create directory and file**

```bash
mkdir -p .claude/rules
```

Write `.claude/rules/pds-protocol.md`:

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add .claude/rules/pds-protocol.md
git commit -m "docs: add PDS protocol rules for Claude"
```

---

### Task 7: Create docs/00-PDS_README.md

**Files:**
- Create: `docs/00-PDS_README.md`

- [ ] **Step 1: Write the file**

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add docs/00-PDS_README.md
git commit -m "docs: add PDS README (00)"
```

---

### Task 8: Create docs/01-PRODUCT_BRIEF.md

**Files:**
- Create: `docs/01-PRODUCT_BRIEF.md`

- [ ] **Step 1: Write the file**

```markdown
# Product Brief

> **PDS Document 01** | Last Updated: 2026-03-26

---

## 1. Problem Statement

Analytics engineers and tag managers have no fast, in-browser tool to verify that tracking implementations are working correctly, that GA4 ecommerce events are sending all required fields, or that schema markup is valid — without switching to browser DevTools, GTM Preview, or third-party validation services. Diagnosing a broken `purchase` event or missing Product schema currently requires opening the Network tab, filtering for gtag requests, manually inspecting payloads, and cross-referencing documentation — a workflow that takes minutes per issue and requires expert knowledge of the dataLayer, GA4 ecommerce schema, and JSON-LD spec.

The cost is silent: tracking gaps go undetected until reporting discrepancies surface in GA4, ad attribution breaks, or structured data fails Google's Rich Results Test. By then, the incorrect data has already been collected.

## 2. Target User

**Primary User:**
Analytics engineers, tag managers, and SEO practitioners at eCommerce brands and digital agencies who are responsible for tracking implementation quality, GA4 event validation, and structured data health.

**Secondary Users:**
- Digital marketing managers who want to self-serve tracking verification without DevTools expertise
- QA engineers validating tracking on staging environments before release
- eCommerce SEO practitioners auditing competitor schema implementations

**User Context:**
opsIQ fits into the QA and validation phase of tracking and schema work. Users run it immediately after publishing a tracking change, deploying a new GTM tag, or updating schema markup — similar to how developers run a linter after code changes. Before using opsIQ, users have made a change in GTM, a CMS, or site code. After using opsIQ, they either confirm correctness or identify and fix the issue.

## 3. Product Definition

**One-sentence summary:**
opsIQ is a Chrome popup extension that detects tracking implementations (GTM, GA4, Google Ads, Facebook Pixel), monitors real-time dataLayer/gtag/fbq events, validates GA4 ecommerce events and Facebook Pixel events for required fields, and audits schema markup — so analytics engineers can verify tracking correctness without leaving the browser.

**Core Capabilities:**
- Detects GTM containers, GA4 measurement IDs, Google Ads conversion IDs, and Facebook Pixel IDs from script tags and runtime objects on any page
- Intercepts live `dataLayer.push()`, `gtag()`, and `fbq()` calls in real-time via a page-context injected script, displayed in the Events tab with filtering by source and event name
- Validates GA4 ecommerce events for required fields (items, currency, value, transaction_id for purchase), recommended fields, and item-level field completeness (item_id, item_name, price, quantity)
- Validates Facebook Pixel events for required fields per event type (value, currency for Purchase)
- Detects and validates JSON-LD, Microdata, and RDFa structured data across 20+ schema types
- Applies smart schema validation: recognizes Product variants (via `inProductGroupWithID`) and skips fields inherited from parent ProductGroup; handles `@graph` arrays and nested schemas
- Surfaces prioritized implementation opportunities: missing schemas, product enhancements, rich result candidates — sorted by impact (HIGH/MEDIUM/LOW)
- Exports audit reports as plain text via clipboard copy buttons
- Runs entirely in-browser with zero data transmission — no backend, no telemetry, no user accounts

**Explicit Non-Goals:**
- Does not perform traditional SEO analysis (keyword rankings, backlinks, page speed)
- Does not crawl multiple pages — analyzes the active tab only
- Does not modify page content, GTM configuration, or schema markup
- Does not require user accounts, authentication, or cloud storage
- Does not work on Firefox, Safari, or mobile browsers — Chrome desktop only
- Does not send any page data to external servers

## 4. Success Criteria

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| Time to detect tracking on a page | Under 2 seconds | Extension popup load + `GET_TRACKING_DATA` round-trip |
| Time to surface a GA4 event validation error | Under 1 second after event fires | Event Audit tab rendering on `NEW_EVENT` |
| Schema audit completeness | Validates all JSON-LD, Microdata, RDFa on any page | Manual test on schema-rich pages |
| Zero false negatives on GTM detection | GTM detected on 100% of pages using `googletagmanager.com/gtm.js` | Manual test across 10 GTM-enabled sites |

## 5. Key Assumptions & Risks

**Assumptions:**
1. The `injected.js` → CustomEvent bridge → `content.js` → popup message-passing chain is reliable across all modern Chrome versions
2. GA4 ecommerce event validation rules (required fields per event type) are stable enough to hardcode — they change rarely
3. A popup (not side panel) is the right UX for quick validation use cases — users open it, check, close it
4. Zero-telemetry architecture is appropriate — analytics practitioners are privacy-aware and may reject extensions that phone home

**Risks:**

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Pages with strict CSP block `injected.js` from loading | Med | High | Inline fallback script in content.js (currently exists but diverged from primary — see BUG-0003) |
| `window.unload` doesn't fire reliably on popup close in Chrome | High | Low | `isPopupOpen` flag degrades gracefully; next message send sets it to false via error handler |
| GA4/Facebook Pixel change required event fields | Low | Med | Validation rules are in popup.js — easy to update per event type |
| Chrome MV3 restrictions tighten (e.g., disallow `web_accessible_resources` with `<all_urls>`) | Low | High | Currently uses standard MV3 APIs; no deprecated features in use |

## 6. Dependencies & Integrations

| Dependency | Type | Criticality | Notes |
|-----------|------|-------------|-------|
| Chrome Browser (Desktop) | Platform | Required | Manifest V3 popup extension; no Firefox/Safari/mobile support |
| Chrome Extension APIs (activeTab, scripting) | Platform API | Required | `activeTab` for URL access; `scripting` for `injected.js` injection |
| Chrome Web Store | Distribution | Required | Primary distribution channel |

## 7. Competitive / Alternative Landscape

| Alternative | Why Not Sufficient |
|------------|-------------------|
| Chrome DevTools (Network tab) | Requires filtering gtag/collect requests and reading raw query parameters; no validation of required fields; no schema parsing |
| GTM Preview Mode | Only works for GTM-managed tags; requires GTM access; separate browser tab; no schema audit |
| GA4 DebugView | Requires debug mode enabled in gtag config; only shows events reaching GA4; no Facebook Pixel or schema coverage |
| Google's Rich Results Test | Schema-only; one schema type at a time; not integrated into browsing workflow |
| Tag Assistant | GTM-specific; no GA4 ecommerce validation; no Facebook Pixel; no schema |

## 8. Roadmap Context

**Current Version (v1.2.0):**
Chrome popup extension with 4 tabs: Tracking Detection, Events, Audit, Schema. Detects GTM/GA4/Google Ads/Facebook Pixel. Monitors real-time events. Validates GA4 ecommerce and Facebook Pixel events. Audits JSON-LD/Microdata/RDFa. Zero-telemetry. Distributed via Chrome Web Store.

**Near-term (v1.3.0 — bug fixes):**
Address Critical and High severity issues from engineering audit: XSS fix in popup.js, `tabs` permission in manifest.json, `isContextValid` transient error fix, POPUP_CLOSED reliability via port-based detection.

**Medium-term (v2.0.0 — reliability):**
Event array cap + incremental rendering, MutationObserver-based tracking detection, inline fallback consolidation, popup.js refactor into validators/renderers.

---

_This brief was last reviewed on 2026-03-26 and is considered CURRENT._
```

- [ ] **Step 2: Commit**

```bash
git add docs/01-PRODUCT_BRIEF.md
git commit -m "docs: add Product Brief (01)"
```

---

### Task 9: Create docs/02-TECHNICAL_ARCHITECTURE.md

**Files:**
- Create: `docs/02-TECHNICAL_ARCHITECTURE.md`

- [ ] **Step 1: Write the file**

```markdown
# Technical Architecture

> **PDS Document 02** | Last Updated: 2026-03-26

---

## 1. System Overview

opsIQ is a Chrome Manifest V3 popup extension that runs entirely client-side with no backend server. The architecture uses a four-context model required by Chrome's extension security model:

1. **Page context** (`injected.js`) — runs in the web page's JavaScript environment, where it can intercept `dataLayer`, `gtag`, and `fbq`. Cannot access `chrome.*` APIs.
2. **Content script** (`content.js`) — runs in an isolated context with DOM access and `chrome.runtime` access, bridging the page context and the extension.
3. **Service worker** (`background.js`) — handles extension lifecycle events and message routing.
4. **Popup** (`popup.js` + `popup.html`) — the UI context, hosts all validation logic, rendering, and report generation.

Data flows in one direction: `injected.js` detects events → dispatches CustomEvents → `content.js` listens and relays via `chrome.runtime.sendMessage` → `popup.js` validates and renders.

```
┌─────────────────────────────────────────────────────────────────┐
│  Web Page (Page Context)                                        │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  injected.js                                             │   │
│  │  • Wraps window.dataLayer.push (guard: __opsiq flag)     │   │
│  │  • Wraps window.gtag (guard: __opsiq flag)               │   │
│  │  • Wraps window.fbq (guard: __opsiq flag)                │   │
│  │  • Scans window.google_tag_manager for GTM IDs           │   │
│  │  • Dispatches CustomEvents: __opsiq_event__,             │   │
│  │    __opsiq_tracking__                                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           │ window.dispatchEvent               │
└───────────────────────────┼─────────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────────┐
│  Content Script Context   ▼                                     │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  content.js                                              │   │
│  │  • Injects injected.js via <script src> + web_accessible │   │
│  │  • Listens for __opsiq_event__ and __opsiq_tracking__    │   │
│  │  • Scans DOM for tracking script tags (GTM, GA4, Pixel)  │   │
│  │  • Scans DOM for schema markup (JSON-LD, Microdata, RDFa)│   │
│  │  • Relays events to popup via chrome.runtime.sendMessage │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           │ chrome.runtime.sendMessage         │
└───────────────────────────┼─────────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────────┐
│  Extension Popup Context  ▼                                     │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  popup.js + popup.html                                   │   │
│  │  • Requests tracking data and captured events on open    │   │
│  │  • Renders tracking IDs (GTM/GA4/Google Ads/Pixel)       │   │
│  │  • Events tab: live feed with source/name filtering      │   │
│  │  • Audit tab: GA4 ecommerce + Facebook Pixel validation  │   │
│  │  • Schema tab: structured data audit + opportunities     │   │
│  │  • Report generation and clipboard copy                  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Service Worker Context                                         │
│  background.js — message routing, lifecycle logging            │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Platform | Chrome Extension Manifest V3 | Current Chrome extension standard; required for Chrome Web Store |
| Language | Vanilla JavaScript (ES5/ES6) | No build step; loads directly from source; no transpilation needed |
| UI | HTML + CSS (popup.html + popup.css) | Small, focused popup UI; no framework needed |
| Storage | None (in-memory only) | Events live in `capturedEvents` array in content.js for tab lifetime; popup re-fetches on open |
| Injection | `web_accessible_resources` | Makes `injected.js` loadable as a `<script src>` in page context |

## 3. Key Design Decisions

See Decision Log (07) for full rationale. Summary:

- **CustomEvent bridge** (DEC-0001): `injected.js` cannot use `chrome.runtime`; the only way to communicate from page context to content script is `window.dispatchEvent` + `window.addEventListener`.
- **`web_accessible_resources` with `<all_urls>`** (DEC-0002): Required for the injection mechanism. Known tradeoff: extension ID is discoverable via fingerprinting. `__opsiq` guard flags prevent double-wrapping if the script is loaded twice.
- **Popup (not side panel)** (DEC-0003): Quick validation use case. Users open, check, close. Persistent side panel would be heavier than needed.

## 4. Injection Mechanism

On `document_start`, `content.js` injects `injected.js` into the page by appending a `<script src="chrome-extension://[id]/injected.js">` element to `document.documentElement`. This is the standard MV3 pattern for accessing page-context globals.

If injection fails (e.g., due to page CSP blocking external scripts), `content.js` falls back to inlining a duplicate interceptor via `injectInlineScript()`. Note: this fallback is currently diverged from the primary — see BUG-0003 in the Bug Log.

## 5. Tracking Detection

`content.js` performs two types of tracking detection:

1. **DOM scan** (`scanForTrackingScripts()`): Iterates `<script>`, `<iframe>`, `<noscript>`, `<img>` tags at t=0, t=2s, and t=5s after `document_start`. Extracts GTM container IDs, GA4 measurement IDs, Google Ads conversion IDs, and Facebook Pixel IDs from src attributes and inline script content.

2. **Runtime interception** (`injected.js`): Wraps `window.dataLayer.push`, `window.gtag`, `window.fbq`, and polls for `window.google_tag_manager`. Dispatches `__opsiq_tracking__` events when tracking IDs are identified in runtime calls.

## 6. Schema Detection

`content.js` parses structured data at `document_idle`:

- **JSON-LD**: Finds all `<script type="application/ld+json">` tags, parses JSON, expands `@graph` arrays, resolves nested schemas
- **Microdata**: Walks the DOM for `itemscope` elements, extracts `itemtype` and `itemprop` values
- **RDFa**: Scans for `typeof` and `property` attributes

Parsed schemas are sent to `popup.js` as part of the `GET_TRACKING_DATA` response.

## 7. Known Issues

See Bug Log (09) for active bugs. Critical architecture-level issues:

- **XSS**: `item.source` in `popup.js:1126` is rendered unescaped via `innerHTML` (BUG-0001)
- **`isContextValid` permanent disable**: Set to `false` on transient service worker restart errors, permanently killing event capture (BUG-0003)
- **POPUP_CLOSED unreliability**: `window.unload` does not reliably fire on popup close (BUG-0004)

---

_This document was last reviewed on 2026-03-26 and is considered CURRENT._
```

- [ ] **Step 2: Commit**

```bash
git add docs/02-TECHNICAL_ARCHITECTURE.md
git commit -m "docs: add Technical Architecture (02)"
```

---

### Task 10: Create docs/03-SPECIFICATION.md

**Files:**
- Create: `docs/03-SPECIFICATION.md`

- [ ] **Step 1: Write the file**

```markdown
# Specification

> **PDS Document 03** | Last Updated: 2026-03-26

---

## 1. User Stories & Use Cases

### UC-001: Detect tracking implementations on page load
- **As a:** analytics engineer
- **I want to:** open the extension on any page and immediately see which tracking tools are active
- **So that:** I can confirm GTM, GA4, Google Ads, and Facebook Pixel are firing as expected
- **Acceptance Criteria:**
  - [ ] Extension popup displays detected GTM container IDs (GTM-XXXXXX format)
  - [ ] Extension popup displays detected GA4 measurement IDs (G-XXXXXXXXXX format)
  - [ ] Extension popup displays detected Google Ads conversion IDs (AW-XXXXXXXXX format)
  - [ ] Extension popup displays detected Facebook Pixel IDs
  - [ ] Each ID has a copy button that copies the ID to clipboard
  - [ ] Detection completes within 2 seconds of popup open
  - [ ] If no tracking is found for a platform, the section shows a clear "not detected" state

### UC-002: Monitor real-time events in the Events tab
- **As a:** tag manager
- **I want to:** see dataLayer pushes, gtag calls, and fbq calls as they fire in real-time
- **So that:** I can verify events are firing on the correct user interactions without opening DevTools
- **Acceptance Criteria:**
  - [ ] Events tab shows a live feed of all intercepted events since page load
  - [ ] Each event shows: source (dataLayer/gtag/fbq), event name, timestamp, and payload
  - [ ] Events can be filtered by source (All / dataLayer / gtag / fbq)
  - [ ] Events can be filtered by name (text search)
  - [ ] "Clear" button clears the event list
  - [ ] Events captured before the popup was opened are displayed when popup opens
  - [ ] New events are appended in real-time while popup is open

### UC-003: Validate GA4 ecommerce events in the Audit tab
- **As a:** analytics engineer
- **I want to:** see validation errors for GA4 ecommerce events
- **So that:** I can identify missing required fields before they cause reporting gaps in GA4
- **Acceptance Criteria:**
  - [ ] Audit tab shows validation results for all GA4 ecommerce events captured
  - [ ] Required field errors are shown for: purchase (transaction_id, currency, value, items), add_to_cart, remove_from_cart, begin_checkout, view_item, view_item_list, view_cart
  - [ ] Item-level validation checks item_id, item_name, price, quantity per item in the items array
  - [ ] Recommended field warnings are shown (e.g., item_brand, item_category)
  - [ ] Value/currency consistency is validated (both present or both absent)
  - [ ] Events with no issues show a passing state
  - [ ] Facebook Pixel Purchase events are validated for value and currency

### UC-004: Audit schema markup in the Schema tab
- **As a:** SEO practitioner
- **I want to:** see all structured data on the page with validation results
- **So that:** I can identify schema errors before they affect rich results eligibility
- **Acceptance Criteria:**
  - [ ] Schema tab lists all detected JSON-LD, Microdata, and RDFa schemas
  - [ ] Each schema shows: type, format (JSON-LD/Microdata/RDFa), validation status, and source path
  - [ ] Required field errors are shown per schema type (e.g., Product requires name, offers; Article requires headline, author)
  - [ ] Product variants (identified via `inProductGroupWithID`) skip validation for fields inherited from ProductGroup (brand, manufacturer, aggregateRating)
  - [ ] `@graph` arrays are expanded and each schema is validated individually
  - [ ] Nested schemas (e.g., Offer inside Product) are detected and validated

### UC-005: View schema implementation opportunities
- **As a:** SEO practitioner
- **I want to:** see recommendations for schema markup I'm missing
- **So that:** I know which schemas to add to improve rich results eligibility
- **Acceptance Criteria:**
  - [ ] Opportunities section lists missing schemas that would benefit the page type
  - [ ] Each opportunity shows: schema type, priority (HIGH/MEDIUM/LOW), and rationale
  - [ ] Product-specific opportunities are shown on product pages (AggregateRating, Reviews, GTIN/MPN identifiers)
  - [ ] Site-wide opportunities are shown on all pages (WebSite with SearchAction, BreadcrumbList, Organization)
  - [ ] Article-specific opportunities are shown on article pages (Author with sameAs, datePublished)

### UC-006: Export audit reports
- **As a:** analytics engineer
- **I want to:** copy audit results to the clipboard
- **So that:** I can paste them into a bug report, Slack message, or client deliverable
- **Acceptance Criteria:**
  - [ ] "Copy All" button copies the full tracking + events report as formatted plain text
  - [ ] "Copy Audit" button copies the event validation report
  - [ ] "Copy Schema" button copies the schema audit with recommendations
  - [ ] Copied text is human-readable without any HTML

## 2. Non-Functional Requirements

| Requirement | Specification |
|-------------|--------------|
| Performance | Popup renders within 500ms of open; event interception adds <1ms overhead per event |
| Memory | `capturedEvents` array capped at 500 entries (currently unbounded — see ROAD-0005) |
| Compatibility | Chrome desktop, Manifest V3, Chrome 88+ |
| Privacy | Zero network requests to external servers; no telemetry; no user accounts |
| Security | All user-supplied content rendered via `escapeHtml()` before `innerHTML` assignment (XSS fix pending — see BUG-0001) |

## 3. Out of Scope

- Multi-page or site-wide auditing
- GTM container configuration access
- GA4 property configuration access
- Automatic fixing of tracking or schema issues
- Firefox, Safari, or mobile browser support
```

- [ ] **Step 2: Commit**

```bash
git add docs/03-SPECIFICATION.md
git commit -m "docs: add Specification (03)"
```

---

### Task 11: Create docs/04-API_DOCUMENTATION.md

**Files:**
- Create: `docs/04-API_DOCUMENTATION.md`

- [ ] **Step 1: Write the file**

```markdown
# API & Interface Documentation

> **PDS Document 04** | Last Updated: 2026-03-26

---

## 1. Overview

opsIQ has no REST API or CLI. Its interfaces are:

1. **CustomEvent bridge** — page context (`injected.js`) → content script (`content.js`) via `window.dispatchEvent` / `window.addEventListener`
2. **Chrome message-passing API** — content script → popup via `chrome.runtime.sendMessage`
3. **User interface** — Chrome popup with 4 tabs (Tracking, Events, Audit, Schema)

**Authentication:** None. Messages are implicitly scoped to the extension context.
**Response Format:** JavaScript objects passed via Chrome's structured clone algorithm.

---

## 2. CustomEvent Bridge (Page Context → Content Script)

Events dispatched by `injected.js` via `window.dispatchEvent(new CustomEvent(type, { detail: data }))` and received by `content.js` via `window.addEventListener(type, handler)`.

### 2.1 `__opsiq_event__`

Fired when a tracking function call is intercepted.

**Detail schema:**
```js
{
  source: 'dataLayer' | 'gtag' | 'fbq',
  name: string,        // event name (e.g., 'purchase', 'PageView')
  data: object         // cloned event payload (depth-limited to 5 levels)
}
```

**Example:**
```js
{
  source: 'dataLayer',
  name: 'purchase',
  data: { event: 'purchase', ecommerce: { transaction_id: 'T-001', value: 49.99, currency: 'USD', items: [...] } }
}
```

### 2.2 `__opsiq_tracking__`

Fired when a tracking ID is identified in a runtime call.

**Detail schema:**
```js
{
  type: 'gtm' | 'ga4' | 'gads' | 'fb',
  ids: string[]        // array of tracking IDs found in this call
}
```

**Example:**
```js
{ type: 'ga4', ids: ['G-XXXXXXXXXX'] }
```

---

## 3. Chrome Message-Passing API (Content Script ↔ Popup)

All messages use `chrome.runtime.sendMessage` (popup → content via `chrome.tabs.sendMessage`) and `chrome.runtime.onMessage`.

### 3.1 `GET_TRACKING_DATA` (popup → content)

Sent by popup on open to request current tracking state and captured events.

**Request:**
```js
{ type: 'GET_TRACKING_DATA' }
```

**Response:**
```js
{
  tracking: {
    gtm: string[],     // GTM container IDs (e.g., ['GTM-XXXXXX'])
    ga4: string[],     // GA4 measurement IDs (e.g., ['G-XXXXXXXXXX'])
    gads: string[],    // Google Ads IDs (e.g., ['AW-XXXXXXXXX'])
    fb: string[]       // Facebook Pixel IDs
  },
  events: EventData[], // all capturedEvents accumulated since page load
  schemas: SchemaData  // parsed schema markup from the page
}
```

### 3.2 `NEW_EVENT` (content → popup)

Sent by content script when a new tracking event is intercepted while the popup is open.

**Message:**
```js
{
  type: 'NEW_EVENT',
  event: {
    source: 'dataLayer' | 'gtag' | 'fbq',
    name: string,
    data: object,
    timestamp: number  // Date.now()
  }
}
```

### 3.3 `CLEAR_EVENTS` (popup → content)

Sent by popup when the user clicks the "Clear" button.

**Request:**
```js
{ type: 'CLEAR_EVENTS' }
```

**Response:** None (fire-and-forget).

### 3.4 `GET_EVENTS` (popup → content)

Sent by popup to fetch the current event list without re-scanning for tracking.

**Request:**
```js
{ type: 'GET_EVENTS' }
```

**Response:**
```js
{ events: EventData[] }
```

### 3.5 `POPUP_CLOSED` (popup → content)

Sent by popup on `window.unload` to signal the popup has closed, allowing content.js to stop forwarding events.

**Message:**
```js
{ type: 'POPUP_CLOSED' }
```

**Note:** This signal is unreliable due to `window.unload` not firing consistently on popup close. See BUG-0004.

---

## 4. Data Models

### EventData
```js
{
  source: 'dataLayer' | 'gtag' | 'fbq',
  name: string,
  data: object,
  timestamp: number
}
```

### TrackingData
```js
{
  gtm: string[],
  ga4: string[],
  gads: string[],
  fb: string[]
}
```

### SchemaItem
```js
{
  type: string,        // schema @type (e.g., 'Product', 'Article')
  format: 'JSON-LD' | 'Microdata' | 'RDFa',
  source: string,      // DOM path (e.g., 'script[0]/@graph[1]')
  data: object,        // raw schema object
  errors: string[],    // required field validation errors
  warnings: string[]   // recommended field warnings
}
```
```

- [ ] **Step 2: Commit**

```bash
git add docs/04-API_DOCUMENTATION.md
git commit -m "docs: add API Documentation (04)"
```

---

### Task 12: Create docs/05-TEST_PLAN.md and docs/06-DEPLOYMENT_RUNBOOK.md

**Files:**
- Create: `docs/05-TEST_PLAN.md`
- Create: `docs/06-DEPLOYMENT_RUNBOOK.md`

- [ ] **Step 1: Write 05-TEST_PLAN.md**

```markdown
# Test Plan

> **PDS Document 05** | Last Updated: 2026-03-26

---

## 1. Test Strategy

**Testing Approach:** No automated test framework exists. All testing is currently manual — load the extension, navigate to pages with tracking and schema, and verify output. This document defines what should be automated and the manual tests that cover UI and integration flows.

**Recommended Framework:** Vitest or Jest with jsdom for unit testing pure-logic modules in `popup.js` (GA4 validation rules, schema validation rules, `escapeHtml`). Chrome Extension Testing Library or Puppeteer for integration tests.

**Coverage Target:** 100% branch coverage on GA4 ecommerce validation logic and schema validation rules (critical business logic). Manual coverage for Chrome-dependent code (content script, injected script, popup rendering).

**What MUST be tested (critical paths):**
- GA4 ecommerce event validation: required fields per event type, item-level validation, value/currency consistency
- Facebook Pixel event validation: required fields per event type
- Schema validation: required fields per schema type, Product variant detection, `@graph` expansion
- `escapeHtml()` function: HTML special characters in all field positions
- `__opsiq` guard flag: prevents double-wrapping of dataLayer/gtag/fbq

**What CAN be tested manually (lower risk):**
- Events tab real-time rendering
- Tracking detection on live sites
- Copy-to-clipboard report formatting
- Schema opportunity recommendations display

## 2. Manual Test Sites

| Test Case | Recommended Site Type |
|-----------|----------------------|
| GTM detection | Any eCommerce site using GTM |
| GA4 + Google Ads detection | Google Ads advertiser landing page |
| Facebook Pixel detection | DTC brand site (Facebook advertiser) |
| GA4 purchase event validation | eCommerce checkout (use a test order) |
| JSON-LD Product schema | Any Shopify product page |
| JSON-LD Article schema | Any news article or blog post |
| ProductGroup + Product variants | Shopify product page with variants |
| `@graph` array handling | Google-recommended schema implementations |
| No tracking detected | Simple static HTML page |

## 3. Regression Checklist (run before each release)

- [ ] GTM container ID detected and displayed correctly
- [ ] GA4 measurement ID detected and displayed correctly
- [ ] Facebook Pixel ID detected and displayed correctly
- [ ] Events tab shows live events as they fire
- [ ] Events tab filtering by source works
- [ ] Clear button empties the event list
- [ ] Audit tab shows validation errors for a purchase event missing transaction_id
- [ ] Audit tab shows no errors for a valid purchase event
- [ ] Schema tab detects and displays JSON-LD Product schema
- [ ] Schema tab shows required field error for Product missing `offers`
- [ ] Schema tab skips brand/manufacturer/aggregateRating for Product variants
- [ ] Opportunities section recommends BreadcrumbList when not present
- [ ] Copy All / Copy Audit / Copy Schema buttons copy plain text to clipboard
- [ ] Extension loads cleanly on `chrome://extensions/` with no errors in service worker
```

- [ ] **Step 2: Write 06-DEPLOYMENT_RUNBOOK.md**

```markdown
# Deployment Runbook

> **PDS Document 06** | Last Updated: 2026-03-26

---

## 1. Deployment Overview

**Deployment Target:** Google Chrome browser (local install via Developer mode or Chrome Web Store)
**Deployment Method:** Manual — load unpacked (development) or zip + upload to Chrome Web Store (production)
**Deployment Frequency:** On-demand; no CI/CD pipeline

opsIQ is a client-side Chrome Extension with no backend, no build tools, and no external dependencies. "Deployment" means loading the extension locally for development or publishing a new version to the Chrome Web Store.

## 2. Prerequisites

| Requirement | Version | Purpose |
|------------|---------|---------|
| Google Chrome | 88+ (MV3 support) | Runtime environment |
| Git | Any | Source control |
| Text editor | Any | Code editing |

**For Chrome Web Store publishing only:**
- Google Developer account (one-time $5 registration fee)
- Access to the Tribbute developer account on the Chrome Web Store Developer Dashboard

## 3. Development Deployment (Load Unpacked)

1. Open `chrome://extensions/` in Chrome
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the project root directory (contains `manifest.json`)
5. The extension appears in the toolbar

**Reloading after changes:**
- JS/HTML/CSS changes: click the refresh icon on the opsIQ card in `chrome://extensions/`
- Content script changes: also refresh the target page after reloading the extension
- Service worker changes: click "Update" on the extension card

**Debugging:**
- Service worker: `chrome://extensions/` → "Inspect views: service worker"
- Content script: DevTools on target page → Console → filter by `content.js`
- Injected script: DevTools on target page → Console → filter by `injected.js`
- Popup: right-click the popup → Inspect

## 4. Production Deployment (Chrome Web Store)

### 4.1 Pre-release Checklist

- [ ] All items in 05-TEST_PLAN.md regression checklist pass
- [ ] `manifest.json` version number incremented (follow semver)
- [ ] `docs/10-CHANGELOG.md` updated with release notes
- [ ] No `console.log` debug statements left in source (except `background.js` lifecycle logs)
- [ ] No references to `localhost` or internal URLs in source

### 4.2 Create Release Package

```bash
# From project root — creates a zip excluding development files
zip -r opsiq-v1.x.x.zip . \
  --exclude "*.git*" \
  --exclude "*.DS_Store" \
  --exclude "docs/*" \
  --exclude "*.zip"
```

### 4.3 Publish to Chrome Web Store

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Sign in with the Tribbute developer account
3. Select the opsIQ extension
4. Click "Upload new package" and upload the zip
5. Update the store listing description if needed
6. Click "Submit for review"

**Review SLA:** Google typically reviews within 1-3 business days for updates. New extensions may take longer.

### 4.4 Post-Publish Verification

- [ ] Install from Chrome Web Store on a clean Chrome profile
- [ ] Run the regression checklist from 05-TEST_PLAN.md
- [ ] Confirm version number in `chrome://extensions/` matches released version

## 5. Rollback

Chrome Web Store does not support instant rollback. If a critical bug is found post-publish:
1. Fix the bug in source
2. Increment version in `manifest.json`
3. Log the bug in BUG-NNNN format in `docs/09-BUG_LOG.md`
4. Create and submit a new package immediately
5. Users on the broken version will auto-update when Chrome syncs (typically within 24 hours)
```

- [ ] **Step 3: Commit**

```bash
git add docs/05-TEST_PLAN.md docs/06-DEPLOYMENT_RUNBOOK.md
git commit -m "docs: add Test Plan (05) and Deployment Runbook (06)"
```

---

### Task 13: Create docs/07-DECISION_LOG.md

**Files:**
- Create: `docs/07-DECISION_LOG.md`

- [ ] **Step 1: Write the file**

```markdown
# Decision Log

> **PDS Document 07** | Last Updated: 2026-03-26

Track architectural, technical, and strategic decisions with their rationale. Most recent entries at the top. Never delete entries — decisions that were later reversed are valuable context.

## Template

```
### DEC-[NNNN] — [Short description of decision]
- **Date:** YYYY-MM-DD
- **Status:** Proposed | Accepted | Superseded by DEC-XXXX | Deprecated
- **Context:** [What situation prompted this decision?]
- **Decision:** [What was decided?]
- **Rationale:** [Why this option over alternatives?]
- **Alternatives Considered:** [What else was evaluated and why it was rejected?]
- **Consequences:** [What are the expected downstream effects — positive and negative?]
- **Related:** [BUG-NNNN, ROAD-NNNN, or other DEC-NNNN references]
```

---

## Decisions

### DEC-0003 — Use popup (not side panel) as the UI surface
- **Date:** 2026-03-26
- **Status:** Accepted
- **Context:** Chrome MV3 supports two persistent UI surfaces for extensions: the popup (opens on toolbar icon click, closes when user clicks away) and the side panel (persistent beside the page, survives navigation). pdpIQ uses the side panel because analysis results need to persist while users scroll the page. opsIQ is used for quick validation checks.
- **Decision:** Use the popup as the UI surface.
- **Rationale:** opsIQ's use case is "open, verify, close" — not a persistent analysis tool. The popup is lighter, requires no `sidePanel` permission, and matches the interaction model. Users open it to confirm tracking is firing, then close it and continue browsing.
- **Alternatives Considered:** Side panel — rejected because opsIQ results don't need to persist across page navigation, and the popup model better matches the quick-check use case.
- **Consequences:** Popup closes when user clicks away from it, losing the current view. This is acceptable for the target use case. If a persistent workflow (e.g., comparing events across multiple page interactions) becomes a feature requirement, a side panel migration would be needed.
- **Related:** ROAD-0011

### DEC-0002 — Use `web_accessible_resources` with `<all_urls>` for injected.js
- **Date:** 2026-03-26
- **Status:** Accepted
- **Context:** `injected.js` must be loaded as a `<script src>` in page context (not via `chrome.scripting.executeScript`) so it can access page globals like `window.dataLayer` before they are modified. Making it a web-accessible resource allows content.js to reference it via `chrome-extension://[id]/injected.js`.
- **Decision:** Declare `injected.js` as a web-accessible resource matching `<all_urls>`.
- **Rationale:** This is the standard MV3 pattern for page-context script injection. The `__opsiq` guard flags on intercepted functions (`window.dataLayer.__opsiq`, etc.) prevent double-wrapping if the script loads twice.
- **Alternatives Considered:** (1) `chrome.scripting.executeScript` with `world: 'MAIN'` — available in Chrome 102+, would avoid the `web_accessible_resources` exposure, but requires the `scripting` permission already declared and adds async complexity. Should be evaluated as a future improvement. (2) Inline script injection via `injectInlineScript()` — exists as a fallback but is blocked by pages with CSP `script-src` restrictions that disallow inline scripts.
- **Consequences:** The extension ID is discoverable by any web page (fingerprinting risk). Any page can load `injected.js` directly, though the `__opsiq` guards prevent functional harm.
- **Related:** ROAD-0012, BUG-0003

### DEC-0001 — Use CustomEvent bridge for page context → content script communication
- **Date:** 2026-03-26
- **Status:** Accepted
- **Context:** `injected.js` runs in the web page's JavaScript context and has access to `window.dataLayer`, `window.gtag`, and `window.fbq`. However, page-context scripts cannot use `chrome.runtime.sendMessage` — that API is only available in extension contexts (content scripts, service workers, popup).
- **Decision:** Use `window.dispatchEvent(new CustomEvent('__opsiq_event__', { detail: data }))` in `injected.js` and `window.addEventListener('__opsiq_event__', handler)` in `content.js` to bridge the two contexts.
- **Rationale:** This is the only MV3-compliant way for a page-context script to communicate with a content script. The CustomEvent approach is well-documented and does not require any additional permissions.
- **Alternatives Considered:** `postMessage` — works but is less structured and requires origin validation; CustomEvent with a namespaced type string (`__opsiq_event__`) is cleaner and less likely to collide with page code.
- **Consequences:** Any page script that listens for `__opsiq_event__` or `__opsiq_tracking__` can observe the intercepted tracking calls. This is an acceptable tradeoff given that tracking data is already visible in DevTools.
- **Related:** DEC-0002
```

- [ ] **Step 2: Commit**

```bash
git add docs/07-DECISION_LOG.md
git commit -m "docs: add Decision Log (07) with DEC-0001 through DEC-0003"
```

---

### Task 14: Create docs/08-ROADMAP.md

**Files:**
- Create: `docs/08-ROADMAP.md`

- [ ] **Step 1: Write the file**

```markdown
# Roadmap

> **PDS Document 08** | Last Updated: 2026-03-26

Strategic feature plan and working backlog. Most recent entries at the top within each section.

## Template

```
### ROAD-[NNNN] — [Short description]
- **Status:** Proposed | Approved | In Progress | Done | Rejected | On Hold
- **Type:** Feature | Improvement | Tech Debt | Refactor | Bug Fix
- **Priority:** P0 (Critical) | P1 (High) | P2 (Medium) | P3 (Low) | Unranked
- **Date Added:** YYYY-MM-DD
- **Scope:** Small (< 1 day) | Medium (1-3 days) | Large (3+ days) | Unknown
- **Description:** [What and why]
- **Acceptance Criteria:**
  - [ ] [Specific, testable condition]
- **Related:** [DEC-NNNN, BUG-NNNN references]
```

---

## Approved / In Progress

### ROAD-0001 — Fix item.source XSS in popup.js
- **Status:** Approved
- **Type:** Bug Fix
- **Priority:** P0 (Critical)
- **Date Added:** 2026-03-26
- **Scope:** Small (< 1 day)
- **Description:** `item.source` in `popup.js:1126` is rendered directly via `innerHTML` without `escapeHtml()`, unlike every other field in the same function. A page-controlled source string could inject HTML.
- **Acceptance Criteria:**
  - [ ] `item.source` wrapped with `escapeHtml()` at popup.js:1126
  - [ ] All fields in the schema rendering function verified to use `escapeHtml()`
- **Related:** BUG-0001

### ROAD-0002 — Add `tabs` permission to manifest.json
- **Status:** Approved
- **Type:** Bug Fix
- **Priority:** P1 (High)
- **Date Added:** 2026-03-26
- **Scope:** Small (< 1 day)
- **Description:** `chrome.tabs.query()` is called 7 times in popup.js but only `activeTab` and `scripting` are declared. Without `tabs`, `tab.url` returns `undefined` in generated reports.
- **Acceptance Criteria:**
  - [ ] `"tabs"` added to `permissions` array in manifest.json
  - [ ] Generated reports show the correct page URL
- **Related:** BUG-0002

### ROAD-0003 — Fix isContextValid permanent-disable on transient SW restart
- **Status:** Approved
- **Type:** Bug Fix
- **Priority:** P1 (High)
- **Date Added:** 2026-03-26
- **Scope:** Medium (1-3 days)
- **Description:** `isContextValid` is set permanently to `false` when `chrome.runtime.sendMessage` throws "Could not establish connection" — which happens on every service worker restart (expected in MV3 every ~30 seconds of inactivity). This silently kills all event capture for the tab lifetime.
- **Acceptance Criteria:**
  - [ ] Transient connection errors (service worker restart) do not set `isContextValid = false`
  - [ ] Fatal errors (extension uninstalled, `chrome.runtime.id === undefined`) still set `isContextValid = false`
  - [ ] Event capture resumes automatically after a service worker restart
- **Related:** BUG-0003

### ROAD-0004 — Replace POPUP_CLOSED window.unload with port-based detection
- **Status:** Approved
- **Type:** Bug Fix
- **Priority:** P1 (High)
- **Date Added:** 2026-03-26
- **Scope:** Medium (1-3 days)
- **Description:** `window.unload` in the popup does not reliably fire on popup close in Chrome, leaving `isPopupOpen = true` in content.js. Every subsequent tracking event generates a failed `chrome.runtime.sendMessage` IPC call for the lifetime of the tab.
- **Acceptance Criteria:**
  - [ ] Popup close is detected via `chrome.runtime.connect()` port disconnect, or `isPopupOpen` flag is removed entirely
  - [ ] Failed message sends after popup close generate no console errors
- **Related:** BUG-0004

---

## Backlog

### ROAD-0005 — Cap capturedEvents array and implement incremental DOM rendering
- **Status:** Proposed
- **Type:** Improvement
- **Priority:** P2 (Medium)
- **Date Added:** 2026-03-26
- **Scope:** Medium (1-3 days)
- **Description:** `capturedEvents` in content.js has no size limit and grows indefinitely. `renderEvents()` does a full `innerHTML = ''` teardown and rebuild on every new event — at 100+ events this causes visible jank. Cap at 500 events (drop oldest) and implement incremental DOM append.
- **Acceptance Criteria:**
  - [ ] `capturedEvents` never exceeds 500 entries; oldest events are dropped first
  - [ ] New events are appended to the DOM without full list teardown
  - [ ] `runAudit()` is debounced (300ms) rather than called synchronously on every event
- **Related:** —

### ROAD-0006 — Fix AW- false positive regex in content.js
- **Status:** Proposed
- **Type:** Bug Fix
- **Priority:** P2 (Medium)
- **Date Added:** 2026-03-26
- **Scope:** Small (< 1 day)
- **Description:** The `awInlineMatches` regex in content.js matches any `AW-*` string anywhere in any inline script, not just inside `gtag('config', ...)` calls. This produces false positive Google Ads IDs.
- **Acceptance Criteria:**
  - [ ] `awInlineMatches` pattern removed or narrowed to only match inside known gtag config call context
  - [ ] No false positive Google Ads IDs on pages that contain `AW-` in non-gtag context
- **Related:** —

### ROAD-0007 — Fix noscript.textContent fallback
- **Status:** Proposed
- **Type:** Bug Fix
- **Priority:** P2 (Medium)
- **Date Added:** 2026-03-26
- **Scope:** Small (< 1 day)
- **Description:** `noscript.innerHTML` is unreliable when JavaScript is enabled — some browsers return empty string. GTM's noscript fallback iframe may be missed. Adding `ns.textContent` as fallback improves reliability.
- **Acceptance Criteria:**
  - [ ] `content.js` uses `ns.innerHTML || ns.textContent || ''` for noscript content
- **Related:** —

### ROAD-0008 — Clear checkGoogleTagManager interval on zero-ID match
- **Status:** Proposed
- **Type:** Improvement
- **Priority:** P2 (Medium)
- **Date Added:** 2026-03-26
- **Scope:** Small (< 1 day)
- **Description:** If `window.google_tag_manager` exists but contains no `GTM-` prefixed keys, the 500ms interval in `injected.js` runs for a full 10 seconds before the safety timeout clears it. Should clear immediately on confirmed zero-ID state.
- **Acceptance Criteria:**
  - [ ] Interval is cleared immediately when `google_tag_manager` is found but contains no GTM IDs
- **Related:** —

### ROAD-0009 — Debounce scanForTrackingScripts with MutationObserver
- **Status:** Proposed
- **Type:** Improvement
- **Priority:** P2 (Medium)
- **Date Added:** 2026-03-26
- **Scope:** Medium (1-3 days)
- **Description:** `scanForTrackingScripts()` iterates all script/iframe/noscript/img tags synchronously on every `GET_TRACKING_DATA` message. On complex pages this blocks the main thread. A debounced MutationObserver watching for new `<script>` elements would handle late-injected tracking and reduce unnecessary scanning.
- **Acceptance Criteria:**
  - [ ] `scanForTrackingScripts()` is not called synchronously on every `GET_TRACKING_DATA`
  - [ ] A MutationObserver detects tracking scripts injected after initial DOM parse
  - [ ] Initial scan runs once at document_idle
- **Related:** —

### ROAD-0010 — Remove/consolidate inline fallback in content.js
- **Status:** Proposed
- **Type:** Tech Debt
- **Priority:** P3 (Low)
- **Date Added:** 2026-03-26
- **Scope:** Medium (1-3 days)
- **Description:** The inline fallback script in `content.js` (used when `injected.js` fails to load) has diverged from `injected.js`: different clone depth (4 vs 5), missing `safeStringify`, missing existing dataLayer replay. Pages that block `injected.js` via CSP will also block the inline `<script>` injection, making the fallback largely ineffective. Should either remove or fully synchronize.
- **Acceptance Criteria:**
  - [ ] Either: inline fallback removed and `chrome.scripting.executeScript` with `world: 'MAIN'` used as alternative (requires Chrome 102+)
  - [ ] Or: inline fallback brought to full parity with `injected.js` and behavior gap documented
- **Related:** DEC-0002

### ROAD-0011 — Split popup.js into validators.js, renderers.js, popup.js
- **Status:** Proposed
- **Type:** Refactor
- **Priority:** P3 (Low)
- **Date Added:** 2026-03-26
- **Scope:** Large (3+ days)
- **Description:** `popup.js` is a 1,741-line IIFE mixing validation rules, DOM rendering, Chrome API calls, and report generation. This makes individual functions untestable in isolation and creates high coupling. Splitting into three files would enable unit testing of validation logic without DOM or Chrome API mocking.
- **Acceptance Criteria:**
  - [ ] `validators.js` contains all pure validation functions (GA4, Facebook Pixel, schema validation rules) with no DOM dependencies
  - [ ] `renderers.js` contains all DOM manipulation functions
  - [ ] `popup.js` contains only Chrome API calls, event binding, and init logic
  - [ ] All existing functionality is preserved
- **Related:** DEC-0003

### ROAD-0012 — Narrow web_accessible_resources matches scope
- **Status:** Proposed
- **Type:** Improvement
- **Priority:** P3 (Low)
- **Date Added:** 2026-03-26
- **Scope:** Small (< 1 day)
- **Description:** `injected.js` is exposed to all URLs via `web_accessible_resources`, making the extension ID discoverable by any page (fingerprinting risk). Should be narrowed to `http://*/*` and `https://*/*` or evaluated for migration to `chrome.scripting.executeScript` with `world: 'MAIN'`.
- **Acceptance Criteria:**
  - [ ] `web_accessible_resources` matches narrowed to `["http://*/*", "https://*/*"]` at minimum
  - [ ] Or: migration to `chrome.scripting.executeScript` with `world: 'MAIN'` documented in DEC-NNNN
- **Related:** DEC-0002

---

## Done

_No completed items yet._

## Rejected

_No rejected items yet._
```

- [ ] **Step 2: Commit**

```bash
git add docs/08-ROADMAP.md
git commit -m "docs: add Roadmap (08) seeded with 12 items from engineering audit"
```

---

### Task 15: Create docs/09-BUG_LOG.md

**Files:**
- Create: `docs/09-BUG_LOG.md`

- [ ] **Step 1: Write the file**

```markdown
# Bug Log

> **PDS Document 09** | Last Updated: 2026-03-26

Track all bugs encountered during development. Most recent entries at the top within each section.

## Template

```
### BUG-[NNNN] — [Short description]
- **Status:** Open | In Progress | Fixed | Won't Fix
- **Severity:** Critical | High | Medium | Low
- **Date Found:** YYYY-MM-DD
- **Date Resolved:** YYYY-MM-DD
- **Found In:** [File, component, feature]
- **Root Cause:** [Brief explanation]
- **Fix:** [What was changed — reference commit or ROAD-NNNN]
- **Related:** [DEC-NNNN, ROAD-NNNN references]
- **Notes:** [Reproduction steps, context]
```

---

## Active Bugs

### BUG-0004 — POPUP_CLOSED signal unreliable; isPopupOpen stays true after close
- **Status:** Open
- **Severity:** High
- **Date Found:** 2026-03-26
- **Found In:** `popup.js:1732-1737`, `content.js` (isPopupOpen flag)
- **Root Cause:** `window.unload` does not reliably fire on popup close in Chrome. `isPopupOpen` in `content.js` frequently stays `true` after the popup has closed, causing `chrome.runtime.sendMessage` to be called for every subsequent tracking event for the lifetime of the tab.
- **Fix:** See ROAD-0004 — replace with `chrome.runtime.connect()` port disconnect or remove the flag entirely.
- **Related:** ROAD-0004
- **Notes:** The `safeSendMessage` error handler does set `isPopupOpen = false` on failed sends, so the issue self-corrects after the first event post-close — but that first send still generates unnecessary IPC overhead.

### BUG-0003 — isContextValid permanently disabled on transient service worker restart
- **Status:** Open
- **Severity:** High
- **Date Found:** 2026-03-26
- **Found In:** `content.js` (isContextValid flag, error handlers)
- **Root Cause:** MV3 service workers terminate after ~30 seconds of inactivity. The first `chrome.runtime.sendMessage` after restart throws "Could not establish connection". `content.js` responds by setting `isContextValid = false` permanently, silently killing all future event capture for the tab's lifetime.
- **Fix:** See ROAD-0003 — distinguish transient errors (SW restart) from fatal errors (extension uninstalled, `chrome.runtime.id === undefined`).
- **Related:** ROAD-0003
- **Notes:** Users who open the popup after a period of inactivity may see the popup load with no events captured, even though tracking events fired.

### BUG-0002 — tab.url undefined in generated reports due to missing `tabs` permission
- **Status:** Open
- **Severity:** High
- **Date Found:** 2026-03-26
- **Found In:** `manifest.json`, `popup.js` (all `chrome.tabs.query()` calls)
- **Root Cause:** `chrome.tabs.query()` requires the `tabs` permission to return the `url` property. Only `activeTab` and `scripting` are declared. `tab.url` is `undefined` in generated reports outside the immediate popup activation context.
- **Fix:** See ROAD-0002 — add `"tabs"` to `permissions` in `manifest.json`.
- **Related:** ROAD-0002
- **Notes:** The `activeTab` permission may supply `tab.url` during the initial popup open flow, masking this bug during quick testing. It manifests in the `copyAllBtn` handler and other secondary `chrome.tabs.query()` calls.

### BUG-0001 — item.source rendered unescaped via innerHTML in popup.js (XSS)
- **Status:** Open
- **Severity:** Critical
- **Date Found:** 2026-03-26
- **Found In:** `popup.js:1126`
- **Root Cause:** `item.source` (a schema DOM path string like `script[0]/@graph[1]`) is interpolated directly into a `div.innerHTML` template literal without `escapeHtml()`. Every other field in the same function (`item.type`, `item.format`, all `prop.key`/`prop.value`) is correctly escaped.
- **Fix:** See ROAD-0001 — wrap `item.source` with `escapeHtml()` at line 1126.
- **Related:** ROAD-0001
- **Notes:** Current exploitation requires a page to craft a JSON-LD script tag that causes the source path calculation to include HTML characters. Low immediate risk (source paths are generated from DOM structure, not page-controlled strings), but the inconsistency with surrounding code is a clear bug pattern.

---

## Resolved Bugs

_No resolved bugs yet._
```

- [ ] **Step 2: Commit**

```bash
git add docs/09-BUG_LOG.md
git commit -m "docs: add Bug Log (09) seeded with BUG-0001 through BUG-0004 from engineering audit"
```

---

### Task 16: Create docs/10-CHANGELOG.md

**Files:**
- Create: `docs/10-CHANGELOG.md`

- [ ] **Step 1: Write the file**

```markdown
# Changelog

> **PDS Document 10** | Last Updated: 2026-03-26

All notable changes to this project. Format follows [Keep a Changelog](https://keepachangelog.com/). Most recent version at the top.

---

## [Unreleased]

### Changed
- Extension renamed from "TRIBBUTE Auditor" to "opsIQ"
- Internal guard flags renamed: `__tribbute` → `__opsiq`
- Internal CustomEvent types renamed: `__tribbute_event__` → `__opsiq_event__`, `__tribbute_tracking__` → `__opsiq_tracking__`
- PDS documentation structure added (docs/00 through docs/10, .claude/rules/pds-protocol.md)

---

## v1.2.0 — 2026-03-26

### Added
- Schema Audit tab: detects and validates JSON-LD, Microdata, and RDFa structured data
- Schema validation for 20+ schema types (Product, ProductGroup, Organization, Article, LocalBusiness, FAQPage, HowTo, Recipe, Event, Person, Review, AggregateRating, VideoObject, ImageObject, WebPage, WebSite, BreadcrumbList, NewsArticle, BlogPosting)
- Smart schema validation: Product variant detection via `inProductGroupWithID` — skips fields inherited from parent ProductGroup
- `@graph` array expansion and nested schema handling
- Implementation Opportunities section: prioritized recommendations (HIGH/MEDIUM/LOW) for missing or improvable schema markup
- Opportunities include: WebSite with SearchAction, BreadcrumbList, Organization, AggregateRating, Reviews, Product Identifiers (GTIN/MPN), Author details for E-E-A-T, FAQPage, HowTo, VideoObject
- Copy Schema report button

### Changed
- Extension icon and branding updated

---

## v1.0.0 — Initial Release

### Added
- Tracking Detection tab: detects GTM container IDs, GA4 measurement IDs, Google Ads conversion IDs, Facebook Pixel IDs from script tags and runtime objects
- Events tab: real-time interception and display of `dataLayer.push()`, `gtag()`, and `fbq()` calls via injected page-context script
- Events tab filtering by source (dataLayer/gtag/fbq) and event name
- Clear events button
- Audit tab: GA4 ecommerce event validation (required fields, item-level validation, value/currency consistency)
- Audit tab: Facebook Pixel event validation (required fields per event type)
- Copy All and Copy Audit report buttons
- `injected.js` → CustomEvent bridge → `content.js` → popup message-passing architecture
- Zero-telemetry, privacy-first architecture (no external network requests)
- Chrome Manifest V3 compliance
```

- [ ] **Step 2: Commit**

```bash
git add docs/10-CHANGELOG.md
git commit -m "docs: add Changelog (10) with v1.2.0 and v1.0.0 entries"
```

---

### Task 17: Create .context/ placeholders, update CLAUDE.md with PDS section

**Files:**
- Create: `docs/.context/spec.md`
- Create: `docs/.context/review-notes.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Create .context/ placeholder files**

Write `docs/.context/spec.md`:
```markdown
# Current Task Spec

_This file is ephemeral — overwritten at the start of each task cycle by the ARCHITECT agent._

No active task.
```

Write `docs/.context/review-notes.md`:
```markdown
# Current Review Notes

_This file is ephemeral — overwritten at the start of each review cycle by the REVIEWER agent._

No active review.
```

- [ ] **Step 2: Update CLAUDE.md with PDS section**

Append the following section to the end of `CLAUDE.md`:

```markdown

## Product Development Standard (PDS)

This project follows the TRIBBUTE PDS. Read `docs/00-PDS_README.md` for the full structure and `.claude/rules/pds-protocol.md` for operational rules.

### Documentation Structure
- `docs/01-06` — Product definition and operations (update with explicit instruction only)
- `docs/07-10` — Tracking files (update proactively during work)
- `docs/.context/` — Ephemeral agent handoff files (overwrite each task)

### ID Systems
- **DEC-NNNN** → Decision Log (07)
- **ROAD-NNNN** → Roadmap (08)
- **BUG-NNNN** → Bug Log (09)

When you encounter a bug, complete a feature, make an architectural decision, or identify tech debt during any task, update the relevant tracking files and cross-reference IDs.
```

- [ ] **Step 3: Final verification — no TRIBBUTE/tribbute in source files**

```bash
grep -rn "TRIBBUTE\|tribbute" \
  --include="*.js" \
  --include="*.json" \
  --include="*.html" \
  --include="*.css" \
  .
```
Expected: no output. (README.md and CLAUDE.md may still reference the GitHub repo URL — that is acceptable per the design spec.)

- [ ] **Step 4: Commit all remaining changes**

```bash
git add docs/.context/spec.md docs/.context/review-notes.md CLAUDE.md
git commit -m "docs: add .context placeholders and PDS section to CLAUDE.md"
```

- [ ] **Step 5: Final summary commit**

```bash
git log --oneline -20
```
Confirm all tasks are committed in logical order with clear messages.
```
