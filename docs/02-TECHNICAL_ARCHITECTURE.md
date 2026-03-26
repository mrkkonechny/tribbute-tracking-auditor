# Technical Architecture

> **PDS Document 02** | Last Updated: 2026-03-26

---

## 1. System Overview

opsIQ is a Manifest V3 Chrome extension with no backend and no build pipeline. It operates across four isolated JavaScript execution contexts that communicate via two bridging mechanisms: browser CustomEvents (page context → content script) and `chrome.runtime.sendMessage` (content script ↔ popup).

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  PAGE CONTEXT (injected.js)                                     │
│                                                                 │
│  wraps dataLayer.push() ──┐                                     │
│  wraps window.gtag()      ├──► dispatchEvent('__opsiq_event__') │
│  wraps window.fbq()       │                                     │
│  polls google_tag_manager ├──► dispatchEvent('__opsiq_tracking__')
│                           │                                     │
│  Guard flags: dataLayer.__opsiq, gtag.__opsiq, fbq.__opsiq      │
└────────────────────────────┬────────────────────────────────────┘
                             │ window CustomEvents
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  CONTENT SCRIPT (content.js) — run_at: document_start          │
│                                                                 │
│  Injects injected.js via <script src> (web_accessible_resources)│
│  Listens for __opsiq_event__ → pushes to capturedEvents[]       │
│  Listens for __opsiq_tracking__ → merges into trackingData{}    │
│  Scans DOM for script/iframe/noscript/img tracking patterns     │
│  Scans DOM for JSON-LD / Microdata / RDFa schema items          │
│                                                                 │
│  Handles messages:                                              │
│    GET_TRACKING_DATA → { tracking, events }                     │
│    GET_SCHEMA_DATA   → { schema }                               │
│    CLEAR_EVENTS      → clears capturedEvents[]                  │
│    POPUP_CLOSED      → sets isPopupOpen = false                 │
│    NEW_EVENT (send)  → forwards live events to popup            │
└───────────┬─────────────────────────────────────────────────────┘
            │ chrome.runtime.sendMessage / onMessage
            │                          ▲
            ▼                          │
┌───────────────────────┐   ┌──────────────────────────────────────┐
│  SERVICE WORKER       │   │  POPUP (popup.js + popup.html)        │
│  (background.js)      │   │                                       │
│                       │   │  On open: GET_TRACKING_DATA           │
│  Message routing      │   │           GET_SCHEMA_DATA             │
│  (minimal; most       │   │  On clear: CLEAR_EVENTS               │
│  messages go direct   │   │  On close: POPUP_CLOSED (unreliable)  │
│  content ↔ popup)     │   │                                       │
│                       │   │  Tabs: Tracking / Events / Audit /    │
│  Handles NEW_EVENT    │   │        Schema                         │
│  (currently no-op;    │   │                                       │
│  popup listens        │   │  Validates events via rule tables      │
│  directly)            │   │  Validates schema via type rules       │
│                       │   │  Generates plain-text clipboard reports│
└───────────────────────┘   └──────────────────────────────────────┘
```

### Key Properties

- **No shared memory** between contexts. All state transfer happens via message passing or CustomEvents.
- **No storage APIs used.** `chrome.storage` is not requested; all state is ephemeral and lives in the content script's closure.
- **No external network requests** from any extension context.
- The service worker (`background.js`) is intentionally minimal — it exists primarily to satisfy MV3 requirements and for `onInstalled` logging. Message routing is handled by direct content-script-to-popup communication.

---

## 2. Technology Stack

| Component | Technology | Notes |
|---|---|---|
| Extension platform | Chrome Manifest V3 | Service worker replaces persistent background page |
| Page-context interception | Vanilla JavaScript (ES6 classes, arrow functions, spread) | Runs in page context; must be compatible with any page's JS environment |
| Content script | Vanilla JavaScript (ES6) | Injected at `document_start`; access to DOM and `chrome.*` APIs |
| Inline fallback (CSP) | Vanilla JavaScript (ES5-compatible) | `injectedScriptContent()` in content.js; serialised and injected as `<script>` textContent |
| Popup UI | HTML5 + CSS3 + Vanilla JavaScript (ES6) | No framework; tabbed interface; ~1200 lines of popup.js |
| Icons | PNG (16px, 48px, 128px) | Static assets in `icons/` |
| Storage | None | No `chrome.storage`; no `localStorage`; all state is in-memory per content script instance |
| Build tooling | None | Load unpacked for development; zip for production |
| External dependencies | None | No npm, no bundler, no CDN |

---

## 3. Key Design Decisions

Architectural decisions are recorded in full in [docs/07-DECISION_LOG.md](07-DECISION_LOG.md). Summaries relevant to this document:

- **DEC-0001 — Page-context injection via web_accessible_resources:** `injected.js` is declared as a web-accessible resource and loaded via `<script src>` from the content script. This is the only reliable way to access and wrap `window.dataLayer`, `window.gtag`, and `window.fbq` in the page's own JavaScript context. Content scripts run in an isolated world and cannot access page globals directly.

- **DEC-0002 — Guard flags over injection checks:** Each wrapped function is tagged with `.__opsiq = true` (e.g., `window.dataLayer.__opsiq`). The interceptor checks this flag before wrapping, preventing double-wrapping if the content script re-runs (e.g., on hash navigation). This is more reliable than tracking whether `injected.js` has run, as the page context persists across content script re-injections.

- **DEC-0003 — No chrome.storage; ephemeral state only:** Persisting events or tracking data across popup sessions was considered and rejected. The extension's value is real-time inspection; stale persisted data would create confusion. All state lives in the content script closure and is lost when the tab navigates or is closed.

---

## 4. Injection Mechanism

### Primary Path: web_accessible_resources

`manifest.json` declares `injected.js` as a web-accessible resource:

```json
"web_accessible_resources": [
  {
    "resources": ["injected.js"],
    "matches": ["<all_urls>"]
  }
]
```

`content.js` appends a `<script>` element with `src` set to `chrome.runtime.getURL('injected.js')`:

```javascript
const script = document.createElement('script');
script.src = chrome.runtime.getURL('injected.js');
script.onload = function() { this.remove(); };
script.onerror = function() {
  this.remove();
  injectInlineScript(); // CSP fallback
};
(document.head || document.documentElement).appendChild(script);
```

The script element is removed after load to keep the DOM clean. `injected.js` executes in the page context and retains access to `window.*` globals for the tab's lifetime.

### Fallback Path: Inline Script Injection

If a page's Content Security Policy blocks the external `<script src>` (the `onerror` callback fires), `content.js` falls back to serialising a self-contained IIFE (`injectedScriptContent`) as `script.textContent` and appending it to the DOM. This inline version is written in ES5-compatible JavaScript to maximise compatibility.

Strict CSPs that include `script-src 'self'` without `'unsafe-inline'` will block both paths. In this case, event interception is silently unavailable. This is tracked as a known limitation; a user-visible warning is planned for v2.0.0.

### Injection Timing

`content.js` runs at `document_start` (before any page scripts). Injection is deferred to `DOMContentLoaded` if `document.readyState === 'loading'`, otherwise it runs immediately. This ensures the interceptors are in place before most tracking libraries initialise, but it does not guarantee interception of tracking calls made in `<head>` inline scripts that run before `DOMContentLoaded`.

---

## 5. Tracking Detection

Detection uses two parallel mechanisms that are merged and deduplicated.

### DOM Scanning (`scanForTrackingScripts`)

Runs at DOMContentLoaded, then again at t=+2s and t=+5s to catch dynamically appended scripts.

Scans the following DOM elements:

| Element | Pattern | Detects |
|---|---|---|
| `<script src>` | `googletagmanager.com/gtm.js?id=(GTM-...)` | GTM container ID |
| `<script src>` | `googletagmanager.com/gtag/js?id=(G-...)` | GA4 measurement ID |
| `<script src>` | `[?&]id=(G-\|GTM-\|AW-...)` | GA4 / GTM / Google Ads IDs in query string |
| `<script>` (inline) | `gtag('config', 'G-...')` | GA4 / Google Ads from inline gtag config |
| `<script>` (inline) | `AW-[A-Za-z0-9]+` | Google Ads conversion IDs |
| `<script>` (inline) | `fbq('init', 'NNNN')` | Facebook Pixel init calls |
| `<script>` (inline) | `pixel\|pixelId = 'NNNN'` | Facebook Pixel ID patterns |
| `<iframe src>` | `googletagmanager.com?id=(GTM-...)` | GTM noscript iframe |
| `<iframe src>` | `facebook.com?id=(NNNN)` | Facebook Pixel noscript iframe |
| `<noscript>` | Same GTM / FB patterns | GTM / FB noscript fallbacks |
| `<img src>` | `facebook.com/tr?id=(NNNN)` | Facebook Pixel tracking pixel |
| `<img src>` | `googleadservices.com/conversion/(NNNN)` | Google Ads conversion pixel |

All arrays are deduplicated via `Set` after each scan.

### Runtime Interception (`injected.js`)

Runs continuously; uses `setInterval` polling (100ms for dataLayer/gtag/fbq, 500ms for `google_tag_manager`) that clears on first detection and times out after 10 seconds.

Dispatches `__opsiq_tracking__` CustomEvents for:
- `dataLayer.push(['config', 'G-...'])` → GA4
- `dataLayer.push(['config', 'AW-...'])` → Google Ads
- `dataLayer.push(['config', 'GTM-...'])` → GTM
- `gtag('config', 'G-...')` → GA4
- `gtag('config', 'AW-...')` → Google Ads
- `fbq('init', 'NNNN')` → Facebook Pixel
- `window.google_tag_manager` keys matching `/^GTM-/i` → GTM

---

## 6. Schema Detection

`scanForSchemaData()` in `content.js` runs at DOMContentLoaded and at t=+2s. It produces an array of `SchemaItem` objects (see API Documentation 04).

### JSON-LD

```javascript
document.querySelectorAll('script[type="application/ld+json"]')
```

Each script's `textContent` is parsed via `JSON.parse`. The parser handles:
- Single schema objects (`{ "@type": "Product", ... }`)
- Arrays of schema objects (`[{ "@type": "Product" }, { "@type": "BreadcrumbList" }]`)
- `@graph` arrays (`{ "@graph": [{ "@type": "WebPage" }, ...] }`) — each graph item is expanded into a separate `SchemaItem`
- Nested schemas without a top-level `@type` — first-level keys are inspected for nested objects with `@type`
- Parse errors — recorded as `{ format: 'JSON-LD', type: 'PARSE_ERROR', data: { error, raw } }`

### Microdata

```javascript
document.querySelectorAll('[itemscope]')
```

For each element, `itemtype` is read and the final path segment used as the type name. All descendant `[itemprop]` elements are walked; `content`, `href`, `src`, and `textContent` are checked in order for the property value. Multiple values for the same property name are coalesced into an array.

### RDFa

```javascript
document.querySelectorAll('[typeof]')
```

The `typeof` attribute value is used as the type name. Descendant `[property]` elements are walked using `content`, `href`, and `textContent`.

### Schema Validation (popup.js)

Validation rules are defined per `@type` in `popup.js`. The validator checks:
- Required fields (produces `severity: 'error'`)
- Recommended fields (produces `severity: 'warning'`)
- Informational notes (produces `severity: 'info'`)

**Product variant detection:** A Product with `inProductGroupWithID` present is treated as a variant. Validation skips `brand`, `manufacturer`, and `aggregateRating` for variants, as these fields are expected to be on the parent `ProductGroup`.

Supported schema types (20+): Product, ProductGroup, Organization, LocalBusiness, Article, NewsArticle, BlogPosting, WebPage, WebSite, BreadcrumbList, FAQPage, HowTo, Recipe, Event, Person, Review, AggregateRating, VideoObject, ImageObject, and others.

---

## 7. Known Issues

The following bugs affect the current v1.2.0 architecture. Full details in [docs/09-BUG_LOG.md](09-BUG_LOG.md).

| ID | Severity | Location | Description |
|---|---|---|---|
| BUG-0001 | Critical | `popup.js:1126` | `item.source` is interpolated directly into `innerHTML` without escaping. A malicious page can inject arbitrary HTML into the popup by setting a tracking source string containing HTML tags. Fix: route `item.source` through `escapeHtml()`. |
| BUG-0002 | High | `manifest.json` | The `tabs` permission is not declared. `chrome.tabs.query()` returns tab objects where `tab.url` is `undefined`. Audit report headers show "N/A" for the page URL. Fix: add `"tabs"` to the `permissions` array. |
| BUG-0003 | High | `content.js:35–45` | `isContextValid` is set permanently to `false` when any `chrome.runtime.sendMessage` call fails (including transient failures during service worker restart). Once false, all subsequent event forwarding and message handling is silently disabled until the tab is reloaded. Fix: check `chrome.runtime.id` on each call rather than caching validity state. |
| BUG-0004 | High | `popup.js` (window unload handler) | `POPUP_CLOSED` is sent via `window.addEventListener('unload', ...)`. The `unload` event is unreliable in MV3 popup contexts — it often does not fire when the popup is dismissed by clicking away or pressing Escape. `isPopupOpen` in `content.js` remains `true`, causing the content script to attempt (and fail) to forward events to a closed popup, generating unnecessary errors. Fix: use `visibilitychange` or a keepalive ping mechanism. |
