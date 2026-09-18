const crypto = require('crypto');
const db = require('./db');
const config = require('./config');

const upsertUserStmt = db.prepare(`
  INSERT INTO users (telegram_id, first_name, last_name, username)
  VALUES (@telegram_id, @first_name, @last_name, @username)
  ON CONFLICT(telegram_id) DO UPDATE SET
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    username = excluded.username
`);

const getSessionStmt = db.prepare('SELECT * FROM sessions WHERE telegram_id = ?');
const setSessionStmt = db.prepare(`
  INSERT INTO sessions (telegram_id, flow, step_index, awaiting_template, data_json, updated_at)
  VALUES (@telegram_id, @flow, @step_index, @awaiting_template, @data_json, datetime('now'))
  ON CONFLICT(telegram_id) DO UPDATE SET
    flow = excluded.flow,
    step_index = excluded.step_index,
    awaiting_template = excluded.awaiting_template,
    data_json = excluded.data_json,
    updated_at = datetime('now')
`);
const clearSessionStmt = db.prepare('DELETE FROM sessions WHERE telegram_id = ?');

const insertCardStmt = db.prepare(`
  INSERT INTO cards (
    telegram_id, category, template_id, theme, token,
    content_json, event_at, status, expires_at, updated_at
  ) VALUES (
    @telegram_id, @category, @template_id, @theme, @token,
    @content_json, @event_at, @status, @expires_at, datetime('now')
  )
`);

const getCardByTokenStmt = db.prepare(`
  SELECT id, telegram_id, category, template_id, theme, token, content_json, event_at, status, expires_at, created_at
  FROM cards WHERE token = ?
`);

function sanitizeText(input) {
  return String(input)
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .slice(0, 500);
}

function upsertUser(telegramUser) {
  upsertUserStmt.run({
    telegram_id: telegramUser.id,
    first_name: sanitizeText(telegramUser.first_name || ''),
    last_name: sanitizeText(telegramUser.last_name || ''),
    username: sanitizeText(telegramUser.username || ''),
  });
}

function getSession(telegramId) {
  const row = getSessionStmt.get(telegramId);
  if (!row) {
    return null;
  }
  return {
    ...row,
    data: JSON.parse(row.data_json || '{}'),
    awaiting_template: Boolean(row.awaiting_template),
  };
}

function setSession(telegramId, flow, stepIndex, data, awaitingTemplate = false) {
  setSessionStmt.run({
    telegram_id: telegramId,
    flow,
    step_index: stepIndex,
    awaiting_template: awaitingTemplate ? 1 : 0,
    data_json: JSON.stringify(data),
  });
}

function clearSession(telegramId) {
  clearSessionStmt.run(telegramId);
}

function buildExpiryDate() {
  const expires = new Date();
  expires.setDate(expires.getDate() + config.invitationTtlDays);
  return expires.toISOString();
}

function parseEventDate(rawValue) {
  if (!rawValue) {
    return null;
  }
  const parsed = new Date(rawValue.replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

function createCard({ telegramId, category, templateId, theme, content }) {
  const token = crypto.randomBytes(24).toString('base64url');
  const eventDateKey = {
    invitation: 'weddingDate',
    greeting_card: 'eventDate',
    love_letter: 'deliveryDate',
  }[category];

  const eventAt = parseEventDate(content[eventDateKey]);

  insertCardStmt.run({
    telegram_id: telegramId,
    category,
    template_id: templateId,
    theme,
    token,
    content_json: JSON.stringify(content),
    event_at: eventAt,
    status: 'finalized',
    expires_at: buildExpiryDate(),
  });

  return token;
}

function getCardByToken(token) {
  const row = getCardByTokenStmt.get(token);
  if (!row) {
    return null;
  }

  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return {
      ...row,
      status: 'expired',
      content: JSON.parse(row.content_json || '{}'),
    };
  }

  return {
    ...row,
    content: JSON.parse(row.content_json || '{}'),
  };
}

module.exports = {
  sanitizeText,
  upsertUser,
  getSession,
  setSession,
  clearSession,
  createCard,
  getCardByToken,
};
