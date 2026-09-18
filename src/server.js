const express = require('express');
const rateLimit = require('express-rate-limit');
const path = require('path');
const config = require('./config');
const { setupBot } = require('./bot');
const { sanitizeText, createCard, getCardByToken } = require('./repository');
const { categories, invitationTemplates, genericTemplates } = require('./flows');
const { renderCardPage } = require('./render');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '50kb' }));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);
app.use(express.static(path.join(__dirname, '..')));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/templates', (_req, res) => {
  res.json({
    invitation: invitationTemplates,
    greeting_card: genericTemplates,
    love_letter: genericTemplates,
  });
});

app.get('/template-preview/:id.svg', (req, res) => {
  const id = sanitizeText(req.params.id).slice(0, 40);
  const template = [...invitationTemplates, ...genericTemplates].find((item) => item.id === id);
  if (!template) {
    res.status(404).send('Not found');
    return;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#fdfdfd"/>
  <rect x="40" y="40" width="1120" height="550" rx="30" fill="#ffffff" stroke="${template.theme}" stroke-width="10"/>
  <text x="600" y="250" font-size="52" text-anchor="middle" fill="${template.theme}" font-family="Arial">Invitation Template</text>
  <text x="600" y="330" font-size="44" text-anchor="middle" fill="#1f2937" font-family="Arial">${template.name}</text>
  <text x="600" y="400" font-size="28" text-anchor="middle" fill="#4b5563" font-family="Arial">${template.theme}</text>
</svg>`;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(svg);
});

app.post('/api/cards', (req, res) => {
  const { telegramId, category, templateId, theme, content } = req.body || {};

  if (!telegramId || !category || !templateId || !theme || !content || typeof content !== 'object') {
    res.status(400).json({ error: 'Missing required fields.' });
    return;
  }

  if (!categories[category]) {
    res.status(400).json({ error: 'Invalid category.' });
    return;
  }

  const safeContent = {};
  for (const [key, value] of Object.entries(content)) {
    safeContent[key] = sanitizeText(String(value || '')).slice(0, 500);
  }

  const token = createCard({
    telegramId: Number(telegramId),
    category,
    templateId: sanitizeText(templateId).slice(0, 30),
    theme: sanitizeText(theme).slice(0, 20),
    content: safeContent,
  });

  res.status(201).json({ token, link: `${config.baseUrl}/invite/${token}` });
});

app.get('/api/cards/:token', (req, res) => {
  const token = sanitizeText(req.params.token).slice(0, 120);
  const card = getCardByToken(token);
  if (!card) {
    res.status(404).json({ error: 'Card not found.' });
    return;
  }

  if (card.status === 'expired') {
    res.status(410).json({ error: 'Card expired.' });
    return;
  }

  res.json({
    category: card.category,
    templateId: card.template_id,
    theme: card.theme,
    eventAt: card.event_at,
    createdAt: card.created_at,
    content: card.content,
  });
});

app.get('/invite/:token', (req, res) => {
  const token = sanitizeText(req.params.token).slice(0, 120);
  const card = getCardByToken(token);
  if (!card) {
    res.status(404).send('<h1>Invitation not found</h1><p>Please check your link.</p>');
    return;
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderCardPage(card));
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(config.port, () => {
  console.log(`Server listening on port ${config.port}`);
});

const bot = setupBot();
if (bot) {
  console.log('Telegram bot polling started.');
} else {
  console.log('TELEGRAM_BOT_TOKEN missing; bot not started.');
}
