const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
const {
  sanitizeText,
  upsertUser,
  getSession,
  setSession,
  clearSession,
  createCard,
} = require('./repository');
const { categories, invitationTemplates, genericTemplates } = require('./flows');

const perUserRate = new Map();
const MAX_MESSAGES_PER_MINUTE = 20;

function withinRateLimit(userId) {
  const now = Date.now();
  const bucket = perUserRate.get(userId) || [];
  const filtered = bucket.filter((ts) => now - ts < 60_000);
  filtered.push(now);
  perUserRate.set(userId, filtered);
  return filtered.length <= MAX_MESSAGES_PER_MINUTE;
}

function menuKeyboard() {
  return {
    inline_keyboard: [
      [{ text: 'Invitation', callback_data: 'cat:invitation' }],
      [{ text: 'Greeting Card', callback_data: 'cat:greeting_card' }],
      [{ text: 'Love Letter', callback_data: 'cat:love_letter' }],
    ],
  };
}

function getTemplates(category) {
  if (category === 'invitation') {
    return invitationTemplates;
  }
  return genericTemplates;
}

function templateKeyboard(category) {
  const templates = getTemplates(category);
  return {
    inline_keyboard: templates.map((tpl) => [{ text: `${tpl.name} (${tpl.theme})`, callback_data: `tpl:${category}:${tpl.id}` }]),
  };
}

function templatePreviewUrl(templateId) {
  return `${config.baseUrl}/template-preview/${encodeURIComponent(templateId)}.svg`;
}

async function sendTemplateOptions(bot, chatId, category) {
  const templates = getTemplates(category);
  for (const template of templates) {
    await bot.sendPhoto(chatId, templatePreviewUrl(template.id), {
      caption: `${template.name} — ${template.theme}`,
    });
  }
  await bot.sendMessage(
    chatId,
    'Choose your template:',
    { reply_markup: templateKeyboard(category) },
  );
}

function startFlow(chatId, telegramId, category) {
  setSession(telegramId, category, 0, {}, false);
  const flow = categories[category];
  const firstField = flow.fields[0];
  return `Great choice: ${flow.title}\n\nPlease enter ${firstField.label}.\n\nCommands: /back /restart`;
}

function formatAsk(field) {
  return `Please enter ${field.label}.${field.required ? '' : ' (Type /skip to leave empty)'}`;
}

function normalizeInput(text) {
  return sanitizeText(text || '').slice(0, 500);
}

function handleFieldInput(message, session) {
  const flow = categories[session.flow];
  const field = flow.fields[session.step_index];
  const rawText = message.text || '';

  if (rawText === '/skip' && !field.required) {
    const nextStep = session.step_index + 1;
    if (nextStep >= flow.fields.length) {
      setSession(session.telegram_id, session.flow, session.step_index, session.data, true);
      return { done: true, prompt: 'Now choose a template style:', showTemplates: true };
    }
    setSession(session.telegram_id, session.flow, nextStep, session.data, false);
    return { done: false, prompt: formatAsk(flow.fields[nextStep]) };
  }

  const value = normalizeInput(rawText);
  if (!value && field.required) {
    return { done: false, prompt: `${field.label} is required.` };
  }

  const isValid = field.validate(value);
  if (isValid !== true) {
    return { done: false, prompt: isValid };
  }

  const nextData = { ...session.data, [field.key]: value };
  const nextStep = session.step_index + 1;

  if (nextStep >= flow.fields.length) {
    setSession(session.telegram_id, session.flow, session.step_index, nextData, true);
    return { done: true, prompt: 'Nice. Please choose one template:', showTemplates: true };
  }

  setSession(session.telegram_id, session.flow, nextStep, nextData, false);
  return { done: false, prompt: formatAsk(flow.fields[nextStep]) };
}

function renderOpenHint(link) {
  return `Your card is ready:\n${link}\n\nIf Telegram opens an in-app view, tap the browser icon to open it in your default browser.`;
}

function templateById(category, templateId) {
  return getTemplates(category).find((tpl) => tpl.id === templateId);
}

function registerCommands(bot) {
  bot.setMyCommands([
    { command: 'start', description: 'Start bot and choose category' },
    { command: 'restart', description: 'Restart the current form' },
    { command: 'back', description: 'Go one question back' },
    { command: 'edit', description: 'Edit previous answer' },
    { command: 'skip', description: 'Skip optional question' },
  ]);
}

function setupBot() {
  if (!config.telegramBotToken) {
    return null;
  }

  const bot = new TelegramBot(config.telegramBotToken, { polling: true });
  registerCommands(bot);

  bot.onText(/\/start/, (msg) => {
    if (!withinRateLimit(msg.from.id)) {
      bot.sendMessage(msg.chat.id, 'Too many requests. Please wait a minute.');
      return;
    }

    upsertUser(msg.from);
    clearSession(msg.from.id);
    bot.sendMessage(
      msg.chat.id,
      'Welcome! Choose what you want to create:',
      { reply_markup: menuKeyboard() },
    );
  });

  bot.onText(/\/restart/, (msg) => {
    clearSession(msg.from.id);
    bot.sendMessage(msg.chat.id, 'Restarted. Choose a section:', { reply_markup: menuKeyboard() });
  });

  bot.onText(/\/back/, (msg) => {
    const session = getSession(msg.from.id);
    if (!session) {
      bot.sendMessage(msg.chat.id, 'No active form. Use /start.');
      return;
    }

    const flow = categories[session.flow];
    const prevStep = Math.max(0, session.step_index - 1);
    setSession(msg.from.id, session.flow, prevStep, session.data, false);
    bot.sendMessage(msg.chat.id, `Moved back. ${formatAsk(flow.fields[prevStep])}`);
  });

  bot.onText(/\/edit/, (msg) => {
    const session = getSession(msg.from.id);
    if (!session) {
      bot.sendMessage(msg.chat.id, 'No active form. Use /start.');
      return;
    }
    const flow = categories[session.flow];
    const prevStep = Math.max(0, session.step_index - 1);
    setSession(msg.from.id, session.flow, prevStep, session.data, false);
    bot.sendMessage(msg.chat.id, `Editing mode. ${formatAsk(flow.fields[prevStep])}`);
  });

  bot.on('callback_query', (query) => {
    const user = query.from;
    const chatId = query.message.chat.id;

    if (!withinRateLimit(user.id)) {
      bot.answerCallbackQuery(query.id, { text: 'Too many requests. Please wait.' });
      return;
    }

    upsertUser(user);

    const data = query.data || '';
    if (data.startsWith('cat:')) {
      const category = data.split(':')[1];
      if (!categories[category]) {
        bot.answerCallbackQuery(query.id, { text: 'Unknown category' });
        return;
      }
      const prompt = startFlow(chatId, user.id, category);
      bot.answerCallbackQuery(query.id);
      bot.sendMessage(chatId, prompt);
      return;
    }

    if (data.startsWith('tpl:')) {
      const [, category, templateId] = data.split(':');
      const session = getSession(user.id);
      if (!session || session.flow !== category || !session.awaiting_template) {
        bot.answerCallbackQuery(query.id, { text: 'No active template selection' });
        return;
      }

      const template = templateById(category, templateId);
      if (!template) {
        bot.answerCallbackQuery(query.id, { text: 'Unknown template' });
        return;
      }

      const token = createCard({
        telegramId: user.id,
        category,
        templateId: template.id,
        theme: template.theme,
        content: session.data,
      });
      clearSession(user.id);
      const link = `${config.baseUrl}/invite/${encodeURIComponent(token)}`;
      bot.answerCallbackQuery(query.id, { text: 'Card generated!' });
      bot.sendMessage(chatId, renderOpenHint(link));
      return;
    }
  });

  bot.on('message', (msg) => {
    if (!msg.text || msg.text.startsWith('/')) {
      return;
    }

    if (!withinRateLimit(msg.from.id)) {
      bot.sendMessage(msg.chat.id, 'Too many requests. Please wait a minute.');
      return;
    }

    const session = getSession(msg.from.id);
    if (!session) {
      bot.sendMessage(msg.chat.id, 'Use /start to begin.');
      return;
    }

    if (session.awaiting_template) {
      sendTemplateOptions(bot, msg.chat.id, session.flow).catch(() => {
        bot.sendMessage(
          msg.chat.id,
          'Choose your template:',
          { reply_markup: templateKeyboard(session.flow) },
        );
      });
      return;
    }

    const result = handleFieldInput(msg, session);
    if (result.showTemplates) {
      sendTemplateOptions(bot, msg.chat.id, session.flow).catch(() => {
        bot.sendMessage(
          msg.chat.id,
          result.prompt,
          { reply_markup: templateKeyboard(session.flow) },
        );
      });
      return;
    }

    bot.sendMessage(msg.chat.id, result.prompt);
  });

  bot.on('polling_error', (err) => {
    const safeMessage = err?.code ? `Telegram polling error: ${err.code}` : 'Telegram polling error';
    console.error(safeMessage);
  });

  return bot;
}

module.exports = {
  setupBot,
};
