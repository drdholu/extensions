const $ = (sel) => document.querySelector(sel);

function drawAnalogClock(canvas, date = new Date()) {
  const ctx = canvas.getContext('2d');
  const size = Math.min(canvas.width, canvas.height);
  const r = size / 2;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(r, r);

  // Outer glow
  ctx.beginPath();
  ctx.arc(0, 0, r - 3, 0, Math.PI * 2);
  const gradient = ctx.createRadialGradient(0, 0, r - 30, 0, 0, r);
  gradient.addColorStop(0, 'rgba(255, 214, 90, 0.05)');
  gradient.addColorStop(1, 'rgba(255, 214, 90, 0)');
  ctx.fillStyle = gradient;
  ctx.fill();

  // Face
  ctx.beginPath();
  ctx.arc(0, 0, r - 6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(15, 17, 20, 0.8)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Ticks
  for (let i = 0; i < 60; i++) {
    const angle = (Math.PI * 2 * i) / 60 - Math.PI / 2;
    const inner = i % 5 === 0 ? r - 20 : r - 14;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    ctx.lineTo(Math.cos(angle) * (r - 10), Math.sin(angle) * (r - 10));
    ctx.strokeStyle = i % 5 === 0 ? 'rgba(255,214,90,0.4)' : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = i % 5 === 0 ? 2.5 : 1;
    ctx.stroke();
  }

  const hours = date.getHours() % 12;
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  // Hour hand
  const hourAngle = (Math.PI * 2 * (hours + minutes / 60)) / 12 - Math.PI / 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(hourAngle) * (r - 60), Math.sin(hourAngle) * (r - 60));
  ctx.stroke();

  // Minute hand
  const minAngle = (Math.PI * 2 * (minutes + seconds / 60)) / 60 - Math.PI / 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(minAngle) * (r - 35), Math.sin(minAngle) * (r - 35));
  ctx.stroke();

  // Second hand (accent)
  const secAngle = (Math.PI * 2 * seconds) / 60 - Math.PI / 2;
  ctx.strokeStyle = '#ffd65a';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(secAngle) * (r - 25), Math.sin(secAngle) * (r - 25));
  ctx.stroke();

  // Center dot
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#ffd65a';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

function randomSparkData(points = 40) {
  let v = 100;
  const out = [];
  for (let i = 0; i < points; i++) {
    v += (Math.random() - 0.5) * 10;
    v = Math.max(60, Math.min(140, v));
    out.push(v);
  }
  return out;
}

function drawSparkline(canvas, values) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  
  // Create gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  const isPositive = values[values.length - 1] > values[0];
  
  if (isPositive) {
    gradient.addColorStop(0, 'rgba(74, 222, 128, 0.4)');
    gradient.addColorStop(1, 'rgba(74, 222, 128, 0)');
  } else {
    gradient.addColorStop(0, 'rgba(248, 113, 113, 0.4)');
    gradient.addColorStop(1, 'rgba(248, 113, 113, 0)');
  }
  
  // Draw area
  ctx.beginPath();
  values.forEach((v, i) => {
    const x = (i / (values.length - 1)) * (w - 10) + 5;
    const y = h - ((v - min) / range) * (h - 10) - 5;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.lineTo(w - 5, h);
  ctx.lineTo(5, h);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
  
  // Draw line
  ctx.beginPath();
  values.forEach((v, i) => {
    const x = (i / (values.length - 1)) * (w - 10) + 5;
    const y = h - ((v - min) / range) * (h - 10) - 5;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = isPositive ? 'rgba(74, 222, 128, 0.9)' : 'rgba(248, 113, 113, 0.9)';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

async function fetchWeather(lat = 18.6298, lon = 73.7997) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&hourly=temperature_2m&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('weather fetch failed');
  return res.json();
}

async function geocodeCity(query) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('geocode failed');
  return res.json();
}

function codeToDesc(code) {
  // very small mapping
  const map = {
    0: 'Clear',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Drizzle',
    61: 'Rain',
    71: 'Snow',
    80: 'Rain showers'
  };
  return map[code] || 'Cloudy';
}

function initSearch() {
  const input = $('#search');
  const go = $('#go');
  const trigger = () => {
    const q = (input.value || '').trim();
    if (!q) return;
    const url = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
    window.location.href = url;
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') trigger();
  });
  go?.addEventListener('click', trigger);
}

async function initWeather() {
  try {
    const data = await fetchWeather();
    const t = Math.round(data.current.temperature_2m);
    const desc = codeToDesc(data.current.weather_code);
    $('#temp').textContent = t;
    $('#weather-desc').textContent = desc;
  } catch (_) {
    // noop
  }
}

function initClock() {
  const canvas = $('#clock');
  const loop = () => {
    drawAnalogClock(canvas, new Date());
    requestAnimationFrame(loop);
  };
  loop();
}

let stockUpdateInterval = null;

function initStock() {
  const spark = $('#stock-spark');
  const values = randomSparkData();
  drawSparkline(spark, values);
  const last = values[values.length - 1];
  $('#stock-price').textContent = `$${(last + 85).toFixed(2)}`;
}

function updateStockData() {
  const spark = $('#stock-spark');
  const values = randomSparkData();
  drawSparkline(spark, values);
  const last = values[values.length - 1];
  const price = (last + 85).toFixed(2);
  $('#stock-price').textContent = `$${price}`;
  
  // Update change percentage (mock data)
  const change = (Math.random() - 0.5) * 2; // -1% to +1%
  const changeEl = $('#stock-change');
  changeEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
  changeEl.className = change >= 0 
    ? 'text-green-400 text-[11px] px-2 py-0.5 bg-green-400/10 rounded-md align-middle'
    : 'text-red-400 text-[11px] px-2 py-0.5 bg-red-400/10 rounded-md align-middle';
}

function startStockAutoUpdate() {
  // Clear existing interval if any
  if (stockUpdateInterval) {
    clearInterval(stockUpdateInterval);
  }
  
  // Update immediately
  updateStockData();
  
  // Set up auto-update every 30 seconds
  stockUpdateInterval = setInterval(updateStockData, 30000);
}

function loadSettings() {
  return new Promise((resolve) => {
    if (!chrome?.storage?.local) return resolve({});
    chrome.storage.local.get(['city', 'coords', 'stocks', 'team', 'links'], (items) => resolve(items || {}));
  });
}

function saveSettings(settings) {
  return new Promise((resolve) => {
    if (!chrome?.storage?.local) return resolve();
    chrome.storage.local.set(settings, () => resolve());
  });
}

function openSettingsModal(open, focusSelector) {
  const modal = document.getElementById('settingsModal');
  if (!modal) return;
  if (open) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (focusSelector) {
      const el = document.querySelector(focusSelector);
      if (el) setTimeout(() => el.focus(), 0);
    }
  } else {
    modal.classList.add('hidden');
  }
}

function initSettingsUI() {
  const openBtn = document.getElementById('openSettings');
  const closeBtn = document.getElementById('closeSettings');
  const saveBtn = document.getElementById('saveSettings');
  const cityInput = document.getElementById('cityInput');
  const cityResults = document.getElementById('cityResults');
  const searchCity = document.getElementById('searchCity');
  const stocksInput = document.getElementById('stocksInput');
  const teamInput = document.getElementById('teamInput');
  const editTeamBtn = document.getElementById('editTeam');

  openBtn?.addEventListener('click', () => openSettingsModal(true));
  closeBtn?.addEventListener('click', () => openSettingsModal(false));
  editTeamBtn?.addEventListener('click', async () => {
    // Open modal and focus team input
    openSettingsModal(true, '#teamInput');
  });

  // Global ESC key handler for modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('settingsModal');
      if (modal && !modal.classList.contains('hidden')) {
        e.preventDefault();
        openSettingsModal(false);
      }
    }
  });

  // Modal-wide key handlers: Enter saves
  const modal = document.getElementById('settingsModal');
  modal?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveBtn?.click();
    }
  });

  let selectedCoords = null;
  searchCity?.addEventListener('click', async () => {
    const q = (cityInput.value || '').trim();
    if (!q) return;
    cityResults.innerHTML = '<div class="text-white/50 text-sm">Searching...</div>';
    try {
      const data = await geocodeCity(q);
      const list = (data.results || []).map((r, idx) => {
        const label = `${r.name}${r.admin1 ? ', ' + r.admin1 : ''}${r.country ? ', ' + r.country : ''}`;
        return `<button data-idx="${idx}" class="w-full text-left px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10">${label}</button>`;
      }).join('');
      cityResults.innerHTML = list || '<div class="text-white/50 text-sm">No results</div>';
      Array.from(cityResults.querySelectorAll('button')).forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.getAttribute('data-idx'));
          const r = data.results[idx];
          selectedCoords = { lat: r.latitude, lon: r.longitude };
          cityInput.value = `${r.name}${r.admin1 ? ', ' + r.admin1 : ''}${r.country ? ', ' + r.country : ''}`;
        });
      });
    } catch (_) {
      cityResults.innerHTML = '<div class="text-red-300 text-sm">Search failed</div>';
    }
  });

  // Enter in city field triggers search
  cityInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchCity?.click();
    }
  });

  // Enter on stocks/team also triggers save
  [stocksInput, teamInput].forEach((el) => {
    el?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveBtn?.click();
      }
    });
  });

  saveBtn?.addEventListener('click', async () => {
    const symbols = (stocksInput.value || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    await saveSettings({
      city: cityInput.value || undefined,
      coords: selectedCoords || undefined,
      stocks: symbols.length ? symbols : ['NVDA'],
      team: (teamInput.value || '').trim() || undefined
    });
    openSettingsModal(false);
    // refresh weather/stock
    initWeatherFromSettings();
    initStockFromSettings();
    renderTeam();
  });
}

async function initWeatherFromSettings() {
  const { coords, city } = await loadSettings();
  try {
    if (coords?.lat && coords?.lon) {
      const data = await fetchWeather(coords.lat, coords.lon);
      const t = Math.round(data.current.temperature_2m);
      const desc = codeToDesc(data.current.weather_code);
      document.getElementById('temp').textContent = t;
      document.getElementById('weather-desc').textContent = desc;
      document.getElementById('city').textContent = city || 'Custom location';
      document.getElementById('locationLabel').textContent = city || 'Custom';
    } else {
      await initWeather();
    }
  } catch (_) {
    // ignore
  }
}

async function initStockFromSettings() {
  const { stocks } = await loadSettings();
  const list = Array.isArray(stocks) && stocks.length ? stocks : ['NVDA'];
  // For now show the first symbol visually
  document.getElementById('stock-symbol').textContent = list[0];
  startStockAutoUpdate();
}

function renderTeam() {
  loadSettings().then(async ({ team }) => {
    const nameEl = document.getElementById('teamName');
    const scoreEl = document.getElementById('teamScore');
    const gameStatusEl = document.getElementById('gameStatus');
    const statusDotEl = document.getElementById('statusDot');
    const statusTextEl = document.getElementById('statusText');
    const name = (team || '').trim();
    
    if (!name) {
      nameEl.textContent = 'Set your team';
      scoreEl.textContent = 'No game';
      gameStatusEl.classList.add('hidden');
      return;
    }
    
    nameEl.textContent = name;
    try {
      // TheSportsDB (free/demo) search by team and fetch last result
      const search = await (await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(name)}`)).json();
      const t = (search.teams || [])[0];
      if (!t) { 
        scoreEl.textContent = 'Team not found'; 
        gameStatusEl.classList.add('hidden');
        return; 
      }
      const teamId = t.idTeam;
      const last = await (await fetch(`https://www.thesportsdb.com/api/v1/json/3/eventslast.php?id=${teamId}`)).json();
      const game = (last.results || [])[0];
      if (!game) { 
        scoreEl.textContent = 'No recent games'; 
        gameStatusEl.classList.add('hidden');
        return; 
      }
      const isHome = game.idHomeTeam === teamId;
      const myScore = isHome ? Number(game.intHomeScore) : Number(game.intAwayScore);
      const oppScore = isHome ? Number(game.intAwayScore) : Number(game.intHomeScore);
      const opp = isHome ? game.strAwayTeam : game.strHomeTeam;
      const status = myScore > oppScore ? 'W' : myScore < oppScore ? 'L' : 'T';
      
      scoreEl.textContent = `${myScore}-${oppScore} vs ${opp}`;
      
      // Show status indicator
      gameStatusEl.classList.remove('hidden');
      statusTextEl.textContent = status === 'W' ? 'Win' : status === 'L' ? 'Loss' : 'Tie';
      
      // Set status dot color
      statusDotEl.className = 'w-2 h-2 rounded-full';
      if (status === 'W') {
        statusDotEl.classList.add('bg-green-400');
        statusTextEl.className = 'text-green-400';
      } else if (status === 'L') {
        statusDotEl.classList.add('bg-red-400');
        statusTextEl.className = 'text-red-400';
      } else {
        statusDotEl.classList.add('bg-yellow-400');
        statusTextEl.className = 'text-yellow-400';
      }
    } catch (_) {
      scoreEl.textContent = 'Fetch failed';
      gameStatusEl.classList.add('hidden');
    }
  });
}

function renderLinks() {
  const container = document.getElementById('linksGrid');
  loadSettings().then(({ links }) => {
    const list = Array.isArray(links) && links.length ? links : [
      { title: 'X', url: 'https://x.com' },
      { title: 'YouTube', url: 'https://youtube.com' },
      { title: 'GitHub', url: 'https://github.com' },
      { title: 'ChatGPT', url: 'https://chat.openai.com' }
    ];
    container.innerHTML = list.map((l, idx) => `
      <a href="${l.url}" data-idx="${idx}" class="rounded-2xl bg-panel border border-white/10 shadow-card h-16 flex items-center gap-3 px-4 text-white/80">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" class="opacity-80"><path d="M12 3l9 6-9 6-9-6 9-6z" stroke="currentColor"/></svg>
        <span class="text-sm">${l.title}</span>
      </a>
    `).join('');
  });
}

function editLinksFlow() {
  // Simple prompt-based editor for now (CSP-safe). Could be modal later.
  const container = document.getElementById('linksGrid');
  container.addEventListener('contextmenu', async (e) => {
    e.preventDefault();
    const current = await loadSettings();
    const list = Array.isArray(current.links) ? current.links : [];
    const input = prompt('Enter links as Title|URL per line', list.map(l => `${l.title}|${l.url}`).join('\n'));
    if (input == null) return;
    const parsed = input.split('\n').map(line => {
      const [title, url] = line.split('|').map(s => (s || '').trim());
      return title && url ? { title, url } : null;
    }).filter(Boolean);
    await saveSettings({ links: parsed });
    renderLinks();
  });
}

function initGreeting() {
  const hour = new Date().getHours();
  const greetingEl = document.getElementById('greeting');
  const subGreetingEl = document.getElementById('subgreeting');
  
  let greeting = 'Good morning';
  let subtext = 'What would you like to explore today?';
  
  if (hour >= 5 && hour < 12) {
    greeting = 'Good morning';
    subtext = 'Ready to start the day?';
  } else if (hour >= 12 && hour < 17) {
    greeting = 'Good afternoon';
    subtext = 'How is your day going?';
  } else if (hour >= 17 && hour < 22) {
    greeting = 'Good evening';
    subtext = 'Time to wind down and relax.';
  } else {
    greeting = 'Good night';
    subtext = 'Working late or starting early?';
  }
  
  if (greetingEl) greetingEl.textContent = greeting;
  if (subGreetingEl) subGreetingEl.textContent = subtext;
}

document.addEventListener('DOMContentLoaded', () => {
  initGreeting();
  initSearch();
  initClock();
  initSettingsUI();
  initStockFromSettings();
  initWeatherFromSettings();
  renderTeam();
});


