# Invitations Telegram Bot + Web Cards

This repository now includes:
- A Telegram bot for creating wedding invitations, greeting cards, and love letters.
- A Node.js API that stores generated cards and serves tokenized invitation links.
- Mobile-friendly web card pages with countdown support for dated events.

## Features

- Category selection: invitation, greeting card, love letter
- Guided questionnaire per category
- Back/restart flow controls (`/back`, `/restart`)
- Invitation template selection (4 variants)
- Secure tokenized links: `/invite/:token`
- Countdown timer for wedding/event dates
- Invalid/expired link handling
- Input sanitization and API/bot rate limiting

## Tech stack

- Node.js + Express
- SQLite (`better-sqlite3`)
- Telegram Bot API (`node-telegram-bot-api`)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy env file:
   ```bash
   cp .env.example .env
   ```
3. Configure values in `.env`:
   - `TELEGRAM_BOT_TOKEN` (required for bot)
   - `BASE_URL` (public URL used in generated links)
4. Start service:
   ```bash
   npm start
   ```

## API

- `GET /health`
- `GET /api/templates`
- `POST /api/cards`
- `GET /api/cards/:token`
- `GET /invite/:token` (renders card HTML)

## Telegram flow

1. `/start`
2. Select category
3. Fill questionnaire fields
4. Choose template
5. Receive generated link

If Telegram opens the in-app browser view, users can open the same link in their default browser from the browser menu.
