/* Lead intake.
 *
 * The browser posts here, on our own domain, and this talks to Monday.
 * It is deliberately not the browser talking to Monday directly: that
 * would put the API token in the page source for anyone to read and
 * write to the board with, and it would put a third-party domain back
 * in the request path, which is what got the site flagged as malware
 * the last time a form service was wired in.
 *
 * Configure in the Vercel project's environment variables:
 *   MONDAY_TOKEN      an API token from Monday, Admin > API
 *   MONDAY_BOARD_ID   the number in the board's URL
 *   MONDAY_GROUP_ID   optional, the group to drop items into
 *   LEAD_WEBHOOK_URL  optional, also posts the raw lead here
 *
 * With nothing configured it answers 503 and says so, which is what
 * lets the page tell the visitor to call instead of pretending.
 */

const ORDER = [
  'name', 'phone', 'email', 'zip', 'path', 'service', 'property',
  'own', 'urgency', 'when', 'describe', 'message', 'source', 'page'
];

function clean(body) {
  const out = {};
  for (const k of Object.keys(body || {})) {
    if (k === 'honey' || k.charAt(0) === '_') continue;
    const v = String(body[k] == null ? '' : body[k]).slice(0, 2000).trim();
    if (v) out[k] = v;
  }
  return out;
}

function label(k) {
  return k.charAt(0).toUpperCase() + k.slice(1).replace(/[-_]/g, ' ');
}

function ordered(d) {
  return Object.keys(d).sort(function (a, b) {
    const ia = ORDER.indexOf(a), ib = ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
  });
}

async function monday(token, query, variables) {
  const r = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: {
      Authorization: token,
      'Content-Type': 'application/json',
      'API-Version': '2024-10'
    },
    body: JSON.stringify({ query, variables })
  });
  const text = await r.text();
  let body;
  try { body = JSON.parse(text); } catch (e) { body = null; }
  // Monday answers 200 with an errors array when a mutation fails, so the
  // status code on its own means nothing.
  if (!r.ok || !body || body.errors || body.error_message) {
    const why = body && (body.error_message ||
      (body.errors && body.errors.map(function (e) { return e.message; }).join('; ')));
    throw new Error(why || ('Monday answered ' + r.status + ' ' + text.slice(0, 200)));
  }
  return body.data;
}

/* Column ids on MMP's Leads board. A board with different columns only
   needs these changed, and anything the board rejects is dropped rather
   than losing the lead, see the fallback below. */
const COL = {
  email:  process.env.MONDAY_COL_EMAIL  || 'lead_email',
  phone:  process.env.MONDAY_COL_PHONE  || 'lead_phone',
  status: process.env.MONDAY_COL_STATUS || 'lead_status',
  source: process.env.MONDAY_COL_SOURCE || 'color_mkyb8krc'
};
const STATUS = process.env.MONDAY_STATUS_LABEL || 'New Lead';
const SOURCE = process.env.MONDAY_SOURCE_LABEL || 'Website';

function usPhone(raw) {
  const d = String(raw).replace(/[^0-9]/g, '');
  if (d.length === 10) return '+1' + d;
  if (d.length === 11 && d.charAt(0) === '1') return '+' + d;
  return String(raw);
}

function columnValues(d) {
  const v = {};
  if (d.email) v[COL.email] = { email: d.email, text: d.email };
  if (d.phone) v[COL.phone] = { phone: usPhone(d.phone), countryShortName: 'US' };
  v[COL.status] = { label: STATUS };
  v[COL.source] = { label: SOURCE };
  return v;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Use POST' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }

  // A bot that fills every field it finds trips the hidden one. Answer
  // normally so it learns nothing.
  if (body && body.honey) return res.status(200).json({ ok: true });

  const data = clean(body);
  if (!data.phone && !data.email) {
    return res.status(400).json({ ok: false, error: 'A phone number or email is needed.' });
  }
  data.page = (req.headers && req.headers.referer) || '';
  data.received = new Date().toISOString();

  const token = process.env.MONDAY_TOKEN;
  const board = process.env.MONDAY_BOARD_ID;
  const group = process.env.MONDAY_GROUP_ID;
  const hook = process.env.LEAD_WEBHOOK_URL;

  if (!token || !board) {
    if (!hook) {
      console.warn('[lead] nothing configured, lead not stored:', JSON.stringify(data));
      return res.status(503).json({ ok: false, error: 'Lead delivery is not configured yet.' });
    }
  }

  try {
    if (token && board) {
      const who = data.name || data.email || data.phone;
      const title = who + (data.zip ? ' (' + data.zip + ')' : '');

      const cols = columnValues(data);
      let made;
      try {
        made = await monday(token,
          'mutation ($board: ID!, $group: String, $name: String!, $cols: JSON) {' +
          '  create_item (board_id: $board, group_id: $group, item_name: $name,' +
          '               column_values: $cols, create_labels_if_missing: true) { id }' +
          '}',
          { board: String(board), group: group || null, name: title, cols: JSON.stringify(cols) });
      } catch (e) {
        // A renamed or deleted column should cost us the tidy fields, not
        // the lead. Fall back to an item with just the name on it.
        console.warn('[lead] column mapping refused, falling back:', e.message);
        made = await monday(token,
          'mutation ($board: ID!, $group: String, $name: String!) {' +
          '  create_item (board_id: $board, group_id: $group, item_name: $name) { id }' +
          '}',
          { board: String(board), group: group || null, name: title });
      }

      const id = made && made.create_item && made.create_item.id;
      if (!id) throw new Error('Monday did not return an item id.');

      const lines = ordered(data).map(function (k) {
        return '*' + label(k) + ':* ' + data[k];
      }).join('\n');

      await monday(token,
        'mutation ($item: ID!, $body: String!) {' +
        '  create_update (item_id: $item, body: $body) { id }' +
        '}',
        { item: String(id), body: 'New enquiry from the website.\n\n' + lines });
    }

    if (hook) {
      const r = await fetch(hook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!r.ok && !(token && board)) throw new Error('Webhook answered ' + r.status);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    // Log the whole lead, so a delivery failure is recoverable from the
    // Vercel logs rather than simply lost.
    console.error('[lead] could not deliver:', err && err.message,
      '| lead:', JSON.stringify(data));
    return res.status(502).json({ ok: false, error: 'Could not deliver the message.' });
  }
};
