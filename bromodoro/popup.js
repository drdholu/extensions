document.addEventListener('DOMContentLoaded', async () => {
  // DOM shortcuts
  const $ = (id) => document.getElementById(id);

  const timeDisplay      = $("timeDisplay");
  const timerStatus      = $("timerStatus");
  const sessionCount     = $("sessionCount");
  const startBtn         = $("startBtn");
  const stopBtn          = $("stopBtn");
  const focusTimeInput   = $("focusTime");
  const breakTimeInput   = $("breakTime");
  const totalMinutesInput= $("totalMinutes");
  const presetBtns       = document.querySelectorAll('.preset-btn');
  const focusTabInfo = document.getElementById('focusTabInfo');
  const focusTabTitle = document.getElementById('focusTabTitle');
  const planSummary = document.getElementById('planSummary');
  const customModeRadio = document.getElementById('customMode');
  const totalModeRadio = document.getElementById('totalMode');
  const customSection    = $("customSection");
  const totalSection     = $("totalSection");

  // Storage helpers
  const saveSync = (obj) => chrome.storage.sync.set(obj);
  const loadSync = (keys) => chrome.storage.sync.get(keys);

  // Load saved data
  await loadData();
  await updateTimerDisplay();
  await updateSessionCount();
  setupModeHandlers();
  updateModeDisplay();

  // Preset button handlers
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const focusTime = parseInt(btn.dataset.focus);
      const breakTime = parseInt(btn.dataset.break);
      
      focusTimeInput.value = focusTime;
      breakTimeInput.value = breakTime;
      
      presetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Start button handler
  startBtn.addEventListener('click', async () => {
    const focusMinutes = parseInt(focusTimeInput.value) || 25;
    const breakMinutes = parseInt(breakTimeInput.value) || 5;
    
    if (focusMinutes < 1 || breakMinutes < 1) {
      alert('Please set valid timer values!');
      return;
    }

    // Get the tab that was active in the last focused window (the page user was on before opening the popup)
    const [focusTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const currentWindow = await chrome.windows.getLastFocused();

    if (!focusTab) {
      alert('No valid tab found to focus on. Please open a website first!');
      return;
    }

    // Determine which mode is active
    const isCustomMode = customModeRadio.checked;
    let totalMinutes = null;
    let plan = null;

    if (!isCustomMode && totalModeRadio.checked) {
      // Total session mode
      totalMinutes = totalMinutesInput.value ? parseInt(totalMinutesInput.value) : null;
      if (!totalMinutes || totalMinutes < 5) {
        alert('Please set a valid total session time (at least 5 minutes)!');
        return;
      }
      plan = calculateOptimalPlan(totalMinutes);
    }

    // Start the timer
    chrome.runtime.sendMessage({
      action: 'startTimer',
      focusMinutes: focusMinutes,
      breakMinutes: breakMinutes,
      focusTabId: focusTab.id,
      focusTabTitle: focusTab.title,
      focusTabUrl: focusTab.url,
      focusWindowId: currentWindow.id,
      totalSessionMinutes: totalMinutes,
      sessionPlan: plan
    });

    // Update UI
    focusTabTitle.textContent = focusTab.title;
    focusTabInfo.style.display = 'block';
    startBtn.style.display = 'none';
    stopBtn.style.display = 'block';
    timerStatus.textContent = 'Focus session active';
  });

  // Stop button handler
  stopBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'stopTimer' });
    resetUI();
  });

  // Listen for timer updates from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'timerUpdate') {
      updateTimeDisplay(message.timeRemaining, message.phase);
    } else if (message.action === 'timerComplete') {
      handleTimerComplete(message.phase);
    } else if (message.action === 'focusLost') {
      handleFocusLost();
    } else if (message.action === 'sessionComplete') {
      handleSessionComplete();
    }
  });

  async function loadData() {
    const result = await loadSync(['focusTime', 'breakTime', 'sessionsCompleted', 'totalMinutes', 'timerMode']);
    
    if (result.focusTime) focusTimeInput.value = result.focusTime;
    if (result.breakTime) breakTimeInput.value = result.breakTime;
    if (result.totalMinutes) totalMinutesInput.value = result.totalMinutes;
    
    // Load saved mode
    if (result.timerMode === 'total') {
      totalModeRadio.checked = true;
      customModeRadio.checked = false;
    } else {
      customModeRadio.checked = true;
      totalModeRadio.checked = false;
    }
  }

  function setupModeHandlers() {
    // Make entire mode option clickable
    const customModeOption = customModeRadio.closest('.mode-option');
    const totalModeOption = totalModeRadio.closest('.mode-option');

    const setMode = (mode) => {
      customModeRadio.checked = mode === 'custom';
      totalModeRadio.checked  = mode === 'total';
      saveSync({ timerMode: mode });
      updateModeDisplay();
    };

    customModeOption.addEventListener('click', () => setMode('custom'));
    totalModeOption.addEventListener('click', () => setMode('total'));
    // Also handle radio button changes directly
    customModeRadio.addEventListener('change', () => customModeRadio.checked && setMode('custom'));
    totalModeRadio  .addEventListener('change', () => totalModeRadio.checked  && setMode('total'));
  }

  function updateModeDisplay() {
    if (customModeRadio.checked) {
      customSection.style.display = 'block';
      totalSection.style.display = 'none';
      planSummary.style.display = 'none';
    } else {
      customSection.style.display = 'none';
      totalSection.style.display = 'block';
      renderPlanSummary();
    }
  }

  async function updateTimerDisplay() {
    const result = await chrome.storage.local.get(['timerState']);
    if (result.timerState && result.timerState.isActive) {
      const { timeRemaining, phase, focusTabTitle: savedTabTitle } = result.timerState;
      
      updateTimeDisplay(timeRemaining, phase);
      focusTabTitle.textContent = savedTabTitle || 'Unknown tab';
      focusTabInfo.style.display = 'block';
      startBtn.style.display = 'none';
      stopBtn.style.display = 'block';
      timerStatus.textContent = phase === 'focus' ? 'Focus session active' : 'Break time active';
    }
  }

  function updateTimeDisplay(seconds, phase) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    timeDisplay.textContent = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    
    if (phase === 'break') {
      timeDisplay.style.color = '#2563eb';
    } else {
      timeDisplay.style.color = '#0f172a';
    }
  }

  async function updateSessionCount() {
    const result = await loadSync(['sessionsCompleted']);
    sessionCount.textContent = result.sessionsCompleted || 0;
  }

  function handleTimerComplete(phase) {
    if (phase === 'focus') {
      timerStatus.textContent = 'Focus complete! Break time 🎉';
    } else {
      timerStatus.textContent = 'Break complete! Ready for next session';
      resetUI();
    }
  }

  function handleFocusLost() {
    timerStatus.textContent = 'Focus lost! Timer stopped';
    resetUI();
  }

  function handleSessionComplete() {
    updateSessionCount();
    timerStatus.textContent = 'Session completed! Well done! 🎉';
  }

  function resetUI() {
    focusTabInfo.style.display = 'none';
    startBtn.style.display = 'block';
    stopBtn.style.display = 'none';
    timeDisplay.textContent = `${focusTimeInput.value}:00`;
    timeDisplay.style.color = '#0f172a';
    timerStatus.textContent = 'Ready to focus';
  }

  // Save changes
  focusTimeInput .addEventListener('change', () => saveSync({ focusTime: parseInt(focusTimeInput.value) }));
  breakTimeInput .addEventListener('change', () => saveSync({ breakTime: parseInt(breakTimeInput.value) }));
  totalMinutesInput.addEventListener('change', () => {
    const val = parseInt(totalMinutesInput.value);
    saveSync({ totalMinutes: isNaN(val) ? 0 : val });
  });

  totalMinutesInput.addEventListener('input', renderPlanSummary);

  function renderPlanSummary() {
    // Only show plan summary in total mode
    if (!totalModeRadio.checked) {
      planSummary.style.display = 'none';
      return;
    }

    const total = parseInt(totalMinutesInput.value) || 0;
    if (!total || total <= 0) {
      planSummary.style.display = 'none';
      planSummary.textContent = '';
      return;
    }

    const pieces = calculateOptimalPlan(total);
    planSummary.textContent = `Plan: ` + pieces.join(' · ');
    planSummary.style.display = 'block';
  }

  function calculateOptimalPlan(totalMinutes) {
    if (totalMinutes <= 15) {
      // Short sessions: just focus, no break needed
      return [`${totalMinutes}m focus`];
    } else if (totalMinutes <= 30) {
      // Medium sessions: one focus + short break
      const breakTime = Math.min(5, Math.floor(totalMinutes * 0.2)); // 20% for break, max 5
      const focusTime = totalMinutes - breakTime;
      return [`${focusTime}m focus`, `${breakTime}m break`];
    } else if (totalMinutes <= 50) {
      // Longer sessions: optimize split
      if (totalMinutes <= 35) {
        // 30-35 min: 25 + 5 + remainder
        const remaining = totalMinutes - 30;
        return [`25m focus`, `5m break`, `${remaining}m focus`];
      } else {
        // 36-50 min: try to split evenly
        const firstFocus = Math.min(25, Math.floor(totalMinutes * 0.6));
        const breakTime = 5;
        const secondFocus = totalMinutes - firstFocus - breakTime;
        return [`${firstFocus}m focus`, `${breakTime}m break`, `${secondFocus}m focus`];
      }
    } else {
      // Long sessions: use multiple 25/5 cycles + remainder
      const cycleLength = 30; // 25 + 5
      const completeCycles = Math.floor(totalMinutes / cycleLength);
      const remainder = totalMinutes % cycleLength;
      
      const pieces = [];
      for (let i = 0; i < completeCycles; i++) {
        pieces.push('25m focus', '5m break');
      }
      
      if (remainder > 0) {
        if (remainder <= 5) {
          // Just extend the last cycle
          pieces[pieces.length - 1] = `${5 + remainder}m break`;
        } else {
          // Add final focus block
          pieces.push(`${remainder}m focus`);
        }
      } else if (pieces.length > 0) {
        // Remove the last break if we end exactly on a cycle
        pieces.pop();
      }
      
      return pieces;
    }
  }
});
