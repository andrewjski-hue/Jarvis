(() => {
  'use strict';

  const core = document.getElementById('core');
  const coreStatus = document.getElementById('coreStatus');
  const statusLine = document.getElementById('statusLine');
  const conversation = document.getElementById('conversation');
  const inputForm = document.getElementById('inputForm');
  const textInput = document.getElementById('textInput');
  const micBtn = document.getElementById('micBtn');
  const waveform = document.getElementById('waveform');
  const log = document.getElementById('log');
  const clock = document.getElementById('clock');
  const statGrid = document.getElementById('statGrid');

  const BAR_COUNT = 24;
  const WAVEFORM_BARS = [];

  const state = {
    messages: [],
    listening: false,
    speaking: false,
    thinking: false,
    turns: 0,
    sessionStart: Date.now(),
    micLevel: 0,
    procLevel: 0,
  };

  // ---------- Clock ----------
  function tickClock() {
    const now = new Date();
    clock.textContent = now.toTimeString().slice(0, 8);
  }
  tickClock();
  setInterval(tickClock, 1000);

  // ---------- Waveform ----------
  function buildWaveform() {
    for (let i = 0; i < BAR_COUNT; i++) {
      const bar = document.createElement('div');
      bar.className = 'bar';
      waveform.appendChild(bar);
      WAVEFORM_BARS.push(bar);
    }
  }
  buildWaveform();

  function animateWaveform() {
    for (const bar of WAVEFORM_BARS) {
      let height;
      if (state.listening) {
        height = 8 + Math.random() * (state.micLevel * 90 + 10);
      } else if (state.thinking || state.speaking) {
        height = 8 + Math.random() * 40;
      } else {
        height = 3 + Math.random() * 4;
      }
      bar.style.height = `${Math.min(height, 100)}%`;
    }
    requestAnimationFrame(animateWaveform);
  }
  requestAnimationFrame(animateWaveform);

  // ---------- Gauges ----------
  const gaugeEls = {
    listen: document.querySelector('[data-gauge="listen"]'),
    think: document.querySelector('[data-gauge="think"]'),
  };
  const CIRC = 264;

  function setGauge(key, pct) {
    const el = gaugeEls[key];
    if (!el) return;
    const fill = el.querySelector('.gauge-fill');
    const value = el.querySelector('.gauge-value');
    const clamped = Math.max(0, Math.min(100, pct));
    fill.style.strokeDashoffset = String(CIRC - (CIRC * clamped) / 100);
    value.textContent = `${Math.round(clamped)}%`;
  }

  function gaugeLoop() {
    const micTarget = state.listening ? state.micLevel * 100 : 0;
    state.procLevel += ((state.thinking ? 80 : 0) - state.procLevel) * 0.15;
    const micDisplay = state.gaugeMic || 0;
    state.gaugeMic = micDisplay + (micTarget - micDisplay) * 0.3;
    setGauge('listen', state.gaugeMic);
    setGauge('think', state.thinking ? 40 + Math.random() * 60 : state.procLevel);
    requestAnimationFrame(gaugeLoop);
  }
  requestAnimationFrame(gaugeLoop);

  // ---------- Stats ----------
  function renderStats() {
    const uptimeSec = Math.floor((Date.now() - state.sessionStart) / 1000);
    const mm = String(Math.floor(uptimeSec / 60)).padStart(2, '0');
    const ss = String(uptimeSec % 60).padStart(2, '0');
    statGrid.innerHTML = `
      <div class="stat">UPTIME<span class="val">${mm}:${ss}</span></div>
      <div class="stat">TURNS<span class="val">${state.turns}</span></div>
    `;
  }
  renderStats();
  setInterval(renderStats, 1000);

  // ---------- Log ----------
  function addLog(text) {
    const li = document.createElement('li');
    const ts = new Date().toTimeString().slice(0, 8);
    li.innerHTML = `<span class="ts">${ts}</span>${text}`;
    log.prepend(li);
    while (log.children.length > 50) {
      log.removeChild(log.lastChild);
    }
  }

  // ---------- Core status ----------
  function setCoreState(mode) {
    core.classList.remove('listening', 'thinking');
    state.listening = false;
    state.thinking = false;
    state.speaking = false;

    if (mode === 'listening') {
      core.classList.add('listening');
      state.listening = true;
      coreStatus.textContent = 'LISTENING';
      statusLine.textContent = 'LISTENING...';
    } else if (mode === 'thinking') {
      core.classList.add('thinking');
      state.thinking = true;
      coreStatus.textContent = 'PROCESSING';
      statusLine.textContent = 'CONTACTING CORE INTELLIGENCE...';
    } else if (mode === 'speaking') {
      core.classList.add('listening');
      state.speaking = true;
      coreStatus.textContent = 'RESPONDING';
      statusLine.textContent = 'JARVIS IS RESPONDING';
    } else {
      coreStatus.textContent = 'STANDBY';
      statusLine.textContent = 'SYSTEM READY — PRESS MIC OR TYPE TO BEGIN';
    }
  }

  // ---------- Conversation rendering ----------
  function addMessage(role, text) {
    const div = document.createElement('div');
    div.className = `msg ${role}`;
    if (role === 'assistant') {
      div.innerHTML = `<span class="prefix">JARVIS &gt;</span>${escapeHtml(text)}`;
    } else if (role === 'error') {
      div.innerHTML = `<span class="prefix">ERROR &gt;</span>${escapeHtml(text)}`;
    } else {
      div.textContent = text;
    }
    conversation.appendChild(div);
    conversation.scrollTop = conversation.scrollHeight;
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // ---------- Text-to-speech ----------
  let voices = [];
  let germanVoiceLogged = false;

  function loadVoices() {
    voices = window.speechSynthesis.getVoices();
  }
  if ('speechSynthesis' in window) {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  function pickGermanVoice() {
    return (
      voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('de')) ||
      voices.find((v) => /german|deutsch/i.test(v.name)) ||
      null
    );
  }

  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.02;
    utterance.pitch = 0.9;

    const germanVoice = pickGermanVoice();
    if (germanVoice) {
      utterance.voice = germanVoice;
      utterance.lang = germanVoice.lang;
      if (!germanVoiceLogged) {
        addLog(`Voice set: ${germanVoice.name} (${germanVoice.lang})`);
        germanVoiceLogged = true;
      }
    } else {
      // No German voice installed in this browser; fall back to default
      // English voice but hint the accent via the lang tag.
      utterance.lang = 'de-DE';
      if (!germanVoiceLogged) {
        addLog('No German voice found on this device; using default voice');
        germanVoiceLogged = true;
      }
    }

    utterance.onstart = () => setCoreState('speaking');
    utterance.onend = () => setCoreState('idle');
    window.speechSynthesis.speak(utterance);
  }

  // ---------- Chat ----------
  async function sendMessage(text) {
    if (!text.trim()) return;
    addMessage('user', text);
    addLog(`USER: ${text.slice(0, 40)}`);
    state.messages.push({ role: 'user', content: text });
    state.turns += 1;

    setCoreState('thinking');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: state.messages }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Unknown error');
      }

      if (Array.isArray(data.toolLog)) {
        for (const entry of data.toolLog) addLog(entry);
      }

      state.messages.push({ role: 'assistant', content: data.text });
      addMessage('assistant', data.text);
      addLog('JARVIS: response received');
      speak(data.text);
    } catch (err) {
      addMessage('error', err.message);
      addLog(`ERROR: ${err.message}`);
      setCoreState('idle');
    }
  }

  inputForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = textInput.value;
    textInput.value = '';
    sendMessage(text);
  });

  // ---------- Speech recognition ----------
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognizer = null;
  let audioCtx = null;
  let analyser = null;
  let micStream = null;

  if (!SpeechRecognition) {
    micBtn.disabled = true;
    micBtn.title = 'Speech recognition not supported in this browser';
    addLog('Speech recognition unavailable in this browser');
  }

  async function startMicLevelMeter() {
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(micStream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      function sample() {
        if (!analyser || !state.listening) return;
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        state.micLevel = avg / 255;
        requestAnimationFrame(sample);
      }
      sample();
    } catch (err) {
      addLog('Mic level meter unavailable (permission denied?)');
    }
  }

  function stopMicLevelMeter() {
    if (micStream) {
      micStream.getTracks().forEach((t) => t.stop());
      micStream = null;
    }
    if (audioCtx) {
      audioCtx.close();
      audioCtx = null;
    }
    analyser = null;
    state.micLevel = 0;
  }

  function initRecognizer() {
    recognizer = new SpeechRecognition();
    recognizer.continuous = false;
    recognizer.interimResults = false;
    recognizer.lang = 'en-US';

    recognizer.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      sendMessage(transcript);
    };

    recognizer.onerror = (event) => {
      addLog(`Speech error: ${event.error}`);
      setCoreState('idle');
      micBtn.classList.remove('active');
      stopMicLevelMeter();
    };

    recognizer.onend = () => {
      micBtn.classList.remove('active');
      stopMicLevelMeter();
      if (!state.thinking && !state.speaking) setCoreState('idle');
    };
  }

  if (SpeechRecognition) initRecognizer();

  micBtn.addEventListener('click', () => {
    if (!recognizer) return;
    if (micBtn.classList.contains('active')) {
      recognizer.stop();
      return;
    }
    micBtn.classList.add('active');
    setCoreState('listening');
    startMicLevelMeter();
    try {
      recognizer.start();
    } catch (err) {
      addLog(`Could not start mic: ${err.message}`);
    }
  });

  // ---------- Boot ----------
  setCoreState('idle');
  addLog('JARVIS interface initialized');
})();
