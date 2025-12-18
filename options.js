document.addEventListener('DOMContentLoaded', loadSettings);

let selectedCountry = '';
let selectedCity = '';

async function loadSettings() {
  const stored = await chrome.storage.local.get([
    'city', 'country', 'method', 'school',
    'useManualTimes', 'manualTimes',
    'alertTime', 'notifications',
    'nameRotationInterval', 'arabicFont', 'theme', 'pattern'
  ]);

  // Initialize searchable dropdowns
  initCountryDropdown();

  // Set stored values
  selectedCountry = stored.country || 'UK';
  selectedCity = stored.city || 'London';

  document.getElementById('country').value = selectedCountry;
  document.getElementById('country-search').value = selectedCountry;
  document.getElementById('city').value = selectedCity;
  document.getElementById('city-search').value = selectedCity;

  // Enable city dropdown if country is set
  if (selectedCountry && LOCATIONS[selectedCountry]) {
    document.getElementById('city-search').disabled = false;
    document.getElementById('city-search').placeholder = 'Search city...';
    populateCityDropdown(selectedCountry);
  }

  document.getElementById('method').value = stored.method || 2;
  document.getElementById('school').value = stored.school || 0;

  // Manual times
  const useManual = stored.useManualTimes || false;
  document.getElementById('use-manual-times').checked = useManual;
  toggleManualTimes(useManual);

  const manualTimes = stored.manualTimes || {};
  document.getElementById('time-fajr').value = manualTimes.Fajr || '05:00';
  document.getElementById('time-sunrise').value = manualTimes.Sunrise || '06:30';
  document.getElementById('time-dhuhr').value = manualTimes.Dhuhr || '12:30';
  document.getElementById('time-asr').value = manualTimes.Asr || '15:30';
  document.getElementById('time-maghrib').value = manualTimes.Maghrib || '18:30';
  document.getElementById('time-isha').value = manualTimes.Isha || '20:00';

  document.getElementById('alert-time').value = stored.alertTime || 20;

  const notifications = stored.notifications || {
    fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true
  };
  document.getElementById('notify-fajr').checked = notifications.fajr;
  document.getElementById('notify-dhuhr').checked = notifications.dhuhr;
  document.getElementById('notify-asr').checked = notifications.asr;
  document.getElementById('notify-maghrib').checked = notifications.maghrib;
  document.getElementById('notify-isha').checked = notifications.isha;

  document.getElementById('name-interval').value = stored.nameRotationInterval || 1;

  // Arabic font
  const arabicFont = stored.arabicFont || 'naskh';
  document.getElementById('arabic-font').value = arabicFont;
  updateFontPreview(arabicFont);

  // Theme
  const theme = stored.theme || 'dark-gold';
  document.getElementById('theme').value = theme;
  applyTheme(theme);

  // Pattern
  const pattern = stored.pattern || 'stars';
  document.getElementById('pattern').value = pattern;
  applyPattern(pattern);

  // Event listeners
  document.getElementById('use-manual-times').addEventListener('change', (e) => {
    toggleManualTimes(e.target.checked);
  });
  document.getElementById('arabic-font').addEventListener('change', (e) => {
    updateFontPreview(e.target.value);
  });
  document.getElementById('theme').addEventListener('change', (e) => {
    applyTheme(e.target.value);
  });
  document.getElementById('pattern').addEventListener('change', (e) => {
    applyPattern(e.target.value);
  });
  document.getElementById('save-btn').addEventListener('click', saveSettings);
  document.getElementById('reset-btn').addEventListener('click', resetSettings);
  document.getElementById('test-notification-btn').addEventListener('click', testNotification);
}

// Searchable dropdown functions
function initCountryDropdown() {
  const searchInput = document.getElementById('country-search');
  const dropdown = document.getElementById('country-dropdown');
  const countries = Object.keys(LOCATIONS).sort();

  // Populate initial list
  renderCountryList(countries);

  // Search functionality
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = countries.filter(c => c.toLowerCase().includes(query));
    renderCountryList(filtered);
    dropdown.classList.add('show');
  });

  // Show dropdown on focus
  searchInput.addEventListener('focus', () => {
    dropdown.classList.add('show');
  });

  // Hide dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#country-select')) {
      dropdown.classList.remove('show');
    }
    if (!e.target.closest('#city-select')) {
      document.getElementById('city-dropdown').classList.remove('show');
    }
  });
}

function renderCountryList(countries) {
  const dropdown = document.getElementById('country-dropdown');
  dropdown.innerHTML = countries.map(country =>
    `<div class="dropdown-item" data-value="${country}">${country}</div>`
  ).join('');

  // Add click handlers
  dropdown.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', () => selectCountry(item.dataset.value));
  });
}

function selectCountry(country) {
  selectedCountry = country;
  document.getElementById('country').value = country;
  document.getElementById('country-search').value = country;
  document.getElementById('country-dropdown').classList.remove('show');

  // Enable and populate city dropdown
  const citySearch = document.getElementById('city-search');
  citySearch.disabled = false;
  citySearch.placeholder = 'Type or select city...';
  citySearch.value = '';
  selectedCity = '';
  document.getElementById('city').value = '';

  populateCityDropdown(country);
}

function populateCityDropdown(country) {
  const cities = LOCATIONS[country] || [];
  const dropdown = document.getElementById('city-dropdown');
  const searchInput = document.getElementById('city-search');

  renderCityList(cities);

  // Remove old listener and add new one
  const newSearchInput = searchInput.cloneNode(true);
  searchInput.parentNode.replaceChild(newSearchInput, searchInput);

  newSearchInput.addEventListener('input', (e) => {
    const query = e.target.value;
    // Always update the hidden field with typed value (allows custom cities)
    document.getElementById('city').value = query;
    selectedCity = query;

    const filtered = cities.filter(c => c.toLowerCase().includes(query.toLowerCase()));
    renderCityList(filtered.length ? filtered : cities);
    dropdown.classList.add('show');
  });

  newSearchInput.addEventListener('focus', () => {
    dropdown.classList.add('show');
  });
}

function renderCityList(cities) {
  const dropdown = document.getElementById('city-dropdown');
  dropdown.innerHTML = cities.map(city =>
    `<div class="dropdown-item" data-value="${city}">${city}</div>`
  ).join('');

  // Add click handlers
  dropdown.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', () => selectCity(item.dataset.value));
  });
}

function selectCity(city) {
  selectedCity = city;
  document.getElementById('city').value = city;
  document.getElementById('city-search').value = city;
  document.getElementById('city-dropdown').classList.remove('show');
}

function updateFontPreview(font) {
  const preview = document.getElementById('font-preview-text');
  preview.className = `font-${font}`;
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

function applyPattern(pattern) {
  document.documentElement.setAttribute('data-pattern', pattern);
}

function toggleManualTimes(enabled) {
  const container = document.getElementById('manual-times-container');
  const inputs = container.querySelectorAll('input[type="time"]');

  if (enabled) {
    container.classList.add('enabled');
    inputs.forEach(input => input.disabled = false);
  } else {
    container.classList.remove('enabled');
    inputs.forEach(input => input.disabled = true);
  }
}

async function saveSettings() {
  const useManualTimes = document.getElementById('use-manual-times').checked;

  const manualTimes = {
    Fajr: document.getElementById('time-fajr').value,
    Sunrise: document.getElementById('time-sunrise').value,
    Dhuhr: document.getElementById('time-dhuhr').value,
    Asr: document.getElementById('time-asr').value,
    Maghrib: document.getElementById('time-maghrib').value,
    Isha: document.getElementById('time-isha').value
  };

  const city = document.getElementById('city').value.trim();
  const country = document.getElementById('country').value.trim();

  const settings = {
    city,
    country,
    method: parseInt(document.getElementById('method').value),
    school: parseInt(document.getElementById('school').value),
    useManualTimes,
    manualTimes,
    alertTime: parseInt(document.getElementById('alert-time').value) || 20,
    notifications: {
      fajr: document.getElementById('notify-fajr').checked,
      dhuhr: document.getElementById('notify-dhuhr').checked,
      asr: document.getElementById('notify-asr').checked,
      maghrib: document.getElementById('notify-maghrib').checked,
      isha: document.getElementById('notify-isha').checked
    },
    nameRotationInterval: parseInt(document.getElementById('name-interval').value) || 1,
    arabicFont: document.getElementById('arabic-font').value,
    theme: document.getElementById('theme').value,
    pattern: document.getElementById('pattern').value,
    lastFetch: 0
  };

  if (!useManualTimes && (!city || !country)) {
    showStatus('Please select city and country for automatic times', 'error');
    return;
  }

  try {
    // Clear cached prayer times first to force fresh fetch
    await chrome.storage.local.remove(['prayerTimes', 'dateInfo']);
    await chrome.storage.local.set(settings);
    chrome.runtime.sendMessage({ action: 'refreshAlarms' });
    showStatus('Settings saved successfully!', 'success');

    // Show browser notification as confirmation
    chrome.notifications.create(`settings-saved-${Date.now()}`, {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Settings Saved',
      message: 'Your prayer times settings have been updated successfully.',
      priority: 1
    });
  } catch (error) {
    showStatus('Error saving settings', 'error');
  }
}

async function resetSettings() {
  const defaults = {
    city: 'London',
    country: 'UK',
    method: 2,
    school: 0,
    useManualTimes: false,
    manualTimes: {
      Fajr: '05:00',
      Sunrise: '06:30',
      Dhuhr: '12:30',
      Asr: '15:30',
      Maghrib: '18:30',
      Isha: '20:00'
    },
    alertTime: 20,
    notifications: {
      fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true
    },
    nameRotationInterval: 1,
    arabicFont: 'naskh',
    theme: 'dark-gold',
    pattern: 'stars',
    lastFetch: 0
  };

  await chrome.storage.local.remove(['prayerTimes', 'dateInfo']);
  await chrome.storage.local.set(defaults);

  // Reload the page to reinitialize dropdowns
  location.reload();
}

function showStatus(message, type) {
  const statusEl = document.getElementById('status-message');
  statusEl.textContent = message;
  statusEl.className = type;
  statusEl.style.display = 'block';

  setTimeout(() => {
    statusEl.className = '';
    statusEl.style.display = 'none';
  }, 3000);
}

function testNotification() {
  const alertMinutes = parseInt(document.getElementById('alert-time').value) || 20;
  const prayerName = 'Fajr';
  const sampleTime = '05:30';

  chrome.notifications.create(`test-notification-${Date.now()}`, {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: `${prayerName} Prayer Reminder`,
    message: `${prayerName} prayer is in ${alertMinutes} minutes (${sampleTime})`,
    priority: 2,
    requireInteraction: true
  });
}
