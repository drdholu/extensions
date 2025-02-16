document.addEventListener('DOMContentLoaded', () => {
    const websiteInput = document.getElementById('websiteInput');
    const addWebsiteBtn = document.getElementById('addWebsiteBtn');
    const websiteList = document.getElementById('websiteList');

    // Format URL to display only the main domain name
    function formatUrlForDisplay(url) {
        try {
            // Remove protocol (http:// or https://)
            let formatted = url.replace(/^(https?:\/\/)/, '');
            // Get the part before first slash or dot
            formatted = formatted.split(/[\/\.]/)[0];
            // Remove 'www.' if present
            formatted = formatted.replace(/^www\./, '');
            return formatted;
        } catch (e) {
            return url; // Return original URL if formatting fails
        }
    }

    // Load and render websites with block/unblock state
    async function renderWebsites() {
        const { blockedWebsites } = await chrome.storage.local.get({ blockedWebsites: [] });
        websiteList.innerHTML = '';
        blockedWebsites.forEach(site => {
            const div = document.createElement('div');
            div.className = 'website-item';
            const buttonText = site.blocked ? 'Unblock' : 'Block';
            const displayUrl = formatUrlForDisplay(site.url);
            div.innerHTML = `<span title="${site.url}">${displayUrl}</span>
                           <button data-action="${site.blocked ? 'unblock' : 'block'}" data-site="${site.url}">${buttonText}</button>
                           <button data-action="remove" data-site="${site.url}">✖</button>`;
            websiteList.appendChild(div);
        });
    }

    // Add website if not already present
    addWebsiteBtn.addEventListener('click', async () => {
        const newSite = websiteInput.value.trim();
        if (!newSite) return;
        const { blockedWebsites } = await chrome.storage.local.get({ blockedWebsites: [] });
        if (!blockedWebsites.some(site => site.url === newSite)) {
            blockedWebsites.push({ url: newSite, blocked: true });
            await chrome.storage.local.set({ blockedWebsites });
        }
        websiteInput.value = '';
        renderWebsites();
    });

    // Handle button clicks for block, unblock, and remove
    websiteList.addEventListener('click', async (e) => {
        if (e.target.tagName === 'BUTTON') {
            const action = e.target.getAttribute('data-action');
            const siteUrl = e.target.getAttribute('data-site');
            let { blockedWebsites } = await chrome.storage.local.get({ blockedWebsites: [] });

            if (action === 'block' || action === 'unblock') {
                blockedWebsites = blockedWebsites.map(site => {
                    if (site.url === siteUrl) {
                        return { ...site, blocked: action === 'block' ? true : false };
                    }
                    return site;
                });
            } else if (action === 'remove') {
                blockedWebsites = blockedWebsites.filter(site => site.url !== siteUrl);
            }

            await chrome.storage.local.set({ blockedWebsites });
            renderWebsites();
        }
    });

    renderWebsites();
});