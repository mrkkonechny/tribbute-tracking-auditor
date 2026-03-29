# opsIQ: SEO & Schema Improvements Design

## Goal

Five targeted improvements across the SEO tab and Schema tab:
1. SEO tab shows full (untruncated) signal values and adds a Copy button
2. PageSpeed Insights supports an optional user-supplied API key to bypass free quota limits
3. Each schema item gets an individual Copy button
4. Schema validation rules aligned with pdpIQ's field map
5. Schema content toggle shows full field values (no ellipsis truncation)

---

## Part 1: SEO Tab — Full Text + Copy Button

### Full Text Display

Remove substring truncations from `renderSEOSignals()` in `sidepanel.js`:
- Description: currently cut at 60 chars — show full value
- H1 (single): currently cut at 50 chars — show full value
- H1 (multiple): first H1 currently cut at 30 chars — show full value

Update `.seo-signal-value` CSS: remove `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`. Replace with `white-space: normal; word-break: break-word` so long values wrap instead of clipping.

No changes to the status logic or threshold values — only the display string changes.

### Copy Button

Add `<button id="copySEO" class="toolbar-btn">Copy</button>` to the `#tab-seo` section toolbar in `sidepanel.html`, after the `seoToolbarLabel` span.

Wire in `bindToolbar()` in `sidepanel.js`: click handler calls `copySEOReport()`. Button is a no-op if `this.seoData` is null.

`copySEOReport()` builds a plain-text string matching the format of `copyReport('audit')`:

```
opsIQ SEO REPORT
Generated: [ISO date]
Page: [currentUrl]

TITLE: [value] ([N] chars) — [status text]
DESCRIPTION: [value] ([N] chars) — [status text]
CANONICAL: [value or "not set"]
ROBOTS: [value or "not set (index, follow)"]
H1: [text or "none found"] — [status text]
H2s: [N] found
OPEN GRAPH: [N] tags — [status text]
TWITTER CARDS: [N] tags — [status text]
IMAGE ALT: [withAlt]/[total] ([pct]%) — [status text]
LINKS: [internal] internal, [external] external
HREFLANG: [N] alternate(s)   ← only included if hreflang.length > 0
```

Uses `navigator.clipboard.writeText()` with fallback to `document.execCommand('copy')`, consistent with the existing `copyReport()` pattern.

---

## Part 2: PageSpeed API Key

### Storage

API key stored in `chrome.storage.local` under the key `'psApiKey'`. Read on panel init (in `loadData()` or lazily in `loadPageSpeed()`). No sync storage — key is per-device, not shared across Chrome profiles.

### UI

Inside the `#pageSpeedResults` container, before any score content, render a persistent one-line API key row:

```
[ API Key (optional) _________________________ ] [Save]
```

When a key is stored: show masked display (`••••••••` + `[Clear]` link) instead of the input.

This row is rendered by a new `renderPageSpeedKeyRow(container)` helper called at the start of `loadPageSpeed()`, before the fetch. The row is always visible in the PageSpeed sub-section regardless of fetch state.

### Fetch Integration

In `loadPageSpeed(url)`, after reading the stored key:
- If key present: append `&key=${encodeURIComponent(key)}` to the API URL
- If no key: omit the parameter (existing behaviour)

### 429 Error Message

When `res.status === 429` and no API key is stored:
> "API quota exceeded. Add a free Google API key above to increase your limit."

When `res.status === 429` and a key is stored:
> "API quota exceeded for your key. Check your Google Cloud Console quota."

### manifest.json

`chrome.storage` permission must be added to `manifest.json` if not already present.

---

## Part 3: Per-Schema Copy Buttons

### UI

A `Copy` text button added to the top-right area of each schema item card, built inside `createSchemaItem()` in `sidepanel.js` using `createElement`. Positioned via CSS flexbox alongside the existing status prefix.

The button has class `schema-copy-btn` and `aria-label="Copy schema"`.

### Copy Content

```
Schema: [type] ([format])
Source: [source]
Status: [✓ valid / ! N issue(s) / ✗ N issue(s)]
Issues:
  - [issue text]       ← one line per issue, or "none" if empty

Raw data:
[JSON.stringify(schema.data, null, 2)]
```

`JSON.stringify(schema.data, null, 2)` for the raw block. All text assembled via string concatenation of safe values — no innerHTML path with user data.

### CSS

```css
.schema-copy-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 10px;
  cursor: pointer;
  padding: 0 var(--space-xs);
  line-height: 1;
  flex-shrink: 0;
}
.schema-copy-btn:hover { color: var(--accent); }
.schema-copy-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 2px;
}
```

---

## Part 4: pdpIQ Schema Alignment

### Validation Rule Changes (`validateSchemaItem()` in `sidepanel.js`)

Update the `RULES` object to add fields matching pdpIQ's extraction map:

| Schema type | Change |
|---|---|
| **Product** | Add recommended: `sku`, `gtin`, `mpn` (identifier group) |
| **AggregateRating** | Add recommended: `bestRating` |
| **Organization** | Add recommended: `logo` |
| **Review** | No change (already aligned: `itemReviewed`, `reviewRating`, `author` required; `reviewBody`, `datePublished` recommended) |

Existing fields are unchanged. New additions are `recommended` (produce `[!]` warnings, not `[✗]` errors).

### Content Extraction Changes (`extractSchemaContent()` in `sidepanel.js`)

Update the `FIELDS` map to match pdpIQ's extracted fields:

| Schema type | New fields added to display |
|---|---|
| **Product** | `['sku','sku']`, `['gtin','gtin']`, `['mpn','mpn']` |
| **AggregateRating** | Add this type to FIELDS: `[['ratingValue','rating'],['reviewCount','reviews'],['bestRating','best']]` |
| **Organization** | `['logo','logo']` |
| **Review** | `['reviewBody','body']` (full text, no truncation) |

`AggregateRating` is not currently in the `FIELDS` map — it will be added as a new entry alongside its special-case handling (similar to how `BreadcrumbList` has special handling for the trail).

### Full Content Text (CSS)

Remove from `.schema-content-val`:
```css
overflow: hidden;
text-overflow: ellipsis;
white-space: nowrap;
```

Replace with:
```css
word-break: break-word;
```

The `title` attribute (set by `valEl.title = value`) is kept so full text remains available on hover even for shorter display contexts.

---

## Part 5: Platform-Specific Schema Normalization

pdpIQ accommodates four platform-specific patterns that opsIQ must also handle to produce consistent results across Shopify, WooCommerce, and BigCommerce pages.

### Pattern 1 — Shopify `@id` reference resolution in `@graph`

Shopify outputs AggregateRating as a deferred reference inside JSON-LD `@graph`:
```json
{ "@graph": [
  { "@type": "Product", "aggregateRating": { "@id": "#reviews" } },
  { "@id": "#reviews", "@type": "AggregateRating", "ratingValue": 4.5, "reviewCount": 120 }
]}
```

Without resolving `@id` references, opsIQ sees `aggregateRating: { "@id": "#reviews" }` and reports the product as missing aggregateRating.

**Fix in `content.js`:** When parsing a `@graph` array, build an `idIndex` map (`{ [item['@id']]: item }`) over all items before extraction. When a field value is an object containing only `@id`, replace it with the resolved item from the index.

This affects: `aggregateRating`, `brand`, `offers`, and any other fields that Shopify may defer via `@id`.

### Pattern 2 — `ratingCount` fallback for `reviewCount`

WooCommerce and BigCommerce use `ratingCount` where most platforms use `reviewCount` on AggregateRating objects. opsIQ currently only reads `reviewCount`.

**Fix in `content.js`:** When extracting AggregateRating data, use `reviewCount ?? ratingCount` — i.e. try `reviewCount` first, fall back to `ratingCount`.

**Fix in `sidepanel.js` `validateSchemaItem()`:** The `reviewCount` recommended-field check should accept `ratingCount` as equivalent. Update the check: flag as missing only if both `reviewCount` and `ratingCount` are absent.

**Fix in `sidepanel.js` `extractSchemaContent()`:** The AggregateRating FIELDS entry uses path `reviewCount` — update to try `reviewCount` first, then `ratingCount`, displaying whichever is present.

### Pattern 3 — BigCommerce typeless JSON-LD blocks

BigCommerce emits `@graph` items with no `@type` property that contain `aggregateRating` data linked to the product:
```json
{ "@graph": [
  { "@type": "Product", "name": "Widget" },
  { "aggregateRating": { "ratingValue": 4.2, "reviewCount": 88 } }
]}
```

**Fix in `content.js`:** When scanning a `@graph` array for AggregateRating, if no typed `AggregateRating` block was found, do a second pass over typeless items (no `@type`) that contain an `aggregateRating` property and merge that data into the Product's rating.

### Pattern 4 — `lowPrice` fallback for `price` on Offer

All platforms may use `lowPrice` instead of `price` when the product has a price range. opsIQ's current Offer validation flags `price` as a required field — this produces false-positive errors on Shopify and WooCommerce range-priced products.

**Fix in `content.js`:** When extracting Offer data, use `offer.price ?? offer.lowPrice`.

**Fix in `sidepanel.js` `validateSchemaItem()`:** The Offer `price` required-field check should pass when either `price` or `lowPrice` is present. Store `lowPrice` alongside `price` in the extracted data so it is available for validation.

**Fix in `sidepanel.js` `extractSchemaContent()`:** Product FIELDS `offers.price` path — if `price` resolves to null, try `offers.lowPrice` as fallback display value.

---

## File Map

| Action | File |
|---|---|
| Modify | `sidepanel.html` — add `#copySEO` button to SEO toolbar |
| Modify | `sidepanel.css` — `.seo-signal-value` full-text, `.schema-copy-btn`, `.schema-content-val` full-text |
| Modify | `sidepanel.js` — `renderSEOSignals` (remove truncations), `copySEOReport()`, `bindToolbar()` SEO wiring, `loadPageSpeed()` (API key support), `renderPageSpeedKeyRow()`, `createSchemaItem()` (copy button), `validateSchemaItem()` (new fields + platform fixes), `extractSchemaContent()` (new fields, AggregateRating, lowPrice fallback) |
| Modify | `content.js` — `@id` reference resolution in `@graph`, `ratingCount` fallback, BigCommerce typeless block handling, `lowPrice` fallback on Offer |
| Modify | `manifest.json` — add `"storage"` permission |

---

## Out of Scope

- PageSpeed desktop strategy toggle (separate ROAD item)
- Full schema validation rewrite (pdpIQ's scoring system is not adopted — only field additions)
- Settings page / dedicated API key management UI (key row lives in PageSpeed sub-section only)
