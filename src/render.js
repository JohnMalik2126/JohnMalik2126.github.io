function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function countdownScript(eventAt) {
  if (!eventAt) {
    return '';
  }

  return `<script>
    (function () {
      const target = new Date(${JSON.stringify(eventAt)}).getTime();
      const box = document.getElementById('countdown');
      const tick = () => {
        const now = Date.now();
        const diff = target - now;
        if (diff <= 0) {
          box.textContent = 'The special day has arrived ❤️';
          return;
        }
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        box.textContent = days + 'd ' + hours + 'h ' + minutes + 'm ' + seconds + 's remaining';
      };
      tick();
      setInterval(tick, 1000);
    })();
  </script>`;
}

function renderInvitation(card) {
  const content = card.content;
  const title = `${escapeHtml(content.brideName)} & ${escapeHtml(content.groomName)}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Wedding Invitation</title>
  <style>
    body { margin: 0; background: #f5f3ed; font-family: Arial, sans-serif; color: #1e1e1e; }
    .card { max-width: 640px; margin: 24px auto; background: #fff; border-radius: 16px; padding: 20px; border-top: 8px solid ${escapeHtml(card.theme)}; box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
    h1 { margin: 0 0 8px; font-size: 30px; text-align: center; }
    h2 { margin: 0 0 18px; text-align: center; color: ${escapeHtml(card.theme)}; }
    p { margin: 10px 0; font-size: 16px; }
    .cta { margin-top: 16px; padding: 12px; background: #fafafa; border-radius: 10px; }
    .countdown { margin-top: 18px; font-weight: bold; color: ${escapeHtml(card.theme)}; text-align: center; }
  </style>
</head>
<body>
  <main class="card">
    <h1>You're Invited 💍</h1>
    <h2>${title}</h2>
    <p>Dear <strong>${escapeHtml(content.inviteeName)}</strong>, you are warmly invited to celebrate our wedding.</p>
    <p><strong>Date:</strong> ${escapeHtml(content.weddingDate)}</p>
    <p><strong>Venue:</strong> ${escapeHtml(content.weddingAddress)}</p>
    <div class="cta">${escapeHtml(content.customMessage || 'We would be honored to celebrate with you!')}</div>
    <div id="countdown" class="countdown"></div>
  </main>
  ${countdownScript(card.event_at)}
</body>
</html>`;
}

function renderGreetingCard(card) {
  const content = card.content;
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Greeting Card</title>
<style>
body{font-family:Arial,sans-serif;background:#f7f7ff;margin:0;padding:20px}.card{max-width:620px;margin:0 auto;background:#fff;border-radius:14px;padding:20px;border-left:8px solid ${escapeHtml(card.theme)}}h1{margin-top:0;color:${escapeHtml(card.theme)}}
</style></head>
<body><article class="card"><h1>${escapeHtml(content.occasion)} Wishes</h1>
<p>Dear <strong>${escapeHtml(content.recipientName)}</strong>,</p>
<p>${escapeHtml(content.message)}</p>
<p>With love, ${escapeHtml(content.senderName)}</p>
${content.eventDate ? `<p><strong>Date:</strong> ${escapeHtml(content.eventDate)}</p>` : ''}
<div id="countdown"></div></article>${countdownScript(card.event_at)}</body></html>`;
}

function renderLoveLetter(card) {
  const content = card.content;
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Love Letter</title>
<style>
body{font-family:Georgia,serif;background:#fff0f4;margin:0;padding:20px}.letter{max-width:620px;margin:0 auto;background:#fff;border-radius:14px;padding:24px;border-top:8px solid ${escapeHtml(card.theme)}}h1{margin-top:0;color:${escapeHtml(card.theme)}}
</style></head>
<body><article class="letter"><h1>My Love Letter</h1>
<p>To <strong>${escapeHtml(content.recipientName)}</strong>,</p>
<p>${escapeHtml(content.message)}</p>
<p>Forever yours, ${escapeHtml(content.senderName)}</p>
<div id="countdown"></div></article>${countdownScript(card.event_at)}</body></html>`;
}

function renderCardPage(card) {
  if (card.status === 'expired') {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Invitation expired</title></head><body style="font-family:Arial,sans-serif;padding:24px"><h1>This link has expired</h1><p>Please request a new invitation link from the bot.</p></body></html>`;
  }

  switch (card.category) {
    case 'invitation':
      return renderInvitation(card);
    case 'greeting_card':
      return renderGreetingCard(card);
    case 'love_letter':
      return renderLoveLetter(card);
    default:
      return '<h1>Unknown card type</h1>';
  }
}

module.exports = {
  renderCardPage,
};
