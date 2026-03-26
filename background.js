// opsIQ - Background Service Worker

// Forward messages between popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'NEW_EVENT') {
    // Forward event to popup if it's open
    // The popup listens for this directly, so we just need to handle any errors
    return false;
  }
  return false;
});

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('opsIQ installed');
  } else if (details.reason === 'update') {
    console.log('opsIQ updated');
  }
});
