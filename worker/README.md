# Simeon — prayer request relay

Takes a prayer request from inlpm.com and posts it into the prayer team's
Telegram group, with a one-tap link to reply to the person on WhatsApp.

The visitor needs no app. Only the team needs Telegram.

## Setting it up

1. **Create the bot.** In Telegram, message `@BotFather` → `/newbot` →
   name it `Simeon` → he gives you a token. **Keep it secret.**
2. **Create the group**, add the team, and add the bot to it.
3. **Get the group id.** Send any message in the group, then open
   `https://api.telegram.org/bot<TOKEN>/getUpdates` and read `chat.id`.
   Group ids are negative, e.g. `-1001234567890`.
4. **Deploy:** `npx wrangler deploy`
5. **Set the secrets** (they never enter this repo, which is public):
   ```
   npx wrangler secret put TELEGRAM_BOT_TOKEN
   npx wrangler secret put TELEGRAM_CHAT_ID
   ```
6. **Switch the site over.** In `index.html`, put the Worker URL in the
   prayer form's `data-endpoint`. Leave it empty and the form keeps using
   WhatsApp, so nothing breaks while you set this up.

## Behaviour

- Rate limited to 3 requests per IP per minute.
- Urgent requests are flagged red.
- If "keep my name private" is ticked, neither the name nor the number is sent.
- If the relay fails, the website falls back to WhatsApp so no request is lost.
