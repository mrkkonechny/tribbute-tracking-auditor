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
- **Date Resolved:** —
- **Found In:** `popup.js:1732-1737`, `content.js` (isPopupOpen flag)
- **Root Cause:** `window.unload` does not reliably fire on popup close in Chrome. `isPopupOpen` in `content.js` frequently stays `true` after the popup closes, causing `chrome.runtime.sendMessage` to be called for every subsequent tracking event for the lifetime of the tab.
- **Fix:** See ROAD-0004 — replace with `chrome.runtime.connect()` port disconnect or remove the flag entirely.
- **Related:** ROAD-0004
- **Notes:** The `safeSendMessage` error handler sets `isPopupOpen = false` on failed sends, so the issue self-corrects after the first event post-close — but that first send still generates unnecessary IPC overhead.

### BUG-0003 — isContextValid permanently disabled on transient service worker restart
- **Status:** Open
- **Severity:** High
- **Date Found:** 2026-03-26
- **Date Resolved:** —
- **Found In:** `content.js` (isContextValid flag, error handlers)
- **Root Cause:** MV3 service workers terminate after ~30 seconds of inactivity. The first `chrome.runtime.sendMessage` after restart throws "Could not establish connection". `content.js` responds by setting `isContextValid = false` permanently, silently killing all future event capture for the tab's lifetime.
- **Fix:** See ROAD-0003 — distinguish transient errors from fatal errors (`chrome.runtime.id === undefined`).
- **Related:** ROAD-0003
- **Notes:** Users who open the popup after a period of inactivity may see no events captured even though tracking events fired.

### BUG-0002 — tab.url undefined in generated reports due to missing `tabs` permission
- **Status:** Open
- **Severity:** High
- **Date Found:** 2026-03-26
- **Date Resolved:** —
- **Found In:** `manifest.json`, `popup.js` (all `chrome.tabs.query()` calls)
- **Root Cause:** `chrome.tabs.query()` requires the `tabs` permission to return the `url` property. Only `activeTab` and `scripting` are declared. `tab.url` is `undefined` in generated reports outside the immediate popup activation context.
- **Fix:** See ROAD-0002 — add `"tabs"` to `permissions` in `manifest.json`.
- **Related:** ROAD-0002
- **Notes:** `activeTab` may supply `tab.url` during the initial popup open, masking this bug in quick testing. Manifests in `copyAllBtn` handler and other secondary `chrome.tabs.query()` calls.

### BUG-0001 — item.source rendered unescaped via innerHTML in popup.js (XSS)
- **Status:** Open
- **Severity:** Critical
- **Date Found:** 2026-03-26
- **Date Resolved:** —
- **Found In:** `popup.js:1126`
- **Root Cause:** `item.source` (a schema DOM path string like `script[0]/@graph[1]`) is interpolated directly into `div.innerHTML` without `escapeHtml()`. Every other field in the same function (`item.type`, `item.format`, all `prop.key`/`prop.value`) is correctly escaped.
- **Fix:** See ROAD-0001 — wrap `item.source` with `escapeHtml()` at line 1126.
- **Related:** ROAD-0001
- **Notes:** Current exploitation requires a page to craft JSON-LD that causes the source path to embed HTML characters. Low immediate risk, but the inconsistency with surrounding code is a clear bug pattern.

---

## Resolved Bugs

_No resolved bugs yet._
