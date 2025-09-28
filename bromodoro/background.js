let timerState = {
  isActive: false,
  phase: 'focus', // 'focus' or 'break'
  timeRemaining: 0,
  focusTabId: null,
  focusTabTitle: '',
  focusMinutes: 25,
  breakMinutes: 5,
  intervalId: null,
  totalRemainingSeconds: null,
  sessionPlan: null,
  planIndex: 0
};

// Track a popup alert window to avoid duplicates
let focusAlertWindowId = null;
let breakWindowId = null;

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ sessionsCompleted: 0 });
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'startTimer':
      startTimer(message);
      break;
    case 'stopTimer':
      stopTimer();
      break;
    case 'getTimerState':
      sendResponse(timerState);
      break;
    case 'refocusTab': {
      const { tabId, windowId } = message;
      if (windowId != null) {
        chrome.windows.update(windowId, { focused: true }, () => {
          if (tabId != null) {
            chrome.tabs.update(tabId, { active: true });
          }
        });
      } else if (tabId != null) {
        chrome.tabs.update(tabId, { active: true });
      }
      break;
    }
    case 'focusRestart': {
      const targetTabId = message.tabId ?? timerState.focusTabId;
      const targetWindowId = message.windowId ?? timerState.focusWindowId;

      const restart = () => {
        if (targetTabId == null) {
          console.log('No tab available for restart.');
          return;
        }

        chrome.tabs.get(targetTabId, (tab) => {
          if (chrome.runtime.lastError) {
            console.log('Could not refocus tab:', chrome.runtime.lastError.message);
            return;
          }

          const focusMinutes = timerState.focusMinutes || 25;
          const breakMinutes = timerState.breakMinutes || 5;
          const totalSessionSeconds = timerState.totalRemainingSeconds ?? null;
          const sessionPlan = timerState.sessionPlan ?? null;

          startTimer({
            focusMinutes,
            breakMinutes,
            focusTabId: targetTabId,
            focusTabTitle: tab.title,
            focusTabUrl: tab.url,
            focusWindowId: targetWindowId ?? tab.windowId,
            totalSessionSeconds,
            sessionPlan
          });
        });
      };

      if (targetWindowId != null) {
        chrome.windows.update(targetWindowId, { focused: true }, () => {
          if (targetTabId != null) {
            chrome.tabs.update(targetTabId, { active: true }, () => restart());
          } else {
            restart();
          }
        });
      } else if (targetTabId != null) {
        chrome.tabs.update(targetTabId, { active: true }, () => restart());
      } else {
        console.log('No window or tab to restart focus.');
      }

      break;
    }
    case 'focusDismiss': {
      // User chose not to resume; ensure timer stays stopped and clear alert window tracking
      stopTimer();
      if (focusAlertWindowId) {
        try {
          chrome.windows.remove(focusAlertWindowId);
        } catch (e) {
          console.log('Alert window already closed.');
        }
        focusAlertWindowId = null;
      }
      break;
    }
  }
});

// Monitor tab changes
chrome.tabs.onActivated.addListener((activeInfo) => {
  console.log('Tab activated:', activeInfo.tabId, 'Focus tab:', timerState.focusTabId, 'Timer active:', timerState.isActive, 'Phase:', timerState.phase);
  
  if (timerState.isActive && timerState.phase === 'focus') {
    if (activeInfo.tabId !== timerState.focusTabId) {
      console.log('Focus lost! Switched from tab', timerState.focusTabId, 'to tab', activeInfo.tabId);
      handleFocusLost();
    }
  }
});

// Monitor tab updates (URL changes within same tab)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  console.log('Tab updated:', tabId, 'Change:', changeInfo.url, 'Timer active:', timerState.isActive, 'Phase:', timerState.phase, 'Focus tab:', timerState.focusTabId);
  
  if (timerState.isActive && timerState.phase === 'focus' && tabId === timerState.focusTabId) {
    if (changeInfo.url) {
      // Properly check if domain changed
      const originalUrl = new URL(timerState.focusTabUrl || tab.url); // We'll need to store focusTabUrl in startTimer
      const newUrl = new URL(changeInfo.url);
      
      if (originalUrl.hostname !== newUrl.hostname) {
        console.log('Focus lost due to domain change from', originalUrl.hostname, 'to', newUrl.hostname);
        handleFocusLost();
      }
    }
  }
});

// Removed window focus monitoring; we only track tab activation and URL changes

function startTimer({ focusMinutes, breakMinutes, focusTabId, focusTabTitle, focusTabUrl, focusWindowId, totalSessionMinutes, totalSessionSeconds, sessionPlan }) {
  console.log('Starting timer:', { focusMinutes, breakMinutes, focusTabId, focusTabTitle, focusWindowId, totalSessionMinutes, sessionPlan });
  
  // Stop any existing timer
  if (timerState.intervalId) {
    clearInterval(timerState.intervalId);
  }

  // Determine initial phase duration
  let initialDuration;
  if (sessionPlan && sessionPlan.length > 0) {
    // Use first item from the plan
    const firstSegment = sessionPlan[0];
    initialDuration = parseInt(firstSegment) * 60; // Extract minutes and convert to seconds
  } else {
    initialDuration = focusMinutes * 60;
  }

  // Initialize timer state
  timerState = {
    isActive: true,
    phase: 'focus',
    timeRemaining: initialDuration,
    focusTabId: focusTabId,
    focusTabTitle: focusTabTitle,
    focusMinutes: focusMinutes,
    breakMinutes: breakMinutes,
    intervalId: null,
    focusTabUrl: focusTabUrl,
    focusWindowId: focusWindowId,
    totalRemainingSeconds: (typeof totalSessionSeconds === 'number' ? totalSessionSeconds : (typeof totalSessionMinutes === 'number' && totalSessionMinutes > 0 ? totalSessionMinutes * 60 : null)),
    sessionPlan: sessionPlan,
    planIndex: 0
  };

  // Save timer state
  chrome.storage.local.set({ timerState });

  // Start the countdown
  startCountdown();

  // Notify popup
  broadcastMessage({
    action: 'timerUpdate',
    timeRemaining: timerState.timeRemaining,
    phase: timerState.phase
  });
}

function stopTimer() {
  if (timerState.intervalId) {
    clearInterval(timerState.intervalId);
  }

  timerState.isActive = false;
  timerState.intervalId = null;

  // Clear stored timer state
  chrome.storage.local.remove('timerState');

  // Notify popup and content script
  broadcastMessage({ action: 'timerStopped' });
}

function startCountdown() {
  timerState.intervalId = setInterval(() => {
    timerState.timeRemaining--;
    if (timerState.totalRemainingSeconds != null) {
      timerState.totalRemainingSeconds = Math.max(0, timerState.totalRemainingSeconds - 1);
    }

    // Update stored state
    chrome.storage.local.set({ timerState });

    // Broadcast update
    broadcastMessage({
      action: 'timerUpdate',
      timeRemaining: timerState.timeRemaining,
      phase: timerState.phase,
      totalRemainingSeconds: timerState.totalRemainingSeconds
    });

    // Stop the whole session if total time reached
    if (timerState.totalRemainingSeconds === 0) {
      if (timerState.phase === 'break') {
        // End immediately when total is done during break
        handleSessionComplete();
        return;
      } else if (timerState.phase === 'focus') {
        // End immediately during focus
        handleSessionComplete();
        return;
      }
    }

    // Check if phase is complete
    if (timerState.timeRemaining <= 0) {
      handlePhaseComplete();
    }
  }, 1000);
}

function handlePhaseComplete() {
  clearInterval(timerState.intervalId);

  // If we have a session plan, follow it
  if (timerState.sessionPlan && timerState.sessionPlan.length > 0) {
    timerState.planIndex++;
    
    // Check if we've completed the entire plan
    if (timerState.planIndex >= timerState.sessionPlan.length) {
      return handleSessionComplete();
    }

    // Get next segment from plan
    const nextSegment = timerState.sessionPlan[timerState.planIndex];
    const isBreak = nextSegment.includes('break');
    const minutes = parseInt(nextSegment);
    
    timerState.phase = isBreak ? 'break' : 'focus';
    timerState.timeRemaining = minutes * 60;

    if (isBreak) {
      // Show break overlay + popup
      chrome.tabs.sendMessage(timerState.focusTabId, {
        action: 'showBreakOverlay',
        breakMinutes: minutes
      });
      openBreakWindow();
      broadcastMessage({ action: 'timerComplete', phase: 'focus' });
    } else {
      // Close break UI if starting focus
      chrome.tabs.sendMessage(timerState.focusTabId, { action: 'hideOverlay' });
      if (breakWindowId) {
        try { chrome.windows.remove(breakWindowId); } catch (e) {}
        breakWindowId = null;
      }
      broadcastMessage({ action: 'timerComplete', phase: 'break' });
    }

    return startCountdown();
  }

  // Fallback to original logic if no plan
  const remain = timerState.totalRemainingSeconds;

  if (timerState.phase === 'focus') {
    if (remain <= 0) {
      return handleSessionComplete();
    }

    if (remain >= timerState.breakMinutes * 60) {
      timerState.phase = 'break';
      timerState.timeRemaining = Math.min(timerState.breakMinutes * 60, remain);

      chrome.tabs.sendMessage(timerState.focusTabId, {
        action: 'showBreakOverlay',
        breakMinutes: Math.ceil(timerState.timeRemaining / 60)
      });
      openBreakWindow();

      broadcastMessage({ action: 'timerComplete', phase: 'focus' });
      return startCountdown();
    }

    return handleSessionComplete();
  }

  if (remain <= 0) {
    return handleSessionComplete();
  }

  timerState.phase = 'focus';
  timerState.timeRemaining = Math.min(timerState.focusMinutes * 60, remain);

  chrome.tabs.sendMessage(timerState.focusTabId, { action: 'hideOverlay' });
  if (breakWindowId) {
    try { chrome.windows.remove(breakWindowId); } catch (e) {}
    breakWindowId = null;
  }

  broadcastMessage({ action: 'timerComplete', phase: 'break' });
  startCountdown();
}

function openBreakWindow() {
  try {
    if (breakWindowId) {
      chrome.windows.update(breakWindowId, { focused: false });
      return;
    }
    chrome.windows.create({
      url: chrome.runtime.getURL('break_window.html'),
      type: 'popup',
      width: 420,
      height: 220
    }, (w) => {
      if (w && w.id) {
        breakWindowId = w.id;
        const onRemoved = (id) => {
          if (id === breakWindowId) {
            breakWindowId = null;
            chrome.windows.onRemoved.removeListener(onRemoved);
          }
        };
        chrome.windows.onRemoved.addListener(onRemoved);
      }
    });
  } catch (e) {
    console.log('Could not open break window:', e);
  }
}

function handleSessionComplete() {
  // Increment session counter
  chrome.storage.sync.get(['sessionsCompleted'], (result) => {
    const newCount = (result.sessionsCompleted || 0) + 1;
    chrome.storage.sync.set({ sessionsCompleted: newCount });

    // Notify popup
    broadcastMessage({
      action: 'sessionComplete',
      sessionsCompleted: newCount
    });
  });

  // Hide overlay
  chrome.tabs.sendMessage(timerState.focusTabId, {
    action: 'hideOverlay'
  });

  // Close break window if open
  if (breakWindowId) {
    try {
      chrome.windows.remove(breakWindowId);
    } catch (e) {}
    breakWindowId = null;
  }

  // Reset timer
  stopTimer();

  // Notify completion
  broadcastMessage({
    action: 'timerComplete',
    phase: 'break'
  });
}

async function handleFocusLost() {
  console.log('Focus lost detected!');
  
  // Stop the timer first
  stopTimer();

  // Remove notifications path; use content alert + popup window instead

  // Try to show overlay on current tab as secondary method
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      await chrome.tabs.sendMessage(tabs[0].id, {
        action: 'showFocusLostAlert'
      });
    }
  } catch (error) {
    console.log('Could not send message to content script:', error);
    // This is expected if the tab doesn't have the content script loaded
  }

  // Open a small popup window as guaranteed alert fallback
  try {
    if (focusAlertWindowId) {
      chrome.windows.update(focusAlertWindowId, { focused: true });
    } else {
      chrome.windows.create({
        url: chrome.runtime.getURL(`focus_lost.html?tabId=${encodeURIComponent(String(timerState.focusTabId || ''))}&winId=${encodeURIComponent(String(timerState.focusWindowId || ''))}`),
        type: 'popup',
        width: 360,
        height: 180
      }, (w) => {
        if (w && w.id) {
          focusAlertWindowId = w.id;
          const onRemoved = (id) => {
            if (id === focusAlertWindowId) {
              focusAlertWindowId = null;
              chrome.windows.onRemoved.removeListener(onRemoved);
            }
          };
          chrome.windows.onRemoved.addListener(onRemoved);
        }
      });
    }
  } catch (e) {
    console.log('Popup alert fallback failed:', e);
  }

  // Notify popup
  broadcastMessage({ action: 'focusLost' });
}

function broadcastMessage(message) {
  // Send to popup if it's open
  chrome.runtime.sendMessage(message).catch(() => {
    // Popup might not be open, that's okay
  });
}

function extractDomain(title) {
  // Simple domain extraction from title or URL
  if (!title) return '';
  
  // Remove common prefixes and get the main part
  return title.split(' ')[0].toLowerCase();
}

// Restore timer state on startup
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(['timerState'], (result) => {
    if (result.timerState && result.timerState.isActive) {
      timerState = result.timerState;
      // Don't restart countdown automatically, let user restart if needed
      timerState.isActive = false;
      chrome.storage.local.remove('timerState');
    }
  });
});1