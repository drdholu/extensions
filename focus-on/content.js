function cleanYouTube() {
    const path = window.location.pathname;

    // Only clean homepage (not search results)
    if (path === '/') {
        document.querySelector('ytd-rich-grid-renderer')?.remove();
        document.querySelector('ytd-banner-promo-renderer')?.remove();
    }

    // Always remove these elements
    const toRemove = [
        '#secondary', // Sidebar
        'ytd-watch-next-secondary-results-renderer', // Recommended videos below player
        'ytd-reel-shelf-renderer', // Shorts shelf
        'ytd-comments' // Comments section
    ];

    toRemove.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => el.remove());
    });
}

// function createFocusList(videos) {
//     // Existing focus list creation code...
// }

// Main execution
chrome.storage.local.get({ videos: [] }, data => {
    cleanYouTube();
    if (data.videos.length > 0) {
        createFocusList(data.videos);
    }
});

// MutationObserver with better filtering
const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
        if (!mutation.target.closest('ytd-search')) { // Preserve search results
            cleanYouTube();
        }
    });
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

function createFocusList(videos) {
    const container = document.createElement('div');
    container.id = "yt-focus-container";
    container.innerHTML = `
        <h2 style="color: #fff; margin: 20px; font-size: 16px;">Your Focus List</h2>
        ${videos.map(video => `
            <div style="margin: 10px; padding: 12px; background: rgba(255,255,255,0.1); border-radius: 8px;">
                <a href="/watch?v=${video.id}" 
                   style="color: #fff; text-decoration: none; font-size: 14px; display: block;">
                    ${video.title}
                </a>
            </div>
        `).join('')}
    `;
    document.body.prepend(container);
}