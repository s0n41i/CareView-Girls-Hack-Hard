// Vercel function: sends the carer alert as a real SMS through Twilio.
//
// POST /api/sms  { "to": "+447700900000", "kind": "alert" | "test" }
//
// The site calls this when the board prints CAREGIVER_ALERT over USB.
// Credentials come from Vercel environment variables, never from the browser:
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM (your Twilio number, e.g. +44...)
//
// The message text is fixed here, so this endpoint can't be used to send arbitrary content.

const MESSAGES = {
  alert: "CareView: Margaret may need a check.",
  test: "CareView: test message. Alerts are working.",
};

// Best-effort cost guard (per server instance): at most one text per number every 30 s.
const lastSent = new Map();
const MIN_GAP_MS = 30_000;

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_FROM: from } = process.env;
  if (!sid || !token || !from) return res.status(503).json({ error: "Twilio isn't configured on the server" });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const to = String(body.to || "").replace(/[\s\-().]/g, "");
  const text = MESSAGES[body.kind];
  if (!/^\+\d{8,15}$/.test(to)) return res.status(400).json({ error: "Use a number like +447700900000" });
  if (!text) return res.status(400).json({ error: "Unknown message kind" });

  const now = Date.now();
  if (now - (lastSent.get(to) || 0) < MIN_GAP_MS) return res.status(429).json({ error: "Wait 30 s between texts" });
  lastSent.set(to, now);

  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: text }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    lastSent.delete(to);
    return res.status(502).json({ error: data.message || "Twilio error", code: data.code });
  }
  return res.status(200).json({ ok: true, sid: data.sid, text });
};
