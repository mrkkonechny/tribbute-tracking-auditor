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
    // Send handshake once we know the active tab (loadData runs async, so send
    // handshake as soon as we have the tabId — see sendHandshake())
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
    if (this.currentTabId) {
      chrome.tabs.sendMessage(this.currentTabId, { type: 'CLEAR_EVENTS' }).catch(() => {});
    }
    this.capturedEvents = [];
    this.auditIssues = [];
    this.renderEvents();
    this.renderAudit();
  }

  // Stubs for methods added in Tasks 5–8
  renderTracking(tracking) {}
  renderTrackingError() {}
  addEvent(event) {}
  renderEvents() {}
  runAudit() {}
  renderAudit() {}
  updateAuditBadge() {}
  loadSchemaData() {}
  copyReport(type) {}
}

// Bootstrap
const app = new OpsIQPanel();
