(function() {
    function createBlockOverlay(message) {
        if (document.getElementById('blockOverlay')) return;
        
        // Disable scrolling on body
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        
        // Create and style the overlay container
        const overlay = document.createElement('div');
        overlay.id = 'blockOverlay';
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: '#000000', // Solid black background
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: '2147483647', // Maximum z-index value
            opacity: '0',
            transition: 'opacity 0.3s ease-in-out',
            overflow: 'hidden', // Prevent scroll within overlay
            userSelect: 'none', // Prevent text selection
            touchAction: 'none', // Disable touch events
            pointerEvents: 'auto' // Ensure overlay captures all clicks
        });

        // Create content container
        const content = document.createElement('div');
        Object.assign(content.style, {
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            padding: '24px 32px',
            maxWidth: '400px',
            textAlign: 'center',
            transform: 'scale(0.8)',
            transition: 'transform 0.3s ease-in-out',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
        });

        // Add icon
        const icon = document.createElement('div');
        icon.innerHTML = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>`;
        icon.style.marginBottom = '16px';

        // Add message
        const messageEl = document.createElement('h2');
        messageEl.textContent = 'Access Blocked';
        Object.assign(messageEl.style, {
            color: '#1a1a1a',
            fontSize: '24px',
            marginBottom: '8px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        });

        // Add description
        const description = document.createElement('p');
        description.textContent = 'Go do something useful.';
        Object.assign(description.style, {
            color: '#666666',
            fontSize: '14px',
            lineHeight: '1.5',
            margin: '0',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        });

        // Prevent scroll on overlay click/touch
        overlay.addEventListener('wheel', e => e.preventDefault(), { passive: false });
        overlay.addEventListener('touchmove', e => e.preventDefault(), { passive: false });

        // Assemble the content
        content.appendChild(icon);
        content.appendChild(messageEl);
        content.appendChild(description);
        overlay.appendChild(content);
        document.documentElement.appendChild(overlay);

        // Trigger animations
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            content.style.transform = 'scale(1)';
        });
    }

    // Check if current URL is blocked
    chrome.storage.local.get({ blockedWebsites: [] }, (result) => {
        const { blockedWebsites } = result;
        const currentUrl = window.location.href;
        // Use substring matching to check if the current URL contains any blocked site
        const isBlocked = blockedWebsites.some(site => site.blocked && currentUrl.includes(site.url));
        if (isBlocked) {
            createBlockOverlay("This site is blocked");
        }
    });
})();