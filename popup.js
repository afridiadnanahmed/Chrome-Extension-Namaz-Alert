document.addEventListener('DOMContentLoaded', init);

async function init() {
  const stored = await chrome.storage.local.get(['city', 'country', 'prayerTimes', 'lastFetch', 'theme', 'pattern']);

  // Apply theme and pattern
  document.documentElement.setAttribute('data-theme', stored.theme || 'dark-gold');
  document.documentElement.setAttribute('data-pattern', stored.pattern || 'stars');

  if (stored.city) {
    document.getElementById('city').textContent = `${stored.city}, ${stored.country}`;
  }

  if (stored.prayerTimes && isToday(stored.lastFetch)) {
    displayPrayerTimes(stored.prayerTimes);
  } else {
    await fetchPrayerTimes();
  }

  document.getElementById('settings-btn').addEventListener('click', openSettings);
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
      const date = data.data.date;

      await chrome.storage.local.set({
        city,
        country,
        prayerTimes: timings,
        dateInfo: date,
        lastFetch: Date.now()
      });

      document.getElementById('city').textContent = `${city}, ${country}`;
      displayPrayerTimes(timings);
      displayDateInfo(date);
    }
  } catch (error) {
    console.error('Error fetching prayer times:', error);
    document.getElementById('city').textContent = 'Error loading data';
  }
}

function displayPrayerTimes(timings) {
  document.getElementById('fajr').textContent = timings.Fajr;
  document.getElementById('sunrise').textContent = timings.Sunrise;
  document.getElementById('dhuhr').textContent = timings.Dhuhr;
  document.getElementById('asr').textContent = timings.Asr;
  document.getElementById('maghrib').textContent = timings.Maghrib;
  document.getElementById('isha').textContent = timings.Isha;

  highlightNextPrayer(timings);
}

function displayDateInfo(date) {
  document.getElementById('gregorian-date').textContent = date.readable;
  document.getElementById('hijri-date').textContent =
    `${date.hijri.day} ${date.hijri.month.en} ${date.hijri.year}`;
}

function highlightNextPrayer(timings) {
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const prayers = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

  for (const prayer of prayers) {
    const [hours, minutes] = timings[prayer].split(':').map(Number);
    const prayerTime = hours * 60 + minutes;

    if (prayerTime > currentTime) {
      document.getElementById(prayer.toLowerCase()).parentElement.classList.add('next-prayer');
      break;
    }
  }
}

function openSettings() {
  chrome.runtime.openOptionsPage();
}
