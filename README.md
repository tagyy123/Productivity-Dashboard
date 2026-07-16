# Productivity-Dashboard

A beautifully designed, feature-rich dashboard to organize your day, track goals, and stay focused.

## ✨ Features

- **Todo List** — Add, flag, and complete tasks with smart sorting (important + incomplete first)
- **Daily Planner** — Hour-by-hour schedule with current-time highlighting
- **Focus Timer (Pomodoro)** — Customizable work, short break, and long break intervals with haptic feedback
- **Daily Goals** — Set and track daily objectives with completion progress
- **Motivation Quotes** — Random inspirational quotes fetched from an external API (with graceful fallback)
- **Clock & Weather** — Real-time date/time and weather with geolocation (falls back to London)
- **Theme Toggle** — Light/dark mode with persistent preference

## 🎨 Design Highlights

- **Time-aware backgrounds** — Visual shifts between morning, afternoon, evening, and night modes
- **Time-aware greetings** — Contextual welcome messages based on time of day
- **Responsive layout** — Card-based UI that adapts to any screen size
- **Smooth navigation** — Feature panels slide in/out with keyboard escape support
- **Accessibility** — ARIA labels, semantic HTML, and keyboard navigation throughout
- **No dependencies** — Vanilla JavaScript, HTML, and CSS only

## 🚀 Getting Started

1. Clone the repository
2. Open `index.html` in your browser
3. Start using the dashboard — all data is saved locally in your browser

## 💾 Data Storage

All data is stored in the browser's `localStorage`:
- Todo items
- Daily goals
- Hourly planner entries
- Theme preference

Your data persists across browser sessions.

## 🌐 Live Demo

[Visit the live dashboard](https://productivity-dashboard-six-theta.vercel.app)

## 📋 Technology

- **HTML5** — Semantic markup with ARIA labels
- **CSS3** — Custom properties, flexbox, smooth transitions
- **JavaScript (ES2020+)** — Modular code structure with module patterns
- **APIs Used**:
  - Open-Meteo (weather forecasts)
  - BigDataCloud (reverse geocoding)
  - DummyJSON (motivation quotes)

## 📝 License

MIT — Feel free to use and modify for your own projects.
