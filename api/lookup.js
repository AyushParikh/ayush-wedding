const { google } = require('googleapis');

function getAuth() {
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  return new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    privateKey,
    ['https://www.googleapis.com/auth/spreadsheets.readonly']
  );
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { first, last } = req.query;
  if (!first || !last) {
    return res.status(400).json({ error: 'first and last query params are required' });
  }

  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const sheetId = process.env.GUEST_SHEET_ID;
    const sheetName = process.env.GUEST_SHEET_NAME || 'Guests';

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: sheetName,
    });

    const rows = response.data.values || [];
    if (rows.length < 2) {
      return res.status(200).json({ found: false });
    }

    const headers = rows[0];

    // Find optional "Limit" column (case-insensitive), everything else after col 1 is an event
    const limitColIndex = headers.findIndex(h => h.trim().toLowerCase() === 'limit');
    const eventHeaders = headers.slice(2).filter(h => h.trim().toLowerCase() !== 'limit');

    const firstLower = first.trim().toLowerCase();
    const lastLower = last.trim().toLowerCase();

    const matches = rows.slice(1).filter(row => {
      return (
        (row[0] || '').trim().toLowerCase() === firstLower &&
        (row[1] || '').trim().toLowerCase() === lastLower
      );
    });

    if (matches.length === 0) {
      return res.status(200).json({ found: false });
    }

    const guestRow = matches[0];
    const truthy = new Set(['yes', 'y', '1', 'true']);

    // Re-map event columns skipping the Limit column
    const events = headers.slice(2)
      .map((header, i) => ({ header, val: (guestRow[i + 2] || '').trim().toLowerCase() }))
      .filter(({ header, val }) => header.trim().toLowerCase() !== 'limit' && truthy.has(val))
      .map(({ header }) => header.trim());

    const limit = limitColIndex >= 0
      ? parseInt(guestRow[limitColIndex] || '0', 10) || null
      : null;

    return res.status(200).json({
      found: true,
      firstName: guestRow[0].trim(),
      lastName: guestRow[1].trim(),
      events,
      limit,
    });
  } catch (err) {
    console.error('lookup error:', err);
    return res.status(500).json({ error: 'Failed to look up guest' });
  }
};
