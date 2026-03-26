// opsIQ - Popup Script

(function() {
  'use strict';

  let allEvents = [];
  let auditIssues = [];
  let schemaItems = [];
  let schemaIssues = [];
  let currentFilter = 'all';

  // DOM elements
  const trackingList = document.getElementById('tracking-list');
  const eventsList = document.getElementById('events-list');
  const auditList = document.getElementById('audit-list');
  const schemaList = document.getElementById('schema-list');
  const filterSelect = document.getElementById('filter-select');
  const copyAllBtn = document.getElementById('copy-all-btn');
  const clearBtn = document.getElementById('clear-btn');
  const copyAuditBtn = document.getElementById('copy-audit-btn');
  const refreshAuditBtn = document.getElementById('refresh-audit-btn');
  const copySchemaBtn = document.getElementById('copy-schema-btn');
  const refreshSchemaBtn = document.getElementById('refresh-schema-btn');
  const auditBadge = document.getElementById('audit-badge');
  const schemaBadge = document.getElementById('schema-badge');
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');

  // ============================================
  // TAB SWITCHING
  // ============================================
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;

      // Update active tab
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Update active content
      tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === `${targetTab}-tab`) {
          content.classList.add('active');
        }
      });

      // Run audit when switching to audit tab
      if (targetTab === 'audit') {
        runAudit();
      }

      // Load schema when switching to schema tab
      if (targetTab === 'schema') {
        loadSchemaData();
      }
    });
  });

  // ============================================
  // EVENT VALIDATION RULES
  // ============================================

  // GA4 ecommerce events and their required/recommended fields
  const ga4EcommerceRules = {
    'view_item': {
      required: ['items'],
      recommended: ['currency', 'value'],
      itemFields: ['item_id', 'item_name']
    },
    'view_item_list': {
      required: ['items'],
      recommended: ['item_list_id', 'item_list_name'],
      itemFields: ['item_id', 'item_name']
    },
    'select_item': {
      required: ['items'],
      recommended: ['item_list_id', 'item_list_name'],
      itemFields: ['item_id', 'item_name']
    },
    'add_to_cart': {
      required: ['items', 'currency', 'value'],
      recommended: [],
      itemFields: ['item_id', 'item_name', 'price', 'quantity']
    },
    'remove_from_cart': {
      required: ['items', 'currency', 'value'],
      recommended: [],
      itemFields: ['item_id', 'item_name']
    },
    'view_cart': {
      required: ['items', 'currency', 'value'],
      recommended: [],
      itemFields: ['item_id', 'item_name', 'price', 'quantity']
    },
    'begin_checkout': {
      required: ['items', 'currency', 'value'],
      recommended: ['coupon'],
      itemFields: ['item_id', 'item_name', 'price', 'quantity']
    },
    'add_shipping_info': {
      required: ['items', 'currency', 'value'],
      recommended: ['shipping_tier'],
      itemFields: ['item_id', 'item_name']
    },
    'add_payment_info': {
      required: ['items', 'currency', 'value'],
      recommended: ['payment_type'],
      itemFields: ['item_id', 'item_name']
    },
    'purchase': {
      required: ['items', 'currency', 'value', 'transaction_id'],
      recommended: ['tax', 'shipping', 'coupon'],
      itemFields: ['item_id', 'item_name', 'price', 'quantity']
    },
    'refund': {
      required: ['transaction_id'],
      recommended: ['items', 'currency', 'value'],
      itemFields: ['item_id', 'item_name']
    }
  };

  // Facebook Pixel events and their required/recommended fields
  const fbPixelRules = {
    'PageView': {
      required: [],
      recommended: []
    },
    'ViewContent': {
      required: [],
      recommended: ['content_ids', 'content_type', 'value', 'currency']
    },
    'Search': {
      required: [],
      recommended: ['search_string', 'content_ids', 'content_type']
    },
    'AddToCart': {
      required: [],
      recommended: ['content_ids', 'content_type', 'value', 'currency']
    },
    'AddToWishlist': {
      required: [],
      recommended: ['content_ids', 'content_type', 'value', 'currency']
    },
    'InitiateCheckout': {
      required: [],
      recommended: ['content_ids', 'content_type', 'value', 'currency', 'num_items']
    },
    'AddPaymentInfo': {
      required: [],
      recommended: ['content_ids', 'content_type', 'value', 'currency']
    },
    'Purchase': {
      required: ['value', 'currency'],
      recommended: ['content_ids', 'content_type', 'num_items']
    },
    'Lead': {
      required: [],
      recommended: ['value', 'currency']
    },
    'CompleteRegistration': {
      required: [],
      recommended: ['value', 'currency', 'status']
    }
  };

  // ============================================
  // AUDIT FUNCTIONS
  // ============================================

  function validateEvent(event) {
    const issues = [];
    const source = event.source;
    const name = event.name;
    const data = event.data || {};

    // Check for GA4/dataLayer events
    if (source === 'dataLayer' || source === 'gtag' || source === 'ga4') {
      const rules = ga4EcommerceRules[name];

      if (rules) {
        // Check required fields
        for (const field of rules.required) {
          if (field === 'items') {
            const items = data.items || data.ecommerce?.items;
            if (!items || !Array.isArray(items) || items.length === 0) {
              issues.push({
                severity: 'error',
                message: `Missing required "items" array`,
                field: 'items'
              });
            } else {
              // Validate item fields
              items.forEach((item, index) => {
                for (const itemField of rules.itemFields) {
                  if (item[itemField] === undefined || item[itemField] === null || item[itemField] === '') {
                    issues.push({
                      severity: 'warning',
                      message: `Item ${index + 1} missing "${itemField}"`,
                      field: `items[${index}].${itemField}`
                    });
                  }
                }
              });
            }
          } else {
            const value = data[field] ?? data.ecommerce?.[field];
            if (value === undefined || value === null || value === '') {
              issues.push({
                severity: 'error',
                message: `Missing required "${field}"`,
                field: field
              });
            }
          }
        }

        // Check recommended fields
        for (const field of rules.recommended) {
          const value = data[field] ?? data.ecommerce?.[field];
          if (value === undefined || value === null || value === '') {
            issues.push({
              severity: 'warning',
              message: `Missing recommended "${field}"`,
              field: field
            });
          }
        }

        // Check for value/currency consistency
        const value = data.value ?? data.ecommerce?.value;
        const currency = data.currency ?? data.ecommerce?.currency;
        if (value !== undefined && currency === undefined) {
          issues.push({
            severity: 'error',
            message: `"value" provided without "currency"`,
            field: 'currency'
          });
        }

        // Check value is a number
        if (value !== undefined && typeof value !== 'number') {
          issues.push({
            severity: 'warning',
            message: `"value" should be a number, got ${typeof value}`,
            field: 'value'
          });
        }
      }

      // General GA4 checks
      if (data.items && Array.isArray(data.items)) {
        data.items.forEach((item, index) => {
          if (!item.item_id && !item.item_name) {
            issues.push({
              severity: 'error',
              message: `Item ${index + 1} missing both "item_id" and "item_name" (at least one required)`,
              field: `items[${index}]`
            });
          }
        });
      }
    }

    // Check for Facebook Pixel events
    if (source === 'fbq' || source === 'fb') {
      const rules = fbPixelRules[name];

      if (rules) {
        // Check required fields
        for (const field of rules.required) {
          if (data[field] === undefined || data[field] === null || data[field] === '') {
            issues.push({
              severity: 'error',
              message: `Missing required "${field}"`,
              field: field
            });
          }
        }

        // Check recommended fields
        for (const field of rules.recommended) {
          if (data[field] === undefined || data[field] === null || data[field] === '') {
            issues.push({
              severity: 'warning',
              message: `Missing recommended "${field}"`,
              field: field
            });
          }
        }

        // Check for value/currency consistency
        if (data.value !== undefined && data.currency === undefined) {
          issues.push({
            severity: 'error',
            message: `"value" provided without "currency"`,
            field: 'currency'
          });
        }
      }
    }

    // Check for empty event data
    if (Object.keys(data).length === 0) {
      issues.push({
        severity: 'info',
        message: 'Event has no parameters',
        field: null
      });
    }

    return issues;
  }

  function runAudit() {
    auditIssues = [];

    for (const event of allEvents) {
      const issues = validateEvent(event);
      if (issues.length > 0) {
        auditIssues.push({
          event: event,
          issues: issues
        });
      }
    }

    renderAudit();
    updateAuditBadge();
  }

  function updateAuditBadge() {
    const errorCount = auditIssues.reduce((count, item) => {
      return count + item.issues.filter(i => i.severity === 'error').length;
    }, 0);

    const warningCount = auditIssues.reduce((count, item) => {
      return count + item.issues.filter(i => i.severity === 'warning').length;
    }, 0);

    const totalIssues = errorCount + warningCount;

    if (totalIssues > 0) {
      auditBadge.textContent = totalIssues;
      auditBadge.classList.remove('hidden');
      auditBadge.classList.toggle('warning', errorCount === 0);
    } else {
      auditBadge.classList.add('hidden');
    }
  }

  function createAuditItem(auditEntry) {
    const { event, issues } = auditEntry;
    const div = document.createElement('div');

    const hasErrors = issues.some(i => i.severity === 'error');
    const hasWarnings = issues.some(i => i.severity === 'warning');
    const severity = hasErrors ? 'error' : (hasWarnings ? 'warning' : 'info');

    div.className = `audit-item ${severity === 'warning' ? 'warning' : ''} ${severity === 'info' ? 'info' : ''}`;

    const sourceLabel = getSourceLabel(event.source);
    const issuesList = issues.map(issue => {
      return `<div class="audit-detail-item">
        <span class="audit-severity ${issue.severity}">${issue.severity.toUpperCase()}</span>
        ${escapeHtml(issue.message)}
      </div>`;
    }).join('');

    div.innerHTML = `
      <div class="audit-header">
        <span class="event-source ${event.source}">${sourceLabel}</span>
        <span class="audit-event-name">${escapeHtml(event.name)}</span>
        <span class="event-time">${formatTime(event.timestamp)}</span>
      </div>
      <div class="audit-details">
        ${issuesList}
      </div>
    `;

    return div;
  }

  function renderAudit() {
    auditList.innerHTML = '';

    if (allEvents.length === 0) {
      auditList.innerHTML = '<div class="no-issues">No events to audit. Interact with the page to trigger events.</div>';
      return;
    }

    if (auditIssues.length === 0) {
      auditList.innerHTML = '<div class="no-issues">No issues detected. All events look good!</div>';
      return;
    }

    // Add summary
    const errorCount = auditIssues.reduce((c, i) => c + i.issues.filter(x => x.severity === 'error').length, 0);
    const warningCount = auditIssues.reduce((c, i) => c + i.issues.filter(x => x.severity === 'warning').length, 0);
    const passedCount = allEvents.length - auditIssues.length;

    const summary = document.createElement('div');
    summary.className = 'audit-summary';
    summary.innerHTML = `
      <div class="audit-stat"><span class="audit-stat-count errors">${errorCount}</span> errors</div>
      <div class="audit-stat"><span class="audit-stat-count warnings">${warningCount}</span> warnings</div>
      <div class="audit-stat"><span class="audit-stat-count passed">${passedCount}</span> passed</div>
    `;
    auditList.appendChild(summary);

    // Add audit items
    for (const auditEntry of auditIssues) {
      auditList.appendChild(createAuditItem(auditEntry));
    }
  }

  function generateAuditReport(pageUrl) {
    let report = '════════════════════════════════════════════════════════════\n';
    report += '               opsIQ TRACKING AUDIT REPORT\n';
    report += '════════════════════════════════════════════════════════════\n\n';

    report += `URL:  ${pageUrl || 'N/A'}\n`;
    report += `Date: ${new Date().toLocaleString()}\n\n`;

    // Summary
    const errorCount = auditIssues.reduce((c, i) => c + i.issues.filter(x => x.severity === 'error').length, 0);
    const warningCount = auditIssues.reduce((c, i) => c + i.issues.filter(x => x.severity === 'warning').length, 0);
    const passedCount = allEvents.length - auditIssues.length;

    report += '────────────────────────────────────────────────────────────\n';
    report += '  SUMMARY\n';
    report += '────────────────────────────────────────────────────────────\n\n';
    report += `  Total Events Analyzed: ${allEvents.length}\n`;
    report += `  Events with Issues:    ${auditIssues.length}\n`;
    report += `  Events Passed:         ${passedCount}\n\n`;
    report += `  Errors:   ${errorCount}\n`;
    report += `  Warnings: ${warningCount}\n\n`;

    if (auditIssues.length === 0) {
      report += '  All events passed validation!\n\n';
    } else {
      report += '────────────────────────────────────────────────────────────\n';
      report += '  ISSUES FOUND\n';
      report += '────────────────────────────────────────────────────────────\n\n';

      for (const { event, issues } of auditIssues) {
        const sourceLabel = getSourceLabel(event.source);
        report += `  ┌─ [${sourceLabel}] ${event.name} (${formatTime(event.timestamp)})\n`;
        report += '  │\n';

        for (const issue of issues) {
          const icon = issue.severity === 'error' ? 'ERROR' : (issue.severity === 'warning' ? 'WARN' : 'INFO');
          report += `  │  [${icon}] ${issue.message}\n`;
        }

        report += '  │\n';
        report += '  └────────────────────────────────────────────────────────\n\n';
      }
    }

    report += '════════════════════════════════════════════════════════════\n';

    return report;
  }

  // ============================================
  // SCHEMA VALIDATION RULES
  // ============================================

  // Required and recommended fields for common schema types
  const schemaRules = {
    'Product': {
      required: ['name'],
      recommended: ['image', 'description', 'brand', 'offers'],
      offerFields: ['price', 'priceCurrency', 'availability']
    },
    'ProductGroup': {
      required: ['name'],
      recommended: ['image', 'description', 'brand', 'hasVariant'],
      offerFields: []
    },
    'Organization': {
      required: ['name'],
      recommended: ['url', 'logo', 'contactPoint', 'address', 'sameAs']
    },
    'LocalBusiness': {
      required: ['name', 'address'],
      recommended: ['telephone', 'openingHours', 'geo', 'image', 'priceRange']
    },
    'Article': {
      required: ['headline', 'author', 'datePublished'],
      recommended: ['image', 'publisher', 'dateModified', 'description']
    },
    'NewsArticle': {
      required: ['headline', 'author', 'datePublished'],
      recommended: ['image', 'publisher', 'dateModified', 'description']
    },
    'BlogPosting': {
      required: ['headline', 'author', 'datePublished'],
      recommended: ['image', 'publisher', 'dateModified', 'description']
    },
    'WebPage': {
      required: ['name'],
      recommended: ['description', 'url', 'breadcrumb']
    },
    'WebSite': {
      required: ['name', 'url'],
      recommended: ['potentialAction', 'publisher']
    },
    'BreadcrumbList': {
      required: ['itemListElement'],
      recommended: []
    },
    'FAQPage': {
      required: ['mainEntity'],
      recommended: []
    },
    'HowTo': {
      required: ['name', 'step'],
      recommended: ['image', 'totalTime', 'estimatedCost', 'supply', 'tool']
    },
    'Recipe': {
      required: ['name', 'recipeIngredient', 'recipeInstructions'],
      recommended: ['image', 'author', 'prepTime', 'cookTime', 'nutrition', 'recipeYield']
    },
    'Event': {
      required: ['name', 'startDate', 'location'],
      recommended: ['endDate', 'description', 'image', 'offers', 'performer', 'organizer']
    },
    'Person': {
      required: ['name'],
      recommended: ['image', 'jobTitle', 'worksFor', 'url', 'sameAs']
    },
    'Review': {
      required: ['itemReviewed', 'reviewRating', 'author'],
      recommended: ['reviewBody', 'datePublished']
    },
    'AggregateRating': {
      required: ['ratingValue', 'reviewCount'],
      recommended: ['bestRating', 'worstRating']
    },
    'VideoObject': {
      required: ['name', 'description', 'thumbnailUrl', 'uploadDate'],
      recommended: ['duration', 'contentUrl', 'embedUrl', 'interactionStatistic']
    },
    'ImageObject': {
      required: ['contentUrl'],
      recommended: ['name', 'description', 'width', 'height']
    }
  };

  // ============================================
  // SCHEMA FUNCTIONS
  // ============================================

  async function loadSchemaData() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab?.id) {
        schemaList.innerHTML = '<div class="no-schema">Unable to access this page</div>';
        return;
      }

      const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_SCHEMA_DATA' });

      if (response && response.schema) {
        schemaItems = response.schema;
        validateSchema();
        renderSchema();
      } else {
        schemaList.innerHTML = '<div class="no-schema">No schema data found on this page</div>';
      }
    } catch (err) {
      console.error('Error loading schema:', err);
      schemaList.innerHTML = '<div class="no-schema">Unable to scan this page. Try refreshing.</div>';
    }
  }

  // Helper to check if a value exists and is not empty
  function hasValue(value) {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;
    // Check for empty objects (but allow objects with at least one meaningful key)
    if (typeof value === 'object' && !Array.isArray(value)) {
      const keys = Object.keys(value);
      // If only has @type or @id, check if there's actual content
      if (keys.length === 0) return false;
      if (keys.length === 1 && (keys[0] === '@type' || keys[0] === '@id')) {
        // Just a type or reference, check if it has meaningful value
        return hasValue(value[keys[0]]);
      }
    }
    return true;
  }

  // Extract meaningful value from schema field (handles nested objects, references, etc.)
  function extractValue(value) {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'string') return value.trim() || undefined;
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (Array.isArray(value)) {
      if (value.length === 0) return undefined;
      // Return first meaningful value from array
      for (const item of value) {
        const extracted = extractValue(item);
        if (extracted !== undefined) return value; // Return full array if any item is valid
      }
      return undefined;
    }
    if (typeof value === 'object') {
      // Check for common patterns: {name: "..."}, {@id: "..."}, {value: "..."}, etc.
      if (value.name) return extractValue(value.name);
      if (value['@value']) return extractValue(value['@value']);
      if (value.value) return extractValue(value.value);
      if (value['@id']) return value['@id'];
      if (value.url) return value.url;
      if (value.text) return extractValue(value.text);
      // If object has meaningful keys beyond @type and @id, consider it valid
      const meaningfulKeys = Object.keys(value).filter(k => k !== '@type' && k !== '@id' && k !== '@context');
      if (meaningfulKeys.length > 0) return value;
    }
    return undefined;
  }

  // Helper to get a nested value - handles objects with @type, name, etc.
  function getSchemaValue(data, field) {
    // Direct field lookup
    const value = data[field];

    // For 'brand', handle multiple formats
    if (field === 'brand') {
      if (typeof value === 'string' && value.trim()) return value;
      if (value && typeof value === 'object') {
        // Brand object: {name: "...", @type: "Brand"}
        if (value.name && typeof value.name === 'string' && value.name.trim()) return value.name;
        // Brand reference: {@id: "..."}
        if (value['@id']) return value['@id'];
        // Check if brand object has any meaningful content
        const extracted = extractValue(value);
        if (extracted !== undefined) return extracted;
      }
      // Fallback: check manufacturer field
      if (data.manufacturer) {
        const mfgValue = extractValue(data.manufacturer);
        if (mfgValue !== undefined) return mfgValue;
      }
      return undefined;
    }

    // For 'description', handle multiple formats
    if (field === 'description') {
      if (typeof value === 'string' && value.trim()) return value;
      if (value && typeof value === 'object') {
        // Description might be {value: "...", @type: "..."} or {text: "..."}
        const extracted = extractValue(value);
        if (extracted !== undefined) return extracted;
      }
      if (Array.isArray(value) && value.length > 0) {
        // Array of descriptions - return first valid one
        for (const desc of value) {
          const extracted = extractValue(desc);
          if (extracted !== undefined) return value;
        }
      }
      return undefined;
    }

    // For 'sku', also check inside offers
    if (field === 'sku') {
      if (hasValue(value)) return value;
      if (data.offers) {
        const offers = Array.isArray(data.offers) ? data.offers : [data.offers];
        for (const offer of offers) {
          if (hasValue(offer.sku)) return offer.sku;
        }
      }
      return undefined;
    }

    // For 'image', check various formats
    if (field === 'image') {
      if (typeof value === 'string' && value.trim()) return value;
      if (Array.isArray(value) && value.length > 0) return value;
      if (value && typeof value === 'object') {
        if (value.url) return value.url;
        if (value.contentUrl) return value.contentUrl;
        if (value['@id']) return value['@id'];
      }
      return undefined;
    }

    // For other fields, use general extraction
    return extractValue(value);
  }

  // Check if a Product is a variant (part of a ProductGroup)
  function isProductVariant(data) {
    // Product variants typically have inProductGroupWithID or are nested in hasVariant
    return data.inProductGroupWithID || data.isVariantOf || data['@id']?.includes('variant');
  }

  // Fields that Product variants inherit from their parent ProductGroup
  const variantInheritedFields = ['brand', 'manufacturer', 'logo', 'aggregateRating'];

  function validateSchemaItem(item, allItems = []) {
    const issues = [];
    const type = item.type;
    const data = item.data || {};

    // Check for parse errors
    if (type === 'PARSE_ERROR') {
      issues.push({
        severity: 'error',
        message: `Invalid JSON: ${data.error || 'Parse error'}`
      });
      return issues;
    }

    // Check for @context (JSON-LD) - but not for items inside @graph (they inherit context)
    if (item.format === 'JSON-LD' && !data['@context'] && !item.source.includes('@graph')) {
      issues.push({
        severity: 'warning',
        message: 'Missing @context (should be "https://schema.org")'
      });
    }

    // Check if @context is correct
    if (data['@context'] && !String(data['@context']).includes('schema.org')) {
      issues.push({
        severity: 'warning',
        message: `Non-standard @context: ${data['@context']}`
      });
    }

    // Detect if this is a Product variant
    const isVariant = type === 'Product' && isProductVariant(data);

    // Check if there's a parent ProductGroup that has the inherited fields
    let hasParentProductGroup = false;
    if (isVariant) {
      hasParentProductGroup = allItems.some(i =>
        i.type === 'ProductGroup' &&
        (i.data.productGroupID === data.inProductGroupWithID ||
         i.data['@id'] === data.isVariantOf?.['@id'])
      );
    }

    // Get validation rules for this type
    const rules = schemaRules[type];

    if (rules) {
      // Check required fields
      for (const field of rules.required) {
        const value = getSchemaValue(data, field);
        if (!hasValue(value)) {
          issues.push({
            severity: 'error',
            message: `Missing required field: ${field}`
          });
        }
      }

      // Check recommended fields
      for (const field of rules.recommended) {
        // Skip inherited fields for Product variants that have a parent ProductGroup
        if (isVariant && hasParentProductGroup && variantInheritedFields.includes(field)) {
          continue; // Field is inherited from ProductGroup
        }

        const value = getSchemaValue(data, field);
        if (!hasValue(value)) {
          // For variants without confirmed parent, show as info instead of warning
          if (isVariant && variantInheritedFields.includes(field)) {
            issues.push({
              severity: 'info',
              message: `${field} may be inherited from ProductGroup`
            });
          } else {
            issues.push({
              severity: 'warning',
              message: `Missing recommended field: ${field}`
            });
          }
        }
      }

      // Special validation for Product offers
      if (type === 'Product' && data.offers) {
        const offers = Array.isArray(data.offers) ? data.offers : [data.offers];
        // Only check first few offers to avoid spam
        const offersToCheck = offers.slice(0, 3);
        offersToCheck.forEach((offer, i) => {
          if (rules.offerFields) {
            for (const field of rules.offerFields) {
              if (!hasValue(offer[field])) {
                issues.push({
                  severity: 'warning',
                  message: `Offer ${i + 1} missing: ${field}`
                });
              }
            }
          }
        });
        if (offers.length > 3) {
          // Just note there are more offers
          issues.push({
            severity: 'info',
            message: `${offers.length - 3} more offers not shown`
          });
        }
      }

      // Check for AggregateRating in Product (but not variants - they inherit it)
      if (type === 'Product' && !isVariant && data.aggregateRating) {
        if (!hasValue(data.aggregateRating.ratingValue)) {
          issues.push({
            severity: 'error',
            message: 'AggregateRating missing ratingValue'
          });
        }
        if (!data.aggregateRating.reviewCount && !data.aggregateRating.ratingCount) {
          issues.push({
            severity: 'error',
            message: 'AggregateRating missing reviewCount or ratingCount'
          });
        }
      }

      // Check for AggregateRating in ProductGroup
      if (type === 'ProductGroup' && data.aggregateRating) {
        if (!hasValue(data.aggregateRating.ratingValue)) {
          issues.push({
            severity: 'error',
            message: 'AggregateRating missing ratingValue'
          });
        }
        if (!data.aggregateRating.reviewCount && !data.aggregateRating.ratingCount) {
          issues.push({
            severity: 'error',
            message: 'AggregateRating missing reviewCount or ratingCount'
          });
        }
      }
    } else {
      // Unknown schema type - just info
      issues.push({
        severity: 'info',
        message: `Schema type "${type}" - no specific validation rules`
      });
    }

    return issues;
  }

  function validateSchema() {
    schemaIssues = [];

    for (const item of schemaItems) {
      const issues = validateSchemaItem(item, schemaItems);
      schemaIssues.push({
        item: item,
        issues: issues
      });
    }

    updateSchemaBadge();
  }

  function updateSchemaBadge() {
    const errorCount = schemaIssues.reduce((count, item) => {
      return count + item.issues.filter(i => i.severity === 'error').length;
    }, 0);

    const warningCount = schemaIssues.reduce((count, item) => {
      return count + item.issues.filter(i => i.severity === 'warning').length;
    }, 0);

    if (errorCount > 0) {
      schemaBadge.textContent = errorCount;
      schemaBadge.classList.remove('hidden', 'warning');
    } else if (warningCount > 0) {
      schemaBadge.textContent = warningCount;
      schemaBadge.classList.remove('hidden');
      schemaBadge.classList.add('warning');
    } else {
      schemaBadge.classList.add('hidden');
    }
  }

  // ============================================
  // SCHEMA RECOMMENDATIONS
  // ============================================

  function generateRecommendations() {
    const recommendations = [];
    const existingTypes = new Set(schemaItems.map(item => item.type));
    const hasProduct = existingTypes.has('Product') || existingTypes.has('ProductGroup');
    const hasArticle = existingTypes.has('Article') || existingTypes.has('NewsArticle') || existingTypes.has('BlogPosting');
    const hasLocalBusiness = existingTypes.has('LocalBusiness');
    const hasOrganization = existingTypes.has('Organization') || hasLocalBusiness;

    // Check for missing common schemas
    if (!existingTypes.has('WebSite') && !existingTypes.has('WebPage')) {
      recommendations.push({
        priority: 'medium',
        title: 'Add WebSite Schema',
        description: 'WebSite schema helps search engines understand your site structure and can enable sitelinks search box.',
        benefit: 'Improved site presentation in search results'
      });
    }

    if (!existingTypes.has('BreadcrumbList')) {
      recommendations.push({
        priority: 'medium',
        title: 'Add BreadcrumbList Schema',
        description: 'Breadcrumb markup helps users understand page hierarchy and improves navigation display in search results.',
        benefit: 'Enhanced breadcrumb display in search results'
      });
    }

    if (!hasOrganization) {
      recommendations.push({
        priority: 'high',
        title: 'Add Organization Schema',
        description: 'Organization schema establishes brand identity and can display your logo, contact info, and social profiles in search.',
        benefit: 'Knowledge panel eligibility, brand recognition'
      });
    }

    // Product-specific recommendations
    if (hasProduct) {
      const productItems = schemaItems.filter(i => i.type === 'Product' || i.type === 'ProductGroup');
      const hasRatings = productItems.some(p => p.data.aggregateRating);
      const hasReviews = existingTypes.has('Review') || productItems.some(p => p.data.review);

      if (!hasRatings) {
        recommendations.push({
          priority: 'high',
          title: 'Add Product Ratings',
          description: 'AggregateRating on products enables star ratings in search results, significantly improving click-through rates.',
          benefit: 'Star ratings in search results (rich snippets)'
        });
      }

      if (!hasReviews) {
        recommendations.push({
          priority: 'medium',
          title: 'Add Product Reviews',
          description: 'Individual Review schema provides detailed review content to search engines.',
          benefit: 'Review snippets, increased trust signals'
        });
      }

      // Check for missing product fields
      for (const item of productItems) {
        if (!item.data.gtin && !item.data.gtin12 && !item.data.gtin13 && !item.data.gtin14 && !item.data.isbn && !item.data.mpn) {
          recommendations.push({
            priority: 'medium',
            title: 'Add Product Identifiers',
            description: 'GTIN, MPN, or ISBN helps Google match your products with their database for better product listings.',
            benefit: 'Better product matching, Shopping eligibility'
          });
          break; // Only show once
        }
      }
    }

    // Article-specific recommendations
    if (hasArticle) {
      const articleItems = schemaItems.filter(i =>
        i.type === 'Article' || i.type === 'NewsArticle' || i.type === 'BlogPosting'
      );

      const hasAuthorDetails = articleItems.some(a =>
        a.data.author && typeof a.data.author === 'object' && a.data.author.url
      );

      if (!hasAuthorDetails) {
        recommendations.push({
          priority: 'medium',
          title: 'Enhance Author Information',
          description: 'Adding author URL and detailed author info helps establish E-E-A-T (Experience, Expertise, Authoritativeness, Trust).',
          benefit: 'Improved content credibility signals'
        });
      }
    }

    // FAQ recommendation for relevant pages
    if (!existingTypes.has('FAQPage') && !existingTypes.has('Question')) {
      recommendations.push({
        priority: 'low',
        title: 'Consider FAQPage Schema',
        description: 'If this page has FAQ content, FAQPage schema can display Q&A directly in search results.',
        benefit: 'FAQ rich results, increased SERP real estate'
      });
    }

    // HowTo recommendation
    if (!existingTypes.has('HowTo') && hasArticle) {
      recommendations.push({
        priority: 'low',
        title: 'Consider HowTo Schema',
        description: 'If your content includes step-by-step instructions, HowTo schema enables rich how-to results.',
        benefit: 'How-to rich results with steps displayed'
      });
    }

    // Video recommendation
    if (!existingTypes.has('VideoObject')) {
      recommendations.push({
        priority: 'low',
        title: 'Add VideoObject for Videos',
        description: 'If this page contains videos, VideoObject schema enables video rich results and video carousels.',
        benefit: 'Video thumbnails in search, video carousel eligibility'
      });
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return recommendations;
  }

  function createRecommendationsSection() {
    const recommendations = generateRecommendations();

    if (recommendations.length === 0) {
      return null;
    }

    const section = document.createElement('div');
    section.className = 'recommendations-section';

    let html = `
      <div class="recommendations-header">
        <span class="recommendations-icon">💡</span>
        <span class="recommendations-title">Implementation Opportunities</span>
      </div>
      <div class="recommendations-list">
    `;

    for (const rec of recommendations) {
      html += `
        <div class="recommendation-item priority-${rec.priority}">
          <div class="recommendation-priority">${rec.priority.toUpperCase()}</div>
          <div class="recommendation-content">
            <div class="recommendation-title">${escapeHtml(rec.title)}</div>
            <div class="recommendation-description">${escapeHtml(rec.description)}</div>
            <div class="recommendation-benefit">→ ${escapeHtml(rec.benefit)}</div>
          </div>
        </div>
      `;
    }

    html += '</div>';
    section.innerHTML = html;

    return section;
  }

  function createSchemaItem(schemaEntry) {
    const { item, issues } = schemaEntry;
    const div = document.createElement('div');

    const hasErrors = issues.some(i => i.severity === 'error');
    const hasWarnings = issues.some(i => i.severity === 'warning');
    const hasOnlyInfo = issues.every(i => i.severity === 'info');

    let statusClass = 'valid';
    if (hasErrors) statusClass = 'has-errors';
    else if (hasWarnings) statusClass = 'has-warnings';

    div.className = `schema-item ${statusClass}`;

    // Format class for the badge
    const formatClass = item.format.toLowerCase().replace(/[^a-z]/g, '-');

    // Get key properties to display
    const data = item.data || {};
    const displayProps = [];
    const importantKeys = ['name', 'headline', '@id', 'url', 'description', 'price', 'priceCurrency'];

    for (const key of importantKeys) {
      if (data[key] !== undefined && data[key] !== null) {
        let value = data[key];
        if (typeof value === 'string' && value.length > 50) {
          value = value.substring(0, 50) + '...';
        }
        displayProps.push({ key, value });
      }
      if (displayProps.length >= 3) break;
    }

    let propsHtml = '';
    if (displayProps.length > 0 || item.type !== 'PARSE_ERROR') {
      propsHtml = '<div class="schema-properties">';
      for (const prop of displayProps) {
        propsHtml += `<div class="schema-prop"><span class="schema-prop-key">${escapeHtml(prop.key)}:</span> ${escapeHtml(String(prop.value))}</div>`;
      }
      propsHtml += '</div>';
    }

    // Issues display
    let issuesHtml = '';
    if (issues.length > 0 && !hasOnlyInfo) {
      issuesHtml = '<div class="schema-issues">';
      for (const issue of issues) {
        if (issue.severity === 'info') continue; // Skip info in display
        const iconClass = issue.severity;
        const icon = issue.severity === 'error' ? '✗' : '⚠';
        issuesHtml += `<div class="schema-issue">
          <span class="schema-issue-icon ${iconClass}">${icon}</span>
          <span class="schema-issue-text">${escapeHtml(issue.message)}</span>
        </div>`;
      }
      issuesHtml += '</div>';
    }

    div.innerHTML = `
      <div class="schema-header">
        <span class="schema-format ${formatClass}">${item.format}</span>
        <span class="schema-type">${escapeHtml(item.type)}</span>
        <span class="schema-source">${item.source}</span>
      </div>
      ${propsHtml}
      ${issuesHtml}
    `;

    return div;
  }

  function renderSchema() {
    schemaList.innerHTML = '';

    if (schemaItems.length === 0) {
      schemaList.innerHTML = '<div class="no-schema">No schema data found on this page</div>';
      return;
    }

    // Summary
    const typeCount = {};
    for (const item of schemaItems) {
      typeCount[item.type] = (typeCount[item.type] || 0) + 1;
    }

    const errorCount = schemaIssues.reduce((c, i) => c + i.issues.filter(x => x.severity === 'error').length, 0);
    const warningCount = schemaIssues.reduce((c, i) => c + i.issues.filter(x => x.severity === 'warning').length, 0);

    const summary = document.createElement('div');
    summary.className = 'schema-summary';

    let summaryHtml = `<div class="schema-stat"><span class="schema-stat-count">${schemaItems.length}</span> schema(s)</div>`;
    if (errorCount > 0) {
      summaryHtml += `<div class="schema-stat"><span class="schema-stat-count errors">${errorCount}</span> errors</div>`;
    }
    if (warningCount > 0) {
      summaryHtml += `<div class="schema-stat"><span class="schema-stat-count warnings">${warningCount}</span> warnings</div>`;
    }

    summary.innerHTML = summaryHtml;
    schemaList.appendChild(summary);

    // Render each schema
    for (const schemaEntry of schemaIssues) {
      schemaList.appendChild(createSchemaItem(schemaEntry));
    }

    // Render recommendations
    const recommendationsSection = createRecommendationsSection();
    if (recommendationsSection) {
      schemaList.appendChild(recommendationsSection);
    }
  }

  function generateSchemaReport(pageUrl) {
    let report = '════════════════════════════════════════════════════════════\n';
    report += '               opsIQ SCHEMA AUDIT REPORT\n';
    report += '════════════════════════════════════════════════════════════\n\n';

    report += `URL:  ${pageUrl || 'N/A'}\n`;
    report += `Date: ${new Date().toLocaleString()}\n\n`;

    // Summary
    const errorCount = schemaIssues.reduce((c, i) => c + i.issues.filter(x => x.severity === 'error').length, 0);
    const warningCount = schemaIssues.reduce((c, i) => c + i.issues.filter(x => x.severity === 'warning').length, 0);

    report += '────────────────────────────────────────────────────────────\n';
    report += '  SUMMARY\n';
    report += '────────────────────────────────────────────────────────────\n\n';
    report += `  Total Schemas Found: ${schemaItems.length}\n`;
    report += `  Errors:   ${errorCount}\n`;
    report += `  Warnings: ${warningCount}\n\n`;

    if (schemaItems.length === 0) {
      report += '  No schema markup found on this page.\n\n';
    } else {
      report += '────────────────────────────────────────────────────────────\n';
      report += '  SCHEMA DETAILS\n';
      report += '────────────────────────────────────────────────────────────\n\n';

      for (const { item, issues } of schemaIssues) {
        report += `  ┌─ [${item.format}] ${item.type}\n`;
        report += '  │\n';

        // Key properties
        const data = item.data || {};
        const importantKeys = ['name', 'headline', '@id', 'url', 'description'];
        for (const key of importantKeys) {
          if (data[key]) {
            let value = String(data[key]);
            if (value.length > 60) value = value.substring(0, 60) + '...';
            report += `  │  ${key}: ${value}\n`;
          }
        }

        // Issues
        const significantIssues = issues.filter(i => i.severity !== 'info');
        if (significantIssues.length > 0) {
          report += '  │\n';
          report += '  │  Issues:\n';
          for (const issue of significantIssues) {
            const icon = issue.severity === 'error' ? 'ERROR' : 'WARN';
            report += `  │    [${icon}] ${issue.message}\n`;
          }
        } else {
          report += '  │\n';
          report += '  │  ✓ No issues found\n';
        }

        report += '  │\n';
        report += '  └────────────────────────────────────────────────────────\n\n';
      }
    }

    // Add recommendations to report
    const recommendations = generateRecommendations();
    if (recommendations.length > 0) {
      report += '────────────────────────────────────────────────────────────\n';
      report += '  IMPLEMENTATION OPPORTUNITIES\n';
      report += '────────────────────────────────────────────────────────────\n\n';

      for (const rec of recommendations) {
        const priorityLabel = rec.priority.toUpperCase().padEnd(6);
        report += `  [${priorityLabel}] ${rec.title}\n`;
        report += `             ${rec.description}\n`;
        report += `             → ${rec.benefit}\n\n`;
      }
    }

    report += '════════════════════════════════════════════════════════════\n';

    return report;
  }

  // Format timestamp for display
  function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  // Create tracking item HTML
  function createTrackingItem(type, id) {
    const icons = {
      gtm: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 18.5L4 16V8.5l8 4v8zm1-9.5L5 7l7-3.5L19 7l-6 4z"/></svg>',
      ga4: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>',
      gads: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>',
      fb: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.53-4.5-10.02-10-10.02z"/></svg>'
    };

    const labels = {
      gtm: 'GTM',
      ga4: 'GA4',
      gads: 'Google Ads',
      fb: 'FB Pixel'
    };

    const div = document.createElement('div');
    div.className = 'tracking-item';
    div.innerHTML = `
      <span class="tracking-icon ${type}">${icons[type]}</span>
      <div class="tracking-info">
        <div class="tracking-type">${labels[type]}</div>
        <div class="tracking-id">${id}</div>
      </div>
      <button class="copy-btn" data-id="${id}" title="Copy ID">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
        </svg>
      </button>
    `;

    const copyBtn = div.querySelector('.copy-btn');
    copyBtn.addEventListener('click', () => copyToClipboard(id, copyBtn));

    return div;
  }

  // Format value for display - handles nested objects
  function formatValue(value, indent = 0) {
    if (value === null) return '<span class="event-null">null</span>';
    if (value === undefined) return '<span class="event-null">undefined</span>';

    const type = typeof value;

    if (type === 'string') {
      return `<span class="event-string">"${escapeHtml(value)}"</span>`;
    }
    if (type === 'number') {
      return `<span class="event-number">${value}</span>`;
    }
    if (type === 'boolean') {
      return `<span class="event-boolean">${value}</span>`;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return '<span class="event-null">[]</span>';
      if (value.length <= 3 && value.every(v => typeof v !== 'object')) {
        // Short array - inline
        return '[' + value.map(v => formatValue(v, indent)).join(', ') + ']';
      }
      // Longer array - expand
      let html = '<div class="event-array">[';
      for (let i = 0; i < Math.min(value.length, 10); i++) {
        html += `<div class="event-array-item">${formatValue(value[i], indent + 1)}</div>`;
      }
      if (value.length > 10) {
        html += `<div class="event-array-item event-null">...${value.length - 10} more</div>`;
      }
      html += ']</div>';
      return html;
    }

    if (type === 'object') {
      const keys = Object.keys(value);
      if (keys.length === 0) return '<span class="event-null">{}</span>';

      let html = '<div class="event-object">';
      for (const key of keys) {
        html += `<div class="event-prop"><span class="event-key">${escapeHtml(key)}:</span> ${formatValue(value[key], indent + 1)}</div>`;
      }
      html += '</div>';
      return html;
    }

    return escapeHtml(String(value));
  }

  // Escape HTML to prevent XSS
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Get source label for display
  function getSourceLabel(source) {
    const labels = {
      'dataLayer': 'DL',
      'gtag': 'gtag',
      'fbq': 'FB',
      'ga4': 'GA4',
      'gtm': 'GTM',
      'fb': 'FB'
    };
    return labels[source] || source.toUpperCase();
  }

  // Create event item HTML
  function createEventItem(event) {
    const div = document.createElement('div');
    div.className = 'event-item';
    div.dataset.source = event.source;

    let detailsHtml = '';
    if (event.data && Object.keys(event.data).length > 0) {
      detailsHtml = '<div class="event-details">';
      for (const [key, value] of Object.entries(event.data)) {
        // Skip the event key itself since we show it in the header
        if (key === 'event') continue;
        detailsHtml += `<div class="event-detail"><span class="event-detail-key">${escapeHtml(key)}:</span> ${formatValue(value)}</div>`;
      }
      detailsHtml += '</div>';
    }

    const sourceLabel = getSourceLabel(event.source);

    div.innerHTML = `
      <div class="event-header">
        <span class="event-time">${formatTime(event.timestamp)}</span>
        <span class="event-source ${event.source}">${sourceLabel}</span>
        <span class="event-name">${escapeHtml(event.name)}</span>
      </div>
      ${detailsHtml}
    `;

    return div;
  }

  // Render tracking data
  function renderTracking(tracking) {
    trackingList.innerHTML = '';

    const hasTracking = Object.values(tracking).some(ids => ids.length > 0);

    if (!hasTracking) {
      trackingList.innerHTML = '<div class="no-tracking">No tracking found on this page</div>';
      return;
    }

    for (const [type, ids] of Object.entries(tracking)) {
      for (const id of ids) {
        trackingList.appendChild(createTrackingItem(type, id));
      }
    }
  }

  // Render events with filter
  function renderEvents() {
    eventsList.innerHTML = '';

    let filteredEvents;
    if (currentFilter === 'all') {
      filteredEvents = allEvents;
    } else if (currentFilter === 'ga4') {
      // GA4 includes dataLayer and gtag events
      filteredEvents = allEvents.filter(e => e.source === 'dataLayer' || e.source === 'gtag' || e.source === 'ga4');
    } else if (currentFilter === 'fb') {
      filteredEvents = allEvents.filter(e => e.source === 'fbq' || e.source === 'fb');
    } else {
      filteredEvents = allEvents.filter(e => e.source === currentFilter);
    }

    if (filteredEvents.length === 0) {
      eventsList.innerHTML = '<div class="no-events">No events captured yet. Interact with the page to trigger events.</div>';
      return;
    }

    for (const event of filteredEvents) {
      eventsList.appendChild(createEventItem(event));
    }

    // Scroll to bottom
    eventsList.scrollTop = eventsList.scrollHeight;
  }

  // Copy to clipboard
  async function copyToClipboard(text, button) {
    try {
      await navigator.clipboard.writeText(text);
      button.classList.add('copied');
      setTimeout(() => button.classList.remove('copied'), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  // Generate full report
  // Format a value for text report with proper indentation
  function formatValueForReport(value, indent = 0) {
    const pad = '  '.repeat(indent);

    if (value === null) return 'null';
    if (value === undefined) return 'undefined';

    const type = typeof value;
    if (type === 'string') return `"${value}"`;
    if (type === 'number' || type === 'boolean') return String(value);

    if (Array.isArray(value)) {
      if (value.length === 0) return '[]';
      if (value.length <= 3 && value.every(v => typeof v !== 'object')) {
        return '[' + value.map(v => formatValueForReport(v, 0)).join(', ') + ']';
      }
      let result = '[\n';
      for (let i = 0; i < Math.min(value.length, 10); i++) {
        result += `${pad}    - ${formatValueForReport(value[i], indent + 2)}\n`;
      }
      if (value.length > 10) {
        result += `${pad}    ... and ${value.length - 10} more items\n`;
      }
      result += `${pad}  ]`;
      return result;
    }

    if (type === 'object') {
      const keys = Object.keys(value);
      if (keys.length === 0) return '{}';
      let result = '{\n';
      for (const key of keys) {
        const val = formatValueForReport(value[key], indent + 2);
        if (val.includes('\n')) {
          result += `${pad}    ${key}:\n${pad}      ${val.split('\n').join('\n' + pad + '      ')}\n`;
        } else {
          result += `${pad}    ${key}: ${val}\n`;
        }
      }
      result += `${pad}  }`;
      return result;
    }

    return String(value);
  }

  // Format a single event for the report
  function formatEventForReport(event) {
    let result = `  [${formatTime(event.timestamp)}] ${event.name}\n`;

    if (event.data && Object.keys(event.data).length > 0) {
      for (const [key, value] of Object.entries(event.data)) {
        if (key === 'event') continue;
        const formatted = formatValueForReport(value, 1);
        if (formatted.includes('\n')) {
          result += `    ${key}:\n      ${formatted.split('\n').join('\n      ')}\n`;
        } else {
          result += `    ${key}: ${formatted}\n`;
        }
      }
    }

    return result;
  }

  function generateReport(tracking, pageUrl) {
    const sourceLabels = {
      dataLayer: 'dataLayer Events (GA4)',
      gtag: 'gtag() Events (GA4)',
      fbq: 'Facebook Pixel Events',
      fb: 'Facebook Pixel Events',
      ga4: 'GA4 Events',
      gtm: 'GTM Events'
    };

    let report = '════════════════════════════════════════════════════════════\n';
    report += '               opsIQ TRACKING AUDITOR REPORT\n';
    report += '════════════════════════════════════════════════════════════\n\n';

    report += `URL:  ${pageUrl || 'N/A'}\n`;
    report += `Date: ${new Date().toLocaleString()}\n\n`;

    // Tracking IDs section
    report += '────────────────────────────────────────────────────────────\n';
    report += '  TRACKING IDs DETECTED\n';
    report += '────────────────────────────────────────────────────────────\n\n';

    const trackingLabels = { gtm: 'GTM', ga4: 'GA4', gads: 'Google Ads', fb: 'Facebook Pixel' };
    let hasTracking = false;
    for (const [type, ids] of Object.entries(tracking)) {
      if (ids.length > 0) {
        hasTracking = true;
        report += `  ${trackingLabels[type]}:\n`;
        for (const id of ids) {
          report += `    • ${id}\n`;
        }
        report += '\n';
      }
    }
    if (!hasTracking) {
      report += '  No tracking IDs detected.\n\n';
    }

    // Events section
    report += '────────────────────────────────────────────────────────────\n';
    report += '  CAPTURED EVENTS\n';
    report += '────────────────────────────────────────────────────────────\n\n';

    if (allEvents.length === 0) {
      report += '  No events captured.\n\n';
    } else {
      // Group events by source
      const eventsBySource = {};
      for (const event of allEvents) {
        const source = event.source || 'unknown';
        if (!eventsBySource[source]) {
          eventsBySource[source] = [];
        }
        eventsBySource[source].push(event);
      }

      // Output events grouped by source
      for (const [source, events] of Object.entries(eventsBySource)) {
        const label = sourceLabels[source] || source.toUpperCase();
        report += `  ┌─ ${label} (${events.length} event${events.length !== 1 ? 's' : ''}) ─────────────────────────\n`;
        report += '  │\n';

        for (let i = 0; i < events.length; i++) {
          const event = events[i];
          const eventText = formatEventForReport(event);
          // Indent each line with the box character
          const lines = eventText.split('\n').filter(l => l);
          for (const line of lines) {
            report += `  │ ${line}\n`;
          }
          // Add separator between events (but not after the last one)
          if (i < events.length - 1) {
            report += '  │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─\n';
          }
        }

        report += '  │\n';
        report += '  └────────────────────────────────────────────────────────\n\n';
      }
    }

    report += '════════════════════════════════════════════════════════════\n';
    report += `  Total Events: ${allEvents.length}\n`;
    report += '════════════════════════════════════════════════════════════\n';

    return report;
  }

  // Initialize popup
  async function init() {
    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab?.id) {
        trackingList.innerHTML = '<div class="no-tracking">Unable to access this page</div>';
        return;
      }

      // Request tracking data from content script
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_TRACKING_DATA' });

      if (response) {
        renderTracking(response.tracking);
        allEvents = response.events || [];
        renderEvents();
        runAudit(); // Initial audit to update badge
      }
    } catch (err) {
      console.error('Error initializing popup:', err);
      trackingList.innerHTML = '<div class="no-tracking">Unable to scan this page. Try refreshing.</div>';
    }
  }

  // Listen for new events from content script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'NEW_EVENT') {
      allEvents.push(message.event);
      renderEvents();
      runAudit(); // Update audit on new events
    }
  });

  // Filter change handler
  filterSelect.addEventListener('change', (e) => {
    currentFilter = e.target.value;
    renderEvents();
  });

  // Copy all button
  copyAllBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let tracking = { gtm: [], ga4: [], gads: [], fb: [] };

    try {
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_TRACKING_DATA' });
      if (response) {
        tracking = response.tracking;
      }
    } catch (err) {
      // Use empty tracking
    }

    const report = generateReport(tracking, tab?.url);
    await copyToClipboard(report, copyAllBtn);
    copyAllBtn.textContent = 'Copied!';
    setTimeout(() => {
      copyAllBtn.textContent = 'Copy All';
    }, 1500);
  });

  // Clear button
  clearBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'CLEAR_EVENTS' });
    } catch (err) {
      // Ignore
    }

    allEvents = [];
    auditIssues = [];
    renderEvents();
    updateAuditBadge();
  });

  // Copy audit button
  copyAuditBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    runAudit(); // Ensure audit is up to date
    const report = generateAuditReport(tab?.url);
    await copyToClipboard(report, copyAuditBtn);
    copyAuditBtn.textContent = 'Copied!';
    setTimeout(() => {
      copyAuditBtn.textContent = 'Copy Audit';
    }, 1500);
  });

  // Refresh audit button
  refreshAuditBtn.addEventListener('click', () => {
    runAudit();
  });

  // Copy schema button
  copySchemaBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const report = generateSchemaReport(tab?.url);
    await copyToClipboard(report, copySchemaBtn);
    copySchemaBtn.textContent = 'Copied!';
    setTimeout(() => {
      copySchemaBtn.textContent = 'Copy Schema';
    }, 1500);
  });

  // Refresh schema button
  refreshSchemaBtn.addEventListener('click', () => {
    loadSchemaData();
  });

  // Notify content script when popup closes
  window.addEventListener('unload', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'POPUP_CLOSED' }).catch(() => {});
    }
  });

  // Start
  init();
})();
