// opsIQ - Injected Script
// This script runs in the page context to intercept tracking calls

(function() {
  'use strict';

  // Helper to dispatch events back to content script
  function dispatchEvent(type, detail) {
    window.dispatchEvent(new CustomEvent(type, { detail }));
  }

  // Helper to safely stringify objects
  function safeStringify(obj, maxDepth = 3) {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) return '[Circular]';
        seen.add(value);
      }
      if (typeof value === 'function') return '[Function]';
      return value;
    }, 2);
  }

  // Deep clone and sanitize data for display
  function cloneEventData(data, depth = 0) {
    if (depth > 5) return '[Max depth]';
    if (data === null) return null;
    if (data === undefined) return undefined;

    const type = typeof data;

    if (type === 'function') return '[Function]';
    if (type !== 'object') return data;

    // Handle Date
    if (data instanceof Date) return data.toISOString();

    // Handle Array
    if (Array.isArray(data)) {
      return data.slice(0, 50).map(item => cloneEventData(item, depth + 1));
    }

    // Handle Object
    const cloned = {};
    const keys = Object.keys(data).slice(0, 30); // Limit keys
    for (const key of keys) {
      // Skip internal/private properties
      if (key.startsWith('_') || key === 'gtm.uniqueEventId') continue;
      try {
        cloned[key] = cloneEventData(data[key], depth + 1);
      } catch (e) {
        cloned[key] = '[Error]';
      }
    }
    return cloned;
  }

  // Intercept dataLayer.push for GTM/GA4
  function interceptDataLayer() {
    // Wait for dataLayer to exist
    const checkDataLayer = setInterval(() => {
      if (window.dataLayer && Array.isArray(window.dataLayer)) {
        clearInterval(checkDataLayer);

        // Check if already intercepted
        if (window.dataLayer.__opsiq) return;

        const originalPush = window.dataLayer.push.bind(window.dataLayer);

        window.dataLayer.push = function(...args) {
          for (const arg of args) {
            if (arg && typeof arg === 'object') {
              // Handle array format (gtag style): ['event', 'event_name', {params}]
              if (Array.isArray(arg)) {
                const [command, nameOrId, params] = arg;

                if (command === 'event') {
                  dispatchEvent('__opsiq_event__', {
                    source: 'dataLayer',
                    name: nameOrId || 'unknown',
                    data: cloneEventData(params || {})
                  });
                } else if (command === 'config' && nameOrId) {
                  const id = String(nameOrId).toUpperCase();
                  if (id.startsWith('G-')) {
                    dispatchEvent('__opsiq_tracking__', { type: 'ga4', ids: [id] });
                  } else if (id.startsWith('AW-')) {
                    dispatchEvent('__opsiq_tracking__', { type: 'gads', ids: [id] });
                  } else if (id.startsWith('GTM-')) {
                    dispatchEvent('__opsiq_tracking__', { type: 'gtm', ids: [id] });
                  }
                }
              }
              // Handle object format: {event: 'event_name', ...params}
              else if (arg.event) {
                const eventName = arg.event;

                // Skip internal GTM events
                if (typeof eventName === 'string' && !eventName.startsWith('gtm.')) {
                  // Clone the entire object for display
                  const clonedData = cloneEventData(arg);

                  dispatchEvent('__opsiq_event__', {
                    source: 'dataLayer',
                    name: eventName,
                    data: clonedData
                  });
                }
              }
            }
          }

          return originalPush(...args);
        };

        window.dataLayer.__opsiq = true;

        // Process existing dataLayer entries for tracking IDs
        for (const item of window.dataLayer) {
          if (item && typeof item === 'object') {
            if (Array.isArray(item) && item[0] === 'config' && item[1]) {
              const id = String(item[1]).toUpperCase();
              if (id.startsWith('G-')) {
                dispatchEvent('__opsiq_tracking__', { type: 'ga4', ids: [id] });
              } else if (id.startsWith('AW-')) {
                dispatchEvent('__opsiq_tracking__', { type: 'gads', ids: [id] });
              } else if (id.startsWith('GTM-')) {
                dispatchEvent('__opsiq_tracking__', { type: 'gtm', ids: [id] });
              }
            }
          }
        }
      }
    }, 100);

    // Stop checking after 10 seconds
    setTimeout(() => clearInterval(checkDataLayer), 10000);
  }

  // Intercept gtag function
  function interceptGtag() {
    const checkGtag = setInterval(() => {
      if (typeof window.gtag === 'function' && !window.gtag.__opsiq) {
        clearInterval(checkGtag);

        const originalGtag = window.gtag;

        window.gtag = function(...args) {
          const [command, eventNameOrId, params] = args;

          if (command === 'event') {
            dispatchEvent('__opsiq_event__', {
              source: 'gtag',
              name: eventNameOrId,
              data: cloneEventData(params || {})
            });
          } else if (command === 'config' && eventNameOrId) {
            const id = String(eventNameOrId).toUpperCase();
            if (id.startsWith('G-')) {
              dispatchEvent('__opsiq_tracking__', { type: 'ga4', ids: [id] });
            } else if (id.startsWith('AW-')) {
              dispatchEvent('__opsiq_tracking__', { type: 'gads', ids: [id] });
            } else if (id.startsWith('GTM-')) {
              dispatchEvent('__opsiq_tracking__', { type: 'gtm', ids: [id] });
            }
          }

          return originalGtag.apply(this, args);
        };
        window.gtag.__opsiq = true;
      }
    }, 100);

    setTimeout(() => clearInterval(checkGtag), 10000);
  }

  // Intercept Facebook Pixel
  function interceptFbq() {
    const checkFbq = setInterval(() => {
      if (typeof window.fbq === 'function' && !window.fbq.__opsiq) {
        clearInterval(checkFbq);

        const originalFbq = window.fbq;

        // Get existing pixel IDs from various sources
        try {
          if (window.fbq.getState) {
            const state = window.fbq.getState();
            if (state && state.pixels) {
              const ids = state.pixels.map(p => String(p.id));
              if (ids.length > 0) {
                dispatchEvent('__opsiq_tracking__', { type: 'fb', ids });
              }
            }
          }
          // Also check fbq.queue for init calls
          if (window.fbq.queue && Array.isArray(window.fbq.queue)) {
            for (const item of window.fbq.queue) {
              if (item && item[0] === 'init' && item[1]) {
                dispatchEvent('__opsiq_tracking__', { type: 'fb', ids: [String(item[1])] });
              }
            }
          }
          // Check _fbq for older implementations
          if (window._fbq && window._fbq.loaded && window._fbq.getState) {
            const state = window._fbq.getState();
            if (state && state.pixels) {
              const ids = state.pixels.map(p => String(p.id));
              if (ids.length > 0) {
                dispatchEvent('__opsiq_tracking__', { type: 'fb', ids });
              }
            }
          }
        } catch (e) {
          // Ignore errors
        }

        window.fbq = function(...args) {
          const [command, eventNameOrId, params] = args;

          if (command === 'init') {
            dispatchEvent('__opsiq_tracking__', { type: 'fb', ids: [String(eventNameOrId)] });
          } else if (command === 'track' || command === 'trackCustom') {
            dispatchEvent('__opsiq_event__', {
              source: 'fbq',
              name: eventNameOrId,
              data: cloneEventData(params || {})
            });
          }

          return originalFbq.apply(this, args);
        };

        // Copy properties from original
        for (const prop in originalFbq) {
          if (originalFbq.hasOwnProperty(prop)) {
            window.fbq[prop] = originalFbq[prop];
          }
        }
        window.fbq.__opsiq = true;
      }
    }, 100);

    setTimeout(() => clearInterval(checkFbq), 10000);
  }

  // Check for google_tag_manager object
  function checkGoogleTagManager() {
    const check = setInterval(() => {
      if (window.google_tag_manager) {
        const ids = Object.keys(window.google_tag_manager).filter(id => /^GTM-/i.test(id));
        if (ids.length > 0) {
          dispatchEvent('__opsiq_tracking__', { type: 'gtm', ids: ids.map(id => id.toUpperCase()) });
        }
        clearInterval(check);
      }
    }, 500);

    setTimeout(() => clearInterval(check), 10000);
  }

  // Initialize all interceptors
  interceptDataLayer();
  interceptGtag();
  interceptFbq();
  checkGoogleTagManager();
})();
