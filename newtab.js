let currentDuaIndex = 0;
let currentDuas = [];
let currentNameIndex = 0;
let nameRotationInterval = null;
let countdownInterval = null;

document.addEventListener('DOMContentLoaded', init);

async function init() {
  await loadTheme();
  await loadPrayerTimes();
  await loadFontSetting();
  setupDuas();
  setupAllahNames();
  setupEventListeners();
  startCountdown();
}

async function loadTheme() {
  const stored = await chrome.storage.local.get(['theme', 'pattern']);
  document.documentElement.setAttribute('data-theme', stored.theme || 'dark-gold');
  document.documentElement.setAttribute('data-pattern', stored.pattern || 'stars');
}

async function loadFontSetting() {
  const stored = await chrome.storage.local.get(['arabicFont']);
  const font = stored.arabicFont || 'naskh';
  applyArabicFont(font);
}

function applyArabicFont(font) {
  const arabicElements = [
    document.getElementById('dua-arabic'),
    document.getElementById('name-arabic')
  ];

  arabicElements.forEach(el => {
    if (el) {
      el.classList.remove('font-naskh', 'font-nastaliq', 'font-kufi', 'font-amiri');
      el.classList.add(`font-${font}`);
    }
  });
}

async function loadPrayerTimes() {
  const stored = await chrome.storage.local.get([
    'city', 'country', 'prayerTimes', 'dateInfo', 'lastFetch', 'useManualTimes', 'manualTimes'
  ]);

  if (stored.useManualTimes) {
    document.getElementById('city').textContent = 'Manual Times';
    if (stored.manualTimes) {
      displayPrayerTimes(stored.manualTimes);
    }
    displayCurrentDate();
  } else if (stored.city) {
    document.getElementById('city').textContent = `${stored.city}, ${stored.country}`;
    if (stored.prayerTimes && isToday(stored.lastFetch)) {
      displayPrayerTimes(stored.prayerTimes);
      if (stored.dateInfo) {
        displayDateInfo(stored.dateInfo);
      }
    } else {
      await fetchPrayerTimes();
    }
  } else {
    await fetchPrayerTimes();
  }
}

function displayCurrentDate() {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('gregorian-date').textContent = now.toLocaleDateString('en-US', options);
  document.getElementById('hijri-date').textContent = '';
}

function isToday(timestamp) {
  if (!timestamp) return false;
  const date = new Date(timestamp);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

async function fetchPrayerTimes() {
  const stored = await chrome.storage.local.get(['city', 'country', 'method', 'school']);

  const city = stored.city || 'London';
  const country = stored.country || 'UK';
  const method = stored.method || 2;
  const school = stored.school || 0;

  try {
    const response = await fetch(
      `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}&school=${school}`
    );

    if (!response.ok) throw new Error('Failed to fetch prayer times');

    const data = await response.json();

    if (data.code === 200) {
      const timings = data.data.timings;
      const dateInfo = data.data.date;

      await chrome.storage.local.set({
        city,
        country,
        prayerTimes: timings,
        dateInfo: dateInfo,
        lastFetch: Date.now()
      });

      document.getElementById('city').textContent = `${city}, ${country}`;
      displayPrayerTimes(timings);
      displayDateInfo(dateInfo);
    }
  } catch (error) {
    console.error('Error fetching prayer times:', error);
    document.getElementById('city').textContent = 'Error loading data - Check settings';
  }
}

function displayPrayerTimes(timings) {
  const prayers = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  let nextPrayerFound = false;

  prayers.forEach(prayer => {
    const timeElement = document.getElementById(prayer);
    const card = document.querySelector(`[data-prayer="${prayer}"]`);
    const time = timings[prayer.charAt(0).toUpperCase() + prayer.slice(1)];

    timeElement.textContent = time;

    const [hours, minutes] = time.split(':').map(Number);
    const prayerMinutes = hours * 60 + minutes;

    card.classList.remove('next-prayer', 'passed');

    if (prayerMinutes < currentMinutes) {
      card.classList.add('passed');
    } else if (!nextPrayerFound) {
      card.classList.add('next-prayer');
      nextPrayerFound = true;
      document.getElementById('next-prayer-name').textContent =
        prayer.charAt(0).toUpperCase() + prayer.slice(1);
    }
  });

  if (!nextPrayerFound) {
    document.getElementById('next-prayer-name').textContent = 'Fajr (tomorrow)';
  }
}

function displayDateInfo(dateInfo) {
  document.getElementById('gregorian-date').textContent = dateInfo.readable;
  document.getElementById('hijri-date').textContent =
    `${dateInfo.hijri.day} ${dateInfo.hijri.month.en} ${dateInfo.hijri.year} AH`;
}

function startCountdown() {
  updateCountdown();
  countdownInterval = setInterval(updateCountdown, 1000);
}

async function updateCountdown() {
  const stored = await chrome.storage.local.get(['prayerTimes']);
  if (!stored.prayerTimes) return;

  const prayers = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentSeconds = now.getSeconds();

  let nextPrayerTime = null;
  let nextPrayerName = null;

  for (const prayer of prayers) {
    const [hours, minutes] = stored.prayerTimes[prayer].split(':').map(Number);
    const prayerMinutes = hours * 60 + minutes;

    if (prayerMinutes > currentMinutes) {
      nextPrayerTime = prayerMinutes;
      nextPrayerName = prayer;
      break;
    }
  }

  if (!nextPrayerTime) {
    const [hours, minutes] = stored.prayerTimes['Fajr'].split(':').map(Number);
    nextPrayerTime = (24 * 60) + hours * 60 + minutes;
    nextPrayerName = 'Fajr';
  }

  const diffMinutes = nextPrayerTime - currentMinutes - 1;
  const diffSeconds = 60 - currentSeconds;

  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  const secs = diffSeconds === 60 ? 0 : diffSeconds;

  document.getElementById('countdown-timer').textContent =
    `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function getCurrentPrayerPeriod() {
  const now = new Date();
  const currentHour = now.getHours();

  if (currentHour >= 4 && currentHour < 6) return 'fajr';
  if (currentHour >= 12 && currentHour < 15) return 'dhuhr';
  if (currentHour >= 15 && currentHour < 18) return 'asr';
  if (currentHour >= 18 && currentHour < 20) return 'maghrib';
  return 'isha';
}

function setupDuas() {
  const period = getCurrentPrayerPeriod();
  currentDuas = DUAS[period] || DUAS.fajr;
  currentDuaIndex = 0;
  displayCurrentDua();
}

function displayCurrentDua() {
  if (currentDuas.length === 0) return;

  const dua = currentDuas[currentDuaIndex];
  document.getElementById('dua-arabic').textContent = dua.arabic;
  document.getElementById('dua-transliteration').textContent = dua.transliteration;
  document.getElementById('dua-translation').textContent = dua.translation;
  document.getElementById('dua-counter').textContent =
    `${currentDuaIndex + 1}/${currentDuas.length}`;
}

function nextDua() {
  currentDuaIndex = (currentDuaIndex + 1) % currentDuas.length;
  displayCurrentDua();
}

function prevDua() {
  currentDuaIndex = (currentDuaIndex - 1 + currentDuas.length) % currentDuas.length;
  displayCurrentDua();
}

async function setupAllahNames() {
  const stored = await chrome.storage.local.get(['nameRotationInterval', 'currentNameIndex']);

  currentNameIndex = stored.currentNameIndex || 0;
  const interval = (stored.nameRotationInterval || 1) * 60 * 1000;

  displayCurrentName();
  startNameRotation(interval);
}

function displayCurrentName() {
  const name = ALLAH_NAMES[currentNameIndex];
  document.getElementById('name-number').textContent = name.number;
  document.getElementById('name-arabic').textContent = name.arabic;
  document.getElementById('name-transliteration').textContent = name.transliteration;
  document.getElementById('name-meaning').textContent = name.meaning;
}

function startNameRotation(interval) {
  if (nameRotationInterval) {
    clearInterval(nameRotationInterval);
  }

  let progress = 0;
  const progressBar = document.getElementById('name-progress-bar');
  const progressInterval = interval / 100;

  const progressTimer = setInterval(() => {
    progress += 1;
    progressBar.style.width = `${progress}%`;

    if (progress >= 100) {
      progress = 0;
      currentNameIndex = (currentNameIndex + 1) % ALLAH_NAMES.length;
      displayCurrentName();
      chrome.storage.local.set({ currentNameIndex });
    }
  }, progressInterval);

  nameRotationInterval = progressTimer;
}

function setupEventListeners() {
  document.getElementById('prev-dua').addEventListener('click', prevDua);
  document.getElementById('next-dua').addEventListener('click', nextDua);
  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}
