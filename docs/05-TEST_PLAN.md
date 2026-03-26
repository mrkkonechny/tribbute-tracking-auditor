# Test Plan

> **PDS Document 05** | Last Updated: 2026-03-26

---

## 1. Test Strategy

### Current State

opsIQ v1.2.0 has no automated test framework. All testing is performed manually using the browser extension loaded in developer mode against real or purpose-built test pages.

### Recommended Automation Approach

**Vitest** is the recommended test framework for introducing unit coverage. Because the extension has no build pipeline, tests would target pure logic functions extracted from `popup.js` and `content.js` into importable modules:

| Target | Test Type | Framework |
|---|---|---|
| `validateEvent()` — GA4 rule table | Unit | Vitest |
| `validateEvent()` — Facebook Pixel rule table | Unit | Vitest |
| `validateSchemaItem()` — per-type required/recommended fields | Unit | Vitest |
| `escapeHtml()` — XSS prevention correctness | Unit | Vitest |
| `cloneEventData()` — depth limit, circular reference, function handling | Unit | Vitest |
| Schema `@graph` expansion logic | Unit | Vitest |
| Double-wrap guard (`.__opsiq` flag) | Integration | Browser extension test page |
| CustomEvent bridge end-to-end | Integration | Browser extension test page |
| Report generation (Copy All / Audit / Schema) | Integration | Browser extension test page |

Automated browser integration testing (e.g., Playwright with extension loading) is recommended for v2.0.0 once the project has a build step that can set up a test environment.

---

## 2. Critical Paths to Test

### 2.1 GA4 Ecommerce Validation Rules

The `validateEvent()` function in `popup.js` is the highest-risk pure logic component. The full required-field matrix must be exercised.

| Test Case | Input | Expected Result |
|---|---|---|
| `purchase` with all required fields | `{ items: [...], currency: 'USD', value: 99.99, transaction_id: 'T-001' }` | Zero errors |
| `purchase` missing `transaction_id` | `{ items: [...], currency: 'USD', value: 99.99 }` | 1 error: "Missing required transaction_id" |
| `purchase` missing `currency` | `{ items: [...], value: 99.99, transaction_id: 'T-001' }` | 1 error: "Missing required currency" |
| `purchase` with `value` but no `currency` | `{ items: [...], value: 99.99, transaction_id: 'T-001' }` | Error: "value provided without currency" |
| `purchase` with `value` as string | `{ items: [...], currency: 'USD', value: '99.99', transaction_id: 'T-001' }` | Warning: "value should be a number" |
| `add_to_cart` missing `items` | `{ currency: 'USD', value: 10.00 }` | Error: "Missing required items array" |
| `add_to_cart` with empty `items` array | `{ items: [], currency: 'USD', value: 10.00 }` | Error: "Missing required items array" |
| `add_to_cart` with item missing `item_id` | `{ items: [{ item_name: 'Widget', price: 10.00, quantity: 1 }], currency: 'USD', value: 10.00 }` | Warning: "Item 1 missing item_id" |
| Item with neither `item_id` nor `item_name` | `{ items: [{ price: 10.00 }], currency: 'USD', value: 10.00 }` | Error: "Item 1 missing both item_id and item_name" |
| `refund` — only `transaction_id` required | `{ transaction_id: 'T-001' }` | Zero errors |
| `view_item` with UA-style ecommerce wrapper | `{ ecommerce: { items: [{ item_id: 'SKU-1', item_name: 'Widget' }] } }` | Items array found via `data.ecommerce.items`; zero errors for items check |
| Non-ecommerce custom event | `{ source: 'dataLayer', name: 'button_click', data: {} }` | No rule match; displayed with no issues |

### 2.2 Facebook Pixel Validation Rules

| Test Case | Input | Expected Result |
|---|---|---|
| `Purchase` with `value` and `currency` | `{ value: 50.00, currency: 'USD' }` | Zero errors |
| `Purchase` missing `value` | `{ currency: 'USD' }` | Error: "Missing required value" |
| `Purchase` missing `currency` | `{ value: 50.00 }` | Error: "Missing required currency" |
| `Purchase` with `value` but no `currency` (consistency check) | `{ value: 50.00 }` | Error: "value provided without currency" |
| `ViewContent` missing recommended fields | `{}` | Warnings for `content_ids`, `content_type`, `value`, `currency` |
| `PageView` with no data | `{}` | Zero issues (no required or recommended fields) |
| Unknown custom `fbq` event | `{ source: 'fbq', name: 'CustomEvent', data: {} }` | No rule match; displayed with no issues |

### 2.3 Schema Validation per Type

| Test Case | Schema Input | Expected Result |
|---|---|---|
| Product with all key fields | `{ name, description, image, offers, brand }` | Zero errors |
| Product missing `name` | `{ description: '...', offers: {...} }` | Error: missing name |
| Product without `offers` | `{ name: 'Widget' }` | Warning: missing offers (recommended) |
| Product variant (with `inProductGroupWithID`) missing `brand` | `{ name: 'Blue Widget', inProductGroupWithID: 'GRP-1' }` | No warning for missing brand (variant exemption) |
| Article missing `author` | `{ headline: 'My Article' }` | Error: missing author |
| JSON-LD parse error | Invalid JSON string | `type: 'PARSE_ERROR'` with error message and raw snippet |
| `@graph` array with 3 schemas | JSON-LD with `@graph: [WebSite, BreadcrumbList, Organization]` | 3 independent schema items detected |
| Microdata Product | HTML with `itemscope itemtype="https://schema.org/Product"` | SchemaItem with format 'Microdata', type 'Product' |
| RDFa Article | HTML with `typeof="Article"` | SchemaItem with format 'RDFa', type 'Article' |
| `AggregateRating` missing `ratingCount` | `{ ratingValue: 4.5 }` | Error: missing ratingCount |

### 2.4 `escapeHtml()` — XSS Prevention

| Test Case | Input | Expected Output |
|---|---|---|
| Plain text | `Hello World` | `Hello World` |
| Script tag | `<script>alert(1)</script>` | `&lt;script&gt;alert(1)&lt;/script&gt;` |
| Double quotes | `He said "hello"` | `He said &quot;hello&quot;` |
| Single quotes | `It's fine` | `It&#039;s fine` |
| Ampersand | `A & B` | `A &amp; B` |
| Combined | `<img src="x" onerror='alert(1)'>` | `&lt;img src=&quot;x&quot; onerror=&#039;alert(1)&#039;&gt;` |

Specific regression for BUG-0001: `item.source` containing `<b>injected</b>` must render as literal text, not bold, in the popup schema display.

### 2.5 `__opsiq` Guard Flag — Double-Wrap Prevention

This must be tested in a live browser context.

**Procedure:**
1. Load a test page with a GTM implementation.
2. Load the extension and open the popup (triggers injection).
3. Close the popup.
4. Open the popup again (triggers re-injection attempt).
5. Verify: `window.dataLayer.__opsiq === true` in the browser console.
6. Verify: Only one wrapper is applied — `dataLayer.push` is not wrapped twice.
7. Fire a test event and confirm it appears exactly once in the Events tab.

---

## 3. Manual Test Sites

| Test Goal | Recommended Site Type | What to Verify |
|---|---|---|
| GTM detection | Any site with a GTM container | `GTM-XXXXXX` appears in Tracking tab within 2 seconds |
| GA4 + Google Ads detection | Any site with GA4 and Google Ads conversion tracking | `G-XXXXXXXXXX` and `AW-XXXXXXXXX` both detected |
| Facebook Pixel detection | Any site with Meta Pixel installed | Numeric Pixel ID detected; `fbq('init', ...)` intercepted |
| GA4 purchase event validation | E-commerce site with purchase tracking (e.g., add to cart + checkout) | Events tab shows purchase; Audit tab validates required fields |
| JSON-LD Product schema | E-commerce product detail page | Schema tab shows Product with correct format badge; required fields validated |
| JSON-LD Article schema | Blog post or news article page | Schema tab shows Article; `headline` and `author` validated |
| ProductGroup + variant detection | E-commerce site with product variants (e.g., Shopify) | Parent ProductGroup and child Products detected; variant exemption applied for `brand`, `aggregateRating` |
| `@graph` expansion | Site using `@graph` container (common in WordPress/Yoast) | Multiple schema items extracted from single JSON-LD block |
| No tracking / schema | Static HTML page with no tracking or schema | All tracking sections show "Not detected"; Schema tab shows "No schema data found" |
| CSP-restricted site | Site with strict `script-src` CSP | Inline fallback activates; events are still captured (if CSP permits inline scripts); popup opens without errors |

---

## 4. Regression Checklist

Run this checklist before each release. All items must pass.

**Tracking Tab:**
- [ ] GTM container ID detected and displayed on a GTM-enabled page
- [ ] GA4 measurement ID detected and displayed on a GA4-enabled page
- [ ] Google Ads conversion ID detected on a Google Ads conversion page
- [ ] Facebook Pixel ID detected on a Meta Pixel page
- [ ] Copy button for each detected ID writes the correct ID to clipboard
- [ ] Pages with no tracking show all four sections in "Not detected" state with no JS errors in the popup console

**Events Tab:**
- [ ] Events captured before popup opened are shown on first open
- [ ] `dataLayer.push({ event: ... })` event appears in feed within 1 second
- [ ] `gtag('event', ...)` event appears in feed within 1 second
- [ ] `fbq('track', ...)` event appears in feed within 1 second
- [ ] Filter dropdown correctly hides events not matching the selected source
- [ ] Clear button empties the feed and resets the content script buffer
- [ ] Internal `gtm.*` events do not appear in the feed
- [ ] Copy All button writes a non-empty plain-text report to clipboard containing event data

**Audit Tab:**
- [ ] `purchase` event with all required fields shows zero errors
- [ ] `purchase` event missing `transaction_id` shows an error for that field
- [ ] `purchase` event missing `currency` shows an error for that field
- [ ] Facebook Pixel `Purchase` missing `currency` shows an error
- [ ] Audit badge count matches total error + warning count displayed
- [ ] Copy Audit button writes a non-empty plain-text report to clipboard

**Schema Tab:**
- [ ] JSON-LD Product schema detected and displayed with correct type and source
- [ ] `@graph` schemas expanded into individual items
- [ ] Product variant with `inProductGroupWithID` does not show warnings for `brand` or `aggregateRating`
- [ ] JSON-LD parse error displays with `PARSE_ERROR` label and raw snippet
- [ ] Schema badge count matches total error + warning count
- [ ] Implementation Opportunities section appears with at least one recommendation on a page with schema but missing common types
- [ ] Copy Schema button writes a non-empty plain-text report to clipboard

**Security:**
- [ ] `item.source` containing HTML tags renders as escaped text in the popup (BUG-0001 regression — currently failing in v1.2.0)
- [ ] No `alert()` or DOM injection occurs when visiting a page with maliciously-named tracking sources
