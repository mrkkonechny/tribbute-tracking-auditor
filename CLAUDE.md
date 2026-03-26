# opsIQ

A Chrome extension that audits tracking implementations, schema markup, and monitors real-time events.

## Project Structure

```
tribbute-tracking-auditor/
├── manifest.json    # Chrome extension manifest (Manifest V3)
├── popup.html       # Extension popup UI with tabbed interface
├── popup.css        # Popup styles with opsIQ branding
├── popup.js         # Popup logic, validation, and event handling
├── content.js       # Content script for DOM scanning and tracking detection
├── injected.js      # Page context script for intercepting tracking calls
├── background.js    # Service worker for message passing
└── icons/           # Extension icons (16, 48, 128px)
```

## Features

### 1. Tracking Detection
- **GTM**: Scans for `googletagmanager.com/gtm.js` and `window.google_tag_manager`
- **GA4**: Scans for `googletagmanager.com/gtag/js` and gtag config calls
- **Google Ads**: Detects `AW-XXXXXX` IDs in gtag config
- **Facebook Pixel**: Scans for `connect.facebook.net/fbevents.js` and `fbq('init', ...)`

### 2. Event Monitoring (Events Tab)
Intercepts and displays:
- `dataLayer.push()` events for GTM/GA4
- `gtag()` calls for GA4
- `fbq()` calls for Facebook Pixel

### 3. Event Audit (Audit Tab)
Validates GA4 ecommerce events for:
- Required fields (items, currency, value, transaction_id)
- Recommended fields
- Item-level validation (item_id, item_name, price, quantity)
- Value/currency consistency

Validates Facebook Pixel events for:
- Required fields (value, currency for Purchase)
- Recommended fields per event type

### 4. Schema Audit (Schema Tab)
Detects and validates structured data:
- **JSON-LD** (`<script type="application/ld+json">`)
- **Microdata** (itemscope, itemtype, itemprop attributes)
- **RDFa** (typeof, property attributes)

Validates common schema types:
- Product, ProductGroup, Organization, LocalBusiness
- Article, NewsArticle, BlogPosting
- WebPage, WebSite, BreadcrumbList
- FAQPage, HowTo, Recipe, Event
- Person, Review, AggregateRating
- VideoObject, ImageObject

Smart validation features:
- **Product Variant Detection**: Recognizes Product variants (via `inProductGroupWithID`) and skips validation for fields inherited from parent ProductGroup (brand, manufacturer, aggregateRating)
- **Nested Schema Handling**: Properly handles `@graph` arrays and nested schemas

### 5. Implementation Opportunities
Provides actionable recommendations for improving schema markup:
- Suggests missing schemas (WebSite, BreadcrumbList, Organization)
- Product-specific recommendations (AggregateRating, Reviews, Product Identifiers)
- Article enhancements (Author details for E-E-A-T)
- Rich result opportunities (FAQPage, HowTo, VideoObject)
- Prioritized by impact (HIGH, MEDIUM, LOW)

## Development

### Loading the Extension
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select this directory

### Testing
1. Visit a site with tracking and/or schema markup
2. Click the extension icon
3. Check the Events tab for captured events
4. Check the Audit tab for event validation issues
5. Check the Schema tab for structured data audit

## Product Development Standard (PDS)

This project follows the opsIQ PDS. Read `docs/00-PDS_README.md` for the full structure and `.claude/rules/pds-protocol.md` for operational rules.

### Documentation Structure
- `docs/01-06` — Product definition and operations (update with explicit instruction only)
- `docs/07-10` — Tracking files (update proactively during work)
- `docs/.context/` — Ephemeral agent handoff files (overwrite each task)

### ID Systems
- **DEC-NNNN** → Decision Log (07)
- **ROAD-NNNN** → Roadmap (08)
- **BUG-NNNN** → Bug Log (09)

When you encounter a bug, complete a feature, make an architectural decision, or identify tech debt during any task, update the relevant tracking files and cross-reference IDs.
