# Trinity Engineering – Severe Weather Intelligence

A React web app that lets you enter any US address and pulls 5 years of hail and severe weather data from NOAA, powered by the Anthropic Claude API with web search.

## Tech Stack

- **React 18** + **Vite** – frontend framework and build tool
- **Anthropic Claude API** (`claude-sonnet-4-20250514`) – AI-powered web search and data synthesis
- **NOAA Storm Events Database** – source of hail and severe weather records

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Configure your API key

The app calls the Anthropic API directly from the browser (suitable for internal/demo use).

Open `src/App.jsx` and locate the `callAPI` function. The API key is passed automatically by the Claude.ai artifact environment. For standalone deployment, you have two options:

**Option A – Quick dev setup (not for production):**
Add your key directly in `src/App.jsx`:
```js
headers: {
  "Content-Type": "application/json",
  "x-api-key": "YOUR_ANTHROPIC_API_KEY",
  "anthropic-version": "2023-06-01",
},
```

**Option B – Recommended for production:**
Create a simple backend proxy (Node/Express, Next.js API route, etc.) that holds your API key server-side and forwards requests to `https://api.anthropic.com/v1/messages`.

### 3. Run the dev server
```bash
npm run dev
```

### 4. Build for production
```bash
npm run build
```

## How It Works

1. User enters a property address
2. The app sends the address to Claude with a web search tool enabled
3. Claude runs multiple searches against NOAA Storm Events, weather databases, and news sources
4. Results are returned as structured JSON and rendered in the dashboard
5. Output includes: hail events table, other severe weather events, risk level, stats, and sources

## Notes

- Results are AI-synthesized from live web searches — always verify critical data against NOAA directly: https://www.ncdc.noaa.gov/stormevents/
- The agentic loop allows up to 10 search rounds per query for thorough coverage
- `max_tokens` is set to 4000 to handle large result sets
