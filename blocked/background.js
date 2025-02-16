chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getBrightness') {
      const tabId = sender.tab.id;
      chrome.storage.local.get(['brightnessSettings'], (result) => {
        const settings = result.brightnessSettings || {};
        sendResponse({ brightness: settings[tabId] ?? 100 });
      });
      return true; // Keep message channel open
    }
  });