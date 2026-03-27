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

    // GTM
    if (tracking.gtm?.found) {
      const ids = (tracking.gtm.ids || []).map(id => this.escapeHtml(id)).join(', ');
      items.push({ label: `GTM: ${ids || 'found'}`, found: true });
    } else {
      items.push({ label: 'GTM: not found', found: false });
    }

    // GA4
    if (tracking.ga4?.found) {
      const ids = (tracking.ga4.ids || []).map(id => this.escapeHtml(id)).join(', ');
      items.push({ label: `GA4: ${ids || 'found'}`, found: true });
    } else {
      items.push({ label: 'GA4: not found', found: false });
    }

    // Google Ads
    if (tracking.googleAds?.found) {
      const ids = (tracking.googleAds.ids || []).map(id => this.escapeHtml(id)).join(', ');
      items.push({ label: `Google Ads: ${ids || 'found'}`, found: true });
    } else {
      items.push({ label: 'Google Ads: not found', found: false });
    }

    // Facebook Pixel
    if (tracking.facebook?.found) {
      const ids = (tracking.facebook.ids || []).map(id => this.escapeHtml(id)).join(', ');
      items.push({ label: `Facebook Pixel: ${ids || 'found'}`, found: true });
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

    if (events.length === 0) {
      list.innerHTML = '<p class="empty-state">No events captured yet.</p>';
      return;
    }

    // Preserve existing boundary markers; rebuild event items only
    const markers = Array.from(list.querySelectorAll('.nav-boundary'));
    list.innerHTML = '';
    markers.forEach(m => list.appendChild(m));

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
      event.event || event.eventName || event[0] || 'unknown'
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
      text = `opsIQ SCHEMA AUDIT REPORT\nGenerated: ${date}\nPage: ${this.currentUrl || '—'}\n\n`;
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

  // Stubs for methods added in Tasks 5, 7–8
  runAudit() {}
  renderAudit() {}
  updateAuditBadge() {}
  loadSchemaData() {}
}

// Bootstrap
const app = new OpsIQPanel();
