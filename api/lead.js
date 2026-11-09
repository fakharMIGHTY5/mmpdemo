/* Lead intake.
   Takes whatever the forms collect and gets it to MMP. Two ways out, so
   the agency can pick whichever they already have: a webhook (Zapier,
   Make, a CRM) or Resend for plain email. Configure one in the Vercel
   project's environment variables.

     LEAD_WEBHOOK_URL   any endpoint that accepts a JSON POST
     RESEND_API_KEY     plus LEAD_TO and LEAD_FROM

   With neither set this answers 503 and says so, which is what lets the
   front end tell the visitor to call instead of pretending the message
   went somewhere. */

const FIELDS = [
  'name', 'phone', 'email', 'zip', 'path', 'message', 'property',
  'service', 'when', 'describe', 'own', 'urgency', 'source'
];

function clean(body) {
  const out = {};
  for (const k of Object.keys(body || {})) {
    if (k === 'honey') continue;                 // spam trap, see below
    const v = String(body[k] == null ? '' : body[k]).slice(0, 2000);
    if (v.trim()) out[k] = v.trim();
  }
  return out;
}

function rows(d) {
  const keys = Object.keys(d).sort(function (a, b) {
    const ia = FIELDS.indexOf(a), ib = FIELDS.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
  });
  return keys.map(function (k) {
    const label = k.charAt(0).toUpperCase() + k.slice(1).replace(/[-_]/g, ' ');
    const val = d[k].replace(/[<>&]/g, function (c) {
      return { '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c];
    });
    return '<tr><td style="padding:6px 14px 6px 0;color:#56637A;vertical-align:top">' +
      label + '</td><td style="padding:6px 0;font-weight:600">' + val + '</td></tr>';
  }).join('');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Use POST' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const data = clean(body);

  // A bot that fills every field it finds trips the hidden one.
  if (body && body.honey) return res.status(200).json({ ok: true });

  // Something to reply to, or there is no lead.
  if (!data.phone && !data.email) {
    return res.status(400).json({ ok: false, error: 'A phone number or email is needed.' });
  }

  data.received = new Date().toISOString();
  data.page = (req.headers && req.headers.referer) || '';

  const hook = process.env.LEAD_WEBHOOK_URL;
  const key = process.env.RESEND_API_KEY;

  try {
    if (hook) {
      const r = await fetch(hook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!r.ok) throw new Error('Webhook answered ' + r.status);
      return res.status(200).json({ ok: true });
    }

    if (key) {
      const to = process.env.LEAD_TO || 'info@moisturemasterpros.com';
      const from = process.env.LEAD_FROM || 'Website <leads@moisturemasterpros.com>';
      const who = data.name || data.email || data.phone;
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: from,
          to: to.split(',').map(function (s) { return s.trim(); }),
          reply_to: data.email || undefined,
          subject: 'Website lead: ' + who + (data.zip ? ' (' + data.zip + ')' : ''),
          html: '<div style="font:15px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#1d2b3e">' +
                '<p style="margin:0 0 14px">New enquiry from the website.</p>' +
                '<table style="border-collapse:collapse">' + rows(data) + '</table></div>'
        })
      });
      if (!r.ok) throw new Error('Resend answered ' + r.status + ' ' + (await r.text()).slice(0, 200));
      return res.status(200).json({ ok: true });
    }
  } catch (err) {
    console.error('[lead] could not deliver:', err && err.message);
    return res.status(502).json({ ok: false, error: 'Could not deliver the message.' });
  }

  console.warn('[lead] no delivery configured, lead not stored:', JSON.stringify(data));
  return res.status(503).json({ ok: false, error: 'Lead delivery is not configured yet.' });
};
