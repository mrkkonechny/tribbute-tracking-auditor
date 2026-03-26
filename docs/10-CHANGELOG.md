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
