document.addEventListener('DOMContentLoaded', () => {
    const slider = document.getElementById('volumeSlider');
    const volumeValue = document.getElementById('volumeValue');
    const decreaseBtn = document.getElementById('decreaseVolume');
    const increaseBtn = document.getElementById('increaseVolume');
    const resetBtn = document.getElementById('resetVolume');
    const statusMessage = document.getElementById('statusMessage');
    
    // Step size for volume buttons
    const VOLUME_STEP = 10;
    
    // Load saved volume with error handling
    chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
        const tab = tabs[0];
        const tabId = tab.id;
        
        // Skip restricted URLs (chrome://, edge://, etc.)
        if (!tab.url?.startsWith('http')) {
            slider.disabled = true;
            volumeValue.textContent = 'N/A';
            showStatus('Volume control not available on this page', true);
            return;
        }
        
        try {
            // Ensure content script is injected
            await chrome.scripting.executeScript({
                target: {tabId},
                files: ['content.js']
            });
            
            // Load settings
            const {volumeSettings} = await chrome.storage.local.get(['volumeSettings']);
            const currentVolume = volumeSettings?.[tabId] ?? 100;
            
            slider.value = currentVolume;
            volumeValue.textContent = `${currentVolume}%`;
            
            // Initialize volume
            await chrome.tabs.sendMessage(tabId, {
                action: "setVolume",
                volume: currentVolume
            });
            
        } catch (error) {
            console.log('Initialization error:', error);
            showStatus('Failed to initialize volume control', true);
        }
    });
    
    // Handle slider input with error handling
    slider.addEventListener('input', async (e) => {
        const value = parseInt(e.target.value);
        volumeValue.textContent = `${value}%`;
        
        chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
            const tabId = tabs[0].id;
            
            try {
                // Update storage
                const {volumeSettings} = await chrome.storage.local.get(['volumeSettings']);
                const newSettings = {...volumeSettings, [tabId]: value};
                await chrome.storage.local.set({volumeSettings: newSettings});
                
                // Send update
                await chrome.tabs.sendMessage(tabId, {
                    action: "setVolume",
                    volume: value
                });
                
            } catch (error) {
                console.log('Update error:', error);
                showStatus('Failed to update volume', true);
            }
        });
    });
    
    // Handle decrease button
    decreaseBtn.addEventListener('click', () => {
        const newValue = Math.max(parseInt(slider.value) - VOLUME_STEP, parseInt(slider.min));
        slider.value = newValue;
        volumeValue.textContent = `${newValue}%`;
        
        // Trigger the input event to update the volume
        const event = new Event('input', { bubbles: true });
        slider.dispatchEvent(event);
    });
    
    // Handle increase button
    increaseBtn.addEventListener('click', () => {
        const newValue = Math.min(parseInt(slider.value) + VOLUME_STEP, parseInt(slider.max));
        slider.value = newValue;
        volumeValue.textContent = `${newValue}%`;
        
        // Trigger the input event to update the volume
        const event = new Event('input', { bubbles: true });
        slider.dispatchEvent(event);
    });
    
    // Handle reset button
    resetBtn.addEventListener('click', () => {
        slider.value = 100;
        volumeValue.textContent = '100%';
        
        // Trigger the input event to update the volume
        const event = new Event('input', { bubbles: true });
        slider.dispatchEvent(event);
    });
    
    // Helper function to show status messages
    function showStatus(message, isError = false) {
        statusMessage.textContent = message;
        statusMessage.style.display = 'block';
        
        if (isError) {
            statusMessage.classList.add('error');
        } else {
            statusMessage.classList.remove('error');
        }
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, 3000);
    }
});
