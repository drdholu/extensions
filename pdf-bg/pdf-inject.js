(function () {
  const STYLE_ID = 'colorMyPdfStyle';

  // Pre-defined theme palette
  const THEMES = {
    default: { bg: '#1e1e1e', text: '#e0e0e0', filter: 'invert(90%) hue-rotate(180deg)' },
    nord: { bg: '#2E3440', text: '#D8DEE9', filter: 'invert(85%) hue-rotate(150deg)' },
    monokai: { bg: '#272822', text: '#F8F8F2', filter: 'invert(92%) hue-rotate(140deg)' },
    solarized: { bg: '#002b36', text: '#93a1a1', filter: 'invert(88%) hue-rotate(130deg)' },
    dracula: { bg: '#282a36', text: '#f8f8f2', filter: 'invert(95%) hue-rotate(200deg)' }
  };

  const DEFAULT_SETTINGS = {
    enabled: true,
    theme: 'default'
  };

  function removeExistingStyle() {
    const existing = document.getElementById(STYLE_ID);
    if (existing) existing.remove();

    document.querySelectorAll('style').forEach((el) => {
      if (el.textContent.includes('filter: invert(90%) hue-rotate(180deg)') && !el.id) {
        el.remove();
      }
    });
  }

  function generateCSS(themeKey) {
    const { bg, text, filter } = THEMES[settings.theme] || THEMES.default;
    styleTag.textContent = `
  html, body { background:${bg}!important; color:${text}!important; }
  embed[type="application/pdf"] { filter:${filter}!important; }
`;
  }

  function applyStyles() {
    chrome.storage.sync.get({ extensionSettings: DEFAULT_SETTINGS }, () => {
      // Always remove any previously injected styles regardless of enabled state
      removeExistingStyle();
    });
  }

  if (document.contentType === 'application/pdf' || window.location.href.endsWith('.pdf')) {
    applyStyles();
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'refreshStyles') {
      applyStyles();
      sendResponse && sendResponse({ status: 'updated' });
    }
  });
})();