// opsIQ - Content Script
// This script detects tracking implementations, schema data, and monitors events

(function() {
  'use strict';

  // Storage for detected tracking and events
  const trackingData = {
    gtm: [],
    ga4: [],
    gads: [],
    fb: []
  };

  const capturedEvents = [];
  let schemaData = [];
  let isPopupOpen = false;
  let isContextValid = true;

  // Check if extension context is still valid
  function checkContext() {
    try {
      return chrome.runtime?.id != null;
    } catch (e) {
      return false;
    }
  }

  // Safe wrapper for chrome.runtime.sendMessage
  function safeSendMessage(message) {
    if (!isContextValid) return Promise.resolve();

    try {
      if (!checkContext()) {
        isContextValid = false;
        return Promise.resolve();
      }
      return chrome.runtime.sendMessage(message).catch(() => {
        // Context may have been invalidated
        isContextValid = false;
      });
    } catch (e) {
      isContextValid = false;
      return Promise.resolve();
    }
  }

  // Inject the interceptor script into the page context
  function injectInterceptor() {
    // Try external script first
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('injected.js');
    script.onload = function() {
      this.remove();
    };
    script.onerror = function() {
      // CSP blocked external script, try inline injection
      this.remove();
      injectInlineScript();
    };
    (document.head || document.documentElement).appendChild(script);
  }

  // Fallback: inject script content directly (may also be blocked by strict CSP)
  function injectInlineScript() {
    try {
      const script = document.createElement('script');
      script.textContent = `(${injectedScriptContent.toString()})();`;
      (document.head || document.documentElement).appendChild(script);
      script.remove();
    } catch (e) {
      console.log('opsIQ: Could not inject interceptor script');
    }
  }

  // Inline version of the interceptor for CSP fallback
  function injectedScriptContent() {
    function dispatchEvent(type, detail) {
      window.dispatchEvent(new CustomEvent(type, { detail }));
    }

    function cloneData(data, depth) {
      if (depth > 4) return '[depth]';
      if (data === null || data === undefined) return data;
      if (typeof data === 'function') return '[fn]';
      if (typeof data !== 'object') return data;
      if (data instanceof Date) return data.toISOString();
      if (Array.isArray(data)) return data.slice(0, 20).map(function(i) { return cloneData(i, depth + 1); });
      var result = {};
      var keys = Object.keys(data).slice(0, 20);
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (k.startsWith('_') || k === 'gtm.uniqueEventId') continue;
        try { result[k] = cloneData(data[k], depth + 1); } catch(e) { result[k] = '[err]'; }
      }
      return result;
    }

    // Intercept dataLayer
    var checkDL = setInterval(function() {
      if (window.dataLayer && Array.isArray(window.dataLayer) && !window.dataLayer.__opsiq) {
        clearInterval(checkDL);
        var origPush = window.dataLayer.push.bind(window.dataLayer);
        window.dataLayer.push = function() {
          for (var i = 0; i < arguments.length; i++) {
            var arg = arguments[i];
            if (arg && typeof arg === 'object') {
              if (Array.isArray(arg) && arg[0] === 'event') {
                dispatchEvent('__opsiq_event__', { source: 'dataLayer', name: arg[1] || 'unknown', data: cloneData(arg[2] || {}, 0) });
              } else if (arg.event && typeof arg.event === 'string' && !arg.event.startsWith('gtm.')) {
                dispatchEvent('__opsiq_event__', { source: 'dataLayer', name: arg.event, data: cloneData(arg, 0) });
              }
            }
          }
          return origPush.apply(window.dataLayer, arguments);
        };
        window.dataLayer.__opsiq = true;
      }
    }, 100);
    setTimeout(function() { clearInterval(checkDL); }, 10000);

    // Intercept gtag
    var checkGtag = setInterval(function() {
      if (typeof window.gtag === 'function' && !window.gtag.__opsiq) {
        clearInterval(checkGtag);
        var origGtag = window.gtag;
        window.gtag = function(cmd, name, params) {
          if (cmd === 'event') {
            dispatchEvent('__opsiq_event__', { source: 'gtag', name: name, data: cloneData(params || {}, 0) });
          } else if (cmd === 'config' && name) {
            var id = String(name).toUpperCase();
            if (id.startsWith('G-')) dispatchEvent('__opsiq_tracking__', { type: 'ga4', ids: [id] });
            else if (id.startsWith('AW-')) dispatchEvent('__opsiq_tracking__', { type: 'gads', ids: [id] });
          }
          return origGtag.apply(this, arguments);
        };
        window.gtag.__opsiq = true;
      }
    }, 100);
    setTimeout(function() { clearInterval(checkGtag); }, 10000);

    // Intercept fbq
    var checkFbq = setInterval(function() {
      if (typeof window.fbq === 'function' && !window.fbq.__opsiq) {
        clearInterval(checkFbq);
        var origFbq = window.fbq;
        window.fbq = function(cmd, name, params) {
          if (cmd === 'init') dispatchEvent('__opsiq_tracking__', { type: 'fb', ids: [String(name)] });
          else if (cmd === 'track' || cmd === 'trackCustom') {
            dispatchEvent('__opsiq_event__', { source: 'fbq', name: name, data: cloneData(params || {}, 0) });
          }
          return origFbq.apply(this, arguments);
        };
        for (var p in origFbq) { if (origFbq.hasOwnProperty(p)) window.fbq[p] = origFbq[p]; }
        window.fbq.__opsiq = true;
      }
    }, 100);
    setTimeout(function() { clearInterval(checkFbq); }, 10000);

    // Check google_tag_manager object
    var checkGTM = setInterval(function() {
      if (window.google_tag_manager) {
        var ids = Object.keys(window.google_tag_manager).filter(function(id) { return /^GTM-/i.test(id); });
        if (ids.length > 0) dispatchEvent('__opsiq_tracking__', { type: 'gtm', ids: ids.map(function(id) { return id.toUpperCase(); }) });
        clearInterval(checkGTM);
      }
    }, 500);
    setTimeout(function() { clearInterval(checkGTM); }, 10000);
  }

  // Listen for events from the injected script
  window.addEventListener('__opsiq_event__', function(e) {
    if (!isContextValid) return;

    const eventData = e.detail;
    eventData.timestamp = new Date().toISOString();
    capturedEvents.push(eventData);

    // Send to popup if open
    if (isPopupOpen) {
      safeSendMessage({
        type: 'NEW_EVENT',
        event: eventData
      }).then(() => {}).catch(() => {
        isPopupOpen = false;
      });
    }
  });

  // Listen for tracking detection from injected script
  window.addEventListener('__opsiq_tracking__', function(e) {
    if (!isContextValid) return;

    const data = e.detail;
    if (data.type && data.ids) {
      trackingData[data.type] = [...new Set([...trackingData[data.type], ...data.ids])];
    }
  });

  // Scan for tracking scripts in the DOM
  function scanForTrackingScripts() {
    const scripts = document.getElementsByTagName('script');

    for (const script of scripts) {
      const src = script.src || '';
      const content = script.textContent || '';

      // GTM detection - case insensitive
      const gtmMatch = src.match(/googletagmanager\.com\/gtm\.js\?id=(GTM-[A-Za-z0-9]+)/i);
      if (gtmMatch) {
        trackingData.gtm.push(gtmMatch[1].toUpperCase());
      }

      // GA4 detection from script src - case insensitive
      const ga4Match = src.match(/googletagmanager\.com\/gtag\/js\?id=(G-[A-Za-z0-9]+)/i);
      if (ga4Match) {
        trackingData.ga4.push(ga4Match[1].toUpperCase());
      }

      // Also check for UA/GA4 IDs in src with different patterns
      const gtagSrcMatch = src.match(/[?&]id=(G-[A-Za-z0-9]+|GTM-[A-Za-z0-9]+|AW-[A-Za-z0-9]+)/i);
      if (gtagSrcMatch) {
        const id = gtagSrcMatch[1].toUpperCase();
        if (id.startsWith('G-')) trackingData.ga4.push(id);
        else if (id.startsWith('GTM-')) trackingData.gtm.push(id);
        else if (id.startsWith('AW-')) trackingData.gads.push(id);
      }

      // GA4/Google Ads detection from inline gtag config
      const gtagConfigMatches = content.matchAll(/gtag\s*\(\s*['"]config['"]\s*,\s*['"]([^'"]+)['"]/gi);
      for (const match of gtagConfigMatches) {
        const id = match[1].toUpperCase();
        if (id.startsWith('G-')) {
          trackingData.ga4.push(id);
        } else if (id.startsWith('AW-')) {
          trackingData.gads.push(id);
        } else if (id.startsWith('GTM-')) {
          trackingData.gtm.push(id);
        }
      }

      // Google Ads conversion tracking
      const awMatch = src.match(/googleadservices\.com.*conversion.*id=(\d+)/i);
      if (awMatch) {
        trackingData.gads.push('AW-' + awMatch[1]);
      }

      // Also look for AW- IDs in inline scripts
      const awInlineMatches = content.matchAll(/['"]?(AW-[A-Za-z0-9]+)['"]?/gi);
      for (const match of awInlineMatches) {
        trackingData.gads.push(match[1].toUpperCase());
      }

      // Facebook Pixel detection - look for any FB pixel script
      if (src.includes('connect.facebook.net') || src.includes('fbevents.js')) {
        // FB pixel is loaded, ID will come from inline or injected script
      }

      // FB Pixel ID from inline script - multiple patterns
      const fbInitMatches = content.matchAll(/fbq\s*\(\s*['"]init['"]\s*,\s*['"]?(\d+)['"]?/gi);
      for (const match of fbInitMatches) {
        trackingData.fb.push(match[1]);
      }

      // Also check for FB pixel ID in other patterns
      const fbIdMatches = content.matchAll(/(?:pixel|pixelId|facebook_pixel_id)\s*[=:]\s*['"]?(\d{10,20})['"]?/gi);
      for (const match of fbIdMatches) {
        trackingData.fb.push(match[1]);
      }
    }

    // Also scan for network requests that might have tracking IDs
    scanNetworkHints();

    // Deduplicate
    trackingData.gtm = [...new Set(trackingData.gtm)];
    trackingData.ga4 = [...new Set(trackingData.ga4)];
    trackingData.gads = [...new Set(trackingData.gads)];
    trackingData.fb = [...new Set(trackingData.fb)];
  }

  // Look for hints in iframes, img tags, and other elements
  function scanNetworkHints() {
    // Check iframes
    const iframes = document.getElementsByTagName('iframe');
    for (const iframe of iframes) {
      const src = iframe.src || '';

      // GTM preview iframe
      const gtmMatch = src.match(/googletagmanager\.com.*[?&]id=(GTM-[A-Za-z0-9]+)/i);
      if (gtmMatch) trackingData.gtm.push(gtmMatch[1].toUpperCase());

      // FB pixel iframe
      const fbMatch = src.match(/facebook\.com.*[?&]id=(\d+)/i);
      if (fbMatch) trackingData.fb.push(fbMatch[1]);
    }

    // Check noscript tags
    const noscripts = document.getElementsByTagName('noscript');
    for (const ns of noscripts) {
      const content = ns.innerHTML || '';

      // GTM noscript
      const gtmMatch = content.match(/googletagmanager\.com.*[?&]id=(GTM-[A-Za-z0-9]+)/i);
      if (gtmMatch) trackingData.gtm.push(gtmMatch[1].toUpperCase());

      // FB pixel noscript
      const fbMatch = content.match(/facebook\.com.*[?&]id=(\d+)/i);
      if (fbMatch) trackingData.fb.push(fbMatch[1]);
    }

    // Check img tags for tracking pixels
    const imgs = document.getElementsByTagName('img');
    for (const img of imgs) {
      const src = img.src || '';

      // FB pixel img
      const fbMatch = src.match(/facebook\.com\/tr.*[?&]id=(\d+)/i);
      if (fbMatch) trackingData.fb.push(fbMatch[1]);

      // Google Ads conversion img
      const awMatch = src.match(/googleadservices\.com.*conversion\/(\d+)/i);
      if (awMatch) trackingData.gads.push('AW-' + awMatch[1]);
    }
  }

  // Initial scan when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      injectInterceptor();
      scanForTrackingScripts();
    });
  } else {
    injectInterceptor();
    scanForTrackingScripts();
  }

  // Re-scan after a delay to catch dynamically loaded scripts
  setTimeout(scanForTrackingScripts, 2000);
  setTimeout(scanForTrackingScripts, 5000);

  // ============================================
  // SCHEMA DATA DETECTION
  // ============================================

  function scanForSchemaData() {
    schemaData = [];

    // 1. Scan for JSON-LD schema (most common)
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    jsonLdScripts.forEach((script, index) => {
      try {
        const content = script.textContent.trim();
        if (content) {
          const parsed = JSON.parse(content);

          // Helper to add a schema item
          const addSchema = (schema, source) => {
            if (schema && typeof schema === 'object' && schema['@type']) {
              schemaData.push({
                format: 'JSON-LD',
                type: Array.isArray(schema['@type']) ? schema['@type'].join(', ') : schema['@type'],
                data: schema,
                source: source
              });
            }
          };

          // Handle @graph arrays (common in Shopify, WordPress, etc.)
          if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
            parsed['@graph'].forEach((schema, i) => {
              addSchema(schema, `script[${index}]/@graph[${i}]`);
            });
          }
          // Handle arrays of schemas
          else if (Array.isArray(parsed)) {
            parsed.forEach((schema, i) => {
              addSchema(schema, `script[${index}][${i}]`);
            });
          }
          // Handle single schema object
          else if (parsed['@type']) {
            addSchema(parsed, `script[${index}]`);
          }
          // Handle object without @type but with nested schemas
          else if (typeof parsed === 'object') {
            // Check for any nested objects with @type
            for (const key of Object.keys(parsed)) {
              if (parsed[key] && typeof parsed[key] === 'object' && parsed[key]['@type']) {
                addSchema(parsed[key], `script[${index}]/${key}`);
              }
            }
          }
        }
      } catch (e) {
        // Invalid JSON - record as error
        schemaData.push({
          format: 'JSON-LD',
          type: 'PARSE_ERROR',
          data: { error: e.message, raw: script.textContent.substring(0, 500) },
          source: `script[${index}]`
        });
      }
    });

    // 2. Scan for Microdata
    const microdataElements = document.querySelectorAll('[itemscope]');
    microdataElements.forEach((element, index) => {
      const itemType = element.getAttribute('itemtype') || '';
      const typeName = itemType.split('/').pop() || 'Unknown';

      // Extract properties
      const properties = {};
      const propElements = element.querySelectorAll('[itemprop]');
      propElements.forEach(prop => {
        const propName = prop.getAttribute('itemprop');
        let propValue = prop.getAttribute('content') ||
                       prop.getAttribute('href') ||
                       prop.getAttribute('src') ||
                       prop.textContent?.trim();

        if (propName && propValue) {
          // Handle multiple values for same property
          if (properties[propName]) {
            if (Array.isArray(properties[propName])) {
              properties[propName].push(propValue);
            } else {
              properties[propName] = [properties[propName], propValue];
            }
          } else {
            properties[propName] = propValue;
          }
        }
      });

      schemaData.push({
        format: 'Microdata',
        type: typeName,
        data: {
          '@type': typeName,
          '@itemtype': itemType,
          ...properties
        },
        source: `element[${index}]`
      });
    });

    // 3. Scan for RDFa (basic detection)
    const rdfaElements = document.querySelectorAll('[typeof]');
    rdfaElements.forEach((element, index) => {
      const typeName = element.getAttribute('typeof') || 'Unknown';

      // Extract properties
      const properties = {};
      const propElements = element.querySelectorAll('[property]');
      propElements.forEach(prop => {
        const propName = prop.getAttribute('property');
        let propValue = prop.getAttribute('content') ||
                       prop.getAttribute('href') ||
                       prop.textContent?.trim();

        if (propName && propValue) {
          properties[propName] = propValue;
        }
      });

      schemaData.push({
        format: 'RDFa',
        type: typeName,
        data: {
          '@type': typeName,
          ...properties
        },
        source: `rdfa[${index}]`
      });
    });

    return schemaData;
  }

  // Initial schema scan when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scanForSchemaData);
  } else {
    scanForSchemaData();
  }

  // Re-scan schema after delay for dynamic content
  setTimeout(scanForSchemaData, 2000);

  // Listen for messages from popup
  // Only add listener if context is valid
  if (checkContext()) {
    try {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (!isContextValid || !checkContext()) {
          isContextValid = false;
          return false;
        }

        if (message.type === 'GET_TRACKING_DATA') {
          isPopupOpen = true;
          scanForTrackingScripts(); // Re-scan when popup opens
          sendResponse({
            tracking: trackingData,
            events: capturedEvents
          });
          return true;
        }

        if (message.type === 'GET_SCHEMA_DATA') {
          scanForSchemaData(); // Re-scan when requested
          sendResponse({
            schema: schemaData
          });
          return true;
        }

        if (message.type === 'POPUP_CLOSED') {
          isPopupOpen = false;
          return true;
        }

        if (message.type === 'CLEAR_EVENTS') {
          capturedEvents.length = 0;
          sendResponse({ success: true });
          return true;
        }
      });
    } catch (e) {
      isContextValid = false;
    }
  }
})();
