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

### DEC-0005 — Use Google PageSpeed Insights API v5 (free, no key, mobile strategy) for SEO tab

**Date:** 2026-03-27
**Status:** Accepted

**Context:**
The SEO tab needed an external performance and SEO score source. Options were (1) Lighthouse CLI (not available in a browser extension), (2) PageSpeed Insights API v5 with no key (free, rate-limited), (3) PageSpeed Insights API with an API key (higher quota, requires user setup), (4) no external data (on-page signals only).

**Decision:**
Fetch PageSpeed Insights API v5 with no API key, using `strategy=mobile`, requesting all four categories: `performance`, `seo`, `accessibility`, `best-practices`.

**Rationale:**
- No API key means zero setup friction for users — open the SEO tab and scores appear
- Free quota (~25 requests per 100 seconds per IP) is sufficient for a single developer tool — analysts check one page at a time, not in bulk
- Mobile strategy chosen over desktop: Google uses mobile-first indexing, making mobile scores the more actionable signal for SEO work
- All four categories requested in one call — no extra round-trips, and the four scores map directly to developer concerns (performance, SEO ranking signals, accessibility compliance, best practices)

**Alternatives Considered:**
- API key with higher quota: rejected — requires per-user configuration, adds friction, unnecessary for the single-page analysis use case
- Desktop strategy: rejected — mobile-first indexing makes mobile the primary signal; desktop can be added as a future option
- On-page only (no PageSpeed): rejected — Core Web Vitals (LCP, CLS, TBT) are not extractable from the page DOM; external measurement is required

**Consequences:**
- Users on shared IP/VPN may hit 429 quota errors; surfaced as a distinct message ("quota exceeded, try again") rather than a generic error
- PageSpeed requests hit `www.googleapis.com` — blocked on intranets without egress; failure state shown as loading error
- `fetch()` call runs from the side panel context (no CORS issues — side panel is an extension page with unrestricted fetch)

**Related:** ROAD-0013 (future: add API key input option for higher quota)

---

### DEC-0004: Migrate UI surface from popup to Chrome Side Panel

**Date:** 2026-03-26
**Status:** Accepted
**Supersedes:** DEC-0003

**Context:**
The popup surface (380px × 400px fixed) was too constrained for the data opsIQ needs to display: 200px scroll areas for events, audit issues, and schema items made the tool difficult to use in practice. User feedback confirmed the cramped layout was the primary usability complaint.

**Decision:**
Migrate the UI to a Chrome Side Panel, giving the full browser height and persistent display across page navigations.

**Rationale:**
- Side panel provides full viewport height — eliminates all fixed-height constraints
- Persistent across navigations — events accumulate across page loads without re-opening
- Consistent with pdpIQ (another product in the same suite) which uses the same surface
- Chrome Side Panel API (MV3) is stable and supported in Chrome 114+

**Consequences:**
- `popup.html/css/js` are retired from the manifest (kept on disk for reference)
- `sidepanel.html/css/js` replace them as the UI entry point
- New `chrome.runtime.connect` port pattern replaces `window.unload` for open/close detection
- `background.js` gains page navigation relay and port handshake logic
- Extension version bumped to 1.3.0

---

### DEC-0003 — Use popup (not side panel) as the UI surface
- **Date:** 2026-03-26
- **Status:** Superseded by DEC-0004
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
