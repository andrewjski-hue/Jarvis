import 'dotenv/config';
import express from 'express';
import Anthropic from '@anthropic-ai/sdk';

const app = express();
const port = process.env.PORT || 3000;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT =
  'You are Jarvis, a concise and helpful voice assistant. Keep responses ' +
  'short and conversational since they will be read aloud, unless the user ' +
  'asks for detail.';

app.use(express.json());
app.use(express.static('public'));

app.post('/api/chat', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured on the server.' });
  }

  const { messages } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required.' });
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    });

    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    res.json({ text });
  } catch (err) {
    console.error('Anthropic API error:', err);
    res.status(502).json({ error: 'Failed to reach the assistant. Please try again.' });
  }
});

app.listen(port, () => {
  console.log(`Jarvis running at http://localhost:${port}`);
});
