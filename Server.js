require(‘dotenv’).config();
const express = require(‘express’);
const cors = require(‘cors’);
const rateLimit = require(‘express-rate-limit’);

const app = express();
const PORT = process.env.PORT || 3000;

// ── MIDDLEWARE ──────────────────────────────
app.use(express.json({ limit: ‘2mb’ }));

// Allow requests from any origin (your GitHub Pages URL or local file)
app.use(cors({
origin: ‘*’,
methods: [‘GET’, ‘POST’],
}));

// ── RATE LIMITING ───────────────────────────
// Max 20 chat messages per IP per 10 minutes
const chatLimiter = rateLimit({
windowMs: 10 * 60 * 1000,
max: 20,
standardHeaders: true,
legacyHeaders: false,
message: {
error: {
type: ‘rate_limit_error’,
message: ‘Too many requests. Please wait a few minutes before trying again.’
}
}
});

// ── HEALTH CHECK ────────────────────────────
app.get(’/’, (req, res) => {
res.json({
status: ‘ok’,
app: ‘CivicEase API’,
message: ‘Server is running. Use POST /chat to send messages.’
});
});

// ── CHAT ENDPOINT ───────────────────────────
app.post(’/chat’, chatLimiter, async (req, res) => {
// Validate API key is configured
if (!process.env.ANTHROPIC_API_KEY) {
return res.status(500).json({
error: {
type: ‘server_error’,
message: ‘API key not configured on server. Please add ANTHROPIC_API_KEY to your environment variables.’
}
});
}

// Validate request body
const { model, max_tokens, system, messages } = req.body;
if (!messages || !Array.isArray(messages) || messages.length === 0) {
return res.status(400).json({
error: {
type: ‘invalid_request’,
message: ‘Request must include a messages array.’
}
});
}

try {
const response = await fetch(‘https://api.anthropic.com/v1/messages’, {
method: ‘POST’,
headers: {
‘Content-Type’: ‘application/json’,
‘x-api-key’: process.env.ANTHROPIC_API_KEY,
‘anthropic-version’: ‘2023-06-01’
},
body: JSON.stringify({
model: model || ‘claude-sonnet-4-20250514’,
max_tokens: max_tokens || 1000,
system: system || ‘’,
messages
})
});

```
const data = await response.json();

// Forward Anthropic's response (including any errors) back to the client
res.status(response.status).json(data);
```

} catch (err) {
console.error(‘Anthropic API error:’, err.message);
res.status(500).json({
error: {
type: ‘server_error’,
message: ‘Could not reach Anthropic. Please try again.’
}
});
}
});

// ── START ────────────────────────────────────
app.listen(PORT, () => {
console.log(`CivicEase server running on port ${PORT}`);
console.log(`API key configured: ${process.env.ANTHROPIC_API_KEY ? 'YES ✓' : 'NO ✗ — add ANTHROPIC_API_KEY to .env'}`);
});
