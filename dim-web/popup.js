document.addEventListener('DOMContentLoaded', () => {
    const slider = document.getElementById('brightnessSlider');
    const brightnessValue = document.getElementById('brightnessValue');
  
    // Load saved brightness with error handling
    chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
      const tab = tabs[0];
      const tabId = tab.id;
      
      // Skip restricted URLs (chrome://, edge://, etc.)
      if (!tab.url?.startsWith('http')) {
        slider.disabled = true;
        brightnessValue.textContent = 'N/A';
        return;
      }
  
      try {
        // Ensure content script is injected
        await chrome.scripting.executeScript({
          target: {tabId},
          files: ['content.js']
        });
  
        // Load settings
        const {brightnessSettings} = await chrome.storage.local.get(['brightnessSettings']);
        const currentBrightness = brightnessSettings?.[tabId] ?? 100;
        
        slider.value = currentBrightness;
        brightnessValue.textContent = `${currentBrightness}%`;
        
        // Initialize brightness
        await chrome.tabs.sendMessage(tabId, {
          action: "setBrightness",
          brightness: currentBrightness
        });
        
      } catch (error) {
        console.log('Initialization error:', error);
      }
    });
  
    // Handle slider input with error handling
    slider.addEventListener('input', async (e) => {
      const value = parseInt(e.target.value);
      brightnessValue.textContent = `${value}%`;
  
      chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
        const tabId = tabs[0].id;
        
        try {
          // Update storage
          const {brightnessSettings} = await chrome.storage.local.get(['brightnessSettings']);
          const newSettings = {...brightnessSettings, [tabId]: value};
          await chrome.storage.local.set({brightnessSettings: newSettings});
  
          // Send update
          await chrome.tabs.sendMessage(tabId, {
            action: "setBrightness",
            brightness: value
          });
          
        } catch (error) {
          console.log('Update error:', error);
        }
      });
    });
  });