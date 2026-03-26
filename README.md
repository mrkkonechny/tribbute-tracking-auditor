# opsIQ

A Chrome extension that audits tracking implementations, schema markup, and monitors real-time events.

## Features

### Tracking Detection
Automatically detects and displays IDs for:
- **Google Tag Manager (GTM)** - GTM-XXXXXX
- **Google Analytics 4 (GA4)** - G-XXXXXXXXXX
- **Google Ads** - AW-XXXXXXXXX
- **Facebook Pixel** - Pixel IDs

### Real-Time Event Monitoring
Intercepts and displays live events as they fire:
- `dataLayer.push()` events for GTM/GA4
- `gtag()` calls for GA4
- `fbq()` calls for Facebook Pixel

### Event Audit
Validates tracking events for data quality:
- **GA4 Ecommerce**: Required fields (items, currency, value, transaction_id), item-level validation
- **Facebook Pixel**: Required fields per event type (value, currency for Purchase)
- Value/currency consistency checks

### Schema Audit
Detects and validates structured data markup:
- **JSON-LD** - `<script type="application/ld+json">`
- **Microdata** - itemscope, itemtype, itemprop attributes
- **RDFa** - typeof, property attributes

Validates common schema types including Product, ProductGroup, Organization, Article, LocalBusiness, FAQPage, and more.

**Smart Validation:**
- Recognizes Product variants and skips validation for fields inherited from ProductGroup
- Handles `@graph` arrays and nested schemas

### Implementation Opportunities
Provides prioritized recommendations for improving schema markup:
- Missing schemas (WebSite, BreadcrumbList, Organization)
- Product enhancements (AggregateRating, Reviews, GTIN/MPN)
- Rich result opportunities (FAQPage, HowTo, VideoObject)

## Installation

### From Source (Developer Mode)

1. **Download the extension**
   ```bash
   git clone https://github.com/mrkkonechny/tribbute-tracking-auditor.git
   ```
   Or download and extract the ZIP file from the [latest release](https://github.com/mrkkonechny/tribbute-tracking-auditor/releases).

2. **Open Chrome Extensions**
   - Navigate to `chrome://extensions/` in your browser
   - Or go to Menu → More Tools → Extensions

3. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top-right corner

4. **Load the extension**
   - Click "Load unpacked"
   - Select the `opsIQ` folder

5. **Pin the extension** (optional)
   - Click the puzzle piece icon in Chrome's toolbar
   - Click the pin icon next to "opsIQ"

## Usage

1. **Navigate to any website** you want to audit

2. **Click the opsIQ icon** in your browser toolbar

3. **View detected tracking** at the top of the popup
   - Click the copy icon to copy any tracking ID

4. **Use the tabs** to explore:
   - **Events** - Live event feed with filtering
   - **Audit** - Event validation issues
   - **Schema** - Structured data audit and recommendations

5. **Export reports** using the copy buttons:
   - "Copy All" - Full tracking and events report
   - "Copy Audit" - Event validation report
   - "Copy Schema" - Schema audit with recommendations

## Development

### Project Structure
```
tribbute-tracking-auditor/
├── manifest.json    # Chrome extension manifest (Manifest V3)
├── popup.html       # Extension popup UI
├── popup.css        # Popup styles
├── popup.js         # Popup logic and validation
├── content.js       # Content script for DOM scanning
├── injected.js      # Page context script for intercepting calls
├── background.js    # Service worker for message passing
└── icons/           # Extension icons (16, 48, 128px)
```

### Local Development
1. Make changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the opsIQ card
4. Test your changes

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
