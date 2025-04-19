// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // If content script is asking for its tab ID
    if (message.action === 'getTabId') {
        sendResponse({ tabId: sender.tab.id });
        return true;
    }
    
    // If popup is asking for the volume setting
    if (message.action === 'getVolume') {
        const tabId = sender.tab.id;
        chrome.storage.local.get(['volumeSettings'], (result) => {
            const settings = result.volumeSettings || {};
            sendResponse({ volume: settings[tabId] ?? 100 });
        });
        return true; // Keep message channel open for async response
    }
});

// Listen for tab updates to ensure content script is injected
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Only proceed if the tab has completed loading and has a valid URL
    if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
        // Try to inject the content script
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
        }).catch(error => {
            console.log(`Failed to inject content script into tab ${tabId}:`, error);
        });
    }
});
