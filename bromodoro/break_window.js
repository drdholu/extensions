(() => {
  function render(seconds) {
    const el = document.getElementById('breakClock');
    if (!el) return;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    el.textContent = `${m}:${s.toString().padStart(2, '0')}`;
  }

  // Initialize with current state
  chrome.storage.local.get(['timerState'], (result) => {
    const state = result.timerState;
    if (state && state.phase === 'break') {
      render(state.timeRemaining);
    }
  });

  // Subscribe to updates from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'timerUpdate' && message.phase === 'break') {
      render(message.timeRemaining);
    }
  });
})();



