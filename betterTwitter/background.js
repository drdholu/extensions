chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('betterX: Extension installed/updated', details);
    
    if (details.reason === 'install') {
        await setDefaultSettings();
        
        console.log('betterX: First time installation completed');
    } else if (details.reason === 'update') {
        console.log('betterX: Extension updated to version', chrome.runtime.getManifest().version);
        await migrateSettings(details.previousVersion);
    }
});

// Set default settings
async function setDefaultSettings() {
    try {
        const defaultSettings = {
            selectedFont: 'default',
            selectedFontType: 'builtin',
            fontSize: 16
        };
        
        const existing = await chrome.storage.sync.get(['selectedFont']);
        if (!existing.selectedFont) {
            await chrome.storage.sync.set(defaultSettings);
            console.log('betterX: Default settings applied');
        }
    } catch (error) {
        console.error('betterX: Error setting default settings', error);
    }
}

// Migrate settings for extension updates
async function migrateSettings(previousVersion) {
    try {
        console.log(`betterX: Migration check for version ${previousVersion} to ${chrome.runtime.getManifest().version}`);
        
    } catch (error) {
        console.error('betterX: Error during migration', error);
    }
}

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('betterX: Received message', message);
    
    switch (message.action) {
        case 'getSettings':
            handleGetSettings(sendResponse);
            return true; // Async response
            
        case 'saveSettings':
            handleSaveSettings(message.settings, sendResponse);
            return true; // Async response
            
        case 'getFontData':
            handleGetFontData(message.fontId, sendResponse);
            return true; // Async response
            
        case 'cleanupFonts':
            handleCleanupFonts(sendResponse);
            return true; // Async response
            
        default:
            console.warn('betterX: Unknown message action', message.action);
    }
});

// Get current settings
async function handleGetSettings(sendResponse) {
    try {
        const syncData = await chrome.storage.sync.get(['selectedFont', 'selectedFontType']);
        const localData = await chrome.storage.local.get(['customFonts']);
        
        sendResponse({
            success: true,
            settings: syncData,
            customFonts: localData.customFonts || {}
        });
    } catch (error) {
        console.error('betterX: Error getting settings', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Save settings
async function handleSaveSettings(settings, sendResponse) {
    try {
        await chrome.storage.sync.set(settings);
        
        // Notify all X.com tabs about the change
        const tabs = await chrome.tabs.query({
            url: ['*://x.com/*']
        });
        
        for (const tab of tabs) {
            try {
                await chrome.tabs.sendMessage(tab.id, {
                    action: 'applyFont',
                    font: settings.selectedFont,
                    fontType: settings.selectedFontType
                });
            } catch (error) {
                // Tab might not have content script loaded yet
                console.log('betterX: Could not send message to tab', tab.id);
            }
        }
        
        sendResponse({ success: true });
    } catch (error) {
        console.error('betterX: Error saving settings', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Get font data for a specific font ID
async function handleGetFontData(fontId, sendResponse) {
    try {
        const result = await chrome.storage.local.get(['customFonts']);
        const customFonts = result.customFonts || {};
        const fontData = customFonts[fontId];
        
        if (fontData) {
            sendResponse({ success: true, fontData });
        } else {
            sendResponse({ success: false, error: 'Font not found' });
        }
    } catch (error) {
        console.error('betterX: Error getting font data', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Cleanup old or unused fonts
async function handleCleanupFonts(sendResponse) {
    try {
        const result = await chrome.storage.local.get(['customFonts']);
        const customFonts = result.customFonts || {};
        
        // Remove fonts older than 30 days if storage is getting full
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        let cleaned = 0;
        const cleanedFonts = {};
        
        for (const [fontId, fontData] of Object.entries(customFonts)) {
            const uploadDate = new Date(fontData.uploadDate);
            if (uploadDate > thirtyDaysAgo) {
                cleanedFonts[fontId] = fontData;
            } else {
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            await chrome.storage.local.set({ customFonts: cleanedFonts });
            console.log(`betterX: Cleaned up ${cleaned} old fonts`);
        }
        
        sendResponse({ success: true, cleaned });
    } catch (error) {
        console.error('betterX: Error cleaning up fonts', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Handle storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    console.log('betterX: Storage changed', changes, namespace);
    
    // If font settings changed, update all X.com tabs
    if (namespace === 'sync' && (changes.selectedFont || changes.selectedFontType || changes.fontSize)) {
        updateAllTwitterTabs();
    }
});

// Update all X.com tabs with current font settings
async function updateAllTwitterTabs() {
    try {
        const settings = await chrome.storage.sync.get(['selectedFont', 'selectedFontType']);
        const tabs = await chrome.tabs.query({
            url: ['*://x.com/*']
        });
        
        for (const tab of tabs) {
            try {
                await chrome.tabs.sendMessage(tab.id, {
                    action: 'applyFont',
                    font: settings.selectedFont || 'default',
                    fontType: settings.selectedFontType || 'builtin'
                });
            } catch (error) {
                // Content script might not be ready
                console.log('betterX: Could not update tab', tab.id);
            }
        }
    } catch (error) {
        console.error('betterX: Error updating tabs', error);
    }
}

// Handle tab updates (when user navigates to X.com)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes('x.com')) {
        
        // Small delay to ensure content script is loaded
        setTimeout(async () => {
            try {
                const settings = await chrome.storage.sync.get(['selectedFont', 'selectedFontType']);
                
                await chrome.tabs.sendMessage(tabId, {
                    action: 'applyFont',
                    font: settings.selectedFont || 'default',
                    fontType: settings.selectedFontType || 'builtin'
                });
            } catch (error) {
                // Content script might not be ready yet
                console.log('betterX: Content script not ready for tab', tabId);
            }
        }, 1000);
    }
});

// Periodic cleanup of storage (guarded for optional alarms permission)
if (chrome.alarms) {
    chrome.alarms.create('cleanupFonts', { delayInMinutes: 60, periodInMinutes: 1440 }); // Daily cleanup

    chrome.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === 'cleanupFonts') {
            handleCleanupFonts(() => {});
        }
    });
}

console.log('betterX: Background script loaded');
