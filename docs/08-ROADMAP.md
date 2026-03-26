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
  - [ ] Popup close detected via `chrome.runtime.connect()` port disconnect, or `isPopupOpen` flag removed entirely
  - [ ] No console errors generated after popup close
- **Related:** BUG-0004

---

## Backlog

### ROAD-0005 — Cap capturedEvents array and implement incremental DOM rendering
- **Status:** Proposed
- **Type:** Improvement
- **Priority:** P2 (Medium)
- **Date Added:** 2026-03-26
- **Scope:** Medium (1-3 days)
- **Description:** `capturedEvents` in content.js has no size limit and grows indefinitely. `renderEvents()` does full `innerHTML = ''` teardown on every new event. Cap at 500 events (drop oldest) and implement incremental DOM append.
- **Acceptance Criteria:**
  - [ ] `capturedEvents` never exceeds 500 entries; oldest events dropped first
  - [ ] New events appended to DOM without full list teardown
  - [ ] `runAudit()` debounced (300ms) rather than synchronous on every event

### ROAD-0006 — Fix AW- false positive regex in content.js
- **Status:** Proposed
- **Type:** Bug Fix
- **Priority:** P2 (Medium)
- **Date Added:** 2026-03-26
- **Scope:** Small (< 1 day)
- **Description:** The `awInlineMatches` regex matches any `AW-*` string anywhere in any inline script, not just inside `gtag('config', ...)` calls. Produces false positive Google Ads IDs.
- **Acceptance Criteria:**
  - [ ] `awInlineMatches` pattern removed or narrowed to gtag config call context only
  - [ ] No false positive Google Ads IDs on pages with non-gtag AW- strings

### ROAD-0007 — Fix noscript.textContent fallback
- **Status:** Proposed
- **Type:** Bug Fix
- **Priority:** P2 (Medium)
- **Date Added:** 2026-03-26
- **Scope:** Small (< 1 day)
- **Description:** `noscript.innerHTML` is unreliable when JavaScript is enabled. GTM's noscript fallback iframe may be missed. Adding `ns.textContent` as fallback improves reliability.
- **Acceptance Criteria:**
  - [ ] `content.js` uses `ns.innerHTML || ns.textContent || ''` for noscript content

### ROAD-0008 — Clear checkGoogleTagManager interval on zero-ID match
- **Status:** Proposed
- **Type:** Improvement
- **Priority:** P2 (Medium)
- **Date Added:** 2026-03-26
- **Scope:** Small (< 1 day)
- **Description:** If `window.google_tag_manager` exists but contains no `GTM-` prefixed keys, the 500ms interval in `injected.js` runs for a full 10 seconds before the safety timeout. Should clear immediately on confirmed zero-ID state.
- **Acceptance Criteria:**
  - [ ] Interval cleared immediately when `google_tag_manager` exists but contains no GTM IDs

### ROAD-0009 — Debounce scanForTrackingScripts with MutationObserver
- **Status:** Proposed
- **Type:** Improvement
- **Priority:** P2 (Medium)
- **Date Added:** 2026-03-26
- **Scope:** Medium (1-3 days)
- **Description:** `scanForTrackingScripts()` iterates all script/iframe/noscript/img tags synchronously on every `GET_TRACKING_DATA` message, blocking the main thread on complex pages. A debounced MutationObserver watching for new `<script>` elements would detect late-injected tracking more reliably.
- **Acceptance Criteria:**
  - [ ] `scanForTrackingScripts()` not called synchronously on every `GET_TRACKING_DATA`
  - [ ] MutationObserver detects tracking scripts injected after initial DOM parse
  - [ ] Initial scan runs once at document_idle

### ROAD-0010 — Remove/consolidate inline fallback in content.js
- **Status:** Proposed
- **Type:** Tech Debt
- **Priority:** P3 (Low)
- **Date Added:** 2026-03-26
- **Scope:** Medium (1-3 days)
- **Description:** The inline fallback in `content.js` has diverged from `injected.js` (different clone depth, missing safeStringify, no existing dataLayer replay). Pages that block `injected.js` via CSP also block inline script injection, making the fallback ineffective.
- **Acceptance Criteria:**
  - [ ] Either: inline fallback removed, `chrome.scripting.executeScript` with `world: 'MAIN'` used as alternative
  - [ ] Or: inline fallback brought to full parity with `injected.js` and gaps documented
- **Related:** DEC-0002

### ROAD-0011 — Split popup.js into validators.js, renderers.js, popup.js
- **Status:** Proposed
- **Type:** Refactor
- **Priority:** P3 (Low)
- **Date Added:** 2026-03-26
- **Scope:** Large (3+ days)
- **Description:** `popup.js` is a 1,741-line IIFE mixing validation rules, DOM rendering, Chrome API calls, and report generation — making validation logic untestable in isolation.
- **Acceptance Criteria:**
  - [ ] `validators.js` — all pure validation functions (GA4, Pixel, schema rules) with no DOM dependencies
  - [ ] `renderers.js` — all DOM manipulation functions
  - [ ] `popup.js` — Chrome API calls, event binding, init only
  - [ ] All existing functionality preserved
- **Related:** DEC-0003

### ROAD-0012 — Narrow web_accessible_resources matches scope
- **Status:** Proposed
- **Type:** Improvement
- **Priority:** P3 (Low)
- **Date Added:** 2026-03-26
- **Scope:** Small (< 1 day)
- **Description:** `injected.js` exposed to all URLs via `web_accessible_resources`, making extension ID discoverable by any page (fingerprinting risk). Should narrow to http/https or migrate to `chrome.scripting.executeScript` with `world: 'MAIN'`.
- **Acceptance Criteria:**
  - [ ] `web_accessible_resources` matches narrowed to `["http://*/*", "https://*/*"]` at minimum
  - [ ] Or: migration to `chrome.scripting.executeScript` with `world: 'MAIN'` documented in new DEC entry
- **Related:** DEC-0002

---

## Done

_No completed items yet._

## Rejected

_No rejected items yet._
