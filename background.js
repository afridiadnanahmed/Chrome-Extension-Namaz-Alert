// Initialize alarms when service worker starts
(async () => {
  const stored = await chrome.storage.local.get(['prayerTimes', 'lastFetch']);
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  
  // If prayer times are missing or stale, refresh them
  if (!stored.prayerTimes || !stored.lastFetch || stored.lastFetch < oneDayAgo) {
    await refreshPrayerTimes();
  }
  
  // Always set up alarms to ensure they're active
  await setupPrayerAlarms();
})();

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

// Register alarm listener at the top level to ensure it's always active
chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log('Alarm triggered:', alarm.name, 'at', new Date().toLocaleString());
  
  try {
    if (alarm.name === 'dailyRefresh') {
      console.log('Refreshing prayer times and resetting alarms');
      await refreshPrayerTimes();
      await setupPrayerAlarms();
    } else if (alarm.name.startsWith('prayer-')) {
      const prayerName = alarm.name.replace('prayer-', '');
      console.log('Showing notification for:', prayerName);
      await showPrayerNotification(prayerName);
    }
  } catch (error) {
    console.error('Error handling alarm:', error);
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

  if (!stored.prayerTimes) {
    console.log('No prayer times available for alarm scheduling');
    return;
  }

  console.log('Setting up prayer alarms with alertTime:', stored.alertTime, 'minutes');

  const alertMinutes = stored.alertTime || 20;
  const notifications = stored.notifications || {};
  const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

  const now = new Date();

  prayers.forEach(prayer => {
    if (notifications[prayer.toLowerCase()] === false) {
      console.log(`Notifications disabled for ${prayer}`);
      return;
    }

    const prayerTime = stored.prayerTimes[prayer];
    if (!prayerTime) {
      console.log(`No prayer time found for ${prayer}`);
      return;
    }

    // Remove any timezone suffix (e.g., "05:23 (EET)" -> "05:23")
    const timeOnly = prayerTime.split(' ')[0];
    const [hours, minutes] = timeOnly.split(':').map(s => parseInt(s, 10));

    if (isNaN(hours) || isNaN(minutes)) {
      console.log(`Invalid time format for ${prayer}: ${prayerTime}`);
      return;
    }

    // Calculate alarm time (prayer time minus alert minutes)
    const alarmTime = new Date();
    alarmTime.setHours(hours, minutes - alertMinutes, 0, 0);

    // If alarm time has passed today, schedule for tomorrow
    if (alarmTime <= now) {
      alarmTime.setDate(alarmTime.getDate() + 1);
    }

    const alarmName = `prayer-${prayer.toLowerCase()}`;
    
    // Create alarm with proper recurring schedule
    chrome.alarms.create(alarmName, {
      when: alarmTime.getTime(),
      periodInMinutes: 24 * 60
    }, (wasCreated) => {
      if (chrome.runtime.lastError) {
        console.error(`Error creating alarm for ${prayer}:`, chrome.runtime.lastError);
      } else if (wasCreated) {
        console.log(`Alarm set for ${prayer}: ${alarmTime.toLocaleString()} (${alertMinutes} min before ${timeOnly})`);
      } else {
        console.log(`Alarm already exists for ${prayer}`);
      }
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
  try {
    const stored = await chrome.storage.local.get(['alertTime', 'prayerTimes']);
    const alertMinutes = stored.alertTime || 20;
    const prayerTime = stored.prayerTimes?.[prayerName.charAt(0).toUpperCase() + prayerName.slice(1)] || '';

    const title = `${prayerName.charAt(0).toUpperCase() + prayerName.slice(1)} Prayer Reminder`;
    const message = `${prayerName.charAt(0).toUpperCase() + prayerName.slice(1)} prayer is in ${alertMinutes} minutes (${prayerTime})`;

    chrome.notifications.create(`prayer-${prayerName}-${Date.now()}`, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title: title,
      message: message,
      priority: 2,
      requireInteraction: true
    }, (notificationId) => {
      if (chrome.runtime.lastError) {
        console.error('Error creating notification:', chrome.runtime.lastError);
      } else {
        console.log('Notification created successfully:', notificationId);
      }
    });
  } catch (error) {
    console.error('Error showing prayer notification:', error);
  }
}
