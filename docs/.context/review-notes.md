# Current Review Notes

_This file is ephemeral — overwritten at the start of each review cycle by the REVIEWER agent._

No active review.

## Review: Task 4 — sidepanel.js scaffold (OpsIQPanel class)
- **Date:** 2026-03-26
- **Commits reviewed:** 506225b..e9bc31f
- **Reviewer:** principal-engineer-review

---

## Summary Verdict

The scaffold is structurally sound. The port connection, handshake sequencing, ARIA tab management, and keyboard navigation are all implemented correctly for a scaffold task. There are **no critical bugs**. There are **two important logic issues** — one in port reconnect (missing handshake re-send on reconnect) and one in `clearEvents` (DOM not cleared) — and **three suggestions**. The stub strategy is correct and will not cause runtime errors. The implementation is ready for Tasks 5-8 to build on, provided the two important issues are fixed first.

---

## Plan Alignment

### PASS — All required scaffold pieces are present
- `connectPort` with `onDisconnect` reconnect via `setTimeout`.
- `sendHandshake` with defensive `try/catch` for disconnected port.
- `bindNavigation` with click handler and ArrowLeft/ArrowRight roving tabindex.
- `switchTab` with `aria-selected`, `tabindex`, and `.hidden` toggling.
- `bindToolbar` wiring all six toolbar controls.
- `setupMessageListener` handling `NEW_EVENT` and `PAGE_NAVIGATED` with `tabId` filtering.
- `loadData` async with `chrome.tabs.query`, handshake send, `GET_TRACKING_DATA` request.
- `onPageNavigated` inserting a boundary marker and updating the header URL.
- `clearEvents` resetting state and instructing content.js.
- Stubs for all Tasks 5-8 methods present and body-empty (no runtime errors on call).

### PASS — Port/handshake protocol matches background.js contract
`background.js` listens for `{ type: 'PANEL_HANDSHAKE', tabId }` on the `'opsiq-panel'` port and only then calls `chrome.tabs.sendMessage(tabId, { type: 'PANEL_OPEN' })`. The panel sends that exact message in `sendHandshake()` after resolving the tab ID in `loadData()`. The sequencing is correct.

### PASS — `PAGE_NAVIGATED` tab ID filtering
`setupMessageListener` guards `onPageNavigated` with `message.tabId === this.currentTabId`. This directly addresses I-1 from the Task 1 review (multi-tab/multi-window false fires).

### NOTE — `setupMessageListener` uses `chrome.runtime.onMessage`, not the port
This is architecturally correct for the current design: `background.js` sends `PAGE_NAVIGATED` via `chrome.runtime.sendMessage`, which routes to `chrome.runtime.onMessage` listeners in all extension pages. Using the port for this direction would require background to send on the port object, which is stored only locally. The listener approach is the correct choice here.

---

## Issues

### Important (should fix before Tasks 5-8 build on this)

**I-1: Port reconnect does not re-send the handshake**

`sidepanel.js:32-38` — When the service worker restarts and `onDisconnect` fires, `connectPort()` is called again after 100ms. This re-establishes the port, but `sendHandshake()` is never called after the reconnect. The background service worker (freshly restarted) has no `activePanelTabId` — it is reset to `null` at start. Without a re-handshake, the new port instance delivers no `PANEL_OPEN` signal, and background.js cannot route `PAGE_NAVIGATED` to the correct tab.

Concretely: after any SW restart (~30s inactivity), the side panel appears connected but the background can no longer target the right content script. `NEW_EVENT` forwarding and `PAGE_NAVIGATED` boundary markers will silently stop working until the page is reloaded.

Fix: call `this.sendHandshake(this.currentTabId)` at the end of `connectPort()` when `this.currentTabId` is already known (i.e., on all reconnects after the first). A guard like `if (this.currentTabId)` is sufficient.

**I-2: `clearEvents` empties state but does not clear the DOM**

`sidepanel.js:172-180` — `clearEvents` resets `this.capturedEvents`, `this.auditIssues`, then calls `this.renderEvents()` and `this.renderAudit()`. Those are stubs — they do nothing. The `#eventsList` DOM element (which may contain nav-boundary markers and event rows appended by `onPageNavigated` and the future `addEvent`) is never cleared.

This means: pressing Clear after a page navigation leaves all previous boundary markers and event DOM nodes in `#eventsList` even though the array is empty. When `renderEvents()` is implemented in Task 6, it must be called with an empty array and must perform a DOM teardown — or `clearEvents` must directly clear `#eventsList` here. Because subsequent tasks fill in the stubs, the safest fix at this stage is to add an explicit `document.getElementById('eventsList').innerHTML = ''` (or equivalent) inside `clearEvents`, so the behaviour is defined and correct from day one regardless of stub execution order.

---

### Suggestions (nice to have)

**S-1: `switchTab` sets `tabindex="0"` on `.tab-section` panels unconditionally**

`sidepanel.js:85` — The ARIA authoring practices for `tabpanel` role recommend `tabindex="0"` only when the panel itself needs to be focusable (e.g., it contains no focusable children). Setting `tabindex="0"` on a panel that contains buttons and inputs (as all three panels do) creates an unnecessary tab stop. The correct pattern is `tabindex="-1"` on inactive panels and either omit or use `tabindex="0"` only if the panel is genuinely empty. The HTML already has the correct defaults (`tabindex="0"` on `tab-events`, `tabindex="-1"` on the others). `switchTab` immediately overwrites those defaults, meaning a panel with no focusable children and a panel full of buttons are treated identically. This is low-impact now but will create a confusing UX when the panels are populated in Tasks 5-8.

**S-2: Arrow key navigation activates the tab immediately on key press**

`sidepanel.js:58-67` — `switchTab` is called on every ArrowLeft/ArrowRight keydown alongside `focus()`. The ARIA tab pattern (APG 3.22) specifies that arrow keys should move focus only; Enter/Space should activate (switch content). Calling `switchTab` on arrow movement means every keystroke through the tab bar triggers a content load. For the schema tab this triggers `loadSchemaData()` — currently a stub, but in Task 8 that will become a real `GET_SCHEMA_DATA` message to content.js. Rapid arrow-key traversal will fire multiple concurrent `sendMessage` calls. This is a known acceptable trade-off (many implementations use auto-activation), but it should be a conscious decision and the schema lazy-load in `switchTab` line 88-90 should be guarded against concurrent execution when implemented.

**S-3: `onPageNavigated` appends to `#eventsList` but the DOM reference is acquired on every call**

`sidepanel.js:159-169` — `document.getElementById('eventsList')` is called inside `onPageNavigated`. This is correct but slightly inconsistent with the approach Task 6 will likely use (a cached reference or re-query). Not a bug, but worth flagging so Task 6's author makes a deliberate choice about whether to cache the list element on the class.

---

## What Was Done Well

- Handshake sequencing is correct: `connectPort` runs first (synchronous), `loadData` resolves the tab ID asynchronously, then `sendHandshake` is called. The comment at line 36-37 explicitly explains the timing contract. This is exactly right and avoids the race condition from the Task 1 review (I-2).
- `sendHandshake` wraps `port.postMessage` in a `try/catch` — idiomatic for MV3 where the port can disconnect between the check and the call.
- `switchTab`'s `aria-selected` and `tabindex` management is correct and complete. Both the nav button and the panel section are updated atomically.
- The `EVENT_CAP` constant at line 4 is a module-level constant (not a magic number buried in `loadData`), making it easy to adjust and visible to future implementers.
- Stubs are genuinely empty bodies, not `console.log` placeholders — no noise in the production console during the scaffold phase.
- `onPageNavigated` uses `role="separator"` on the boundary marker div, which is semantically appropriate for an element inserted into a `role="list"` context.
- `clearEvents` correctly sends `CLEAR_EVENTS` to content.js before resetting local state, and uses `.catch(() => {})` for the case where the content script is not available. This order is correct.
- `updateHeaderUrl` uses `new URL()` parsing with a try/catch fallback — the `el.title = url` line ensures the full URL is accessible on hover even when the display is truncated to hostname + pathname.

---

## Required Actions Before Task 5 Proceeds

1. **Fix I-1** — Add `if (this.currentTabId) this.sendHandshake(this.currentTabId)` at the end of `connectPort()`. This ensures the handshake is re-sent on every SW restart reconnect.
2. **Fix I-2** — Add an explicit DOM clear of `#eventsList` inside `clearEvents()` so the list is visually empty when state is reset, independent of stub execution.
