# API & Interface Documentation

> **PDS Document 04** | Last Updated: 2026-03-26

---

## 1. Overview

opsIQ exposes no REST API and makes no external network requests. All communication is internal to the browser and operates across three interface types:

| Interface Type | Direction | Mechanism | Between |
|---|---|---|---|
| CustomEvent Bridge | Page context → Content script | `window.dispatchEvent` / `window.addEventListener` | `injected.js` → `content.js` |
| Chrome Message-Passing | Content script ↔ Popup | `chrome.runtime.sendMessage` / `onMessage` | `content.js` ↔ `popup.js` |
| UI Interface | User → Popup | DOM events (click, change) | User → `popup.js` |

---

## 2. CustomEvent Bridge

`injected.js` runs in the page's JavaScript context and has access to `window.dataLayer`, `window.gtag`, and `window.fbq`. Because content scripts run in an isolated world, they cannot access these page globals directly. `injected.js` bridges the gap by dispatching named `CustomEvent`s on `window`, which `content.js` listens for.

Both event types use `window.dispatchEvent(new CustomEvent(type, { detail }))`.

---

### `__opsiq_event__`

Dispatched when a tracking call representing a named event is intercepted.

**Dispatched by:** `injected.js`

**Listened by:** `content.js`

**Triggers:**
- `dataLayer.push({ event: 'event_name', ... })` — object format push
- `dataLayer.push(['event', 'event_name', { ... }])` — array format push
- `gtag('event', 'event_name', { ... })`
- `fbq('track', 'EventName', { ... })`
- `fbq('trackCustom', 'EventName', { ... })`

**Detail Schema:**

```typescript
{
  source: 'dataLayer' | 'gtag' | 'fbq';
  name: string;       // Event name (e.g., 'purchase', 'Purchase', 'add_to_cart')
  data: object;       // Cloned, sanitised event payload (depth-limited, circular-safe)
}
```

**Example — GA4 purchase event via dataLayer:**

```javascript
// Page fires:
dataLayer.push({
  event: 'purchase',
  transaction_id: 'T-1234',
  value: 99.99,
  currency: 'USD',
  items: [{ item_id: 'SKU-001', item_name: 'Widget', price: 99.99, quantity: 1 }]
});

// __opsiq_event__ dispatched with detail:
{
  source: 'dataLayer',
  name: 'purchase',
  data: {
    event: 'purchase',
    transaction_id: 'T-1234',
    value: 99.99,
    currency: 'USD',
    items: [{ item_id: 'SKU-001', item_name: 'Widget', price: 99.99, quantity: 1 }]
  }
}
```

**Example — Facebook Pixel Purchase event:**

```javascript
// Page fires:
fbq('track', 'Purchase', { value: 99.99, currency: 'USD', content_ids: ['SKU-001'] });

// __opsiq_event__ dispatched with detail:
{
  source: 'fbq',
  name: 'Purchase',
  data: { value: 99.99, currency: 'USD', content_ids: ['SKU-001'] }
}
```

**Data Sanitisation Rules (applied by `cloneEventData()`):**

| Scenario | Behaviour |
|---|---|
| Depth > 5 levels | Value replaced with `'[Max depth]'` |
| Circular reference | Value replaced with `'[Circular]'` |
| Function value | Value replaced with `'[Function]'` |
| Date object | Converted to ISO 8601 string via `.toISOString()` |
| Array | Cloned up to 50 elements |
| Object | Cloned up to 30 keys; keys starting with `_` and `gtm.uniqueEventId` are excluded |

---

### `__opsiq_tracking__`

Dispatched when a tracking ID is detected via runtime interception.

**Dispatched by:** `injected.js`

**Listened by:** `content.js`

**Triggers:**
- `dataLayer.push(['config', 'G-...'])` — GA4 config
- `dataLayer.push(['config', 'AW-...'])` — Google Ads config
- `dataLayer.push(['config', 'GTM-...'])` — GTM config
- `gtag('config', 'G-...')` — GA4 config
- `gtag('config', 'AW-...')` — Google Ads config
- `fbq('init', 'PIXEL_ID')` — Facebook Pixel initialisation
- `window.google_tag_manager` keys matching `/^GTM-/i` — GTM runtime object

**Detail Schema:**

```typescript
{
  type: 'gtm' | 'ga4' | 'gads' | 'fb';
  ids: string[];   // One or more IDs detected in this call
}
```

**Example — GTM detected via google_tag_manager object:**

```javascript
// detail:
{
  type: 'gtm',
  ids: ['GTM-ABCD1234']
}
```

**Example — Facebook Pixel init:**

```javascript
// Page fires:
fbq('init', '1234567890123');

// __opsiq_tracking__ dispatched with detail:
{
  type: 'fb',
  ids: ['1234567890123']
}
```

**Handler behaviour in content.js:** IDs are merged into `trackingData[type]` using Set deduplication:

```javascript
trackingData[data.type] = [...new Set([...trackingData[data.type], ...data.ids])];
```

---

## 3. Chrome Message-Passing API

`content.js` registers a `chrome.runtime.onMessage` listener. `popup.js` sends messages using `chrome.tabs.sendMessage` (directed at the active tab's content script) or `chrome.runtime.sendMessage` (routed via the service worker). `background.js` also has an `onMessage` listener but currently performs no routing — it returns `false` for all messages.

All message objects have a `type` string field as a discriminator.

---

### `GET_TRACKING_DATA`

**Direction:** Popup → Content script

**Purpose:** Fetch current tracking state and all captured events. Sent when the popup opens.

**Request:**

```typescript
{ type: 'GET_TRACKING_DATA' }
```

**Side effects on content script:**
- Sets `isPopupOpen = true`
- Triggers a fresh `scanForTrackingScripts()` call
- Returns current in-memory state

**Response:**

```typescript
{
  tracking: TrackingData;
  events: EventData[];
}
```

**`TrackingData` shape:**

```typescript
{
  gtm: string[];    // e.g., ['GTM-ABCD1234']
  ga4: string[];    // e.g., ['G-ABCDEF1234']
  gads: string[];   // e.g., ['AW-123456789']
  fb: string[];     // e.g., ['1234567890123']
}
```

**`EventData` shape:**

```typescript
{
  source: 'dataLayer' | 'gtag' | 'fbq';
  name: string;
  data: object;          // Sanitised payload
  timestamp: string;     // ISO 8601 timestamp added by content.js on receipt
}
```

---

### `GET_SCHEMA_DATA`

**Direction:** Popup → Content script

**Purpose:** Fetch current schema items. Sent when the Schema tab is opened or refreshed.

**Request:**

```typescript
{ type: 'GET_SCHEMA_DATA' }
```

**Side effects on content script:**
- Triggers a fresh `scanForSchemaData()` call

**Response:**

```typescript
{
  schema: SchemaItem[];
}
```

**`SchemaItem` shape:**

```typescript
{
  format: 'JSON-LD' | 'Microdata' | 'RDFa';
  type: string;       // Schema @type value (e.g., 'Product', 'Article'); 'PARSE_ERROR' for invalid JSON-LD
  data: object;       // Raw parsed schema data or Microdata/RDFa property map
  source: string;     // DOM source reference (e.g., 'script[0]', 'script[1]/@graph[2]', 'element[0]', 'rdfa[0]')
}
```

**Example `SchemaItem` — JSON-LD Product:**

```javascript
{
  format: 'JSON-LD',
  type: 'Product',
  data: {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Example Widget',
    description: 'A sample product',
    offers: { '@type': 'Offer', price: '99.99', priceCurrency: 'USD' }
  },
  source: 'script[0]'
}
```

**Example `SchemaItem` — JSON-LD PARSE_ERROR:**

```javascript
{
  format: 'JSON-LD',
  type: 'PARSE_ERROR',
  data: {
    error: 'Unexpected token } in JSON at position 42',
    raw: '{ "@type": "Product", "name": "Widget", "offers": {}'
  },
  source: 'script[2]'
}
```

---

### `NEW_EVENT`

**Direction:** Content script → Popup (direct, routed via service worker)

**Purpose:** Push a newly captured event to the popup for real-time display.

**Sent when:** `isPopupOpen === true` and a new `__opsiq_event__` CustomEvent is received.

**Message:**

```typescript
{
  type: 'NEW_EVENT';
  event: EventData;
}
```

**Current behaviour note:** `background.js` receives this message and returns `false` (no-op). The popup is expected to have its own `chrome.runtime.onMessage` listener that handles `NEW_EVENT` directly. If the popup is closed, the send will fail; the `catch` handler sets `isPopupOpen = false` in the content script.

---

### `CLEAR_EVENTS`

**Direction:** Popup → Content script

**Purpose:** Clear the in-memory event buffer in the content script.

**Request:**

```typescript
{ type: 'CLEAR_EVENTS' }
```

**Response:**

```typescript
{ success: true }
```

**Side effects on content script:**
- `capturedEvents.length = 0` (in-place truncation, preserves array reference)

---

### `POPUP_CLOSED`

**Direction:** Popup → Content script

**Purpose:** Inform the content script that the popup has closed, so it stops forwarding events.

**Request:**

```typescript
{ type: 'POPUP_CLOSED' }
```

**Response:** None (fire-and-forget).

**Side effects on content script:**
- Sets `isPopupOpen = false`

**Known issue — BUG-0004:** This message is sent from a `window.addEventListener('unload', ...)` handler in the popup. The `unload` event is unreliable in MV3 popup contexts and frequently does not fire when the popup closes (e.g., on click-away or Escape key press). As a result, `isPopupOpen` may remain `true` in the content script, causing it to attempt message sends to a non-existent popup. The content script's `catch` handler resets `isPopupOpen = false` on send failure, which partially mitigates the impact.

---

## 4. Data Models

### `EventData`

The canonical event record stored in `capturedEvents[]` and transmitted in message payloads.

```typescript
interface EventData {
  source: 'dataLayer' | 'gtag' | 'fbq';
  name: string;
  data: Record<string, unknown>;  // Depth-limited, circular-safe clone of original payload
  timestamp: string;              // ISO 8601 string; added by content.js on receipt of CustomEvent
}
```

### `TrackingData`

The tracking ID registry maintained by the content script.

```typescript
interface TrackingData {
  gtm: string[];    // GTM container IDs; format: GTM-[A-Za-z0-9]+
  ga4: string[];    // GA4 measurement IDs; format: G-[A-Za-z0-9]+
  gads: string[];   // Google Ads conversion IDs; format: AW-[A-Za-z0-9]+
  fb: string[];     // Facebook Pixel IDs; format: numeric string, 10–20 digits
}
```

All arrays are initialised to `[]` and deduplicated on write.

### `SchemaItem`

A single detected schema object from the DOM.

```typescript
interface SchemaItem {
  format: 'JSON-LD' | 'Microdata' | 'RDFa';
  type: string;     // Value of @type (JSON-LD), itemtype path segment (Microdata), or typeof (RDFa)
                    // Set to 'PARSE_ERROR' for malformed JSON-LD
  data: Record<string, unknown>;  // Parsed schema data or property map
  source: string;   // Human-readable DOM location:
                    //   JSON-LD:    'script[N]', 'script[N]/@graph[M]', 'script[N][M]', 'script[N]/key'
                    //   Microdata:  'element[N]'
                    //   RDFa:       'rdfa[N]'
}
```

### `ValidationIssue`

An issue produced by the event or schema validator in `popup.js`.

```typescript
interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;  // Human-readable description (e.g., 'Missing required "transaction_id"')
  field?: string;   // Dotted field path (e.g., 'items[0].item_id', 'currency', 'items')
}
```

### `SchemaValidationResult`

The output of schema validation for a single `SchemaItem`, as used internally by `popup.js`.

```typescript
interface SchemaValidationResult {
  item: SchemaItem;
  issues: ValidationIssue[];
}
```

### `Recommendation`

An implementation opportunity surfaced by the schema opportunity engine.

```typescript
interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  benefit: string;
}
```
