(function() {
    function createBlockOverlay() {
        if (document.getElementById('blockOverlay')) return;
        
        // Disable scrolling
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        
        // Create overlay container
        const overlay = document.createElement('div');
        overlay.id = 'blockOverlay';
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: '#000000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: '2147483647',
            opacity: '0',
            transition: 'opacity 0.4s ease-in-out',
            overflow: 'hidden',
            userSelect: 'none',
            touchAction: 'none',
            pointerEvents: 'auto'
        });

        // Create content card
        const content = document.createElement('div');
        Object.assign(content.style, {
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '32px 40px',
            maxWidth: '420px',
            textAlign: 'center',
            transform: 'scale(0.9) translateY(20px)',
            transition: 'transform 0.5s cubic-bezier(0.19, 1, 0.22, 1)',
            boxShadow: '0 12px 28px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden',
            position: 'relative'
        });

        // Add decorative accent
        const accent = document.createElement('div');
        Object.assign(accent.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '4px',
            background: 'linear-gradient(90deg, #1a73e8, #8ab4f8)'
        });
        content.appendChild(accent);

        // Add icon with animation
        const icon = document.createElement('div');
        icon.innerHTML = `
            <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
        `;
        Object.assign(icon.style, {
            margin: '8px auto 24px',
            animation: 'pulse 2s infinite'
        });

        // Create and add keyframe animation
        const styleSheet = document.createElement('style');
        styleSheet.textContent = `
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
        `;
        document.head.appendChild(styleSheet);

        // Add title
        const title = document.createElement('h2');
        title.textContent = 'Access Blocked';
        Object.assign(title.style, {
            color: '#202124',
            fontSize: '28px',
            fontWeight: '600',
            marginBottom: '12px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            letterSpacing: '-0.5px'
        });

        // Add message
        const message = document.createElement('p');
        message.textContent = 'This website has been blocked.';
        Object.assign(message.style, {
            color: '#5f6368',
            fontSize: '16px',
            lineHeight: '1.6',
            margin: '0 0 8px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        });

        // Add subtitle
        const subtitle = document.createElement('p');
        subtitle.textContent = 'Focus on what matters.';
        Object.assign(subtitle.style, {
            color: '#1a73e8',
            fontSize: '14px',
            fontWeight: '500',
            margin: '16px 0 0',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        });

        // Prevent scroll events
        overlay.addEventListener('wheel', e => e.preventDefault(), { passive: false });
        overlay.addEventListener('touchmove', e => e.preventDefault(), { passive: false });

        // Assemble the content
        content.appendChild(icon);
        content.appendChild(title);
        content.appendChild(message);
        content.appendChild(subtitle);
        overlay.appendChild(content);
        document.documentElement.appendChild(overlay);

        // Trigger animations
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            content.style.transform = 'scale(1) translateY(0)';
        });
    }

    // Check if current URL is blocked
    chrome.storage.local.get({ blockedWebsites: [] }, (result) => {
        const { blockedWebsites } = result;
        const currentUrl = window.location.href;
        // Use substring matching to check if the current URL contains any blocked site
        const isBlocked = blockedWebsites.some(site => site.blocked && currentUrl.includes(site.url));
        if (isBlocked) {
            createBlockOverlay();
        }
    });
})();