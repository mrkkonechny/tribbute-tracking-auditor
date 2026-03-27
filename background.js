// opsIQ - background.js
// Service worker: side panel behavior, port relay, page navigation events

chrome.runtime.onInstalled.addListener(() => {
  console.log('opsIQ installed');
});

// Open side panel when toolbar icon is clicked
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

// BUG-0004: Relay panel open/closed status to the correct tab's content script
// Tab ID is established via handshake: panel sends { type: 'PANEL_HANDSHAKE', tabId }
// on the port immediately after connect (see sidepanel.js connectPort).
let activePanelTabId = null;

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'opsiq-panel') return;

  port.onMessage.addListener((message) => {
    if (message.type === 'PANEL_HANDSHAKE' && message.tabId) {
      activePanelTabId = message.tabId;
      chrome.tabs.sendMessage(activePanelTabId, { type: 'PANEL_OPEN' }).catch(() => {});
    }
  });

  port.onDisconnect.addListener(() => {
    if (activePanelTabId) {
      chrome.tabs.sendMessage(activePanelTabId, { type: 'PANEL_CLOSED' }).catch(() => {});
      activePanelTabId = null;
    }
  });
});

// Page navigation boundary markers: notify side panel when navigation completes
// Only fires for the tab the panel is currently attached to.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tabId === activePanelTabId) {
    chrome.runtime.sendMessage({
      type: 'PAGE_NAVIGATED',
      url: tab.url,
      tabId
    }).catch(() => {});
    // Two expected failure modes:
    // 1. Side panel is closed — message has no listener, silently ignored.
    // 2. Content script not yet re-injected after navigation — sendMessage target
    //    is the content script, not the side panel; content.js handles boundary markers.
    //    The content script re-runs at document_start so it's ready before 'complete'.
  }
});
