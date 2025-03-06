document.addEventListener('DOMContentLoaded', () => {
    const websiteInput = document.getElementById('websiteInput');
    const addWebsiteBtn = document.getElementById('addWebsiteBtn');
    const websiteList = document.getElementById('websiteList');
    const websitesCount = document.getElementById('websitesCount');
    const emptyState = document.getElementById('emptyState');

    // Format URL to display only the main domain name
    function formatUrlForDisplay(url) {
        try {
            // Remove protocol (http:// or https://)
            let formatted = url.replace(/^(https?:\/\/)/, '');
            // Remove 'www.' if present
            formatted = formatted.replace(/^www\./, '');
            // Extract domain (stop at first slash or dot for TLD)
            let domain = formatted.split('/')[0];
            // Get the main part of the domain (before TLD)
            return domain.split('.')[0];
        } catch (e) {
            return url; // Return original URL if formatting fails
        }
    }

    // Load and render websites with block/unblock state
    async function renderWebsites() {
        const { blockedWebsites } = await chrome.storage.local.get({ blockedWebsites: [] });
        websiteList.innerHTML = '';
        
        // Update count
        websitesCount.textContent = blockedWebsites.length;
        
        // Show/hide empty state
        if (blockedWebsites.length === 0) {
            websiteList.appendChild(emptyState);
        } else {
            if (document.contains(emptyState)) {
                emptyState.remove();
            }
            
            blockedWebsites.forEach(site => {
                const div = document.createElement('div');
                div.className = 'website-item';
                const buttonText = site.blocked ? 'Unblock' : 'Block';
                const displayUrl = formatUrlForDisplay(site.url);
                
                const buttonsContainer = document.createElement('div');
                buttonsContainer.className = 'website-buttons';
                
                const toggleButton = document.createElement('button');
                toggleButton.setAttribute('data-action', site.blocked ? 'unblock' : 'block');
                toggleButton.setAttribute('data-site', site.url);
                toggleButton.textContent = buttonText;
                
                const removeButton = document.createElement('button');
                removeButton.setAttribute('data-action', 'remove');
                removeButton.setAttribute('data-site', site.url);
                removeButton.textContent = '✖';
                
                buttonsContainer.appendChild(toggleButton);
                buttonsContainer.appendChild(removeButton);
                
                div.innerHTML = `<span title="${site.url}">${displayUrl}</span>`;
                div.appendChild(buttonsContainer);
                
                websiteList.appendChild(div);
            });
        }
    }

    // Add website if not already present
    addWebsiteBtn.addEventListener('click', async () => {
        const newSite = websiteInput.value.trim();
        if (!newSite) return;
        
        // Add http:// if no protocol specified
        let siteUrl = newSite;
        if (!/^https?:\/\//i.test(siteUrl)) {
            siteUrl = 'http://' + siteUrl;
        }
        
        const { blockedWebsites } = await chrome.storage.local.get({ blockedWebsites: [] });
        if (!blockedWebsites.some(site => site.url === siteUrl)) {
            blockedWebsites.push({ url: siteUrl, blocked: true });
            await chrome.storage.local.set({ blockedWebsites });
        }
        websiteInput.value = '';
        renderWebsites();
    });

    // Also allow adding websites by pressing Enter
    websiteInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            addWebsiteBtn.click();
        }
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
                        return { ...site, blocked: action === 'block' };
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