/**
 * INLPM — prayer request relay ("Simeon")
 *
 * Receives a prayer request from the website and posts it into the prayer
 * team's Telegram group, with a one-tap link to reply on WhatsApp.
 *
 * The visitor needs no app at all. Only the team needs Telegram.
 *
 * Secrets (set with `wrangler secret put`, never in the repo — this repo is
 * public and a committed bot token would be abused within minutes):
 *   TELEGRAM_BOT_TOKEN   from @BotFather
 *   TELEGRAM_CHAT_ID     the group's id, negative for groups e.g. -1001234567890
 *
 * Plain vars (wrangler.toml):
 *   ALLOWED_ORIGIN       https://www.inlpm.com
 */

const LIMIT = { WINDOW_MS: 60_000, MAX: 3 };
const seen = new Map();

function cors(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function clean(v, max) {
  return String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
}

// Telegram HTML mode: only these five need escaping
function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function waLink(phone) {
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length < 10) return null;
  // 10 digits = Indian mobile without country code
  return "https://wa.me/" + (digits.length === 10 ? "91" + digits : digits);
}

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || "*";
    const headers = cors(origin);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers });
    }

    // Light rate limit per IP. Not airtight across edge locations, but enough
    // to stop a bored someone flooding the prayer team's phones.
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const now = Date.now();
    const hits = (seen.get(ip) || []).filter((t) => now - t < LIMIT.WINDOW_MS);
    if (hits.length >= LIMIT.MAX) {
      return new Response(JSON.stringify({ error: "Too many requests" }), {
        status: 429, headers: { ...headers, "Content-Type": "application/json" },
      });
    }
    hits.push(now);
    seen.set(ip, hits);
    if (seen.size > 5000) seen.clear();

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Bad JSON" }), {
        status: 400, headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const name = clean(body.name, 80) || "(no name given)";
    const phone = clean(body.phone, 30);
    const about = clean(body.about, 40) || "Not stated";
    const when = clean(body.when, 40) || "Not stated";
    const need = clean(body.need, 2000);
    const anonymous = body.anonymous === true;

    if (!need) {
      return new Response(JSON.stringify({ error: "Request is empty" }), {
        status: 400, headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const urgent = /urgent/i.test(when);
    // The checkbox withholds the name only. The number stays, because they
    // gave it so the team could reply to them.
    const wa = waLink(phone);

    const lines = [
      `${urgent ? "🔴" : "🙏"} <b>Prayer request</b>${urgent ? " — URGENT" : ""}`,
      "",
      `<b>From:</b> ${esc(name)}`,
      anonymous ? "<i>Name withheld at their request</i>" : null,
      phone ? `<b>Phone:</b> ${esc(phone)}` : null,
      `<b>About:</b> ${esc(about)}`,
      `<b>How soon:</b> ${esc(when)}`,
      "",
      esc(need),
    ].filter((l) => l !== null);
    if (wa) lines.push("", `<a href="${wa}">Reply on WhatsApp</a>`);

    const tg = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID,
          text: lines.join("\n"),
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      }
    );

    if (!tg.ok) {
      // Let the site fall back to WhatsApp rather than swallow the request
      return new Response(JSON.stringify({ error: "Relay failed" }), {
        status: 502, headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...headers, "Content-Type": "application/json" },
    });
  },
};
