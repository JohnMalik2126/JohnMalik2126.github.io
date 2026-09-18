const path = require('path');
require('dotenv').config();

const config = {
  port: Number(process.env.PORT || 3000),
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  dbPath: process.env.DB_PATH || path.join(__dirname, '..', 'data.sqlite3'),
  invitationTtlDays: Number(process.env.INVITATION_TTL_DAYS || 365),
  timezone: process.env.DEFAULT_TIMEZONE || 'UTC',
};

module.exports = config;
