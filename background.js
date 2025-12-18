chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.local.set({
    city: 'London',
    country: 'UK',
    method: 2,
    school: 0,
    alertTime: 20,
    useManualTimes: false,
    manualTimes: {
      Fajr: '05:00',
      Sunrise: '06:30',
      Dhuhr: '12:30',
      Asr: '15:30',
      Maghrib: '18:30',
      Isha: '20:00'
    },
    notifications: {
      fajr: true,
      dhuhr: true,
      asr: true,
      maghrib: true,
      isha: true
    },
    nameRotationInterval: 1
  });

  await refreshPrayerTimes();
  await setupPrayerAlarms();
});

chrome.runtime.onStartup.addListener(async () => {
  await refreshPrayerTimes();
  await setupPrayerAlarms();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'refreshAlarms') {
    refreshPrayerTimes().then(() => setupPrayerAlarms());
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'dailyRefresh') {
    await refreshPrayerTimes();
    await setupPrayerAlarms();
  } else if (alarm.name.startsWith('prayer-')) {
    const prayerName = alarm.name.replace('prayer-', '');
    await showPrayerNotification(prayerName);
  }
});

async function refreshPrayerTimes() {
  const stored = await chrome.storage.local.get([
    'city', 'country', 'method', 'school', 'useManualTimes', 'manualTimes'
  ]);

  // If using manual times, just use those
  if (stored.useManualTimes && stored.manualTimes) {
    await chrome.storage.local.set({
      prayerTimes: stored.manualTimes,
      lastFetch: Date.now()
    });
    return;
  }

  // Otherwise fetch from API
  const city = stored.city || 'London';
  const country = stored.country || 'UK';
  const method = stored.method || 2;
  const school = stored.school || 0;

  try {
    const response = await fetch(
      `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}&school=${school}`
    );

    if (!response.ok) throw new Error('Failed to fetch');

    const data = await response.json();

    if (data.code === 200) {
      const timings = data.data.timings;

      await chrome.storage.local.set({
        prayerTimes: timings,
        dateInfo: data.data.date,
        lastFetch: Date.now()
      });
    }
  } catch (error) {
    console.error('Background fetch error:', error);
  }
}

async function setupPrayerAlarms() {
  await chrome.alarms.clearAll();

  chrome.alarms.create('dailyRefresh', {
    periodInMinutes: 60 * 24,
    when: getNextMidnight()
  });

  const stored = await chrome.storage.local.get(['prayerTimes', 'alertTime', 'notifications']);

  if (!stored.prayerTimes) return;

  const alertMinutes = stored.alertTime || 20;
  const notifications = stored.notifications || {};
  const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

  const now = new Date();

  prayers.forEach(prayer => {
    if (notifications[prayer.toLowerCase()] === false) return;

    const prayerTime = stored.prayerTimes[prayer];
    if (!prayerTime) return;

    const [hours, minutes] = prayerTime.split(':').map(Number);

    const alarmTime = new Date();
    alarmTime.setHours(hours, minutes - alertMinutes, 0, 0);

    if (alarmTime <= now) {
      alarmTime.setDate(alarmTime.getDate() + 1);
    }

    chrome.alarms.create(`prayer-${prayer.toLowerCase()}`, {
      when: alarmTime.getTime(),
      periodInMinutes: 24 * 60
    });
  });
}

function getNextMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setDate(midnight.getDate() + 1);
  midnight.setHours(0, 1, 0, 0);
  return midnight.getTime();
}

async function showPrayerNotification(prayerName) {
  const stored = await chrome.storage.local.get(['alertTime', 'prayerTimes']);
  const alertMinutes = stored.alertTime || 20;
  const prayerTime = stored.prayerTimes?.[prayerName.charAt(0).toUpperCase() + prayerName.slice(1)] || '';

  const title = `${prayerName.charAt(0).toUpperCase() + prayerName.slice(1)} Prayer Reminder`;
  const message = `${prayerName.charAt(0).toUpperCase() + prayerName.slice(1)} prayer is in ${alertMinutes} minutes (${prayerTime})`;

  chrome.notifications.create(`prayer-${prayerName}-${Date.now()}`, {
    type: 'basic',
    iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAGASURBVFhH7ZY9TsNAEIXnJ6QhDRUlHIAj0HEEOg5Ax0noKCnoKCkgQIJEQU1DwQEoKOAAFHRQhPf5zaw3tuPESYgU8aSn2Z2d3dnZ9U+SYRiGsT1wDXBPO9oVuIk3cAkXZKJdg7tT7QpcB7cS2+AO3oAbLfF+4gjO4D7cgRvoG95pwT7cwnO4g2PoE+6V2BYP4A7ewx08h0M4hsNwAo/hCTyAA7iHN/AWnsEdPINDeAJ7cAR7sA87sAe7sAs7sAs7sAM7sA3bsA0VbEEFW7ANFWxBBRuwARuwARuwDhuwDuuwDmuwBmuwBquwCquwCiuwAiuwAkuwBEuwBIuwCIuwCPOwAPOwAPMwB3MwB7MwC7MwCzMwAzMwDdMwDdMwBVMwBVMwCZMwCZMwARMwAeMwDuMwBmMwBqMwCqMwCsMwDMMwBEMwBIMwAIMwAP0wAP3QD33QB33QB93QDV3QBZ3QCZ3QCR3QAR3QDu3QDm3QBi1owQY0YRiG8e9Jkm+gPk1vN6bptAAAAABJRU5ErkJggg==',
    title: title,
    message: message,
    priority: 2,
    requireInteraction: true
  });
}
