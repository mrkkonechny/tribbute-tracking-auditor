# Product Brief

> **PDS Document 01** | Last Updated: 2026-03-26

---

## 1. Problem Statement

Analytics engineers, tag managers, and SEO practitioners lack a fast, in-browser tool to verify tracking correctness without deep DevTools expertise. Confirming that GTM fired, that a GA4 `purchase` event carries a `transaction_id`, or that a Product schema contains the required `offers` field currently requires opening the Network panel, switching to GTM Preview mode, and cross-referencing Google's documentation simultaneously — a workflow that is slow, error-prone, and inaccessible to non-engineers.

Specific gaps in the current tooling landscape:

- **No unified tracking + schema view.** DevTools shows network requests; Rich Results Test shows schema; GA4 DebugView shows events — but no single tool surfaces all three together in context.
- **No real-time event field validation.** GTM Preview shows that events fired; it does not validate required fields or flag missing `currency` when `value` is present.
- **No in-browser schema validation.** Rich Results Test requires a URL submission and a round-trip to Google's servers. It cannot inspect pages behind authentication or staging environments.
- **High barrier for non-engineers.** QA engineers and digital marketing managers cannot self-serve verification without relying on analytics engineers to interpret DevTools output.

opsIQ solves this by providing an always-available browser extension that detects tracking implementations, monitors and validates events in real time, and audits schema markup — all without leaving the page under inspection.

---

## 2. Target Users

### Primary Users

| User | Role | Core Job-To-Be-Done |
|---|---|---|
| Analytics Engineer | Implements and maintains GTM/GA4 tracking | Verify that tracking fires correctly and GA4 ecommerce events are field-complete before go-live |
| Tag Manager | Manages GTM containers and tag configurations | Confirm GTM container ID, confirm dataLayer.push events reach GA4 with correct structure |
| SEO Practitioner | Implements and audits schema markup | Validate JSON-LD / Microdata / RDFa is present, correctly typed, and field-complete without leaving the browser |

### Secondary Users

| User | Role | Core Job-To-Be-Done |
|---|---|---|
| QA Engineer | Validates staging and production releases | Run a pre-release regression check across tracking and schema without requiring DevTools expertise |
| Digital Marketing Manager | Oversees campaign measurement | Self-serve verification that tracking IDs are present and Pixel is initialized before a campaign launch |

---

## 3. Product Definition

**opsIQ is a zero-telemetry Chrome extension that gives analytics engineers and SEO practitioners an in-browser audit panel for tracking implementations, GA4 / Facebook Pixel event validation, and schema markup correctness.**

### Core Capabilities

| Capability | Description |
|---|---|
| Tracking Detection | Detects GTM (GTM-XXXXXX), GA4 (G-XXXXXXXXXX), Google Ads (AW-XXXXXXXXX), and Facebook Pixel IDs from script tags, inline code, iframes, and noscript elements |
| Real-Time Event Monitoring | Intercepts `dataLayer.push()`, `gtag()`, and `fbq()` calls via a page-context script and displays a live event feed in the Events tab |
| GA4 Ecommerce Validation | Validates captured GA4 events against per-event required and recommended field rules (items, currency, value, transaction_id, item-level fields) with severity-tagged issues |
| Facebook Pixel Validation | Validates `fbq()` events against per-event required and recommended field rules; flags `value` without `currency` |
| Schema Markup Audit | Detects JSON-LD, Microdata, and RDFa across 20+ schema.org types and validates required fields per type, with smart Product variant handling |
| Implementation Opportunities | Surfaces schema gaps as prioritised recommendations (HIGH / MEDIUM / LOW) based on detected page context |
| Clipboard Export | Copies full audit reports (tracking + events + schema) to the clipboard in plain text; no server required |
| Zero Telemetry | No data leaves the browser; no analytics, no backend, no external requests by the extension itself |

---

## 4. Success Criteria

| Metric | Target | Measurement Method |
|---|---|---|
| Tracking detection accuracy | Detects all 4 tracking types on known test sites with no false negatives | Manual regression against test site matrix (see Test Plan 05) |
| Detection latency | Tracking IDs displayed within 2 seconds of popup open on a loaded page | Manual timing; target DOM scan completes before 2s re-scan fires |
| GA4 validation correctness | Zero false positives / false negatives on required-field rules for all 11 ecommerce event types | Unit test coverage of `validateEvent()` rule table (Vitest recommended) |
| Schema detection coverage | JSON-LD, Microdata, and RDFa all detected on test pages; @graph arrays expanded correctly | Manual test against sites with known schema implementations |
| Popup load time | Popup renders initial tracking tab in < 500 ms | Manual inspection; no async blocking on popup open |
| Report copy success | Copy All, Copy Audit, Copy Schema all write non-empty text to clipboard | Manual verification per tab |
| Zero data exfiltration | No outbound network requests from extension contexts | Chrome DevTools Network panel audit; CSP header inspection |
| Chrome Web Store compatibility | Extension passes Web Store review without policy violations | Store review outcome |

---

## 5. Key Assumptions & Risks

### Assumptions

| ID | Assumption | Confidence |
|---|---|---|
| A-001 | Target users have Chrome installed and can install extensions from the Web Store | High |
| A-002 | Pages with tracking use standard GTM / GA4 / Facebook Pixel integration patterns detectable via script tags or `window` globals | High |
| A-003 | Schema markup is present in the DOM at page load or within 2 seconds of DOMContentLoaded | Medium — SPA pages may render schema later |
| A-004 | Users understand the difference between an error (required field missing) and a warning (recommended field missing) | Medium — tooltip or legend may be needed |
| A-005 | The extension is used on pages where the user has implicit permission to inspect tracking (e.g., their own properties or client properties) | High |

### Risks

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R-001 | Strict Content Security Policy blocks `injected.js` injection | Medium | High — event interception fails silently | Inline script fallback implemented in `content.js`; CSP detection not yet surfaced to user |
| R-002 | BUG-0001 XSS via `item.source` in popup.js:1126 allows malicious page to inject HTML into popup | Low (requires adversarial page) | Critical | Fix by escaping `item.source` through `escapeHtml()` — tracked as BUG-0001, planned for v1.3.0 |
| R-003 | Service worker restart (BUG-0003) causes `isContextValid` to be permanently false, silently breaking event forwarding | Medium | High | Fix planned for v1.3.0: check `chrome.runtime.id` on each call rather than caching state |
| R-004 | Chrome MV3 service worker lifecycle limits real-time message forwarding reliability | Medium | Medium | Popup queries content script directly on open; real-time path is supplementary |
| R-005 | SPA navigation does not trigger a new content script injection; tracking data may reflect prior page | Medium | Medium | Re-scan on popup open partially mitigates; full SPA support is a v2.0.0 roadmap item |
| R-006 | Chrome Web Store review delay blocks timely release of security fixes | Low | Medium | Maintain a fast-track patch process; communicate timeline to users via GitHub |

---

## 6. Dependencies & Integrations

| Dependency | Type | Version / Constraint | Notes |
|---|---|---|---|
| Chrome Extensions Manifest V3 | Platform | MV3 (Chrome 88+) | Required for Web Store submission; service worker replaces background page |
| `activeTab` permission | Browser permission | Required | Allows content script to access the active tab's DOM |
| `scripting` permission | Browser permission | Required | Used to inject `content.js` programmatically if needed; content_scripts declaration covers most cases |
| `host_permissions: <all_urls>` | Browser permission | Required | Required for content script to run on all sites |
| `web_accessible_resources` | MV3 feature | `injected.js` exposed | Allows content script to load `injected.js` into page context via `<script src>` |
| Chrome Web Store | Distribution | Developer account required | Production distribution channel; $5 one-time developer fee |
| No external APIs | — | — | Extension makes no external requests; fully offline-capable |
| No build tooling | — | — | Vanilla JS / HTML / CSS; load unpacked for development |

---

## 7. Competitive / Alternative Landscape

| Alternative | Why Not Sufficient |
|------------|-------------------|
| Chrome DevTools (Network tab) | Requires filtering gtag/collect requests and reading raw query parameters; no validation of required fields; no schema parsing; requires expert knowledge |
| GTM Preview Mode | Only works for GTM-managed tags; requires GTM account access; separate browser tab; no GA4 ecommerce event validation; no Facebook Pixel; no schema audit |
| GA4 DebugView | Requires debug mode enabled in gtag config; only shows events reaching GA4 servers (not local validation); no Facebook Pixel; no schema coverage; delayed by several seconds |
| Google's Rich Results Test | Schema-only; validates one URL at a time; not integrated into browsing workflow; does not show raw schema data or non-Google schema types |
| Facebook Pixel Helper | Facebook Pixel only; no GTM/GA4/Google Ads; no schema; no GA4 ecommerce validation |
| Tag Assistant | GTM-specific; no GA4 ecommerce event validation beyond basic hit confirmation; no Facebook Pixel; no schema audit |

---

## 8. Roadmap Context

| Version | Status | Scope |
|---|---|---|
| v1.2.0 | Released (current) | Initial public release. Tracking detection (GTM, GA4, Google Ads, Pixel), real-time event monitoring, GA4 ecommerce validation, Facebook Pixel validation, schema audit (JSON-LD/Microdata/RDFa, 20+ types), implementation opportunities, clipboard export. |
| v1.3.0 | Planned — near-term | Bug fix release: BUG-0001 (XSS via unescaped `item.source`), BUG-0002 (missing `tabs` permission; tab.url undefined in reports), BUG-0003 (isContextValid permanent false on SW restart), BUG-0004 (POPUP_CLOSED unreliable via window.unload). |
| v2.0.0 | Planned — medium-term | Reliability and coverage release: SPA navigation support, CSP block user notification, improved SW lifecycle handling, expanded schema type coverage, potential Firefox / Edge support. |

Full roadmap detail: see [docs/08-ROADMAP.md](08-ROADMAP.md).
