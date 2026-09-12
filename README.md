# Jarvis

A browser-based voice assistant with an animated HUD interface, powered by the Claude API.

- **Frontend**: static HTML/CSS/JS (`public/`) using the Web Speech API for voice input (`SpeechRecognition`) and voice output (`speechSynthesis`).
- **Backend**: a small Express server (`server.js`) that proxies chat requests to the Claude API, keeping your API key off the client.

## Setup

```bash
npm install
cp .env.example .env
# edit .env and set ANTHROPIC_API_KEY
npm start
```

Then open http://localhost:3000.

## Usage

- Click the mic button and speak, or type in the input box and press Send / Enter.
- Jarvis replies in the conversation panel and speaks the response aloud.
- The side panels show a live mic-level waveform, processing/listening gauges, and a session log — purely visual telemetry driven by the assistant's state.

Voice input requires a Chromium-based browser (Web Speech API support varies); text chat works everywhere.
