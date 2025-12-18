# Namaz Timings - Chrome Extension

A comprehensive Chrome extension for Muslims to track Islamic prayer times, explore the 99 Names of Allah, and discover meaningful duas throughout the day.

## Features

### Prayer Times
- **Accurate Prayer Times**: Fetches prayer times from the reliable [Aladhan API](https://aladhan.com/)
- **Global Coverage**: Supports 100+ countries and major cities worldwide
- **Multiple Calculation Methods**: Choose from 14 different calculation methods including:
  - Islamic Society of North America (ISNA)
  - Muslim World League
  - Umm Al-Qura University, Makkah
  - Egyptian General Authority of Survey
  - And more...
- **Asr Calculation**: Supports both Shafi (standard) and Hanafi schools
- **Manual Entry**: Option to manually set prayer times for offline use
- **Next Prayer Highlight**: Visual indicator and countdown timer to the next prayer

### Prayer Notifications
- Desktop notifications before prayer times
- Configurable alert timing (default: 20 minutes before)
- Toggle notifications for individual prayers
- Daily automatic refresh at midnight

### Spiritual Content

#### 99 Names of Allah (Asma-ul-Husna)
- Beautiful rotating display of Allah's divine attributes
- Shows Arabic text, transliteration, and English meaning
- Configurable rotation interval
- Progress indicator for next name

#### Duas Collection
- Context-aware duas based on time of day
- Categories for Fajr, Dhuhr, Asr, Maghrib, and Isha
- Each dua includes:
  - Arabic text
  - Transliteration
  - English translation
- Easy navigation between duas

### Islamic Calendar
- Displays both Gregorian and Hijri dates
- Automatically synced with prayer time data

### Customization
- **Themes**: Multiple color schemes including dark gold
- **Background Patterns**: Decorative Islamic patterns
- **Arabic Fonts**: Choose from Naskh, Nastaliq, Kufi, Amiri, and more

## Screenshots

The extension provides three main interfaces:

1. **New Tab Dashboard**: Full-featured dashboard replacing your new tab page with prayer times, duas, and 99 Names of Allah
2. **Popup Widget**: Quick access to prayer times from the extension icon
3. **Settings Page**: Comprehensive configuration options

## Installation

### From Source (Developer Mode)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension folder
5. The extension is now installed and ready to use

## Usage

### Setting Your Location
1. Click the extension icon and go to Settings
2. Select your country from the dropdown
3. Select your city
4. Choose your preferred calculation method and Asr school
5. Click "Save Settings"

### Enabling Notifications
1. Go to Settings
2. Scroll to "Prayer Notifications"
3. Set your preferred alert time (minutes before prayer)
4. Toggle notifications for specific prayers as needed
5. Click "Test Notification" to verify it's working

### Using the New Tab Page
Once installed, opening a new tab will display:
- Current prayer times with countdown to the next prayer
- A rotating display of the 99 Names of Allah
- Duas relevant to the current time of day

## File Structure

```
├── manifest.json          # Extension configuration (Manifest V3)
├── background.js          # Service worker for alarms & notifications
├── popup.html/css/js      # Quick access popup
├── newtab.html/css/js     # Full dashboard (new tab override)
├── options.html/css/js    # Settings page
├── themes.css             # Theme and pattern definitions
├── data/
│   ├── duas.js            # Dua content organized by prayer time
│   ├── allah-names.js     # Complete 99 Names of Allah
│   └── locations.js       # Country/city database
└── icons/                 # Extension icons (16, 48, 128px)
```

## Technologies

- **Chrome Extension Manifest V3**
- **Vanilla JavaScript** (no external frameworks)
- **Chrome APIs**: Storage, Alarms, Notifications
- **Aladhan API** for prayer time calculations

## Permissions

The extension requires the following permissions:
- `storage`: To save your preferences and cached prayer times
- `alarms`: To schedule prayer notifications
- `notifications`: To display prayer reminders
- `api.aladhan.com`: To fetch accurate prayer times

## Roadmap

Planned features include:
- Qibla direction compass
- Adhan (call to prayer) sounds
- Prayer tracker
- Daily Ayah and Hadith
- Dhikr counter
- Islamic calendar events
- Auto location detection
- Offline mode improvements

## Contributing

Contributions are welcome! Feel free to submit issues and pull requests.

## License

This project is open source. Feel free to use and modify as needed.

## Acknowledgments

- [Aladhan API](https://aladhan.com/) for providing reliable prayer time calculations
- The Muslim developer community for inspiration and guidance
