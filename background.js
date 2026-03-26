// opsIQ - background.js
// Service worker: side panel behavior, port relay, page navigation events

chrome.runtime.onInstalled.addListener(() => {
  console.log('opsIQ installed');
});

// Open side panel when toolbar icon is clicked
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// BUG-0004: Relay panel open/closed status to the active tab's content script
// Content scripts cannot use chrome.runtime.onConnect — background must relay.
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'opsiq-panel') return;

  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'PANEL_OPEN' }).catch(() => {});
    }
  });

  port.onDisconnect.addListener(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'PANEL_CLOSED' }).catch(() => {});
      }
    });
  });
});

// Page navigation boundary markers: notify side panel when navigation completes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    chrome.runtime.sendMessage({
      type: 'PAGE_NAVIGATED',
      url: tab.url,
      tabId
    }).catch(() => {}); // side panel may not be open
  }
});
