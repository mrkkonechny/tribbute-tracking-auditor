# Changelog

> **PDS Document 10** | Last Updated: 2026-03-26

All notable changes to this project. Format follows [Keep a Changelog](https://keepachangelog.com/). Most recent version at the top.

---

## [Unreleased]

### Changed
- Extension renamed from "TRIBBUTE Auditor" to "opsIQ"
- Internal guard flags renamed: `__tribbute` → `__opsiq`
- Internal CustomEvent types renamed: `__tribbute_event__` → `__opsiq_event__`, `__tribbute_tracking__` → `__opsiq_tracking__`

### Added
- PDS documentation structure (`docs/00` through `docs/10`, `.context/`, `.claude/rules/pds-protocol.md`)

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
