(function() {
    // Keep track of all media elements and their audio contexts
    let mediaElements = [];
    const audioContexts = new Map();
    const gainNodes = new Map();

    // Create audio context
    function createAudioContext() {
        return new (window.AudioContext || window.webkitAudioContext)();
    }

    // Function to find all media elements on the page
    function findMediaElements() {
        const audioElements = Array.from(document.querySelectorAll('audio'));
        const videoElements = Array.from(document.querySelectorAll('video'));

        // Combine all media elements
        const newElements = [...audioElements, ...videoElements].filter(el => !mediaElements.includes(el));

        // Set up audio context for new elements
        newElements.forEach(setupAudioBoost);

        // Add new elements to our tracked list
        mediaElements = [...mediaElements, ...newElements];

        return mediaElements.length;
    }

    // Set up audio boost for a media element
    function setupAudioBoost(element) {
        try {
            // Skip if already set up
            if (audioContexts.has(element)) return;

            // Create audio context and nodes
            const audioCtx = createAudioContext();
            const source = audioCtx.createMediaElementSource(element);
            const gainNode = audioCtx.createGain();

            // Connect the nodes
            source.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            // Store references
            audioContexts.set(element, audioCtx);
            gainNodes.set(element, gainNode);

            // Set initial gain to 1 (100%)
            gainNode.gain.value = 1;

            // Mute the original element since we're routing through our audio graph
            element.volume = 1;
        } catch (error) {
            console.error('Error setting up audio boost:', error);
        }
    }

    // Function to apply volume to all media elements
    function applyVolume(volumePercent) {
        // Find media elements if we haven't already
        if (mediaElements.length === 0) {
            findMediaElements();
        }

        // Apply volume to all found media elements
        mediaElements.forEach(element => {
            try {
                if (volumePercent <= 100) {
                    // For normal volume (0-100%), use the standard volume property
                    // and reset gain to 1
                    if (gainNodes.has(element)) {
                        gainNodes.get(element).gain.value = 1;
                    }
                    element.volume = volumePercent / 100;
                } else {
                    // For boosted volume (>100%), set volume to 1 and use gain node
                    element.volume = 1;

                    // Set up audio boost if not already done
                    if (!gainNodes.has(element)) {
                        setupAudioBoost(element);
                    }

                    // Calculate gain (1.0 = 100%, 2.0 = 200%, etc.)
                    const gainValue = volumePercent / 100;
                    if (gainNodes.has(element)) {
                        gainNodes.get(element).gain.value = gainValue;
                    }
                }
            } catch (error) {
                console.error('Error applying volume:', error);
            }
        });

        return mediaElements.length;
    }

    // Listen for messages from the popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'setVolume') {
            const count = applyVolume(request.volume);
            sendResponse({ success: true, count: count });
        } else if (request.action === 'getMediaCount') {
            const count = findMediaElements();
            sendResponse({ count: count });
        }
        return true; // Keep the message channel open for async response
    });

    // Initial scan for media elements
    findMediaElements();

    // Set up a MutationObserver to detect new media elements
    const observer = new MutationObserver(mutations => {
        let mediaAdded = false;

        mutations.forEach(mutation => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    // Check if the added node is a media element or contains media elements
                    if (node.nodeName === 'AUDIO' || node.nodeName === 'VIDEO') {
                        mediaAdded = true;
                    } else if (node.nodeType === 1) { // Element node
                        const audioNodes = node.querySelectorAll('audio');
                        const videoNodes = node.querySelectorAll('video');
                        if (audioNodes.length > 0 || videoNodes.length > 0) {
                            mediaAdded = true;
                        }
                    }
                });
            }
        });

        // If new media elements were added, update our list
        if (mediaAdded) {
            // Get the current volume from storage and apply it to new elements
            chrome.storage.local.get(['volumeSettings'], (result) => {
                chrome.runtime.sendMessage({ action: 'getTabId' }, (response) => {
                    if (response && response.tabId) {
                        const tabId = response.tabId;
                        const settings = result.volumeSettings || {};
                        const currentVolume = settings[tabId] ?? 100;

                        // Update our media elements list and apply the volume
                        findMediaElements();
                        applyVolume(currentVolume);
                    }
                });
            });
        }
    });

    // Start observing the document
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });
})();
