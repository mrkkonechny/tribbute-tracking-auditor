# Specification

> **PDS Document 03** | Last Updated: 2026-03-26

---

## Use Cases

---

### UC-001: Detect Tracking on Page Load

**Actor:** Analytics Engineer, Tag Manager, Digital Marketing Manager

**Trigger:** User clicks the opsIQ extension icon while on a page.

**Description:** The extension detects all active tracking implementations on the current page and displays their IDs in the Tracking tab of the popup.

#### Functional Requirements

| ID | Requirement |
|---|---|
| UC-001-F-01 | The popup MUST display the Tracking tab by default on open. |
| UC-001-F-02 | The extension MUST detect GTM containers identified by the pattern `GTM-[A-Za-z0-9]+` in script `src` attributes, `window.google_tag_manager` keys, `<iframe>` src attributes, and `<noscript>` content. |
| UC-001-F-03 | The extension MUST detect GA4 measurement IDs identified by the pattern `G-[A-Za-z0-9]+` in script `src` attributes, inline `gtag('config', ...)` calls, and `dataLayer.push(['config', ...])` calls. |
| UC-001-F-04 | The extension MUST detect Google Ads conversion IDs identified by the pattern `AW-[A-Za-z0-9]+` in script `src` attributes, inline `gtag('config', ...)` calls, and `googleadservices.com` pixel URLs. |
| UC-001-F-05 | The extension MUST detect Facebook Pixel IDs (numeric, 10–20 digits) in inline `fbq('init', ...)` calls, `<iframe>` and `<img>` pixel URLs, and `fbq.getState()` / `fbq.queue`. |
| UC-001-F-06 | Each detected tracking type MUST be displayed in a labelled section (Google Tag Manager, Google Analytics 4, Google Ads, Facebook Pixel). |
| UC-001-F-07 | Each detected ID MUST be displayed alongside a copy-to-clipboard button. |
| UC-001-F-08 | If no IDs are detected for a tracking type, that type's section MUST display a "Not detected" state (not an error). |
| UC-001-F-09 | Detection MUST complete within 2 seconds of popup open for any IDs present in the DOM at page load. |
| UC-001-F-10 | IDs detected via runtime interception (post-load dynamic tags) MUST be reflected upon a subsequent popup open or refresh. |
| UC-001-F-11 | All ID arrays MUST be deduplicated; the same ID MUST NOT appear twice in a section. |

#### Acceptance Criteria

- Opening the popup on a page with a known GTM container shows the correct `GTM-XXXXXX` ID within 2 seconds.
- Clicking the copy button for an ID copies exactly that ID string to the clipboard.
- A page with no tracking shows all four sections in "Not detected" state with no errors thrown.

---

### UC-002: Monitor Real-Time Events

**Actor:** Analytics Engineer, Tag Manager, QA Engineer

**Trigger:** User opens the popup and switches to the Events tab.

**Description:** The extension displays a live feed of `dataLayer.push()`, `gtag()`, and `fbq()` calls intercepted from the page. Events captured before the popup was opened are also shown.

#### Functional Requirements

| ID | Requirement |
|---|---|
| UC-002-F-01 | The Events tab MUST display all events captured since the content script was injected (including pre-popup events). |
| UC-002-F-02 | New events fired while the popup is open MUST appear in the feed without requiring a manual refresh. |
| UC-002-F-03 | Each event entry MUST display: source (`dataLayer`, `gtag`, `fbq`), event name, timestamp (ISO 8601), and a collapsible JSON representation of the event data payload. |
| UC-002-F-04 | The feed MUST support filtering by source: All / dataLayer / gtag / fbq, controlled by a dropdown. |
| UC-002-F-05 | A "Clear" button MUST clear the event feed in the UI and purge `capturedEvents[]` in the content script. |
| UC-002-F-06 | Internal GTM lifecycle events (names starting with `gtm.`) MUST be excluded from the feed. |
| UC-002-F-07 | The `gtm.uniqueEventId` field and properties starting with `_` MUST be stripped from displayed event data. |
| UC-002-F-08 | Object depth in displayed event data MUST be limited to 5 levels; deeper values MUST be shown as `[Max depth]`. |
| UC-002-F-09 | Array values in event data MUST be limited to 50 items; object key counts MUST be limited to 30. |
| UC-002-F-10 | Circular references in event data MUST be safely handled and displayed as `[Circular]`. |
| UC-002-F-11 | Function values in event data MUST be displayed as `[Function]`. |

#### Acceptance Criteria

- Pushing `{ event: 'purchase', transaction_id: 'T-001', ... }` to `dataLayer` causes a new entry to appear in the Events tab within 1 second.
- Selecting "fbq" in the filter dropdown hides all non-fbq events.
- Clicking Clear empties the feed and subsequent events start fresh.

---

### UC-003: Validate GA4 Ecommerce Events

**Actor:** Analytics Engineer, QA Engineer

**Trigger:** User switches to the Audit tab, or the popup auto-runs validation when the tab becomes active.

**Description:** The extension validates all captured GA4 and dataLayer events against per-event required and recommended field rules. Issues are displayed with severity tags.

#### Functional Requirements

| ID | Requirement |
|---|---|
| UC-003-F-01 | The Audit tab MUST run validation automatically when selected. A Refresh button MUST allow re-running validation manually. |
| UC-003-F-02 | The following GA4 ecommerce event types MUST be validated: `view_item`, `view_item_list`, `select_item`, `add_to_cart`, `remove_from_cart`, `view_cart`, `begin_checkout`, `add_shipping_info`, `add_payment_info`, `purchase`, `refund`. |
| UC-003-F-03 | For each validated event, missing required fields MUST produce an issue with `severity: 'error'`. |
| UC-003-F-04 | For each validated event, missing recommended fields MUST produce an issue with `severity: 'warning'`. |
| UC-003-F-05 | When `items` is required, the validator MUST check that `items` is a non-empty array. If present, each item MUST be checked for per-event item-level fields (e.g., `item_id`, `item_name`, `price`, `quantity`). |
| UC-003-F-06 | The validator MUST check `data.items` and `data.ecommerce.items` (UA-style ecommerce object) when evaluating the `items` field. |
| UC-003-F-07 | If `value` is present and `currency` is absent, an error MUST be raised: "value provided without currency". |
| UC-003-F-08 | If `value` is present but is not a number, a warning MUST be raised: "value should be a number". |
| UC-003-F-09 | If an item in the `items` array has neither `item_id` nor `item_name`, an error MUST be raised for that item. |
| UC-003-F-10 | Events with no validation rules (non-ecommerce custom events) MUST appear in the Audit tab with a "no issues" state, not be silently omitted. |
| UC-003-F-11 | The Audit tab badge MUST show the total issue count when issues exist; it MUST be hidden when there are zero issues. |
| UC-003-F-12 | Facebook Pixel events captured via `fbq()` MUST also be validated (see UC-003-F-13 through UC-003-F-16). |
| UC-003-F-13 | The Facebook Pixel `Purchase` event MUST require `value` and `currency`. |
| UC-003-F-14 | Facebook Pixel events MUST validate recommended fields per event type: `ViewContent`, `Search`, `AddToCart`, `AddToWishlist`, `InitiateCheckout`, `AddPaymentInfo`, `Lead`, `CompleteRegistration`. |
| UC-003-F-15 | If a Facebook Pixel event provides `value` without `currency`, an error MUST be raised. |
| UC-003-F-16 | The Copy Audit button MUST copy a plain-text formatted audit report to the clipboard, including the page URL, date, all events, and their issues. |

#### Required Fields per GA4 Event Type

| Event | Required | Recommended | Item Fields |
|---|---|---|---|
| `view_item` | items | currency, value | item_id, item_name |
| `view_item_list` | items | item_list_id, item_list_name | item_id, item_name |
| `select_item` | items | item_list_id, item_list_name | item_id, item_name |
| `add_to_cart` | items, currency, value | — | item_id, item_name, price, quantity |
| `remove_from_cart` | items, currency, value | — | item_id, item_name |
| `view_cart` | items, currency, value | — | item_id, item_name, price, quantity |
| `begin_checkout` | items, currency, value | coupon | item_id, item_name, price, quantity |
| `add_shipping_info` | items, currency, value | shipping_tier | item_id, item_name |
| `add_payment_info` | items, currency, value | payment_type | item_id, item_name |
| `purchase` | items, currency, value, transaction_id | tax, shipping, coupon | item_id, item_name, price, quantity |
| `refund` | transaction_id | items, currency, value | item_id, item_name |

---

### UC-004: Audit Schema Markup

**Actor:** SEO Practitioner, Analytics Engineer, QA Engineer

**Trigger:** User switches to the Schema tab.

**Description:** The extension scans the page for structured data in JSON-LD, Microdata, and RDFa formats, validates each schema object against type-specific rules, and displays findings with error/warning badges.

#### Functional Requirements

| ID | Requirement |
|---|---|
| UC-004-F-01 | The Schema tab MUST trigger a fresh DOM scan for schema data when selected. |
| UC-004-F-02 | The extension MUST detect JSON-LD schemas in `<script type="application/ld+json">` elements. |
| UC-004-F-03 | The extension MUST detect Microdata using `[itemscope]` / `[itemtype]` / `[itemprop]` attributes. |
| UC-004-F-04 | The extension MUST detect RDFa using `[typeof]` and `[property]` attributes. |
| UC-004-F-05 | JSON-LD `@graph` arrays MUST be expanded; each graph node MUST be treated as an independent schema item. |
| UC-004-F-06 | JSON-LD arrays at the root level MUST each be treated as independent schema items. |
| UC-004-F-07 | JSON-LD parse errors MUST be surfaced as schema items with `type: 'PARSE_ERROR'` and the raw content snippet (up to 500 characters). |
| UC-004-F-08 | Each detected schema item MUST display: format badge (JSON-LD / Microdata / RDFa), type name, source location, key properties, and a list of validation issues. |
| UC-004-F-09 | The Schema tab MUST display a summary count of total schemas found, total errors, and total warnings. |
| UC-004-F-10 | The schema badge MUST show the total issue count when issues exist; it MUST be hidden when there are zero issues. |
| UC-004-F-11 | **Product variant detection:** A Product schema that contains `inProductGroupWithID` MUST be treated as a variant. Validation MUST NOT flag `brand`, `manufacturer`, or `aggregateRating` as missing on variants. |
| UC-004-F-12 | The Copy Schema button MUST copy a plain-text formatted schema audit report to the clipboard. |

#### Supported Schema Types and Validation

| Schema Type | Key Required Fields | Key Recommended Fields |
|---|---|---|
| Product | name | description, image, offers, brand |
| ProductGroup | name | description, variesBy |
| Organization | name | url, logo, contactPoint |
| LocalBusiness | name | address, telephone, openingHours |
| Article | headline, author | datePublished, image, publisher |
| NewsArticle | headline, author | datePublished, image, publisher |
| BlogPosting | headline | author, datePublished |
| WebPage | name | url, description |
| WebSite | name | url |
| BreadcrumbList | itemListElement | — |
| FAQPage | mainEntity | — |
| HowTo | name | step |
| Recipe | name | recipeIngredient, recipeInstructions |
| Event | name, startDate | location, organizer |
| Person | name | — |
| Review | reviewBody, author | reviewRating |
| AggregateRating | ratingValue, ratingCount | — |
| VideoObject | name, contentUrl | description, thumbnailUrl, uploadDate |
| ImageObject | contentUrl | — |

---

### UC-005: View Schema Implementation Opportunities

**Actor:** SEO Practitioner, Analytics Engineer

**Trigger:** Schema tab is displayed; the Opportunities section renders below the validated schemas.

**Description:** The extension analyses the set of detected schemas and detected page context to surface actionable recommendations for additional schema types that could improve rich result eligibility or site-level SEO.

#### Functional Requirements

| ID | Requirement |
|---|---|
| UC-005-F-01 | Recommendations MUST be prioritised as HIGH, MEDIUM, or LOW. |
| UC-005-F-02 | If no `WebSite` schema is detected, a HIGH recommendation MUST be shown to add a `WebSite` schema with a sitelinks searchbox. |
| UC-005-F-03 | If no `BreadcrumbList` schema is detected, a MEDIUM recommendation MUST be shown. |
| UC-005-F-04 | If no `Organization` or `LocalBusiness` schema is detected, a HIGH recommendation MUST be shown. |
| UC-005-F-05 | If a `Product` schema is detected without an `AggregateRating` property, a HIGH recommendation MUST be shown to add product ratings. |
| UC-005-F-06 | If a `Product` schema is detected without `Review` data, a MEDIUM recommendation MUST be shown. |
| UC-005-F-07 | If a `Product` schema is detected without product identifiers (`gtin`, `mpn`, `sku`), a MEDIUM recommendation MUST be shown. |
| UC-005-F-08 | If an `Article`, `NewsArticle`, or `BlogPosting` is detected where the `author` is a string (not a Person object with `url`, `sameAs`), a MEDIUM recommendation for E-E-A-T author markup MUST be shown. |
| UC-005-F-09 | If no `FAQPage` schema is present, a LOW recommendation for FAQ markup MUST be shown. |
| UC-005-F-10 | If no `VideoObject` schema is present, a LOW recommendation MUST be shown. |
| UC-005-F-11 | Recommendations MUST include: title, description, and benefit statement. |
| UC-005-F-12 | If no recommendations apply, the Opportunities section MUST not render (or display a positive "No gaps identified" state). |

---

### UC-006: Export Audit Reports

**Actor:** Analytics Engineer, QA Engineer, SEO Practitioner

**Trigger:** User clicks Copy All, Copy Audit, or Copy Schema button.

**Description:** The extension copies a formatted plain-text audit report to the system clipboard.

#### Functional Requirements

| ID | Requirement |
|---|---|
| UC-006-F-01 | The "Copy All" button MUST copy a combined report containing: tracking IDs, all events with payloads, all audit issues, all schema items with issues. |
| UC-006-F-02 | The "Copy Audit" button MUST copy a report containing only GA4 and Facebook Pixel event validation results. |
| UC-006-F-03 | The "Copy Schema" button MUST copy a report containing only schema audit results and implementation opportunities. |
| UC-006-F-04 | All reports MUST include the page URL at the top. Due to BUG-0002 (missing `tabs` permission), the URL will show as "N/A" until that bug is resolved. |
| UC-006-F-05 | All reports MUST include the date and time of generation. |
| UC-006-F-06 | Reports MUST be plain text (not HTML or Markdown). |
| UC-006-F-07 | The copy action MUST use the browser Clipboard API (`navigator.clipboard.writeText`). |
| UC-006-F-08 | No report data MUST be sent to any external server. |

---

## Non-Functional Requirements

| ID | Category | Requirement | Target |
|---|---|---|---|
| NFR-001 | Performance | Popup initial render | < 500 ms from click to visible content |
| NFR-002 | Performance | Tracking detection (DOM scan) | Completes before the 2-second re-scan fires; IDs visible within 2 seconds |
| NFR-003 | Performance | Schema scan | Completes within 2 seconds on pages with up to 20 schema items |
| NFR-004 | Memory | Content script memory footprint | `capturedEvents[]` must not grow unboundedly; practical limit is session length |
| NFR-005 | Memory | Event data cloning | Arrays limited to 50 items, objects limited to 30 keys, depth limited to 5 levels |
| NFR-006 | Compatibility | Chrome version | Chrome 88+ (Manifest V3 minimum) |
| NFR-007 | Compatibility | Browser | Chrome only in v1.x; Firefox / Edge considered for v2.0.0 |
| NFR-008 | Privacy | Telemetry | Zero. No data transmitted outside the browser. No analytics SDK. No crash reporting. |
| NFR-009 | Security | XSS prevention | All user-controlled strings rendered into HTML MUST be passed through `escapeHtml()`. Note: BUG-0001 violates this requirement in v1.2.0. |
| NFR-010 | Security | Permissions | Extension requests only `activeTab`, `scripting`, and `host_permissions: <all_urls>`. The `tabs` permission is currently missing (BUG-0002). |
| NFR-011 | Reliability | Content script context invalidation | Event forwarding MUST degrade gracefully on service worker restart without permanently disabling itself (BUG-0003 violates this in v1.2.0). |
| NFR-012 | Reliability | Popup lifecycle | `isPopupOpen` in content script MUST accurately reflect popup state to prevent unnecessary message sends (BUG-0004 partially violates this in v1.2.0). |

---

## Out of Scope

The following are explicitly not in scope for v1.x:

- Server-side or cloud-based analysis of any kind
- Saving audit history across browser sessions
- Comparing tracking implementations across multiple pages or tabs simultaneously
- Automated tag injection or GTM container modification
- Integration with Google Analytics, GTM, or Meta Business Suite APIs
- Firefox or Edge support (planned for v2.0.0)
- Mobile browser support (Chrome for Android MV3 constraints)
- Validation of Universal Analytics (UA) tracking (GA4 only)
- Custom event schema definition by the user
- Accessibility audit (separate tool domain)
- Performance or Core Web Vitals measurement
- Network request interception via `webRequest` or `declarativeNetRequest`
