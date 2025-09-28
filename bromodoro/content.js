// Bromodoro content script

let breakOverlay = null;
let breakTimer = null;

const OVERLAY_ID = 'bromodoro-break-overlay';
const ALERT_ID   = 'bromodoro-focus-lost-alert';

const qs = (sel, root = document) => root.querySelector(sel);
const removeEl = (el) => el && el.remove();

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message.action, 'on page:', window.location.href);
  
  switch (message.action) {
    case 'showBreakOverlay':
      showBreakOverlay(message.breakMinutes);
      break;
    case 'hideOverlay':
      hideOverlay();
      break;
    case 'showFocusLostAlert':
      showFocusLostAlert();
      break;
  }
});

function showBreakOverlay(breakMinutes) {
  hideOverlay();

  breakOverlay = document.createElement('div');
  breakOverlay.id = OVERLAY_ID;
  breakOverlay.innerHTML = `
    <div class="bromodoro-overlay-content">
      <div class="bromodoro-emoji">🎉</div>
      <h2>Great job! Time for a break!</h2>
      <p class="bromodoro-message">You've earned some relaxation time. Stretch, hydrate, or just breathe!</p>
      <div class="bromodoro-timer">
        <div class="bromodoro-countdown">${breakMinutes}:00</div>
        <div class="bromodoro-timer-label">Break time remaining</div>
      </div>
      <div class="bromodoro-break-tips">
        <div class="bromodoro-tip">💧 Drink some water</div>
        <div class="bromodoro-tip">🧘 Take deep breaths</div>
        <div class="bromodoro-tip">👀 Look away from screen</div>
      </div>
    </div>
  `;

  // Add to page
  document.body.appendChild(breakOverlay);

  // Start break countdown
  startBreakCountdown(breakMinutes * 60);

  // Add click to close
  breakOverlay.addEventListener('click', (e) => {
    if (e.target === breakOverlay) {
      hideOverlay();
    }
  });
}

function startBreakCountdown(totalSeconds) {
  let remain = totalSeconds;
  const countdownEl = qs('.bromodoro-countdown', breakOverlay);

  breakTimer = setInterval(() => {
    remain--;

    const m = Math.floor(remain / 60);
    const s = remain % 60;
    countdownEl.textContent = `${m}:${s.toString().padStart(2, '0')}`;

    if (remain <= 0) {
      clearInterval(breakTimer);
      hideOverlay();
    }
  }, 1000);
}

function hideOverlay() {
  removeEl(breakOverlay);
  breakOverlay = null;
  if (breakTimer) {
    clearInterval(breakTimer);
    breakTimer = null;
  }
}

function showFocusLostAlert() {
  removeEl(document.getElementById(ALERT_ID)); // ensure single alert

  const alertOverlay = document.createElement('div');
  alertOverlay.id = ALERT_ID;
  alertOverlay.innerHTML = `
    <div class="bromodoro-alert-content">
      <div class="bromodoro-emoji">😔</div>
      <h2>Focus Lost!</h2>
      <p>You've switched away from your focus tab. The timer has been stopped.</p>
      <div class="bromodoro-alert-actions">
        <button class="bromodoro-alert-btn primary">Restart</button>
        <button class="bromodoro-alert-btn secondary">Don't care</button>
      </div>
    </div>
  `;

  // Add event listeners to buttons
  const restartBtn = alertOverlay.querySelector('.bromodoro-alert-btn.primary');
  const dismissBtn = alertOverlay.querySelector('.bromodoro-alert-btn.secondary');

  restartBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'focusRestart' });
    alertOverlay.remove();
  });

  dismissBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'focusDismiss' });
    alertOverlay.remove();
  });

  // Add to page
  document.body.appendChild(alertOverlay);
  console.log('Focus lost alert added to page');

  // Auto-remove after 8 seconds (increased time)
  setTimeout(() => removeEl(alertOverlay), 8000);
}
