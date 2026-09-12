# Jarvis

A browser-based voice assistant with an animated HUD interface, powered by the Claude API.

- **Frontend**: static HTML/CSS/JS (`public/`) using the Web Speech API for voice input (`SpeechRecognition`) and voice output (`speechSynthesis`, preferring a German voice when one is installed).
- **Backend**: a small Express server (`server.js`) that proxies chat requests to the Claude API, keeping your API key off the client.
- **Web browsing**: Jarvis can search the web and open pages mid-conversation using a headless Chromium browser (`browser.js`, via Playwright), wired in as Claude tool calls.

## Setup

```bash
npm install
npx playwright install chromium   # downloads the headless browser used for web search/browsing
cp .env.example .env
# edit .env and set ANTHROPIC_API_KEY
npm start
```

Then open http://localhost:3000.

## Usage

- Click the mic button and speak, or type in the input box and press Send / Enter.
- Jarvis replies in the conversation panel and speaks the response aloud.
- When a question needs current information, Jarvis will search the web or open a specific page on its own; each action shows up in the session log.
- The side panels show a live mic-level waveform, processing/listening gauges, and a session log — mostly visual telemetry driven by the assistant's state, plus real entries for web actions.

Voice input requires a Chromium-based browser (Web Speech API support varies); text chat works everywhere.

### Web browsing safety

The `open_url` and `search_web` tools run server-side and are restricted to public `http(s)` URLs — requests to localhost, private/internal IP ranges, and link-local addresses (e.g. cloud metadata endpoints) are rejected before any navigation happens (see `assertPublicUrl` in `browser.js`). Page content returned to the model is treated as untrusted data, not instructions, per the system prompt.
