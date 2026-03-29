# Changelog

> **PDS Document 10** | Last Updated: 2026-03-26

All notable changes to this project. Format follows [Keep a Changelog](https://keepachangelog.com/). Most recent version at the top.

---

## [v1.5.0] — Unreleased

### Added
- **SEO tab full text**: On-Page Signals rows (description, H1) now show full untruncated values; CSS updated to `word-break: break-word` instead of ellipsis clipping
- **SEO copy button**: Copy button in the SEO tab toolbar exports a plain-text `opsIQ SEO REPORT` with all signal rows to the clipboard
- **PageSpeed API key support**: Optional API key row in the PageSpeed sub-section (stored in `chrome.storage.local`, per-device). When quota is hit, shows contextual message: "Add a free Google API key above" (no key) or "Check your Google Cloud Console quota" (key present)
- **Per-schema copy buttons**: Each schema item card has an individual Copy button that exports schema type, source, status, issues list, and raw JSON to the clipboard
- **Schema validation aligned with pdpIQ**: Product recommended fields now include `sku`, `gtin`, `mpn`; AggregateRating `reviewCount` moved from required to recommended; `gtin` validates against full variant chain (gtin13/gtin14/gtin12/gtin8); Offer `price` accepts `lowPrice` as equivalent (Shopify/WooCommerce range pricing)
- **Schema content display aligned with pdpIQ**: AggregateRating and Review added to content FIELDS map; Product shows identifiers (sku, gtin, mpn) and lowPrice; Organization shows logo; `reviewCount|ratingCount` fallback for WooCommerce/BigCommerce display
- **Platform schema normalization**: Shopify `@id` deferred reference resolution in `@graph` (e.g. `aggregateRating: {"@id": "#reviews"}` now correctly links to the AggregateRating block); BigCommerce typeless `@graph` blocks now contribute `aggregateRating` to the Product entry; WooCommerce `ratingCount` accepted as equivalent to `reviewCount` in both validation and content display

---

## [Unreleased]

### Changed
- Extension renamed from "TRIBBUTE Auditor" to "opsIQ"
- Internal guard flags renamed: `__tribbute` → `__opsiq`
- Internal CustomEvent types renamed: `__tribbute_event__` → `__opsiq_event__`, `__tribbute_tracking__` → `__opsiq_tracking__`

### Added
- PDS documentation structure (`docs/00` through `docs/10`, `.context/`, `.claude/rules/pds-protocol.md`)

---

## [v1.4.0] — Unreleased

### Added
- **Tab blurbs**: short descriptive text beneath each tab toolbar (Events, Audit, Schema, SEO) explaining what the tab shows
- **Tracking recommendations**: when GTM, GA4, Google Ads, or Facebook Pixel is not detected, a contextual check-list appears below the detection pills with 3–4 actionable tips per tool (e.g. "check GTM tags first", "search Network tab for fbevents.js")
- **Schema content extraction**: collapsible "Show content ▶" toggle on every schema item, revealing key human-readable fields (name, price, author, headline, breadcrumb trail, etc.) resolved from raw JSON-LD/Microdata data
- **SEO tab**: new fourth tab with two sub-sections:
  - *On-Page Signals*: title, meta description, canonical, robots, H1/H2 counts, Open Graph, Twitter Cards, image alt coverage, internal/external link counts, hreflang — each row shows a status indicator (✓ / ! / ✗)
  - *PageSpeed Insights*: 4 score circles (Performance, SEO, Accessibility, Best Practices) + Core Web Vitals row (LCP, CLS, TBT) fetched from the Google PageSpeed Insights API v5 (free, no API key, mobile strategy)
- DEC-0005: PageSpeed API architectural decision (see Decision Log)

### Fixed
- `extractSchemaContent` empty-array crash: `resolve()` now null-checks after unwrapping the first array element, preventing `TypeError` on schemas with empty array fields (e.g. `offers: []`)
- `loadSEOData` stale response guard: `_seoLoadToken` pattern prevents a delayed `GET_SEO_DATA` response from writing to `seoData` after page navigation has reset state
- PageSpeed 429 quota errors now surface an actionable message ("quota exceeded, try again") rather than the generic connection error

---

## [1.3.0] — 2026-03-26

### Added
- Side Panel UI (sidepanel.html/css/js) replaces the popup — full browser height, persistent across page navigations
- Bottom navigation bar with Events, Audit, Schema tabs (roving tabindex keyboard navigation)
- Collapsible tracking detection bar in sticky header with current page URL
- Page navigation boundary markers in the events list (inserted on `chrome.tabs.onUpdated`)
- Event cap (EVENT_CAP = 200) in sidepanel.js — oldest events dropped when cap exceeded
- Lazy payload rendering in events list — JSON payloads expand only on click
- Schema tab: stacked "Schema Validation" + "Implementation Opportunities" sub-sections
- WCAG 2.1 AA: `:focus-visible` on all interactive elements; schema status uses `[✓]/[✗]/[!]` text prefixes
- DEC-0004: Architectural decision to migrate from popup to side panel

### Fixed
- BUG-0002: Added `"tabs"` permission to manifest.json (chrome.tabs.query was failing silently)
- BUG-0003: `safeSendMessage` in content.js now distinguishes transient SW restart errors from fatal context invalidation; transient errors no longer permanently disable event capture
- BUG-0004: Replaced unreliable `isPopupOpen + window.unload` with port-based `isPanelOpen` detection (background.js relays PANEL_OPEN/PANEL_CLOSED via chrome.runtime.onConnect)

### Removed
- popup.html, popup.css, popup.js removed from manifest.json (files kept on disk for reference)

---

## v1.2.0 — 2026-03-26

### Added
- Schema Audit tab: detects and validates JSON-LD, Microdata, and RDFa structured data
- Schema validation for 20+ schema types: Product, ProductGroup, Organization, Article, LocalBusiness, FAQPage, HowTo, Recipe, Event, Person, Review, AggregateRating, VideoObject, ImageObject, WebPage, WebSite, BreadcrumbList, NewsArticle, BlogPosting
- Smart schema validation: Product variant detection via `inProductGroupWithID` — skips fields inherited from parent ProductGroup (brand, manufacturer, aggregateRating)
- `@graph` array expansion and nested schema handling
- Implementation Opportunities section: prioritized recommendations (HIGH/MEDIUM/LOW) for missing or improvable schema markup
- Opportunities include: WebSite with SearchAction, BreadcrumbList, Organization, AggregateRating, Reviews, Product Identifiers (GTIN/MPN), Author details for E-E-A-T, FAQPage, HowTo, VideoObject
- Copy Schema report button

---

## v1.0.0 — Initial Release

### Added
- Tracking Detection: detects GTM container IDs, GA4 measurement IDs, Google Ads conversion IDs, Facebook Pixel IDs from script tags and runtime objects
- Events tab: real-time interception and display of `dataLayer.push()`, `gtag()`, and `fbq()` calls via injected page-context script
- Events tab filtering by source (dataLayer/gtag/fbq) and event name
- Clear events button
- Audit tab: GA4 ecommerce event validation (required fields per event type, item-level validation, value/currency consistency)
- Audit tab: Facebook Pixel event validation (required fields per event type including value + currency for Purchase)
- Copy All and Copy Audit report buttons
- `injected.js` → CustomEvent bridge → `content.js` → popup message-passing architecture
- Zero-telemetry, privacy-first architecture (no external network requests)
- Chrome Manifest V3 compliance
