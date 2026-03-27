// opsIQ - sidepanel.js
// Side panel UI: ES module, OpsIQPanel class

const EVENT_CAP = 200;

class OpsIQPanel {
  constructor() {
    this.activeTab = 'events';
    this.capturedEvents = [];
    this.auditIssues = [];
    this.schemaData = null;
    this.port = null;
    this.currentUrl = null;
    this.currentTabId = null;
    this.init();
  }

  init() {
    this.connectPort();
    this.bindNavigation();
    this.bindToolbar();
    this.setupMessageListener();
    this.loadData();
  }

  // ─── Port connection (BUG-0004) ───────────────────────────────────────────
  // Connecting a named port signals background.js to send PANEL_OPEN to content.js.
  // We also send a PANEL_HANDSHAKE with the current tab ID so background.js can
  // target the correct tab reliably (no async tabs.query race condition).
  connectPort() {
    this.port = chrome.runtime.connect({ name: 'opsiq-panel' });
    this.port.onDisconnect.addListener(() => {
      // SW restarted — reconnect
      setTimeout(() => this.connectPort(), 100);
    });
    // Re-send handshake after SW restart so background knows the correct tab
    if (this.currentTabId) this.sendHandshake(this.currentTabId);
  }

  sendHandshake(tabId) {
    if (this.port && tabId) {
      try {
        this.port.postMessage({ type: 'PANEL_HANDSHAKE', tabId });
      } catch (e) {
        // Port disconnected during SW restart; reconnect will retry
      }
    }
  }

  // ─── Tab navigation ───────────────────────────────────────────────────────
  bindNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          const tabs = [...document.querySelectorAll('.nav-btn')];
          const next = tabs[(tabs.indexOf(btn) + 1) % tabs.length];
          next.focus();
          this.switchTab(next.dataset.tab);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const tabs = [...document.querySelectorAll('.nav-btn')];
          const prev = tabs[(tabs.indexOf(btn) - 1 + tabs.length) % tabs.length];
          prev.focus();
          this.switchTab(prev.dataset.tab);
        }
      });
    });
  }

  switchTab(tabName) {
    this.activeTab = tabName;

    document.querySelectorAll('.nav-btn').forEach(btn => {
      const isActive = btn.dataset.tab === tabName;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', String(isActive));
      btn.setAttribute('tabindex', isActive ? '0' : '-1');
    });

    document.querySelectorAll('.tab-section').forEach(section => {
      const isActive = section.id === `tab-${tabName}`;
      section.classList.toggle('hidden', !isActive);
      section.setAttribute('tabindex', isActive ? '0' : '-1');
    });

    if (tabName === 'schema' && !this.schemaData) {
      this.loadSchemaData();
    }
  }

  // ─── Toolbar buttons ──────────────────────────────────────────────────────
  bindToolbar() {
    document.getElementById('clearEvents').addEventListener('click', () => this.clearEvents());
    document.getElementById('copyEvents').addEventListener('click', () => this.copyReport('events'));
    document.getElementById('copyAudit').addEventListener('click', () => this.copyReport('audit'));
    document.getElementById('copySchema').addEventListener('click', () => this.copyReport('schema'));
    document.getElementById('eventFilter').addEventListener('change', () => this.renderEvents());
    document.getElementById('trackingToggle').addEventListener('click', () => this.toggleTracking());
  }

  toggleTracking() {
    const toggle = document.getElementById('trackingToggle');
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
  }

  // ─── Message listener (runtime messages from background / content) ─────────
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'NEW_EVENT') {
        this.addEvent(message.event);
      } else if (message.type === 'PAGE_NAVIGATED') {
        if (message.tabId === this.currentTabId) {
          this.onPageNavigated(message.url);
        }
      }
    });
  }

  // ─── Initial data load ────────────────────────────────────────────────────
  async loadData() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    this.currentTabId = tab.id;
    this.updateHeaderUrl(tab.url);
    this.sendHandshake(tab.id);  // Now that we have the tab ID, send handshake

    try {
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_TRACKING_DATA' });
      if (response) {
        this.renderTracking(response.tracking);
        if (response.events) {
          this.capturedEvents = response.events.slice(-EVENT_CAP);
          this.renderEvents();
          this.runAudit();
        }
      }
    } catch (e) {
      this.renderTrackingError();
    }
  }

  updateHeaderUrl(url) {
    this.currentUrl = url;
    const el = document.getElementById('currentUrl');
    try {
      const u = new URL(url);
      el.textContent = u.hostname + (u.pathname !== '/' ? u.pathname : '');
    } catch {
      el.textContent = url || '—';
    }
    el.title = url || '';
  }

  onPageNavigated(url) {
    // Insert a boundary marker in the events list, then update header
    const list = document.getElementById('eventsList');
    const marker = document.createElement('div');
    marker.className = 'nav-boundary';
    marker.setAttribute('role', 'separator');
    const shortUrl = (() => {
      try { const u = new URL(url); return u.hostname + u.pathname; } catch { return url; }
    })();
    marker.textContent = `navigated to ${shortUrl}`;
    list.appendChild(marker);
    this.updateHeaderUrl(url);
  }

  clearEvents() {
    document.getElementById('eventsList').innerHTML = '';
    if (this.currentTabId) {
      chrome.tabs.sendMessage(this.currentTabId, { type: 'CLEAR_EVENTS' }).catch(() => {});
    }
    this.capturedEvents = [];
    this.auditIssues = [];
    this.renderEvents();
    this.renderAudit();
  }

  // ─── XSS escape ───────────────────────────────────────────────────────────
  escapeHtml(str) {
    if (str == null) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  // ─── Tracking detection ───────────────────────────────────────────────────
  renderTracking(tracking) {
    const content = document.getElementById('trackingContent');
    const summary = document.getElementById('trackingSummary');
    const toggle = document.getElementById('trackingToggle');

    if (!tracking) {
      content.innerHTML = '<span class="tracking-placeholder">No tracking data.</span>';
      summary.textContent = 'No tracking detected';
      toggle.setAttribute('aria-label', 'Tracking detection — No tracking detected');
      return;
    }

    const items = [];

    // GTM: tracking.gtm is an array of IDs (e.g. ['GTM-XXXXX'])
    const gtmIds = tracking.gtm || [];
    if (gtmIds.length > 0) {
      items.push({ label: `GTM: ${gtmIds.map(id => this.escapeHtml(id)).join(', ')}`, found: true });
    } else {
      items.push({ label: 'GTM: not found', found: false });
    }

    // GA4: tracking.ga4 is an array of IDs (e.g. ['G-XXXXX'])
    const ga4Ids = tracking.ga4 || [];
    if (ga4Ids.length > 0) {
      items.push({ label: `GA4: ${ga4Ids.map(id => this.escapeHtml(id)).join(', ')}`, found: true });
    } else {
      items.push({ label: 'GA4: not found', found: false });
    }

    // Google Ads: key is 'gads' in content.js
    const gadsIds = tracking.gads || [];
    if (gadsIds.length > 0) {
      items.push({ label: `Google Ads: ${gadsIds.map(id => this.escapeHtml(id)).join(', ')}`, found: true });
    } else {
      items.push({ label: 'Google Ads: not found', found: false });
    }

    // Facebook Pixel: key is 'fb' in content.js
    const fbIds = tracking.fb || [];
    if (fbIds.length > 0) {
      items.push({ label: `Facebook Pixel: ${fbIds.map(id => this.escapeHtml(id)).join(', ')}`, found: true });
    } else {
      items.push({ label: 'Facebook Pixel: not found', found: false });
    }

    content.innerHTML = items.map(item =>
      `<span class="tracking-tag ${item.found ? '' : 'not-found'}">${item.label}</span>`
    ).join('');

    const foundCount = items.filter(i => i.found).length;
    const summaryText = foundCount > 0
      ? `${foundCount} tracking tool${foundCount > 1 ? 's' : ''} detected`
      : 'No tracking detected';
    summary.textContent = summaryText;
    toggle.setAttribute('aria-label', `Tracking detection — ${summaryText}`);
  }

  renderTrackingError() {
    document.getElementById('trackingContent').innerHTML =
      '<span class="tracking-placeholder">Could not read tracking data. Try reloading the page.</span>';
    document.getElementById('trackingSummary').textContent = 'Error reading page';
    document.getElementById('trackingToggle').setAttribute(
      'aria-label', 'Tracking detection — Error reading page'
    );
  }

  // ─── Events tab ───────────────────────────────────────────────────────────
  addEvent(event) {
    this.capturedEvents.push(event);
    // Enforce cap: drop oldest
    if (this.capturedEvents.length > EVENT_CAP) {
      this.capturedEvents.shift();
    }
    this.renderEvents();
    this.runAudit();
  }

  renderEvents() {
    const list = document.getElementById('eventsList');
    const filterValue = document.getElementById('eventFilter').value;

    let events = this.capturedEvents;
    if (filterValue !== 'all') {
      events = events.filter(e => {
        if (filterValue === 'datalayer') return e.source === 'dataLayer';
        if (filterValue === 'gtag') return e.source === 'gtag';
        if (filterValue === 'fbq') return e.source === 'fbq';
        return true;
      });
    }

    // Preserve existing boundary markers regardless of event count
    const markers = Array.from(list.querySelectorAll('.nav-boundary'));
    list.innerHTML = '';
    markers.forEach(m => list.appendChild(m));

    if (events.length === 0) {
      list.appendChild(Object.assign(document.createElement('p'), {
        className: 'empty-state',
        textContent: 'No events captured yet.'
      }));
      return;
    }

    events.forEach(event => {
      list.appendChild(this.createEventItem(event));
    });
  }

  createEventItem(event) {
    const item = document.createElement('div');
    item.className = 'event-item';
    item.setAttribute('role', 'listitem');

    const source = event.source || 'unknown';
    const badgeClass = source === 'dataLayer' ? 'badge-datalayer'
                     : source === 'gtag'      ? 'badge-gtag'
                     : source === 'fbq'       ? 'badge-fbq'
                     : 'badge-datalayer';

    const eventName = this.escapeHtml(
      event.name || event.event || event.eventName || 'unknown'
    );
    const time = event.timestamp
      ? new Date(event.timestamp).toLocaleTimeString()
      : '';

    const header = document.createElement('div');
    header.className = 'event-header';
    header.setAttribute('tabindex', '0');
    header.setAttribute('role', 'button');
    header.setAttribute('aria-expanded', 'false');
    header.innerHTML = `
      <span class="event-type-badge ${this.escapeHtml(badgeClass)}">${this.escapeHtml(source)}</span>
      <span class="event-name">${eventName}</span>
      <span class="event-time">${this.escapeHtml(time)}</span>
      <span class="event-expand-icon" aria-hidden="true">▶</span>
    `;

    const payload = document.createElement('div');
    payload.className = 'event-payload';
    payload.setAttribute('aria-hidden', 'true');

    // Lazy: payload rendered only on first expand
    let payloadRendered = false;
    const toggleExpand = () => {
      const expanded = item.classList.toggle('expanded');
      header.setAttribute('aria-expanded', String(expanded));
      payload.setAttribute('aria-hidden', String(!expanded));
      if (expanded && !payloadRendered) {
        payload.textContent = JSON.stringify(event, null, 2);
        payloadRendered = true;
      }
    };

    header.addEventListener('click', toggleExpand);
    header.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpand(); }
    });

    item.appendChild(header);
    item.appendChild(payload);
    return item;
  }

  // ─── Report generation ────────────────────────────────────────────────────
  copyReport(type) {
    let text = '';
    const date = new Date().toLocaleString();

    if (type === 'events') {
      text = `opsIQ TRACKING AUDIT REPORT\nGenerated: ${date}\nPage: ${this.currentUrl || '—'}\n\n`;
      if (this.capturedEvents.length === 0) {
        text += 'No events captured.';
      } else {
        this.capturedEvents.forEach((e, i) => {
          text += `--- Event ${i + 1} ---\n${JSON.stringify(e, null, 2)}\n\n`;
        });
      }
    } else if (type === 'audit') {
      text = `opsIQ EVENT AUDIT REPORT\nGenerated: ${date}\nPage: ${this.currentUrl || '—'}\n\n`;
      if (this.auditIssues.length === 0) {
        text += 'No issues found.';
      } else {
        this.auditIssues.forEach((issue, i) => {
          text += `${i + 1}. [${issue.severity || 'ISSUE'}] ${issue.event || ''}\n   ${issue.message}\n\n`;
        });
      }
    } else if (type === 'schema') {
      text = `opsIQ TRACKING AUDITOR REPORT\nGenerated: ${date}\nPage: ${this.currentUrl || '—'}\n\n`;
      if (this.schemaData) {
        (this.schemaData.schemas || []).forEach(s => {
          text += `Schema: ${s.type || 'Unknown'} (${s.format || ''})\n`;
          (s.issues || []).forEach(issue => { text += `  - ${issue}\n`; });
          text += '\n';
        });
      } else {
        text += 'No schema data loaded.';
      }
    }

    navigator.clipboard.writeText(text).catch(() => {
      // Fallback for environments where clipboard API is unavailable
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    });
  }

  // ─── Audit tab ────────────────────────────────────────────────────────────

  // GA4 ecommerce events and their required/recommended fields
  get ga4EcommerceRules() {
    return {
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
  }

  // Facebook Pixel events and their required/recommended fields
  get fbPixelRules() {
    return {
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
  }

  validateEvent(event) {
    const issues = [];
    const source = event.source;
    const name = event.name;
    const data = event.data || {};

    // Check for GA4/dataLayer events
    if (source === 'dataLayer' || source === 'gtag' || source === 'ga4') {
      const rules = this.ga4EcommerceRules[name];

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
      const rules = this.fbPixelRules[name];

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

  runAudit() {
    this.auditIssues = [];

    this.capturedEvents.forEach(event => {
      const issues = this.validateEvent(event);
      if (issues && issues.length > 0) {
        issues.forEach(issue => {
          this.auditIssues.push({
            event: event.name || event.event || event.eventName || 'unknown',
            ...issue
          });
        });
      }
    });

    this.renderAudit();
    this.updateAuditBadge();
  }

  updateAuditBadge() {
    const count = this.auditIssues.length;
    const badge = document.getElementById('auditBadge');
    const countEl = document.getElementById('auditCount');
    const auditBtn = document.getElementById('nav-audit');
    badge.textContent = count;
    badge.classList.toggle('hidden', count === 0);
    countEl.textContent = `${count} issue${count !== 1 ? 's' : ''}`;
    // Update the button's aria-label so screen readers announce the count
    auditBtn.setAttribute('aria-label', count > 0 ? `Audit — ${count} issue${count !== 1 ? 's' : ''}` : 'Audit');
  }

  renderAudit() {
    const list = document.getElementById('auditList');

    if (this.auditIssues.length === 0) {
      list.innerHTML = '<p class="empty-state">No issues found.</p>';
      return;
    }

    list.innerHTML = '';
    this.auditIssues.forEach(issue => {
      list.appendChild(this.createAuditItem(issue));
    });
  }

  createAuditItem(issue) {
    const item = document.createElement('div');
    const isWarning = issue.severity === 'warning' || issue.severity === 'RECOMMENDED';
    item.className = `audit-item${isWarning ? ' warning' : ''}`;
    item.setAttribute('role', 'listitem');
    const severityLabel = isWarning ? '[!] '
                        : issue.severity === 'info' ? '[i] '
                        : '[✗] ';
    item.innerHTML = `
      <div class="audit-item-title"><span aria-hidden="true">${severityLabel}</span>${this.escapeHtml(issue.event)}: ${this.escapeHtml(issue.message || issue.title || '')}</div>
      ${issue.detail ? `<div class="audit-item-detail">${this.escapeHtml(issue.detail)}</div>` : ''}
    `;
    return item;
  }

  // ─── Schema tab ───────────────────────────────────────────────────────────
  async loadSchemaData() {
    if (!this.currentTabId) return;

    try {
      const response = await chrome.tabs.sendMessage(this.currentTabId, { type: 'GET_SCHEMA_DATA' });
      const rawSchema = response?.schema;
      this.schemaData = rawSchema
        ? { schemas: Array.isArray(rawSchema) ? rawSchema : [rawSchema], opportunities: [] }
        : null;
      this.renderSchema();
    } catch (e) {
      document.getElementById('schemaList').innerHTML =
        '<p class="empty-state">Could not load schema data. Try reloading the page.</p>';
    }
  }

  renderSchema() {
    const schemaList = document.getElementById('schemaList');
    const oppList = document.getElementById('opportunitiesList');

    if (!this.schemaData) {
      schemaList.innerHTML = '<p class="empty-state">No schema detected.</p>';
      oppList.innerHTML = '<p class="empty-state">No recommendations.</p>';
      return;
    }

    const schemas = this.schemaData.schemas || [];
    const opportunities = this.schemaData.opportunities || [];

    // Schema Validation sub-section
    if (schemas.length === 0) {
      schemaList.innerHTML = '<p class="empty-state">No schema markup found.</p>';
    } else {
      schemaList.innerHTML = '';
      schemas.forEach(schema => {
        schemaList.appendChild(this.createSchemaItem(schema));
      });
    }

    // Opportunities sub-section
    if (opportunities.length === 0) {
      oppList.innerHTML = '<p class="empty-state">No recommendations.</p>';
    } else {
      oppList.innerHTML = '';
      opportunities.forEach(opp => {
        oppList.appendChild(this.createOpportunityItem(opp));
      });
    }
  }

  createSchemaItem(schema) {
    const item = document.createElement('div');
    item.className = 'schema-item';
    item.setAttribute('role', 'listitem');

    const issues = this.validateSchemaItem(schema);
    const hasErrors = issues.some(i => i.severity === 'error');
    const hasWarnings = issues.some(i => i.severity === 'warning');

    // WCAG Level A: text prefix, not color-only
    const statusPrefix = hasErrors  ? '[✗] '
                       : hasWarnings ? '[!] '
                       : '[✓] ';
    const statusClass  = hasErrors  ? 'schema-status-fail'
                       : hasWarnings ? 'schema-status-warn'
                       : 'schema-status-pass';

    const typeLabel = this.escapeHtml(schema.type || 'Unknown');
    const formatLabel = this.escapeHtml(schema.format || '');

    item.innerHTML = `
      <div class="schema-item-header">
        <span class="${statusClass}" aria-hidden="true">${statusPrefix}</span>
        <span>${typeLabel}</span>
        ${formatLabel ? `<span style="color:var(--text-muted);font-size:11px">${formatLabel}</span>` : ''}
      </div>
      ${issues.length > 0 ? `
        <div class="schema-item-issues">
          ${issues.map(i => `<div class="schema-issue-line">${this.escapeHtml(i.message)}</div>`).join('')}
        </div>` : ''}
    `;
    return item;
  }

  createOpportunityItem(opp) {
    const item = document.createElement('div');
    item.className = 'opportunity-item';
    item.setAttribute('role', 'listitem');

    const priority = (opp.priority || 'LOW').toUpperCase();
    const priorityClass = priority === 'HIGH' ? 'priority-high'
                        : priority === 'MEDIUM' ? 'priority-medium'
                        : 'priority-low';

    item.innerHTML = `
      <div class="opportunity-priority ${priorityClass}">${this.escapeHtml(priority)}</div>
      <div class="opportunity-title">${this.escapeHtml(opp.title || opp.type || '')}</div>
      ${opp.description ? `<div class="opportunity-detail">${this.escapeHtml(opp.description)}</div>` : ''}
    `;
    return item;
  }

  // ─── Schema validation helpers (ported from popup.js) ─────────────────────
  validateSchemaItem(item, allItems = []) {
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
    const isVariant = type === 'Product' && this._isProductVariant(data);

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
    const rules = this._schemaRules[type];

    if (rules) {
      // Check required fields
      for (const field of rules.required) {
        const value = this._getSchemaValue(data, field);
        if (!this._hasValue(value)) {
          issues.push({
            severity: 'error',
            message: `Missing required field: ${field}`
          });
        }
      }

      // Check recommended fields
      for (const field of rules.recommended) {
        // Skip inherited fields for Product variants that have a parent ProductGroup
        if (isVariant && hasParentProductGroup && this._variantInheritedFields.includes(field)) {
          continue; // Field is inherited from ProductGroup
        }

        const value = this._getSchemaValue(data, field);
        if (!this._hasValue(value)) {
          // For variants without confirmed parent, show as info instead of warning
          if (isVariant && this._variantInheritedFields.includes(field)) {
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
              if (!this._hasValue(offer[field])) {
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
        if (!this._hasValue(data.aggregateRating.ratingValue)) {
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
        if (!this._hasValue(data.aggregateRating.ratingValue)) {
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

  _hasValue(value) {
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
        return this._hasValue(value[keys[0]]);
      }
    }
    return true;
  }

  _extractValue(value) {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'string') return value.trim() || undefined;
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (Array.isArray(value)) {
      if (value.length === 0) return undefined;
      // Return first meaningful value from array
      for (const item of value) {
        const extracted = this._extractValue(item);
        if (extracted !== undefined) return value; // Return full array if any item is valid
      }
      return undefined;
    }
    if (typeof value === 'object') {
      // Check for common patterns: {name: "..."}, {@id: "..."}, {value: "..."}, etc.
      if (value.name) return this._extractValue(value.name);
      if (value['@value']) return this._extractValue(value['@value']);
      if (value.value) return this._extractValue(value.value);
      if (value['@id']) return value['@id'];
      if (value.url) return value.url;
      if (value.text) return this._extractValue(value.text);
      // If object has meaningful keys beyond @type and @id, consider it valid
      const meaningfulKeys = Object.keys(value).filter(k => k !== '@type' && k !== '@id' && k !== '@context');
      if (meaningfulKeys.length > 0) return value;
    }
    return undefined;
  }

  _getSchemaValue(data, field) {
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
        const extracted = this._extractValue(value);
        if (extracted !== undefined) return extracted;
      }
      // Fallback: check manufacturer field
      if (data.manufacturer) {
        const mfgValue = this._extractValue(data.manufacturer);
        if (mfgValue !== undefined) return mfgValue;
      }
      return undefined;
    }

    // For 'description', handle multiple formats
    if (field === 'description') {
      if (typeof value === 'string' && value.trim()) return value;
      if (value && typeof value === 'object') {
        const extracted = this._extractValue(value);
        if (extracted !== undefined) return extracted;
      }
      if (Array.isArray(value) && value.length > 0) {
        for (const desc of value) {
          const extracted = this._extractValue(desc);
          if (extracted !== undefined) return value;
        }
      }
      return undefined;
    }

    // For 'sku', also check inside offers
    if (field === 'sku') {
      if (this._hasValue(value)) return value;
      if (data.offers) {
        const offers = Array.isArray(data.offers) ? data.offers : [data.offers];
        for (const offer of offers) {
          if (this._hasValue(offer.sku)) return offer.sku;
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
    return this._extractValue(value);
  }

  _isProductVariant(data) {
    return data.inProductGroupWithID || data.isVariantOf || data['@id']?.includes('variant');
  }

  get _variantInheritedFields() {
    return ['brand', 'manufacturer', 'logo', 'aggregateRating'];
  }

  get _schemaRules() {
    return {
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
  }
}

// Bootstrap
const app = new OpsIQPanel();
