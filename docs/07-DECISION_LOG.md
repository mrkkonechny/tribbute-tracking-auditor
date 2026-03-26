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
- **Context:** Chrome MV3 supports two persistent UI surfaces: popup (opens on toolbar click, closes on outside click) and side panel (persistent beside page, survives navigation). pdpIQ uses the side panel because its analysis results need to persist while users scroll. opsIQ is used for quick validation checks.
- **Decision:** Use the popup as the UI surface.
- **Rationale:** opsIQ's use case is "open, verify, close" — not a persistent analysis tool. The popup is lighter, requires no `sidePanel` permission, and matches the interaction model: open to confirm tracking is firing, then close and continue browsing.
- **Alternatives Considered:** Side panel — rejected because opsIQ results don't need to persist across page navigation, and the popup model better matches the quick-check use case. May be reconsidered if a persistent monitoring workflow becomes a feature requirement.
- **Consequences:** Popup closes when user clicks away, losing the current view. Acceptable for target use case. If persistent monitoring across page interactions is needed, a side panel migration would be required.
- **Related:** ROAD-0011

### DEC-0002 — Use `web_accessible_resources` with `<all_urls>` for injected.js
- **Date:** 2026-03-26
- **Status:** Accepted
- **Context:** `injected.js` must be loaded as a `<script src>` in page context so it can access page globals like `window.dataLayer` before they are modified by other scripts. Making it a web-accessible resource allows content.js to reference it via `chrome-extension://[id]/injected.js`.
- **Decision:** Declare `injected.js` as a web-accessible resource matching `<all_urls>`.
- **Rationale:** Standard MV3 pattern for page-context script injection. The `__opsiq` guard flags on intercepted functions prevent double-wrapping if the script loads twice.
- **Alternatives Considered:** (1) `chrome.scripting.executeScript` with `world: 'MAIN'` (Chrome 102+) — would avoid `web_accessible_resources` exposure but adds async complexity and requires testing across Chrome versions. Should be evaluated as ROAD-0012 improvement. (2) Inline script injection via `injectInlineScript()` — exists as fallback but is blocked by CSP `script-src` restrictions, making it ineffective in the same environments where the primary path would fail.
- **Consequences:** Extension ID is discoverable by any web page (fingerprinting risk). Any page can load `injected.js` directly, though `__opsiq` guards prevent functional harm.
- **Related:** ROAD-0012, BUG-0003

### DEC-0001 — Use CustomEvent bridge for page context → content script communication
- **Date:** 2026-03-26
- **Status:** Accepted
- **Context:** `injected.js` runs in the web page's JavaScript context and has access to `window.dataLayer`, `window.gtag`, and `window.fbq`. Page-context scripts cannot use `chrome.runtime.sendMessage` — that API is only available in extension contexts (content scripts, service workers, popup).
- **Decision:** Use `window.dispatchEvent(new CustomEvent('__opsiq_event__', { detail: data }))` in `injected.js` and `window.addEventListener('__opsiq_event__', handler)` in `content.js` to bridge the two contexts.
- **Rationale:** Only MV3-compliant way for a page-context script to communicate with a content script. The namespaced CustomEvent type string (`__opsiq_event__`) is less likely to collide with page code than `postMessage`.
- **Alternatives Considered:** `postMessage` — works but requires origin validation and is less structured; CustomEvent with namespaced type string is cleaner.
- **Consequences:** Any page script listening for `__opsiq_event__` or `__opsiq_tracking__` can observe intercepted tracking calls. Acceptable tradeoff — tracking data is already visible in DevTools.
- **Related:** DEC-0002
