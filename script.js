'use strict';

/* ==========================================================================
   STORAGE HELPERS
   ========================================================================== */
const Store = {
  get(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }catch(e){
      return fallback;
    }
  },
  set(key, value){
    try{ localStorage.setItem(key, JSON.stringify(value)); }
    catch(e){ /* storage unavailable — fail silently, app still works in-session */ }
  }
};

/* ==========================================================================
   1. DASHBOARD NAVIGATION
   ========================================================================== */
const Navigation = (() => {
  const dashboard = document.getElementById('dashboard');
  const featurePanels = document.querySelectorAll('[data-feature]');
  const cards = document.querySelectorAll('.card[data-target]');
  let activeFeature = null;
  let isTransitioning = false; // guards against rapid double-clicks

  function open(name){
    if(isTransitioning || activeFeature === name) return;
    const panel = document.getElementById(`feature-${name}`);
    if(!panel) return;

    isTransitioning = true;
    featurePanels.forEach(p => { p.classList.remove('is-active'); p.setAttribute('aria-hidden', 'true'); });
    panel.classList.add('is-active');
    panel.setAttribute('aria-hidden', 'false');
    dashboard.setAttribute('aria-hidden', 'true');
    activeFeature = name;

    document.dispatchEvent(new CustomEvent('feature:opened', { detail: { name } }));
    window.setTimeout(() => { isTransitioning = false; }, 220);
  }

  function close(){
    if(isTransitioning || !activeFeature) return;
    isTransitioning = true;
    featurePanels.forEach(p => { p.classList.remove('is-active'); p.setAttribute('aria-hidden', 'true'); });
    dashboard.setAttribute('aria-hidden', 'false');
    activeFeature = null;
    window.setTimeout(() => { isTransitioning = false; }, 220);
  }

  cards.forEach(card => {
    card.addEventListener('click', () => open(card.dataset.target));
  });

  document.querySelectorAll('[data-back]').forEach(btn => {
    btn.addEventListener('click', close);
  });

  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape') close();
  });

  return { open, close };
})();

/* ==========================================================================
   2. TODO LIST
   ========================================================================== */
const TodoList = (() => {
  const STORAGE_KEY = 'dashboard:todos';
  const form = document.getElementById('todoForm');
  const input = document.getElementById('todoInput');
  const list = document.getElementById('todoList');
  const emptyState = document.getElementById('todoEmpty');
  const cardMeta = document.getElementById('todoCardMeta');

  let todos = Store.get(STORAGE_KEY, []);

  function save(){
    Store.set(STORAGE_KEY, todos);
    updateCardMeta();
  }

  function updateCardMeta(){
    const open = todos.filter(t => !t.done).length;
    cardMeta.textContent = todos.length === 0
      ? '0 tasks'
      : `${open} open · ${todos.length} total`;
  }

  function render(){
    list.innerHTML = '';
    emptyState.classList.toggle('is-visible', todos.length === 0);

    // Important + incomplete first, then completed at the bottom
    const ordered = [...todos].sort((a, b) => {
      if(a.done !== b.done) return a.done ? 1 : -1;
      if(a.important !== b.important) return a.important ? -1 : 1;
      return 0;
    });

    ordered.forEach(todo => {
      const li = document.createElement('li');
      li.className = 'task' + (todo.done ? ' is-complete' : '') + (todo.important ? ' is-important' : '');
      li.dataset.id = todo.id;
      li.innerHTML = `
        <button class="task__check" data-action="toggle" aria-label="Mark task complete">${todo.done ? '✓' : ''}</button>
        <span class="task__text"></span>
        <button class="task__star" data-action="important" aria-label="Mark important">★</button>
        <button class="task__delete" data-action="delete" aria-label="Delete task">✕</button>
      `;
      li.querySelector('.task__text').textContent = todo.text; // textContent avoids injection
      list.appendChild(li);
    });

    updateCardMeta();
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if(!text) return;
    todos.push({ id: crypto.randomUUID(), text, done: false, important: false });
    save();
    render();
    input.value = '';
    input.focus();
  });

  // Event delegation for toggle / important / delete
  list.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if(!btn) return;
    const li = btn.closest('.task');
    const id = li.dataset.id;
    const todo = todos.find(t => t.id === id);
    if(!todo) return;

    if(btn.dataset.action === 'toggle') todo.done = !todo.done;
    if(btn.dataset.action === 'important') todo.important = !todo.important;
    if(btn.dataset.action === 'delete') todos = todos.filter(t => t.id !== id);

    save();
    render();
  });

  render();
})();

/* ==========================================================================
   3. DAILY PLANNER
   ========================================================================== */
const Planner = (() => {
  const STORAGE_KEY = 'dashboard:planner';
  const container = document.getElementById('plannerList');
  const HOURS = Array.from({ length: 24 }, (_, h) => h); // 00:00 - 23:00

  let entries = Store.get(STORAGE_KEY, {});
  let saveTimer = null;

  function formatHour(h){
    const period = h < 12 ? 'AM' : 'PM';
    const display = h % 12 === 0 ? 12 : h % 12;
    return `${String(display).padStart(2, '0')}:00 ${period}`;
  }

  function render(){
    container.innerHTML = '';
    const currentHour = new Date().getHours();

    HOURS.forEach(h => {
      const row = document.createElement('div');
      row.className = 'planner-row' + (h === currentHour ? ' is-current' : '');
      row.innerHTML = `
        <span class="planner-row__time">${formatHour(h)}</span>
        <input type="text" data-hour="${h}" placeholder="Nothing planned" maxlength="80">
      `;
      const inputEl = row.querySelector('input');
      inputEl.value = entries[h] || ''; // handle empty slots gracefully
      container.appendChild(row);
    });
  }

  function scheduleSave(hour, value){
    // Save on a short debounce rather than every single keystroke
    entries[hour] = value;
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => Store.set(STORAGE_KEY, entries), 400);
  }

  container.addEventListener('input', (e) => {
    const el = e.target;
    if(el.matches('input[data-hour]')){
      scheduleSave(el.dataset.hour, el.value);
    }
  });

  // Re-highlight the current hour periodically in case the app stays open
  window.setInterval(() => {
    const currentHour = new Date().getHours();
    container.querySelectorAll('.planner-row').forEach((row, idx) => {
      row.classList.toggle('is-current', idx === currentHour);
    });
  }, 60 * 1000);

  render();
})();

/* ==========================================================================
   4. MOTIVATION QUOTE
   ========================================================================== */
const MotivationQuote = (() => {
  const card = document.getElementById('quoteCard');
  const textEl = document.getElementById('quoteText');
  const authorEl = document.getElementById('quoteAuthor');
  const refreshBtn = document.getElementById('quoteRefresh');
  let hasLoadedOnce = false;

  async function fetchQuote(){
    card.classList.remove('is-error');
    card.classList.add('is-loading');
    textEl.textContent = 'Fetching a fresh quote…';
    authorEl.textContent = '';
    refreshBtn.disabled = true;

    try{
      // Free, keyless quote API
      const res = await fetch('https://dummyjson.com/quotes/random');
      if(!res.ok) throw new Error('Request failed');
      const data = await res.json();

      textEl.textContent = `“${data.quote}”`;
      authorEl.textContent = `— ${data.author}`;
      card.classList.remove('is-loading');
    }catch(err){
      card.classList.remove('is-loading');
      card.classList.add('is-error');
      textEl.textContent = "Couldn't reach the quote service. Here's one to keep anyway: “Small steps still move you forward.”";
      authorEl.textContent = '';
    }finally{
      refreshBtn.disabled = false;
    }
  }

  refreshBtn.addEventListener('click', fetchQuote);

  // Fetch once when the feature is first opened, not on page load
  document.addEventListener('feature:opened', (e) => {
    if(e.detail.name === 'quote' && !hasLoadedOnce){
      hasLoadedOnce = true;
      fetchQuote();
    }
  });
})();

/* ==========================================================================
   5. POMODORO TIMER
   ========================================================================== */
const Pomodoro = (() => {
  const display = document.getElementById('timerDisplay');
  const sessionLabel = document.getElementById('pomodoroSession');
  const startBtn = document.getElementById('timerStart');
  const pauseBtn = document.getElementById('timerPause');
  const resetBtn = document.getElementById('timerReset');
  const chips = document.querySelectorAll('.chip');
  const cardMeta = document.getElementById('pomodoroCardMeta');
  const timerWrap = document.querySelector('.timer');

  let defaultMinutes = 25;
  let remainingSeconds = defaultMinutes * 60;
  let intervalId = null; // single reference — prevents overlapping intervals

  function format(totalSeconds){
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function updateDisplay(){
    const formatted = format(remainingSeconds);
    display.textContent = formatted;
    cardMeta.textContent = intervalId ? `${formatted} running` : `${formatted} ready`;
  }

  function tick(){
    remainingSeconds -= 1;
    if(remainingSeconds <= 0){
      remainingSeconds = 0;
      updateDisplay();
      stop();
      notifyDone();
      return;
    }
    updateDisplay();
  }

  function start(){
    if(intervalId) return; // already running — never stack intervals
    intervalId = window.setInterval(tick, 1000);
    timerWrap.classList.add('is-running');
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    updateDisplay();
  }

  function stop(){
    window.clearInterval(intervalId);
    intervalId = null;
    timerWrap.classList.remove('is-running');
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    updateDisplay();
  }

  function reset(){
    stop();
    remainingSeconds = defaultMinutes * 60;
    updateDisplay();
  }

  function notifyDone(){
    display.classList.add('is-running');
    const original = sessionLabel.textContent;
    sessionLabel.textContent = `${original} — time's up!`;
    if('vibrate' in navigator){ navigator.vibrate([200, 100, 200]); }
    window.setTimeout(() => { sessionLabel.textContent = original; }, 4000);
  }

  startBtn.addEventListener('click', start);
  pauseBtn.addEventListener('click', stop);
  resetBtn.addEventListener('click', reset);

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      defaultMinutes = Number(chip.dataset.mins);
      sessionLabel.textContent = chip.dataset.label;
      stop();
      remainingSeconds = defaultMinutes * 60;
      updateDisplay();
    });
  });

  updateDisplay();
})();

/* ==========================================================================
   6. WEATHER WIDGET
   ========================================================================== */
const Weather = (() => {
  const iconEl = document.getElementById('weatherIcon');
  const tempEl = document.getElementById('weatherTemp');
  const placeEl = document.getElementById('weatherPlace');
  const detailEl = document.getElementById('weatherDetail');

  // Default location used only if the user denies/lacks geolocation
  const FALLBACK = { lat: 51.5072, lon: -0.1276, name: 'London' };

  const WEATHER_ICON = {
    0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
    45: '🌫️', 48: '🌫️',
    51: '🌦️', 53: '🌦️', 55: '🌦️',
    61: '🌧️', 63: '🌧️', 65: '🌧️',
    71: '🌨️', 73: '🌨️', 75: '🌨️',
    80: '🌦️', 81: '🌧️', 82: '⛈️',
    95: '⛈️', 96: '⛈️', 99: '⛈️'
  };

  function iconFor(code){ return WEATHER_ICON[code] || '⛅'; }

  async function fetchWeather(lat, lon, placeName){
    try{
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`;
      const res = await fetch(url);
      if(!res.ok) throw new Error('Weather request failed');
      const data = await res.json();
      const c = data.current;

      iconEl.textContent = iconFor(c.weather_code);
      tempEl.textContent = `${Math.round(c.temperature_2m)}°C`;
      placeEl.textContent = placeName;
      detailEl.textContent = `Humidity ${c.relative_humidity_2m}% · Wind ${Math.round(c.wind_speed_10m)} km/h`;
    }catch(err){
      placeEl.textContent = 'Weather unavailable';
      detailEl.textContent = 'Check your connection and try again later.';
      tempEl.textContent = '--°';
    }
  }

  async function reverseGeocode(lat, lon){
    try{
      const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
      if(!res.ok) throw new Error('Geocode failed');
      const data = await res.json();
      return data.city || data.locality || data.principalSubdivision || 'Your location';
    }catch(e){
      return 'Your location';
    }
  }

  async function init(){
    if(!('geolocation' in navigator)){
      fetchWeather(FALLBACK.lat, FALLBACK.lon, FALLBACK.name);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const place = await reverseGeocode(latitude, longitude);
        fetchWeather(latitude, longitude, place);
      },
      () => {
        // Location denied or unavailable — fall back gracefully
        fetchWeather(FALLBACK.lat, FALLBACK.lon, FALLBACK.name);
      },
      { timeout: 8000 }
    );
  }

  init();
})();

/* ==========================================================================
   7. DATE & TIME DISPLAY
   ========================================================================== */
const Clock = (() => {
  const timeEl = document.getElementById('clockTime');
  const dateEl = document.getElementById('clockDate');
  let intervalId = null; // guarded so the interval can never be created twice

  function render(){
    const now = new Date();
    timeEl.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  function start(){
    if(intervalId) return;
    render(); // run once immediately so it doesn't wait a full second
    intervalId = window.setInterval(render, 1000);
  }

  start();
})();

/* ==========================================================================
   8. DYNAMIC BACKGROUND (time-of-day)
   ========================================================================== */
const DynamicBackground = (() => {
  function categoryFor(hour){
    if(hour >= 5 && hour < 11) return 'morning';
    if(hour >= 11 && hour < 17) return 'afternoon';
    if(hour >= 17 && hour < 21) return 'evening';
    return 'night'; // covers 21:00 - 04:59, no gaps across all 24 hours
  }

  function apply(){
    const hour = new Date().getHours();
    document.documentElement.setAttribute('data-daytime', categoryFor(hour));
  }

  apply();
  window.setInterval(apply, 5 * 60 * 1000); // re-check periodically for open tabs
})();

/* ==========================================================================
   9. THEME SWITCH (light / dark)
   ========================================================================== */
const ThemeSwitch = (() => {
  const STORAGE_KEY = 'dashboard:theme';
  const toggleBtn = document.getElementById('themeToggle');
  const root = document.documentElement;

  function current(){
    return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function apply(theme){
    root.setAttribute('data-theme', theme);
    Store.set(STORAGE_KEY, theme);
  }

  // Theme may already be set by the anti-flash inline script in <head>
  if(!root.getAttribute('data-theme')){
    const saved = Store.get(STORAGE_KEY, null);
    apply(saved === 'dark' ? 'dark' : 'light');
  }

  toggleBtn.addEventListener('click', () => {
    apply(current() === 'dark' ? 'light' : 'dark');
  });
})();

/* ==========================================================================
   10. DAILY GOALS
   ========================================================================== */
const DailyGoals = (() => {
  const STORAGE_KEY = 'dashboard:goals';
  const form = document.getElementById('goalForm');
  const input = document.getElementById('goalInput');
  const list = document.getElementById('goalList');
  const emptyState = document.getElementById('goalsEmpty');
  const progressText = document.getElementById('goalsProgress');
  const progressFill = document.getElementById('goalsProgressFill');
  const cardMeta = document.getElementById('goalsCardMeta');

  let goals = Store.get(STORAGE_KEY, []);

  function save(){ Store.set(STORAGE_KEY, goals); }

  function updateProgress(){
    const completed = goals.filter(g => g.done).length;
    const total = goals.length;
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

    progressText.textContent = `${completed} of ${total} completed`;
    progressFill.style.width = `${pct}%`;
    cardMeta.textContent = `${completed} of ${total} complete`;
  }

  function render(){
    list.innerHTML = '';
    emptyState.classList.toggle('is-visible', goals.length === 0);

    goals.forEach(goal => {
      const li = document.createElement('li');
      li.className = 'task' + (goal.done ? ' is-complete' : '');
      li.dataset.id = goal.id;
      li.innerHTML = `
        <button class="task__check" data-action="toggle" aria-label="Mark goal complete">${goal.done ? '✓' : ''}</button>
        <span class="task__text"></span>
        <button class="task__delete" data-action="delete" aria-label="Delete goal">✕</button>
      `;
      li.querySelector('.task__text').textContent = goal.text;
      list.appendChild(li);
    });

    updateProgress();
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if(!text) return;
    goals.push({ id: crypto.randomUUID(), text, done: false });
    save();
    render();
    input.value = '';
    input.focus();
  });

  list.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if(!btn) return;
    const id = btn.closest('.task').dataset.id;

    if(btn.dataset.action === 'toggle'){
      const goal = goals.find(g => g.id === id);
      if(goal) goal.done = !goal.done;
    }
    if(btn.dataset.action === 'delete'){
      goals = goals.filter(g => g.id !== id);
    }

    save();
    render();
  });

  render();
})();

/* ==========================================================================
   11. GREETING (time-aware header text)
   ========================================================================== */
(function Greeting(){
  const eyebrow = document.getElementById('greetingEyebrow');
  const text = document.getElementById('greetingText');
  const hour = new Date().getHours();

  let label = 'Good evening';
  let message = "Wind down, or squeeze in one more focused sprint.";
  if(hour >= 5 && hour < 12){ label = 'Good morning'; message = "Let's get things done."; }
  else if(hour >= 12 && hour < 17){ label = 'Good afternoon'; message = 'Keep the momentum going.'; }
  else if(hour >= 17 && hour < 21){ label = 'Good evening'; message = 'Wrap up the day with intention.'; }
  else { label = 'Working late'; message = "Don't forget to rest."; }

  eyebrow.textContent = label;
  text.textContent = message;
})();
