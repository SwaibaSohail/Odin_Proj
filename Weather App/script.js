// ============================================================
// CONFIG
// ============================================================
const VC_API_KEY  = 'G387DRFUHRQGDK7WFJFYA4FLZ'; // Visual Crossing demo key
const GIPHY_KEY   = 'GlVGYHkr3WSBnllca54iNt0yFbjkRWjh'; // Public Giphy key
 
// ============================================================
// STATE
// ============================================================
let useCelsius   = false;
let currentData  = null;
 
// ============================================================
// THEME / ATMOSPHERE
// ============================================================
const THEMES = {
  sunny:   { from:'#1a0e00', to:'#3d2200', accent:'#ffd166', accent2:'#ffe8a3', text:'#fff8e8' },
  hot:     { from:'#2a0800', to:'#5c1800', accent:'#ff6b35', accent2:'#ffa07a', text:'#fff0e8' },
  cloudy:  { from:'#0e1420', to:'#2a3040', accent:'#94a8c8', accent2:'#c8d8ec', text:'#dce8f8' },
  rainy:   { from:'#071018', to:'#0e2030', accent:'#5fa8d3', accent2:'#a8d0e8', text:'#d0e8f5' },
  stormy:  { from:'#04080f', to:'#0a1520', accent:'#7eb8f7', accent2:'#b0d0f0', text:'#cce0f8' },
  snowy:   { from:'#0c1018', to:'#1a2535', accent:'#c8dff8', accent2:'#e8f2ff', text:'#eef4ff' },
  foggy:   { from:'#101318', to:'#202530', accent:'#a0b0c0', accent2:'#c8d4dc', text:'#d8e0e8' },
  night:   { from:'#040810', to:'#080f20', accent:'#7090e0', accent2:'#a0c0f0', text:'#c8d8f8' },
};
 
function conditionToTheme(conditions = '', icon = '', temp = 70) {
  const c = (conditions + ' ' + icon).toLowerCase();
  if (c.includes('thunder') || c.includes('storm') || c.includes('lightning'))      return 'stormy';
  if (c.includes('snow')  || c.includes('sleet') || c.includes('ice'))              return 'snowy';
  if (c.includes('fog')   || c.includes('mist')  || c.includes('haze'))             return 'foggy';
  if (c.includes('rain')  || c.includes('shower')|| c.includes('drizzle'))          return 'rainy';
  if (c.includes('overcast') || c.includes('cloud'))                                return 'cloudy';
  if (c.includes('clear') || c.includes('sun'))  return (temp > 90 ? 'hot' : 'sunny');
  if (c.includes('partly')) return 'cloudy';
  return 'cloudy';
}
 
function applyTheme(name) {
  const t = THEMES[name] || THEMES.cloudy;
  const r = document.documentElement.style;
  r.setProperty('--bg-from',   t.from);
  r.setProperty('--bg-to',     t.to);
  r.setProperty('--accent',    t.accent);
  r.setProperty('--accent2',   t.accent2);
  r.setProperty('--text',      t.text);
}
 
// ============================================================
// ATMOSPHERIC PARTICLE EFFECTS
// ============================================================
function buildStars() {
  const layer = document.getElementById('stars-layer');
  layer.innerHTML = '';
  for (let i = 0; i < 120; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    const sz = Math.random() * 2 + 1;
    s.style.cssText = `width:${sz}px;height:${sz}px;top:${Math.random()*100}%;left:${Math.random()*100}%;--d:${2+Math.random()*4}s;--delay:${Math.random()*5}s`;
    layer.appendChild(s);
  }
}
 
function buildClouds() {
  const layer = document.getElementById('clouds-layer');
  layer.innerHTML = '';
  for (let i = 0; i < 6; i++) {
    const c = document.createElement('div');
    c.className = 'cloud-shape';
    const w = 120 + Math.random() * 200, h = 40 + Math.random() * 60;
    c.style.cssText = `width:${w}px;height:${h}px;top:${Math.random()*60}%;--d:${30+Math.random()*40}s;--delay:-${Math.random()*40}s`;
    layer.appendChild(c);
  }
}
 
function buildRain(count = 80) {
  const layer = document.getElementById('rain-layer');
  layer.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const d = document.createElement('div');
    d.className = 'raindrop';
    const h = 20 + Math.random() * 40;
    d.style.cssText = `height:${h}px;left:${Math.random()*100}%;top:${Math.random()*100}%;--d:${0.5+Math.random()*0.7}s;--delay:-${Math.random()*2}s`;
    layer.appendChild(d);
  }
}
 
function buildSnow(count = 50) {
  const layer = document.getElementById('snow-layer');
  layer.innerHTML = '';
  const flakes = ['❄','❅','❆','·','*'];
  for (let i = 0; i < count; i++) {
    const f = document.createElement('div');
    f.className = 'snowflake';
    f.textContent = flakes[Math.floor(Math.random() * flakes.length)];
    const sz = 8 + Math.random() * 12;
    const drift = (Math.random() - 0.5) * 80;
    f.style.cssText = `--size:${sz}px;--drift:${drift}px;left:${Math.random()*100}%;--d:${4+Math.random()*6}s;--delay:-${Math.random()*8}s`;
    layer.appendChild(f);
  }
}
 
function setAtmosphere(theme) {
  const starOp   = ['night','foggy'].includes(theme) ? 1 : (theme === 'stormy' ? 0 : 0.4);
  const cloudOp  = ['cloudy','rainy','stormy','foggy','snowy'].includes(theme) ? 1 : 0.1;
  const rainOp   = ['rainy','stormy'].includes(theme) ? 1 : 0;
  const snowOp   = theme === 'snowy' ? 1 : 0;
 
  document.getElementById('stars-layer').style.opacity  = starOp;
  document.getElementById('clouds-layer').style.opacity = cloudOp;
  document.getElementById('rain-layer').style.opacity   = rainOp;
  document.getElementById('snow-layer').style.opacity   = snowOp;
}
 
// ============================================================
// WEATHER ICON MAP
// ============================================================
function iconForCondition(conditions = '', icon = '') {
  const c = (conditions + ' ' + icon).toLowerCase();
  if (c.includes('thunder') || c.includes('storm'))  return '⛈';
  if (c.includes('snow') || c.includes('sleet'))     return '❄️';
  if (c.includes('hail'))                             return '🌨';
  if (c.includes('fog') || c.includes('mist'))       return '🌫';
  if (c.includes('rain') || c.includes('shower') || c.includes('drizzle')) return '🌧';
  if (c.includes('overcast'))                         return '☁️';
  if (c.includes('partly') || c.includes('partial')) return '⛅';
  if (c.includes('clear') || c.includes('sun'))      return '☀️';
  if (c.includes('wind'))                             return '💨';
  return '🌤';
}
 
// ============================================================
// TEMPERATURE CONVERSION
// ============================================================
function fToC(f) { return ((f - 32) * 5 / 9).toFixed(1); }
function formatTemp(tempF) {
  if (useCelsius) return `${fToC(tempF)}°C`;
  return `${Math.round(tempF)}°F`;
}
 
// ============================================================
// API: VISUAL CROSSING
// ============================================================
async function fetchWeather(location) {
  const unit = 'us'; // always fetch in F, convert client-side
  const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodeURIComponent(location)}?unitGroup=${unit}&key=${VC_API_KEY}&contentType=json&include=current,hours,days`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather API error: ${res.status} ${res.statusText}`);
  return res.json();
}
 
function processWeatherData(raw) {
  const cur  = raw.currentConditions;
  const days = raw.days.slice(0, 7);
  return {
    location:    raw.resolvedAddress,
    timezone:    raw.timezone,
    description: raw.description,
    current: {
      temp:       cur.temp,
      feelsLike:  cur.feelslike,
      humidity:   cur.humidity,
      windspeed:  cur.windspeed,
      visibility: cur.visibility,
      uvindex:    cur.uvindex,
      conditions: cur.conditions,
      icon:       cur.icon,
      sunrise:    cur.sunrise,
      sunset:     cur.sunset,
    },
    days: days.map(d => ({
      date:       d.datetime,
      tempMax:    d.tempmax,
      tempMin:    d.tempmin,
      precip:     d.precipprob,
      conditions: d.conditions,
      icon:       d.icon,
      description:d.description,
      hours:      (d.hours || []).slice(0, 24).map(h => ({
        time:   h.datetime,
        temp:   h.temp,
        conditions: h.conditions,
        icon:   h.icon,
      }))
    }))
  };
}
 
// ============================================================
// API: GIPHY
// ============================================================
async function fetchGif(query) {
  const url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(query + ' weather')}&limit=5&rating=g`;
  try {
    const res  = await fetch(url);
    const data = await res.json();
    if (data.data && data.data.length > 0) {
      const pick = data.data[Math.floor(Math.random() * Math.min(5, data.data.length))];
      return pick.images.downsized_medium?.url || pick.images.fixed_height?.url;
    }
  } catch (e) { /* silently fail */ }
  return null;
}
 
// ============================================================
// RENDER
// ============================================================
function renderCurrentWeather(data) {
  const cur = data.current;
  const themeKey = conditionToTheme(cur.conditions, cur.icon, cur.temp);
 
  // Theme
  applyTheme(themeKey);
  setAtmosphere(themeKey);
 
  // Location + date
  document.getElementById('loc-name').textContent = data.location;
  const today = new Date();
  document.getElementById('cur-date').textContent = today.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
 
  // Condition
  document.getElementById('cur-condition').textContent = cur.conditions;
 
  // Big temp
  document.getElementById('cur-temp').textContent = formatTemp(cur.temp);
  document.getElementById('cur-feels').textContent = `Feels like ${formatTemp(cur.feelsLike)}`;
  document.getElementById('cur-icon').textContent  = iconForCondition(cur.conditions, cur.icon);
 
  // Details
  const detailsEl = document.getElementById('cur-details');
  detailsEl.innerHTML = `
    <div class="detail-item"><span class="detail-label">Humidity</span><span class="detail-value">${cur.humidity}%</span></div>
    <div class="detail-item"><span class="detail-label">Wind</span><span class="detail-value">${Math.round(cur.windspeed)} mph</span></div>
    <div class="detail-item"><span class="detail-label">Visibility</span><span class="detail-value">${cur.visibility} mi</span></div>
    <div class="detail-item"><span class="detail-label">UV Index</span><span class="detail-value">${cur.uvindex}</span></div>
    <div class="detail-item"><span class="detail-label">Sunrise</span><span class="detail-value">${cur.sunrise}</span></div>
    <div class="detail-item"><span class="detail-label">Sunset</span><span class="detail-value">${cur.sunset}</span></div>
  `;
}
 
function renderForecast(data) {
  const grid = document.getElementById('forecast-grid');
  grid.innerHTML = '';
  data.days.forEach(day => {
    const d = new Date(day.date + 'T12:00:00');
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const card = document.createElement('div');
    card.className = 'forecast-card';
    card.innerHTML = `
      <div class="fc-day">${dayName}</div>
      <div class="fc-icon">${iconForCondition(day.conditions, day.icon)}</div>
      <div class="fc-high">${formatTemp(day.tempMax)}</div>
      <div class="fc-low">${formatTemp(day.tempMin)}</div>
      ${day.precip > 10 ? `<div class="fc-precip">💧 ${day.precip}%</div>` : ''}
    `;
    grid.appendChild(card);
  });
}
 
function renderHourly(data) {
  const scroll = document.getElementById('hourly-scroll');
  scroll.innerHTML = '';
  const today = data.days[0];
  if (!today || !today.hours) return;
 
  today.hours.forEach(h => {
    const [hr] = h.time.split(':');
    const hour = parseInt(hr, 10);
    const label = hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`;
    const card = document.createElement('div');
    card.className = 'hour-card';
    card.innerHTML = `
      <div class="hc-time">${label}</div>
      <div class="hc-icon">${iconForCondition(h.conditions, h.icon)}</div>
      <div class="hc-temp">${formatTemp(h.temp)}</div>
    `;
    scroll.appendChild(card);
  });
}
 
async function renderGif(conditions) {
  const gifSection = document.getElementById('gif-section');
  const gifImg     = document.getElementById('weather-gif');
  const gifUrl     = await fetchGif(conditions.split(',')[0]);
  if (gifUrl) {
    gifImg.src = gifUrl;
    gifSection.classList.add('visible');
  } else {
    gifSection.classList.remove('visible');
  }
}
 
function renderAll(data) {
  renderCurrentWeather(data);
  renderForecast(data);
  renderHourly(data);
  document.getElementById('weather-display').classList.add('visible');
  // Fetch gif asynchronously (non-blocking)
  renderGif(data.current.conditions);
}
 
// Re-render temperatures only (on unit toggle)
function rerenderTemps() {
  if (!currentData) return;
  const cur = currentData.current;
  document.getElementById('cur-temp').textContent   = formatTemp(cur.temp);
  document.getElementById('cur-feels').textContent  = `Feels like ${formatTemp(cur.feelsLike)}`;
  renderForecast(currentData);
  renderHourly(currentData);
}
 
// ============================================================
// SEARCH FLOW
// ============================================================
function showLoading(on) {
  document.getElementById('loading').classList.toggle('visible', on);
  document.getElementById('search-btn').disabled = on;
}
 
function showError(msg) {
  const el = document.getElementById('error-msg');
  el.textContent = msg;
  el.classList.add('visible');
}
function clearError() {
  document.getElementById('error-msg').classList.remove('visible');
}
 
async function doSearch(location) {
  if (!location.trim()) return;
  clearError();
  document.getElementById('weather-display').classList.remove('visible');
  document.getElementById('gif-section').classList.remove('visible');
  showLoading(true);
 
  try {
    const raw  = await fetchWeather(location);
    currentData = processWeatherData(raw);
    renderAll(currentData);
  } catch (err) {
    showError(`Couldn't find weather for "${location}". Please check the location and try again.`);
    console.error(err);
  } finally {
    showLoading(false);
  }
}
 
// ============================================================
// EVENT LISTENERS
// ============================================================
document.getElementById('search-btn').addEventListener('click', () => {
  doSearch(document.getElementById('location-input').value);
});
 
document.getElementById('location-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') doSearch(e.target.value);
});
 
const toggleEl = document.getElementById('unit-toggle');
function setUnit(celsius) {
  useCelsius = celsius;
  toggleEl.classList.toggle('celsius', celsius);
  toggleEl.setAttribute('aria-checked', String(celsius));
  document.getElementById('lbl-f').classList.toggle('active', !celsius);
  document.getElementById('lbl-c').classList.toggle('active', celsius);
  rerenderTemps();
}
document.getElementById('lbl-f').classList.add('active'); // default °F
 
toggleEl.addEventListener('click', () => setUnit(!useCelsius));
toggleEl.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setUnit(!useCelsius); } });
 
// ============================================================
// INIT
// ============================================================
buildStars();
buildClouds();
buildRain(90);
buildSnow(60);
 
// Default load
doSearch('London, UK');