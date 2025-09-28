(() => {
  function getParams() {
    const params = new URLSearchParams(window.location.search);
    const tabId = params.get('tabId');
    const winId = params.get('winId');
    return {
      tabId: tabId && tabId !== 'undefined' ? Number(tabId) : null,
      windowId: winId && winId !== 'undefined' ? Number(winId) : null
    };
  }

  window.addEventListener('DOMContentLoaded', () => {
    const restartBtn = document.getElementById('restartBtn');
    const dontCareBtn = document.getElementById('dontCareBtn');
    if (!restartBtn || !dontCareBtn) return;

    restartBtn.addEventListener('click', () => {
      const { tabId, windowId } = getParams();
      chrome.runtime.sendMessage({ action: 'focusRestart', tabId, windowId }, () => {
        if (chrome.runtime.lastError) {
          console.log('Unchecked lastError:', chrome.runtime.lastError.message);
        }
        window.close();
      });
    });

    dontCareBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'focusDismiss' }, () => {
        if (chrome.runtime.lastError) {
          console.log('Unchecked lastError:', chrome.runtime.lastError.message);
        }
        window.close();
      });
    });

    setTimeout(() => { window.close(); }, 8000);
  });
})();

