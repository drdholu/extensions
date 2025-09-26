(function() {
    'use strict';
    
    const X_SELECTORS = [
        // Main text content
        '[data-testid="tweetText"]',
        '[data-testid="tweet"] [dir="auto"]',
        '[data-testid="UserCell"] [dir="auto"]',
        '[data-testid="UserName"]',
        '[data-testid="Time"]',
        
        // Compose area
        '[data-testid="tweetTextarea_0"]',
        '[data-testid="tweetButton"]',
        '[data-contents="true"]',
        
        // Navigation and UI
        '[role="button"]',
        '[role="link"]',
        'span',
        'div[dir="auto"]',
        
        // Specific X UI elements
        '.css-901oao',
        '.css-16my406',
        '.css-1dbjc4n',
        
        // Headers and navigation
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'nav',
        
        // Text inputs
        'input[type="text"]',
        'textarea',
        
        // General text elements
        'p', 'span', 'div',
        'button',
        'a'
    ];
    
    let currentFont = 'default';
    let currentFontType = 'builtin';
    // no font-size override
    let customFontStylesheet = null;
    let fontStylesheet = null;
    
    // Initialize
    init();
    
    async function init() {
        console.log('betterX: Initializing...');
        
        await loadSavedSettings();
        
        applyFont();
        
        setupObserver();
        
        console.log('betterX: Initialized');
    }
    
    async function loadSavedSettings() {
        try {
            const result = await chrome.storage.sync.get(['selectedFont', 'selectedFontType']);
            
            if (result.selectedFont) {
                currentFont = result.selectedFont;
            }
            
            if (result.selectedFontType) {
                currentFontType = result.selectedFontType;
            }
            
            // no font size setting
            
            console.log('betterX: Loaded settings', {
                font: currentFont,
                type: currentFontType,
                size: currentFontSize
            });
            
        } catch (error) {
            console.error('betterX: Error loading settings', error);
        }
    }
    
    // Observe DOM changes once body exists
    function setupObserver() {
        if (!document.body) {
            window.addEventListener('DOMContentLoaded', setupObserver, { once: true });
            return;
        }
        const observer = new MutationObserver((mutations) => {
            let shouldReapply = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Check if new text content was added
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
            const hasTextContent = X_SELECTORS.some(selector => {
                                try {
                                    return node.matches && node.matches(selector) || node.querySelector && node.querySelector(selector);
                                } catch (e) {
                                    return false;
                                }
                            });
                            
                            if (hasTextContent) {
                                shouldReapply = true;
                                break;
                            }
                        }
                    }
                }
            });
            
            if (shouldReapply) {
                // Debounce reapplication
                clearTimeout(window.betterXFontsTimeout);
                window.betterXFontsTimeout = setTimeout(() => {
                    applyFont();
                }, 100);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    // Apply font to Twitter elements
    async function applyFont() {
        try {
            // Remove existing stylesheets
            if (fontStylesheet) {
                fontStylesheet.remove();
                fontStylesheet = null;
            }
            
            if (customFontStylesheet) {
                customFontStylesheet.remove();
                customFontStylesheet = null;
            }
            
            let cssRules = '';
            let fontFamily = '';
            
            if (currentFontType === 'builtin') {
                if (currentFont === 'default') {
                    // Keep Twitter's default font; still allow font-size overrides
                    fontFamily = '';
                } else {
                    fontFamily = currentFont;
                }
            } else if (currentFontType === 'custom') {
                // Load custom font
                const customFontData = await loadCustomFont(currentFont);
                if (customFontData) {
                    // Create @font-face rule
                    const fontFaceRule = `
                        @font-face {
                            font-family: "${customFontData.name}";
                            src: url("${customFontData.data}");
                            font-display: swap;
                        }
                    `;
                    
                    // Create custom font stylesheet
                    customFontStylesheet = document.createElement('style');
                    customFontStylesheet.textContent = fontFaceRule;
                    customFontStylesheet.id = 'better-twitter-fonts-custom';
                    document.head.appendChild(customFontStylesheet);
                    
                    fontFamily = `"${customFontData.name}", sans-serif`;
                } else {
                    console.error('betterX: Failed to load custom font');
                    return;
                }
            }
            
            // Create font application rules
            if (fontFamily) {
                const selectors = X_SELECTORS.join(', ');
                const familyRule = fontFamily ? `font-family: ${fontFamily} !important;` : '';
                cssRules = `
                    ${selectors} {
                        ${familyRule}
                    }
                    
                    /* Specific overrides for tweet text */
                    [data-testid="tweetText"] {
                        ${familyRule}
                        line-height: 1.3 !important;
                    }
                    
                    /* Tweet compose area */
                    [data-testid="tweetTextarea_0"] {
                        ${familyRule}
                    }
                    
                    /* Navigation and buttons */
                    nav, [role="button"], [role="link"] {
                        ${familyRule}
                    }
                    
                    /* User names and handles */
                    [data-testid="UserName"], [data-testid="Time"] {
                        ${familyRule}
                    }
                    
                    /* General text elements with higher specificity */
                    body [dir="auto"], body span, body div {
                        ${familyRule}
                    }
                `;
                
                // Create and apply stylesheet
                fontStylesheet = document.createElement('style');
                fontStylesheet.textContent = cssRules;
                fontStylesheet.id = 'better-twitter-fonts-main';
                document.head.appendChild(fontStylesheet);
                
                console.log('betterX: Applied font', fontFamily);
            }
            
        } catch (error) {
            console.error('betterX: Error applying font', error);
        }
    }
    
    // Load custom font from storage
    async function loadCustomFont(fontId) {
        try {
            const result = await chrome.storage.local.get(['customFonts']);
            const customFonts = result.customFonts || {};
            return customFonts[fontId];
        } catch (error) {
            console.error('betterX: Error loading custom font', error);
            return null;
        }
    }
    
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'applyFont') {
            currentFont = message.font;
            currentFontType = message.fontType;
            currentFontSize = message.fontSize;
            
            console.log('betterX: Received font change message', message);
            
            applyFont().then(() => {
                sendResponse({ success: true });
            }).catch((error) => {
                console.error('betterX: Error applying font from message', error);
                sendResponse({ success: false, error: error.message });
            });
            
            return true; // Indicates we will send response asynchronously
        }
    });
    
    // Apply fonts when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(applyFont, 500);
        });
    } else {
        setTimeout(applyFont, 500);
    }
    
    // Also apply fonts on window load (for additional safety)
    window.addEventListener('load', () => {
        setTimeout(applyFont, 1000);
    });
    
})();
