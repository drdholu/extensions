document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('toggleBtn');

  const DEFAULT_SETTINGS = {
    enabled: true,
    theme: 'default'
  };

  // Helper: save settings
  function saveSettings(settings, callback) {
    chrome.storage.sync.set({ extensionSettings: settings }, callback);
  }

  // Helper: notify all tabs to refresh styles
  function notifyTabs() {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id && tab.url && /\.pdf(\?|#|$)/i.test(tab.url)) {
          chrome.tabs.sendMessage(tab.id, { action: 'refreshStyles' }, () => {
            if (chrome.runtime.lastError) {
              // No listener in this tab (non-PDF), ignore
            }
          });
        }
      });
    });
  }

  // Load settings
  chrome.storage.sync.get({ extensionSettings: DEFAULT_SETTINGS }, (res) => {
    const settings = res.extensionSettings;
    toggleBtn.textContent = settings.enabled ? 'Disable Extension' : 'Enable Extension';
  });

  // Toggle extension
  toggleBtn.addEventListener('click', () => {
    chrome.storage.sync.get({ extensionSettings: DEFAULT_SETTINGS }, (res) => {
      const settings = res.extensionSettings;
      settings.enabled = !settings.enabled;
      saveSettings(settings, () => {
        notifyTabs();
        toggleBtn.textContent = settings.enabled ? 'Disable Extension' : 'Enable Extension';
      });
    });
  });
});